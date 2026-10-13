import React, { useState } from 'react';
import { Ticket, Comment, Attachment, Developer, Project } from '../../types';
import { EditTicketModal } from './EditTicketModal';
import { processAttachmentFile } from '../../utils/fileCompressor';
import { VoiceRecorder } from '../Audio/VoiceRecorder';
import { AudioPlayer } from '../Audio/AudioPlayer';

interface TicketDetailProps {
  ticket: Ticket;
  developers?: Developer[];
  projects?: Project[];
  onBack: () => void;
  onUpdateTicketStatus: (ticketId: string, newStatus: Ticket['status'], newStatusLabel: string) => void;
  onAddComment: (ticketId: string, comment: Comment) => void;
  onAddAttachments?: (ticketId: string, attachments: Attachment[]) => void;
  onSelectRelatedTicket: (ticketId: string) => void;
  currentUser: {
    name: string;
    role: string;
    avatar: string;
    email?: string;
    id?: string;
  };
  onAssignDev?: (ticketId: string, devId: string) => void;
  onValidateTicket?: (ticketId: string, devId?: string) => void;
  onDeleteTicket?: (ticketId: string) => void;
  onToggleClarity?: (ticketId: string, clarity: 'clair' | 'clarifier') => void;
  onEditTicket?: (updatedTicket: Ticket) => void;
  onAssignProject?: (ticketId: string, projectId: string) => void;
}

export const TicketDetail: React.FC<TicketDetailProps> = ({
  ticket,
  developers = [],
  projects = [],
  onBack,
  onUpdateTicketStatus,
  onAddComment,
  onAddAttachments,
  onSelectRelatedTicket,
  currentUser,
  onAssignDev,
  onValidateTicket,
  onDeleteTicket,
  onToggleClarity,
  onEditTicket,
  onAssignProject,
}) => {
  const [replyText, setReplyText] = useState('');
  const [isItalicMode, setIsItalicMode] = useState(false);
  const [isBoldMode, setIsBoldMode] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [showCommentRecorder, setShowCommentRecorder] = useState(false);
  const [showAttachmentRecorder, setShowAttachmentRecorder] = useState(false);
  const [commentAudioData, setCommentAudioData] = useState<{
    url: string;
    duration: number;
    name: string;
    size: string;
  } | null>(null);
  const [commentAttachments, setCommentAttachments] = useState<Attachment[]>([]);

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploadingAttachment(true);
    showToast('Optimisation de la pièce jointe en cours...');

    try {
      const filesArray: File[] = Array.from(e.target.files);
      const newAtts = await Promise.all(
        filesArray.map((f: File) => processAttachmentFile(f))
      );

      if (onAddAttachments) {
        onAddAttachments(ticket.id, newAtts);
      } else {
        const updatedAttachments = [...(ticket.attachments || []), ...newAtts];
        await fetch(`/api/tickets/${ticket.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attachments: updatedAttachments }),
        });
      }

      showToast(`${newAtts.length} pièce(s) jointe(s) enregistrée(s) dans la base !`);
    } catch (err) {
      console.error('Erreur téléversement pièce jointe :', err);
      showToast('Erreur lors de l\'ajout de la pièce jointe.');
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const handleCommentAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploadingAttachment(true);

    try {
      const filesArray: File[] = Array.from(e.target.files);
      const newAtts = await Promise.all(
        filesArray.map((f: File) => processAttachmentFile(f))
      );
      setCommentAttachments((prev) => [...prev, ...newAtts]);
      showToast(`${newAtts.length} fichier(s) joint(s) à la réponse.`);
    } catch (err) {
      console.error('Erreur fichier commentaire :', err);
      showToast('Erreur lors de l\'ajout du fichier.');
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const handleSaveAttachmentAudio = async (audioData: {
    url: string;
    duration: number;
    name: string;
    size: string;
  }) => {
    const newAudioAtt: Attachment = {
      id: `audio-att-${Date.now()}`,
      name: audioData.name,
      size: audioData.size,
      type: 'audio/webm',
      icon: 'mic',
      url: audioData.url,
      duration: audioData.duration,
    };

    if (onAddAttachments) {
      onAddAttachments(ticket.id, [newAudioAtt]);
    } else {
      const updatedAttachments = [...(ticket.attachments || []), newAudioAtt];
      await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachments: updatedAttachments }),
      });
    }

    setShowAttachmentRecorder(false);
    showToast('Remarque vocale enregistrée dans la base !');
  };

  const handleDeleteAttachment = async (attId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updatedAtts = (ticket.attachments || []).filter((a) => a.id !== attId);
    if (onEditTicket) {
      onEditTicket({ ...ticket, attachments: updatedAtts });
    } else {
      await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachments: updatedAtts }),
      });
    }
    showToast('Pièce jointe supprimée avec succès.');
  };

  const handleSaveCommentAudio = (audioData: {
    url: string;
    duration: number;
    name: string;
    size: string;
  }) => {
    setCommentAudioData(audioData);
    setShowCommentRecorder(false);
  };

  const matchingDev = developers.find(
    (dev) =>
      dev.name.toLowerCase().trim() === ticket.requestedBy.toLowerCase().trim() ||
      (dev.email && dev.email.toLowerCase().trim() === ticket.requestedBy.toLowerCase().trim())
  );

  const [selectedDevId, setSelectedDevId] = useState<string>(
    ticket.assignedTo?.id || ''
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDownloadAttachment = (att: Attachment, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    showToast(`Téléchargement de ${att.name}...`);

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
        `DOCUMENT DU TICKET: ${ticket.id}\n` +
        `Fichier: ${att.name}\n` +
        `Type: ${att.type}\n` +
        `Taille: ${att.size}\n` +
        `Demandé par: ${ticket.requestedBy}\n` +
        `Titre du Ticket: ${ticket.title}\n` +
        `=========================================\n\n` +
        `Description du ticket:\n${ticket.description}\n\n` +
        `[Pièce jointe téléchargée depuis TicketFlow]`;

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

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() && !commentAudioData && commentAttachments.length === 0) return;

    let roleType: 'admin' | 'dev' | 'manager' | 'user' = 'user';
    if (currentUser.role.toLowerCase().includes('admin')) roleType = 'admin';
    else if (currentUser.role.toLowerCase().includes('dev')) roleType = 'dev';
    else if (currentUser.role.toLowerCase().includes('manager')) roleType = 'manager';

    const newComment: Comment = {
      id: `c-${Date.now()}`,
      author: currentUser.name,
      avatar: currentUser.avatar,
      role: currentUser.role,
      roleType,
      timestamp: `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC`,
      content: replyText.trim() || (commentAudioData ? 'Remarque vocale jointe' : 'Pièce jointe ajoutée'),
      isItalic: isItalicMode,
      audioUrl: commentAudioData?.url,
      audioDuration: commentAudioData?.duration,
      attachments: commentAttachments.length > 0 ? commentAttachments : undefined,
    };

    onAddComment(ticket.id, newComment);
    if (commentAttachments.length > 0 && onAddAttachments) {
      onAddAttachments(ticket.id, commentAttachments);
    }
    setReplyText('');
    setCommentAudioData(null);
    setCommentAttachments([]);
    setShowCommentRecorder(false);
    showToast('Commentaire et médias enregistrés avec succès !');
  };

  const handleStatusChange = (status: Ticket['status'], label: string) => {
    onUpdateTicketStatus(ticket.id, status, label);
    setShowActionsDropdown(false);
    showToast(`Statut mis à jour : ${label}`);
  };

  const isAdmin =
    currentUser.role?.toLowerCase().includes('admin') ||
    currentUser.role?.toLowerCase().includes('architecte') ||
    currentUser.role?.toLowerCase().includes('architect') ||
    currentUser.email === 'admin@ticketflow.io';
  const canValidate = isAdmin;

  // Seuls les administrateurs ont le droit de modifier les tickets
  const canEditTicket = isAdmin;

  return (
    <div className="pt-20 pb-16 px-4 md:px-10 max-w-[1400px] mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0b1c30] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-5">
          <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb & Top Actions Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[#464553] text-xs font-geist mb-1">
            <button onClick={onBack} className="hover:underline hover:text-[#1f108e]">
              Tickets
            </button>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="font-bold text-[#1f108e]">{ticket.id}</span>
            {ticket.projectName && (
              <>
                <span className="text-[#c8c4d5]">•</span>
                <span 
                  className="px-2 py-0.5 rounded-md text-[11px] font-bold text-white shadow-2xs flex items-center gap-1"
                  style={{ backgroundColor: ticket.projectColor || '#1f108e' }}
                >
                  <span className="material-symbols-outlined text-xs">folder_open</span>
                  {ticket.projectCode ? `[${ticket.projectCode}] ` : ''}{ticket.projectName}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-[#0b1c30] tracking-tight">
              {ticket.title}
            </h1>
            {canEditTicket && (
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="p-1 text-[#777584] hover:text-[#1f108e] hover:bg-[#eff4ff] rounded-lg transition-colors cursor-pointer"
                title="Modifier le titre et les détails du ticket"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 relative">
          {canEditTicket && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 px-3.5 h-10 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="Modifier toutes les propriétés du ticket (Titre, description, pièces jointes, projet, statut...)"
            >
              <span className="material-symbols-outlined text-base">edit</span>
              <span>Modifier le ticket</span>
            </button>
          )}

          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              showToast('Lien du ticket copié dans le presse-papier !');
            }}
            className="bg-white border border-[#c8c4d5] px-4 h-10 rounded-xl text-xs font-semibold flex items-center gap-2 hover:bg-[#eff4ff] transition-colors"
          >
            <span className="material-symbols-outlined text-base">share</span>
            <span>Partager</span>
          </button>

          {/* Dropdown Menu for Actions */}
          <div className="relative">
            <button
              onClick={() => setShowActionsDropdown(!showActionsDropdown)}
              className="bg-[#1f108e] text-white px-4 h-10 rounded-xl text-xs font-semibold flex items-center gap-2 active:scale-95 transition-transform shadow-md shadow-[#1f108e]/20"
            >
              <span className="material-symbols-outlined text-base">play_arrow</span>
              <span>Actions</span>
              <span className="material-symbols-outlined text-xs">expand_more</span>
            </button>

            {showActionsDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-[#c8c4d5]/60 rounded-xl shadow-xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                {isAdmin && (
                  <>
                    <div className="px-3 py-1.5 text-[10px] font-bold text-[#777584] uppercase">
                      Assignation
                    </div>
                    <button
                      onClick={() => {
                        setShowActionsDropdown(false);
                        if (onAssignDev) {
                          onAssignDev(ticket.id, currentUser.id || currentUser.email || currentUser.name || 'self');
                          showToast('Ticket assigné à vous-même !');
                        }
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-indigo-50 flex items-center gap-2 text-[#1f108e] font-bold"
                    >
                      <span className="material-symbols-outlined text-base">person_add</span>
                      <span>S'assigner ce ticket</span>
                    </button>
                  </>
                )}

                <div className="px-3 py-1.5 text-[10px] font-bold text-[#777584] uppercase pt-1 border-t border-[#c8c4d5]/40">
                  Changer le statut
                </div>
                <button
                  onClick={() => handleStatusChange('in_progress', 'En cours')}
                  className="w-full text-left px-3 py-2 hover:bg-[#eff4ff] flex items-center gap-2 text-[#0b1c30]"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>Passer en cours</span>
                </button>
                <button
                  onClick={() => handleStatusChange('completed', 'Terminé')}
                  className="w-full text-left px-3 py-2 hover:bg-[#eff4ff] flex items-center gap-2 text-[#0b1c30]"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  <span>Marquer comme Terminé</span>
                </button>
                <button
                  onClick={() => handleStatusChange('rejected', 'Rejeté')}
                  className="w-full text-left px-3 py-2 hover:bg-[#eff4ff] flex items-center gap-2 text-[#ba1a1a]"
                >
                  <span className="w-2 h-2 rounded-full bg-[#ba1a1a]"></span>
                  <span>Rejeter le ticket</span>
                </button>

                {onToggleClarity && (
                  <div className="pt-1.5 mt-1 border-t border-[#c8c4d5]/40">
                    <button
                      onClick={() => {
                        setShowActionsDropdown(false);
                        const nextClarity = ticket.clarity === 'clarifier' ? 'clair' : 'clarifier';
                        onToggleClarity(ticket.id, nextClarity);
                        showToast(nextClarity === 'clarifier' ? 'Ticket marqué "À clarifier"' : 'Ticket marqué "Clair"');
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-amber-50 flex items-center gap-2 text-amber-900 font-bold"
                    >
                      <span className="material-symbols-outlined text-base">
                        {ticket.clarity === 'clarifier' ? 'check_circle' : 'help'}
                      </span>
                      <span>{ticket.clarity === 'clarifier' ? 'Marquer comme Clair' : 'Marquer "À clarifier"'}</span>
                    </button>
                  </div>
                )}

                {canEditTicket && (
                  <div className="pt-1.5 mt-1 border-t border-[#c8c4d5]/40">
                    <button
                      onClick={() => {
                        setShowActionsDropdown(false);
                        setIsEditModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-amber-50 flex items-center gap-2 text-amber-900 font-bold"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                      <span>Modifier le ticket</span>
                    </button>
                  </div>
                )}

                {isAdmin && onDeleteTicket && (
                  <div className="pt-1.5 mt-1 border-t border-[#c8c4d5]/40">
                    <button
                      onClick={() => {
                        setShowActionsDropdown(false);
                        if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement le ticket #${ticket.id} ("${ticket.title}") ?`)) {
                          onDeleteTicket(ticket.id);
                        }
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-red-50 flex items-center gap-2 text-[#ba1a1a] font-bold"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                      <span>Supprimer le ticket</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clarification Requested Banner (if ticket clarity is 'clarifier') */}
      {ticket.clarity === 'clarifier' && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <span className="material-symbols-outlined text-xl">help</span>
            </div>
            <div>
              <p className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
                <span>⚠️ Clarification requise par le développeur</span>
                <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  À clarifier
                </span>
              </p>
              <p className="text-xs text-amber-900 mt-0.5">
                Ce ticket nécessite des précisions techniques ou fonctionnelles complémentaires pour permettre sa résolution efficace.
              </p>
            </div>
          </div>

          {onToggleClarity && (
            <button
              onClick={() => {
                onToggleClarity(ticket.id, 'clair');
                showToast('Clarification apportée : Ticket marqué comme Clair !');
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0"
            >
              <span className="material-symbols-outlined text-sm">check_circle</span>
              <span>Apporter la clarification (Marquer Clair)</span>
            </button>
          )}
        </div>
      )}

      {/* Pending Validation Banner (if ticket is pending) */}
      {ticket.status === 'pending' && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-xl">hourglass_top</span>
            </div>
            <div>
              <p className="text-sm font-bold text-amber-950 flex items-center gap-2">
                <span>Ticket en attente de validation</span>
                {matchingDev && (
                  <span className="bg-purple-100 text-[#1f108e] text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200">
                    Proposé par {matchingDev.name}
                  </span>
                )}
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                {isAdmin
                  ? "Validez ce ticket et assignez-le à un développeur pour démarrer la résolution."
                  : "Ce ticket est en attente de validation et d'assignation par un administrateur."}
              </p>
            </div>
          </div>

          {canValidate ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
              {developers.length > 0 && (
                <select
                  value={selectedDevId}
                  onChange={(e) => setSelectedDevId(e.target.value)}
                  className="bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs text-[#0b1c30] font-semibold focus:ring-2 focus:ring-[#1f108e]/30 outline-none"
                >
                  <option value="">Sélectionner Développeur...</option>
                  {developers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.role})
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={() => {
                  if (onValidateTicket) {
                    onValidateTicket(ticket.id, selectedDevId);
                    showToast('Ticket validé & assigné avec succès !');
                  } else {
                    onUpdateTicketStatus(ticket.id, 'in_progress', 'En cours');
                    if (onAssignDev && selectedDevId) onAssignDev(ticket.id, selectedDevId);
                    showToast('Ticket validé & assigné !');
                  }
                }}
                className="bg-[#1f108e] text-white px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">verified</span>
                <span>Valider & Assigner</span>
              </button>

              <button
                onClick={() => {
                  onUpdateTicketStatus(ticket.id, 'rejected', 'Rejeté');
                  showToast('Ticket rejeté.');
                }}
                className="border border-amber-300 text-amber-900 bg-white hover:bg-amber-100 px-3 py-2 rounded-xl text-xs font-bold transition-all"
              >
                Rejeter
              </button>
            </div>
          ) : (
            <div className="text-xs font-bold text-amber-900 bg-amber-100/80 px-3 py-2 rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-amber-700">lock</span>
              <span>Assignation réservée à l'administrateur</span>
            </div>
          )}
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column (Main Ticket Body & Discussion Thread) */}
        <div className="col-span-12 xl:col-span-8 space-y-6">
          {/* Ticket Description Card */}
          <section className="bg-white rounded-2xl border border-[#c8c4d5]/60 p-6 shadow-xs">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base font-bold text-[#0b1c30]">Description</h2>
                <span className="text-[10px] font-semibold text-slate-600 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  <span className="material-symbols-outlined text-xs">person</span>
                  Demandeur : {ticket.requestedBy}
                </span>
                {canEditTicket && (
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="px-2.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    title="Modifier la description et les détails du ticket"
                  >
                    <span className="material-symbols-outlined text-xs">edit</span>
                    <span>Modifier</span>
                  </button>
                )}
              </div>
              {ticket.priority === 'urgent' && (
                <span className="bg-[#ffdad6] text-[#93000a] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#ba1a1a] animate-pulse"></span>
                  <span>Urgent Priority</span>
                </span>
              )}
            </div>

            <div className="prose prose-slate max-w-none text-xs md:text-sm text-[#464553] leading-relaxed whitespace-pre-wrap font-normal">
              {ticket.description}
            </div>

            {/* Attachments Section */}
            <div className="mt-6 pt-5 border-t border-[#c8c4d5]/40">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 className="text-xs font-bold text-[#0b1c30] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#1f108e]">attach_file</span>
                  <span>Pièces jointes ({ticket.attachments ? ticket.attachments.length : 0})</span>
                </h3>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Record Voice Note Button */}
                  <button
                    type="button"
                    onClick={() => setShowAttachmentRecorder(!showAttachmentRecorder)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border active:scale-95 cursor-pointer ${
                      showAttachmentRecorder
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-[#eff4ff] hover:bg-[#1f108e] text-[#1f108e] hover:text-white border-[#c8c4d5]/60'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">
                      {showAttachmentRecorder ? 'close' : 'mic'}
                    </span>
                    <span>{showAttachmentRecorder ? 'Fermer micro' : 'Note vocale'}</span>
                  </button>

                  <label className="bg-[#eff4ff] hover:bg-[#1f108e] text-[#1f108e] hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 border border-[#c8c4d5]/60 active:scale-95">
                    <span className="material-symbols-outlined text-base">add_a_photo</span>
                    <span>{isUploadingAttachment ? 'Envoi...' : 'Ajouter un fichier'}</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*, audio/*, application/pdf, .doc, .docx, .txt, .zip, .rar"
                      onChange={handleAttachmentUpload}
                      disabled={isUploadingAttachment}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Inline Voice Recorder for Attachments */}
              {showAttachmentRecorder && (
                <div className="mb-4">
                  <VoiceRecorder
                    title="Ajouter une remarque vocale à ce ticket"
                    onSaveAudio={handleSaveAttachmentAudio}
                    onCancel={() => setShowAttachmentRecorder(false)}
                  />
                </div>
              )}

              {ticket.attachments && ticket.attachments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ticket.attachments.map((att) => {
                    const isAudio =
                      att.type?.includes('audio') ||
                      att.name.endsWith('.webm') ||
                      att.name.endsWith('.mp3') ||
                      att.name.endsWith('.wav') ||
                      att.name.endsWith('.m4a') ||
                      att.name.endsWith('.ogg') ||
                      att.icon === 'mic';
                    const isImg =
                      !isAudio &&
                      (att.icon === 'image' ||
                        att.url?.startsWith('data:image') ||
                        att.type === 'PNG' ||
                        att.type === 'JPG' ||
                        att.type === 'JPEG');

                    if (isAudio && att.url) {
                      return (
                        <div key={att.id} className="col-span-1 sm:col-span-2 flex items-center gap-2">
                          <div className="flex-1">
                            <AudioPlayer
                              src={att.url}
                              duration={att.duration}
                              fileName={att.name}
                              size={att.size}
                            />
                          </div>
                          {canEditTicket && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteAttachment(att.id, e)}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                              title="Supprimer cette note vocale"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={att.id}
                        onClick={(e) => handleDownloadAttachment(att, e)}
                        className="flex items-center p-2.5 border border-[#c8c4d5]/50 rounded-xl hover:border-[#1f108e] hover:bg-[#eff4ff] cursor-pointer transition-colors group bg-[#eff4ff]/20"
                        title={`Cliquer pour voir/télécharger ${att.name}`}
                      >
                        {isImg && att.url ? (
                          <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0 flex items-center justify-center">
                            <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-[#e5eeff] rounded-lg flex items-center justify-center text-[#1f108e] group-hover:bg-[#1f108e] group-hover:text-white transition-colors flex-shrink-0">
                            <span className="material-symbols-outlined">{att.icon || 'attach_file'}</span>
                          </div>
                        )}
                        <div className="ml-3 overflow-hidden flex-1">
                          <p className="text-xs font-bold text-[#0b1c30] truncate group-hover:text-[#1f108e]">
                            {att.name}
                          </p>
                          <p className="text-[10px] text-[#777584]">
                            {att.size} • {att.type}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleDownloadAttachment(att, e)}
                            className="p-2 text-[#777584] hover:text-[#1f108e] hover:bg-white rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                          >
                            <span className="material-symbols-outlined text-base">download</span>
                            <span className="hidden sm:inline text-[11px]">Télécharger</span>
                          </button>
                          {canEditTicket && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteAttachment(att.id, e)}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
                              title="Supprimer cette pièce jointe"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[#777584] italic bg-[#f8f9ff] p-3 rounded-xl border border-dashed border-[#c8c4d5]/50">
                  Aucune pièce jointe. Vous pouvez enregistrer une note vocale ou joindre un fichier ci-dessus.
                </p>
              )}
            </div>
          </section>

          {/* Discussion Thread ("Espaces d'échange") */}
          <section className="bg-white rounded-2xl border border-[#c8c4d5]/60 overflow-hidden shadow-xs flex flex-col h-[650px]">
            {/* Card Header */}
            <div className="px-6 py-4 border-b border-[#c8c4d5]/40 bg-[#eff4ff] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1f108e]">forum</span>
                <h2 className="text-base font-bold text-[#0b1c30]">Espaces d'échange</h2>
              </div>
              <span className="text-xs text-[#777584]">
                {ticket.comments ? ticket.comments.length : 0} Commentaires
              </span>
            </div>

            {/* Scrollable Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#f8f9ff]">
              {ticket.comments && ticket.comments.length > 0 ? (
                ticket.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden border border-[#c8c4d5]">
                      <img
                        src={comment.avatar}
                        alt={comment.author}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#0b1c30]">
                          {comment.author}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            comment.roleType === 'admin'
                              ? 'bg-[#3730a3] text-white'
                              : comment.roleType === 'dev'
                              ? 'bg-[#82f5c1] text-[#002114]'
                              : comment.roleType === 'manager'
                              ? 'bg-[#eaddff] text-[#5a00c6]'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {comment.role}
                        </span>
                        <span className="text-[11px] text-[#777584] font-geist">
                          {comment.timestamp}
                        </span>
                      </div>
                      <div
                        className={`p-3.5 bg-white border border-[#c8c4d5]/50 rounded-xl rounded-tl-none shadow-2xs text-xs text-[#464553] leading-relaxed space-y-2 ${
                          comment.isItalic ? 'italic' : ''
                        }`}
                      >
                        {comment.content && (
                          <p>{comment.content}</p>
                        )}
                        {/* Audio Comment Player */}
                        {comment.audioUrl && (
                          <div className="pt-1">
                            <AudioPlayer
                              src={comment.audioUrl}
                              duration={comment.audioDuration}
                              fileName="Remarque vocale"
                            />
                          </div>
                        )}
                        {/* Attached Files to Comment */}
                        {comment.attachments && comment.attachments.length > 0 && (
                          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {comment.attachments.map((att) => {
                              const isAttAudio = att.type?.includes('audio') || att.icon === 'mic';
                              if (isAttAudio && att.url) {
                                return (
                                  <div key={att.id} className="col-span-1 sm:col-span-2">
                                    <AudioPlayer src={att.url} duration={att.duration} fileName={att.name} />
                                  </div>
                                );
                              }
                              return (
                                <div
                                  key={att.id}
                                  onClick={(e) => handleDownloadAttachment(att, e)}
                                  className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg hover:border-[#1f108e] hover:bg-[#eff4ff] cursor-pointer text-[11px]"
                                >
                                  <span className="material-symbols-outlined text-sm text-[#1f108e]">{att.icon || 'attach_file'}</span>
                                  <span className="font-bold text-[#0b1c30] truncate flex-1">{att.name}</span>
                                  <span className="text-[10px] text-[#777584]">{att.size}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-xs text-[#777584]">
                  Aucun commentaire pour l'instant. Soyez le premier à répondre !
                </div>
              )}

              {/* Status Change Timeline Marker */}
              <div className="flex items-center gap-3 py-2">
                <div className="h-px flex-1 bg-[#c8c4d5]/40"></div>
                <span className="text-xs text-[#777584] italic">
                  Statut actuel :{' '}
                  <span className="text-[#006c4a] font-bold">{ticket.statusLabel}</span>
                </span>
                <div className="h-px flex-1 bg-[#c8c4d5]/40"></div>
              </div>
            </div>

            {/* Reply Input Box with Audio Recording */}
            <form
              onSubmit={handleSendReply}
              className="p-4 border-t border-[#c8c4d5]/40 bg-white space-y-3"
            >
              {/* Comment Voice Recorder Panel */}
              {showCommentRecorder && (
                <VoiceRecorder
                  title="Enregistrer un message vocal"
                  onSaveAudio={handleSaveCommentAudio}
                  onCancel={() => setShowCommentRecorder(false)}
                />
              )}

              {/* Comment Audio Preview before sending */}
              {commentAudioData && (
                <div className="p-2.5 bg-[#eff4ff] rounded-xl border border-[#c8c4d5]/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="material-symbols-outlined text-base text-[#1f108e]">mic</span>
                    <span className="text-xs font-bold text-[#0b1c30] truncate">
                      {commentAudioData.name} ({commentAudioData.size})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCommentAudioData(null)}
                    className="text-[#777584] hover:text-[#ba1a1a] p-1 text-xs"
                    title="Supprimer la note vocale"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
              )}

              {/* Comment Attachments Preview before sending */}
              {commentAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {commentAttachments.map((att, idx) => (
                    <div
                      key={att.id || idx}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <span className="material-symbols-outlined text-xs text-[#1f108e]">{att.icon || 'attach_file'}</span>
                      <span className="font-medium text-slate-800 max-w-[140px] truncate">{att.name}</span>
                      <button
                        type="button"
                        onClick={() => setCommentAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-600 ml-1"
                      >
                        <span className="material-symbols-outlined text-xs">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between gap-3 text-[#777584]">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsBoldMode(!isBoldMode)}
                    className={`p-1 rounded hover:text-[#1f108e] ${
                      isBoldMode ? 'bg-[#e5eeff] text-[#1f108e]' : ''
                    }`}
                    title="Gras"
                  >
                    <span className="material-symbols-outlined text-base">format_bold</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsItalicMode(!isItalicMode)}
                    className={`p-1 rounded hover:text-[#1f108e] ${
                      isItalicMode ? 'bg-[#e5eeff] text-[#1f108e]' : ''
                    }`}
                    title="Italique"
                  >
                    <span className="material-symbols-outlined text-base">format_italic</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => showToast('Lien inséré')}
                    className="p-1 rounded hover:text-[#1f108e]"
                    title="Insérer un lien"
                  >
                    <span className="material-symbols-outlined text-base">link</span>
                  </button>
                  <label className="p-1 rounded hover:text-[#1f108e] cursor-pointer" title="Joindre un fichier ou une photo à cette réponse">
                    <span className="material-symbols-outlined text-base">attach_file</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*, audio/*, application/pdf, .doc, .docx, .txt, .zip, .rar"
                      onChange={handleCommentAttachmentUpload}
                      disabled={isUploadingAttachment}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Microphone Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowCommentRecorder(!showCommentRecorder)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                    showCommentRecorder
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-[#eff4ff] text-[#1f108e] border-[#c8c4d5]/60 hover:bg-[#e0eaff]'
                  }`}
                  title="Enregistrer un message vocal"
                >
                  <span className="material-symbols-outlined text-base">mic</span>
                  <span className="hidden sm:inline">Note vocale</span>
                </button>
              </div>

              <div className="flex gap-3 items-end">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={commentAudioData || commentAttachments.length > 0 ? "Ajouter un commentaire texte facultatif..." : "Écrire une réponse ou enregistrer un vocal..."}
                  rows={2}
                  className={`flex-1 border border-[#c8c4d5]/60 rounded-xl p-3 text-xs focus:ring-2 focus:ring-[#1f108e]/20 focus:border-[#1f108e] outline-none resize-none ${
                    isItalicMode ? 'italic' : ''
                  } ${isBoldMode ? 'font-bold' : ''}`}
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() && !commentAudioData && commentAttachments.length === 0}
                  className="bg-[#1f108e] text-white w-10 h-10 rounded-xl flex items-center justify-center hover:opacity-90 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex-shrink-0"
                  title="Envoyer le commentaire"
                >
                  <span className="material-symbols-outlined text-lg">send</span>
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Right Bento Metadata Column */}
        <div className="col-span-12 xl:col-span-4 space-y-6">
          {/* Metadata Card */}
          <section className="bg-white rounded-2xl border border-[#c8c4d5]/60 p-6 shadow-xs">
            <h2 className="text-xs font-bold text-[#777584] mb-4 uppercase tracking-widest font-geist">
              Metadata
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs gap-2">
                <span className="text-[#464553] shrink-0 font-medium">Projet</span>
                {isAdmin && projects && projects.length > 0 ? (
                  <select
                    value={ticket.projectId || ''}
                    onChange={(e) => {
                      const newProjId = e.target.value;
                      if (onAssignProject) {
                        onAssignProject(ticket.id, newProjId);
                        const pName = projects.find((p) => p.id === newProjId)?.name;
                        showToast(newProjId ? `Ticket assigné au projet "${pName}"` : 'Ticket dissocié du projet');
                      }
                    }}
                    className="bg-[#eff4ff] border border-[#c8c4d5]/70 rounded-lg px-2.5 py-1 text-xs text-[#0b1c30] font-semibold focus:ring-2 focus:ring-[#1f108e]/30 outline-none max-w-[180px] cursor-pointer"
                    style={{
                      backgroundColor: ticket.projectColor ? `${ticket.projectColor}15` : '#eff4ff',
                      color: ticket.projectColor || '#1f108e',
                      borderColor: ticket.projectColor ? `${ticket.projectColor}50` : '#c8c4d5',
                    }}
                  >
                    <option value="" className="text-[#0b1c30] bg-white">Sans projet</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} className="text-[#0b1c30] bg-white">
                        {p.code ? `[${p.code}] ` : ''}{p.name}
                      </option>
                    ))}
                  </select>
                ) : ticket.projectName ? (
                  <span 
                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-2xs flex items-center gap-1"
                    style={{ backgroundColor: ticket.projectColor || '#1f108e' }}
                  >
                    <span className="material-symbols-outlined text-xs">folder</span>
                    {ticket.projectCode ? `[${ticket.projectCode}] ` : ''}{ticket.projectName}
                  </span>
                ) : (
                  <span className="text-[11px] text-[#777584] italic">Aucun projet</span>
                )}
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-[#464553]">Status</span>
                <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-bold">
                  {ticket.statusLabel}
                </span>
              </div>

              <div className="flex justify-between items-start text-xs gap-2">
                <span className="text-[#464553] shrink-0 pt-1">Assigned to</span>
                <div className="flex flex-col items-end gap-1.5">
                  {isAdmin && developers && developers.length > 0 ? (
                    <select
                      value={ticket.assignedTo?.id || selectedDevId || ''}
                      onChange={(e) => {
                        const newDevId = e.target.value;
                        setSelectedDevId(newDevId);
                        if (onAssignDev && newDevId) {
                          onAssignDev(ticket.id, newDevId);
                          showToast(`Ticket assigné au développeur !`);
                        }
                      }}
                      className="bg-[#eff4ff] border border-[#c8c4d5]/60 rounded-lg px-2 py-1 text-xs text-[#0b1c30] font-semibold focus:ring-2 focus:ring-[#1f108e]/30 outline-none max-w-[180px]"
                    >
                      <option value="">Non assigné / Choisir...</option>
                      {developers.map((dev) => (
                        <option key={dev.id} value={dev.id}>
                          {dev.name} {dev.name === currentUser.name ? '(Moi)' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#006c4a] overflow-hidden border border-[#c8c4d5]">
                        {ticket.assignedTo?.avatar ? (
                          <img
                            src={ticket.assignedTo.avatar}
                            alt={ticket.assignedTo.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#3730a3] text-white flex items-center justify-center text-[10px] font-bold">
                            {ticket.assignedTo?.name ? ticket.assignedTo.name.substring(0, 2) : 'Unassigned'}
                          </div>
                        )}
                      </div>
                      <span className="font-semibold text-[#0b1c30]">
                        {ticket.assignedTo ? ticket.assignedTo.name : 'Non assigné'}
                      </span>
                    </div>
                  )}

                  {/* Quick self-assign button for admin only */}
                  {isAdmin && (!ticket.assignedTo || ticket.assignedTo.name !== currentUser.name) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (onAssignDev) {
                          onAssignDev(ticket.id, currentUser.id || currentUser.email || currentUser.name || 'self');
                          showToast('Ticket assigné à vous-même !');
                        }
                      }}
                      className="text-[11px] text-[#1f108e] hover:bg-[#1f108e] hover:text-white font-bold flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-200 transition-all cursor-pointer shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-xs">person_add</span>
                      <span>M'assigner ce ticket</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-[#464553]">Created</span>
                <span className="font-semibold text-[#0b1c30] font-geist">
                  {ticket.createdDate}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-[#464553]">SLA Deadline</span>
                <span className="text-[#ba1a1a] font-bold font-geist">
                  {ticket.slaDeadline || 'Dans 4h'}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-[#464553]">Tags</span>
                <div className="flex gap-1.5">
                  {ticket.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-[#eff4ff] text-[#1f108e] px-2 py-0.5 rounded text-[10px] font-bold font-geist"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Workflow History Card */}
          <section className="bg-white rounded-2xl border border-[#c8c4d5]/60 p-6 shadow-xs">
            <h2 className="text-xs font-bold text-[#777584] mb-4 uppercase tracking-widest font-geist">
              Workflow History
            </h2>
            <div className="relative pl-2">
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[#c8c4d5]/50"></div>
              <div className="space-y-5">
                {ticket.history && ticket.history.length > 0 ? (
                  ticket.history.map((evt) => (
                    <div key={evt.id} className="relative pl-6">
                      <div
                        className={`absolute left-[-2px] top-1.5 w-2.5 h-2.5 rounded-full ${
                          evt.active
                            ? 'bg-[#006c4a] ring-4 ring-[#82f5c1]/30 animate-pulse'
                            : 'bg-[#1f108e]'
                        }`}
                      ></div>
                      <p className="text-xs font-bold text-[#0b1c30] leading-tight">
                        {evt.title}
                      </p>
                      <p className="text-[11px] text-[#777584]">
                        by <span className="font-semibold text-[#0b1c30]">{evt.author}</span> •{' '}
                        {evt.timestamp}
                      </p>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="relative pl-6">
                      <div className="absolute left-[-2px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#1f108e]"></div>
                      <p className="text-xs font-bold text-[#0b1c30] leading-tight">Ticket created</p>
                      <p className="text-[11px] text-[#777584]">
                        by <span className="font-semibold text-[#0b1c30]">{ticket.requestedBy}</span> • 14:00
                      </p>
                    </div>
                    <div className="relative pl-6">
                      <div className="absolute left-[-2px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#006c4a] animate-pulse"></div>
                      <p className="text-xs font-bold text-[#0b1c30] leading-tight font-bold">
                        Traitement en cours
                      </p>
                      <p className="text-[11px] text-[#777584]">Mis à jour récemment</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Related Tickets Card */}
          <section className="bg-white rounded-2xl border border-[#c8c4d5]/60 p-6 shadow-xs">
            <h2 className="text-xs font-bold text-[#777584] mb-3 uppercase tracking-widest font-geist">
              Related Tickets
            </h2>
            <div className="space-y-2">
              <div
                onClick={() => onSelectRelatedTicket('TK-8839')}
                className="p-2.5 rounded-xl hover:bg-[#eff4ff] cursor-pointer transition-colors group border border-transparent hover:border-[#c8c4d5]/40"
              >
                <p className="text-xs font-semibold text-[#0b1c30] group-hover:text-[#1f108e]">
                  TK-8839: User login failures in SEA
                </p>
                <div className="flex justify-between mt-1 text-[10px]">
                  <span className="text-[#777584]">Closed 4h ago</span>
                  <span className="text-[#006c4a] font-bold">Terminé</span>
                </div>
              </div>

              <div className="h-px bg-[#c8c4d5]/40 my-1"></div>

              <div
                onClick={() => onSelectRelatedTicket('TK-8845')}
                className="p-2.5 rounded-xl hover:bg-[#eff4ff] cursor-pointer transition-colors group border border-transparent hover:border-[#c8c4d5]/40"
              >
                <p className="text-xs font-semibold text-[#0b1c30] group-hover:text-[#1f108e]">
                  TK-8845: Region-wide health check alert
                </p>
                <div className="flex justify-between mt-1 text-[10px]">
                  <span className="text-[#777584]">Open</span>
                  <span className="text-amber-600 font-bold">À faire</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Edit Ticket Modal for Admins */}
      <EditTicketModal
        ticket={ticket}
        developers={developers}
        projects={projects}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentUser={currentUser}
        onSave={(updated) => {
          if (onEditTicket) {
            onEditTicket(updated);
            showToast('Ticket mis à jour avec succès !');
          } else {
            onUpdateTicketStatus(updated.id, updated.status, updated.statusLabel);
            showToast('Ticket mis à jour !');
          }
        }}
      />
    </div>
  );
};
