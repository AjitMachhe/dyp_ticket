import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRightLeft,
  ArrowUpCircle,
  CheckCircle2,
  History,
  Lock,
  MapPin,
  MessageSquare,
  Paperclip,
  RotateCcw,
  Send,
  ShieldCheck,
  Star,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { StatusPill, PriorityBadge, SlaTimerBadge } from '../../components/common/TicketBadges';
import type {
  Ticket,
  TicketAuditLog,
  TicketComment,
  TicketStatus,
  UserProfile,
} from '../../types/database';

const WORKFLOW_STATUSES: TicketStatus[] = [
  'Open',
  'Assigned',
  'In Progress',
  'On Hold',
  'Resolved',
  'Closed',
  'Reopened',
];

const ESCALATION_LABELS = [
  'Normal Queue',
  'Level 1 — Department HOD',
  'Level 2 — College Admin',
  'Level 3 — University Admin / Registrar',
];

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, roleMeta, institutions, departments } = useAuth();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [auditLogs, setAuditLogs] = useState<TicketAuditLog[]>([]);
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Comment Composer
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  // Transfer Modal State
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferInstId, setTransferInstId] = useState('');
  const [transferDeptId, setTransferDeptId] = useState('');

  // Rating State
  const [ratingValue, setRatingValue] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');

  const isHandler =
    roleMeta.canAddInternalNotes ||
    roleMeta.canAssignTickets ||
    roleMeta.scope !== 'self';

  const loadAll = async () => {
    if (!id) return;
    setLoading(true);

    const [{ data: tData }, { data: cData }, { data: aData }, { data: sData }] = await Promise.all([
      supabase
        .from('tickets')
        .select(
          `
          *,
          institution:institutions(*),
          department:departments(*),
          category:ticket_categories(*),
          creator:profiles!tickets_created_by_fkey(*),
          assignee:profiles!tickets_assigned_to_fkey(*)
        `
        )
        .eq('id', id)
        .single(),
      supabase
        .from('ticket_comments')
        .select('*, author:profiles(*)')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true }),
      supabase
        .from('ticket_audit_logs')
        .select('*, actor:profiles(*)')
        .eq('ticket_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('*')
        .in('role', ['support_staff', 'department_hod', 'college_admin', 'university_admin']),
    ]);

    if (tData) {
      setTicket(tData as Ticket);
      setTransferInstId(tData.institution_id);
      setTransferDeptId(tData.department_id);
    }
    if (cData) setComments(cData as TicketComment[]);
    if (aData) setAuditLogs(aData as TicketAuditLog[]);
    if (sData) setStaffList(sData as UserProfile[]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [id]);

  const recordAudit = async (action: string, oldVal: string, newVal: string, notes?: string) => {
    if (!ticket) return;
    await supabase.from('ticket_audit_logs').insert({
      ticket_id: ticket.id,
      actor_id: profile?.id || null,
      action,
      old_value: oldVal,
      new_value: newVal,
      notes,
    });
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!ticket || newStatus === ticket.status) return;
    const oldStatus = ticket.status;
    const updates: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (newStatus === 'Resolved') updates.resolved_at = new Date().toISOString();
    if (newStatus === 'Closed') updates.closed_at = new Date().toISOString();

    await supabase.from('tickets').update(updates).eq('id', ticket.id);
    await recordAudit('STATUS_CHANGED', oldStatus, newStatus);
    loadAll();
  };

  const handleAssignStaff = async (staffId: string) => {
    if (!ticket) return;
    const chosen = staffList.find((s) => s.id === staffId);
    const nextStatus: TicketStatus = ticket.status === 'Open' ? 'Assigned' : ticket.status;
    await supabase
      .from('tickets')
      .update({
        assigned_to: staffId || null,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticket.id);

    await recordAudit(
      'ASSIGNED',
      ticket.assignee?.full_name || 'Unassigned',
      chosen?.full_name || 'Unassigned'
    );
    loadAll();
  };

  const handleEscalate = async () => {
    if (!ticket || ticket.escalation_level >= 3) return;
    const nextLevel = ticket.escalation_level + 1;
    await supabase
      .from('tickets')
      .update({
        escalation_level: nextLevel,
        is_escalated: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticket.id);

    await recordAudit(
      'ESCALATED',
      ESCALATION_LABELS[ticket.escalation_level],
      ESCALATION_LABELS[nextLevel],
      'Manual escalation triggered due to SLA / priority'
    );
    loadAll();
  };

  const handleTransferTicket = async () => {
    if (!ticket || !transferInstId || !transferDeptId) return;
    // Find matching category in target department
    const { data: targetCats } = await supabase
      .from('ticket_categories')
      .select('id')
      .eq('department_id', transferDeptId)
      .limit(1);

    const newCatId = targetCats?.[0]?.id || ticket.category_id;
    const targetInst = institutions.find((i) => i.id === transferInstId);
    const targetDept = departments.find((d) => d.id === transferDeptId);

    await supabase
      .from('tickets')
      .update({
        institution_id: transferInstId,
        department_id: transferDeptId,
        category_id: newCatId,
        assigned_to: null,
        status: 'Open',
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticket.id);

    await recordAudit(
      'TRANSFERRED',
      `${ticket.institution?.code} / ${ticket.department?.name}`,
      `${targetInst?.code} / ${targetDept?.name}`,
      'Inter-college / department ticket transfer'
    );
    setShowTransfer(false);
    loadAll();
  };

  const handleApproval = async (decision: 'approved' | 'rejected') => {
    if (!ticket) return;
    await supabase
      .from('tickets')
      .update({
        approval_status: decision,
        status: decision === 'approved' ? 'In Progress' : 'Closed',
      })
      .eq('id', ticket.id);
    await recordAudit('APPROVAL', 'pending', decision.toUpperCase());
    loadAll();
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !replyText.trim()) return;
    setSendingReply(true);

    await supabase.from('ticket_comments').insert({
      ticket_id: ticket.id,
      author_id: profile?.id || null,
      message: replyText.trim(),
      is_internal: isHandler ? isInternalNote : false,
    });

    if (!ticket.first_responded_at && isHandler && !isInternalNote) {
      await supabase
        .from('tickets')
        .update({ first_responded_at: new Date().toISOString() })
        .eq('id', ticket.id);
    }

    setReplyText('');
    setSendingReply(false);
    loadAll();
  };

  const handleSubmitRating = async () => {
    if (!ticket) return;
    await supabase
      .from('tickets')
      .update({
        rating: ratingValue,
        feedback_comment: feedbackComment.trim() || null,
        status: 'Closed',
        closed_at: new Date().toISOString(),
      })
      .eq('id', ticket.id);
    await recordAudit('RATED_AND_CLOSED', ticket.status, `Closed (${ratingValue}/5 ★)`);
    loadAll();
  };

  if (loading || !ticket) {
    return (
      <div className="p-12 text-center text-sm text-slate-500">Loading ticket workspace...</div>
    );
  }

  const visibleComments = comments.filter((c) => (isHandler ? true : !c.is_internal));
  const transferDepartments = departments.filter((d) => d.institution_id === transferInstId);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => navigate('/tickets')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Service Queue
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {roleMeta.canTransferTickets && (
            <button
              onClick={() => setShowTransfer(!showTransfer)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-fluent-blue" />
              Transfer College / Dept
            </button>
          )}

          {isHandler && ticket.escalation_level < 3 && (
            <button
              onClick={handleEscalate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
              Escalate Ticket
            </button>
          )}

          {(ticket.status === 'Resolved' || ticket.status === 'Closed') && (
            <button
              onClick={() => handleStatusChange('Reopened')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800 hover:bg-amber-100 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reopen Issue
            </button>
          )}
        </div>
      </div>

      {/* Transfer Drawer */}
      {showTransfer && (
        <div className="bg-blue-50/70 border border-blue-200 rounded-3xl p-5 flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-blue-900 mb-1">
              Target College / Institution
            </label>
            <select
              value={transferInstId}
              onChange={(e) => {
                setTransferInstId(e.target.value);
                const firstDept = departments.find((d) => d.institution_id === e.target.value);
                if (firstDept) setTransferDeptId(firstDept.id);
              }}
              className="w-full px-3.5 py-2 rounded-xl border border-blue-200 bg-white text-sm"
            >
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.code} — {i.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-blue-900 mb-1">
              Target Department
            </label>
            <select
              value={transferDeptId}
              onChange={(e) => setTransferDeptId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-blue-200 bg-white text-sm"
            >
              {transferDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleTransferTicket}
            className="px-5 py-2 rounded-xl bg-fluent-blue text-white text-xs font-semibold hover:opacity-95 cursor-pointer"
          >
            Confirm Transfer
          </button>
        </div>
      )}

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Ticket Details + Thread */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Header Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-apple-sm space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-brand-50 text-brand-600 font-mono text-xs font-bold">
                {ticket.ticket_number}
              </span>
              <StatusPill status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <SlaTimerBadge resolutionDueAt={ticket.resolution_due_at} status={ticket.status} />
              {ticket.is_escalated && (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-bold">
                  {ESCALATION_LABELS[ticket.escalation_level]}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{ticket.subject}</h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pb-4 border-b border-slate-100">
              <span>
                Raised by:{' '}
                <strong className="text-slate-800">
                  {ticket.is_anonymous
                    ? 'Anonymous Complainant'
                    : ticket.creator?.full_name || 'DYP Campus User'}
                </strong>
              </span>
              <span>·</span>
              <span>{new Date(ticket.created_at).toLocaleString('en-IN')}</span>
              {ticket.location_tag && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-brand-600" /> {ticket.location_tag}
                  </span>
                </>
              )}
            </div>

            <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
              {ticket.description}
            </p>

            {/* Dynamic Category Custom Fields */}
            {ticket.custom_data && Object.keys(ticket.custom_data).length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(ticket.custom_data).map(([k, v]) => (
                  <div key={k}>
                    <div className="text-[11px] uppercase font-semibold text-slate-400">
                      {k.replace(/_/g, ' ')}
                    </div>
                    <div className="text-xs font-bold text-slate-800 mt-0.5">{v || '—'}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Attachments */}
            {ticket.attachments && ticket.attachments.length > 0 && (
              <div className="pt-2 space-y-2">
                <div className="text-xs font-semibold text-slate-500">Attachments</div>
                <div className="flex flex-wrap gap-2">
                  {ticket.attachments.map((att, i) => (
                    <a
                      key={i}
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-brand-600" />
                      <span>{att.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Approval Banner */}
            {ticket.approval_status === 'pending' && roleMeta.canApproveRequests && (
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-indigo-900">
                  <strong>Authorization Required:</strong> Approve or reject this institutional
                  request.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApproval('approved')}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => handleApproval('rejected')}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Post-Resolution Feedback Card */}
          {ticket.status === 'Resolved' && !ticket.rating && (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Issue Marked Resolved — Confirm & Rate Service Quality</span>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingValue(star)}
                    className={`p-2 rounded-xl border transition cursor-pointer ${
                      ratingValue >= star
                        ? 'bg-amber-400 border-amber-500 text-white'
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Optional feedback on resolution speed & support..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-emerald-200 bg-white text-sm"
                />
                <button
                  onClick={handleSubmitRating}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Confirm & Close Ticket
                </button>
              </div>
            </div>
          )}

          {/* Conversation & Internal Notes Thread */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-apple-sm space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-600" />
                Activity & Discussion ({visibleComments.length})
              </h2>
            </div>

            <div className="space-y-3">
              {visibleComments.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No updates posted yet. Add a public reply or internal note below.
                </p>
              ) : (
                visibleComments.map((c) => (
                  <div
                    key={c.id}
                    className={`p-4 rounded-2xl border ${
                      c.is_internal
                        ? 'bg-amber-50/80 border-amber-200/90'
                        : 'bg-slate-50/80 border-slate-200/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {c.author?.full_name || 'Support Desk'}
                        </span>
                        {c.is_internal && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 text-[10px] font-bold">
                            <Lock className="w-2.5 h-2.5" /> Internal Staff Note
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(c.created_at).toLocaleString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-line">{c.message}</p>
                  </div>
                ))
              )}
            </div>

            {/* Reply Composer */}
            <form onSubmit={handlePostComment} className="pt-3 border-t border-slate-100 space-y-3">
              {isHandler && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsInternalNote(false)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      !isInternalNote
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Public Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsInternalNote(true)}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      isInternalNote
                        ? 'bg-amber-500 text-white'
                        : 'bg-amber-50 text-amber-800'
                    }`}
                  >
                    <Lock className="w-3 h-3" /> Internal Note (Staff Only)
                  </button>
                </div>
              )}

              <textarea
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={
                  isInternalNote
                    ? 'Add a private technical note visible only to support staff & admins...'
                    : 'Write an update or reply to the requester...'
                }
                className={`w-full px-3.5 py-2.5 rounded-2xl border text-sm focus:outline-none ${
                  isInternalNote
                    ? 'bg-amber-50/40 border-amber-300 focus:border-amber-500'
                    : 'border-slate-200 focus:border-brand-600'
                }`}
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={sendingReply || !replyText.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isInternalNote ? 'Save Internal Note' : 'Post Reply'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Workflow Controls & Audit Log */}
        <div className="space-y-6">
          {/* Workflow & Assignment Panel */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-apple-sm space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Ticket Controls
            </h3>

            {/* Status Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Workflow Stage
              </label>
              <select
                value={ticket.status}
                disabled={!isHandler}
                onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white disabled:bg-slate-50"
              >
                {WORKFLOW_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Staff Assignment */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-brand-600" /> Assigned Handler
              </label>
              <select
                value={ticket.assigned_to || ''}
                disabled={!roleMeta.canAssignTickets}
                onChange={(e) => handleAssignStaff(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white disabled:bg-slate-50"
              >
                <option value="">Unassigned (Department Queue)</option>
                {staffList.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.full_name} ({st.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            {/* Routing Metadata */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Institution</span>
                <span className="font-semibold text-slate-800">{ticket.institution?.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Department</span>
                <span className="font-semibold text-slate-800">{ticket.department?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Category</span>
                <span className="font-semibold text-slate-800">{ticket.category?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Escalation</span>
                <span className="font-semibold text-slate-800">
                  {ESCALATION_LABELS[ticket.escalation_level]}
                </span>
              </div>
              {ticket.rating && (
                <div className="flex justify-between">
                  <span className="text-slate-400">User Rating</span>
                  <span className="font-bold text-amber-600">{ticket.rating} / 5 ★</span>
                </div>
              )}
            </div>
          </div>

          {/* Audit Log Timeline */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-apple-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Audit Trail
            </h3>
            <div className="space-y-3 border-l-2 border-slate-100 pl-3.5">
              {auditLogs.map((log) => (
                <div key={log.id} className="text-xs space-y-0.5">
                  <div className="font-bold text-slate-800">{log.action.replace('_', ' ')}</div>
                  {log.new_value && (
                    <div className="text-slate-600">
                      {log.old_value ? `${log.old_value} → ` : ''}
                      <strong>{log.new_value}</strong>
                    </div>
                  )}
                  <div className="text-[11px] text-slate-400">
                    {new Date(log.created_at).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};