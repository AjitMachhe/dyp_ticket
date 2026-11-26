import React, { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Layers,
  Plus,
  Settings2,
  Shield,
  Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ROLE_CONFIG } from '../../lib/rbac';
import type {
  TicketCategory,
  TicketPriority,
  UserProfile,
  UserRole,
} from '../../types/database';

type AdminTab = 'institutions' | 'categories' | 'users';

export const AdminConfigPage: React.FC = () => {
  const { institutions, departments, refreshMetadata, roleMeta } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('institutions');
  const [toast, setToast] = useState<string | null>(null);

  // Add Institution Form
  const [instName, setInstName] = useState('');
  const [instCode, setInstCode] = useState('');
  const [instLocation, setInstLocation] = useState('Talsande, Kolhapur');
  const [savingInst, setSavingInst] = useState(false);

  // Categories Config
  const [selectedInstId, setSelectedInstId] = useState<string>('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatPriority, setNewCatPriority] = useState<TicketPriority>('Medium');
  const [newCatApproval, setNewCatApproval] = useState(false);

  // Users & Roles
  const [users, setUsers] = useState<UserProfile[]>([]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (institutions.length > 0 && !selectedInstId) {
      setSelectedInstId(institutions[0].id);
    }
  }, [institutions]);

  useEffect(() => {
    const instDepts = departments.filter((d) => d.institution_id === selectedInstId);
    if (instDepts.length > 0) {
      setSelectedDeptId(instDepts[0].id);
    } else {
      setSelectedDeptId('');
    }
  }, [selectedInstId, departments]);

  const loadCategories = async () => {
    if (!selectedDeptId) return;
    const { data } = await supabase
      .from('ticket_categories')
      .select('*')
      .eq('department_id', selectedDeptId)
      .order('name');
    if (data) setCategories(data as TicketCategory[]);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*, institution:institutions(*), department:departments(*)')
      .order('full_name');
    if (data) setUsers(data as UserProfile[]);
  };

  useEffect(() => {
    loadCategories();
  }, [selectedDeptId]);

  useEffect(() => {
    loadUsers();
  }, []);

  // Add New College + Auto-Seed 6 Standard Departments
  const handleAddInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instName.trim() || !instCode.trim()) return;
    setSavingInst(true);

    const { data: newInst, error } = await supabase
      .from('institutions')
      .insert({
        name: instName.trim(),
        code: instCode.trim().toUpperCase(),
        campus_location: instLocation.trim() || 'Talsande, Kolhapur',
      })
      .select('id')
      .single();

    if (!error && newInst) {
      const stdDepts = [
        { name: 'IT & Technical Support', code: 'IT', cat: 'General IT Support' },
        { name: 'Administration', code: 'ADMIN', cat: 'Bonafide Certificate' },
        { name: 'Examination', code: 'EXAM', cat: 'Hall Ticket' },
        { name: 'Accounts & Finance', code: 'FIN', cat: 'Fees' },
        { name: 'Infrastructure & Maintenance', code: 'INFRA', cat: 'Classroom' },
        { name: 'Other', code: 'OTHER', cat: 'General Grievance' },
      ];

      for (const d of stdDepts) {
        const { data: deptRow } = await supabase
          .from('departments')
          .insert({ institution_id: newInst.id, name: d.name, code: d.code })
          .select('id')
          .single();
        if (deptRow) {
          await supabase.from('ticket_categories').insert({
            department_id: deptRow.id,
            name: d.cat,
            default_priority: 'Medium',
          });
        }
      }

      await refreshMetadata();
      setInstName('');
      setInstCode('');
      showToast('New institution added with 6 standard departments!');
    }
    setSavingInst(false);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeptId || !newCatName.trim()) return;

    await supabase.from('ticket_categories').insert({
      department_id: selectedDeptId,
      name: newCatName.trim(),
      default_priority: newCatPriority,
      requires_approval: newCatApproval,
    });

    setNewCatName('');
    setNewCatApproval(false);
    loadCategories();
    showToast('Category added to department');
  };

  const handleUpdateCategoryRule = async (
    catId: string,
    updates: Partial<TicketCategory>
  ) => {
    await supabase.from('ticket_categories').update(updates).eq('id', catId);
    loadCategories();
    showToast('Category routing rule updated');
  };

  const handleUpdateUserRole = async (
    userId: string,
    updates: { role?: UserRole; institution_id?: string | null; department_id?: string | null }
  ) => {
    await supabase.from('profiles').update(updates).eq('id', userId);
    loadUsers();
    showToast('User role & institutional scope updated');
  };

  const instDepts = departments.filter((d) => d.institution_id === selectedInstId);
  const assignableStaff = users.filter((u) =>
    ['support_staff', 'department_hod', 'college_admin'].includes(u.role)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Settings2 className="w-6 h-6 text-brand-600" />
          <span>Colleges, Routing Rules & Role Management</span>
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Configure D. Y. Patil Group institutions, auto-assignment rules, and 8-tier user access
        </p>
      </div>

      {toast && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{toast}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-apple-sm w-fit">
        {[
          { id: 'institutions', label: 'Institutions & Colleges', icon: Building2 },
          { id: 'categories', label: 'Categories & Auto-Routing', icon: Layers },
          { id: 'users', label: 'Users & 8-Role Access', icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: INSTITUTIONS */}
      {activeTab === 'institutions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {roleMeta.canManageInstitutions && (
            <form
              onSubmit={handleAddInstitution}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-apple-sm space-y-4 h-fit"
            >
              <h2 className="text-sm font-bold text-slate-900">Add New College / Institute</h2>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institution Name *
                </label>
                <input
                  type="text"
                  required
                  value={instName}
                  onChange={(e) => setInstName(e.target.value)}
                  placeholder="e.g. D. Y. Patil College of Pharmacy"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Short Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={instCode}
                    onChange={(e) => setInstCode(e.target.value)}
                    placeholder="PHARM"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Campus Location
                  </label>
                  <input
                    type="text"
                    value={instLocation}
                    onChange={(e) => setInstLocation(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingInst}
                className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{savingInst ? 'Creating...' : 'Add Institution'}</span>
              </button>
            </form>
          )}

          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-apple-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-900">
              Active D. Y. Patil Group Institutions ({institutions.length})
            </h2>
            <div className="divide-y divide-slate-100">
              {institutions.map((inst) => {
                const deptCount = departments.filter((d) => d.institution_id === inst.id).length;
                return (
                  <div
                    key={inst.id}
                    className="py-3.5 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-600 font-mono text-xs font-bold">
                          {inst.code}
                        </span>
                        <span className="text-sm font-semibold text-slate-900">{inst.name}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{inst.campus_location}</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                      {deptCount} Departments
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORIES & AUTO-ROUTING */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-apple-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Institution
              </label>
              <select
                value={selectedInstId}
                onChange={(e) => setSelectedInstId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white"
              >
                {institutions.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.code} — {i.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Department
              </label>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white"
              >
                {instDepts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-apple-sm space-y-5">
            <form onSubmit={handleAddCategory} className="flex flex-wrap items-end gap-3 pb-5 border-b border-slate-100">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Category Name
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. ERP Login / Biometric Issue"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Default Priority
                </label>
                <select
                  value={newCatPriority}
                  onChange={(e) => setNewCatPriority(e.target.value as TicketPriority)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  {(['Low', 'Medium', 'High', 'Critical'] as TicketPriority[]).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newCatApproval}
                  onChange={(e) => setNewCatApproval(e.target.checked)}
                />
                Requires Approval
              </label>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 cursor-pointer"
              >
                + Add Category
              </button>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-400">
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Default SLA Priority</th>
                    <th className="py-2.5 px-3">Auto-Assign Staff</th>
                    <th className="py-2.5 px-3">Approval Workflow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.map((cat) => (
                    <tr key={cat.id}>
                      <td className="py-3 px-3 font-semibold text-slate-900">{cat.name}</td>
                      <td className="py-3 px-3">
                        <select
                          value={cat.default_priority}
                          onChange={(e) =>
                            handleUpdateCategoryRule(cat.id, {
                              default_priority: e.target.value as TicketPriority,
                            })
                          }
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs bg-white"
                        >
                          {(['Low', 'Medium', 'High', 'Critical'] as TicketPriority[]).map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={cat.auto_assign_user_id || ''}
                          onChange={(e) =>
                            handleUpdateCategoryRule(cat.id, {
                              auto_assign_user_id: e.target.value || null,
                            })
                          }
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs bg-white"
                        >
                          <option value="">Manual / Dept Queue</option>
                          {assignableStaff.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.full_name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={cat.requires_approval}
                          onChange={(e) =>
                            handleUpdateCategoryRule(cat.id, {
                              requires_approval: e.target.checked,
                            })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: USERS & 8-ROLE ACCESS CONTROL */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-apple-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-brand-600" />
                Registered Users & Role Assignments
              </h2>
              <p className="text-xs text-slate-500">
                Assign users to one of the 8 institutional roles; their login automatically locks to
                these permissions.
              </p>
            </div>
          </div>

          {users.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">
              No registered accounts in `profiles` yet. Users appear here automatically once they
              create an account on the Login screen.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-400">
                    <th className="py-3 px-3">User</th>
                    <th className="py-3 px-3">Assigned Role</th>
                    <th className="py-3 px-3">Assigned College</th>
                    <th className="py-3 px-3">Assigned Department</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const userDepts = departments.filter(
                      (d) => d.institution_id === u.institution_id
                    );
                    return (
                      <tr key={u.id}>
                        <td className="py-3.5 px-3">
                          <div className="font-semibold text-slate-900">{u.full_name}</div>
                          <div className="text-xs text-slate-400">{u.email}</div>
                        </td>
                        <td className="py-3.5 px-3">
                          <select
                            value={u.role}
                            onChange={(e) =>
                              handleUpdateUserRole(u.id, { role: e.target.value as UserRole })
                            }
                            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                          >
                            {Object.values(ROLE_CONFIG).map((r) => (
                              <option key={r.key} value={r.key}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3.5 px-3">
                          <select
                            value={u.institution_id || ''}
                            onChange={(e) =>
                              handleUpdateUserRole(u.id, {
                                institution_id: e.target.value || null,
                                department_id: null,
                              })
                            }
                            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white"
                          >
                            <option value="">All / Central Group</option>
                            {institutions.map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.code} — {i.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3.5 px-3">
                          <select
                            value={u.department_id || ''}
                            onChange={(e) =>
                              handleUpdateUserRole(u.id, {
                                department_id: e.target.value || null,
                              })
                            }
                            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white"
                          >
                            <option value="">All Departments</option>
                            {userDepts.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};