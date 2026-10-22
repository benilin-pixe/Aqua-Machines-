import React, { useState, useEffect } from 'react';
import { DailyEarningsChart } from '../components/DailyEarningsChart';
import { DailyEarning, Machine } from '../types';
import {
  Droplets,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  Server,
  Clock,
  Sparkles
} from 'lucide-react';

interface DashboardPageProps {
  onNavigateToMachines: () => void;
  onNavigateToWallet: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToMachines,
  onNavigateToWallet,
}) => {
  const [wallet, setWallet] = useState<{ availableBalance: number; pendingBalance: number; totalRewards: number; totalWithdrawals: number } | null>(null);
  const [rewardTransactions, setRewardTransactions] = useState<any[]>([]);
  const [activeSubscriptionsCount, setActiveSubscriptionsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('aqua_user_token') || sessionStorage.getItem('aqua_user_token');
    if (token) {
      fetch('/api/wallet', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.wallet) {
            setWallet(data.wallet);
          }
        })
        .catch(() => {});

      fetch('/api/wallet/rewards', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.rewardTransactions)) {
            setRewardTransactions(data.rewardTransactions);
          }
        })
        .catch(() => {});
    }
    setLoading(false);
  }, []);

  const availableBalance = wallet?.availableBalance || 0;
  const totalEarned = wallet?.totalRewards || 0;

  // Build chart data from actual reward transactions, or empty if none
  const chartData: DailyEarning[] = rewardTransactions.map((r: any) => ({
    date: new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    day: new Date(r.createdAt).toLocaleDateString('en-US', { weekday: 'short' }),
    earnings: r.amount,
    cumulative: r.amount, // Real ledger record
    machineCount: 1,
  }));

  const totalRewardsYield = rewardTransactions.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 border border-cyan-800/40 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Aqua Machines Water Telemetry Active
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Powering Water. <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-200">Rewarding Participation.</span>
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
              Lease commercial water purification units, monitor clean output telemetry, and collect verified daily performance yields.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onNavigateToMachines}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Server className="w-4 h-4" />
              Explore Machines
            </button>
            <button
              onClick={onNavigateToWallet}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-white font-semibold text-sm transition-all cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4 text-cyan-400" />
              Withdraw Yield
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
            <span>Available Balance</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            UGX {availableBalance.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Ready for instant mobile withdrawal
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
            <span>Verified Telemetry Reward</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Droplets className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-cyan-300 font-mono">
            UGX {totalRewardsYield.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-400" />
            From verified machine operation
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
            <span>Active Leased Units</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {activeSubscriptionsCount} Units
          </div>
          <div className="mt-2 text-xs text-cyan-400">
            Active verified leases
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
            <span>Total Lifetime Earned</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            UGX {totalEarned.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            100% verified settlement records
          </div>
        </div>
      </div>

      {/* Daily Earnings Chart Component (Recharts) or Empty State */}
      {chartData.length > 0 ? (
        <DailyEarningsChart
          data={chartData}
          timeframe="Verified Yields"
          totalEarnings={totalRewardsYield}
        />
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center shadow-xl">
          <Droplets className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Earnings Recorded Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
            Lease a water machine unit from the catalogue to start generating verified telemetry performance rewards.
          </p>
          <button
            onClick={onNavigateToMachines}
            className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
          >
            Explore Water Machines Catalogue
          </button>
        </div>
      )}
    </div>
  );
};
