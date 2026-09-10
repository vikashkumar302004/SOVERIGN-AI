import os
import sys
import uuid
import shutil
import subprocess
from typing import Optional, Dict, Any
import config


def execute_code(
    language: str, code: str, stdin: Optional[str] = None
) -> Dict[str, Any]:
    lang = language.lower().strip()
    if lang not in ["python", "cpp", "c++"]:
        raise ValueError(
            f"Unsupported language '{language}'. Supported languages: 'python', 'cpp'"
        )

    # Prepare environment with compiler bin directory in PATH
    env = os.environ.copy()
    gxx_dir = os.path.dirname(config.GXX_CMD)
    if gxx_dir and gxx_dir not in env.get("PATH", ""):
        env["PATH"] = f"{gxx_dir};{env.get('PATH', '')}"

    # Create temporary execution folder
    run_id = uuid.uuid4().hex
    run_dir = os.path.join(config.SANDBOX_TEMP_DIR, run_id)
    os.makedirs(run_dir, exist_ok=True)

    try:
        if lang in ["python"]:
            script_path = os.path.join(run_dir, "script.py")
            with open(script_path, "w", encoding="utf-8") as f:
                f.write(code)

            try:
                proc = subprocess.run(
                    [sys.executable, script_path],
                    input=stdin,
                    capture_output=True,
                    text=True,
                    timeout=10,
                    cwd=run_dir,
                    env=env,
                )
                status = "SUCCESS" if proc.returncode == 0 else "ERROR"
                return {
                    "status": status,
                    "stdout": proc.stdout,
                    "stderr": proc.stderr,
                    "exit_code": proc.returncode,
                }
            except subprocess.TimeoutExpired:
                return {
                    "status": "TIMEOUT",
                    "stdout": "",
                    "stderr": "Execution timed out (10 seconds limit exceeded)",
                    "exit_code": -1,
                }

        elif lang in ["cpp", "c++"]:
            source_path = os.path.join(run_dir, "main.cpp")
            exe_path = os.path.join(run_dir, "main.exe")

            with open(source_path, "w", encoding="utf-8") as f:
                f.write(code)

            # Compile with g++ (-static for self-contained executable)
            try:
                comp_proc = subprocess.run(
                    [config.GXX_CMD, source_path, "-static", "-o", exe_path],
                    capture_output=True,
                    text=True,
                    timeout=15,
                    cwd=run_dir,
                    env=env,
                )
            except Exception as comp_err:
                return {
                    "status": "COMPILE_ERROR",
                    "stdout": "",
                    "stderr": f"Compiler launch error: {str(comp_err)}",
                    "exit_code": -1,
                }

            if comp_proc.returncode != 0:
                return {
                    "status": "COMPILE_ERROR",
                    "stdout": comp_proc.stdout,
                    "stderr": comp_proc.stderr,
                    "exit_code": comp_proc.returncode,
                }

            # Execute compiled binary
            try:
                run_proc = subprocess.run(
                    [exe_path],
                    input=stdin,
                    capture_output=True,
                    text=True,
                    timeout=10,
                    cwd=run_dir,
                    env=env,
                )
                status = (
                    "SUCCESS" if run_proc.returncode == 0 else "RUNTIME_ERROR"
                )
                return {
                    "status": status,
                    "stdout": run_proc.stdout,
                    "stderr": run_proc.stderr,
                    "exit_code": run_proc.returncode,
                }
            except subprocess.TimeoutExpired:
                return {
                    "status": "TIMEOUT",
                    "stdout": "",
                    "stderr": "Execution timed out (10 seconds limit exceeded)",
                    "exit_code": -1,
                }

    finally:
        # Clean up temporary sandbox directory
        shutil.rmtree(run_dir, ignore_errors=True)
