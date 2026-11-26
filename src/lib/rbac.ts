import type { UserRole } from '../types/database';

export interface RoleMeta {
  key: UserRole;
  label: string;
  shortLabel: string;
  description: string;
  badgeColor: string;
  scope: 'all' | 'institution' | 'department' | 'assigned' | 'self';
  canManageInstitutions: boolean;
  canAssignTickets: boolean;
  canTransferTickets: boolean;
  canAddInternalNotes: boolean;
  canViewReports: boolean;
  canApproveRequests: boolean;
}

export const ROLE_CONFIG: Record<UserRole, RoleMeta> = {
  super_admin: {
    key: 'super_admin',
    label: 'Super Admin',
    shortLabel: 'Super Admin',
    description: 'Full control over all D. Y. Patil Group institutions, rules & users',
    badgeColor: 'bg-brand-50 text-brand-600 border-brand-200',
    scope: 'all',
    canManageInstitutions: true,
    canAssignTickets: true,
    canTransferTickets: true,
    canAddInternalNotes: true,
    canViewReports: true,
    canApproveRequests: true,
  },
  university_admin: {
    key: 'university_admin',
    label: 'University Admin',
    shortLabel: 'Univ Admin',
    description: 'Manages university-level tickets and oversees all colleges',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    scope: 'all',
    canManageInstitutions: true,
    canAssignTickets: true,
    canTransferTickets: true,
    canAddInternalNotes: true,
    canViewReports: true,
    canApproveRequests: true,
  },
  college_admin: {
    key: 'college_admin',
    label: 'College Admin',
    shortLabel: 'College Admin',
    description: 'Manages all departments and tickets within their assigned college',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    scope: 'institution',
    canManageInstitutions: false,
    canAssignTickets: true,
    canTransferTickets: true,
    canAddInternalNotes: true,
    canViewReports: true,
    canApproveRequests: true,
  },
  department_hod: {
    key: 'department_hod',
    label: 'Department HOD',
    shortLabel: 'Dept HOD',
    description: 'Manages departmental ticket queues, staff assignments & approvals',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
    scope: 'department',
    canManageInstitutions: false,
    canAssignTickets: true,
    canTransferTickets: true,
    canAddInternalNotes: true,
    canViewReports: true,
    canApproveRequests: true,
  },
  support_staff: {
    key: 'support_staff',
    label: 'Support Staff',
    shortLabel: 'Support',
    description: 'Works on assigned tickets, adds internal notes & resolves issues',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    scope: 'assigned',
    canManageInstitutions: false,
    canAssignTickets: false,
    canTransferTickets: false,
    canAddInternalNotes: true,
    canViewReports: false,
    canApproveRequests: false,
  },
  faculty: {
    key: 'faculty',
    label: 'Faculty',
    shortLabel: 'Faculty',
    description: 'Raises academic, IT, or infrastructure tickets and tracks progress',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    scope: 'self',
    canManageInstitutions: false,
    canAssignTickets: false,
    canTransferTickets: false,
    canAddInternalNotes: false,
    canViewReports: false,
    canApproveRequests: false,
  },
  student: {
    key: 'student',
    label: 'Student',
    shortLabel: 'Student',
    description: 'Raises exam, bonafide, fee, hostel & IT requests and tracks status',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    scope: 'self',
    canManageInstitutions: false,
    canAssignTickets: false,
    canTransferTickets: false,
    canAddInternalNotes: false,
    canViewReports: false,
    canApproveRequests: false,
  },
  registrar_management: {
    key: 'registrar_management',
    label: 'Registrar / Management',
    shortLabel: 'Registrar',
    description: 'Executive view of college comparisons, SLA reports & escalated tickets',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    scope: 'all',
    canManageInstitutions: false,
    canAssignTickets: true,
    canTransferTickets: true,
    canAddInternalNotes: true,
    canViewReports: true,
    canApproveRequests: true,
  },
};