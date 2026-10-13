import React, { useState, useRef } from 'react';
import { Ticket, Developer, Status, Priority, Platform } from '../../types';
import {
  parseExcelFile,
  downloadExcelTemplate,
  transformRowsToTickets,
  ParsedTicketRow,
  ImportParseResult,
} from '../../utils/excelImportUtils';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  developers: Developer[];
  onImportTickets: (tickets: Ticket[], options: { generateNewIds: boolean }) => Promise<void>;
  currentUser?: { name: string; role: string; email?: string };
  onSuccessToast?: (msg: string) => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  developers,
  onImportTickets,
  currentUser,
  onSuccessToast,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parseResult, setParseResult] = useState<ImportParseResult | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [generateNewIds, setGenerateNewIds] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState<Status>('pending');
  const [defaultPlatform, setDefaultPlatform] = useState<Platform>('web');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOnlyValid, setFilterOnlyValid] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isAdmin =
    currentUser?.role?.toLowerCase().includes('admin') ||
    currentUser?.role?.toLowerCase().includes('architect') ||
    currentUser?.email === 'admin@ticketflow.io';

  if (!isOpen) return null;

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl border border-red-200">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-2xl">lock</span>
          </div>
          <h3 className="text-base font-bold text-[#0b1c30]">Accès Réservé aux Administrateurs</h3>
          <p className="text-xs text-[#464553]">
            L'importation de données depuis des classeurs Excel (.xlsx, .csv) est strictement réservée aux administrateurs.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-[#1f108e] text-white rounded-xl font-bold text-xs hover:bg-[#312e81] transition-all cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  const handleFileChange = async (selectedFile: File) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setIsParsing(true);

    try {
      const res = await parseExcelFile(selectedFile, developers);
      setParseResult(res);
      if (res.sheetNames && res.sheetNames.length > 0) {
        setSelectedSheet(res.currentSheet || res.sheetNames[0]);
      }
    } catch (err: any) {
      console.error('Erreur parsing fichier:', err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSheetChange = async (sheetName: string) => {
    if (!file) return;
    setSelectedSheet(sheetName);
    setIsParsing(true);
    try {
      const res = await parseExcelFile(file, developers, sheetName);
      setParseResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleToggleRowSelection = (index: number) => {
    if (!parseResult) return;
    const updatedRows = parseResult.rows.map((row) => {
      if (row.index === index) {
        return { ...row, selected: !row.selected };
      }
      return row;
    });

    setParseResult({
      ...parseResult,
      rows: updatedRows,
    });
  };

  const handleSelectAll = (select: boolean) => {
    if (!parseResult) return;
    const updatedRows = parseResult.rows.map((row) => ({
      ...row,
      selected: select,
    }));
    setParseResult({
      ...parseResult,
      rows: updatedRows,
    });
  };

  const handleReapplyDefaults = () => {
    if (!parseResult || !parseResult.rows) return;
    const rawList = parseResult.rows.map((r) => r.raw);
    const newRows = transformRowsToTickets(rawList, developers, {
      status: defaultStatus,
      platform: defaultPlatform,
      generateNewIds,
      defaultAuthor: currentUser?.name || 'Administrateur',
    });

    setParseResult({
      ...parseResult,
      rows: newRows,
      validCount: newRows.filter((r) => r.isValid).length,
    });
  };

  const selectedRows = parseResult?.rows.filter((r) => r.selected) || [];

  const filteredPreviewRows = (parseResult?.rows || []).filter((r) => {
    if (filterOnlyValid && !r.isValid) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const t = r.parsed;
    return (
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.id && t.id.toLowerCase().includes(q)) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.requestedBy && t.requestedBy.toLowerCase().includes(q)) ||
      (r.matchedDev?.name && r.matchedDev.name.toLowerCase().includes(q))
    );
  });

  const handleExecuteImport = async () => {
    if (selectedRows.length === 0) {
      if (onSuccessToast) onSuccessToast('Veuillez sélectionner au moins un ticket à importer.');
      return;
    }

    setIsImporting(true);

    try {
      const ticketsToImport: Ticket[] = selectedRows.map((r) => {
        const p = r.parsed;
        let finalId = p.id || `TF-${Math.floor(9000 + Math.random() * 999)}`;
        if (generateNewIds) {
          finalId = `TF-${Math.floor(8000 + Math.random() * 1999)}`;
        }

        return {
          id: finalId,
          title: p.title || 'Ticket importé sans titre',
          description: p.description || '',
          requestedBy: p.requestedBy || currentUser?.name || 'Utilisateur',
          requestedByAvatar:
            p.requestedByAvatar ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
          assignedTo: r.matchedDev || p.assignedTo,
          status: p.status || defaultStatus || 'pending',
          statusLabel:
            p.status === 'in_progress'
              ? 'EN COURS'
              : p.status === 'completed'
              ? 'TERMINÉ'
              : p.status === 'rejected'
              ? 'REJETÉ'
              : 'À VALIDER',
          priority: p.priority || 'medium',
          platform: p.platform || defaultPlatform || 'web',
          createdDate: p.createdDate || new Date().toLocaleDateString('fr-FR'),
          slaDeadline: p.slaDeadline,
          tags: Array.isArray(p.tags) && p.tags.length > 0 ? p.tags : ['EXCEL'],
          clarity: p.clarity || 'clair',
          closingNote: p.closingNote,
          comments: [],
          attachments: [],
          history: [
            {
              id: `h-import-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              title: 'Ticket importé via fichier Excel (.xlsx)',
              author: currentUser?.name || 'Administrateur',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              active: true,
            },
          ],
        };
      });

      await onImportTickets(ticketsToImport, { generateNewIds });

      if (onSuccessToast) {
        onSuccessToast(`${ticketsToImport.length} ticket(s) importé(s) avec succès depuis Excel !`);
      }

      onClose();
    } catch (err: any) {
      console.error('Erreur import tickets :', err);
      if (onSuccessToast) {
        onSuccessToast(`Erreur lors de l'importation : ${err.message || 'Une erreur est survenue.'}`);
      }
    } finally {
      setIsImporting(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setParseResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-[#c8c4d5]/80 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-[#ecfdf5] border-b border-emerald-200/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#006c4a] text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-2xl">table_chart</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#0b1c30]">Importation de Données Excel</h2>
                <span className="bg-[#006c4a] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  .XLSX / .XLS / .CSV
                </span>
              </div>
              <p className="text-[11px] text-[#464553]">
                Importez et synchronisez vos tickets en masse avec détection automatique des colonnes
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

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* STEP 1: Upload or Template */}
          {!parseResult || parseResult.rows.length === 0 ? (
            <div className="space-y-4">
              {/* Template Download Banner */}
              <div className="bg-[#f8f9ff] border border-[#c8c4d5]/70 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#eff4ff] text-[#1f108e] flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-xl">description</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-[#0b1c30]">
                      Besoin d'un modèle de fichier Excel type ?
                    </h3>
                    <p className="text-[11px] text-[#777584]">
                      Téléchargez notre modèle avec les colonnes et exemples pré-remplis (Titre, Description, Statut, Priorité, Dev...).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={downloadExcelTemplate}
                  className="px-3.5 py-2 bg-white hover:bg-[#eff4ff] text-[#1f108e] border border-[#1f108e]/30 rounded-xl font-bold text-xs flex items-center gap-1.5 flex-shrink-0 transition-all shadow-2xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base text-[#006c4a]">download</span>
                  <span>Télécharger le modèle Excel (.xlsx)</span>
                </button>
              </div>

              {/* Drag & Drop Upload Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const droppedFile = e.dataTransfer.files?.[0];
                  if (droppedFile) handleFileChange(droppedFile);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? 'border-[#006c4a] bg-emerald-50/70 scale-[1.01]'
                    : 'border-[#c8c4d5] hover:border-[#006c4a] hover:bg-[#f8f9ff]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileChange(f);
                  }}
                />

                <div className="w-14 h-14 rounded-2xl bg-emerald-100/70 text-[#006c4a] flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl">upload_file</span>
                </div>

                <div>
                  <p className="text-sm font-bold text-[#0b1c30]">
                    Cliquez ou glissez-déposez votre fichier Excel ici
                  </p>
                  <p className="text-xs text-[#777584] mt-1">
                    Prend en charge les classeurs <strong>.XLSX</strong>, <strong>.XLS</strong> et fichiers <strong>.CSV</strong>
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                  <span className="px-2.5 py-1 bg-white border border-[#c8c4d5]/60 rounded-lg text-[10px] font-semibold text-[#464553]">
                    ✓ Colonnes françaises ou anglaises
                  </span>
                  <span className="px-2.5 py-1 bg-white border border-[#c8c4d5]/60 rounded-lg text-[10px] font-semibold text-[#464553]">
                    ✓ Assignation développeurs auto
                  </span>
                  <span className="px-2.5 py-1 bg-white border border-[#c8c4d5]/60 rounded-lg text-[10px] font-semibold text-[#464553]">
                    ✓ Dates & tags automatiques
                  </span>
                </div>

                {isParsing && (
                  <div className="flex items-center gap-2 text-emerald-800 font-bold mt-2">
                    <span className="material-symbols-outlined animate-spin text-base">sync</span>
                    <span>Analyse et conversion du classeur Excel en cours...</span>
                  </div>
                )}
              </div>

              {parseResult?.error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-rose-600">error</span>
                  <span>{parseResult.error}</span>
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: Preview & Configuration Settings */
            <div className="space-y-4">
              {/* File details & Sheet selector */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-[#c8c4d5]/60 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-2xl text-[#006c4a]">table_chart</span>
                  <div>
                    <div className="font-bold text-[#0b1c30] text-xs flex items-center gap-2">
                      <span>{file?.name}</span>
                      <span className="text-[10px] font-normal text-[#777584]">
                        ({(file ? file.size / 1024 : 0).toFixed(1)} Ko)
                      </span>
                    </div>
                    <div className="text-[11px] text-[#777584]">
                      {parseResult.totalRows} ligne(s) détectée(s) • {selectedRows.length} sélectionnée(s) pour l'import
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Sheet switcher if multiple */}
                  {parseResult.sheetNames.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-[#777584]">Feuille :</span>
                      <select
                        value={selectedSheet}
                        onChange={(e) => handleSheetChange(e.target.value)}
                        className="bg-white border border-[#c8c4d5] rounded-lg px-2 py-1 text-xs font-bold text-[#0b1c30]"
                      >
                        {parseResult.sheetNames.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={resetUpload}
                    className="px-2.5 py-1 text-[#ba1a1a] hover:bg-red-50 border border-red-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    <span>Changer de fichier</span>
                  </button>
                </div>
              </div>

              {/* Configuration options */}
              <div className="bg-[#f8f9ff] border border-[#c8c4d5]/60 rounded-xl p-3.5 space-y-3">
                <div className="text-xs font-bold text-[#0b1c30] uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-[#1f108e]">tune</span>
                    <span>Options de mapping & insertion</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleReapplyDefaults}
                    className="text-[11px] font-bold text-[#1f108e] hover:underline"
                  >
                    Réappliquer les options
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#777584] mb-1">
                      Gestion des Identifiants (#ID)
                    </label>
                    <select
                      value={generateNewIds ? 'new' : 'preserve'}
                      onChange={(e) => setGenerateNewIds(e.target.value === 'new')}
                      className="w-full bg-white border border-[#c8c4d5]/70 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#0b1c30] outline-none"
                    >
                      <option value="preserve">Conserver les ID du fichier (ou générer si vide)</option>
                      <option value="new">Générer de nouveaux ID (#TF-8XXX)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#777584] mb-1">
                      Statut par défaut (si non spécifié)
                    </label>
                    <select
                      value={defaultStatus}
                      onChange={(e) => setDefaultStatus(e.target.value as Status)}
                      className="w-full bg-white border border-[#c8c4d5]/70 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#0b1c30] outline-none"
                    >
                      <option value="pending">À valider (Pending)</option>
                      <option value="in_progress">En cours (In Progress)</option>
                      <option value="completed">Terminé (Completed)</option>
                      <option value="approved">Validé</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#777584] mb-1">
                      Plateforme par défaut
                    </label>
                    <select
                      value={defaultPlatform}
                      onChange={(e) => setDefaultPlatform(e.target.value as Platform)}
                      className="w-full bg-white border border-[#c8c4d5]/70 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#0b1c30] outline-none"
                    >
                      <option value="web">Web Application</option>
                      <option value="mobile">Mobile (iOS / Android)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Table search & bulk controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAll(true)}
                    className="px-2.5 py-1 bg-white border border-[#c8c4d5]/70 hover:bg-slate-50 text-[#0b1c30] rounded-lg text-xs font-bold transition-all"
                  >
                    Tout cocher ({parseResult.rows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(false)}
                    className="px-2.5 py-1 bg-white border border-[#c8c4d5]/70 hover:bg-slate-50 text-[#777584] rounded-lg text-xs font-semibold transition-all"
                  >
                    Tout décocher
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-60">
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-[#777584]">
                      search
                    </span>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Filtrer l'aperçu..."
                      className="w-full bg-white border border-[#c8c4d5]/70 rounded-lg pl-8 pr-3 py-1 text-xs text-[#0b1c30] outline-none focus:ring-1 focus:ring-[#1f108e]"
                    />
                  </div>

                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#464553] cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={filterOnlyValid}
                      onChange={(e) => setFilterOnlyValid(e.target.checked)}
                      className="accent-[#006c4a] rounded"
                    />
                    <span>Valides uniquement</span>
                  </label>
                </div>
              </div>

              {/* Live Parsed Tickets Preview Table */}
              <div className="border border-[#c8c4d5]/70 rounded-xl overflow-hidden shadow-2xs">
                <div className="max-h-[360px] overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-[#eff4ff] sticky top-0 z-10 text-[#0b1c30] border-b border-[#c8c4d5]/70">
                      <tr>
                        <th className="p-2.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={selectedRows.length === parseResult.rows.length && parseResult.rows.length > 0}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="w-4 h-4 accent-[#006c4a] rounded cursor-pointer"
                          />
                        </th>
                        <th className="p-2.5 font-bold">ID</th>
                        <th className="p-2.5 font-bold">Titre & Description</th>
                        <th className="p-2.5 font-bold">Statut</th>
                        <th className="p-2.5 font-bold">Priorité</th>
                        <th className="p-2.5 font-bold">Demandeur</th>
                        <th className="p-2.5 font-bold">Assigné à</th>
                        <th className="p-2.5 font-bold">Plat.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredPreviewRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-[#777584]">
                            Aucun ticket ne correspond à la recherche.
                          </td>
                        </tr>
                      ) : (
                        filteredPreviewRows.map((r) => {
                          const t = r.parsed;
                          return (
                            <tr
                              key={r.index}
                              onClick={() => handleToggleRowSelection(r.index)}
                              className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                                !r.selected ? 'opacity-40 bg-slate-50/50' : ''
                              }`}
                            >
                              <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={r.selected}
                                  onChange={() => handleToggleRowSelection(r.index)}
                                  className="w-4 h-4 accent-[#006c4a] rounded cursor-pointer"
                                />
                              </td>

                              <td className="p-2.5 font-mono font-bold text-[#1f108e] whitespace-nowrap">
                                {t.id}
                              </td>

                              <td className="p-2.5 max-w-[240px]">
                                <div className="font-bold text-[#0b1c30] truncate">{t.title}</div>
                                {t.description && (
                                  <div className="text-[10px] text-[#777584] truncate">{t.description}</div>
                                )}
                                {r.warnings.length > 0 && (
                                  <div className="text-[9px] text-amber-700 font-semibold flex items-center gap-1 mt-0.5">
                                    <span className="material-symbols-outlined text-[11px]">warning</span>
                                    <span>{r.warnings[0]}</span>
                                  </div>
                                )}
                              </td>

                              <td className="p-2.5 whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    t.status === 'completed'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : t.status === 'in_progress'
                                      ? 'bg-blue-100 text-blue-800'
                                      : t.status === 'rejected'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {t.statusLabel || t.status}
                                </span>
                              </td>

                              <td className="p-2.5 whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    t.priority === 'urgent'
                                      ? 'bg-rose-100 text-rose-800'
                                      : t.priority === 'high'
                                      ? 'bg-orange-100 text-orange-800'
                                      : t.priority === 'medium'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {t.priority?.toUpperCase()}
                                </span>
                              </td>

                              <td className="p-2.5 text-[#464553] whitespace-nowrap">{t.requestedBy}</td>

                              <td className="p-2.5 whitespace-nowrap">
                                {r.matchedDev ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                    <span className="material-symbols-outlined text-xs">check_circle</span>
                                    <span>{r.matchedDev.name}</span>
                                  </span>
                                ) : (
                                  <span className="text-[#777584] italic">Non assigné</span>
                                )}
                              </td>

                              <td className="p-2.5 whitespace-nowrap font-bold uppercase text-[10px] text-[#464553]">
                                {t.platform || 'web'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-[#c8c4d5]/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-[#c8c4d5] text-[#464553] font-bold rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
          >
            Fermer
          </button>

          {parseResult && parseResult.rows.length > 0 && (
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={isImporting || selectedRows.length === 0}
              className="px-6 py-2.5 bg-[#006c4a] hover:bg-[#005238] active:scale-95 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <span className={`material-symbols-outlined text-lg ${isImporting ? 'animate-spin' : ''}`}>
                {isImporting ? 'sync' : 'upload'}
              </span>
              <span>
                {isImporting
                  ? 'Importation en cours...'
                  : `Importer ${selectedRows.length} ticket${selectedRows.length > 1 ? 's' : ''} dans l'application`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
