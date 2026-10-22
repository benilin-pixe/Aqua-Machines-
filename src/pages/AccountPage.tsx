import React from 'react';
import { User, Mail, Shield, CheckCircle2, LogOut, Calendar, KeyRound, Award } from 'lucide-react';
import { User as UserType } from '../types';

interface AccountPageProps {
  user: UserType | null;
  onLogout: () => void;
  onNavigate: (path: string) => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({ user, onLogout, onNavigate }) => {
  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3">
          <User className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Authentication Required</h2>
        <p className="text-xs text-slate-400 mb-5">Please sign in to view your account details.</p>
        <button
          onClick={() => onNavigate('/login')}
          className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold text-xl">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{user.fullName}</h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{user.email}</p>
            </div>
          </div>

          <div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950 hover:bg-red-950/40 border border-slate-800 hover:border-red-800 text-xs font-semibold text-slate-300 hover:text-red-300 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              Account Status
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-bold text-emerald-300 uppercase tracking-wide">
                {user.status || 'ACTIVE'}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Award className="w-3.5 h-3.5 text-cyan-400" />
              Platform Role
            </div>
            <div className="text-sm font-bold text-white uppercase tracking-wide mt-1">
              {user.role || 'USER'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              Registered Email
            </div>
            <div className="text-sm font-mono text-slate-200 mt-1 truncate">
              {user.email}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              Member Since
            </div>
            <div className="text-sm text-slate-200 mt-1">
              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active'}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Session secured with verified JSON Web Token
          </span>
          <button
            onClick={() => onNavigate('/')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
          >
            Go to Dashboard &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
