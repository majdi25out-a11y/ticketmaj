import { Ticket, AppBrandingConfig } from '../types';

export interface ExportOptions {
  format: 'xlsx' | 'pdf';
  fileName: string;
  includeHeader: boolean;
  includeKpiSummary: boolean;
  selectedColumns: {
    id: boolean;
    title: boolean;
    status: boolean;
    priority: boolean;
    requestedBy: boolean;
    assignedTo: boolean;
    platform: boolean;
    createdDate: boolean;
    commentsCount: boolean;
    attachmentsCount: boolean;
    description: boolean;
  };
  filterStatus: string;
  filterPriority: string;
  filterDev: string;
  filterDateRange: 'all' | '7days' | '30days' | 'this_month';
}

export const DEFAULT_EXPORT_COLUMNS = {
  id: true,
  title: true,
  status: true,
  priority: true,
  requestedBy: true,
  assignedTo: true,
  platform: true,
  createdDate: true,
  commentsCount: true,
  attachmentsCount: true,
  description: false,
};

// Helper: Format French dates nicely
export const formatDateFr = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (_e) {
    return dateStr;
  }
};

export const translateStatus = (status: string) => {
  switch (status) {
    case 'pending':
      return 'À valider';
    case 'in_progress':
      return 'En cours / À faire';
    case 'completed':
      return 'Terminé / Résolu';
    case 'rejected':
      return 'Rejeté';
    case 'approved':
      return 'Validé';
    default:
      return status;
  }
};

export const translatePriority = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'URGENT';
    case 'high':
      return 'Élevée';
    case 'medium':
      return 'Moyenne';
    case 'low':
      return 'Basse';
    default:
      return priority;
  }
};

// Filter tickets according to selected export filters
export const filterTicketsForExport = (
  tickets: Ticket[],
  options: Partial<ExportOptions>
) => {
  return tickets.filter((t) => {
    // Status filter
    if (options.filterStatus && options.filterStatus !== 'all') {
      if (t.status !== options.filterStatus) return false;
    }

    // Priority filter
    if (options.filterPriority && options.filterPriority !== 'all') {
      if (t.priority !== options.filterPriority) return false;
    }

    // Developer filter
    if (options.filterDev && options.filterDev !== 'all') {
      if (options.filterDev === 'unassigned') {
        if (t.assignedTo) return false;
      } else {
        if (!t.assignedTo || t.assignedTo.id !== options.filterDev) return false;
      }
    }

    // Date range filter
    if (options.filterDateRange && options.filterDateRange !== 'all') {
      const ticketDate = new Date(t.createdDate || Date.now()).getTime();
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;

      if (options.filterDateRange === '7days') {
        if (now - ticketDate > 7 * oneDay) return false;
      } else if (options.filterDateRange === '30days') {
        if (now - ticketDate > 30 * oneDay) return false;
      } else if (options.filterDateRange === 'this_month') {
        const d = new Date(t.createdDate || Date.now());
        const current = new Date();
        if (d.getMonth() !== current.getMonth() || d.getFullYear() !== current.getFullYear()) {
          return false;
        }
      }
    }

    return true;
  });
};

/**
 * CSV Fallback function for Excel export
 */
const exportToCSVFallback = (
  tickets: Ticket[],
  options: ExportOptions,
  branding: AppBrandingConfig,
  currentUserName: string
) => {
  const exportDate = new Date().toLocaleString('fr-FR');
  const cols = options.selectedColumns;

  let csvContent = '\uFEFF'; // Excel UTF-8 BOM

  if (options.includeHeader) {
    csvContent += `"${branding.appName.toUpperCase()} - RAPPORT D'ACTIVITÉ TICKETS"\n`;
    csvContent += `"Date d'export : ${exportDate}"\n`;
    csvContent += `"Généré par : ${currentUserName || 'Administrateur'}"\n\n`;
  }

  if (options.includeKpiSummary) {
    const total = tickets.length;
    const completed = tickets.filter((t) => t.status === 'completed').length;
    const inProgress = tickets.filter((t) => t.status === 'in_progress').length;
    const pending = tickets.filter((t) => t.status === 'pending').length;
    const urgent = tickets.filter((t) => t.priority === 'urgent').length;

    csvContent += `"Total","Terminés","En cours","À valider","Urgent"\n`;
    csvContent += `"${total}","${completed}","${inProgress}","${pending}","${urgent}"\n\n`;
  }

  const tableHeaders: string[] = [];
  if (cols.id) tableHeaders.push('ID Ticket');
  if (cols.title) tableHeaders.push('Titre');
  if (cols.status) tableHeaders.push('Statut');
  if (cols.priority) tableHeaders.push('Priorité');
  if (cols.requestedBy) tableHeaders.push('Demandé Par');
  if (cols.assignedTo) tableHeaders.push('Assigné À');
  if (cols.platform) tableHeaders.push('Plateforme');
  if (cols.createdDate) tableHeaders.push('Date de Création');
  if (cols.commentsCount) tableHeaders.push('Commentaires');
  if (cols.attachmentsCount) tableHeaders.push('Pièces Jointes');
  if (cols.description) tableHeaders.push('Description');

  csvContent += tableHeaders.map((h) => `"${h}"`).join(';') + '\n';

  tickets.forEach((t) => {
    const row: string[] = [];
    if (cols.id) row.push(`"${t.id}"`);
    if (cols.title) row.push(`"${(t.title || '').replace(/"/g, '""')}"`);
    if (cols.status) row.push(`"${translateStatus(t.status)}"`);
    if (cols.priority) row.push(`"${translatePriority(t.priority)}"`);
    if (cols.requestedBy) row.push(`"${(t.requestedBy || '').replace(/"/g, '""')}"`);
    if (cols.assignedTo) row.push(`"${t.assignedTo ? t.assignedTo.name : 'Non assigné'}"`);
    if (cols.platform) row.push(`"${t.platform === 'mobile' ? 'Mobile' : 'Web'}"`);
    if (cols.createdDate) row.push(`"${formatDateFr(t.createdDate)}"`);
    if (cols.commentsCount) row.push(`"${t.comments ? t.comments.length : 0}"`);
    if (cols.attachmentsCount) row.push(`"${t.attachments ? t.attachments.length : 0}"`);
    if (cols.description) row.push(`"${(t.description || '').replace(/"/g, '""')}"`);

    csvContent += row.join(';') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanFileName = (options.fileName || `Export_Tickets_${Date.now()}`)
    .replace(/[/\\?%*:|"<>]/g, '_') + '.csv';
  link.setAttribute('download', cleanFileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * HTML Printable report fallback for PDF
 */
const exportToHTMLPrintFallback = (
  tickets: Ticket[],
  options: ExportOptions,
  branding: AppBrandingConfig,
  currentUserName: string
) => {
  const exportDate = new Date().toLocaleString('fr-FR');
  const cols = options.selectedColumns;

  const total = tickets.length;
  const completed = tickets.filter((t) => t.status === 'completed').length;
  const inProgress = tickets.filter((t) => t.status === 'in_progress').length;
  const pending = tickets.filter((t) => t.status === 'pending').length;
  const urgent = tickets.filter((t) => t.priority === 'urgent').length;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const tableHeaders: string[] = [];
  if (cols.id) tableHeaders.push('ID');
  if (cols.title) tableHeaders.push('Titre');
  if (cols.status) tableHeaders.push('Statut');
  if (cols.priority) tableHeaders.push('Priorité');
  if (cols.requestedBy) tableHeaders.push('Demandé Par');
  if (cols.assignedTo) tableHeaders.push('Assigné À');
  if (cols.platform) tableHeaders.push('Plateforme');
  if (cols.createdDate) tableHeaders.push('Date');
  if (cols.commentsCount) tableHeaders.push('Comm.');
  if (cols.attachmentsCount) tableHeaders.push('P.J.');
  if (cols.description) tableHeaders.push('Description');

  const rowsHtml = tickets
    .map((t) => {
      const cells: string[] = [];
      if (cols.id) cells.push(`<td>${t.id}</td>`);
      if (cols.title) cells.push(`<td><strong>${t.title}</strong></td>`);
      if (cols.status) cells.push(`<td>${translateStatus(t.status)}</td>`);
      if (cols.priority) cells.push(`<td>${translatePriority(t.priority)}</td>`);
      if (cols.requestedBy) cells.push(`<td>${t.requestedBy}</td>`);
      if (cols.assignedTo) cells.push(`<td>${t.assignedTo ? t.assignedTo.name : 'Non assigné'}</td>`);
      if (cols.platform) cells.push(`<td>${t.platform === 'mobile' ? 'Mobile' : 'Web'}</td>`);
      if (cols.createdDate) cells.push(`<td>${formatDateFr(t.createdDate)}</td>`);
      if (cols.commentsCount) cells.push(`<td>${t.comments ? t.comments.length : 0}</td>`);
      if (cols.attachmentsCount) cells.push(`<td>${t.attachments ? t.attachments.length : 0}</td>`);
      if (cols.description) cells.push(`<td>${t.description || ''}</td>`);

      return `<tr>${cells.join('')}</tr>`;
    })
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${options.fileName || 'Rapport Tickets'}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #1e293b; }
          .header { background: #1f108e; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          .header h1 { margin: 0; font-size: 20px; }
          .header p { margin: 4px 0 0; opacity: 0.8; font-size: 13px; }
          .kpis { display: flex; gap: 15px; margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .kpi-item { flex: 1; text-align: center; }
          .kpi-item .val { font-size: 18px; font-weight: bold; color: #0b1c30; }
          .kpi-item .lbl { font-size: 11px; color: #64748b; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th { background: #1f108e; color: white; text-align: left; padding: 10px; font-weight: 600; }
          td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background: #f8fafc; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        ${
          options.includeHeader
            ? `
          <div class="header">
            <div>
              <h1>${branding.appName.toUpperCase()}</h1>
              <p>${branding.appSubtitle || 'Rapport d\'activité Tickets'}</p>
            </div>
            <div style="text-align: right; font-size: 12px;">
              <div>Date: ${exportDate}</div>
              <div>Généré par: ${currentUserName || 'Administrateur'}</div>
            </div>
          </div>
        `
            : ''
        }
        ${
          options.includeKpiSummary
            ? `
          <div class="kpis">
            <div class="kpi-item"><div class="val">${total}</div><div class="lbl">Total Tickets</div></div>
            <div class="kpi-item"><div class="val">${completed}</div><div class="lbl">Terminés</div></div>
            <div class="kpi-item"><div class="val">${inProgress}</div><div class="lbl">En cours</div></div>
            <div class="kpi-item"><div class="val">${pending}</div><div class="lbl">À valider</div></div>
            <div class="kpi-item"><div class="val" style="color: #dc2626;">${urgent}</div><div class="lbl">Urgents</div></div>
          </div>
        `
            : ''
        }
        <table>
          <thead>
            <tr>${tableHeaders.map((h) => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

/**
 * EXPORT TO XLSX (EXCEL)
 */
export const exportToXLSX = async (
  tickets: Ticket[],
  options: ExportOptions,
  branding: AppBrandingConfig,
  currentUserName: string
) => {
  try {
    const XLSX = await import('xlsx');
    const exportDate = new Date().toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const rows: any[] = [];

    // 1. Header Block if enabled
    if (options.includeHeader) {
      rows.push([`${branding.appName.toUpperCase()} - RAPPORT D'ACTIVITÉ TICKETS`]);
      rows.push([`Sous-titre : ${branding.appSubtitle || 'Gestion & Suivi'}`]);
      rows.push([`Date d'exportation : ${exportDate}`]);
      rows.push([`Généré par : ${currentUserName || 'Administrateur'}`]);
      rows.push([]);
    }

    // 2. KPI Summary if enabled
    if (options.includeKpiSummary) {
      const total = tickets.length;
      const completed = tickets.filter((t) => t.status === 'completed').length;
      const inProgress = tickets.filter((t) => t.status === 'in_progress').length;
      const pending = tickets.filter((t) => t.status === 'pending').length;
      const urgent = tickets.filter((t) => t.priority === 'urgent').length;

      rows.push(['RÉSUMÉ EXÉCUTIF']);
      rows.push(['Total des tickets', 'Terminés', 'En cours', 'À valider', 'Urgent']);
      rows.push([total, completed, inProgress, pending, urgent]);
      rows.push([]);
    }

    // 3. Table Column Headers
    const tableHeaders: string[] = [];
    const cols = options.selectedColumns;

    if (cols.id) tableHeaders.push('ID Ticket');
    if (cols.title) tableHeaders.push('Titre du Ticket');
    if (cols.status) tableHeaders.push('Statut');
    if (cols.priority) tableHeaders.push('Priorité');
    if (cols.requestedBy) tableHeaders.push('Demandé Par');
    if (cols.assignedTo) tableHeaders.push('Assigné À');
    if (cols.platform) tableHeaders.push('Plateforme');
    if (cols.createdDate) tableHeaders.push('Date de Création');
    if (cols.commentsCount) tableHeaders.push('Commentaires');
    if (cols.attachmentsCount) tableHeaders.push('Pièces Jointes');
    if (cols.description) tableHeaders.push('Description');

    rows.push(tableHeaders);

    // 4. Table Data Rows
    tickets.forEach((t) => {
      const row: any[] = [];
      if (cols.id) row.push(t.id);
      if (cols.title) row.push(t.title);
      if (cols.status) row.push(translateStatus(t.status));
      if (cols.priority) row.push(translatePriority(t.priority));
      if (cols.requestedBy) row.push(t.requestedBy);
      if (cols.assignedTo) row.push(t.assignedTo ? t.assignedTo.name : 'Non assigné');
      if (cols.platform) row.push(t.platform === 'mobile' ? 'Mobile' : 'Web');
      if (cols.createdDate) row.push(formatDateFr(t.createdDate));
      if (cols.commentsCount) row.push(t.comments ? t.comments.length : 0);
      if (cols.attachmentsCount) row.push(t.attachments ? t.attachments.length : 0);
      if (cols.description) row.push(t.description || '');

      rows.push(row);
    });

    // Create sheet and workbook
    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    // Auto column width calculation
    const colWidths = tableHeaders.map((header) => ({
      wch: Math.max(header.length + 4, 15),
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rapport Tickets');

    // Trigger file download
    const cleanFileName = (options.fileName || `Export_Tickets_${Date.now()}`)
      .replace(/[/\\?%*:|"<>]/g, '_') + '.xlsx';

    XLSX.writeFile(workbook, cleanFileName);
  } catch (_e) {
    console.warn('XLSX module unavailable, falling back to CSV export.');
    exportToCSVFallback(tickets, options, branding, currentUserName);
  }
};

/**
 * EXPORT TO PDF (PDF DOCUMENT WITH LOGO, HEADER & STYLED TABLE)
 */
export const exportToPDF = async (
  tickets: Ticket[],
  options: ExportOptions,
  branding: AppBrandingConfig,
  currentUserName: string
) => {
  try {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const exportDate = new Date().toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let currentY = 14;

    // 1. Header Banner & Logo
    if (options.includeHeader) {
      // Primary header background box
      doc.setFillColor(31, 16, 142); // #1f108e
      doc.rect(10, 10, 277, 24, 'F');

      // Draw app logo badge or image
      let logoOffset = 16;
      if (branding.appLogoUrl && branding.appLogoUrl.startsWith('data:image')) {
        try {
          doc.addImage(branding.appLogoUrl, 'PNG', 15, 13, 18, 18);
          logoOffset = 38;
        } catch (_e) {
          logoOffset = 16;
        }
      } else {
        // Draw crisp logo icon badge
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(15, 13, 18, 18, 3, 3, 'F');
        doc.setFillColor(31, 16, 142);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('TF', 24, 25, { align: 'center' });
        logoOffset = 38;
      }

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(branding.appName.toUpperCase(), logoOffset, 21);

      // Subtitle
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(branding.appSubtitle || "Rapport d'activité & Suivi Operational", logoOffset, 27);

      // Metadata block on right
      doc.setFontSize(8);
      doc.text(`Date d'export : ${exportDate}`, 280, 19, { align: 'right' });
      doc.text(`Généré par : ${currentUserName || 'Administrateur'}`, 280, 25, { align: 'right' });

      currentY = 40;
    }

    // 2. Executive KPI Summary
    if (options.includeKpiSummary) {
      const total = tickets.length;
      const completed = tickets.filter((t) => t.status === 'completed').length;
      const inProgress = tickets.filter((t) => t.status === 'in_progress').length;
      const pending = tickets.filter((t) => t.status === 'pending').length;
      const urgent = tickets.filter((t) => t.priority === 'urgent').length;

      doc.setFillColor(245, 247, 255);
      doc.setDrawColor(200, 196, 213);
      doc.roundedRect(10, currentY, 277, 16, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(11, 28, 48);

      const kpiY = currentY + 10;
      doc.text(`TOTAL TICKETS : ${total}`, 20, kpiY);
      doc.text(`TERMINÉS : ${completed}`, 75, kpiY);
      doc.text(`EN COURS : ${inProgress}`, 130, kpiY);
      doc.text(`À VALIDER : ${pending}`, 185, kpiY);

      doc.setTextColor(186, 26, 26); // Urgent red
      doc.text(`URGENTS : ${urgent}`, 240, kpiY);

      currentY += 22;
    }

    // 3. Prepare Table Columns and Data
    const cols = options.selectedColumns;
    const headCols: string[] = [];
    const colKeys: (keyof Ticket | 'commentsCount' | 'attachmentsCount')[] = [];

    if (cols.id) { headCols.push('ID'); colKeys.push('id'); }
    if (cols.title) { headCols.push('Titre'); colKeys.push('title'); }
    if (cols.status) { headCols.push('Statut'); colKeys.push('status'); }
    if (cols.priority) { headCols.push('Priorité'); colKeys.push('priority'); }
    if (cols.requestedBy) { headCols.push('Demandé Par'); colKeys.push('requestedBy'); }
    if (cols.assignedTo) { headCols.push('Assigné À'); colKeys.push('assignedTo'); }
    if (cols.platform) { headCols.push('Plateforme'); colKeys.push('platform'); }
    if (cols.createdDate) { headCols.push('Date'); colKeys.push('createdDate'); }
    if (cols.commentsCount) { headCols.push('Comm.'); colKeys.push('commentsCount'); }
    if (cols.attachmentsCount) { headCols.push('P.J.'); colKeys.push('attachmentsCount'); }
    if (cols.description) { headCols.push('Description'); colKeys.push('description'); }

    const bodyData = tickets.map((t) => {
      const row: string[] = [];
      colKeys.forEach((key) => {
        if (key === 'id') row.push(t.id);
        else if (key === 'title') row.push(t.title);
        else if (key === 'status') row.push(translateStatus(t.status));
        else if (key === 'priority') row.push(translatePriority(t.priority));
        else if (key === 'requestedBy') row.push(t.requestedBy);
        else if (key === 'assignedTo') row.push(t.assignedTo ? t.assignedTo.name : 'Non assigné');
        else if (key === 'platform') row.push(t.platform === 'mobile' ? 'Mobile' : 'Web');
        else if (key === 'createdDate') row.push(formatDateFr(t.createdDate));
        else if (key === 'commentsCount') row.push(`${t.comments ? t.comments.length : 0}`);
        else if (key === 'attachmentsCount') row.push(`${t.attachments ? t.attachments.length : 0}`);
        else if (key === 'description') row.push(t.description ? t.description.substring(0, 80) + '...' : '');
      });
      return row;
    });

    // 4. Render Table with autoTable
    autoTable(doc, {
      startY: currentY,
      head: [headCols],
      body: bodyData,
      margin: { left: 10, right: 10 },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [31, 16, 142], // #1f108e
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      didDrawPage: (data) => {
        // Footer page numbers on all pages
        const pageCount = (doc as any).internal.getNumberOfPages();
        const currentPage = data.pageNumber;

        doc.setFontSize(8);
        doc.setTextColor(120, 120, 130);
        doc.text(
          `Document généré par ${branding.appName} • Page ${currentPage} sur ${pageCount}`,
          148,
          202,
          { align: 'center' }
        );
      },
    });

    // Clean filename and save
    const cleanFileName = (options.fileName || `Export_Tickets_${Date.now()}`)
      .replace(/[/\\?%*:|"<>]/g, '_') + '.pdf';

    doc.save(cleanFileName);
  } catch (_e) {
    console.warn('jsPDF module unavailable, falling back to Print report window.');
    exportToHTMLPrintFallback(tickets, options, branding, currentUserName);
  }
};
