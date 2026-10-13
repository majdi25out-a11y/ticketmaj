import React, { useState, useMemo } from 'react';
import { Ticket, Developer, Project, Comment, Status, Priority } from '../../types';
import { AudioPlayer } from '../Audio/AudioPlayer';
import { EditTicketModal } from './EditTicketModal';

interface TicketInspectionDrawerProps {
  isOpen: boolean;
  onOpen?: () => void;
  onClose: () => void;
  ticketId: string | null;
  compareTicketId?: string | null;
  tickets: Ticket[];
  developers?: Developer[];
  projects?: Project[];
  currentUser: {
    name: string;
    role: string;
    avatar: string;
    email?: string;
    id?: string;
  };
  onSelectTicketDetail?: (ticketId: string) => void;
  onChangeTicket?: (ticketId: string) => void;
  onOpenFullScreen?: (ticketId: string) => void;
  onUpdateTicketStatus?: (ticketId: string, newStatus: Ticket['status'], newStatusLabel: string) => void;
  onAddComment?: (ticketId: string, comment: Comment) => void;
  onAssignDev?: (ticketId: string, devId: string) => void;
  onAssignProject?: (ticketId: string, projectId: string) => void;
  onToggleClarity?: (ticketId: string, clarity: 'clair' | 'clarifier') => void;
  onEditTicket?: (updatedTicket: Ticket) => void;
  onDeleteTicket?: (ticketId: string) => void;
}

export const TicketInspectionDrawer: React.FC<TicketInspectionDrawerProps> = ({
  isOpen,
  onOpen,
  onClose,
  ticketId,
  compareTicketId: initialCompareId,
  tickets,
  developers = [],
  projects = [],
  currentUser,
  onSelectTicketDetail,
  onChangeTicket,
  onOpenFullScreen,
  onUpdateTicketStatus,
  onAddComment,
  onAssignDev,
  onAssignProject,
  onToggleClarity,
  onEditTicket,
  onDeleteTicket,
}) => {
  const [activeTab, setActiveTab] = useState<'inspect' | 'compare'>('inspect');
  const [isExpandedWidth, setIsExpandedWidth] = useState(false);
  const [selectedCompareId, setSelectedCompareId] = useState<string>(initialCompareId || '');
  const [compareSearch, setCompareSearch] = useState('');
  const [quickComment, setQuickComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Sync initial compare ticket ID when prop changes
  React.useEffect(() => {
    if (initialCompareId) {
      setSelectedCompareId(initialCompareId);
      setActiveTab('compare');
      setIsExpandedWidth(true);
    }
  }, [initialCompareId]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const isAdmin =
    currentUser?.role?.toLowerCase().includes('admin') ||
    currentUser?.role?.toLowerCase().includes('architect') ||
    currentUser?.email === 'admin@ticketflow.io';

  // Primary inspected ticket
  const primaryTicket = useMemo(() => {
    return tickets.find((t) => t.id === ticketId) || tickets[0] || null;
  }, [tickets, ticketId]);

  // Secondary ticket for comparison
  const secondaryTicket = useMemo(() => {
    if (!selectedCompareId) {
      // Default to next ticket in list if available
      const alt = tickets.find((t) => t.id !== primaryTicket?.id);
      return alt || null;
    }
    return tickets.find((t) => t.id === selectedCompareId) || null;
  }, [tickets, selectedCompareId, primaryTicket]);

  // Index of primary ticket for next/prev navigation
  const currentIndex = useMemo(() => {
    if (!primaryTicket) return -1;
    return tickets.findIndex((t) => t.id === primaryTicket.id);
  }, [tickets, primaryTicket]);

  const handlePrevTicket = () => {
    if (currentIndex > 0) {
      const prevTicket = tickets[currentIndex - 1];
      if (prevTicket) {
        if (onChangeTicket) {
          onChangeTicket(prevTicket.id);
        } else if (onSelectTicketDetail) {
          onSelectTicketDetail(prevTicket.id);
        }
      }
    }
  };

  const handleNextTicket = () => {
    if (currentIndex >= 0 && currentIndex < tickets.length - 1) {
      const nextTicket = tickets[currentIndex + 1];
      if (nextTicket) {
        if (onChangeTicket) {
          onChangeTicket(nextTicket.id);
        } else if (onSelectTicketDetail) {
          onSelectTicketDetail(nextTicket.id);
        }
      }
    }
  };

  const handleSendComment = () => {
    if (!quickComment.trim() || !primaryTicket || !onAddComment) return;

    const newComment: Comment = {
      id: `c-${Date.now()}`,
      author: currentUser.name || 'Utilisateur',
      avatar: currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      role: currentUser.role || 'Membre',
      roleType: isAdmin ? 'admin' : 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: quickComment.trim(),
    };

    onAddComment(primaryTicket.id, newComment);
    setQuickComment('');
    showToast('Commentaire ajouté au ticket.');
  };

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ffdad6] text-[#93000a] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a] animate-pulse"></span>
            Urgent
          </span>
        );
      case 'high':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">Haute</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Moyenne</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">Basse</span>;
    }
  };

  const getStatusPill = (status: Status, label?: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300/60">
            {label || 'À valider'}
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300/60">
            {label || 'En cours'}
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300/60">
            {label || 'Terminé'}
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300/60">
            {label || 'Rejeté'}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800">
            {label || status}
          </span>
        );
    }
  };

  // Difference calculations between primary and secondary tickets
  const comparisonStats = useMemo(() => {
    if (!primaryTicket || !secondaryTicket) return null;

    const diffs: { field: string; isDiff: boolean; textA: string; textB: string }[] = [
      {
        field: 'Statut',
        isDiff: primaryTicket.status !== secondaryTicket.status,
        textA: primaryTicket.statusLabel || primaryTicket.status,
        textB: secondaryTicket.statusLabel || secondaryTicket.status,
      },
      {
        field: 'Priorité',
        isDiff: primaryTicket.priority !== secondaryTicket.priority,
        textA: primaryTicket.priority,
        textB: secondaryTicket.priority,
      },
      {
        field: 'Projet',
        isDiff: (primaryTicket.projectId || primaryTicket.projectName) !== (secondaryTicket.projectId || secondaryTicket.projectName),
        textA: primaryTicket.projectName || 'Sans projet',
        textB: secondaryTicket.projectName || 'Sans projet',
      },
      {
        field: 'Assigné à',
        isDiff: primaryTicket.assignedTo?.name !== secondaryTicket.assignedTo?.name,
        textA: primaryTicket.assignedTo?.name || 'Non assigné',
        textB: secondaryTicket.assignedTo?.name || 'Non assigné',
      },
      {
        field: 'Plateforme',
        isDiff: primaryTicket.platform !== secondaryTicket.platform,
        textA: primaryTicket.platform,
        textB: secondaryTicket.platform,
      },
      {
        field: 'Clarté',
        isDiff: primaryTicket.clarity !== secondaryTicket.clarity,
        textA: primaryTicket.clarity === 'clarifier' ? 'À clarifier' : 'Clair',
        textB: secondaryTicket.clarity === 'clarifier' ? 'À clarifier' : 'Clair',
      },
      {
        field: 'Pièces jointes',
        isDiff: (primaryTicket.attachments?.length || 0) !== (secondaryTicket.attachments?.length || 0),
        textA: `${primaryTicket.attachments?.length || 0} fichier(s)`,
        textB: `${secondaryTicket.attachments?.length || 0} fichier(s)`,
      },
      {
        field: 'Commentaires',
        isDiff: (primaryTicket.comments?.length || 0) !== (secondaryTicket.comments?.length || 0),
        textA: `${primaryTicket.comments?.length || 0} comm.`,
        textB: `${secondaryTicket.comments?.length || 0} comm.`,
      },
    ];

    const diffCount = diffs.filter((d) => d.isDiff).length;
    const sameCount = diffs.length - diffCount;

    return { diffs, diffCount, sameCount };
  }, [primaryTicket, secondaryTicket]);

  // Candidates for comparison selection
  const comparisonCandidates = useMemo(() => {
    return tickets.filter((t) => {
      if (t.id === primaryTicket?.id) return false;
      if (!compareSearch.trim()) return true;
      const q = compareSearch.toLowerCase();
      return (
        t.id.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        (t.projectName && t.projectName.toLowerCase().includes(q))
      );
    });
  }, [tickets, primaryTicket, compareSearch]);

  // Keyboard shortcut: Escape to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return onOpen ? (
      <button
        type="button"
        onClick={onOpen}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-30 bg-[#1f108e] text-white shadow-2xl hover:bg-[#170b6e] rounded-l-2xl py-3 px-2 flex flex-col items-center gap-1.5 cursor-pointer transition-all duration-200 group border-y border-l border-white/20 hover:pl-3"
        title="Ouvrir le volet rétractable d'inspection et comparaison"
        aria-label="Volet rétractable d'inspection et comparaison"
      >
        <span className="material-symbols-outlined text-base group-hover:scale-110 transition-transform">dock_to_right</span>
        <span className="text-[10px] font-black uppercase tracking-wider [writing-mode:vertical-lr] rotate-180 py-1">
          Inspection & Comparaison
        </span>
        {primaryTicket && (
          <span className="font-geist text-[9px] font-black bg-white/20 px-1 py-0.5 rounded text-white">
            #{primaryTicket.id}
          </span>
        )}
      </button>
    ) : null;
  }

  if (!primaryTicket) {
    return (
      <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[460px] bg-white border-l border-[#c8c4d5]/80 shadow-2xl flex flex-col p-6 items-center justify-center text-center">
        <span className="material-symbols-outlined text-4xl text-[#777584] mb-2">dock_to_right</span>
        <h3 className="font-bold text-[#0b1c30]">Aucun ticket sélectionné</h3>
        <p className="text-xs text-[#777584] mt-1 mb-4">Cliquez sur un ticket dans la vue d'ensemble pour l'inspecter.</p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-[#eff4ff] text-[#1f108e] text-xs font-bold rounded-xl hover:bg-[#1f108e] hover:text-white transition-colors"
        >
          Fermer le volet
        </button>
      </div>
    );
  }

  const drawerWidthClass = isExpandedWidth || activeTab === 'compare'
    ? 'w-full sm:w-[720px] lg:w-[940px] xl:w-[1020px]'
    : 'w-full sm:w-[480px] lg:w-[540px]';

  return (
    <>
      {/* Toast Notification inside Drawer */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0b1c30] text-white text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/10 animate-bounce">
          <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Retractable Right-Anchored Side Panel Container */}
      <aside
        className={`fixed inset-y-0 right-0 z-40 ${drawerWidthClass} bg-white/95 backdrop-blur-md border-l border-[#c8c4d5]/70 shadow-2xl flex flex-col transition-all duration-300 ease-in-out font-sans overflow-hidden`}
        aria-label="Volet d'inspection et comparaison"
      >
        {/* Top Header / Bar */}
        <div className="bg-[#f8f9ff] border-b border-[#c8c4d5]/60 px-4 py-3 shrink-0 flex items-center justify-between gap-2">
          {/* Left Title & Mode Switcher */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#1f108e] text-white flex items-center justify-center shadow-xs shrink-0">
              <span className="material-symbols-outlined text-lg">dock_to_right</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-[#0b1c30] tracking-tight truncate">
                  Volet d'inspection
                </span>
                <span className="font-geist text-[11px] font-black text-[#1f108e] bg-[#eff4ff] px-2 py-0.5 rounded-md">
                  #{primaryTicket.id}
                </span>
              </div>
              <p className="text-[10px] text-[#777584] truncate">
                Prévisualisez et comparez sans quitter la vue d'ensemble
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Previous / Next Ticket in Overview */}
            <div className="hidden sm:flex items-center border border-[#c8c4d5]/60 rounded-xl bg-white p-0.5 mr-1">
              <button
                type="button"
                onClick={handlePrevTicket}
                disabled={currentIndex <= 0}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#eff4ff] text-[#0b1c30] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                title="Ticket précédent dans la vue"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <span className="text-[10px] font-geist font-bold px-1 text-[#777584]">
                {currentIndex + 1}/{tickets.length}
              </span>
              <button
                type="button"
                onClick={handleNextTicket}
                disabled={currentIndex >= tickets.length - 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#eff4ff] text-[#0b1c30] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                title="Ticket suivant dans la vue"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>

            {/* Expand / Shrink Width Toggle */}
            <button
              type="button"
              onClick={() => setIsExpandedWidth(!isExpandedWidth)}
              className="w-8 h-8 rounded-xl border border-[#c8c4d5]/60 hover:bg-[#eff4ff] text-[#464553] hover:text-[#1f108e] flex items-center justify-center transition-colors cursor-pointer"
              title={isExpandedWidth ? 'Largeur standard' : 'Élargir le volet'}
            >
              <span className="material-symbols-outlined text-base">
                {isExpandedWidth ? 'close_fullscreen' : 'open_in_full'}
              </span>
            </button>

            {/* Open Full Screen Detail View */}
            <button
              type="button"
              onClick={() => {
                if (onOpenFullScreen) {
                  onOpenFullScreen(primaryTicket.id);
                } else if (onSelectTicketDetail) {
                  onSelectTicketDetail(primaryTicket.id);
                }
              }}
              className="h-8 px-2.5 rounded-xl bg-[#eff4ff] text-[#1f108e] hover:bg-[#1f108e] hover:text-white border border-[#1f108e]/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="Ouvrir la page de détail complète du ticket"
            >
              <span className="material-symbols-outlined text-xs">open_in_new</span>
              <span className="hidden md:inline">Page complète</span>
            </button>

            {/* Close Drawer Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-100 text-[#464553] hover:text-rose-700 flex items-center justify-center transition-colors cursor-pointer"
              title="Fermer le volet (Esc)"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs (Inspect vs Compare) */}
        <div className="bg-white border-b border-[#c8c4d5]/40 px-4 py-2 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 bg-[#f0f3fa] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('inspect')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'inspect'
                  ? 'bg-white text-[#1f108e] shadow-2xs'
                  : 'text-[#464553] hover:text-[#0b1c30]'
              }`}
            >
              <span className="material-symbols-outlined text-sm">visibility</span>
              <span>Inspection & Aperçu</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('compare');
                setIsExpandedWidth(true);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'compare'
                  ? 'bg-white text-[#1f108e] shadow-2xs'
                  : 'text-[#464553] hover:text-[#0b1c30]'
              }`}
            >
              <span className="material-symbols-outlined text-sm">compare_arrows</span>
              <span>Comparaison</span>
              {comparisonStats && (
                <span className="bg-[#1f108e]/10 text-[#1f108e] px-1.5 py-0.2 rounded text-[10px]">
                  {comparisonStats.diffCount} diff.
                </span>
              )}
            </button>
          </div>

          {/* Quick Admin Edit or Action Button */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-2.5 py-1 bg-[#f8f9ff] hover:bg-[#eff4ff] text-[#1f108e] border border-[#c8c4d5]/60 hover:border-[#1f108e] rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              title="Modifier toutes les propriétés de ce ticket"
            >
              <span className="material-symbols-outlined text-xs">edit</span>
              <span>Modifier</span>
            </button>
          )}
        </div>

        {/* Tab 1: INSPECTION CONTENT */}
        {activeTab === 'inspect' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Quick Status Workflow Actions Bar */}
            <div className="bg-[#f8f9ff] border border-[#c8c4d5]/50 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#777584]">Statut :</span>
                {getStatusPill(primaryTicket.status, primaryTicket.statusLabel)}
              </div>

              {/* Status Transition Buttons */}
              {onUpdateTicketStatus && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {primaryTicket.status !== 'in_progress' && (
                    <button
                      type="button"
                      onClick={() => onUpdateTicketStatus(primaryTicket.id, 'in_progress', 'En cours')}
                      className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      En cours
                    </button>
                  )}
                  {primaryTicket.status !== 'completed' && (
                    <button
                      type="button"
                      onClick={() => onUpdateTicketStatus(primaryTicket.id, 'completed', 'Terminé')}
                      className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      Terminer
                    </button>
                  )}
                  {isAdmin && primaryTicket.status !== 'rejected' && (
                    <button
                      type="button"
                      onClick={() => onUpdateTicketStatus(primaryTicket.id, 'rejected', 'Rejeté')}
                      className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      Rejeter
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Ticket Header & Badges */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {getPriorityBadge(primaryTicket.priority)}

                {/* Project Badge / Selector */}
                {isAdmin && projects.length > 0 ? (
                  <select
                    value={primaryTicket.projectId || ''}
                    onChange={(e) => {
                      if (onAssignProject) {
                        onAssignProject(primaryTicket.id, e.target.value);
                        showToast('Projet assigné.');
                      }
                    }}
                    className="text-[11px] font-bold rounded-lg px-2 py-0.5 outline-none cursor-pointer border shadow-2xs transition-colors"
                    style={{
                      backgroundColor: primaryTicket.projectColor ? `${primaryTicket.projectColor}18` : '#f1f5f9',
                      color: primaryTicket.projectColor || '#1f108e',
                      borderColor: primaryTicket.projectColor ? `${primaryTicket.projectColor}50` : '#cbd5e1',
                    }}
                  >
                    <option value="" className="text-[#0b1c30] bg-white">Sans projet</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} className="text-[#0b1c30] bg-white">
                        {p.code ? `[${p.code}] ` : ''}{p.name}
                      </option>
                    ))}
                  </select>
                ) : primaryTicket.projectName ? (
                  <span
                    className="px-2 py-0.5 rounded-lg text-[11px] font-bold text-white shadow-2xs flex items-center gap-1"
                    style={{ backgroundColor: primaryTicket.projectColor || '#1f108e' }}
                  >
                    <span className="material-symbols-outlined text-xs">folder</span>
                    <span>{primaryTicket.projectCode ? `[${primaryTicket.projectCode}] ` : ''}{primaryTicket.projectName}</span>
                  </span>
                ) : null}

                {/* Platform Badge */}
                <span className="text-[11px] font-semibold text-[#464553] bg-[#f8f9ff] border border-[#c8c4d5]/40 px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">
                    {primaryTicket.platform === 'mobile' ? 'smartphone' : 'desktop_windows'}
                  </span>
                  <span className="capitalize">{primaryTicket.platform}</span>
                </span>

                {/* Clarity Flag Toggle */}
                {onToggleClarity && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextClarity = primaryTicket.clarity === 'clarifier' ? 'clair' : 'clarifier';
                      onToggleClarity(primaryTicket.id, nextClarity);
                      showToast(nextClarity === 'clarifier' ? 'Marqué à clarifier' : 'Marqué comme clair');
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                      primaryTicket.clarity === 'clarifier'
                        ? 'bg-amber-100 border-amber-300 text-amber-900'
                        : 'bg-slate-50 border-slate-200 text-[#777584] hover:text-amber-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">
                      {primaryTicket.clarity === 'clarifier' ? 'warning' : 'help'}
                    </span>
                    <span>{primaryTicket.clarity === 'clarifier' ? 'À CLARIFIER' : 'Clarifier'}</span>
                  </button>
                )}
              </div>

              {/* Title */}
              <h2 className="text-lg md:text-xl font-black text-[#0b1c30] leading-snug">
                {primaryTicket.title}
              </h2>
            </div>

            {/* Description Card */}
            <div className="bg-white border border-[#c8c4d5]/60 rounded-2xl p-4 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-[#777584] uppercase tracking-wider block">
                Description
              </span>
              <div className="text-xs md:text-sm text-[#2a2935] whitespace-pre-line leading-relaxed">
                {primaryTicket.description || <span className="italic text-[#777584]">Aucune description fournie.</span>}
              </div>
            </div>

            {/* Metadata Grid (Assignee, Reporter, SLA, Dates) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Assignee Card */}
              <div className="bg-[#f8f9ff] border border-[#c8c4d5]/50 rounded-2xl p-3 space-y-1.5">
                <span className="text-[11px] font-bold text-[#777584] flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-[#1f108e]">engineering</span>
                  Développeur assigné
                </span>
                {isAdmin && onAssignDev && developers.length > 0 ? (
                  <select
                    value={primaryTicket.assignedTo?.id || ''}
                    onChange={(e) => {
                      onAssignDev(primaryTicket.id, e.target.value);
                      showToast('Développeur réassigné.');
                    }}
                    className="w-full bg-white border border-[#c8c4d5]/70 rounded-xl px-2.5 py-1.5 text-xs text-[#0b1c30] font-bold outline-none cursor-pointer focus:border-[#1f108e]"
                  >
                    <option value="">Non assigné</option>
                    {developers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.role ? `(${d.role})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-2 pt-0.5">
                    <div className="w-6 h-6 rounded-full bg-[#1f108e] text-white flex items-center justify-center text-[10px] font-bold overflow-hidden">
                      {primaryTicket.assignedTo?.avatar ? (
                        <img src={primaryTicket.assignedTo.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        primaryTicket.assignedTo?.name?.substring(0, 2) || '?'
                      )}
                    </div>
                    <span className="text-xs font-bold text-[#0b1c30]">
                      {primaryTicket.assignedTo?.name || 'Non assigné'}
                    </span>
                  </div>
                )}
              </div>

              {/* Reporter / Creator Card */}
              <div className="bg-[#f8f9ff] border border-[#c8c4d5]/50 rounded-2xl p-3 space-y-1.5">
                <span className="text-[11px] font-bold text-[#777584] flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-[#1f108e]">person</span>
                  Demandeur
                </span>
                <div className="flex items-center gap-2 pt-0.5">
                  <div className="w-6 h-6 rounded-full bg-[#d3e4fe] text-[#1f108e] flex items-center justify-center text-[10px] font-bold overflow-hidden">
                    {primaryTicket.requestedByAvatar ? (
                      <img src={primaryTicket.requestedByAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      primaryTicket.requestedBy?.substring(0, 2) || 'U'
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-[#0b1c30] truncate block">
                      {primaryTicket.requestedBy}
                    </span>
                    <span className="text-[10px] text-[#777584]">
                      Créé le {primaryTicket.createdDate}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SLA Deadline Banner if exists */}
            {primaryTicket.slaDeadline && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center gap-2 text-xs text-amber-900">
                <span className="material-symbols-outlined text-base text-amber-600">timer</span>
                <span>
                  <strong>Échéance SLA :</strong> {primaryTicket.slaDeadline}
                </span>
              </div>
            )}

            {/* Attachments & Voice Notes Section */}
            {primaryTicket.attachments && primaryTicket.attachments.length > 0 && (
              <div className="bg-white border border-[#c8c4d5]/60 rounded-2xl p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0b1c30] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#1f108e]">attach_file</span>
                    Pièces jointes ({primaryTicket.attachments.length})
                  </span>
                </div>

                <div className="space-y-2">
                  {primaryTicket.attachments.map((att) => {
                    const isAudio =
                      att.icon === 'mic' ||
                      att.type?.includes('audio') ||
                      att.name.endsWith('.webm') ||
                      att.name.endsWith('.mp3');

                    if (isAudio && att.url) {
                      return (
                        <div key={att.id} className="p-2 bg-[#f8f9ff] border border-[#c8c4d5]/50 rounded-xl">
                          <AudioPlayer
                            src={att.url}
                            duration={att.duration}
                            fileName={att.name}
                            size={att.size}
                            compact
                          />
                        </div>
                      );
                    }

                    return (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-[#f8f9ff] border border-[#c8c4d5]/50 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="material-symbols-outlined text-base text-[#1f108e]">
                            {att.type?.includes('image') ? 'image' : 'description'}
                          </span>
                          <span className="truncate font-semibold text-[#0b1c30] max-w-[200px]">
                            {att.name}
                          </span>
                          <span className="text-[10px] text-[#777584]">({att.size})</span>
                        </div>
                        {att.url && (
                          <a
                            href={att.url}
                            download={att.name}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#1f108e] hover:underline font-bold text-[11px] flex items-center gap-0.5"
                          >
                            <span className="material-symbols-outlined text-xs">download</span>
                            Télécharger
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Comments Stream & Quick Reply */}
            <div className="bg-white border border-[#c8c4d5]/60 rounded-2xl p-4 shadow-2xs space-y-3">
              <span className="text-xs font-bold text-[#0b1c30] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#1f108e]">chat</span>
                Commentaires ({primaryTicket.comments?.length || 0})
              </span>

              {/* Existing Comments List */}
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {(!primaryTicket.comments || primaryTicket.comments.length === 0) ? (
                  <p className="text-xs italic text-[#777584] py-2">Aucun commentaire pour le moment.</p>
                ) : (
                  primaryTicket.comments.map((comment) => (
                    <div key={comment.id} className="bg-[#f8f9ff] border border-[#c8c4d5]/40 rounded-xl p-2.5 space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-1 text-[11px]">
                        <span className="font-bold text-[#0b1c30]">{comment.author}</span>
                        <span className="text-[10px] text-[#777584]">{comment.timestamp}</span>
                      </div>
                      <p className="text-[#3b3a47] whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Quick Comment Input */}
              {onAddComment && (
                <div className="pt-2 border-t border-[#c8c4d5]/40 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={quickComment}
                      onChange={(e) => setQuickComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendComment();
                        }
                      }}
                      placeholder="Ajouter une note ou réponse rapide..."
                      className="flex-1 bg-[#f8f9ff] border border-[#c8c4d5]/70 rounded-xl px-3 py-2 text-xs text-[#0b1c30] outline-none focus:border-[#1f108e] focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleSendComment}
                      disabled={!quickComment.trim()}
                      className="px-3 py-2 bg-[#1f108e] text-white rounded-xl text-xs font-bold disabled:opacity-40 hover:bg-[#150a6b] transition-colors cursor-pointer shrink-0"
                    >
                      Envoyer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: COMPARISON CONTENT (COMPARATEUR) */}
        {activeTab === 'compare' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Ticket Selector Bar for Comparison */}
            <div className="bg-[#f8f9ff] border border-[#c8c4d5]/60 rounded-2xl p-3 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#0b1c30] flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-[#1f108e]">compare</span>
                  Sélectionnez le second ticket à comparer avec #{primaryTicket.id}
                </span>

                {/* Swap Tickets Button */}
                {secondaryTicket && (
                  <button
                    type="button"
                    onClick={() => {
                      // Swap primary and secondary
                      const oldPrimary = primaryTicket.id;
                      if (onChangeTicket) {
                        onChangeTicket(secondaryTicket.id);
                      } else if (onSelectTicketDetail) {
                        onSelectTicketDetail(secondaryTicket.id);
                      }
                      setSelectedCompareId(oldPrimary);
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-[#eff4ff] border border-[#c8c4d5]/60 rounded-xl text-xs font-bold text-[#1f108e] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs self-start sm:self-auto"
                    title="Inverser Ticket A et Ticket B"
                  >
                    <span className="material-symbols-outlined text-sm">swap_horiz</span>
                    <span>Inverser A ⇄ B</span>
                  </button>
                )}
              </div>

              {/* Second Ticket Search / Select Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedCompareId}
                  onChange={(e) => setSelectedCompareId(e.target.value)}
                  className="flex-1 bg-white border border-[#c8c4d5]/70 rounded-xl px-3 py-2 text-xs font-bold text-[#0b1c30] outline-none cursor-pointer focus:border-[#1f108e]"
                >
                  <option value="">-- Choisir un ticket dans la liste --</option>
                  {comparisonCandidates.map((t) => (
                    <option key={t.id} value={t.id}>
                      #{t.id} - {t.title.substring(0, 45)} ({t.statusLabel || t.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Comparison Summary Counter */}
              {comparisonStats && (
                <div className="flex items-center gap-2 pt-1 text-xs">
                  <span className="px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg font-bold">
                    {comparisonStats.diffCount} différence{comparisonStats.diffCount > 1 ? 's' : ''}
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-bold">
                    {comparisonStats.sameCount} point{comparisonStats.sameCount > 1 ? 's' : ''} en commun
                  </span>
                </div>
              )}
            </div>

            {/* Side-by-Side Comparison Container */}
            {secondaryTicket ? (
              <div className="space-y-4">
                {/* Column Headers for Ticket A and Ticket B */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Card Header A */}
                  <div className="bg-[#eff4ff] border-2 border-[#1f108e]/30 rounded-2xl p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-[#1f108e] tracking-wider">
                        Ticket A (Sélectionné)
                      </span>
                      <span className="font-geist text-xs font-black text-[#1f108e]">#{primaryTicket.id}</span>
                    </div>
                    <h4 className="font-bold text-xs md:text-sm text-[#0b1c30] line-clamp-2">
                      {primaryTicket.title}
                    </h4>
                  </div>

                  {/* Card Header B */}
                  <div className="bg-[#fcf8ff] border-2 border-[#6833b3]/30 rounded-2xl p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-[#6833b3] tracking-wider">
                        Ticket B (Comparé)
                      </span>
                      <span className="font-geist text-xs font-black text-[#6833b3]">#{secondaryTicket.id}</span>
                    </div>
                    <h4 className="font-bold text-xs md:text-sm text-[#0b1c30] line-clamp-2">
                      {secondaryTicket.title}
                    </h4>
                  </div>
                </div>

                {/* Comparative Matrix Table */}
                <div className="bg-white border border-[#c8c4d5]/60 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="bg-[#f8f9ff] px-3 py-2 border-b border-[#c8c4d5]/50 flex items-center justify-between text-xs font-bold text-[#777584]">
                    <span>Attribut</span>
                    <span>Comparatif Ticket A vs B</span>
                  </div>

                  <div className="divide-y divide-[#c8c4d5]/40 text-xs">
                    {/* Statut */}
                    <div className={`p-3 grid grid-cols-12 gap-2 items-center ${primaryTicket.status !== secondaryTicket.status ? 'bg-amber-50/40' : ''}`}>
                      <div className="col-span-3 font-bold text-[#777584]">Statut</div>
                      <div className="col-span-4">{getStatusPill(primaryTicket.status, primaryTicket.statusLabel)}</div>
                      <div className="col-span-1 text-center font-bold text-[#777584]">
                        {primaryTicket.status === secondaryTicket.status ? '=' : '≠'}
                      </div>
                      <div className="col-span-4">{getStatusPill(secondaryTicket.status, secondaryTicket.statusLabel)}</div>
                    </div>

                    {/* Priorité */}
                    <div className={`p-3 grid grid-cols-12 gap-2 items-center ${primaryTicket.priority !== secondaryTicket.priority ? 'bg-amber-50/40' : ''}`}>
                      <div className="col-span-3 font-bold text-[#777584]">Priorité</div>
                      <div className="col-span-4">{getPriorityBadge(primaryTicket.priority)}</div>
                      <div className="col-span-1 text-center font-bold text-[#777584]">
                        {primaryTicket.priority === secondaryTicket.priority ? '=' : '≠'}
                      </div>
                      <div className="col-span-4">{getPriorityBadge(secondaryTicket.priority)}</div>
                    </div>

                    {/* Projet */}
                    <div className={`p-3 grid grid-cols-12 gap-2 items-center ${(primaryTicket.projectId || primaryTicket.projectName) !== (secondaryTicket.projectId || secondaryTicket.projectName) ? 'bg-amber-50/40' : ''}`}>
                      <div className="col-span-3 font-bold text-[#777584]">Projet</div>
                      <div className="col-span-4 truncate font-bold text-[#1f108e]">
                        {primaryTicket.projectName || 'Sans projet'}
                      </div>
                      <div className="col-span-1 text-center font-bold text-[#777584]">
                        {(primaryTicket.projectId || primaryTicket.projectName) === (secondaryTicket.projectId || secondaryTicket.projectName) ? '=' : '≠'}
                      </div>
                      <div className="col-span-4 truncate font-bold text-[#6833b3]">
                        {secondaryTicket.projectName || 'Sans projet'}
                      </div>
                    </div>

                    {/* Développeur */}
                    <div className={`p-3 grid grid-cols-12 gap-2 items-center ${primaryTicket.assignedTo?.name !== secondaryTicket.assignedTo?.name ? 'bg-amber-50/40' : ''}`}>
                      <div className="col-span-3 font-bold text-[#777584]">Assigné à</div>
                      <div className="col-span-4 truncate font-semibold text-[#0b1c30]">
                        {primaryTicket.assignedTo?.name || 'Non assigné'}
                      </div>
                      <div className="col-span-1 text-center font-bold text-[#777584]">
                        {primaryTicket.assignedTo?.name === secondaryTicket.assignedTo?.name ? '=' : '≠'}
                      </div>
                      <div className="col-span-4 truncate font-semibold text-[#0b1c30]">
                        {secondaryTicket.assignedTo?.name || 'Non assigné'}
                      </div>
                    </div>

                    {/* Plateforme */}
                    <div className={`p-3 grid grid-cols-12 gap-2 items-center ${primaryTicket.platform !== secondaryTicket.platform ? 'bg-amber-50/40' : ''}`}>
                      <div className="col-span-3 font-bold text-[#777584]">Plateforme</div>
                      <div className="col-span-4 capitalize font-semibold">{primaryTicket.platform}</div>
                      <div className="col-span-1 text-center font-bold text-[#777584]">
                        {primaryTicket.platform === secondaryTicket.platform ? '=' : '≠'}
                      </div>
                      <div className="col-span-4 capitalize font-semibold">{secondaryTicket.platform}</div>
                    </div>

                    {/* Clarté */}
                    <div className={`p-3 grid grid-cols-12 gap-2 items-center ${primaryTicket.clarity !== secondaryTicket.clarity ? 'bg-amber-50/40' : ''}`}>
                      <div className="col-span-3 font-bold text-[#777584]">Clarté</div>
                      <div className="col-span-4 font-semibold">
                        {primaryTicket.clarity === 'clarifier' ? '⚠️ À clarifier' : '✅ Clair'}
                      </div>
                      <div className="col-span-1 text-center font-bold text-[#777584]">
                        {primaryTicket.clarity === secondaryTicket.clarity ? '=' : '≠'}
                      </div>
                      <div className="col-span-4 font-semibold">
                        {secondaryTicket.clarity === 'clarifier' ? '⚠️ À clarifier' : '✅ Clair'}
                      </div>
                    </div>

                    {/* Pièces jointes */}
                    <div className="p-3 grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3 font-bold text-[#777584]">Pièces jointes</div>
                      <div className="col-span-4">{primaryTicket.attachments?.length || 0} fichier(s)</div>
                      <div className="col-span-1 text-center font-bold text-[#777584]">
                        {(primaryTicket.attachments?.length || 0) === (secondaryTicket.attachments?.length || 0) ? '=' : '≠'}
                      </div>
                      <div className="col-span-4">{secondaryTicket.attachments?.length || 0} fichier(s)</div>
                    </div>

                    {/* Date SLA & Création */}
                    <div className="p-3 grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3 font-bold text-[#777584]">Échéance SLA</div>
                      <div className="col-span-4 font-geist">{primaryTicket.slaDeadline || 'Non définie'}</div>
                      <div className="col-span-1 text-center font-bold text-[#777584]">
                        {primaryTicket.slaDeadline === secondaryTicket.slaDeadline ? '=' : '≠'}
                      </div>
                      <div className="col-span-4 font-geist">{secondaryTicket.slaDeadline || 'Non définie'}</div>
                    </div>
                  </div>
                </div>

                {/* Side-by-Side Description Comparer */}
                <div className="bg-white border border-[#c8c4d5]/60 rounded-2xl p-4 shadow-2xs space-y-3">
                  <span className="text-xs font-bold text-[#0b1c30] uppercase tracking-wider block">
                    Comparaison des descriptions
                  </span>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#f8f9ff] border border-[#c8c4d5]/40 rounded-xl p-3 whitespace-pre-line leading-relaxed text-[#2a2935] max-h-60 overflow-y-auto">
                      {primaryTicket.description}
                    </div>
                    <div className="bg-[#fcf8ff] border border-[#c8c4d5]/40 rounded-xl p-3 whitespace-pre-line leading-relaxed text-[#2a2935] max-h-60 overflow-y-auto">
                      {secondaryTicket.description}
                    </div>
                  </div>
                </div>

                {/* Quick Alignment / Sync Actions for Admin */}
                {isAdmin && (
                  <div className="bg-[#f8f9ff] border border-[#c8c4d5]/50 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#0b1c30]">
                      Actions rapides d'alignement (Admin) :
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {primaryTicket.assignedTo?.id && onAssignDev && (
                        <button
                          type="button"
                          onClick={() => {
                            if (primaryTicket.assignedTo?.id) {
                              onAssignDev(secondaryTicket.id, primaryTicket.assignedTo.id);
                              showToast(`Développeur ${primaryTicket.assignedTo.name} assigné à #${secondaryTicket.id}`);
                            }
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-[#eff4ff] border border-[#c8c4d5]/60 rounded-lg text-xs font-bold text-[#1f108e] transition-colors cursor-pointer"
                        >
                          Assigner {primaryTicket.assignedTo.name} au Ticket B
                        </button>
                      )}
                      {primaryTicket.projectId && onAssignProject && (
                        <button
                          type="button"
                          onClick={() => {
                            if (primaryTicket.projectId) {
                              onAssignProject(secondaryTicket.id, primaryTicket.projectId);
                              showToast(`Projet aligné sur #${secondaryTicket.id}`);
                            }
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-[#eff4ff] border border-[#c8c4d5]/60 rounded-lg text-xs font-bold text-[#1f108e] transition-colors cursor-pointer"
                        >
                          Aligner le projet vers Ticket B
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#777584]">
                Sélectionnez un ticket dans le menu déroulant ci-dessus pour lancer la comparaison.
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Edit Ticket Modal if triggered from drawer */}
      {isEditing && primaryTicket && (
        <EditTicketModal
          ticket={primaryTicket}
          developers={developers}
          projects={projects}
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          currentUser={currentUser}
          onSave={(updated) => {
            if (onEditTicket) {
              onEditTicket(updated);
            }
            setIsEditing(false);
            showToast('Ticket mis à jour avec succès.');
          }}
        />
      )}
    </>
  );
};
