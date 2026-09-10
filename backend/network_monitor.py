import ipaddress
import os
import threading
import time
from collections import deque
from datetime import datetime
from typing import List, Dict, Any
import psutil


def is_local_or_lan_ip(ip_str: str) -> bool:
    if not ip_str or ip_str in ("127.0.0.1", "::1", "0.0.0.0", "localhost"):
        return True
    try:
        ip_obj = ipaddress.ip_address(ip_str)
        if ip_obj.is_loopback or ip_obj.is_private or ip_obj.is_link_local:
            return True
    except ValueError:
        pass

    if ip_str.startswith("10.") or ip_str.startswith("192.168."):
        return True
    if ip_str.startswith("172."):
        try:
            parts = ip_str.split(".")
            second_octet = int(parts[1])
            if 16 <= second_octet <= 31:
                return True
        except (IndexError, ValueError):
            pass
    return False


class NetworkMonitor:
    def __init__(self, check_interval: float = 2.0, max_events: int = 100):
        self.check_interval = check_interval
        self.max_events = max_events
        self.events: deque = deque(maxlen=max_events)
        self.total_outbound_attempts: int = 0
        self._running: bool = False
        self._thread: threading.Thread = None
        self._lock: threading.Lock = threading.Lock()

    def start(self):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False

    def _monitor_loop(self):
        while self._running:
            try:
                # Get current server PID and all child process PIDs
                current_pid = os.getpid()
                target_pids = {current_pid}
                try:
                    proc = psutil.Process(current_pid)
                    for child in proc.children(recursive=True):
                        target_pids.add(child.pid)
                except Exception:
                    pass

                # Retrieve TCP connections
                try:
                    conns = psutil.net_connections(kind="tcp")
                except Exception:
                    conns = []
                for conn in conns:
                    if conn.status != psutil.CONN_ESTABLISHED:
                        continue
                    if conn.pid not in target_pids:
                        continue
                    raddr = getattr(conn, "raddr", None)
                    if not raddr or not raddr.ip:
                        continue

                    remote_ip = raddr.ip
                    remote_port = raddr.port
                    laddr = getattr(conn, "laddr", None)
                    local_port = laddr.port if laddr else 0

                    if not is_local_or_lan_ip(remote_ip):
                        proc_name = "unknown"
                        if conn.pid:
                            try:
                                proc_name = psutil.Process(conn.pid).name()
                            except (psutil.NoSuchProcess, psutil.AccessDenied):
                                pass

                        event_data = {
                            "timestamp": datetime.now().isoformat(),
                            "remote_ip": remote_ip,
                            "remote_port": remote_port,
                            "local_port": local_port,
                            "pid": conn.pid,
                            "process_name": proc_name,
                        }

                        with self._lock:
                            self.total_outbound_attempts += 1
                            self.events.appendleft(event_data)

            except Exception as e:
                # Ignore transient permission errors on Windows
                pass

            time.sleep(self.check_interval)

    def get_status(self) -> Dict[str, Any]:
        with self._lock:
            events_list = list(self.events)
            total = self.total_outbound_attempts

        status_str = (
            "CLEAN - No external connections detected"
            if total == 0
            else f"WARNING - {total} external connection attempt(s) detected!"
        )

        return {
            "total_outbound_attempts": total,
            "events": events_list,
            "current_status": status_str,
        }


# Global singleton instance
network_monitor = NetworkMonitor(check_interval=2.0, max_events=100)
