import React from 'react';
import { Logo } from './Logo';
import { LayoutDashboard, Server, Wallet, Shield, LogOut, User as UserIcon, LogIn, UserPlus } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  currentUser: User | null;
  currentAdmin: any | null;
  onUserLogout: () => void;
  onAdminLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPath,
  onNavigate,
  currentUser,
  currentAdmin,
  onUserLogout,
  onAdminLogout,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-950/85 border-b border-slate-800/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Brand Logo */}
          <div
            onClick={() => onNavigate('/')}
            className="cursor-pointer transition-opacity hover:opacity-90"
          >
            <Logo size={38} showText={true} />
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800/80">
            <button
              onClick={() => onNavigate('/')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                currentPath === '/' || currentPath === '/dashboard'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>

            <button
              onClick={() => onNavigate('/machines')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                currentPath === '/machines'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Server className="w-4 h-4" />
              Machine Leases
            </button>

            <button
              onClick={() => onNavigate('/wallet')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                currentPath === '/wallet'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Wallet className="w-4 h-4" />
              Wallet & Payouts
            </button>

            <button
              onClick={() => onNavigate(currentAdmin ? '/admin/dashboard' : '/admin/login')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                currentPath.startsWith('/admin')
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-amber-200 hover:bg-slate-800/50'
              }`}
            >
              <Shield className="w-4 h-4" />
              Admin Portal
            </button>
          </nav>

          {/* Right Action / Auth Area */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('/account')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    currentPath === '/account'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-700 flex items-center justify-center text-[11px] font-bold text-cyan-300">
                    {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="hidden sm:inline text-xs font-medium max-w-[120px] truncate">
                    {currentUser.fullName}
                  </span>
                </button>

                <button
                  onClick={onUserLogout}
                  title="Sign out"
                  className="p-2 rounded-xl bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-800 text-slate-400 hover:text-red-300 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('/login')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                  Sign In
                </button>

                <button
                  onClick={() => onNavigate('/signup')}
                  className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
