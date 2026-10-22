import React, { useState, useEffect } from 'react';
import { Wallet, ArrowDownRight, ArrowUpRight, History, CreditCard, Send, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { User } from '../types';

interface WalletPageProps {
  currentUser: User | null;
  userToken: string | null;
  onNavigate: (path: string) => void;
}

export const WalletPage: React.FC<WalletPageProps> = ({ currentUser, userToken, onNavigate }) => {
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Deposit form state
  const [depositAmount, setDepositAmount] = useState('');
  const [depositProvider, setDepositProvider] = useState('MTN_MOBILE_MONEY');
  const [depositLoading, setDepositLoading] = useState(false);
  const [pendingDepositPayment, setPendingDepositPayment] = useState<any>(null);

  // Withdrawal form state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [networkProvider, setNetworkProvider] = useState('MTN');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'deposit' | 'withdraw' | 'history'>('overview');

  const loadWalletData = async () => {
    if (!userToken) return;
    setLoading(true);
    setError(null);
    try {
      const [wRes, txRes, wdrRes] = await Promise.all([
        fetch('/api/wallet', { headers: { Authorization: `Bearer ${userToken}` } }),
        fetch('/api/wallet/transactions', { headers: { Authorization: `Bearer ${userToken}` } }),
        fetch('/api/wallet/withdrawals', { headers: { Authorization: `Bearer ${userToken}` } }),
      ]);

      if (wRes.ok) {
        const wData = await wRes.json();
        setWallet(wData.wallet);
      }
      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData.transactions || []);
      }
      if (wdrRes.ok) {
        const wdrData = await wdrRes.json();
        setWithdrawals(wdrData.withdrawals || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load wallet information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWalletData();
  }, [userToken]);

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const amountNum = Number(depositAmount);
    if (!amountNum || amountNum < 5000) {
      setError('Minimum deposit amount is UGX 5,000.');
      return;
    }

    setDepositLoading(true);
    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ amount: amountNum, provider: depositProvider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize deposit.');
      setPendingDepositPayment(data.payment);
      setSuccess('Deposit payment initialized. Verify payment to credit your wallet instantly.');
    } catch (err: any) {
      setError(err?.message || 'Deposit failed.');
    } finally {
      setDepositLoading(false);
    }
  };

  const handleVerifyDeposit = async (paymentId: string) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/payments/${paymentId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ simulateOutcome: 'SUCCESS' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment verification failed.');
      setSuccess('Deposit verified and credited successfully!');
      setPendingDepositPayment(null);
      setDepositAmount('');
      loadWalletData();
    } catch (err: any) {
      setError(err?.message || 'Verification error.');
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const amountNum = Number(withdrawAmount);
    if (!amountNum || amountNum <= 0) {
      setError('Please enter a valid withdrawal amount.');
      return;
    }
    if (!mobileNumber || mobileNumber.trim().length < 9) {
      setError('Please enter a valid Mobile Money number.');
      return;
    }

    setWithdrawLoading(true);
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          amount: amountNum,
          mobileNumber: mobileNumber.trim(),
          networkProvider,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Withdrawal request failed.');
      setSuccess('Withdrawal request submitted successfully.');
      setWithdrawAmount('');
      setMobileNumber('');
      setActiveTab('overview');
      loadWalletData();
    } catch (err: any) {
      setError(err?.message || 'Withdrawal failed.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3">
          <Wallet className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Sign In Required</h2>
        <p className="text-xs text-slate-400 mb-5">Please sign in to access your wallet and balance.</p>
        <button
          onClick={() => onNavigate('/login')}
          className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
        >
          Sign In
        </button>
      </div>
    );
  }

  const availableBalance = wallet?.availableBalance || 0;
  const pendingBalance = wallet?.pendingBalance || 0;
  const totalWithdrawals = wallet?.totalWithdrawals || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Wallet & Settlement Ledger</h1>
            <p className="text-xs text-slate-400 mt-0.5">Secure mobile money deposits, withdrawals, and water machine earnings</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadWalletData}
            className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors cursor-pointer"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Account Pending Registration Fee Banner */}
      {currentUser.status === 'PENDING_PAYMENT' && (
        <div className="p-5 rounded-3xl bg-amber-950/40 border border-amber-600/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-amber-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              Registration Fee Pending (UGX 10,000)
            </div>
            <p className="text-xs text-amber-300/80 mt-1">
              Your account requires the one-time UGX 10,000 registration fee to activate full machine leasing & payout features.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('deposit')}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors whitespace-nowrap cursor-pointer shadow-lg"
          >
            Pay UGX 10,000 Fee Now
          </button>
        </div>
      )}

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-cyan-400" />
            Available Balance
          </div>
          <div className="text-2xl font-bold text-cyan-300 font-mono">
            UGX {availableBalance.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Ready for withdrawal or machine leasing</div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            Pending Processing
          </div>
          <div className="text-2xl font-bold text-amber-300 font-mono">
            UGX {pendingBalance.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Reserved for pending withdrawal requests</div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            Lifetime Withdrawn
          </div>
          <div className="text-2xl font-bold text-emerald-300 font-mono">
            UGX {totalWithdrawals.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Successfully disbursed to mobile money</div>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-slate-900/90 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('deposit')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'deposit'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Deposit Funds
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'withdraw'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Withdraw Payout
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Transaction Ledger
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('deposit')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-950/80 border border-cyan-800 text-cyan-300 hover:bg-cyan-900 text-xs font-semibold cursor-pointer"
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            Deposit
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 hover:bg-emerald-900 text-xs font-semibold cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            Withdraw
          </button>
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              Recent Wallet Transactions
            </h3>

            {transactions.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                No transactions recorded yet. Make a deposit or lease a water machine to begin.
              </div>
            ) : (
              <div className="space-y-2.5">
                {transactions.slice(0, 5).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          tx.amount >= 0
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                            : 'bg-red-500/10 border border-red-500/30 text-red-400'
                        }`}
                      >
                        {tx.amount >= 0 ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{tx.description}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Ref: {tx.reference} &bull; {new Date(tx.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-bold font-mono ${
                          tx.amount >= 0 ? 'text-emerald-300' : 'text-slate-200'
                        }`}
                      >
                        {tx.amount >= 0 ? '+' : ''}UGX {tx.amount.toLocaleString()}
                      </div>
                      <span className="inline-block px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono mt-1 uppercase">
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Deposit Funds */}
      {activeTab === 'deposit' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-cyan-400" />
              Deposit Funds or Pay Registration Fee
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Add funds to your Aqua Machines wallet via Mobile Money or Bank Transfer (Min: UGX 5,000)
            </p>
          </div>

          {pendingDepositPayment ? (
            <div className="p-6 rounded-2xl bg-cyan-950/40 border border-cyan-800/60 space-y-4">
              <div className="text-sm font-bold text-cyan-300">Deposit Payment Initialized</div>
              <p className="text-xs text-slate-300">
                Reference: <span className="font-mono text-white font-bold">{pendingDepositPayment.reference}</span>
              </p>
              <p className="text-xs text-slate-300">
                Amount: <span className="font-mono text-white font-bold">UGX {pendingDepositPayment.amount.toLocaleString()}</span>
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handleVerifyDeposit(pendingDepositPayment.id)}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                >
                  Confirm & Verify Payment
                </button>
                <button
                  onClick={() => setPendingDepositPayment(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Deposit Amount (UGX)
                </label>
                <input
                  type="number"
                  min="5000"
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="e.g. 10000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Payment Gateway / Provider
                </label>
                <select
                  value={depositProvider}
                  onChange={(e) => setDepositProvider(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="MTN_MOBILE_MONEY">MTN Mobile Money (Uganda)</option>
                  <option value="AIRTEL_MONEY">Airtel Money (Uganda)</option>
                  <option value="VISA_MASTERCARD">Visa / Mastercard Gateway</option>
                </select>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Transfer Fee:</span>
                  <span className="text-emerald-400 font-mono">UGX 0 (Covered by Platform)</span>
                </div>
                <div className="flex justify-between font-bold text-white">
                  <span>Total Payable:</span>
                  <span className="font-mono text-cyan-300">UGX {Number(depositAmount || 0).toLocaleString()}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={depositLoading}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {depositLoading ? 'Initializing Deposit...' : 'Proceed to Payment Gateway'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Tab 3: Withdraw Payout */}
      {activeTab === 'withdraw' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              Request Withdrawal to Mobile Money
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Minimum withdrawal: UGX {(db_settings_min_withdrawal => 10000)(0).toLocaleString()}. 2% administrative settlement fee applies.
            </p>
          </div>

          <form onSubmit={handleWithdrawSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Withdrawal Amount (UGX)
              </label>
              <input
                type="number"
                min="10000"
                max={availableBalance}
                required
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <div className="text-[11px] text-slate-500 mt-1">
                Available Eligible Balance: <span className="font-mono text-cyan-300">UGX {availableBalance.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Network Provider
                </label>
                <select
                  value={networkProvider}
                  onChange={(e) => setNetworkProvider(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="MTN">MTN Mobile Money</option>
                  <option value="AIRTEL">Airtel Money</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mobile Money Phone Number
                </label>
                <input
                  type="text"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="0771234567 or 0751234567"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Requested Amount:</span>
                <span className="text-white font-mono">UGX {Number(withdrawAmount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Settlement Fee (2%):</span>
                <span className="text-amber-400 font-mono">- UGX {Math.round(Number(withdrawAmount || 0) * 0.02).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-white pt-1 border-t border-slate-800">
                <span>Net Payout to Phone:</span>
                <span className="font-mono text-emerald-300">UGX {Math.max(0, Number(withdrawAmount || 0) - Math.round(Number(withdrawAmount || 0) * 0.02)).toLocaleString()}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={withdrawLoading || Number(withdrawAmount || 0) > availableBalance}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {withdrawLoading ? 'Submitting Request...' : 'Submit Withdrawal Request'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 4: Transaction Ledger History */}
      {activeTab === 'history' && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            Complete Transaction Ledger
          </h3>

          {transactions.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">No transaction records found.</div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs"
                >
                  <div>
                    <div className="font-semibold text-white">{tx.description}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Ref: {tx.reference} &bull; {new Date(tx.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold font-mono ${tx.amount >= 0 ? 'text-emerald-300' : 'text-slate-200'}`}>
                      {tx.amount >= 0 ? '+' : ''}UGX {tx.amount.toLocaleString()}
                    </div>
                    <span className="inline-block px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono mt-1 uppercase">
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
