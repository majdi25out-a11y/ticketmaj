import React, { useState, useMemo } from 'react';
import { Ticket, Status, Priority, Platform, Developer, Project } from '../../types';
import { EditTicketModal } from './EditTicketModal';

interface TicketsListProps {
  tickets: Ticket[];
  developers?: Developer[];
  projects?: Project[];
  initialProjectFilter?: string;
  onSelectTicket: (ticketId: string) => void;
  onInspectTicket?: (ticketId: string, mode?: 'inspect' | 'compare') => void;
  isInspectionOpen?: boolean;
  onNavigateCreate: () => void;
  onDeleteTicket?: (ticketId: string) => void;
  onToggleClarity?: (ticketId: string, clarity: 'clair' | 'clarifier') => void;
  onAssignDev?: (ticketId: string, devId: string) => void;
  onEditTicket?: (updatedTicket: Ticket) => void;
  onOpenImportModal?: () => void;
  onOpenExportModal?: () => void;
  onAssignProject?: (ticketId: string, projectId: string) => void;
  currentUser?: { name: string; role: string; avatar: string; email?: string; id?: string };
}

export const TicketsList: React.FC<TicketsListProps> = ({
  tickets,
  developers = [],
  projects = [],
  initialProjectFilter,
  onSelectTicket,
  onInspectTicket,
  isInspectionOpen,
  onNavigateCreate,
  onDeleteTicket,
  onToggleClarity,
  onAssignDev,
  onEditTicket,
  onOpenImportModal,
  onOpenExportModal,
  onAssignProject,
  currentUser,
}) => {
  const isAdmin =
    currentUser?.role?.toLowerCase().includes('admin') ||
    currentUser?.role?.toLowerCase().includes('architect') ||
    currentUser?.email === 'admin@ticketflow.io';
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [developerFilter, setDeveloperFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>(initialProjectFilter || 'all');
  const [onlyMyTasks, setOnlyMyTasks] = useState(false);

  React.useEffect(() => {
    if (initialProjectFilter) {
      setProjectFilter(initialProjectFilter);
    }
  }, [initialProjectFilter]);

  // My assigned tasks count
  const myTasksCount = useMemo(() => {
    if (!currentUser) return 0;
    const currentName = currentUser.name?.toLowerCase().trim();
    const currentEmail = currentUser.email?.toLowerCase().trim();
    return tickets.filter((t) => {
      if (t.status === 'completed' || t.status === 'rejected') return false;
      return (
        t.assignedTo &&
        ((currentUser.id && t.assignedTo.id === currentUser.id) ||
          (currentName && t.assignedTo.name?.toLowerCase().trim() === currentName) ||
          (currentEmail && t.assignedTo.email?.toLowerCase().trim() === currentEmail))
      );
    }).length;
  }, [tickets, currentUser]);

  // Filter tickets dynamically
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Direct "My Tasks" toggle
      if (onlyMyTasks) {
        const currentName = currentUser?.name?.toLowerCase().trim();
        const currentEmail = currentUser?.email?.toLowerCase().trim();
        const isAssigned =
          t.assignedTo &&
          ((currentUser?.id && t.assignedTo.id === currentUser.id) ||
            (currentName && t.assignedTo.name?.toLowerCase().trim() === currentName) ||
            (currentEmail && t.assignedTo.email?.toLowerCase().trim() === currentEmail));
        if (!isAssigned) return false;
      }

      // Role-based visibility for regular member
      if (!isAdmin && !onlyMyTasks) {
        const isAssignedToMe =
          t.assignedTo &&
          ((currentUser?.id && t.assignedTo.id === currentUser.id) ||
            (currentUser?.name && t.assignedTo.name?.toLowerCase().trim() === currentUser.name.toLowerCase().trim()) ||
            (currentUser?.email && t.assignedTo.email?.toLowerCase().trim() === currentUser.email.toLowerCase().trim()));
        const isProposedByMe =
          (currentUser?.name && t.requestedBy?.toLowerCase().trim() === currentUser.name.toLowerCase().trim()) ||
          (currentUser?.email && t.requestedBy?.toLowerCase().trim() === currentUser.email.toLowerCase().trim());
        if (!isAssignedToMe && !isProposedByMe) {
          return false;
        }
      }

      // Search term filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesId = t.id.toLowerCase().includes(query);
        const matchesDesc = t.description?.toLowerCase().includes(query);
        const matchesAuthor = t.requestedBy?.toLowerCase().includes(query);
        const matchesDev = t.assignedTo?.name?.toLowerCase().includes(query);
        const matchesTags = t.tags?.some((tag) => tag.toLowerCase().includes(query));
        if (!matchesTitle && !matchesId && !matchesDesc && !matchesAuthor && !matchesDev && !matchesTags) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'clarifier' && t.clarity !== 'clarifier') return false;
        if (statusFilter === 'pending' && t.status !== 'pending') return false;
        if (statusFilter === 'in_progress' && t.status !== 'in_progress') return false;
        if (statusFilter === 'completed' && t.status !== 'completed') return false;
        if (statusFilter === 'rejected' && t.status !== 'rejected') return false;
      }

      // Platform filter
      if (platformFilter !== 'all' && t.platform !== platformFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) {
        return false;
      }

      // Developer filter
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

      // Project filter
      if (projectFilter !== 'all') {
        if (projectFilter === 'none') {
          if (t.projectId || t.projectName) return false;
        } else {
          if (t.projectId !== projectFilter && t.projectName !== projectFilter) return false;
        }
      }

      return true;
    });
  }, [tickets, searchTerm, statusFilter, platformFilter, priorityFilter, developerFilter, projectFilter, onlyMyTasks, isAdmin, currentUser]);

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ffdad6] text-[#93000a] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a] animate-pulse"></span>
            Urgent
          </span>
        );
      case 'high':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">
            Haute
          </span>
        );
      case 'medium':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
            Moyenne
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            Basse
          </span>
        );
    }
  };

  const getStatusPill = (status: Status, label: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300/60">
            {label || 'À valider'}
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300/60">
            {label || 'En cours'}
          </span>
        );
      case 'completed':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300/60">
            {label || 'Terminé'}
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300/60">
            {label || 'Rejeté'}
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
            {label || status}
          </span>
        );
    }
  };

  return (
    <div className="pt-20 pb-20 px-3.5 md:px-8 max-w-[1300px] mx-auto space-y-5">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold bg-[#eff4ff] text-[#1f108e] px-2.5 py-0.5 rounded-full font-geist">
              {filteredTickets.length} ticket{filteredTickets.length > 1 ? 's' : ''}
            </span>
            <span className="text-xs text-[#777584]">
              sur {tickets.length} au total
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-[#0b1c30] tracking-tight">
            Tickets & Tâches
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Quick toggle for Developer tasks */}
          <button
            type="button"
            onClick={() => setOnlyMyTasks(!onlyMyTasks)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation border ${
              onlyMyTasks
                ? 'bg-[#1f108e] text-white border-[#1f108e] shadow-xs'
                : 'bg-white text-[#464553] border-[#c8c4d5]/60 hover:bg-[#eff4ff]'
            }`}
          >
            <span className="material-symbols-outlined text-base">assignment_ind</span>
            <span>Mes Tâches ({myTasksCount})</span>
          </button>

          {/* Import Excel Button (Admin Only) */}
          {isAdmin && onOpenImportModal && (
            <button
              type="button"
              onClick={onOpenImportModal}
              className="flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#006c4a] border border-emerald-300 px-3.5 py-2 rounded-xl font-bold text-xs active:scale-95 transition-all shadow-2xs cursor-pointer touch-manipulation"
              title="Importer des tickets depuis un fichier Excel (.xlsx, .xls, .csv)"
            >
              <span className="material-symbols-outlined text-base">upload_file</span>
              <span>Importer Excel</span>
            </button>
          )}

          {/* Export Button */}
          {onOpenExportModal && (
            <button
              type="button"
              onClick={onOpenExportModal}
              className="flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-[#1f108e] border border-indigo-200 px-3 py-2 rounded-xl font-bold text-xs active:scale-95 transition-all shadow-2xs cursor-pointer touch-manipulation"
              title="Exporter les tickets au format Excel ou PDF"
            >
              <span className="material-symbols-outlined text-base">download</span>
              <span className="hidden md:inline">Exporter</span>
            </button>
          )}

          {/* Volet d'inspection et comparaison Toggle Button */}
          {onInspectTicket && (
            <button
              type="button"
              onClick={() => onInspectTicket(filteredTickets[0]?.id || tickets[0]?.id || '')}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs active:scale-95 transition-all shadow-2xs cursor-pointer touch-manipulation border ${
                isInspectionOpen
                  ? 'bg-[#1f108e] text-white border-[#1f108e]'
                  : 'bg-[#eff4ff] hover:bg-[#1f108e] text-[#1f108e] hover:text-white border-[#1f108e]/30'
              }`}
              title="Ouvrir le volet latéral rétractable d'inspection et comparaison ancré à droite"
            >
              <span className="material-symbols-outlined text-base">dock_to_right</span>
              <span className="hidden sm:inline">Volet d'inspection</span>
            </button>
          )}

          <button
            type="button"
            onClick={onNavigateCreate}
            className="flex items-center justify-center gap-1.5 bg-[#1f108e] text-white px-3.5 py-2 rounded-xl font-bold text-xs hover:bg-[#312e81] active:scale-95 transition-all shadow-xs cursor-pointer touch-manipulation"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>Nouveau</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="bg-white border border-[#c8c4d5]/60 rounded-2xl p-3.5 md:p-4 shadow-xs space-y-3">
        {/* Search Bar Input */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#777584] text-base">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par titre, #ID, auteur ou mot-clé..."
            className="w-full bg-[#f8f9ff] border border-[#c8c4d5]/60 rounded-xl pl-9 pr-8 py-2 text-xs text-[#0b1c30] placeholder-[#777584] focus:ring-2 focus:ring-[#1f108e]/20 focus:border-[#1f108e] outline-none transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#777584] hover:text-[#0b1c30] p-1"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>

        {/* Scrollable Status & Platform Chips (Mobile friendly horizontal scroll) */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
          <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
            {[
              { id: 'all', label: 'Tous' },
              { id: 'clarifier', label: 'À clarifier', icon: 'help' },
              { id: 'pending', label: 'À valider' },
              { id: 'in_progress', label: 'En cours' },
              { id: 'completed', label: 'Terminés' },
              { id: 'rejected', label: 'Rejetés' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id);
                  if (tab.id !== 'all') setOnlyMyTasks(false);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer touch-manipulation text-xs ${
                  statusFilter === tab.id
                    ? tab.id === 'clarifier'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-[#1f108e] text-white shadow-xs'
                    : 'bg-[#eff4ff]/80 text-[#464553] hover:bg-[#dce9ff]'
                }`}
              >
                {tab.icon && <span className="material-symbols-outlined text-xs">{tab.icon}</span>}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Quick Priority & Developer filter dropdowns */}
          <div className="flex items-center gap-2 shrink-0 ml-auto flex-wrap sm:flex-nowrap">
            {/* Project Filter Dropdown */}
            {projects && projects.length > 0 && (
              <div className="flex items-center gap-1 bg-[#f8f9ff] border border-[#c8c4d5]/60 rounded-xl px-2 py-1 text-xs text-[#0b1c30]">
                <span className="material-symbols-outlined text-xs text-[#1f108e]">folder</span>
                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="bg-transparent text-xs text-[#0b1c30] font-semibold outline-none cursor-pointer max-w-[130px] truncate"
                  title="Filtrer par projet"
                >
                  <option value="all">Tous projets</option>
                  <option value="none">Sans projet</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code ? `[${p.code}] ` : ''}{p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Developer Filter Dropdown */}
            {developers && developers.length > 0 && (
              <div className="flex items-center gap-1 bg-[#f8f9ff] border border-[#c8c4d5]/60 rounded-xl px-2 py-1 text-xs text-[#0b1c30]">
                <span className="material-symbols-outlined text-xs text-[#1f108e]">engineering</span>
                <select
                  value={developerFilter}
                  onChange={(e) => {
                    setDeveloperFilter(e.target.value);
                    if (e.target.value !== 'all') {
                      setOnlyMyTasks(false);
                    }
                  }}
                  className="bg-transparent text-xs text-[#0b1c30] font-semibold outline-none cursor-pointer"
                  title="Filtrer par développeur assigné"
                >
                  <option value="all">Tous développeurs</option>
                  <option value="unassigned">Non assigné</option>
                  {developers.map((dev) => (
                    <option key={dev.id || dev.name} value={dev.id || dev.name}>
                      {dev.name} {dev.role ? `(${dev.role})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-[#f8f9ff] border border-[#c8c4d5]/60 rounded-xl px-2.5 py-1.5 text-xs text-[#0b1c30] font-semibold outline-none cursor-pointer"
              title="Filtrer par niveau de priorité"
            >
              <option value="all">Toutes priorités</option>
              <option value="urgent">🔴 Urgente</option>
              <option value="high">🟠 Haute</option>
              <option value="medium">🔵 Moyenne</option>
              <option value="low">⚪ Basse</option>
            </select>

            {(searchTerm || statusFilter !== 'all' || platformFilter !== 'all' || priorityFilter !== 'all' || developerFilter !== 'all' || projectFilter !== 'all' || onlyMyTasks) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setPlatformFilter('all');
                  setPriorityFilter('all');
                  setDeveloperFilter('all');
                  setProjectFilter('all');
                  setOnlyMyTasks(false);
                }}
                className="text-[11px] font-bold text-[#ba1a1a] hover:bg-rose-50 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer whitespace-nowrap transition-colors"
                title="Réinitialiser tous les filtres"
              >
                <span className="material-symbols-outlined text-xs">restart_alt</span>
                <span className="hidden md:inline">Réinitialiser</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tickets List Container */}
      {filteredTickets.length === 0 ? (
        <div className="bg-white border border-[#c8c4d5]/60 rounded-2xl p-10 text-center space-y-3">
          <span className="material-symbols-outlined text-4xl text-[#777584]">search_off</span>
          <h3 className="text-base font-bold text-[#0b1c30]">Aucun ticket correspondant</h3>
          <p className="text-xs text-[#777584] max-w-sm mx-auto">
            Modifiez vos filtres ou effectuez une autre recherche pour afficher des tickets.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => {
                if (isInspectionOpen && onInspectTicket) {
                  onInspectTicket(ticket.id, 'inspect');
                } else {
                  onSelectTicket(ticket.id);
                }
              }}
              className="bg-white border border-[#c8c4d5]/60 rounded-2xl p-4 hover:border-[#1f108e] transition-all duration-150 shadow-2xs hover:shadow-xs cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 touch-manipulation active:scale-[0.99]"
            >
              {/* Ticket Left Information */}
              <div className="flex-1 space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-geist text-xs font-black text-[#1f108e] bg-[#eff4ff] px-2 py-0.5 rounded-md">
                    #{ticket.id}
                  </span>
                  {getStatusPill(ticket.status, ticket.statusLabel)}
                  {getPriorityBadge(ticket.priority)}

                  {isAdmin && projects.length > 0 ? (
                    <div onClick={(e) => e.stopPropagation()} className="inline-flex items-center">
                      <select
                        value={ticket.projectId || ''}
                        onChange={(e) => {
                          if (onAssignProject) {
                            onAssignProject(ticket.id, e.target.value);
                          }
                        }}
                        className="text-[10px] font-bold rounded-md px-2 py-0.5 outline-none cursor-pointer border shadow-2xs transition-colors max-w-[140px] truncate"
                        style={{
                          backgroundColor: ticket.projectColor ? `${ticket.projectColor}18` : '#f1f5f9',
                          color: ticket.projectColor || '#1f108e',
                          borderColor: ticket.projectColor ? `${ticket.projectColor}50` : '#cbd5e1',
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
                    </div>
                  ) : ticket.projectName ? (
                    <span
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-2xs flex items-center gap-1"
                      style={{ backgroundColor: ticket.projectColor || '#1f108e' }}
                      title={`Projet : ${ticket.projectName}`}
                    >
                      <span className="material-symbols-outlined text-xs">folder</span>
                      <span>{ticket.projectCode ? `[${ticket.projectCode}] ` : ''}{ticket.projectName}</span>
                    </span>
                  ) : null}

                  {ticket.clarity === 'clarifier' && (
                    <span className="bg-amber-500 text-white px-2 py-0.5 rounded-md text-[10px] font-black flex items-center gap-1 shadow-2xs">
                      <span className="material-symbols-outlined text-xs">warning</span>
                      <span>À CLARIFIER</span>
                    </span>
                  )}

                  <span className="text-[10px] font-semibold text-[#464553] bg-[#f8f9ff] border border-[#c8c4d5]/40 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-xs">
                      {ticket.platform === 'mobile' ? 'smartphone' : 'desktop_windows'}
                    </span>
                    <span className="capitalize">{ticket.platform}</span>
                  </span>

                  {ticket.attachments && ticket.attachments.some((a) => a.icon === 'mic' || a.type?.includes('audio') || a.name.endsWith('.webm')) && (
                    <span className="bg-indigo-50 text-[#1f108e] border border-indigo-200 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">mic</span>
                      <span>Audio</span>
                    </span>
                  )}

                  {ticket.attachments && ticket.attachments.length > 0 && (
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">attach_file</span>
                      <span>{ticket.attachments.length}</span>
                    </span>
                  )}
                </div>

                <h3 className="text-sm md:text-base font-bold text-[#0b1c30] group-hover:text-[#1f108e] transition-colors leading-snug">
                  {ticket.title}
                </h3>

                <p className="text-xs text-[#464553] line-clamp-2 leading-relaxed">
                  {ticket.description}
                </p>

                {/* Metadata Row: Author, Assignee, Date */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-[#777584]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-[#d3e4fe] flex items-center justify-center text-[9px] font-bold text-[#1f108e] overflow-hidden">
                      {ticket.requestedByAvatar ? (
                        <img
                          src={ticket.requestedByAvatar}
                          alt={ticket.requestedBy}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        ticket.requestedBy?.substring(0, 2)
                      )}
                    </div>
                    <span className="truncate max-w-[130px] font-medium text-[#0b1c30]">
                      {ticket.requestedBy}
                    </span>
                  </div>

                  <span>•</span>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <span className="material-symbols-outlined text-xs text-[#1f108e]">engineering</span>
                    {isAdmin && onAssignDev && developers.length > 0 ? (
                      <select
                        value={ticket.assignedTo?.id || ''}
                        onChange={(e) => {
                          e.stopPropagation();
                          onAssignDev(ticket.id, e.target.value);
                        }}
                        className="bg-[#eff4ff] border border-[#c8c4d5]/60 rounded-md px-1.5 py-0.5 text-[11px] text-[#0b1c30] font-bold outline-none cursor-pointer hover:border-[#1f108e]"
                      >
                        <option value="">Non assigné</option>
                        {developers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} {currentUser && d.name === currentUser.name ? '(Moi)' : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-semibold text-[#0b1c30] text-xs">
                        {ticket.assignedTo ? ticket.assignedTo.name : 'Non assigné'}
                      </span>
                    )}
                  </div>

                  <span>•</span>

                  <span className="text-[11px] font-geist">{ticket.createdDate}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex sm:flex-col items-center justify-end gap-1.5 border-t sm:border-t-0 sm:border-l border-[#c8c4d5]/40 pt-2.5 sm:pt-0 sm:pl-4">
                {onInspectTicket && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectTicket(ticket.id, 'inspect');
                    }}
                    className="w-full sm:w-auto px-3 py-1.5 bg-[#eff4ff] hover:bg-[#1f108e] text-[#1f108e] hover:text-white border border-[#1f108e]/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer touch-manipulation shadow-2xs"
                    title="Prévisualiser ce ticket dans le volet latéral rétractable sans quitter la liste"
                  >
                    <span className="material-symbols-outlined text-sm">dock_to_right</span>
                    <span>Inspecter</span>
                  </button>
                )}

                {onInspectTicket && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectTicket(ticket.id, 'compare');
                    }}
                    className="w-full sm:w-auto px-2.5 py-1.5 bg-slate-50 hover:bg-[#eff4ff] text-[#464553] hover:text-[#1f108e] border border-[#c8c4d5]/50 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer touch-manipulation"
                    title="Comparer ce ticket dans le volet rétractable"
                  >
                    <span className="material-symbols-outlined text-sm">compare_arrows</span>
                    <span className="hidden sm:inline">Comparer</span>
                  </button>
                )}

                {isAdmin && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTicket(ticket);
                    }}
                    className="w-full sm:w-auto px-2.5 py-1.5 bg-white hover:bg-[#eff4ff] text-[#0b1c30] border border-[#c8c4d5]/60 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer touch-manipulation shadow-2xs"
                    title="Gérer les attributs de ce ticket (Projet, Développeur, Statut, SLA...)"
                  >
                    <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
                    <span>Gérer</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTicket(ticket.id);
                  }}
                  className="w-full sm:w-auto px-2.5 py-1.5 bg-slate-100 text-[#464553] hover:bg-[#1f108e] hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer touch-manipulation"
                >
                  <span>Détail</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>

                {onToggleClarity && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextClarity = ticket.clarity === 'clarifier' ? 'clair' : 'clarifier';
                      onToggleClarity(ticket.id, nextClarity);
                    }}
                    className={`w-full sm:w-auto px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                      ticket.clarity === 'clarifier'
                        ? 'bg-amber-100 border-amber-300 text-amber-900'
                        : 'bg-slate-50 border-slate-200 text-[#777584] hover:text-amber-800'
                    }`}
                    title={ticket.clarity === 'clarifier' ? 'Marquer comme clair' : 'Demander clarification'}
                  >
                    <span className="material-symbols-outlined text-xs">
                      {ticket.clarity === 'clarifier' ? 'check' : 'help'}
                    </span>
                    <span>{ticket.clarity === 'clarifier' ? 'Clair' : 'Clarifier'}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Ticket Modal directly from list */}
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
