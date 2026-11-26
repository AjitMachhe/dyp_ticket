
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  Layers,
  Plus,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { StatusPill, PriorityBadge, SlaTimerBadge } from '../../components/common/TicketBadges';
import type { Ticket, TicketStatus } from '../../types/database';

const STATUS_BAR_COLORS: Record<TicketStatus, string> = {
  Open: 'bg-sky-500',
  Assigned: 'bg-indigo-500',
  'In Progress': 'bg-amber-500',
  'On Hold': 'bg-purple-500',
  Resolved: 'bg-emerald-500',
  Closed: 'bg-slate-400',
  Reopened: 'bg-rose-500',
};

export const DashboardPage: React.FC = () => {
  const { profile, selectedInstitutionId, institutions, activeRole, roleMeta } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // Load dashboard tickets with role-based filtering
  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }

    const loadDashboardData = async () => {
      setLoading(true);

      let query = supabase
        .from('tickets')
        .select(`
          *,
          institution:institutions(id, code, name),
          department:departments(id, name, code),
          category:ticket_categories(id, name)
        `)
        .order('created_at', { ascending: false });

      if (roleMeta.scope === 'self') {
        query = query.eq('created_by', profile.id);
      } else if (roleMeta.scope === 'assigned') {
        query = query.eq('assigned_to', profile.id);
      } else if (roleMeta.scope === 'department' && profile.department_id) {
        query = query.eq('department_id', profile.department_id);
      } else if (selectedInstitutionId !== 'ALL') {
        query = query.eq('institution_id', selectedInstitutionId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading dashboard tickets:', error);
      } else if (data) {
        setTickets(data as Ticket[]);
      }

      setLoading(false);
    };

    loadDashboardData();
  }, [profile, selectedInstitutionId, activeRole, roleMeta]);

  // Core KPI Calculations
  const metrics = useMemo(() => {
    const total = tickets.length;

    const openActive = tickets.filter((t) =>
      ['Open', 'Assigned', 'In Progress', 'On Hold', 'Reopened'].includes(t.status)
    ).length;

    const overdue = tickets.filter(
      (t) =>
        t.resolution_due_at &&
        new Date(t.resolution_due_at).getTime() < Date.now() &&
        t.status !== 'Resolved' &&
        t.status !== 'Closed'
    ).length;

    const resolvedOrClosed = tickets.filter(
      (t) => t.status === 'Resolved' || t.status === 'Closed'
    ).length;

    const resolutionRate =
      total > 0 ? Math.round((resolvedOrClosed / total) * 100) : 100;

    const escalated = tickets.filter(
      (t) => t.is_escalated && t.status !== 'Closed'
    ).length;

    const statusCounts: Record<TicketStatus, number> = {
      Open: 0,
      Assigned: 0,
      'In Progress': 0,
      'On Hold': 0,
      Resolved: 0,
      Closed: 0,
      Reopened: 0,
    };

    tickets.forEach((t) => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    });

    return {
      total,
      openActive,
      overdue,
      resolutionRate,
      escalated,
      statusCounts,
    };
  }, [tickets]);

  // College-wise Comparison Matrix
  const collegeComparison = useMemo(() => {
    return institutions.map((inst) => {
      const instTickets = tickets.filter(
        (t) => t.institution_id === inst.id
      );

      const total = instTickets.length;

      const open = instTickets.filter((t) =>
        ['Open', 'Assigned', 'In Progress', 'On Hold', 'Reopened'].includes(t.status)
      ).length;

      const overdue = instTickets.filter(
        (t) =>
          t.resolution_due_at &&
          new Date(t.resolution_due_at).getTime() < Date.now() &&
          t.status !== 'Resolved' &&
          t.status !== 'Closed'
      ).length;

      const solved = instTickets.filter(
        (t) => t.status === 'Resolved' || t.status === 'Closed'
      ).length;

      const rate = total > 0 ? Math.round((solved / total) * 100) : 100;

      return { ...inst, total, open, overdue, rate };
    });
  }, [institutions, tickets]);

  // Department Breakdown
  const deptBreakdown = useMemo(() => {
    const map: Record<string, { name: string; total: number; open: number }> = {};

    tickets.forEach((t) => {
      const dName = t.department?.name || 'General';

      if (!map[dName]) {
        map[dName] = { name: dName, total: 0, open: 0 };
      }

      map[dName].total += 1;

      if (t.status !== 'Resolved' && t.status !== 'Closed') {
        map[dName].open += 1;
      }
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [tickets]);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Role Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {roleMeta.label} Dashboard
            </h1>
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${roleMeta.badgeColor}`}
            >
              {selectedInstitutionId === 'ALL' ? 'Group-Wide View' : 'College Scope'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {roleMeta.description}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {roleMeta.canViewReports && (
            <button
              onClick={() => navigate('/reports')}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Export Reports
            </button>
          )}

          <button
            onClick={() => navigate('/tickets/new')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Raise Ticket</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/tickets')}
          className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-apple-sm hover:shadow-apple-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Tickets</span>
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-fluent-blue flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold tracking-tight text-slate-900 mt-3">
            {loading ? '—' : metrics.total.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1">Across selected campus scope</div>
        </div>

        <div
          onClick={() => navigate('/tickets')}
          className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-apple-sm hover:shadow-apple-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active / Open Queue</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold tracking-tight text-slate-900 mt-3">
            {loading ? '—' : metrics.openActive}
          </div>
          <div className="text-xs text-amber-600 font-medium mt-1">
            {metrics.escalated} escalated to higher tier
          </div>
        </div>

        <div
          onClick={() => navigate('/tickets')}
          className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-apple-sm hover:shadow-apple-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">SLA Overdue</span>
            <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold tracking-tight text-rose-600 mt-3">
            {loading ? '—' : metrics.overdue}
          </div>
          <div className="text-xs text-slate-400 mt-1">Requires immediate attention</div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-apple-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Resolution Rate</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold tracking-tight text-emerald-600 mt-3">
            {loading ? '—' : `${metrics.resolutionRate}%`}
          </div>
          <div className="text-xs text-slate-400 mt-1">Target benchmark: 90%+</div>
        </div>
      </div>

      {/* Status Overview + Department Load */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-apple-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Ticket Status Overview</h2>
              <p className="text-xs text-slate-500">
                Live distribution across all 7 workflow stages
              </p>
            </div>
            <Sparkles className="w-4 h-4 text-brand-600" />
          </div>

          <div className="space-y-3.5">
            {(Object.keys(metrics.statusCounts) as TicketStatus[]).map((st) => {
              const count = metrics.statusCounts[st];
              const pct = metrics.total > 0
                ? Math.round((count / metrics.total) * 100)
                : 0;

              return (
                <div key={st} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{st}</span>
                    <span className="font-mono text-slate-500">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${STATUS_BAR_COLORS[st]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-apple-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">Department Workload</h2>
          <p className="text-xs text-slate-500">Active vs. total requests by unit</p>

          {deptBreakdown.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              Raise your first ticket to populate live department metrics.
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {deptBreakdown.map((d) => (
                <div
                  key={d.name}
                  className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/60 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-800">{d.name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {d.open} open · {d.total} total
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700">
                    {d.total}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* College-Wise Performance Comparison */}
      {roleMeta.scope === 'all' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-apple-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brand-600" />
                College-Wise Performance Comparison
              </h2>
              <p className="text-xs text-slate-500">
                Cross-institution SLA resolution rate & active backlog across D. Y. Patil Group
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Institution</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Open Queue</th>
                  <th className="py-3 px-4">SLA Overdue</th>
                  <th className="py-3 px-4">Resolution Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {collegeComparison.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      <div className="text-xs text-slate-400">{c.code}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold">{c.total}</td>
                    <td className="py-3.5 px-4 text-amber-700 font-semibold">{c.open}</td>
                    <td className="py-3.5 px-4">
                      {c.overdue > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs font-bold">
                          <AlertTriangle className="w-3 h-3" /> {c.overdue}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 0
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${c.rate}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700">{c.rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Tickets */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-apple-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Recent Tickets</h2>
          <button
            onClick={() => navigate('/tickets')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline cursor-pointer"
          >
            View All <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {tickets.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No tickets logged yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {tickets.slice(0, 5).map((t) => (
              <div
                key={t.id}
                onClick={() => navigate(`/tickets/${t.id}`)}
                className="py-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl cursor-pointer transition"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand-600">
                      {t.ticket_number}
                    </span>
                    <span className="text-sm font-semibold text-slate-900 truncate">
                      {t.subject}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {t.institution?.code} · {t.department?.name} · {t.category?.name}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <PriorityBadge priority={t.priority} />
                  <StatusPill status={t.status} />
                  <SlaTimerBadge
                    resolutionDueAt={t.resolution_due_at}
                    status={t.status}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
