import React, { useState, useEffect } from 'react';
import { Server, CheckCircle, AlertTriangle, RefreshCw, Search, Edit3, X, ShieldAlert, Sparkles, Plus, Image as ImageIcon } from 'lucide-react';
import { Machine } from '../../types';

interface AdminMachinesViewProps {
  adminToken: string;
}

export const AdminMachinesView: React.FC<AdminMachinesViewProps> = ({ adminToken }) => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);

  // Edit form state
  const [editPrice, setEditPrice] = useState<string>('');
  const [isPriceUnavailable, setIsPriceUnavailable] = useState<boolean>(false);
  const [editName, setEditName] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editSpecifications, setEditSpecifications] = useState('');
  const [editWaterCapacity, setEditWaterCapacity] = useState('');
  const [editDailyReward, setEditDailyReward] = useState<string>('');
  const [editDurationDays, setEditDurationDays] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('ACTIVE');
  const [editPurchaseAvailable, setEditPurchaseAvailable] = useState<boolean>(true);
  const [editReason, setEditReason] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const loadMachines = async () => {
    if (!adminToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/machines', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch machines: HTTP ${res.status}`);
      }

      const data = await res.json();
      setMachines(Array.isArray(data.machines) ? data.machines : []);
    } catch (err: any) {
      console.error('Failed to load machines:', err);
      setError(err?.message || 'Failed to connect to Aqua Machines API server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMachines();
  }, [adminToken]);

  const startEdit = (m: Machine) => {
    setEditingMachine(m);
    setIsPriceUnavailable(m.price === null || m.price === undefined);
    setEditPrice(m.price !== null && m.price !== undefined ? String(m.price) : '');
    setEditName(m.name || '');
    setEditModel(m.model || '');
    setEditSpecifications(m.specifications || '');
    setEditWaterCapacity(m.waterCapacity || '');
    setEditDailyReward(String(m.configuredDailyReward || 0));
    setEditDurationDays(String(m.durationDays || 30));
    setEditStatus(m.status || 'ACTIVE');
    setEditPurchaseAvailable(m.purchaseAvailable !== false);
    setEditReason('');
    setError(null);
    setSuccess(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMachine) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const priceValue = isPriceUnavailable ? null : (editPrice === '' ? null : Number(editPrice));
      if (!isPriceUnavailable && priceValue !== null && (isNaN(priceValue) || priceValue < 0)) {
        throw new Error('Please enter a valid positive numerical price in UGX, or toggle Price Unavailable.');
      }

      const payload = {
        name: editName.trim(),
        model: editModel.trim(),
        price: priceValue,
        specifications: editSpecifications.trim(),
        waterCapacity: editWaterCapacity.trim(),
        configuredDailyReward: Number(editDailyReward),
        configuredMonthlyReward: Number(editDailyReward) * 30,
        durationDays: Number(editDurationDays),
        status: editStatus,
        purchaseAvailable: editPurchaseAvailable,
        reason: editReason.trim() || `Administrator updated pricing/specs for ${editName}`,
      };

      const res = await fetch(`/api/admin/machines/${editingMachine.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update machine.');
      }

      setSuccess(`Machine "${editName}" updated successfully. Changes are now live across catalogue and checkout.`);
      setEditingMachine(null);
      loadMachines();
    } catch (err: any) {
      setError(err?.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const filteredMachines = machines.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.name?.toLowerCase().includes(q) ||
      m.model?.toLowerCase().includes(q) ||
      m.category?.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />
            <span>Water Machine Catalogue & Authoritative Pricing</span>
            {loading && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800 text-[10px] font-medium text-cyan-300">
                <RefreshCw className="w-2.5 h-2.5 animate-spin text-cyan-400" />
                Syncing
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Maintain verified machine specifications, selling prices in UGX, and live purchase availability
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search machines or models..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            onClick={loadMachines}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Machines Table */}
      {loading && machines.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-3" />
          Loading machine catalogue and verified prices...
        </div>
      ) : filteredMachines.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
          No water machines found matching your query.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Machine Unit</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Water Capacity</th>
                <th className="py-3 px-4">Selling Price (UGX)</th>
                <th className="py-3 px-4">Daily Yield</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredMachines.map((m) => {
                const isUnavailable = m.price === null || m.price === undefined;
                return (
                  <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-sans">
                      <div className="flex items-center gap-3">
                        <img
                          src={m.image}
                          alt={m.name}
                          onError={(e: any) => {
                            e.target.src = '/public/favicon-48x48.png';
                          }}
                          className="w-12 h-10 object-cover rounded-lg border border-slate-700 bg-slate-950 shrink-0"
                        />
                        <div>
                          <div className="font-semibold text-white flex items-center gap-2">
                            <span>{m.name}</span>
                            {m.model && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono">
                                {m.model}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-xs font-sans mt-0.5">
                            {m.specifications || m.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300">
                        {m.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-sans text-slate-300">
                      {m.waterCapacity || 'High Output'}
                    </td>
                    <td className="py-3.5 px-4">
                      {isUnavailable ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-800 text-amber-300 text-[11px] font-sans font-medium">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          Price unavailable
                        </span>
                      ) : m.price === 0 && m.category === 'STARTER' ? (
                        <span className="text-emerald-400 font-bold font-sans">FREE TRIAL</span>
                      ) : (
                        <span className="text-cyan-300 font-bold font-mono">
                          UGX {m.price.toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-emerald-400 font-mono">
                      UGX {m.configuredDailyReward.toLocaleString()} / day
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          m.status === 'ACTIVE' && m.purchaseAvailable
                            ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                            : 'bg-slate-800 border border-slate-700 text-slate-400'
                        }`}
                      >
                        {m.status === 'ACTIVE' && m.purchaseAvailable ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <AlertTriangle className="w-3 h-3" />
                        )}
                        {m.status} {m.purchaseAvailable ? '' : '(Paused)'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-sans">
                      <button
                        onClick={() => startEdit(m)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-cyan-950 hover:border-cyan-700 border border-slate-700 text-slate-200 hover:text-cyan-300 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit & Price
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editingMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-cyan-400" />
                  Edit Machine & Pricing
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update verified product specifications and authoritative price in UGX
                </p>
              </div>
              <button
                onClick={() => setEditingMachine(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Machine Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Model Code</label>
                  <input
                    type="text"
                    value={editModel}
                    onChange={(e) => setEditModel(e.target.value)}
                    placeholder="e.g. AQ-STR-01"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Pricing Section */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-slate-200 font-semibold flex items-center gap-2">
                    Verified Selling Price (UGX)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-400 text-xs">
                    <input
                      type="checkbox"
                      checked={isPriceUnavailable}
                      onChange={(e) => {
                        setIsPriceUnavailable(e.target.checked);
                        if (e.target.checked) setEditPrice('');
                      }}
                      className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                    />
                    <span>Mark as "Price unavailable"</span>
                  </label>
                </div>

                {!isPriceUnavailable ? (
                  <div>
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      min="0"
                      step="500"
                      placeholder="e.g. 70000"
                      required={!isPriceUnavailable}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-cyan-300 font-mono font-bold text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Authoritative selling price applied across catalogue, checkout, and wallet debits.
                    </p>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>The catalogue and checkout will display "Price unavailable" and disable purchases until verified.</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Water Capacity</label>
                  <input
                    type="text"
                    value={editWaterCapacity}
                    onChange={(e) => setEditWaterCapacity(e.target.value)}
                    placeholder="e.g. 1,200 Liters / Day"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Daily Telemetry Yield (UGX)</label>
                  <input
                    type="number"
                    value={editDailyReward}
                    onChange={(e) => setEditDailyReward(e.target.value)}
                    min="0"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Specifications & Filtration System</label>
                <textarea
                  rows={2}
                  value={editSpecifications}
                  onChange={(e) => setEditSpecifications(e.target.value)}
                  placeholder="Detail multi-stage membranes, UV chambers, flow sensors, etc."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="SOLD_OUT">SOLD_OUT</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Purchase Availability</label>
                  <label className="flex items-center gap-2 mt-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPurchaseAvailable}
                      onChange={(e) => setEditPurchaseAvailable(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                    />
                    <span>Open for Lease & Order</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Reason for Change (Audit Log)</label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g. Verified official supplier invoice and pricing update"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingMachine(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {saving ? 'Saving...' : 'Save & Publish Price'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
