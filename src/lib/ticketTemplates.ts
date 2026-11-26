import type { TicketPriority } from '../types/database';

export interface TicketTemplate {
  id: string;
  label: string;
  departmentMatch: string;
  categoryMatch: string;
  subject: string;
  description: string;
  priority: TicketPriority;
}

export const TICKET_TEMPLATES: TicketTemplate[] = [
  {
    id: 'wifi-down',
    label: 'Lab / Classroom Wi-Fi Not Connecting',
    departmentMatch: 'IT & Technical Support',
    categoryMatch: 'Wi-Fi',
    subject: 'Wi-Fi connectivity drop / authentication error',
    description:
      'Unable to connect to campus Wi-Fi network. Signal shows full bars, but internet access fails after login.',
    priority: 'High',
  },
  {
    id: 'bonafide-req',
    label: 'Bonafide Certificate Request',
    departmentMatch: 'Administration',
    categoryMatch: 'Bonafide Certificate',
    subject: 'Request for Bonafide Certificate',
    description:
      'Kindly issue an official Bonafide Certificate for the current academic year. Supporting ID details are attached.',
    priority: 'Medium',
  },
  {
    id: 'hall-ticket',
    label: 'Hall Ticket Download / Correction',
    departmentMatch: 'Examination',
    categoryMatch: 'Hall Ticket',
    subject: 'Hall Ticket not visible / subject mismatch on portal',
    description:
      'Exam fees are cleared, however the hall ticket is either unavailable or displays an incorrect subject code.',
    priority: 'Critical',
  },
  {
    id: 'ac-power',
    label: 'Classroom Power / Projector Fault',
    departmentMatch: 'Infrastructure & Maintenance',
    categoryMatch: 'Electricity',
    subject: 'Power socket / smart-board projector not turning on',
    description:
      'Electrical supply to the podium and classroom projector is not working prior to scheduled lectures.',
    priority: 'High',
  },
];