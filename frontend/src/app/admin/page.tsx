"use client";

import { useEffect, useState } from "react";
import { Users, Shield, AlertTriangle, CheckCircle2, RefreshCw, UserCheck } from "lucide-react";
import { useAuth, User } from "@/context/AuthContext";

export default function AdminPage() {
  const { authFetch, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/v1/admin/users");
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || `HTTP ${res.status}: Access Denied`);
      } else {
        setUsers(data.users || []);
      }
    } catch (err: any) {
      setError("Failed to fetch user directory from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: number, newRole: string) => {
    setUpdatingId(userId);
    setSuccessMsg(null);
    setError(null);

    try {
      const res = await authFetch(`/api/v1/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Failed to update role.");
      } else {
        setSuccessMsg(`Successfully updated user #${userId} role to '${newRole}'`);
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
      }
    } catch (err: any) {
      setError("Network error updating role.");
    } finally {
      setUpdatingId(null);
    }
  };

  const roles = ["EMPLOYEE", "ANALYST", "MANAGER", "ADMIN"];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-token pb-5">
        <div>
          <div className="flex items-center space-x-2 text-accent font-mono text-xs uppercase tracking-widest mb-1">
            <Shield className="w-4 h-4" />
            <span>Administrator Portal</span>
          </div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">
            User Account & RBAC Management
          </h1>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-surface border border-token text-xs font-mono text-primary hover:text-accent hover:border-cyan-500/30 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-mono flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-mono flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* User Directory Table */}
      <div className="bg-surface border border-token rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-token flex items-center justify-between bg-base/50">
          <div className="flex items-center space-x-2 font-mono text-xs text-primary">
            <Users className="w-4 h-4 text-accent" />
            <span>REGISTERED USER DIRECTORY ({users.length})</span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center font-mono text-xs text-muted flex flex-col items-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-accent" />
            <span>Loading user permissions...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center font-mono text-xs text-muted">
            No registered users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-base text-muted uppercase border-b border-token text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">ID</th>
                  <th className="py-3.5 px-6">Username</th>
                  <th className="py-3.5 px-6">Email</th>
                  <th className="py-3.5 px-6">Joined Date</th>
                  <th className="py-3.5 px-6">Assigned Role</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-token text-primary">
                {users.map((u) => {
                  const isCurrent = currentUser?.id === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-surface-hover transition-colors">
                      <td className="py-4 px-6 text-muted font-semibold">#{u.id}</td>
                      <td className="py-4 px-6 font-semibold text-primary flex items-center space-x-2">
                        <span>{u.username}</span>
                        {isCurrent && (
                          <span className="text-[10px] bg-cyan-500/10 text-accent px-2 py-0.5 rounded border border-cyan-500/30">
                            YOU
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-muted">{u.email}</td>
                      <td className="py-4 px-6 text-muted">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="py-4 px-6">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={updatingId === u.id}
                          className="bg-base border border-token rounded-lg px-3 py-1.5 text-xs text-primary font-mono focus:outline-none focus:border-cyan-500/50 transition-all cursor-pointer"
                        >
                          {roles.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {updatingId === u.id ? (
                          <span className="text-accent text-xs flex items-center justify-end space-x-1">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Updating...</span>
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-end space-x-1">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
