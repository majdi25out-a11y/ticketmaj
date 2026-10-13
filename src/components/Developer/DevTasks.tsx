import React, { useState } from 'react';
import { Ticket, Attachment, Developer } from '../../types';
import { EditTicketModal } from '../Tickets/EditTicketModal';

interface DevTasksProps {
  tickets: Ticket[];
  developers?: Developer[];
  onCompleteTask: (ticketId: string, closingNote?: string) => void;
  onToggleClarity: (ticketId: string, clarity: 'clair' | 'clarifier') => void;
  onRefresh: () => void;
  currentUser?: { name: string; role: string; avatar: string; email?: string; id?: string };
  onSelectTicket?: (ticketId: string) => void;
  onAssignDev?: (ticketId: string, devId: string) => void;
  onEditTicket?: (updatedTicket: Ticket) => void;
}

export const DevTasks: React.FC<DevTasksProps> = ({
  tickets,
  developers = [],
  onCompleteTask,
  onToggleClarity,
  onRefresh,
  currentUser,
  onSelectTicket,
  onAssignDev,
  onEditTicket,
}) => {
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<Ticket | null>(null);
  const [editingTask, setEditingTask] = useState<Ticket | null>(null);
  const [closingNote, setClosingNote] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState('10:42');
  const [activeTab, setActiveTab] = useState<'my_tasks' | 'unassigned'>('my_tasks');
  const [selectedDevFilter, setSelectedDevFilter] = useState<string>('all');

  const isAdmin =
    currentUser?.role?.toLowerCase().includes('admin') ||
    currentUser?.role?.toLowerCase().includes('architect') ||
    currentUser?.email === 'admin@ticketflow.io';

  // Filter tasks so developers see their own assigned or proposed tickets, and admin can filter by dev
  const activeDevTasks = tickets.filter((t) => {
    if (t.status === 'completed' || t.status === 'rejected') return false;

    if (isAdmin) {
      if (selectedDevFilter === 'all') {
        return true;
      }
      if (selectedDevFilter === 'unassigned') {
        return !t.assignedTo || !t.assignedTo.id;
      }
      return (
        t.assignedTo &&
        (t.assignedTo.id === selectedDevFilter ||
          t.assignedTo.name?.toLowerCase().trim() === selectedDevFilter.toLowerCase().trim() ||
          (t.assignedTo.email && t.assignedTo.email.toLowerCase().trim() === selectedDevFilter.toLowerCase().trim()))
      );
    }

    const currentName = currentUser?.name?.toLowerCase().trim();
    const currentEmail = currentUser?.email?.toLowerCase().trim();

    const isAssignedToMe =
      t.assignedTo &&
      ((currentName && t.assignedTo.name?.toLowerCase().trim() === currentName) ||
        (currentUser?.id && t.assignedTo.id === currentUser.id) ||
        (currentEmail && t.assignedTo.email?.toLowerCase().trim() === currentEmail));

    const isRequestedByMe =
      t.requestedBy &&
      ((currentName && t.requestedBy.toLowerCase().trim() === currentName) ||
        (currentEmail && t.requestedBy.toLowerCase().trim() === currentEmail));

    return isAssignedToMe || isRequestedByMe;
  });

  const unassignedTickets = tickets.filter(
    (t) => !t.assignedTo && t.status !== 'completed' && t.status !== 'rejected'
  );

  const displayedTasks = activeTab === 'my_tasks' ? activeDevTasks : unassignedTickets;

  const handleDownloadAttachment = (att: Attachment, ticketId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (att.url && (att.url.startsWith('blob:') || att.url.startsWith('data:') || att.url.startsWith('http'))) {
      const link = document.createElement('a');
      link.href = att.url;
      link.download = att.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const fileContent =
        `=========================================\n` +
        `DOCUMENT DU TICKET: ${ticketId}\n` +
        `Fichier: ${att.name}\n` +
        `Type: ${att.type}\n` +
        `Taille: ${att.size}\n` +
        `=========================================\n\n` +
        `[Pièce jointe téléchargée depuis TicketFlow - Espace Développeur]`;

      const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = att.name.includes('.') ? att.name : `${att.name}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
  };

  const handleOpenModal = (task: Ticket) => {
    setSelectedTaskForModal(task);
    setClosingNote('');
  };

  const handleConfirmCompletion = () => {
    if (selectedTaskForModal) {
      onCompleteTask(selectedTaskForModal.id, closingNote);
      setSelectedTaskForModal(null);
    }
  };

  const handleRefreshClick = () => {
    const now = new Date();
    setLastSyncTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    onRefresh();
  };

  return (
    <div className="pt-20 pb-16 px-4 md:px-10 max-w-5xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-[#006c4a] bg-[#82f5c1] px-3 py-1 rounded-full">
              {activeDevTasks.length} Tâches assignées
            </span>
            {isAdmin && unassignedTickets.length > 0 && (
              <span className="text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full">
                {unassignedTickets.length} Non assigné(s)
              </span>
            )}
            <span className="text-xs text-[#777584]">
              • Synchro : {lastSyncTime}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#0b1c30]">Espace Tâches & Assignation</h1>
          <p className="text-sm text-[#464553] max-w-lg mt-1">
            Gérez vos tâches attribuées ou prenez en charge un ticket en attente.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Admin Filter by Developer */}
          {isAdmin && developers && developers.length > 0 && activeTab === 'my_tasks' && (
            <div className="flex items-center gap-1.5 bg-white border border-[#c8c4d5]/60 rounded-xl px-2.5 py-1.5 text-xs text-[#0b1c30]">
              <span className="material-symbols-outlined text-xs text-[#1f108e]">engineering</span>
              <select
                value={selectedDevFilter}
                onChange={(e) => setSelectedDevFilter(e.target.value)}
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
          )}

          {/* Tabs */}
          <div className="flex bg-[#eff4ff] p-1 rounded-xl border border-[#c8c4d5]/40 text-xs font-bold">
            <button
              onClick={() => setActiveTab('my_tasks')}
              className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'my_tasks'
                  ? 'bg-[#1f108e] text-white shadow-xs'
                  : 'text-[#464553] hover:text-[#0b1c30]'
              }`}
            >
              <span className="material-symbols-outlined text-sm">assignment_ind</span>
              <span>{isAdmin ? 'Tâches Développeurs' : 'Mes Tâches'} ({activeDevTasks.length})</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab('unassigned')}
                className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'unassigned'
                    ? 'bg-[#1f108e] text-white shadow-xs'
                    : 'text-[#464553] hover:text-[#0b1c30]'
                }`}
              >
                <span className="material-symbols-outlined text-sm">person_add</span>
                <span>À prendre ({unassignedTickets.length})</span>
              </button>
            )}
          </div>

          <button
            onClick={handleRefreshClick}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-[#c8c4d5] text-[#0b1c30] rounded-xl text-xs font-semibold hover:bg-slate-100 transition-all active:scale-95 shadow-xs cursor-pointer"
            title="Rafraîchir"
          >
            <span className="material-symbols-outlined text-base">sync</span>
          </button>
        </div>
      </div>

      {/* Focus List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#c8c4d5]/50">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#777584] font-geist">
            {activeTab === 'my_tasks' ? 'Statut : Mes tâches en cours' : 'Tickets non assignés en attente'}
          </h3>
          <div className="flex gap-6 text-xs text-[#777584] font-geist">
            <span>Ticket ID</span>
            <span className="hidden md:inline">Priorité</span>
          </div>
        </div>

        {displayedTasks.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-[#c8c4d5]/60 rounded-2xl p-8">
            <span className="material-symbols-outlined text-emerald-500 text-6xl mb-4">
              {activeTab === 'my_tasks' ? 'task_alt' : 'verified'}
            </span>
            <h2 className="text-xl font-bold text-[#0b1c30]">
              {activeTab === 'my_tasks'
                ? 'Toutes vos tâches sont traitées !'
                : 'Aucun ticket non assigné pour le moment.'}
            </h2>
            <p className="text-sm text-[#464553] mt-2">
              {activeTab === 'my_tasks'
                ? 'Basculez sur l\'onglet "À prendre" pour voir les tickets en attente d\'attribution.'
                : 'Tous les tickets ont été pris en charge par l\'équipe.'}
            </p>
          </div>
        ) : (
          displayedTasks.map((task) => (
            <div
              key={task.id}
              className="group flex flex-col md:flex-row items-start md:items-center justify-between p-6 bg-white border border-[#c8c4d5]/60 rounded-2xl hover:border-[#1f108e] transition-all duration-200 shadow-xs gap-4"
            >
              {/* Task Title & Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      task.priority === 'urgent'
                        ? 'bg-red-500'
                        : task.priority === 'high'
                        ? 'bg-orange-500'
                        : 'bg-blue-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => onSelectTicket && onSelectTicket(task.id)}
                    className="font-geist text-xs font-bold text-[#1f108e] hover:underline"
                  >
                    {task.id}
                  </button>
                  <span className="text-[11px] font-semibold text-[#464553] bg-[#eff4ff] px-2.5 py-0.5 rounded font-geist">
                    {task.tags[0] || 'Frontend'}
                  </span>
                  {task.attachments && task.attachments.length > 0 && (
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 font-geist">
                      <span className="material-symbols-outlined text-xs">attach_file</span>
                      <span>{task.attachments.length} p.j.</span>
                    </span>
                  )}
                </div>

                <h4
                  onClick={() => onSelectTicket && onSelectTicket(task.id)}
                  className="text-base font-bold text-[#0b1c30] mb-1 hover:text-[#1f108e] cursor-pointer"
                >
                  {task.title}
                </h4>
                <p className="text-xs text-[#464553] truncate max-w-2xl">
                  {task.description}
                </p>

                {/* Attachments preview list if present */}
                {task.attachments && task.attachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {task.attachments.map((att) => (
                      <button
                        key={att.id}
                        type="button"
                        onClick={(e) => handleDownloadAttachment(att, task.id, e)}
                        title={`Télécharger ${att.name}`}
                        className="flex items-center gap-1.5 bg-[#eff4ff] hover:bg-[#1f108e] text-[#1f108e] hover:text-white border border-[#c8c4d5]/50 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors shadow-2xs group/att cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-xs">{att.icon || 'attach_file'}</span>
                        <span className="truncate max-w-[140px] font-bold">{att.name}</span>
                        <span className="text-[9px] text-[#777584] group-hover/att:text-white/80">({att.size})</span>
                        <span className="material-symbols-outlined text-xs ml-0.5">download</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Toggles & Completion button */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Clarity Toggle */}
                <div className="flex bg-[#eff4ff] p-0.5 rounded-xl border border-[#c8c4d5]/30">
                  <button
                    onClick={() => onToggleClarity(task.id, 'clair')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                      task.clarity !== 'clarifier'
                        ? 'bg-white text-[#1f108e] shadow-xs'
                        : 'text-[#464553] hover:text-[#0b1c30]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    <span>Clair</span>
                  </button>
                  <button
                    onClick={() => onToggleClarity(task.id, 'clarifier')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                      task.clarity === 'clarifier'
                        ? 'bg-white text-amber-800 shadow-xs'
                        : 'text-[#464553] hover:text-[#0b1c30]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">help</span>
                    <span>À clarifier</span>
                  </button>
                </div>

                {/* Completion, Edit, or Self-Assign Button */}
                {activeTab === 'unassigned' ? (
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button
                        onClick={() => setEditingTask(task)}
                        className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        title="Modifier ce ticket (Réservé aux administrateurs)"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                        <span>Modifier</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (onAssignDev) {
                          onAssignDev(task.id, currentUser?.id || currentUser?.email || currentUser?.name || 'self');
                          setActiveTab('my_tasks');
                        }
                      }}
                      className="px-5 py-2.5 bg-[#1f108e] text-white rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">person_add</span>
                      <span>M'assigner ce ticket</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button
                        onClick={() => setEditingTask(task)}
                        className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        title="Modifier ce ticket (Réservé aux administrateurs)"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                        <span>Modifier</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenModal(task)}
                      className="px-5 py-2.5 bg-[#006c4a] text-white rounded-xl text-xs font-semibold hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer"
                    >
                      Marquer comme Terminé
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Edit Ticket Modal */}
      {editingTask && (
        <EditTicketModal
          ticket={editingTask}
          developers={developers}
          isOpen={Boolean(editingTask)}
          onClose={() => setEditingTask(null)}
          currentUser={currentUser}
          onSave={(updated) => {
            if (onEditTicket) {
              onEditTicket(updated);
            }
            setEditingTask(null);
          }}
        />
      )}

      {/* Confirmation Modal */}
      {selectedTaskForModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border border-[#c8c4d5]/60 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#c8c4d5]/40 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0">
                  <span className="material-symbols-outlined">check_circle</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0b1c30]">Confirmer la fin</h3>
                  <p className="text-xs font-bold text-[#777584] uppercase font-geist">
                    {selectedTaskForModal.id}
                  </p>
                </div>
              </div>

              <p className="text-sm font-semibold text-[#0b1c30]">
                {selectedTaskForModal.title}
              </p>

              <div className="bg-[#eff4ff] p-3 rounded-xl text-xs text-[#464553]">
                <p className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  <span>Horodatage : </span>
                  <span className="text-[#0b1c30] font-mono font-bold">
                    {new Date().toISOString().replace('T', ' ').split('.')[0]}
                  </span>
                </p>
              </div>

              <textarea
                value={closingNote}
                onChange={(e) => setClosingNote(e.target.value)}
                rows={3}
                placeholder="Note optionnelle de clôture..."
                className="w-full p-3 text-xs border border-[#c8c4d5] rounded-xl focus:ring-2 focus:ring-[#3730a3]/20 focus:border-[#1f108e] outline-none resize-none"
              />
            </div>

            <div className="bg-[#eff4ff] px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setSelectedTaskForModal(null)}
                className="px-4 py-2 text-xs font-semibold text-[#464553] hover:bg-[#dce9ff] rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmCompletion}
                className="px-5 py-2 bg-[#006c4a] text-white rounded-xl text-xs font-semibold hover:brightness-110 active:scale-95 transition-all shadow-sm"
              >
                Valider la tâche
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
