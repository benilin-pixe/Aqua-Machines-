import React, { useState, useEffect } from 'react';
import { DollarSign, ShieldCheck, Plus, Search, Calendar, Users, FileText, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface AdminFundAllocationViewProps {
  adminToken: string;
}

export const AdminFundAllocationView: React.FC<AdminFundAllocationViewProps> = ({ adminToken }) => {
  const [allocations, setAllocations] = useState<any[]>([]);
  const [fundingAccounts, setFundingAccounts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Form state for new allocation
  const [showModal, setShowModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [allocationType, setAllocationType] = useState('ONE_TIME');
  const [fundingAccountId, setFundingAccountId] = useState('fa_reserve');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [alcRes, usrRes] = await Promise.all([
        fetch('/api/admin/allocations', { headers: { Authorization: `Bearer ${adminToken}` } }),
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${adminToken}` } }),
      ]);

      if (alcRes.ok) {
        const alcData = await alcRes.json();
        setAllocations(alcData.allocations || []);
        setFundingAccounts(alcData.fundingAccounts || []);
      }
      if (usrRes.ok) {
        const usrData = await usrRes.json();
        setUsers(usrData.users || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load fund allocation records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [adminToken]);

  const handleCreateAllocation = async () => {
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/allocations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          userId: selectedUserId,
          amount: Number(amount),
          allocationType,
          fundingAccountId,
          startDate,
          endDate: endDate || undefined,
          reason,
          reference,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to authorize fund allocation.');

      setSuccess(data.message || 'Fund allocation successfully processed and committed to ledger.');
      setShowConfirmation(false);
      setShowModal(false);
      setSelectedUserId('');
      setAmount('');
      setReason('');
      setReference('');
      loadData();
    } catch (err: any) {
      setError(err?.message || 'Allocation submission failed.');
      setShowConfirmation(false);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAllocations = allocations.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.reference?.toLowerCase().includes(q) ||
      a.reason?.toLowerCase().includes(q) ||
      a.user?.fullName?.toLowerCase().includes(q) ||
      a.user?.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-cyan-400" />
            Admin Fund Allocation & Payment Scheduling
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Authorize and manage institutional fund allocations, daily/monthly payment schedules, and verified reserve sources.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Create New Allocation
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Funding Accounts Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fundingAccounts.map((fa) => (
          <div key={fa.id} className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
            <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              {fa.name}
            </div>
            <div className="text-2xl font-bold text-cyan-300 font-mono mt-1">
              UGX {fa.availableBalance.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Verified source for authorized fund allocations</div>
          </div>
        ))}
      </div>

      {/* Allocations Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            Authorized Fund Allocation Ledger ({allocations.length})
          </h3>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search allocations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {filteredAllocations.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No fund allocations recorded yet. Click "Create New Allocation" to authorize funds.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Reference / ID</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Schedule</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredAllocations.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-bold text-cyan-400">{a.reference}</td>
                    <td className="p-3">
                      <div className="font-semibold text-white">{a.user?.fullName}</div>
                      <div className="text-[10px] text-slate-400">{a.user?.email}</div>
                    </td>
                    <td className="p-3 uppercase text-[11px] font-semibold text-slate-200">{a.allocationType}</td>
                    <td className="p-3 font-bold text-emerald-300">UGX {a.amount.toLocaleString()}</td>
                    <td className="p-3 text-[11px] text-slate-400">
                      {a.schedule ? `${a.schedule.frequency} (${a.schedule.completedPeriods}/${a.schedule.totalAuthorized ? 'Active' : '-'})` : 'One-Time'}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 text-[10px] uppercase">
                        {a.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">{new Date(a.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Allocation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-cyan-400" />
              Authorize New Fund Allocation
            </h3>

            {showConfirmation ? (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-800 space-y-2 text-xs text-slate-200">
                  <div className="font-bold text-cyan-300 text-sm mb-1">Confirm Allocation Summary</div>
                  <div><span className="text-slate-400">Target User ID:</span> <span className="font-mono text-white">{selectedUserId}</span></div>
                  <div><span className="text-slate-400">Allocation Type:</span> <span className="font-mono text-white uppercase">{allocationType}</span></div>
                  <div><span className="text-slate-400">Amount per Period:</span> <span className="font-mono text-emerald-300 font-bold">UGX {Number(amount || 0).toLocaleString()}</span></div>
                  <div><span className="text-slate-400">Funding Source:</span> <span className="font-mono text-white">{fundingAccounts.find(f => f.id === fundingAccountId)?.name}</span></div>
                  <div><span className="text-slate-400">Start Date:</span> <span className="font-mono text-white">{startDate}</span></div>
                  <div><span className="text-slate-400">Reason:</span> <span className="text-white italic">"{reason}"</span></div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleCreateAllocation}
                    disabled={submitting}
                    className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Processing Allocation...' : 'Confirm & Authorize Allocation'}
                  </button>
                  <button
                    onClick={() => setShowConfirmation(false)}
                    className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!selectedUserId || !amount || Number(amount) <= 0 || !reason) {
                    setError('Please select a user, enter a valid amount, and provide a reason.');
                    return;
                  }
                  setShowConfirmation(true);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Select User</label>
                  <select
                    required
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Choose Registered User --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Allocation Type</label>
                    <select
                      value={allocationType}
                      onChange={(e) => setAllocationType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="ONE_TIME">One-Time Wallet Credit</option>
                      <option value="DAILY">Daily Scheduled Payment</option>
                      <option value="MONTHLY">Monthly Scheduled Payment</option>
                      <option value="MACHINE_RETURN">Verified Machine Return</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Funding Source</label>
                    <select
                      value={fundingAccountId}
                      onChange={(e) => setFundingAccountId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      {fundingAccounts.map((fa) => (
                        <option key={fa.id} value={fa.id}>
                          {fa.name} (Avail: UGX {fa.availableBalance.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Amount in UGX (Per Period / Total)</label>
                  <input
                    type="number"
                    min="100"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Start Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Reference Number (Optional)</label>
                    <input
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="e.g. REF-2026-Q3"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Reason / Description</label>
                  <textarea
                    required
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Detailed audit justification for fund allocation..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Review Allocation Summary
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
