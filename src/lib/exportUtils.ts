import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Ticket } from '../types/database';

export function exportTicketsToExcel(tickets: Ticket[], filename = 'DYP-Service-Desk-Report.xlsx') {
  const rows = tickets.map((t) => ({
    'Ticket Number': t.ticket_number,
    Institution: t.institution?.name || t.institution?.code || '—',
    Department: t.department?.name || '—',
    Category: t.category?.name || '—',
    Subject: t.subject,
    Priority: t.priority,
    Status: t.status,
    Escalation: t.is_escalated ? `Level ${t.escalation_level}` : 'Normal',
    'Assigned To': t.assignee?.full_name || 'Unassigned',
    'Created Date': new Date(t.created_at).toLocaleDateString('en-IN'),
    'SLA Due': t.resolution_due_at
      ? new Date(t.resolution_due_at).toLocaleString('en-IN')
      : '—',
    Rating: t.rating ? `${t.rating}/5` : '—',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Service Tickets');
  XLSX.writeFile(workbook, filename);
}

export function exportSummaryToPdf(
  title: string,
  subtitle: string,
  headers: string[],
  bodyRows: (string | number)[][],
  filename = 'DYP-Executive-Report.pdf'
) {
  const doc = new jsPDF({ orientation: 'landscape' });

  // Branded Header Banner
  doc.setFillColor(128, 0, 0); // D. Y. Patil Maroon #800000
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('D. Y. PATIL GROUP — UNIFIED SERVICE DESK', 14, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${title}  |  ${subtitle}`, 14, 18);

  autoTable(doc, {
    startY: 30,
    head: [headers],
    body: bodyRows,
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(filename);
}