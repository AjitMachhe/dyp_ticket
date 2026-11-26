import React from 'react';
import { Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { TicketPriority, TicketStatus } from '../../types/database';

export const StatusPill: React.FC<{ status: TicketStatus }> = ({ status }) => {
  const styles: Record<TicketStatus, string> = {
    Open: 'bg-sky-50 text-sky-700 border-sky-200',
    Assigned: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'In Progress': 'bg-amber-50 text-amber-700 border-amber-200',
    'On Hold': 'bg-purple-50 text-purple-700 border-purple-200',
    Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Closed: 'bg-slate-100 text-slate-600 border-slate-200',
    Reopened: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status]}`}
    >
      {status}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: TicketPriority }> = ({ priority }) => {
  const styles: Record<TicketPriority, string> = {
    Low: 'bg-slate-100 text-slate-700',
    Medium: 'bg-blue-50 text-blue-700',
    High: 'bg-amber-100/80 text-amber-800',
    Critical: 'bg-rose-100 text-rose-700',
  };

  const dots: Record<TicketPriority, string> = {
    Low: 'bg-slate-400',
    Medium: 'bg-blue-500',
    High: 'bg-amber-500',
    Critical: 'bg-rose-600',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[priority]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dots[priority]}`} />
      {priority}
    </span>
  );
};

export const SlaTimerBadge: React.FC<{
  resolutionDueAt?: string | null;
  status: TicketStatus;
}> = ({ resolutionDueAt, status }) => {
  if (!resolutionDueAt) return null;

  if (status === 'Resolved' || status === 'Closed') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
        <CheckCircle2 className="w-3.5 h-3.5" /> SLA Met
      </span>
    );
  }

  const now = Date.now();
  const due = new Date(resolutionDueAt).getTime();
  const diffMins = Math.round((due - now) / 60000);

  if (diffMins < 0) {
    const overdueHrs = Math.abs(Math.round(diffMins / 60));
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold">
        <AlertCircle className="w-3 h-3" />
        Overdue {overdueHrs > 0 ? `${overdueHrs}h` : `${Math.abs(diffMins)}m`}
      </span>
    );
  }

  const hrs = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  const label = hrs >= 24 ? `${Math.floor(hrs / 24)}d ${hrs % 24}h left` : `${hrs}h ${mins}m left`;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
        hrs < 2
          ? 'bg-amber-50 text-amber-700 border border-amber-200'
          : 'bg-slate-100 text-slate-600'
      }`}
    >
      <Clock className="w-3 h-3" />
      {label}
    </span>
  );
};