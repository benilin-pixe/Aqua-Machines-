import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Trash2,
  Calendar,
  User,
  Zap,
  Info
} from 'lucide-react';

interface TrialItem {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  userPhone?: string;
  machineId: string;
  machineName: string;
  subscriptionId: string;
  orderId: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  durationHours: number;
  durationMs: number;
  activatedAt: string;
  expiresAt: string;
  cleanedUpAt: string | null;
  revokedAt?: string | null;
  revokedBy?: string | null;
  serverTime: string;
  remainingMs: number;
  remainingHours: number;
  isExpired: boolean;
  createdAt: string;
}

interface AdminTrialsViewProps {
  adminToken: string | null;
}

export const AdminTrialsView: React.FC<AdminTrialsViewProps> = ({ adminToken }) => {
  const [trials, setTrials] = useState<TrialItem[]>([]);
  const [summary, setSummary] = useState<any>({
    totalTrials: 0,
    activeTrials: 0,
    expiredTrials: 0,
    revokedTrials: 0,
  });
  const [serverTime, setServerTime] = useState<string>(new Date().toISOString());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'REVOKED'>('ALL');

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [revokingTrial, setRevokingTrial] = useState<TrialItem | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const loadTrials = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/trials', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || 'Failed to fetch trial records.');
      }
      const data = await res.json();
      setTrials(data.trials || []);
      setSummary(data.summary || {});
      setServerTime(data.serverTime || new Date().toISOString());
    } catch (err: any) {
      setError(err?.message || 'Error fetching trials data.');
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    loadTrials();
    const interval = setInterval(loadTrials, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [loadTrials]);

  const handleRunCleanup = async () => {
    if (!adminToken) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/admin/trials/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cleanup job failed.');
      setActionMessage(data.message || `Cleanup completed: ${data.cleanedCount} trial(s) deactivated.`);
      loadTrials();
    } catch (err: any) {
      setError(err?.message || 'Failed to execute cleanup job.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!adminToken || !revokingTrial) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/trials/${revokingTrial.id}/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ reason: revokeReason || 'Administrative termination' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke trial.');
      setActionMessage(data.message);
      setRevokingTrial(null);
      setRevokeReason('');
      loadTrials();
    } catch (err: any) {
      setError(err?.message || 'Failed to revoke trial.');
    } finally {
      setActionLoading(false);
    }
  };

  // Format countdown string from remaining milliseconds
  const formatCountdown = (ms: number) => {
    if (ms <= 0) return '00:00:00 (Elapsed)';
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  };

  const filteredTrials = trials.filter((t) => {
    const q = search.toLowerCase();
    const matchesSearch =
      t.id.toLowerCase().includes(q) ||
      t.userEmail.toLowerCase().includes(q) ||
      (t.userName && t.userName.toLowerCase().includes(q)) ||
      t.machineName.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-400 text-xs font-semibold mb-2">
            <Clock className="w-3.5 h-3.5" />
            48-Hour Free Trial Enforcement System
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Water Machine Free Trials
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative lifecycle engine enforcing exact 48-hour expirations, client clock immunity, and automated deactivation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadTrials}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleRunCleanup}
            disabled={actionLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            Run Cleanup Job
          </button>
        </div>
      </div>

      {/* Action and Error Feedback */}
      {actionMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Total Trials Initiated</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">{summary.totalTrials || 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">48h starter units activated</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Active Trials</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{summary.activeTrials || 0}</div>
          <div className="text-[11px] text-emerald-400/80 mt-1">Within 48h active lease window</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Expired Trials</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">{summary.expiredTrials || 0}</div>
          <div className="text-[11px] text-amber-400/80 mt-1">48 hours elapsed & deactivated</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Revoked Trials</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono">{summary.revokedTrials || 0}</div>
          <div className="text-[11px] text-rose-400/80 mt-1">Terminated by administrator</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by trial ID, user email, or machine..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400">Status:</span>
          {(['ALL', 'ACTIVE', 'EXPIRED', 'REVOKED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Trials Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Trial ID & Machine</th>
                <th className="py-3.5 px-4">User Details</th>
                <th className="py-3.5 px-4">Activation (UTC)</th>
                <th className="py-3.5 px-4">Expiration (UTC)</th>
                <th className="py-3.5 px-4">Remaining Duration</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredTrials.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-cyan-400" />
                    No 48-hour trial records found.
                  </td>
                </tr>
              ) : (
                filteredTrials.map((trial) => {
                  return (
                    <tr key={trial.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{trial.machineName}</div>
                        <div className="text-[11px] text-cyan-400/80">{trial.id}</div>
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-medium text-slate-200">{trial.userName || trial.userEmail}</div>
                        <div className="text-[11px] text-slate-400">{trial.userEmail}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {new Date(trial.activatedAt).toLocaleString('en-US', { timeZone: 'UTC' })}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {new Date(trial.expiresAt).toLocaleString('en-US', { timeZone: 'UTC' })}
                      </td>
                      <td className="py-3.5 px-4">
                        {trial.status === 'ACTIVE' ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-950/80 border border-cyan-800/40 text-cyan-300 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            {formatCountdown(trial.remainingMs)}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Elapsed</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {trial.status === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-sans font-medium text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            ACTIVE (48h)
                          </span>
                        )}
                        {trial.status === 'EXPIRED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-sans font-medium text-[11px]">
                            EXPIRED
                          </span>
                        )}
                        {trial.status === 'REVOKED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-sans font-medium text-[11px]">
                            REVOKED
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {trial.status === 'ACTIVE' ? (
                          <button
                            onClick={() => setRevokingTrial(trial)}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-sans transition cursor-pointer"
                          >
                            Revoke
                          </button>
                        ) : (
                          <span className="text-slate-600 text-[11px] font-sans">
                            {trial.cleanedUpAt ? 'Cleaned Up' : 'Deactivated'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revoke Confirmation Modal */}
      {revokingTrial && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">Revoke Free Trial</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to manually revoke the 48-hour free trial for{' '}
              <strong className="text-white">{revokingTrial.userEmail}</strong> ({revokingTrial.machineName})?
            </p>
            <p className="text-[11px] text-slate-400 mt-2">
              This will immediately cut off user trial access, mark the trial as REVOKED, and record an audit log.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-400 mb-1">Revocation Reason</label>
              <input
                type="text"
                placeholder="Reason for revoking trial (e.g. Terms violation)..."
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setRevokingTrial(null);
                  setRevokeReason('');
                }}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRevoke}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                {actionLoading ? 'Revoking...' : 'Confirm Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
