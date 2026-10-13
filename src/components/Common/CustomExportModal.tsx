import React, { useState, useMemo } from 'react';
import { Ticket, Developer, AppBrandingConfig } from '../../types';
import {
  ExportOptions,
  DEFAULT_EXPORT_COLUMNS,
  filterTicketsForExport,
  exportToXLSX,
  exportToPDF,
} from '../../utils/exportUtils';

interface CustomExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: Ticket[];
  developers: Developer[];
  branding: AppBrandingConfig;
  currentUser?: { name: string; role: string; email?: string };
  onSuccessToast?: (msg: string) => void;
}

export const CustomExportModal: React.FC<CustomExportModalProps> = ({
  isOpen,
  onClose,
  tickets,
  developers,
  branding,
  currentUser,
  onSuccessToast,
}) => {
  const defaultDateStr = new Date().toISOString().split('T')[0];

  const [format, setFormat] = useState<'xlsx' | 'pdf'>('xlsx');
  const [fileName, setFileName] = useState<string>(`Rapport_Tickets_${defaultDateStr}`);
  const [includeHeader, setIncludeHeader] = useState<boolean>(true);
  const [includeKpiSummary, setIncludeKpiSummary] = useState<boolean>(true);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterDev, setFilterDev] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<'all' | '7days' | '30days' | 'this_month'>('all');

  const [columns, setColumns] = useState(DEFAULT_EXPORT_COLUMNS);
  const [isExporting, setIsExporting] = useState(false);

  const isAdmin =
    currentUser?.role?.toLowerCase().includes('admin') ||
    currentUser?.role?.toLowerCase().includes('architect') ||
    currentUser?.email === 'admin@ticketflow.io';

  // Base tickets allowed for the current user
  const baseTickets = useMemo(() => {
    if (isAdmin) return tickets;
    return tickets.filter((t) => {
      const isAssignedToMe =
        t.assignedTo &&
        ((currentUser?.id && t.assignedTo.id === currentUser.id) ||
          (currentUser?.name && t.assignedTo.name?.toLowerCase().trim() === currentUser.name.toLowerCase().trim()) ||
          (currentUser?.email && t.assignedTo.email?.toLowerCase().trim() === currentUser.email.toLowerCase().trim()));
      const isProposedByMe =
        (currentUser?.name && t.requestedBy?.toLowerCase().trim() === currentUser.name.toLowerCase().trim()) ||
        (currentUser?.email && t.requestedBy?.toLowerCase().trim() === currentUser.email.toLowerCase().trim());
      return isAssignedToMe || isProposedByMe;
    });
  }, [tickets, isAdmin, currentUser]);

  // Filtered tickets live preview calculation
  const filteredTickets = useMemo(() => {
    return filterTicketsForExport(baseTickets, {
      filterStatus,
      filterPriority,
      filterDev: isAdmin ? filterDev : 'all',
      filterDateRange,
    });
  }, [baseTickets, filterStatus, filterPriority, filterDev, filterDateRange, isAdmin]);

  if (!isOpen) return null;

  const handleToggleColumn = (key: keyof typeof DEFAULT_EXPORT_COLUMNS) => {
    setColumns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelectAllColumns = (val: boolean) => {
    setColumns({
      id: val,
      title: val,
      status: val,
      priority: val,
      requestedBy: val,
      assignedTo: val,
      platform: val,
      createdDate: val,
      commentsCount: val,
      attachmentsCount: val,
      description: val,
    });
  };

  const handleGenerateExport = async () => {
    if (filteredTickets.length === 0) {
      if (onSuccessToast) onSuccessToast('Aucun ticket ne correspond aux filtres sélectionnés.');
      return;
    }

    setIsExporting(true);

    const exportOptions: ExportOptions = {
      format,
      fileName: fileName.trim() || `Export_Tickets_${defaultDateStr}`,
      includeHeader,
      includeKpiSummary,
      selectedColumns: columns,
      filterStatus,
      filterPriority,
      filterDev,
      filterDateRange,
    };

    try {
      const userName = currentUser?.name || 'Administrateur';

      if (format === 'xlsx') {
        exportToXLSX(filteredTickets, exportOptions, branding, userName);
        if (onSuccessToast) onSuccessToast(`Export Excel (.xlsx) de ${filteredTickets.length} ticket(s) généré !`);
      } else {
        await exportToPDF(filteredTickets, exportOptions, branding, userName);
        if (onSuccessToast) onSuccessToast(`Export PDF (.pdf) de ${filteredTickets.length} ticket(s) généré !`);
      }

      onClose();
    } catch (err) {
      console.error('Erreur génération export :', err);
      if (onSuccessToast) onSuccessToast('Une erreur est survenue lors de la génération de l\'export.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-[#c8c4d5]/80 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-[#eff4ff] border-b border-[#c8c4d5]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1f108e] text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-2xl">download</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0b1c30]">Exportation Personnalisée</h2>
              <p className="text-xs text-[#777584]">
                Générez un rapport détaillé au format Excel (XLSX) ou PDF
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#777584] hover:text-[#0b1c30] hover:bg-white rounded-xl transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Format Selection */}
          <div>
            <label className="block text-xs font-bold text-[#0b1c30] uppercase tracking-wider mb-2">
              1. Format du fichier
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat('xlsx')}
                className={`p-3.5 rounded-xl border flex items-center gap-3 text-left transition-all cursor-pointer ${
                  format === 'xlsx'
                    ? 'border-[#006c4a] bg-[#ecfdf5] text-[#006c4a] ring-2 ring-[#006c4a]/20 font-bold'
                    : 'border-[#c8c4d5]/60 hover:bg-slate-50 text-[#464553]'
                }`}
              >
                <span className="material-symbols-outlined text-2xl text-[#006c4a]">table_chart</span>
                <div>
                  <div className="text-sm font-bold">Excel (.xlsx)</div>
                  <div className="text-[11px] opacity-80">Tableau structuré & cellules filtrables</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`p-3.5 rounded-xl border flex items-center gap-3 text-left transition-all cursor-pointer ${
                  format === 'pdf'
                    ? 'border-[#1f108e] bg-[#eff4ff] text-[#1f108e] ring-2 ring-[#1f108e]/20 font-bold'
                    : 'border-[#c8c4d5]/60 hover:bg-slate-50 text-[#464553]'
                }`}
              >
                <span className="material-symbols-outlined text-2xl text-[#1f108e]">picture_as_pdf</span>
                <div>
                  <div className="text-sm font-bold">Document PDF (.pdf)</div>
                  <div className="text-[11px] opacity-80">Mise en page officielle avec en-tête & logo</div>
                </div>
              </button>
            </div>
          </div>

          {/* Options & File Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0b1c30] mb-1">
                Nom du fichier généré
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="ex: Rapport_Tickets_Août_2026"
                className="w-full bg-[#eff4ff] border border-[#c8c4d5]/60 rounded-xl px-3 py-2 text-xs text-[#0b1c30] font-semibold outline-none focus:ring-2 focus:ring-[#1f108e]/30"
              />
            </div>

            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-[#0b1c30] mb-1">
                Options d'en-tête & rapport
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#0b1c30]">
                  <input
                    type="checkbox"
                    checked={includeHeader}
                    onChange={(e) => setIncludeHeader(e.target.checked)}
                    className="w-4 h-4 accent-[#1f108e] rounded"
                  />
                  <span>En-tête & Logo app</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#0b1c30]">
                  <input
                    type="checkbox"
                    checked={includeKpiSummary}
                    onChange={(e) => setIncludeKpiSummary(e.target.checked)}
                    className="w-4 h-4 accent-[#1f108e] rounded"
                  />
                  <span>Résumé KPI</span>
                </label>
              </div>
            </div>
          </div>

          {/* Data Filters */}
          <div className="bg-[#f8f9ff] p-4 rounded-xl border border-[#c8c4d5]/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0b1c30] uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-[#1f108e]">filter_alt</span>
                <span>Filtres des tickets à exporter</span>
              </span>
              <span className="text-[11px] font-bold text-[#1f108e] bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                {filteredTickets.length} / {tickets.length} tickets sélectionnés
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-[#777584] mb-1">Statut</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-white border border-[#c8c4d5]/60 rounded-lg px-2 py-1.5 text-xs font-semibold text-[#0b1c30] outline-none"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="pending">À valider</option>
                  <option value="in_progress">En cours</option>
                  <option value="completed">Terminés</option>
                  <option value="rejected">Rejetés</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#777584] mb-1">Priorité</label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="w-full bg-white border border-[#c8c4d5]/60 rounded-lg px-2 py-1.5 text-xs font-semibold text-[#0b1c30] outline-none"
                >
                  <option value="all">Toutes priorités</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">Élevée</option>
                  <option value="medium">Moyenne</option>
                  <option value="low">Basse</option>
                </select>
              </div>

              {isAdmin ? (
                <div>
                  <label className="block text-[11px] font-semibold text-[#777584] mb-1">Assignation</label>
                  <select
                    value={filterDev}
                    onChange={(e) => setFilterDev(e.target.value)}
                    className="w-full bg-white border border-[#c8c4d5]/60 rounded-lg px-2 py-1.5 text-xs font-semibold text-[#0b1c30] outline-none"
                  >
                    <option value="all">Tous les devs</option>
                    <option value="unassigned">Non assignés</option>
                    {developers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-[#777584] mb-1">Portée</label>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1.5 text-xs font-bold text-[#1f108e] truncate">
                    Mes tickets uniquement
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-[#777584] mb-1">Période</label>
                <select
                  value={filterDateRange}
                  onChange={(e) => setFilterDateRange(e.target.value as any)}
                  className="w-full bg-white border border-[#c8c4d5]/60 rounded-lg px-2 py-1.5 text-xs font-semibold text-[#0b1c30] outline-none"
                >
                  <option value="all">Toutes les dates</option>
                  <option value="7days">7 derniers jours</option>
                  <option value="30days">30 derniers jours</option>
                  <option value="this_month">Ce mois-ci</option>
                </select>
              </div>
            </div>
          </div>

          {/* Columns Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-[#0b1c30] uppercase tracking-wider">
                2. Colonnes à inclure dans le tableau
              </label>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleSelectAllColumns(true)}
                  className="text-[#1f108e] font-bold hover:underline"
                >
                  Tout cocher
                </button>
                <span className="text-[#c8c4d5]">•</span>
                <button
                  type="button"
                  onClick={() => handleSelectAllColumns(false)}
                  className="text-[#777584] hover:underline"
                >
                  Tout décocher
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 bg-slate-50 rounded-xl border border-[#c8c4d5]/50">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#0b1c30]">
                <input
                  type="checkbox"
                  checked={columns.id}
                  onChange={() => handleToggleColumn('id')}
                  className="w-4 h-4 accent-[#1f108e] rounded"
                />
                <span>ID Ticket</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#0b1c30]">
                <input
                  type="checkbox"
                  checked={columns.title}
                  onChange={() => handleToggleColumn('title')}
                  className="w-4 h-4 accent-[#1f108e] rounded"
                />
                <span>Titre</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#0b1c30]">
                <input
                  type="checkbox"
                  checked={columns.status}
                  onChange={() => handleToggleColumn('status')}
                  className="w-4 h-4 accent-[#1f108e] rounded"
                />
                <span>Statut</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#0b1c30]">
                <input
                  type="checkbox"
                  checked={columns.priority}
                  onChange={() => handleToggleColumn('priority')}
                  className="w-4 h-4 accent-[#1f108e] rounded"
                />
                <span>Priorité</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#0b1c30]">
                <input
                  type="checkbox"
                  checked={columns.requestedBy}
                  onChange={() => handleToggleColumn('requestedBy')}
                  className="w-4 h-4 accent-[#1f108e] rounded"
                />
                <span>Demandé par</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#0b1c30]">
                <input
                  type="checkbox"
                  checked={columns.assignedTo}
                  onChange={() => handleToggleColumn('assignedTo')}
                  className="w-4 h-4 accent-[#1f108e] rounded"
                />
                <span>Assigné à (Dev)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#0b1c30]">
                <input
                  type="checkbox"
                  checked={columns.platform}
                  onChange={() => handleToggleColumn('platform')}
                  className="w-4 h-4 accent-[#1f108e] rounded"
                />
                <span>Plateforme</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#0b1c30]">
                <input
                  type="checkbox"
                  checked={columns.createdDate}
                  onChange={() => handleToggleColumn('createdDate')}
                  className="w-4 h-4 accent-[#1f108e] rounded"
                />
                <span>Date de création</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#0b1c30]">
                <input
                  type="checkbox"
                  checked={columns.commentsCount}
                  onChange={() => handleToggleColumn('commentsCount')}
                  className="w-4 h-4 accent-[#1f108e] rounded"
                />
                <span>Nombre de commentaires</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#0b1c30]">
                <input
                  type="checkbox"
                  checked={columns.attachmentsCount}
                  onChange={() => handleToggleColumn('attachmentsCount')}
                  className="w-4 h-4 accent-[#1f108e] rounded"
                />
                <span>Nombre de pièces j.</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#0b1c30] col-span-2">
                <input
                  type="checkbox"
                  checked={columns.description}
                  onChange={() => handleToggleColumn('description')}
                  className="w-4 h-4 accent-[#1f108e] rounded"
                />
                <span>Description du ticket</span>
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-[#c8c4d5]/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-[#c8c4d5] text-[#464553] font-bold rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handleGenerateExport}
            disabled={isExporting || filteredTickets.length === 0}
            className={`px-6 py-2.5 text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer ${
              format === 'xlsx'
                ? 'bg-[#006c4a] hover:bg-[#005238]'
                : 'bg-[#1f108e] hover:bg-[#170b6e]'
            } ${isExporting || filteredTickets.length === 0 ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
          >
            <span className="material-symbols-outlined text-lg">
              {isExporting ? 'sync' : format === 'xlsx' ? 'table_chart' : 'picture_as_pdf'}
            </span>
            <span>
              {isExporting
                ? 'Génération en cours...'
                : `Générer le rapport (${format.toUpperCase()})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
