import React, { useState } from 'react';
import { Shield, Mail, ArrowLeft, Send, CheckCircle2, AlertCircle } from 'lucide-react';

interface AdminForgotPasswordPageProps {
  onNavigate: (path: string) => void;
}

export const AdminForgotPasswordPage: React.FC<AdminForgotPasswordPageProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please provide a valid administrator email address format.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/admin/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      await res.json();
      // Security requirement: Never reveal whether an email is registered as admin
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit recovery request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-10 px-4">
      <div className="w-full max-w-md bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-3">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Admin Password Recovery</h1>
          <p className="text-xs text-slate-300 mt-1">
            Enter your authorized administrator email address to receive secure reset instructions
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {submitted ? (
          <div className="space-y-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white mb-2">Recovery Request Dispatched</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                If an administrative account with this email address exists in Aqua Machines, password recovery instructions have been dispatched to your inbox.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => onNavigate('/admin/login')}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Admin Login
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Administrator Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@aquamachines.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs tracking-wide shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    Dispatching Instructions...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Password Reset Link
                  </>
                )}
              </button>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => onNavigate('/admin/login')}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Admin Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
