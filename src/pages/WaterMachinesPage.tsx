import React, { useState, useEffect } from 'react';
import { Machine, User } from '../types';
import {
  Droplets,
  Search,
  SlidersHorizontal,
  CheckCircle,
  AlertTriangle,
  Server,
  ArrowRight,
  ShieldCheck,
  X,
  Wallet,
  Smartphone,
  FileText,
  Sparkles,
  Clock,
  Zap
} from 'lucide-react';

interface WaterMachinesPageProps {
  currentUser: User | null;
  onNavigate: (path: string) => void;
}

export const WaterMachinesPage: React.FC<WaterMachinesPageProps> = ({ currentUser, onNavigate }) => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'capacity' | 'return'>('price-asc');

  // Selected machine for details / purchase modal
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [modalMode, setModalMode] = useState<'details' | 'purchase'>('details');
  const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'MOBILE_MONEY'>('WALLET');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  // Authoritative 48-hour free trial state
  const [trialStatus, setTrialStatus] = useState<any>(null);
  const [countdownMs, setCountdownMs] = useState<number>(0);

  const fetchMachines = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/machines');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.machines)) {
          setMachines(data.machines);
        }
      }
    } catch (err) {
      console.error('Failed to load machines catalogue:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrialStatus = async () => {
    const token = localStorage.getItem('aqua_user_token') || sessionStorage.getItem('aqua_user_token');
    if (!token) return;
    try {
      const res = await fetch('/api/machines/trial/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTrialStatus(data);
        if (data && data.remainingMs !== undefined) {
          setCountdownMs(data.remainingMs);
        }
      }
    } catch (err) {
      console.error('Failed to fetch trial status:', err);
    }
  };

  useEffect(() => {
    fetchMachines();
    if (currentUser) {
      fetchTrialStatus();
    }
  }, [currentUser]);

  // Client countdown timer decremented every second, synced with server
  useEffect(() => {
    if (countdownMs <= 0) return;
    const timer = setInterval(() => {
      setCountdownMs((prev) => {
        if (prev <= 1000) {
          fetchTrialStatus();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdownMs]);

  const formatCountdown = (ms: number) => {
    if (ms <= 0) return '00:00:00';
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  };

  const handlePurchase = async () => {
    if (!currentUser) {
      onNavigate('/login');
      return;
    }

    if (!selectedMachine) return;
    if (!termsAccepted) {
      setPurchaseError('Please review and accept the machine lease terms and return disclosures.');
      return;
    }

    setPurchasing(true);
    setPurchaseError(null);
    setPurchaseSuccess(null);

    try {
      const res = await fetch('/api/machines/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('aqua_user_token') || sessionStorage.getItem('aqua_user_token')}`,
        },
        body: JSON.stringify({
          machineId: selectedMachine.id,
          paymentMethod,
          termsAccepted,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process machine purchase order.');
      }

      setPurchaseSuccess(data.message || 'Machine leased and activated successfully!');
      setTimeout(() => {
        setSelectedMachine(null);
        onNavigate('/wallet');
      }, 1500);
    } catch (err: any) {
      setPurchaseError(err?.message || 'Purchase failed.');
    } finally {
      setPurchasing(false);
    }
  };

  // Filter & Sort
  const filteredMachines = machines.filter((m) => {
    const q = search.toLowerCase();
    const matchesSearch =
      m.name.toLowerCase().includes(q) ||
      (m.model && m.model.toLowerCase().includes(q)) ||
      m.description.toLowerCase().includes(q);
    const matchesCategory = categoryFilter === 'ALL' || m.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const sortedMachines = [...filteredMachines].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - b.price ? b.price - a.price : 0;
    if (sortBy === 'return') return b.configuredDailyReward - a.configuredDailyReward;
    return 0;
  });

  // Calculate actual days in current month for accurate monthly return projection
  const now = new Date();
  const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 border border-cyan-800/40 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-3">
            <Droplets className="w-3.5 h-3.5" />
            Verified Water Infrastructure Catalogue
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Commercial Water Machines & <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-200">Returns Management</span>
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Browse verified water purification and filtration units. Review daily telemetry returns, water capacity specs, and transparent leasing terms.
          </p>
        </div>
      </div>

      {/* Search, Filter & Sort Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by machine name, model or specifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
            <span className="text-xs text-slate-400 font-medium">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-cyan-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="STARTER">Starter Trial</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="INDUSTRIAL">Industrial</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
            <span className="text-xs text-slate-400 font-medium">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-transparent text-xs font-semibold text-cyan-300 focus:outline-none cursor-pointer"
            >
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="return">Daily Return: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Machines Grid */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400 bg-slate-900/40 rounded-3xl border border-slate-800">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading verified water machines catalogue...
        </div>
      ) : sortedMachines.length === 0 ? (
        <div className="p-16 text-center text-xs text-slate-400 bg-slate-900/40 rounded-3xl border border-slate-800">
          No water machines match your search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedMachines.map((m) => {
            const monthlyReturnEstimate = m.configuredDailyReward * daysInCurrentMonth;
            const isPriceUnavailable = m.price === null || m.price === undefined;
            const isAvailable = m.status === 'ACTIVE' && m.purchaseAvailable && !isPriceUnavailable;

            return (
              <div
                key={m.id}
                className="rounded-3xl border border-slate-800 bg-slate-900/80 overflow-hidden flex flex-col justify-between hover:border-cyan-500/40 transition-all shadow-2xl group"
              >
                <div>
                  <div className="relative h-48 bg-slate-950 overflow-hidden">
                    <img
                      src={m.image}
                      alt={m.name}
                      onError={(e: any) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/images/machine_starter_dispenser_1792756134226.jpg';
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="text-[10px] font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 text-cyan-300">
                        {m.category}
                      </span>
                    </div>
                    {m.model && (
                      <div className="absolute top-3 right-3">
                        <span className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-700 text-slate-300">
                          {m.model}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1 flex items-center justify-between">
                        <span>{m.name}</span>
                        {isPriceUnavailable ? (
                          <span className="text-xs font-sans font-medium px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-800 text-amber-300">
                            Price unavailable
                          </span>
                        ) : m.price === 0 && m.category === 'STARTER' ? (
                          <span className="text-sm font-mono font-bold text-emerald-400">FREE TRIAL</span>
                        ) : (
                          <span className="text-sm font-mono font-bold text-cyan-300">
                            UGX {m.price.toLocaleString()}
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {m.description}
                      </p>
                    </div>

                    <div className="space-y-2 py-3 border-y border-slate-800/80 text-xs font-mono">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Water Capacity:</span>
                        <span className="font-bold text-white">{m.waterCapacity || 'High Yield'}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Daily Return:</span>
                        <span className="font-bold text-cyan-300">UGX {m.configuredDailyReward.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Est. Monthly Return ({daysInCurrentMonth}d):</span>
                        <span className="font-bold text-emerald-300">
                          {m.returnsConfigured && monthlyReturnEstimate > 0
                            ? `UGX ${monthlyReturnEstimate.toLocaleString()}`
                            : 'Returns not configured'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800/40">
                        <span>Stock Status:</span>
                        <span className={`text-[11px] font-sans font-semibold ${isAvailable ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {m.status !== 'ACTIVE' ? m.status : !m.purchaseAvailable ? 'Leasing Paused' : isPriceUnavailable ? 'Price Pending' : 'In Stock & Verified'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0 flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedMachine(m);
                      setModalMode('details');
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer text-center"
                  >
                    View Details
                  </button>

                  {m.category === 'STARTER' || m.price === 0 ? (
                    trialStatus?.hasActiveTrial ? (
                      <button
                        onClick={() => onNavigate('/wallet')}
                        className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-cyan-950 border border-cyan-500/40 text-cyan-300 shadow-md cursor-pointer text-center flex items-center justify-center gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                        <span>Active: {formatCountdown(countdownMs)}</span>
                      </button>
                    ) : trialStatus?.isExpired ? (
                      <button
                        disabled
                        className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-800/60 border border-slate-700/60 text-slate-500 cursor-not-allowed text-center"
                      >
                        Trial Expired (48h)
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedMachine(m);
                          setModalMode('purchase');
                          setTermsAccepted(false);
                          setPurchaseError(null);
                          setPurchaseSuccess(null);
                        }}
                        className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-md shadow-emerald-500/20 cursor-pointer text-center flex items-center justify-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Activate 48h Trial</span>
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => {
                        if (!isAvailable) return;
                        setSelectedMachine(m);
                        setModalMode('purchase');
                        setTermsAccepted(false);
                        setPurchaseError(null);
                        setPurchaseSuccess(null);
                      }}
                      disabled={!isAvailable}
                      title={isPriceUnavailable ? 'Price verification pending' : undefined}
                      className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                        isAvailable
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/20'
                          : 'bg-slate-800/60 border border-slate-700/60 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isPriceUnavailable ? 'Price Unavailable' : 'Lease Unit'}
                      {isAvailable && <ArrowRight className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Machine Details / Purchase Modal */}
      {selectedMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedMachine.name}</h2>
                  <p className="text-xs text-slate-400 font-mono">Model: {selectedMachine.model || 'Standard'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMachine(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalMode === 'details' ? (
              <div className="space-y-6">
                <div className="rounded-2xl overflow-hidden h-56 bg-slate-950 border border-slate-800">
                  <img src={selectedMachine.image} alt={selectedMachine.name} className="w-full h-full object-cover" />
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-white">Machine Description</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{selectedMachine.description}</p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-white">Technical Specifications</h4>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono">
                    {selectedMachine.specifications || 'Industrial-grade water purification and telemetry monitoring unit.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3 border-y border-slate-800 font-mono text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 block mb-1">Water Capacity</span>
                    <span className="text-white font-bold text-sm">{selectedMachine.waterCapacity || 'High Volume'}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 block mb-1">Purchase Price</span>
                    <span className="text-cyan-300 font-bold text-sm">
                      {selectedMachine.price === null || selectedMachine.price === undefined
                        ? 'Price unavailable'
                        : selectedMachine.price === 0 && selectedMachine.category === 'STARTER'
                        ? 'FREE TRIAL'
                        : `UGX ${selectedMachine.price.toLocaleString()}`}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 block mb-1">Daily Return Amount</span>
                    <span className="text-cyan-300 font-bold text-sm">UGX {selectedMachine.configuredDailyReward.toLocaleString()}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 block mb-1">Est. Monthly Return ({daysInCurrentMonth} days)</span>
                    <span className="text-emerald-300 font-bold text-sm">
                      {selectedMachine.returnsConfigured
                        ? `UGX ${(selectedMachine.configuredDailyReward * daysInCurrentMonth).toLocaleString()}`
                        : 'Returns not configured'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setSelectedMachine(null)}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      if (selectedMachine.price === null || selectedMachine.price === undefined) return;
                      setModalMode('purchase');
                    }}
                    disabled={selectedMachine.price === null || selectedMachine.price === undefined}
                    className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 ${
                      selectedMachine.price === null || selectedMachine.price === undefined
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 cursor-pointer'
                    }`}
                  >
                    {selectedMachine.price === null || selectedMachine.price === undefined
                      ? 'Price Unavailable'
                      : 'Proceed to Lease'}
                    {selectedMachine.price !== null && selectedMachine.price !== undefined && (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-800/50 flex items-center justify-between font-mono">
                  <div>
                    <div className="text-xs text-slate-400">Selected Machine</div>
                    <div className="text-sm font-bold text-white">{selectedMachine.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Total Price</div>
                    <div className="text-base font-bold text-cyan-300">
                      {selectedMachine.price === null || selectedMachine.price === undefined
                        ? 'Price unavailable'
                        : selectedMachine.price === 0 && selectedMachine.category === 'STARTER'
                        ? 'FREE'
                        : `UGX ${selectedMachine.price.toLocaleString()}`}
                    </div>
                  </div>
                </div>

                {purchaseError && (
                  <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{purchaseError}</span>
                  </div>
                )}

                {purchaseSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{purchaseSuccess}</span>
                  </div>
                )}

                {selectedMachine.price > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      Select Payment Method
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('WALLET')}
                        className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                          paymentMethod === 'WALLET'
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <Wallet className="w-5 h-5 text-cyan-400" />
                        <div>
                          <div className="text-xs font-bold text-white">Wallet Balance</div>
                          <div className="text-[11px] text-slate-400">Instant Settlement</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('MOBILE_MONEY')}
                        className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                          paymentMethod === 'MOBILE_MONEY'
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <Smartphone className="w-5 h-5 text-cyan-400" />
                        <div>
                          <div className="text-xs font-bold text-white">Mobile Money</div>
                          <div className="text-[11px] text-slate-400">MTN / Airtel</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
                  <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    Lease Terms & Financial Disclosures
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    By leasing this water filtration unit, you agree to verified performance return accounting based on active water telemetry. Returns are credited daily according to the verified operational model. Minimum withdrawal is UGX 10,000 with a 2% settlement fee.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="terms" className="text-xs text-slate-300 cursor-pointer">
                    I have read and accept the machine lease terms and return conditions.
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setModalMode('details')}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Back to Details
                  </button>
                  <button
                    onClick={handlePurchase}
                    disabled={purchasing}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-500/20 cursor-pointer flex items-center gap-2 disabled:opacity-60"
                  >
                    {purchasing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        Processing Order...
                      </>
                    ) : (
                      'Confirm Lease & Purchase'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
