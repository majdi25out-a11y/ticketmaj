import React, { useState, useEffect } from 'react';
import { Ticket, Developer, Priority, Status, Platform, Project, Attachment } from '../../types';
import { AudioPlayer } from '../Audio/AudioPlayer';
import { VoiceRecorder } from '../Audio/VoiceRecorder';
import { processAttachmentFile } from '../../utils/fileCompressor';

interface EditTicketModalProps {
  ticket: Ticket | null;
  developers: Developer[];
  projects?: Project[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTicket: Ticket) => void;
  currentUser?: { name: string; role: string; email?: string };
}

export const EditTicketModal: React.FC<EditTicketModalProps> = ({
  ticket,
  developers,
  projects = [],
  isOpen,
  onClose,
  onSave,
  currentUser,
}) => {
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [platform, setPlatform] = useState<Platform>('web');
  const [status, setStatus] = useState<Status>('in_progress');
  const [assignedDevId, setAssignedDevId] = useState<string>('');
  const [slaDeadline, setSlaDeadline] = useState<string>('');
  const [clarity, setClarity] = useState<'clair' | 'clarifier'>('clair');
  const [closingNote, setClosingNote] = useState<string>('');
  const [tagsInput, setTagsInput] = useState<string>('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState<boolean>(false);
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<string | null>(null);

  const isAdmin = !currentUser ||
    currentUser.role?.toLowerCase().includes('admin') ||
    currentUser.role?.toLowerCase().includes('architect') ||
    currentUser.email === 'admin@ticketflow.io';

  useEffect(() => {
    if (ticket && isOpen) {
      setTitle(ticket.title || '');
      setDescription(ticket.description || '');
      setSelectedProjectId(ticket.projectId || '');
      setPriority(ticket.priority || 'medium');
      setPlatform(ticket.platform || 'web');
      setStatus(ticket.status || 'in_progress');
      setAssignedDevId(ticket.assignedTo?.id || '');
      setSlaDeadline(ticket.slaDeadline || '');
      setClarity(ticket.clarity || 'clair');
      setClosingNote(ticket.closingNote || '');
      setTagsInput(Array.isArray(ticket.tags) ? ticket.tags.join(', ') : '');
      setAttachments(ticket.attachments ? [...ticket.attachments] : []);
      setShowVoiceRecorder(false);
      setIsUploadingFile(false);
      setIsSubmitting(false);
      setModalFeedback(null);
    }
  }, [ticket, isOpen]);

  if (!isOpen || !ticket) return null;

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl border border-red-200 animate-in fade-in zoom-in-95">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-2xl">lock</span>
          </div>
          <h3 className="text-base font-bold text-[#0b1c30]">Gestion Réservée aux Administrateurs</h3>
          <p className="text-xs text-[#464553]">
            Seuls les administrateurs disposent des autorisations nécessaires pour modifier toutes les propriétés d'un ticket.
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploadingFile(true);
    try {
      const filesArray: File[] = Array.from(e.target.files);
      const newAtts = await Promise.all(filesArray.map((f: File) => processAttachmentFile(f)));
      setAttachments((prev) => [...prev, ...newAtts]);
      setModalFeedback(`${newAtts.length} fichier(s) ajouté(s) aux pièces jointes.`);
      setTimeout(() => setModalFeedback(null), 3000);
    } catch (err) {
      console.error('Erreur téléversement fichier :', err);
      setModalFeedback('Erreur lors du téléversement du fichier.');
      setTimeout(() => setModalFeedback(null), 3000);
    } finally {
      setIsUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleSaveVoiceNote = (audioData: {
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
    setAttachments((prev) => [...prev, newAudioAtt]);
    setShowVoiceRecorder(false);
    setModalFeedback('Note vocale enregistrée et ajoutée aux pièces jointes.');
    setTimeout(() => setModalFeedback(null), 3000);
  };

  const handleRemoveAttachment = (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setModalFeedback('Le titre du ticket ne peut pas être vide.');
      setTimeout(() => setModalFeedback(null), 3000);
      return;
    }

    setIsSubmitting(true);

    const assignedDev = developers.find((d) => d.id === assignedDevId);
    const selectedProj = projects.find((p) => p.id === selectedProjectId);

    // Derive statusLabel from status
    let statusLabel = ticket.statusLabel;
    if (status === 'pending') statusLabel = 'À VALIDER';
    else if (status === 'in_progress') statusLabel = 'EN COURS';
    else if (status === 'completed') statusLabel = 'TERMINÉ';
    else if (status === 'rejected') statusLabel = 'REJETÉ';

    const tagsArray = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    // L'administrateur peut modifier toutes les propriétés du ticket :
    // titre, description, projet, statut, priorité, assignation, plateforme, SLA, clarté, note de clôture, tags et pièces jointes.
    const updatedTicket: Ticket = {
      ...ticket,
      title: title.trim(),
      description: description.trim(),
      attachments: attachments,
      projectId: selectedProj?.id || (selectedProjectId ? selectedProjectId : undefined),
      projectName: selectedProj?.name || undefined,
      projectCode: selectedProj?.code || undefined,
      projectColor: selectedProj?.color || undefined,
      priority,
      platform,
      status,
      statusLabel,
      assignedTo: assignedDev,
      slaDeadline: slaDeadline.trim() || undefined,
      clarity,
      closingNote: closingNote.trim() || undefined,
      tags: tagsArray,
    };

    onSave(updatedTicket);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-[#c8c4d5]/80 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#c8c4d5]/40 flex items-center justify-between bg-[#f8fafd] sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1f108e] text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-lg">edit_note</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0b1c30]">Modifier le Ticket #{ticket.id}</h2>
              <p className="text-xs text-[#777584]">Accès Administrateur : Modification complète de toutes les propriétés</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-[#464553] flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Feedback alert */}
        {modalFeedback && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-base text-emerald-600">check_circle</span>
            <span>{modalFeedback}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
          {/* Title - Fully Editable by Admin */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-[#0b1c30]">
                Titre du Ticket <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] font-semibold text-slate-500">
                Demandeur initial : {ticket.requestedBy}
              </span>
            </div>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Erreur lors de la connexion..."
              className="w-full bg-[#f8fafd] border border-[#c8c4d5] focus:border-[#1f108e] rounded-xl px-3 py-2 text-xs font-semibold text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/20 outline-none transition-all"
            />
          </div>

          {/* Description - Fully Editable by Admin */}
          <div>
            <label className="block font-bold text-[#0b1c30] mb-1">
              Description détaillée <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description détaillée du problème ou de la demande..."
              className="w-full bg-[#f8fafd] border border-[#c8c4d5] focus:border-[#1f108e] rounded-xl p-3 text-xs text-[#0b1c30] font-normal leading-relaxed focus:ring-2 focus:ring-[#1f108e]/20 outline-none transition-all resize-y"
            />
          </div>

          {/* Project Association (Admin Can Assign) */}
          <div>
            <label className="block font-bold text-[#0b1c30] mb-1">
              Projet Associé
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-[#f8fafd] border border-[#c8c4d5] rounded-xl px-3 py-2 text-xs font-semibold text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/30 outline-none"
            >
              <option value="">-- Aucun projet associé --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.code || 'PRJ'}] {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Grid 1: Status & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#0b1c30] mb-1">Statut du ticket</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className="w-full bg-[#f8fafd] border border-[#c8c4d5] rounded-xl px-3 py-2 text-xs font-semibold text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/30 outline-none"
              >
                <option value="pending">En attente (À VALIDER)</option>
                <option value="in_progress">En cours (EN COURS)</option>
                <option value="completed">Terminé (TERMINÉ)</option>
                <option value="rejected">Rejeté (REJETÉ)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#0b1c30] mb-1">Priorité</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full bg-[#f8fafd] border border-[#c8c4d5] rounded-xl px-3 py-2 text-xs font-semibold text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/30 outline-none"
              >
                <option value="low">Basse (Low)</option>
                <option value="medium">Moyenne (Medium)</option>
                <option value="high">Haute (High)</option>
                <option value="urgent">Urgente (Urgent)</option>
              </select>
            </div>
          </div>

          {/* Grid 2: Developer & Platform */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#0b1c30] mb-1">Assigner à un développeur</label>
              <select
                value={assignedDevId}
                onChange={(e) => setAssignedDevId(e.target.value)}
                className="w-full bg-[#f8fafd] border border-[#c8c4d5] rounded-xl px-3 py-2 text-xs font-semibold text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/30 outline-none"
              >
                <option value="">Non assigné</option>
                {developers.map((dev) => (
                  <option key={dev.id} value={dev.id}>
                    {dev.name} ({dev.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#0b1c30] mb-1">Plateforme</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="w-full bg-[#f8fafd] border border-[#c8c4d5] rounded-xl px-3 py-2 text-xs font-semibold text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/30 outline-none"
              >
                <option value="web">Web</option>
                <option value="mobile">Mobile (iOS / Android)</option>
                <option value="desktop">Desktop</option>
                <option value="api">API / Backend</option>
              </select>
            </div>
          </div>

          {/* Grid 3: SLA Deadline & Clarity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#0b1c30] mb-1">Délai SLA (ex: 4h, 24h, 2j)</label>
              <input
                type="text"
                value={slaDeadline}
                onChange={(e) => setSlaDeadline(e.target.value)}
                placeholder="Ex: 4h, 24h, 3 jours..."
                className="w-full bg-[#f8fafd] border border-[#c8c4d5] rounded-xl px-3 py-2 text-xs font-semibold text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/30 outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-[#0b1c30] mb-1">Évaluation Clarté</label>
              <select
                value={clarity}
                onChange={(e) => setClarity(e.target.value as 'clair' | 'clarifier')}
                className="w-full bg-[#f8fafd] border border-[#c8c4d5] rounded-xl px-3 py-2 text-xs font-semibold text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/30 outline-none"
              >
                <option value="clair">Clair (Informations suffisantes)</option>
                <option value="clarifier">À clarifier (Besoin de précisions)</option>
              </select>
            </div>
          </div>

          {/* Closing Note (if completed or rejected) */}
          {(status === 'completed' || status === 'rejected' || closingNote) && (
            <div>
              <label className="block font-bold text-[#0b1c30] mb-1">
                Note de clôture ou résolution
              </label>
              <textarea
                rows={2}
                value={closingNote}
                onChange={(e) => setClosingNote(e.target.value)}
                placeholder="Indiquez la solution apportée ou le motif de rejet..."
                className="w-full bg-[#f8fafd] border border-[#c8c4d5] rounded-xl p-2.5 text-xs text-[#0b1c30] font-normal leading-relaxed focus:ring-2 focus:ring-[#1f108e]/20 outline-none"
              />
            </div>
          )}

          {/* Attachments Section with Add & Delete capabilities */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <label className="block font-bold text-[#0b1c30]">
                Pièces jointes ({attachments.length})
              </label>
              <div className="flex items-center gap-2">
                {/* Voice note button */}
                <button
                  type="button"
                  onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border active:scale-95 cursor-pointer ${
                    showVoiceRecorder
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-[#eff4ff] hover:bg-[#1f108e] text-[#1f108e] hover:text-white border-[#c8c4d5]/60'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {showVoiceRecorder ? 'close' : 'mic'}
                  </span>
                  <span>{showVoiceRecorder ? 'Fermer micro' : 'Note vocale'}</span>
                </button>

                {/* File upload button */}
                <label className="bg-[#eff4ff] hover:bg-[#1f108e] text-[#1f108e] hover:text-white px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 border border-[#c8c4d5]/60 active:scale-95">
                  <span className="material-symbols-outlined text-base">attach_file</span>
                  <span>{isUploadingFile ? 'Chargement...' : 'Ajouter un fichier'}</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*, audio/*, application/pdf, .doc, .docx, .txt, .zip, .rar"
                    onChange={handleFileUpload}
                    disabled={isUploadingFile}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Voice Recorder Inline */}
            {showVoiceRecorder && (
              <div className="mb-3 p-3 bg-slate-50 border border-[#c8c4d5]/80 rounded-2xl">
                <VoiceRecorder
                  title="Enregistrer une remarque vocale pour ce ticket"
                  onSaveAudio={handleSaveVoiceNote}
                  onCancel={() => setShowVoiceRecorder(false)}
                />
              </div>
            )}

            {/* Attachments List */}
            {attachments.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {attachments.map((att) => {
                  const isAudio =
                    att.type?.includes('audio') ||
                    att.name.endsWith('.webm') ||
                    att.name.endsWith('.mp3') ||
                    att.name.endsWith('.m4a') ||
                    att.icon === 'mic';

                  return (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50 border border-[#c8c4d5]/60 rounded-xl gap-2 hover:bg-slate-100/70 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        {isAudio && att.url ? (
                          <AudioPlayer
                            src={att.url}
                            duration={att.duration}
                            fileName={att.name}
                            size={att.size}
                          />
                        ) : (
                          <div className="flex items-center gap-2 truncate">
                            <span className="material-symbols-outlined text-base text-[#1f108e] shrink-0">
                              {att.icon || 'attach_file'}
                            </span>
                            <span className="font-semibold text-xs text-[#0b1c30] truncate">{att.name}</span>
                            {att.size && <span className="text-[10px] text-[#777584] shrink-0">({att.size})</span>}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Supprimer cette pièce jointe"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[#777584] italic bg-[#f8f9ff] p-3 rounded-xl border border-dashed border-[#c8c4d5]/50">
                Aucune pièce jointe. Utilisez les boutons ci-dessus pour ajouter des documents, images ou notes vocales.
              </p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block font-bold text-[#0b1c30] mb-1">Tags (séparés par des virgules)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Ex: Urgent, Bug, Auth, React"
              className="w-full bg-[#f8fafd] border border-[#c8c4d5] rounded-xl px-3 py-2 text-xs font-semibold text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/30 outline-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-[#c8c4d5]/40 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#c8c4d5] text-[#464553] font-bold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#1f108e] text-white font-bold hover:bg-[#1f108e]/90 shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">save</span>
              <span>{isSubmitting ? 'Enregistrement...' : 'Enregistrer toutes les modifications'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
