export type UserRole =
  | 'super_admin'
  | 'university_admin'
  | 'college_admin'
  | 'department_hod'
  | 'support_staff'
  | 'faculty'
  | 'student'
  | 'registrar_management';

export type TicketStatus =
  | 'Open'
  | 'Assigned'
  | 'In Progress'
  | 'On Hold'
  | 'Resolved'
  | 'Closed'
  | 'Reopened';

export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Institution {
  id: string;
  code: string;
  name: string;
  campus_location: string;
  logo_url?: string | null;
  is_active: boolean;
}

export interface Department {
  id: string;
  institution_id: string;
  name: string;
  code: string;
  is_active: boolean;
}

export interface CustomFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'date';
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

export interface TicketCategory {
  id: string;
  department_id: string;
  name: string;
  default_priority: TicketPriority;
  default_visibility: 'private' | 'department';
  requires_approval: boolean;
  custom_fields: CustomFieldConfig[];
  auto_assign_user_id?: string | null;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  employee_or_prn_id?: string | null;
  role: UserRole;
  institution_id?: string | null;
  department_id?: string | null;
  is_active: boolean;
  institution?: Institution;
  department?: Department;
}

export interface AttachmentItem {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  institution_id: string;
  department_id: string;
  category_id: string;
  created_by: string;
  assigned_to?: string | null;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  visibility: 'private' | 'department';
  is_anonymous: boolean;
  approval_status: 'not_required' | 'pending' | 'approved' | 'rejected';
  custom_data: Record<string, string>;
  attachments: AttachmentItem[];
  location_tag?: string | null;
  response_due_at?: string | null;
  resolution_due_at?: string | null;
  first_responded_at?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  escalation_level: number;
  is_escalated: boolean;
  rating?: number | null;
  feedback_comment?: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  institution?: Institution;
  department?: Department;
  category?: TicketCategory;
  creator?: UserProfile;
  assignee?: UserProfile;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  author_id: string;
  message: string;
  is_internal: boolean;
  attachments: AttachmentItem[];
  created_at: string;
  author?: UserProfile;
}

export interface TicketAuditLog {
  id: string;
  ticket_id: string;
  actor_id?: string | null;
  action: string;
  old_value?: string | null;
  new_value?: string | null;
  notes?: string | null;
  created_at: string;
  actor?: UserProfile;
}