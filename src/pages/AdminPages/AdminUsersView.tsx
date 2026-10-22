import React, { useState, useEffect } from 'react';
import { Users, ShieldAlert, CheckCircle, AlertTriangle, RefreshCw, Search } from 'lucide-react';

interface UserDetail {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
  wallet?: {
    availableBalance: number;
    pendingBalance: number;
    totalRewards: number;
  };
  subscriptionsCount?: number;
}

interface AdminUsersViewProps {
  adminToken: string;
}

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({ adminToken }) => {
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadUsers = async () => {
    if (!adminToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${window.location.origin}/api/admin/users`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Admin session unauthorized or expired. Please re-authenticate.');
        }
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `Failed to fetch users: HTTP ${res.status}`);
      }

      const data = await res.json();
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setError(err?.message || 'Failed to connect to Aqua Machines API server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [adminToken]);

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Registered Platform Users
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative user records and lease account telemetry
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            onClick={loadUsers}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-red-300">Data Source Error</div>
            <div className="mt-0.5 text-red-400">{error}</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-3" />
          Loading user records from server...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
          {error ? 'Unable to display users due to server error.' : 'No users registered yet.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Wallet Balance</th>
                <th className="py-3 px-4">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-sans font-medium text-white">{u.fullName}</td>
                  <td className="py-3 px-4 text-slate-400">{u.email}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold ${
                        u.status === 'ACTIVE'
                          ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                          : 'bg-amber-950 border border-amber-800 text-amber-300'
                      }`}
                    >
                      {u.status === 'ACTIVE' ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-cyan-300">
                    UGX {(u.wallet?.availableBalance || 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-sans">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
