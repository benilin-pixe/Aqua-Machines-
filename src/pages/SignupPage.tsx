import React, { useState } from 'react';
import { Logo } from '../components/Logo';
import { User, Mail, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, Zap } from 'lucide-react';
import { safeFetch, formatError } from '../utils/api';

interface SignupPageProps {
  onNavigate: (path: string) => void;
  onSuccess: (token: string, user: any) => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onNavigate, onSuccess }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleQuickDemoFill = () => {
    const timestamp = Date.now().toString().slice(-6);
    setFullName('Aqua Partner ' + timestamp);
    setEmail(`partner_${timestamp}@aquamachines.tech`);
    setPassword('Password123!');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await safeFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
        }),
      });

      if (!res.ok) {
        throw new Error(res.data.message || res.data.error || 'Registration failed. Please check your details.');
      }

      const token = res.data.token || res.data.data?.token;
      const user = res.data.user || res.data.data?.user;

      if (!token || !user) {
        throw new Error('Registration succeeded but session data was incomplete.');
      }

      setSuccess('Account created successfully! Redirecting...');
      setTimeout(() => {
        onSuccess(token, user);
      }, 1200);
    } catch (err: unknown) {
      setError(formatError(err, 'Failed to complete registration.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-10 px-4">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-6">
          <div className="inline-block mb-3 cursor-pointer" onClick={() => onNavigate('/')}>
            <Logo size={42} showText={false} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create Your Account</h1>
          <p className="text-xs text-slate-400 mt-1">
            Join Aqua Machines to lease water units and earn daily rewards in seconds.
          </p>
        </div>

        {/* Quick Demo Fill Button */}
        <div className="mb-5">
          <button
            type="button"
            onClick={handleQuickDemoFill}
            className="w-full py-2 px-3 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>⚡ Quick Fill Demo Account</span>
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Sarah Namubiru"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Password (min 6 characters)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs tracking-wide shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account & Start
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Already have an account?{' '}
            <button
              onClick={() => onNavigate('/login')}
              className="text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer underline underline-offset-2"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
