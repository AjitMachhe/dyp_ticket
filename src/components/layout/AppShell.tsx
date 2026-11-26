import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import type { UserRole } from '../../types/database';
import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  BarChart3,
  Building2,
  BookOpen,
  QrCode,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_CONFIG } from '../../lib/rbac';


export const AppShell: React.FC = () => {
  const {
    profile,
    activeRole,
    roleMeta,
    selectedInstitutionId,
    setSelectedInstitutionId,
    institutions,
    switchDemoRole,
    signOut,
  } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, show: true },
    { to: '/tickets', label: 'Service Tickets', icon: Ticket, show: true },
    { to: '/tickets/new', label: 'Raise Ticket', icon: PlusCircle, show: true },
    { to: '/reports', label: 'Reports & SLA', icon: BarChart3, show: roleMeta.canViewReports },
    {
      to: '/admin',
      label: 'Colleges & Rules',
      icon: Building2,
      show: roleMeta.canManageInstitutions || activeRole === 'college_admin',
    },
    { to: '/kb', label: 'Knowledge Base', icon: BookOpen, show: true },
    { to: '/qr-hub', label: 'Campus QR Codes', icon: QrCode, show: true },
  ].filter((item) => item.show);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-canvas text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-68 bg-white/90 backdrop-blur-xl border-r border-slate-200/80 sticky top-0 h-screen">
        {/* Brand Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
            DYP
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold tracking-tight text-slate-900 truncate">
              D. Y. Patil Group
            </h1>
            <p className="text-xs text-slate-500 truncate">Unified Service Desk</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-50 text-brand-600 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Footer Card */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-semibold text-slate-900 truncate">
                {profile?.full_name || 'DYP Demo User'}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleMeta.badgeColor}`}
              >
                {roleMeta.shortLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              {profile?.email || 'admin@dypatilgroup.edu.in'}
            </p>
          </div>

          {profile && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Command Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 px-4 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Institution Scope Selector */}
            <div className="relative flex items-center">
              <Building2 className="w-4 h-4 text-brand-600 absolute left-3 pointer-events-none" />
              <select
                value={selectedInstitutionId}
                onChange={(e) => setSelectedInstitutionId(e.target.value)}
                disabled={roleMeta.scope === 'institution' || roleMeta.scope === 'department'}
                className="pl-9 pr-8 py-1.5 bg-slate-100/80 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-75 appearance-none cursor-pointer max-w-[220px] sm:max-w-xs truncate"
              >
                {roleMeta.scope === 'all' && (
                  <option value="ALL">All D. Y. Patil Institutions</option>
                )}
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.code} — {inst.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Right Controls: 8-Role Live Switcher + Quick Create */}
          <div className="flex items-center gap-2.5">
            {!profile || profile.role === 'super_admin' ? (
              <div className="hidden sm:flex items-center gap-2 bg-indigo-50/70 border border-indigo-200/80 rounded-xl px-2.5 py-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="text-[11px] font-medium text-indigo-700 hidden md:inline">
                  Role View:
                </span>
                <select
                  value={activeRole}
                  onChange={(e) => switchDemoRole(e.target.value as UserRole)}
                  className="bg-transparent text-xs font-semibold text-indigo-900 focus:outline-none cursor-pointer"
                >
                  {Object.values(ROLE_CONFIG).map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span
                className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border ${roleMeta.badgeColor}`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {roleMeta.label}
              </span>
            )}

            <button
              onClick={() => navigate('/tickets/new')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-medium shadow-xs transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>New Ticket</span>
            </button>
          </div>

        </header>

        {/* Main View Canvas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col p-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-xs">
                  DYP
                </div>
                <span className="font-bold text-sm">D. Y. Patil Desk</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Role Switcher */}
            <div className="mt-4 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100">
              <label className="block text-[11px] font-semibold text-indigo-700 mb-1">
                Switch Role View
              </label>
              <select
                value={activeRole}
                onChange={(e) => {
                  switchDemoRole(e.target.value as UserRole);
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800"
              >
                {Object.values(ROLE_CONFIG).map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <nav className="mt-4 space-y-1 flex-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                        isActive
                          ? 'bg-brand-50 text-brand-600'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};