import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { SignupPage } from './pages/SignupPage';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { AccountPage } from './pages/AccountPage';
import { WalletPage } from './pages/WalletPage';
import { AdminUsersView } from './pages/AdminPages/AdminUsersView';
import { AdminFundAllocationView } from './pages/AdminPages/AdminFundAllocationView';
import { AdminSetupPage } from './pages/AdminPages/AdminSetupPage';
import { AdminLoginPage } from './pages/AdminPages/AdminLoginPage';
import { AdminForgotPasswordPage } from './pages/AdminPages/AdminForgotPasswordPage';
import { Logo } from './components/Logo';
import { WaterCursorEffect } from './components/WaterCursorEffect';
import {
  Server,
  Wallet,
  Shield,
  CheckCircle,
  ArrowRight,
  LogOut,
  Users,
  Settings as SettingsIcon,
  Activity,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import { Machine, User } from './types';

export default function App() {
  // Path state initialized from browser URL
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  // User auth state
  const [userToken, setUserToken] = useState<string | null>(() => {
    return localStorage.getItem('aqua_user_token') || sessionStorage.getItem('aqua_user_token') || null;
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Admin auth state
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return sessionStorage.getItem('aqua_admin_token') || null;
  });
  const [currentAdmin, setCurrentAdmin] = useState<any | null>(null);
  const [setupAvailable, setSetupAvailable] = useState<boolean>(false);

  // Machine catalog data
  const [machines, setMachines] = useState<Machine[]>([]);
  const [adminSubTab, setAdminSubTab] = useState<'users' | 'overview' | 'allocations'>('users');

  // PushState Navigation helper
  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Listen for browser forward/back buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Verify and fetch setup availability
  const checkSetupStatus = useCallback(() => {
    fetch('/api/auth/admin/setup-status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setSetupAvailable(data.setupAvailable);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    checkSetupStatus();

    // Fetch machine models for the catalog
    fetch('/api/machines')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.machines) {
          setMachines(data.machines);
        }
      })
      .catch(() => {});
  }, [checkSetupStatus]);

  // Restore authenticated user session securely
  useEffect(() => {
    if (userToken) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${userToken}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.user) {
            setCurrentUser(data.user);
          } else {
            // Expired or invalid token
            setUserToken(null);
            setCurrentUser(null);
            localStorage.removeItem('aqua_user_token');
            sessionStorage.removeItem('aqua_user_token');
          }
        })
        .catch(() => {
          setUserToken(null);
          setCurrentUser(null);
          localStorage.removeItem('aqua_user_token');
          sessionStorage.removeItem('aqua_user_token');
        });
    } else {
      setCurrentUser(null);
    }
  }, [userToken]);

  // Restore authenticated admin session securely
  useEffect(() => {
    if (adminToken) {
      fetch('/api/auth/admin/me', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.admin) {
            setCurrentAdmin(data.admin);
          } else {
            setAdminToken(null);
            setCurrentAdmin(null);
            sessionStorage.removeItem('aqua_admin_token');
          }
        })
        .catch(() => {
          setAdminToken(null);
          setCurrentAdmin(null);
          sessionStorage.removeItem('aqua_admin_token');
        });
    } else {
      setCurrentAdmin(null);
    }
  }, [adminToken]);

  // Handle User Login / Register Success
  const handleUserAuthSuccess = (token: string, user: User, rememberMe: boolean = false) => {
    setUserToken(token);
    setCurrentUser(user);
    if (rememberMe) {
      localStorage.setItem('aqua_user_token', token);
    } else {
      sessionStorage.setItem('aqua_user_token', token);
    }
    navigate('/');
  };

  const handleUserLogout = () => {
    setUserToken(null);
    setCurrentUser(null);
    localStorage.removeItem('aqua_user_token');
    sessionStorage.removeItem('aqua_user_token');
    navigate('/login');
  };

  // Handle Admin Auth Success
  const handleAdminAuthSuccess = (token: string, admin: any) => {
    setAdminToken(token);
    setCurrentAdmin(admin);
    sessionStorage.setItem('aqua_admin_token', token);
    checkSetupStatus();
    navigate('/admin/dashboard');
  };

  const handleAdminLogout = () => {
    setAdminToken(null);
    setCurrentAdmin(null);
    sessionStorage.removeItem('aqua_admin_token');
    navigate('/admin/login');
  };

  // Render Route Content
  const renderRoute = () => {
    // 1. /signup
    if (currentPath === '/signup') {
      return (
        <SignupPage
          onNavigate={navigate}
          onSuccess={(token, user) => handleUserAuthSuccess(token, user, false)}
        />
      );
    }

    // 2. /login
    if (currentPath === '/login') {
      return (
        <LoginPage
          onNavigate={navigate}
          onSuccess={handleUserAuthSuccess}
        />
      );
    }

    // 3. /forgot-password
    if (currentPath === '/forgot-password') {
      return <ForgotPasswordPage onNavigate={navigate} />;
    }

    // 4. /admin/setup
    if (currentPath === '/admin/setup') {
      return (
        <AdminSetupPage
          onSetupSuccess={handleAdminAuthSuccess}
          onNavigateToLogin={() => navigate('/admin/login')}
        />
      );
    }

    // 5. /admin/login
    if (currentPath === '/admin/login') {
      return (
        <AdminLoginPage
          onLoginSuccess={handleAdminAuthSuccess}
          onNavigateToSetup={() => navigate('/admin/setup')}
          onNavigate={navigate}
          setupAvailable={setupAvailable}
        />
      );
    }

    // 5b. /admin/forgot-password
    if (currentPath === '/admin/forgot-password') {
      return <AdminForgotPasswordPage onNavigate={navigate} />;
    }

    // 6. /admin/dashboard (or /admin)
    if (currentPath === '/admin/dashboard' || currentPath === '/admin') {
      if (!adminToken) {
        // Redirection to /admin/login for unauthenticated visitors
        return (
          <AdminLoginPage
            onLoginSuccess={handleAdminAuthSuccess}
            onNavigateToSetup={() => navigate('/admin/setup')}
            onNavigate={navigate}
            setupAvailable={setupAvailable}
          />
        );
      }

      return (
        <div className="space-y-6 pb-12">
          {/* Admin Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-amber-500/30 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>AQUA MACHINES ADMIN DASHBOARD</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-950 border border-amber-800 text-amber-300 text-[10px] font-mono">
                    {currentAdmin?.role || 'SUPER_ADMIN'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  Logged in as {currentAdmin?.email || 'admin@aquamachines.com'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setAdminSubTab('users')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  adminSubTab === 'users'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                User Management
              </button>

              <button
                onClick={() => setAdminSubTab('allocations')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  adminSubTab === 'allocations'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                Fund Allocation
              </button>

              <button
                onClick={handleAdminLogout}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-red-950/40 border border-slate-800 hover:border-red-800 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>

          {/* Admin Subview */}
          {adminSubTab === 'users' && <AdminUsersView adminToken={adminToken} />}
          {adminSubTab === 'allocations' && <AdminFundAllocationView adminToken={adminToken} />}
        </div>
      );
    }

    // 7. /account
    if (currentPath === '/account') {
      return (
        <AccountPage
          user={currentUser}
          onLogout={handleUserLogout}
          onNavigate={navigate}
        />
      );
    }

    // 8. /machines
    if (currentPath === '/machines') {
      return (
        <div className="space-y-6 pb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Server className="w-6 h-6 text-cyan-400" />
                Commercial Water Machinery Catalog
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Verified high-output filtration stations indexed with daily performance telemetry
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {machines.map((m) => (
              <div
                key={m.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 flex flex-col justify-between hover:border-cyan-500/40 transition-all shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300">
                      {m.category}
                    </span>
                    <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {m.status}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">{m.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                    {m.description}
                  </p>

                  <div className="space-y-2.5 py-3 border-y border-slate-800 text-xs font-mono">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Lease Cost:</span>
                      <span className="font-bold text-white">
                        {m.price === 0 ? 'FREE TRIAL' : `UGX ${m.price.toLocaleString()}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Daily Telemetry Reward:</span>
                      <span className="font-bold text-cyan-300">
                        UGX {m.configuredDailyReward.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Active Duration:</span>
                      <span className="text-slate-300">{m.durationDays} Days</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!currentUser) {
                      navigate('/login');
                    } else {
                      navigate('/wallet');
                    }
                  }}
                  className="mt-5 w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {currentUser ? 'Lease Unit Now' : 'Sign In to Lease'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 9. /wallet
    if (currentPath === '/wallet') {
      return (
        <WalletPage
          currentUser={currentUser}
          userToken={userToken}
          onNavigate={navigate}
        />
      );
    }

    // Default: Home Dashboard (/)
    return (
      <DashboardPage
        onNavigateToMachines={() => navigate('/machines')}
        onNavigateToWallet={() => navigate('/wallet')}
      />
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-white relative">
      <WaterCursorEffect />
      {/* Navigation */}
      <Navbar
        currentPath={currentPath}
        onNavigate={navigate}
        currentUser={currentUser}
        currentAdmin={currentAdmin}
        onUserLogout={handleUserLogout}
        onAdminLogout={handleAdminLogout}
      />

      {/* Main Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {renderRoute()}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <Logo size={24} showText={false} />
            <span className="font-semibold text-slate-400">AQUA MACHINES</span>
            <span>&mdash; Water Infrastructure & Participation Rewards</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => navigate('/admin/login')}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              Admin Portal
            </button>
            <span>&bull;</span>
            <span className="text-slate-600">
              &copy; {new Date().getFullYear()} Aqua Machines Platform. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
