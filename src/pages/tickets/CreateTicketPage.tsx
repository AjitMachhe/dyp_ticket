import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  MapPin,
  Paperclip,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  UploadCloud,
  Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { TICKET_TEMPLATES } from '../../lib/ticketTemplates';
import type {
  AttachmentItem,
  TicketCategory,
  TicketPriority,
} from '../../types/database';

const PRIORITIES: {
  value: TicketPriority;
  label: string;
  slaHint: string;
  activeClass: string;
}[] = [
  {
    value: 'Low',
    label: 'Low',
    slaHint: 'Resp: 1d · Res: 7d',
    activeClass: 'bg-slate-900 text-white border-slate-900',
  },
  {
    value: 'Medium',
    label: 'Medium',
    slaHint: 'Resp: 4h · Res: 3d',
    activeClass: 'bg-fluent-blue text-white border-fluent-blue',
  },
  {
    value: 'High',
    label: 'High',
    slaHint: 'Resp: 1h · Res: 1d',
    activeClass: 'bg-amber-500 text-white border-amber-500',
  },
  {
    value: 'Critical',
    label: 'Critical',
    slaHint: 'Resp: 15m · Res: 4h',
    activeClass: 'bg-rose-600 text-white border-rose-600',
  },
];

export const CreateTicketPage: React.FC = () => {
  const { profile, institutions, departments, selectedInstitutionId } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Form State
  const [institutionId, setInstitutionId] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<TicketCategory[]>([]);

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('Medium');
  const [visibility, setVisibility] = useState<'private' | 'department'>('private');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [locationTag, setLocationTag] = useState('');
  const [customData, setCustomData] = useState<Record<string, string>>({});

  // Files & Submission State
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTicketNumber, setCreatedTicketNumber] = useState<string | null>(null);

  // Duplicate Detection State
  const [duplicates, setDuplicates] = useState<
    { id: string; ticket_number: string; subject: string; status: string }[]
  >([]);

  // Initialize Institution from QR param, user profile, or top selector
  useEffect(() => {
    const qrInst = searchParams.get('inst');
    const qrLoc = searchParams.get('loc');
    if (qrLoc) setLocationTag(qrLoc);

    if (qrInst && institutions.some((i) => i.id === qrInst)) {
      setInstitutionId(qrInst);
    } else if (profile?.institution_id) {
      setInstitutionId(profile.institution_id);
    } else if (selectedInstitutionId !== 'ALL') {
      setInstitutionId(selectedInstitutionId);
    } else if (institutions.length > 0 && !institutionId) {
      setInstitutionId(institutions[0].id);
    }
  }, [institutions, profile, selectedInstitutionId, searchParams]);

  // Filter departments belonging to chosen institution
  const filteredDepartments = useMemo(
    () => departments.filter((d) => d.institution_id === institutionId),
    [departments, institutionId]
  );

  // Auto-select department from QR param or first available
  useEffect(() => {
    if (filteredDepartments.length === 0) {
      setDepartmentId('');
      return;
    }
    const qrDept = searchParams.get('dept');
    if (qrDept && filteredDepartments.some((d) => d.id === qrDept)) {
      setDepartmentId(qrDept);
    } else if (!filteredDepartments.some((d) => d.id === departmentId)) {
      setDepartmentId(filteredDepartments[0].id);
    }
  }, [filteredDepartments, searchParams]);

  // Fetch categories for selected department
  useEffect(() => {
    if (!departmentId) {
      setCategories([]);
      setCategoryId('');
      return;
    }
    const loadCategories = async () => {
      const { data } = await supabase
        .from('ticket_categories')
        .select('*')
        .eq('department_id', departmentId)
        .order('name');
      if (data) {
        setCategories(data as TicketCategory[]);
        const qrCat = searchParams.get('cat');
        if (qrCat && data.some((c) => c.id === qrCat)) {
          setCategoryId(qrCat);
        } else if (data.length > 0) {
          setCategoryId(data[0].id);
        }
      }
    };
    loadCategories();
  }, [departmentId, searchParams]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) || null,
    [categories, categoryId]
  );

  // Apply category defaults (Priority & Visibility) when category changes
  useEffect(() => {
    if (!selectedCategory) return;
    setPriority(selectedCategory.default_priority || 'Medium');
    setVisibility(selectedCategory.default_visibility || 'private');
    setCustomData({});
  }, [selectedCategory?.id]);

  // Live Duplicate Detection
  useEffect(() => {
    const trimmed = subject.trim();
    if (trimmed.length < 5 || !departmentId) {
      setDuplicates([]);
      return;
    }
    const timer = setTimeout(async () => {
      const keyword = trimmed.split(' ').slice(0, 3).join(' ');
      const { data } = await supabase
        .from('tickets')
        .select('id, ticket_number, subject, status')
        .eq('department_id', departmentId)
        .in('status', ['Open', 'Assigned', 'In Progress', 'On Hold'])
        .ilike('subject', `%${keyword}%`)
        .limit(3);
      setDuplicates(data || []);
    }, 450);
    return () => clearTimeout(timer);
  }, [subject, departmentId]);

  const applyTemplate = (tplId: string) => {
    const tpl = TICKET_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;

    const targetDept = filteredDepartments.find((d) =>
      d.name.toLowerCase().includes(tpl.departmentMatch.toLowerCase())
    );
    if (targetDept) {
      setDepartmentId(targetDept.id);
    }
    setSubject(tpl.subject);
    setDescription(tpl.description);
    setPriority(tpl.priority);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const incoming = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...incoming].slice(0, 5));
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionId || !departmentId || !categoryId) {
      setError('Please select Institution, Department, and Category.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      // 1. Upload multiple attachments to Supabase Storage
      const uploadedAttachments: AttachmentItem[] = [];
      for (const file of files) {
        const cleanName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const filePath = `${institutionId}/${cleanName}`;
        const { error: uploadErr } = await supabase.storage
          .from('ticket-attachments')
          .upload(filePath, file);

        if (!uploadErr) {
          const { data: pubUrl } = supabase.storage
            .from('ticket-attachments')
            .getPublicUrl(filePath);
          uploadedAttachments.push({
            name: file.name,
            url: pubUrl.publicUrl,
            type: file.type,
            size: file.size,
          });
        }
      }

      // 2. Determine auto-assignment & approval status
      const autoAssignee = selectedCategory?.auto_assign_user_id || null;
      const initialStatus = autoAssignee ? 'Assigned' : 'Open';
      const approvalStatus = selectedCategory?.requires_approval ? 'pending' : 'not_required';

      // 3. Insert Ticket (DB Trigger generates UNI-2026-00001 & SLA deadlines)
      const { data: newTicket, error: insertErr } = await supabase
        .from('tickets')
        .insert({
          institution_id: institutionId,
          department_id: departmentId,
          category_id: categoryId,
          created_by: profile?.id || null,
          assigned_to: autoAssignee,
          subject: subject.trim(),
          description: description.trim(),
          priority,
          status: initialStatus,
          visibility,
          is_anonymous: isAnonymous,
          approval_status: approvalStatus,
          custom_data: customData,
          attachments: uploadedAttachments,
          location_tag: locationTag.trim() || null,
        })
        .select('id, ticket_number')
        .single();

      if (insertErr) throw insertErr;

      // 4. Write initial Audit Log entry
      await supabase.from('ticket_audit_logs').insert({
        ticket_id: newTicket.id,
        actor_id: profile?.id || null,
        action: 'CREATED',
        new_value: initialStatus,
        notes: isAnonymous
          ? 'Ticket submitted anonymously'
          : `Submitted by ${profile?.full_name || 'Campus User'}`,
      });

      setCreatedTicketNumber(newTicket.ticket_number);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit ticket. Please verify Supabase connection.');
    } finally {
      setSubmitting(false);
    }
  };

  // Success Confirmation Screen
  if (createdTicketNumber) {
    return (
      <div className="max-w-xl mx-auto py-8">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-apple-md p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <span className="inline-block px-3 py-1 rounded-full bg-brand-50 text-brand-600 font-mono text-xs font-bold mb-2">
            {createdTicketNumber}
          </span>
          <h2 className="text-2xl font-bold text-slate-900">Ticket Registered Successfully</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Your request has been routed to{' '}
            <strong className="text-slate-700">
              {filteredDepartments.find((d) => d.id === departmentId)?.name}
            </strong>{' '}
            with <strong className="text-slate-700">{priority}</strong> SLA priority.
          </p>

          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/tickets')}
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition cursor-pointer"
            >
              View in Service Queue
            </button>
            <button
              onClick={() => {
                setCreatedTicketNumber(null);
                setSubject('');
                setDescription('');
                setFiles([]);
                setCustomData({});
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition cursor-pointer"
            >
              Raise Another Ticket
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/tickets')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Queue
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create New Ticket</h1>
          <p className="text-sm text-slate-500">
            Submit an issue or service request across D. Y. Patil Group institutions
          </p>
        </div>

        {/* Quick Templates Dropdown */}
        <div className="flex items-center gap-2 bg-white border border-slate-200/80 rounded-2xl px-3.5 py-2 shadow-apple-sm">
          <Sparkles className="w-4 h-4 text-brand-600 shrink-0" />
          <select
            defaultValue=""
            onChange={(e) => applyTemplate(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="" disabled>
              Quick-Fill Template...
            </option>
            {TICKET_TEMPLATES.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Automatic Requester Info Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-apple-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm flex items-center justify-center">
            {(profile?.full_name || 'DU').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">
                {isAnonymous ? 'Anonymous Complainant' : profile?.full_name || 'DYP Campus User'}
              </span>
              {profile?.employee_or_prn_id && !isAnonymous && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  {profile.employee_or_prn_id}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {isAnonymous
                ? 'Identity hidden from department handlers'
                : profile?.email || 'Auto-captured institutional identity & timestamp'}
            </p>
          </div>
        </div>

        {/* Anonymous Grievance Toggle */}
        <button
          type="button"
          onClick={() => setIsAnonymous(!isAnonymous)}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
            isAnonymous
              ? 'bg-amber-50 border-amber-300 text-amber-800'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          {isAnonymous ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {isAnonymous ? 'Anonymous Grievance ON' : 'Submit Anonymously'}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl border border-slate-200/80 shadow-apple-sm p-6 sm:p-8 space-y-6"
      >
        {/* Step 1: Institution, Department & Category */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Institution / College *
            </label>
            <select
              required
              value={institutionId}
              onChange={(e) => setInstitutionId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
            >
              <option value="">Select University / College</option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.code} — {inst.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Department *
            </label>
            <select
              required
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
            >
              <option value="">Select Department</option>
              {filteredDepartments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Category *
            </label>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Approval Notice if Category Requires Authorization */}
        {selectedCategory?.requires_approval && (
          <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 flex items-center gap-3 text-xs text-indigo-800">
            <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Approval Workflow Active:</strong> Requests under{' '}
              <strong>{selectedCategory.name}</strong> require Department HOD / Admin authorization
              before issuance.
            </span>
          </div>
        )}

        {/* Configurable Category-Specific Fields */}
        {selectedCategory?.custom_fields && selectedCategory.custom_fields.length > 0 && (
          <div className="p-5 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {selectedCategory.name} Details
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {selectedCategory.custom_fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {field.label} {field.required && '*'}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      required={field.required}
                      value={customData[field.key] || ''}
                      onChange={(e) =>
                        setCustomData((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                    >
                      <option value="">Select {field.label}</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      required={field.required}
                      placeholder={field.placeholder || ''}
                      value={customData[field.key] || ''}
                      onChange={(e) =>
                        setCustomData((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subject & Room/Location Tag */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Subject *</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of the issue or request"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Room / Lab / Block (Optional)
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={locationTag}
                onChange={(e) => setLocationTag(e.target.value)}
                placeholder="e.g. Engg Block-A, Lab 204"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
              />
            </div>
          </div>
        </div>

        {/* Live Duplicate Detection Alert */}
        {duplicates.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Similar Active Tickets Found in This Department</span>
            </div>
            <ul className="space-y-1 text-xs text-amber-900">
              {duplicates.map((dup) => (
                <li key={dup.id} className="flex items-center justify-between">
                  <span>
                    <strong className="font-mono">{dup.ticket_number}</strong>: {dup.subject}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-200/70 text-[10px] font-semibold">
                    {dup.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Description *
          </label>
          <textarea
            rows={4}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your issue in detail, including any error messages or timelines..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
          />
        </div>

        {/* Priority & Visibility Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Priority & SLA Target
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PRIORITIES.map((p) => {
                const isSelected = priority === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      isSelected
                        ? p.activeClass
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">{p.label}</div>
                    <div
                      className={`text-[10px] mt-0.5 ${
                        isSelected ? 'text-white/85' : 'text-slate-400'
                      }`}
                    >
                      {p.slaHint}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Ticket Visibility
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                  visibility === 'private'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <Lock className="w-3.5 h-3.5" /> Private
                </div>
                <div
                  className={`text-[10px] mt-0.5 ${
                    visibility === 'private' ? 'text-white/80' : 'text-slate-400'
                  }`}
                >
                  You & Handlers
                </div>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('department')}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                  visibility === 'department'
                    ? 'bg-fluent-blue text-white border-fluent-blue'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <Users className="w-3.5 h-3.5" /> Dept-Wide
                </div>
                <div
                  className={`text-[10px] mt-0.5 ${
                    visibility === 'department' ? 'text-white/80' : 'text-slate-400'
                  }`}
                >
                  Shared Issue
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Multiple File Attachments */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Attachments (Screenshots, PDFs, Documents — Max 5 files)
          </label>
          <label className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-200 hover:border-brand-500/60 bg-slate-50/60 hover:bg-brand-50/20 transition cursor-pointer">
            <UploadCloud className="w-7 h-7 text-slate-400 mb-1.5" />
            <span className="text-xs font-semibold text-slate-700">
              Click to attach files or drop here
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              PNG, JPG, PDF, DOCX up to 10MB each
            </span>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              accept=".png,.jpg,.jpeg,.pdf,.doc,.docx,.xlsx"
            />
          </label>

          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((f, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Paperclip className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                    <span className="font-medium text-slate-800 truncate">{f.name}</span>
                    <span className="text-slate-400">({Math.round(f.size / 1024)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/tickets')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold shadow-xs transition cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Submitting Ticket...' : 'Submit Ticket'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};