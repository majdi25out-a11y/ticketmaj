import React, { useState, useEffect } from 'react';
import { Ticket, Priority, Platform, Attachment, Project } from '../../types';
import { processAttachmentFile } from '../../utils/fileCompressor';
import { DEFAULT_USER_AVATAR } from '../../data/avatars';
import { VoiceRecorder } from '../Audio/VoiceRecorder';
import { AudioPlayer } from '../Audio/AudioPlayer';

interface CreateTicketProps {
  onSubmitTicket: (newTicket: Partial<Ticket>) => void;
  onCancel: () => void;
  userTickets: Ticket[];
  projects?: Project[];
  initialProjectId?: string;
  onOpenSupportChat: () => void;
  onSelectTicket: (ticketId: string) => void;
  currentUser?: { name: string; role: string; avatar: string; email?: string };
}

interface AudioNoteItem {
  id: string;
  url: string;
  duration: number;
  name: string;
  size: string;
}

export const CreateTicket: React.FC<CreateTicketProps> = ({
  onSubmitTicket,
  onCancel,
  userTickets,
  projects = [],
  initialProjectId = '',
  onOpenSupportChat,
  onSelectTicket,
  currentUser,
}) => {
  const [title, setTitle] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);
  const [platform, setPlatform] = useState<Platform>('web');
  const [priority, setPriority] = useState<Priority>('medium');
  const [description, setDescription] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [recordedAudioNotes, setRecordedAudioNotes] = useState<AudioNoteItem[]>([]);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [createdTicketId, setCreatedTicketId] = useState('');

  useEffect(() => {
    if (initialProjectId) {
      setSelectedProjectId(initialProjectId);
    }
  }, [initialProjectId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setAttachedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveAudio = (audioData: {
    url: string;
    duration: number;
    name: string;
    size: string;
  }) => {
    const newNote: AudioNoteItem = {
      id: `audio-${Date.now()}`,
      url: audioData.url,
      duration: audioData.duration,
      name: audioData.name,
      size: audioData.size,
    };
    setRecordedAudioNotes((prev) => [...prev, newNote]);
    setShowVoiceRecorder(false);
  };

  const removeAudioNote = (id: string) => {
    setRecordedAudioNotes((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || (!description.trim() && recordedAudioNotes.length === 0)) return;

    setIsSubmitting(true);
    const generatedId = `TF-${Math.floor(9000 + Math.random() * 999)}`;

    try {
      const formattedAttachments: Attachment[] = await Promise.all(
        attachedFiles.map((file) => processAttachmentFile(file))
      );

      // Convert audio notes into first-class attachments
      const audioAttachments: Attachment[] = recordedAudioNotes.map((note) => ({
        id: note.id,
        name: note.name,
        size: note.size,
        type: 'audio/webm',
        icon: 'mic',
        url: note.url,
        duration: note.duration,
      }));

      const allAttachments = [...formattedAttachments, ...audioAttachments];

      const selectedProjectObj = projects.find((p) => p.id === selectedProjectId);

      onSubmitTicket({
        id: generatedId,
        title,
        description: description.trim() || 'Remarque vocale enregistrée et jointe en pièce jointe.',
        projectId: selectedProjectObj?.id || undefined,
        projectName: selectedProjectObj?.name || undefined,
        projectCode: selectedProjectObj?.code || undefined,
        projectColor: selectedProjectObj?.color || undefined,
        platform,
        priority,
        requestedBy: currentUser?.name || 'Marc Dupont',
        requestedByAvatar:
          currentUser?.avatar ||
          DEFAULT_USER_AVATAR,
        status: 'pending',
        statusLabel: 'À VALIDER',
        createdDate: 'Aujourd\'hui',
        tags: [
          ...(selectedProjectObj?.code ? [selectedProjectObj.code] : []),
          platform.toUpperCase(), 
          priority.toUpperCase()
        ],
        attachments: allAttachments,
      });

      setCreatedTicketId(generatedId);
      setIsSubmitting(false);
      setShowToast(true);

      // Reset form fields
      setTitle('');
      setSelectedProjectId(initialProjectId || '');
      setDescription('');
      setAttachedFiles([]);
      setRecordedAudioNotes([]);
      setShowVoiceRecorder(false);
    } catch (err) {
      console.error('Erreur lors du traitement des pièces jointes :', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-20 pb-16 px-4 md:px-10 max-w-[1400px] mx-auto space-y-6">
      {/* Toast notification overlay */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300 max-w-sm">
          <div className="bg-white border border-emerald-300 shadow-2xl rounded-2xl p-5 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
            <div>
              <h5 className="text-sm font-bold text-[#0b1c30]">Ticket envoyé avec succès !</h5>
              <p className="text-xs text-[#464553] mt-1">
                Votre demande <span className="font-bold text-[#1f108e]">#{createdTicketId}</span> a été transmise à l'équipe technique. Vous recevrez une notification rapidement.
              </p>
              <div className="mt-3 flex gap-3">
                <button
                  onClick={() => setShowToast(false)}
                  className="text-xs font-bold text-emerald-700 hover:underline"
                >
                  Fermer
                </button>
                <button
                  onClick={() => {
                    setShowToast(false);
                    onSelectTicket(createdTicketId);
                  }}
                  className="text-xs font-bold text-[#3730a3] hover:underline"
                >
                  Voir le ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumbs & Header */}
      <div>
        <div className="flex items-center gap-1.5 text-[#464553] text-xs font-geist mb-1">
          <span>Tickets</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-[#1f108e] font-bold">Proposer un nouveau ticket</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#0b1c30] tracking-tight">
          Proposer un Ticket
        </h1>
        <p className="text-sm text-[#464553] mt-1">
          Décrivez votre besoin technique ou soumettez une nouvelle fonctionnalité.
        </p>
      </div>

      {/* Main Form Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form Column */}
        <div className="lg:col-span-8 bg-white border border-[#c8c4d5]/60 rounded-2xl overflow-hidden shadow-xs">
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            {/* Ticket Title */}
            <div className="space-y-1.5">
              <label htmlFor="title" className="text-xs font-bold text-[#0b1c30]">
                Titre du ticket <span className="text-[#ba1a1a]">*</span>
              </label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Problème d'affichage sur le module de facturation"
                className="w-full h-11 border border-[#c8c4d5] rounded-xl text-sm px-4 focus:ring-2 focus:ring-[#3730a3]/20 focus:border-[#1f108e] outline-none transition-all"
              />
            </div>

            {/* Project Selection */}
            {projects.length > 0 && (
              <div className="space-y-1.5">
                <label htmlFor="project" className="text-xs font-bold text-[#0b1c30] flex items-center justify-between">
                  <span>Projet associé</span>
                  <span className="text-[11px] font-normal text-[#777584]">Optionnel mais recommandé</span>
                </label>
                <div className="relative">
                  <select
                    id="project"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full h-11 border border-[#c8c4d5] rounded-xl text-sm px-4 focus:ring-2 focus:ring-[#3730a3]/20 focus:border-[#1f108e] appearance-none bg-white outline-none transition-all pr-10"
                  >
                    <option value="">-- Aucun projet spécifique --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.code || 'PRJ'}] {p.name}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#777584]">
                    expand_more
                  </span>
                </div>
              </div>
            )}

            {/* Platform & Priority Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Type de plateforme toggle */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0b1c30]">Type de plateforme</label>
                <div className="flex bg-[#eff4ff] p-1 rounded-xl h-11 relative border border-[#c8c4d5]/40">
                  <button
                    type="button"
                    onClick={() => setPlatform('web')}
                    className={`flex-1 flex items-center justify-center text-xs font-semibold rounded-lg transition-all ${
                      platform === 'web'
                        ? 'bg-white shadow-xs text-[#1f108e]'
                        : 'text-[#464553] hover:text-[#0b1c30]'
                    }`}
                  >
                    <span className="material-symbols-outlined mr-1.5 text-base">
                      desktop_windows
                    </span>
                    Web
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlatform('mobile')}
                    className={`flex-1 flex items-center justify-center text-xs font-semibold rounded-lg transition-all ${
                      platform === 'mobile'
                        ? 'bg-white shadow-xs text-[#1f108e]'
                        : 'text-[#464553] hover:text-[#0b1c30]'
                    }`}
                  >
                    <span className="material-symbols-outlined mr-1.5 text-base">
                      smartphone
                    </span>
                    Mobile
                  </button>
                </div>
              </div>

              {/* Priority Select */}
              <div className="space-y-1.5">
                <label htmlFor="priority" className="text-xs font-bold text-[#0b1c30]">
                  Priorité
                </label>
                <div className="relative">
                  <select
                    id="priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="w-full h-11 border border-[#c8c4d5] rounded-xl text-sm px-4 focus:ring-2 focus:ring-[#3730a3]/20 focus:border-[#1f108e] appearance-none bg-white outline-none transition-all"
                  >
                    <option value="low">Basse</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                    <option value="urgent">Urgente</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#777584]">
                    expand_more
                  </span>
                </div>
              </div>
            </div>

            {/* Description Detailed with Voice Note Action */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="description" className="text-xs font-bold text-[#0b1c30]">
                  Description détaillée <span className="text-[#ba1a1a]">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                  className={`text-xs font-bold flex items-center gap-1.5 px-3 py-1 rounded-lg border transition-all ${
                    showVoiceRecorder
                      ? 'bg-red-50 text-red-700 border-red-200 shadow-2xs'
                      : 'bg-[#eff4ff] text-[#1f108e] border-[#c8c4d5]/60 hover:bg-[#e0eaff]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {showVoiceRecorder ? 'close' : 'mic'}
                  </span>
                  <span>{showVoiceRecorder ? 'Fermer le micro' : 'Enregistrer une note vocale'}</span>
                </button>
              </div>

              <textarea
                id="description"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                  }
                }}
                placeholder="Décrivez les étapes de reproduction, les résultats attendus ou enregistrez une note vocale ci-dessus...&#10;&#10;Appuyez sur Entrée pour ajouter des sauts de ligne."
                className="w-full border border-[#c8c4d5] rounded-xl text-sm p-4 focus:ring-2 focus:ring-[#3730a3]/20 focus:border-[#1f108e] outline-none transition-all resize-y min-h-[120px] whitespace-pre-wrap leading-relaxed"
              />
            </div>

            {/* Voice Recorder Inline Panel if open */}
            {showVoiceRecorder && (
              <VoiceRecorder
                title="Enregistrement d'une remarque vocale pour ce ticket"
                onSaveAudio={handleSaveAudio}
                onCancel={() => setShowVoiceRecorder(false)}
              />
            )}

            {/* Render Recorded Audio Notes List */}
            {recordedAudioNotes.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0b1c30] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-[#1f108e]">mic</span>
                  <span>Remarques vocales enregistrées ({recordedAudioNotes.length})</span>
                </label>
                <div className="space-y-2">
                  {recordedAudioNotes.map((note) => (
                    <AudioPlayer
                      key={note.id}
                      src={note.url}
                      duration={note.duration}
                      fileName={note.name}
                      size={note.size}
                      onDelete={() => removeAudioNote(note.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* File Upload Dropzone */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#0b1c30]">
                  Pièces jointes & Fichiers
                </label>
                {!showVoiceRecorder && (
                  <button
                    type="button"
                    onClick={() => setShowVoiceRecorder(true)}
                    className="text-[11px] text-[#1f108e] hover:underline font-semibold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">mic</span>
                    Ajouter une note vocale
                  </button>
                )}
              </div>
              <div
                onClick={() => document.getElementById('file-upload-input')?.click()}
                className="border-2 border-dashed border-[#c8c4d5] rounded-2xl p-6 flex flex-col items-center justify-center bg-[#f8f9ff] hover:bg-[#eff4ff] hover:border-[#1f108e]/40 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-white shadow-xs flex items-center justify-center text-[#1f108e] mb-3 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl">upload_file</span>
                </div>
                <p className="text-xs font-semibold text-[#0b1c30]">
                  Cliquez ou glissez-déposez vos fichiers ici
                </p>
                <p className="text-[11px] text-[#777584] mt-1 font-geist">
                  PNG, JPG, PDF, Audios jusqu'à 10 Mo
                </p>
                <input
                  id="file-upload-input"
                  type="file"
                  multiple
                  accept="image/*, audio/*, application/pdf, .doc, .docx, .txt, .zip, .rar"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Render Selected File Chips */}
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {attachedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 bg-[#eff4ff] px-3 py-1.5 rounded-full border border-[#c8c4d5]/60 text-xs text-[#0b1c30]"
                    >
                      <span className="material-symbols-outlined text-xs">attach_file</span>
                      <span className="truncate max-w-[150px]">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="material-symbols-outlined text-xs hover:text-[#ba1a1a] ml-1"
                      >
                        close
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Admin Assignment Notice */}
            <div className="bg-[#eff4ff] p-3 rounded-xl border border-[#c8c4d5]/40 text-xs text-[#3730a3] flex items-center gap-2">
              <span className="material-symbols-outlined text-base">info</span>
              <span>
                Les tickets proposés par les développeurs sont soumis à l'administrateur pour validation et assignation.
              </span>
            </div>

            {/* Submit Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#c8c4d5]/40">
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2.5 text-xs font-semibold text-[#464553] hover:bg-[#eff4ff] rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || (!description.trim() && recordedAudioNotes.length === 0)}
                className="bg-[#1f108e] text-white px-6 py-2.5 text-xs font-semibold rounded-xl shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">
                      progress_activity
                    </span>
                    <span>Envoi en cours...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">send</span>
                    <span>Envoyer le ticket</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Sidebar: Mes Demandes & Support */}
        <div className="lg:col-span-4 space-y-6">
          {/* Mes Demandes Card */}
          <div className="bg-white border border-[#c8c4d5]/60 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-[#c8c4d5]/40 flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0b1c30]">Mes demandes</h3>
              <span className="text-xs font-bold bg-[#eff4ff] text-[#1f108e] px-3 py-1 rounded-full">
                {userTickets.length} Actives
              </span>
            </div>

            <div className="divide-y divide-[#c8c4d5]/30 max-h-[500px] overflow-y-auto">
              {userTickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onSelectTicket(t.id)}
                  className="p-4 hover:bg-[#eff4ff]/60 transition-colors cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-xs font-bold text-[#777584] font-geist">
                      #{t.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        t.status === 'pending'
                          ? 'bg-blue-100 text-blue-800'
                          : t.status === 'approved' || t.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {t.statusLabel}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-[#0b1c30] group-hover:text-[#1f108e] transition-colors line-clamp-1">
                    {t.title}
                  </h4>
                  <p className="text-[11px] text-[#464553] mt-1 line-clamp-2">
                    {t.description}
                  </p>

                  <div className="flex items-center gap-4 mt-3 text-[11px] text-[#777584]">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">schedule</span>
                      <span>{t.createdDate}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">priority_high</span>
                      <span className="capitalize">{t.priority}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-[#eff4ff] text-center border-t border-[#c8c4d5]/40">
              <button
                onClick={() => onSelectTicket(userTickets[0]?.id || 'TK-8842')}
                className="text-xs font-bold text-[#1f108e] hover:underline"
              >
                Voir tout l'historique
              </button>
            </div>
          </div>

          {/* Technical Support Promo Card */}
          <div className="bg-[#3730a3] rounded-2xl p-6 text-white relative overflow-hidden shadow-md">
            <div className="relative z-10 space-y-2">
              <h4 className="font-bold text-base">Support Technique</h4>
              <p className="text-xs text-white/80">
                Besoin d'une aide urgente ? Nos équipes sont en ligne.
              </p>
              <button
                type="button"
                onClick={onOpenSupportChat}
                className="mt-3 bg-white text-[#1f108e] px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors shadow-sm active:scale-95"
              >
                Contacter le chat
              </button>
            </div>
            <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-8xl text-white/10 pointer-events-none">
              support_agent
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
