import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  Filter,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { exportSummaryToPdf, exportTicketsToExcel } from '../../lib/exportUtils';
import type { Ticket } from '../../types/database';

type ReportTab = 'college' | 'department' | 'category' | 'staff';

export const ReportsPage: React.FC = () => {
  const { selectedInstitutionId, institutions } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTab, setActiveTab] = useState<ReportTab>('college');
  const [monthFilter, setMonthFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      let query = supabase
        .from('tickets')
        .select(
          `
          *,
          institution:institutions(id, code, name),
          department:departments(id, name, code),
          category:ticket_categories(id, name),
          assignee:profiles!tickets_assigned_to_fkey(id, full_name)
        `
        )
        .order('created_at', { ascending: false });

      if (selectedInstitutionId !== 'ALL') {
        query = query.eq('institution_id', selectedInstitutionId);
      }

      const { data } = await query;
      if (data) setTickets(data as Ticket[]);
      setLoading(false);
    };
    loadReports();
  }, [selectedInstitutionId]);

  const filteredTickets = useMemo(() => {
    if (monthFilter === 'ALL') return tickets;
    return tickets.filter((t) => t.created_at.startsWith(monthFilter));
  }, [tickets, monthFilter]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((t) => set.add(t.created_at.slice(0, 7))); // YYYY-MM
    return Array.from(set).sort().reverse();
  }, [tickets]);

  // Compute aggregated rows for the active report tab
  const reportRows = useMemo(() => {
    const computeMetrics = (subset: Ticket[]) => {
      const total = subset.length;
      const open = subset.filter((t) =>
        ['Open', 'Assigned', 'In Progress', 'On Hold', 'Reopened'].includes(t.status)
      ).length;
      const resolved = subset.filter(
        (t) => t.status === 'Resolved' || t.status === 'Closed'
      ).length;
      const overdue = subset.filter(
        (t) =>
          t.resolution_due_at &&
          new Date(t.resolution_due_at).getTime() < Date.now() &&
          t.status !== 'Resolved' &&
          t.status !== 'Closed'
      ).length;

      // Average resolution hours
      const resolvedWithTime = subset.filter((t) => t.resolved_at);
      const avgHrs =
        resolvedWithTime.length > 0
          ? (
              resolvedWithTime.reduce((acc, t) => {
                const diff =
                  new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime();
                return acc + diff / 3600000;
              }, 0) / resolvedWithTime.length
            ).toFixed(1) + ' hrs'
          : '—';

      const rated = subset.filter((t) => t.rating);
      const avgRating =
        rated.length > 0
          ? (rated.reduce((acc, t) => acc + (t.rating || 0), 0) / rated.length).toFixed(1) + ' ★'
          : '—';

      return { total, open, resolved, overdue, avgHrs, avgRating };
    };

    if (activeTab === 'college') {
      return institutions.map((inst) => ({
        label: `${inst.code} — ${inst.name}`,
        ...computeMetrics(filteredTickets.filter((t) => t.institution_id === inst.id)),
      }));
    }

    const groupMap: Record<string, Ticket[]> = {};
    filteredTickets.forEach((t) => {
      const key =
        activeTab === 'department'
          ? t.department?.name || 'General'
          : activeTab === 'category'
          ? t.category?.name || 'Uncategorized'
          : t.assignee?.full_name || 'Unassigned Queue';

      if (!groupMap[key]) groupMap[key] = [];
      groupMap[key].push(t);
    });

    return Object.entries(groupMap).map(([label, list]) => ({
      label,
      ...computeMetrics(list),
    }));
  }, [activeTab, filteredTickets, institutions]);

  const handleExportPdf = () => {
    const titleMap: Record<ReportTab, string> = {
      college: 'College-Wise Ticket Performance Report',
      department: 'Department-Wise Ticket Report',
      category: 'Category-Wise Complaint Analysis',
      staff: 'Employee-Wise Resolution Performance',
    };

    exportSummaryToPdf(
      titleMap[activeTab],
      `Period: ${monthFilter === 'ALL' ? 'All Time' : monthFilter}`,
      ['Entity / Group', 'Total', 'Open', 'Resolved', 'Overdue', 'Avg Resolution', 'Rating'],
      reportRows.map((r) => [r.label, r.total, r.open, r.resolved, r.overdue, r.avgHrs, r.avgRating]),
      `DYP-${activeTab}-report.pdf`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-600" />
            <span>Analytics & SLA Reports</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Compare institution performance, SLA compliance, and export official audit sheets
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => exportTicketsToExcel(filteredTickets)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF Report</span>
          </button>
        </div>
      </div>

      {/* Report Dimension Tabs & Month Filter */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-apple-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'college', label: 'College-Wise' },
            { id: 'department', label: 'Department-Wise' },
            { id: 'category', label: 'Category-Wise' },
            { id: 'staff', label: 'Employee Performance' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ReportTab)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
          >
            <option value="ALL">All Months / Yearly</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-apple-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Compiling report data...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-6">
                    {activeTab === 'college'
                      ? 'Institution / College'
                      : activeTab === 'department'
                      ? 'Department'
                      : activeTab === 'category'
                      ? 'Complaint Category'
                      : 'Support Staff / Handler'}
                  </th>
                  <th className="py-3.5 px-4">Total Tickets</th>
                  <th className="py-3.5 px-4">Open / Pending</th>
                  <th className="py-3.5 px-4">Resolved</th>
                  <th className="py-3.5 px-4">Overdue</th>
                  <th className="py-3.5 px-4">Avg Resolution</th>
                  <th className="py-3.5 px-6 text-right">Satisfaction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {reportRows.map((row) => (
                  <tr key={row.label} className="hover:bg-slate-50/80">
                    <td className="py-4 px-6 font-semibold text-slate-900">{row.label}</td>
                    <td className="py-4 px-4 font-bold">{row.total}</td>
                    <td className="py-4 px-4 text-amber-700 font-semibold">{row.open}</td>
                    <td className="py-4 px-4 text-emerald-700 font-semibold">{row.resolved}</td>
                    <td className="py-4 px-4 text-rose-600 font-semibold">{row.overdue}</td>
                    <td className="py-4 px-4 text-slate-600">{row.avgHrs}</td>
                    <td className="py-4 px-6 text-right font-semibold text-amber-600">
                      {row.avgRating}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};