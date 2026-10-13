import React, { useState, useMemo } from 'react';
import { Ticket, Developer, Project } from '../../types';
import { EditTicketModal } from '../Tickets/EditTicketModal';

interface AdminDashboardProps {
  tickets: Ticket[];
  developers: Developer[];
  projects?: Project[];
  onSelectTicket: (ticketId: string) => void;
  onInspectTicket?: (ticketId: string, mode?: 'inspect' | 'compare') => void;
  isInspectionOpen?: boolean;
  onValidateTicket: (ticketId: string, devId?: string) => void;
  onRejectTicket: (ticketId: string) => void;
  onDeleteTicket?: (ticketId: string) => void;
  onNavigateCreate: () => void;
  onOpenExportModal?: () => void;
  onOpenImportModal?: () => void;
  onEditTicket?: (updatedTicket: Ticket) => void;
  onAssignProject?: (ticketId: string, projectId: string) => void;
  currentUser?: { name: string; role: string; avatar: string; email?: string; id?: string };
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  tickets,
  developers,
  projects = [],
  onSelectTicket,
  onInspectTicket,
  isInspectionOpen,
  onValidateTicket,
  onRejectTicket,
  onDeleteTicket,
  onNavigateCreate,
  onOpenExportModal,
  onOpenImportModal,
  onEditTicket,
  onAssignProject,
  currentUser,
}) => {
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [selectedDevMap, setSelectedDevMap] = useState<Record<string, string>>({});
  const [selectedProjectMap, setSelectedProjectMap] = useState<Record<string, string>>({});
  const [tableFilter, setTableFilter] = useState<'all' | 'clarifier' | 'pending' | 'in_progress' | 'completed'>('all');
  const [developerFilter, setDeveloperFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin =
    currentUser?.role?.toLowerCase().includes('admin') ||
    currentUser?.role?.toLowerCase().includes('architect') ||
    currentUser?.email === 'admin@ticketflow.io';

  // Queue tickets (Pending validation) - All pending tickets waiting for review
  const queueTickets = tickets.filter((t) => t.status === 'pending');
  const clarifierCount = tickets.filter((t) => t.clarity === 'clarifier').length;

  // Display tickets based on role: Admins see all, Developers see assigned or proposed
  const displayTickets = useMemo(() => {
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

  // Filtered tickets for global overview table
  const filteredTickets = displayTickets.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.requestedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.projectName && t.projectName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.projectCode && t.projectCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.assignedTo?.name && t.assignedTo.name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (tableFilter === 'clarifier' && t.clarity !== 'clarifier') return false;
    if (tableFilter === 'pending' && t.status !== 'pending') return false;
    if (tableFilter === 'in_progress' && t.status !== 'in_progress') return false;
    if (tableFilter === 'completed' && t.status !== 'completed') return false;

    // Filter by Developer
    if (developerFilter !== 'all') {
      if (developerFilter === 'unassigned') {
        if (t.assignedTo && (t.assignedTo.id || t.assignedTo.name)) {
          return false;
        }
      } else {
        const matchDev =
          t.assignedTo &&
          (t.assignedTo.id === developerFilter ||
            t.assignedTo.name?.toLowerCase().trim() === developerFilter.toLowerCase().trim() ||
            (t.assignedTo.email && t.assignedTo.email.toLowerCase().trim() === developerFilter.toLowerCase().trim()));
        if (!matchDev) return false;
      }
    }

    // Filter by Project
    if (projectFilter !== 'all') {
      if (projectFilter === 'none') {
        if (t.projectId || t.projectName) return false;
      } else {
        if (t.projectId !== projectFilter && t.projectName !== projectFilter) return false;
      }
    }

    return true;
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#ba1a1a]" />
            <span className="text-[11px] font-bold text-[#ba1a1a] uppercase">URGENT</span>
          </div>
        );
      case 'high':
        return (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[11px] font-bold text-amber-600 uppercase">HIGH</span>
          </div>
        );
      case 'medium':
        return (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#1f108e]" />
            <span className="text-[11px] font-bold text-[#1f108e] uppercase">MEDIUM</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span className="text-[11px] font-bold text-slate-500 uppercase">LOW</span>
          </div>
        );
    }
  };

  const getStatusPill = (status: string, label?: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
            {label || 'À valider'}
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wider">
            {label || 'À faire'}
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
            {label || 'Terminé'}
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-red-100 text-red-800 uppercase tracking-wider">
            {label || 'Rejeté'}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider">
            {label || status}
          </span>
        );
    }
  };

  return (
    <div className="pt-20 pb-12 px-3 sm:px-6 lg:px-8 max-w-[1800px] mx-auto space-y-6 w-full">
      {/* Page Title & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#0b1c30] tracking-tight">
            Dashboard Opérationnel
          </h1>
          <p className="text-sm text-[#464553] mt-1">
            Vue d'ensemble de la file d'attente et du traitement des tickets.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onOpenExportModal && (
            <button
              onClick={onOpenExportModal}
              className="flex items-center justify-center gap-2 bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-800 active:scale-95 transition-all shadow-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              <span>Exporter (XLSX / PDF)</span>
            </button>
          )}

          {onInspectTicket && (
            <button
              onClick={() => onInspectTicket(tickets[0]?.id || '')}
              className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm active:scale-95 transition-all shadow-md cursor-pointer border ${
                isInspectionOpen
                  ? 'bg-[#1f108e] text-white border-[#1f108e]'
                  : 'bg-[#eff4ff] hover:bg-[#1f108e] text-[#1f108e] hover:text-white border-[#1f108e]/30'
              }`}
              title="Ouvrir le volet rétractable d'inspection et comparaison ancré à droite"
            >
              <span className="material-symbols-outlined text-lg">dock_to_right</span>
              <span>Volet d'inspection</span>
            </button>
          )}

          <button
            onClick={onNavigateCreate}
            className="flex items-center justify-center gap-2 bg-[#1f108e] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-md shadow-[#1f108e]/20 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            <span>Proposer un Ticket</span>
          </button>
        </div>
      </div>

      {/* Summary Bento Cards Grid (Caché pour les développeurs / Visible Admin uniquement) */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Total Tickets */}
          <div className="bento-card p-4 rounded-2xl flex flex-col justify-between h-36">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-[#464553]">Total Tickets</span>
              <span className="material-symbols-outlined text-[#1f108e]">analytics</span>
            </div>
            <div>
              <span className="text-3xl font-extrabold text-[#0b1c30] tracking-tight">
                {tickets.length}
              </span>
              <p className="text-xs text-[#006c4a] font-medium flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-sm">trending_up</span> {tickets.length > 0 ? `${tickets.length} ticket${tickets.length > 1 ? 's' : ''}` : 'Aucun ticket'}
              </p>
            </div>
          </div>

          {/* Card 2: À Clarifier */}
          <button
            type="button"
            onClick={() => setTableFilter('clarifier')}
            className={`bento-card p-4 rounded-2xl border-l-4 border-l-amber-500 flex flex-col justify-between h-36 text-left transition-all hover:scale-102 cursor-pointer ${
              tableFilter === 'clarifier' ? 'ring-2 ring-amber-500 bg-amber-50/50' : ''
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-amber-900">À Clarifier</span>
              <span className="material-symbols-outlined text-amber-600">help</span>
            </div>
            <div>
              <span className="text-3xl font-extrabold text-amber-950 tracking-tight">
                {clarifierCount}
              </span>
              <p className="text-xs text-amber-800 font-semibold mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">warning</span>
                <span>Demandé par dev</span>
              </p>
            </div>
          </button>

          {/* Card 3: Pending Validation */}
          <div className="bento-card p-4 rounded-2xl border-l-4 border-l-purple-400 flex flex-col justify-between h-36">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-[#464553]">Pending Validation</span>
              <span className="material-symbols-outlined text-purple-500">pending_actions</span>
            </div>
            <div>
              <span className="text-3xl font-extrabold text-[#0b1c30] tracking-tight">
                {queueTickets.length}
              </span>
              <p className="text-xs text-purple-700 font-semibold mt-1">
                {queueTickets.filter((t) => t.priority === 'urgent' || t.priority === 'high').length} Priorité haute
              </p>
            </div>
          </div>

          {/* Card 4: In Progress */}
          <div className="bento-card p-4 rounded-2xl border-l-4 border-l-[#1f108e] flex flex-col justify-between h-36">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-[#464553]">In Progress</span>
              <span className="material-symbols-outlined text-[#1f108e]">engineering</span>
            </div>
            <div>
              <span className="text-3xl font-extrabold text-[#0b1c30] tracking-tight">
                {tickets.filter((t) => t.status === 'in_progress').length}
              </span>
              <p className="text-xs text-[#464553] font-medium mt-1">
                {developers.length} Développeur{developers.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Card 5: Completed */}
          <div className="bento-card p-4 rounded-2xl border-l-4 border-l-emerald-400 flex flex-col justify-between h-36">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-[#464553]">Terminés</span>
              <span className="material-symbols-outlined text-emerald-500">check_circle</span>
            </div>
            <div>
              <span className="text-3xl font-extrabold text-[#0b1c30] tracking-tight">
                {tickets.filter((t) => t.status === 'completed').length}
              </span>
              <p className="text-xs text-[#006c4a] font-medium mt-1">
                {tickets.length > 0
                  ? `${Math.round((tickets.filter((t) => t.status === 'completed').length / tickets.length) * 100)}% d'achèvement`
                  : "0% d'achèvement"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Queue Section (File d'attente) - Admin Only: Horizontal section above table */}
      {isAdmin && (
        <div className="space-y-3 w-full">
          {queueTickets.length === 0 ? (
            <div className="bento-card p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#c8c4d5]/60 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                  <span className="material-symbols-outlined text-lg">verified</span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#0b1c30] flex items-center gap-2">
                    <span>File d'attente</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      0 en attente
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#777584]">Tous les tickets soumis ont été validés et assignés.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#0b1c30] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#1f108e]">sweep</span>
                  <span>File d'attente</span>
                </h2>
                <span className="bg-amber-100 text-amber-800 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                  À VALIDER ({queueTickets.length})
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {queueTickets.map((ticket) => {
                  const matchingDev = developers.find(
                    (dev) =>
                      dev.name.toLowerCase().trim() === ticket.requestedBy.toLowerCase().trim() ||
                      (dev.email && dev.email.toLowerCase().trim() === ticket.requestedBy.toLowerCase().trim())
                  );

                  const proposedByDev = !!matchingDev;
                  const currentSelectedDev =
                    selectedDevMap[ticket.id] !== undefined
                      ? selectedDevMap[ticket.id]
                      : ticket.assignedTo
                      ? ticket.assignedTo.id
                      : '';

                  return (
                    <div key={ticket.id} className="bento-card p-5 rounded-2xl space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            onClick={() => onSelectTicket(ticket.id)}
                            className="font-geist text-xs font-bold text-[#777584] hover:text-[#1f108e] cursor-pointer"
                          >
                            #{ticket.id}
                          </span>
                          {ticket.projectName && (
                            <span
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-2xs flex items-center gap-1"
                              style={{ backgroundColor: ticket.projectColor || '#1f108e' }}
                            >
                              <span className="material-symbols-outlined text-xs">folder</span>
                              <span>{ticket.projectCode ? `[${ticket.projectCode}] ` : ''}{ticket.projectName}</span>
                            </span>
                          )}
                        </div>
                        {getPriorityBadge(ticket.priority)}
                      </div>

                      <h3
                        onClick={() => onSelectTicket(ticket.id)}
                        className="font-bold text-base text-[#0b1c30] hover:text-[#1f108e] cursor-pointer leading-snug"
                      >
                        {ticket.title}
                      </h3>

                      <p className="text-xs text-[#464553] flex items-center justify-between">
                        <span>Requested by <strong className="font-semibold text-[#0b1c30]">{ticket.requestedBy}</strong> • {ticket.createdDate}</span>
                        {proposedByDev && (
                          <span className="bg-purple-100 text-[#1f108e] text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200">
                            Proposé par dev
                          </span>
                        )}
                      </p>

                      {/* Assignee, Project & Action Buttons */}
                      <div className="space-y-3 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-[#777584] uppercase block mb-1">
                              Assigner au Projet
                            </label>
                            <select
                              value={selectedProjectMap[ticket.id] !== undefined ? selectedProjectMap[ticket.id] : (ticket.projectId || '')}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSelectedProjectMap((prev) => ({ ...prev, [ticket.id]: val }));
                                if (onAssignProject) {
                                  onAssignProject(ticket.id, val);
                                }
                              }}
                              className="w-full bg-[#eff4ff] border border-[#c8c4d5]/60 rounded-lg px-2.5 py-1.5 text-xs text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/30 outline-none font-semibold truncate"
                            >
                              <option value="">Sans projet</option>
                              {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.code ? `[${p.code}] ` : ''}{p.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-[#777584] uppercase block mb-1">
                              Assigner au Développeur
                            </label>
                            <select
                              value={currentSelectedDev}
                              onChange={(e) =>
                                setSelectedDevMap((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                              }
                              className="w-full bg-[#eff4ff] border border-[#c8c4d5]/60 rounded-lg px-2.5 py-1.5 text-xs text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/30 outline-none font-semibold truncate"
                            >
                              <option value="">Sélectionner...</option>
                              {developers.map((dev) => (
                                <option key={dev.id} value={dev.id}>
                                  {dev.name} ({dev.role})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {onInspectTicket && (
                            <button
                              type="button"
                              onClick={() => onInspectTicket(ticket.id, 'inspect')}
                              className="px-2.5 py-2 border border-[#1f108e]/30 bg-[#eff4ff] text-[#1f108e] hover:bg-[#1f108e] hover:text-white rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                              title="Inspecter dans le volet rétractable d'inspection"
                            >
                              <span className="material-symbols-outlined text-sm">dock_to_right</span>
                              <span>Inspecter</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditingTicket(ticket)}
                            className="px-3 py-2 border border-amber-300 bg-amber-50 text-amber-900 rounded-lg font-semibold text-xs hover:bg-amber-100 transition-all flex items-center justify-center gap-1 cursor-pointer"
                            title="Modifier ce ticket"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                            <span>Modifier</span>
                          </button>
                          <button
                            onClick={() => {
                              const projIdToUse = selectedProjectMap[ticket.id] !== undefined ? selectedProjectMap[ticket.id] : (ticket.projectId || '');
                              if (projIdToUse && onAssignProject && projIdToUse !== ticket.projectId) {
                                onAssignProject(ticket.id, projIdToUse);
                              }
                              onValidateTicket(ticket.id, currentSelectedDev);
                            }}
                            className="flex-1 bg-[#1f108e] text-white py-2 rounded-lg font-semibold text-xs hover:opacity-90 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">verified</span>
                            <span>Valider & Assigner</span>
                          </button>
                          <button
                            onClick={() => onRejectTicket(ticket.id)}
                            className="px-3 py-2 border border-[#c8c4d5] text-[#464553] rounded-lg font-semibold text-xs hover:bg-[#eff4ff] active:scale-95 transition-all cursor-pointer"
                          >
                            Rejeter
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
        </div>
      )}

      {/* Global Overview Table Section - Full Page Width */}
      <div className="space-y-4 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[#0b1c30] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#1f108e]">list_alt</span>
              <span>Overview Global</span>
            </h2>

            {/* Filters & Export */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filtrer la table..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white border border-[#c8c4d5]/60 rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/20 outline-none"
                />
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#777584]">
                  search
                </span>
              </div>

              <div className="flex bg-[#e5eeff] p-0.5 rounded-lg text-xs">
                <button
                  onClick={() => setTableFilter('all')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    tableFilter === 'all' ? 'bg-white text-[#1f108e] shadow-xs' : 'text-[#464553]'
                  }`}
                >
                  Tous
                </button>
                <button
                  onClick={() => setTableFilter('clarifier')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
                    tableFilter === 'clarifier' ? 'bg-amber-500 text-white shadow-xs font-bold' : 'text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">help</span>
                  <span>À clarifier ({clarifierCount})</span>
                </button>
                <button
                  onClick={() => setTableFilter('pending')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    tableFilter === 'pending' ? 'bg-white text-[#1f108e] shadow-xs' : 'text-[#464553]'
                  }`}
                >
                  À valider
                </button>
                <button
                  onClick={() => setTableFilter('in_progress')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    tableFilter === 'in_progress' ? 'bg-white text-[#1f108e] shadow-xs' : 'text-[#464553]'
                  }`}
                >
                  En cours
                </button>
                <button
                  onClick={() => setTableFilter('completed')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    tableFilter === 'completed' ? 'bg-white text-[#1f108e] shadow-xs' : 'text-[#464553]'
                  }`}
                >
                  Terminés
                </button>
              </div>

              {/* Filtre par Projet */}
              {projects && projects.length > 0 && (
                <div className="flex items-center gap-1.5 bg-white border border-[#c8c4d5]/60 rounded-lg px-2.5 py-1 text-xs">
                  <span className="material-symbols-outlined text-sm text-[#1f108e]">folder</span>
                  <select
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                    className="bg-transparent text-xs text-[#0b1c30] font-semibold outline-none cursor-pointer max-w-[130px] truncate"
                    title="Filtrer par projet"
                  >
                    <option value="all">Tous les projets</option>
                    <option value="none">Sans projet</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code ? `[${p.code}] ` : ''}{p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Filtre par Développeur */}
              <div className="flex items-center gap-1.5 bg-white border border-[#c8c4d5]/60 rounded-lg px-2.5 py-1 text-xs">
                <span className="material-symbols-outlined text-sm text-[#1f108e]">engineering</span>
                <select
                  value={developerFilter}
                  onChange={(e) => setDeveloperFilter(e.target.value)}
                  className="bg-transparent text-xs text-[#0b1c30] font-semibold outline-none cursor-pointer"
                  title="Filtrer par développeur"
                >
                  <option value="all">Tous les développeurs</option>
                  <option value="unassigned">Non assigné</option>
                  {developers.map((dev) => (
                    <option key={dev.id || dev.name} value={dev.id || dev.name}>
                      {dev.name} {dev.role ? `(${dev.role})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset filter button */}
              {(searchTerm || tableFilter !== 'all' || developerFilter !== 'all' || projectFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setTableFilter('all');
                    setDeveloperFilter('all');
                    setProjectFilter('all');
                  }}
                  className="px-2 py-1 text-[11px] font-bold text-[#ba1a1a] hover:bg-rose-50 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  title="Réinitialiser tous les filtres"
                >
                  <span className="material-symbols-outlined text-xs">restart_alt</span>
                  <span className="hidden sm:inline">Réinitialiser</span>
                </button>
              )}

              {/* Import Excel Button (Admin Only) */}
              {isAdmin && onOpenImportModal && (
                <button
                  type="button"
                  onClick={onOpenImportModal}
                  className="px-2.5 py-1.5 bg-emerald-50 text-[#006c4a] border border-emerald-300 rounded-lg font-bold text-xs flex items-center gap-1 hover:bg-emerald-100 transition-colors cursor-pointer"
                  title="Importer des tickets depuis Excel"
                >
                  <span className="material-symbols-outlined text-sm">upload_file</span>
                  <span className="hidden sm:inline">Importer Excel</span>
                </button>
              )}

              {onOpenExportModal && (
                <button
                  type="button"
                  onClick={onOpenExportModal}
                  className="px-2.5 py-1.5 bg-[#d3e4fe] text-[#1f108e] rounded-lg font-bold text-xs flex items-center gap-1 hover:bg-[#dce9ff] transition-colors cursor-pointer"
                  title="Exporter XLSX / PDF"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  <span>Exporter</span>
                </button>
              )}
            </div>
          </div>

          {/* Table / Mobile Cards Container */}
          <div className="bento-card rounded-2xl overflow-hidden shadow-xs">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto w-full">
              <table className="w-full text-left border-collapse table-auto">
                <thead>
                  <tr className="bg-[#eff4ff] border-b border-[#c8c4d5]/50">
                    <th className="p-3.5 font-geist text-[11px] font-bold text-[#777584] uppercase tracking-wider whitespace-nowrap w-24">
                      Ticket ID
                    </th>
                    <th className="p-3.5 font-geist text-[11px] font-bold text-[#777584] uppercase tracking-wider min-w-[220px]">
                      Titre & Demandeur
                    </th>
                    <th className="p-3.5 font-geist text-[11px] font-bold text-[#777584] uppercase tracking-wider whitespace-nowrap min-w-[140px]">
                      Projet
                    </th>
                    <th className="p-3.5 font-geist text-[11px] font-bold text-[#777584] uppercase tracking-wider whitespace-nowrap min-w-[150px]">
                      Assigné à
                    </th>
                    <th className="p-3.5 font-geist text-[11px] font-bold text-[#777584] uppercase tracking-wider whitespace-nowrap">
                      Type
                    </th>
                    <th className="p-3.5 font-geist text-[11px] font-bold text-[#777584] uppercase tracking-wider whitespace-nowrap">
                      Priorité
                    </th>
                    <th className="p-3.5 font-geist text-[11px] font-bold text-[#777584] uppercase tracking-wider whitespace-nowrap">
                      Statut
                    </th>
                    <th className="p-3.5 font-geist text-[11px] font-bold text-[#777584] uppercase tracking-wider text-right whitespace-nowrap">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c8c4d5]/30">
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-xs text-[#464553]">
                        Aucun ticket ne correspond aux critères de recherche et filtres sélectionnés.
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((t) => (
                      <tr
                        key={t.id}
                        className="hover:bg-[#eff4ff]/60 transition-colors group cursor-pointer"
                        onClick={() => {
                          if (isInspectionOpen && onInspectTicket) {
                            onInspectTicket(t.id, 'inspect');
                          } else {
                            onSelectTicket(t.id);
                          }
                        }}
                      >
                        <td className="p-3.5 font-geist text-xs text-[#1f108e] font-bold">
                          #{t.id}
                        </td>
                        <td className="p-3.5">
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-[#0b1c30] group-hover:text-[#1f108e] line-clamp-1">
                              {t.title}
                            </p>
                            <p className="text-[11px] text-[#777584]">
                              Par <strong className="text-[#0b1c30]">{t.requestedBy}</strong> • {t.createdDate}
                            </p>
                          </div>
                        </td>
                        <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                          {isAdmin && projects.length > 0 ? (
                            <select
                              value={t.projectId || ''}
                              onChange={(e) => {
                                if (onAssignProject) {
                                  onAssignProject(t.id, e.target.value);
                                }
                              }}
                              className="text-xs font-semibold rounded-lg px-2.5 py-1 outline-none cursor-pointer border transition-colors shadow-2xs max-w-[150px] truncate"
                              style={{
                                backgroundColor: t.projectColor ? `${t.projectColor}15` : '#f8f9ff',
                                color: t.projectColor || '#1f108e',
                                borderColor: t.projectColor ? `${t.projectColor}50` : '#c8c4d5',
                              }}
                              title="Assigner le ticket à un projet"
                            >
                              <option value="" className="text-[#0b1c30] bg-white">Sans projet</option>
                              {projects.map((p) => (
                                <option key={p.id} value={p.id} className="text-[#0b1c30] bg-white">
                                  {p.code ? `[${p.code}] ` : ''}{p.name}
                                </option>
                              ))}
                            </select>
                          ) : t.projectName ? (
                            <span
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-2xs inline-flex items-center gap-1"
                              style={{ backgroundColor: t.projectColor || '#1f108e' }}
                              title={`Projet : ${t.projectName}`}
                            >
                              <span className="material-symbols-outlined text-xs">folder</span>
                              <span className="truncate max-w-[110px]">{t.projectCode ? `[${t.projectCode}] ` : ''}{t.projectName}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#777584] italic bg-slate-100 px-2 py-0.5 rounded">
                              Aucun
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          {t.assignedTo ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-[#eff4ff] border border-[#c8c4d5]/50 flex items-center justify-center text-[9px] font-bold text-[#1f108e] overflow-hidden shrink-0">
                                {t.assignedTo.avatar ? (
                                  <img src={t.assignedTo.avatar} alt={t.assignedTo.name} className="w-full h-full object-cover" />
                                ) : (
                                  t.assignedTo.name?.substring(0, 2).toUpperCase() || 'DEV'
                                )}
                              </div>
                              <span className="text-xs font-semibold text-[#0b1c30] truncate max-w-[120px]">
                                {t.assignedTo.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#777584] italic bg-slate-100 px-2 py-0.5 rounded font-medium">
                              Non assigné
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-xs text-[#0b1c30] capitalize whitespace-nowrap">
                          {t.platform}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">{getPriorityBadge(t.priority)}</td>
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1 items-center">
                            {getStatusPill(t.status, t.statusLabel)}
                            {t.clarity === 'clarifier' && (
                              <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                À CLARIFIER
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                            {onInspectTicket && (
                              <button
                                type="button"
                                onClick={() => onInspectTicket(t.id, 'inspect')}
                                className="px-2.5 py-1 text-xs font-bold text-[#1f108e] bg-[#eff4ff] hover:bg-[#1f108e] hover:text-white border border-[#1f108e]/30 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                title="Prévisualiser ce ticket dans le volet d'inspection sans quitter la vue d'ensemble"
                              >
                                <span className="material-symbols-outlined text-xs">dock_to_right</span>
                                <span>Inspecter</span>
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setEditingTicket(t)}
                                className="px-2.5 py-1 text-xs font-bold text-[#1f108e] bg-[#eff4ff] hover:bg-[#1f108e] hover:text-white border border-[#1f108e]/30 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                title="Gérer ce ticket (Assignation projet, développeur, statut, SLA...)"
                              >
                                <span className="material-symbols-outlined text-xs">admin_panel_settings</span>
                                <span>Gérer</span>
                              </button>
                            )}
                            <button
                              onClick={() => onSelectTicket(t.id)}
                              className="px-2.5 py-1 text-xs font-bold text-[#1f108e] hover:bg-[#eff4ff] rounded-lg transition-colors cursor-pointer"
                            >
                              Ouvrir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Card List (Replaces wide table on phone screens) */}
            <div className="md:hidden divide-y divide-[#c8c4d5]/30">
              {filteredTickets.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#464553]">
                  Aucun ticket correspondant aux filtres.
                </div>
              ) : (
                filteredTickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      if (isInspectionOpen && onInspectTicket) {
                        onInspectTicket(t.id, 'inspect');
                      } else {
                        onSelectTicket(t.id);
                      }
                    }}
                    className="p-3.5 hover:bg-[#eff4ff]/40 transition-colors space-y-2 cursor-pointer touch-manipulation"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-geist text-xs font-bold text-[#1f108e]">
                          #{t.id}
                        </span>
                        {t.projectName && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-2xs flex items-center gap-0.5"
                            style={{ backgroundColor: t.projectColor || '#1f108e' }}
                          >
                            <span className="material-symbols-outlined text-[10px]">folder</span>
                            <span>{t.projectCode ? `[${t.projectCode}] ` : ''}{t.projectName}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {getStatusPill(t.status, t.statusLabel)}
                        {getPriorityBadge(t.priority)}
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-[#0b1c30] line-clamp-2">
                      {t.title}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-[#777584]">
                      <span>Par <strong className="text-[#0b1c30]">{t.requestedBy}</strong></span>
                      {t.assignedTo ? (
                        <span className="flex items-center gap-1 text-[#1f108e] font-semibold">
                          <span className="material-symbols-outlined text-xs">engineering</span>
                          {t.assignedTo.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Non assigné</span>
                      )}
                    </div>

                    {isAdmin && projects.length > 0 && (
                      <div onClick={(e) => e.stopPropagation()} className="pt-1 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-[#777584] uppercase">Projet :</span>
                        <select
                          value={t.projectId || ''}
                          onChange={(e) => {
                            if (onAssignProject) {
                              onAssignProject(t.id, e.target.value);
                            }
                          }}
                          className="text-xs font-semibold rounded-lg px-2 py-1 outline-none border transition-colors shadow-2xs max-w-[180px] truncate"
                          style={{
                            backgroundColor: t.projectColor ? `${t.projectColor}15` : '#f8f9ff',
                            color: t.projectColor || '#1f108e',
                            borderColor: t.projectColor ? `${t.projectColor}50` : '#c8c4d5',
                          }}
                        >
                          <option value="" className="text-[#0b1c30] bg-white">Sans projet</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id} className="text-[#0b1c30] bg-white">
                              {p.code ? `[${p.code}] ` : ''}{p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-[#777584] pt-1">
                      <span className="font-geist">{t.createdDate}</span>
                      <div className="flex items-center gap-1.5">
                        {onInspectTicket && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onInspectTicket(t.id, 'inspect');
                            }}
                            className="px-2 py-0.5 bg-[#eff4ff] text-[#1f108e] border border-[#1f108e]/30 rounded-md font-bold text-[10px] flex items-center gap-0.5"
                          >
                            <span className="material-symbols-outlined text-[10px]">dock_to_right</span>
                            Inspecter
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTicket(t);
                            }}
                            className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 rounded-md font-bold text-[10px]"
                            title="Modifier ce ticket"
                          >
                            Modifier
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination / Summary Footer */}
            <div className="bg-[#eff4ff] p-3 px-4 border-t border-[#c8c4d5]/40 flex items-center justify-between text-xs text-[#464553]">
              <span>{filteredTickets.length} ticket{filteredTickets.length > 1 ? 's' : ''} affiché{filteredTickets.length > 1 ? 's' : ''}</span>
              <button
                onClick={() => onSelectTicket(filteredTickets[0]?.id || '')}
                className="text-[11px] font-bold text-[#1f108e] hover:underline"
              >
                Tout explorer
              </button>
            </div>
          </div>
        </div>

      {/* Edit Ticket Modal for Admin Dashboard */}
      {editingTicket && (
        <EditTicketModal
          ticket={editingTicket}
          developers={developers}
          projects={projects}
          isOpen={Boolean(editingTicket)}
          onClose={() => setEditingTicket(null)}
          currentUser={currentUser}
          onSave={(updated) => {
            if (onEditTicket) {
              onEditTicket(updated);
            }
            setEditingTicket(null);
          }}
        />
      )}
    </div>
  );
};
