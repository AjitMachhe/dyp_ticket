import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  AlertTriangle,
  ArrowUpRight,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { StatusPill, PriorityBadge, SlaTimerBadge } from '../../components/common/TicketBadges';
import type { Ticket, TicketPriority, TicketStatus } from '../../types/database';

const ALL_STATUSES: TicketStatus[] = [
  'Open',
  'Assigned',
  'In Progress',
  'On Hold',
  'Resolved',
  'Closed',
  'Reopened',
];

export const TicketsListPage: React.FC = () => {
  const { selectedInstitutionId, departments, roleMeta, activeRole } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');

  const fetchTickets = async () => {
    setLoading(true);
    let query = supabase
      .from('tickets')
      .select(
        `
        *,
        institution:institutions(id, code, name),
        department:departments(id, name, code),
        category:ticket_categories(id, name),
        creator:profiles!tickets_created_by_fkey(id, full_name, role),
        assignee:profiles!tickets_assigned_to_fkey(id, full_name)
      `
      )
      .order('created_at', { ascending: false });

    if (selectedInstitutionId !== 'ALL') {
      query = query.eq('institution_id', selectedInstitutionId);
    }

    const { data, error } = await query;
    if (!error && data) {
      setTickets(data as Ticket[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [selectedInstitutionId, activeRole]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter === 'ACTIVE' && (t.status === 'Closed' || t.status === 'Resolved')) {
        return false;
      }
      if (statusFilter === 'OVERDUE') {
        const isOverdue =
          t.resolution_due_at &&
          new Date(t.resolution_due_at).getTime() < Date.now() &&
          t.status !== 'Resolved' &&
          t.status !== 'Closed';
        if (!isOverdue) return false;
      }
      if (statusFilter === 'ESCALATED' && !t.is_escalated) return false;
      if (
        statusFilter !== 'ALL' &&
        statusFilter !== 'ACTIVE' &&
        statusFilter !== 'OVERDUE' &&
        statusFilter !== 'ESCALATED' &&
        t.status !== statusFilter
      ) {
        return false;
      }

      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
      if (deptFilter !== 'ALL' && t.department?.name !== deptFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchNum = t.ticket_number?.toLowerCase().includes(q);
        const matchSub = t.subject?.toLowerCase().includes(q);
        const matchCat = t.category?.name?.toLowerCase().includes(q);
        const matchLoc = t.location_tag?.toLowerCase().includes(q);
        if (!matchNum && !matchSub && !matchCat && !matchLoc) return false;
      }

      return true;
    });
  }, [tickets, statusFilter, priorityFilter, deptFilter, search]);

  const uniqueDeptNames = useMemo(() => {
    const names = new Set(departments.map((d) => d.name));
    return Array.from(names);
  }, [departments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Service Tickets</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700 text-xs font-bold">
              {filteredTickets.length}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Viewing as <strong className="text-slate-700">{roleMeta.label}</strong> ·{' '}
            {roleMeta.description}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchTickets}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/tickets/new')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Raise Ticket</span>
          </button>
        </div>
      </div>

      {/* Quick Filter Pills + Search */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-apple-sm space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ACTIVE', label: 'Active Queue' },
            { id: 'ALL', label: 'All Tickets' },
            { id: 'OVERDUE', label: 'SLA Overdue' },
            { id: 'ESCALATED', label: 'Escalated' },
            ...ALL_STATUSES.map((s) => ({ id: s, label: s })),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ticket ID (e.g. UNI-2026-00001), subject, or room..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
            />
          </div>

          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
            >
              <option value="ALL">All Departments</option>
              {uniqueDeptNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white"
            >
              <option value="ALL">All Priorities</option>
              {(['Critical', 'High', 'Medium', 'Low'] as TicketPriority[]).map((p) => (
                <option key={p} value={p}>
                  {p} Priority
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Table / Cards */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-apple-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Loading service queue...</div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-700">No tickets match these filters</p>
            <p className="text-xs text-slate-400">
              Adjust your filters or raise a new ticket to test the workflow.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-5">Ticket ID</th>
                  <th className="py-3.5 px-4">Subject & Category</th>
                  <th className="py-3.5 px-4">Institution / Dept</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">SLA Target</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredTickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/tickets/${t.id}`)}
                    className="hover:bg-slate-50/90 transition cursor-pointer group"
                  >
                    <td className="py-4 px-5 whitespace-nowrap">
                      <div className="font-mono text-xs font-bold text-brand-600">
                        {t.ticket_number}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(t.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </div>
                    </td>

                    <td className="py-4 px-4 max-w-md">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 group-hover:text-brand-600 transition line-clamp-1">
                          {t.subject}
                        </span>
                        {t.is_escalated && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-bold shrink-0">
                            <AlertTriangle className="w-3 h-3" /> L{t.escalation_level}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span>{t.category?.name}</span>
                        {t.location_tag && (
                          <span className="inline-flex items-center gap-0.5 text-slate-400">
                            · <MapPin className="w-3 h-3" /> {t.location_tag}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="text-xs font-semibold text-slate-800">
                        {t.institution?.code}
                      </div>
                      <div className="text-xs text-slate-500">{t.department?.name}</div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <PriorityBadge priority={t.priority} />
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <StatusPill status={t.status} />
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <SlaTimerBadge resolutionDueAt={t.resolution_due_at} status={t.status} />
                    </td>

                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 group-hover:text-brand-600">
                        Open <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
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