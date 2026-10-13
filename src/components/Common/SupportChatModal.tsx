import React, { useState } from 'react';
import { VoiceRecorder } from '../Audio/VoiceRecorder';
import { AudioPlayer } from '../Audio/AudioPlayer';

interface SupportChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text?: string;
  audioUrl?: string;
  audioDuration?: number;
  timestamp: string;
}

export const SupportChatModal: React.FC<SupportChatModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'bot',
      text: 'Bonjour ! Je suis l\'assistant support TicketFlow. Vous pouvez m\'écrire ou m\'envoyer une note vocale. Comment puis-je vous aider ?',
      timestamp: '14:20',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      sender: 'user',
      text: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    const query = inputText.toLowerCase();
    setInputText('');

    setTimeout(() => {
      let botResponse = 'Merci pour votre message. Un membre de l\'équipe support examine votre demande.';
      if (query.includes('urgent') || query.includes('erreur') || query.includes('bug')) {
        botResponse = 'Entendu ! Votre incident a été transmis en priorité Haute au chef de garde Ops.';
      } else if (query.includes('export') || query.includes('csv')) {
        botResponse = 'Pour les exports CSV, vous pouvez appliquer les filtres dans le Dashboard puis cliquer sur "Export".';
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `m-bot-${Date.now()}`,
          sender: 'bot',
          text: botResponse,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 1000);
  };

  const handleVoiceMessage = (audioData: {
    url: string;
    duration: number;
    name: string;
    size: string;
  }) => {
    const userVoiceMsg: ChatMessage = {
      id: `m-voice-${Date.now()}`,
      sender: 'user',
      audioUrl: audioData.url,
      audioDuration: audioData.duration,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userVoiceMsg]);
    setShowVoiceRecorder(false);

    // Bot acknowledgment for voice note
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `m-bot-${Date.now()}`,
          sender: 'bot',
          text: '🎙️ Note vocale bien reçue et transmise au support technique. Nous l\'écoutons immédiatement.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#c8c4d5]/60 overflow-hidden flex flex-col h-[560px] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#1f108e] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white shadow-xs">
              <span className="material-symbols-outlined text-xl">support_agent</span>
            </div>
            <div>
              <h3 className="font-bold text-sm">Support Technique TicketFlow</h3>
              <p className="text-[10px] text-emerald-300 flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>En ligne • Messages texte & vocaux</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8f9ff]">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-[#1f108e] text-white rounded-br-none'
                    : 'bg-white text-[#0b1c30] border border-[#c8c4d5]/50 shadow-2xs rounded-bl-none'
                }`}
              >
                {m.text && <p>{m.text}</p>}
                {m.audioUrl && (
                  <div className="mt-1">
                    <AudioPlayer
                      src={m.audioUrl}
                      duration={m.audioDuration}
                      fileName="Note vocale support"
                    />
                  </div>
                )}
              </div>
              <span className="text-[9px] text-[#777584] mt-1 px-1 font-geist">
                {m.timestamp}
              </span>
            </div>
          ))}
        </div>

        {/* Voice Recorder Inline */}
        {showVoiceRecorder && (
          <div className="p-3 bg-white border-t border-[#c8c4d5]/40 animate-in slide-in-from-bottom duration-150">
            <VoiceRecorder
              title="Message vocal pour le support"
              onSaveAudio={handleVoiceMessage}
              onCancel={() => setShowVoiceRecorder(false)}
            />
          </div>
        )}

        {/* Footer Input */}
        {!showVoiceRecorder && (
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-[#c8c4d5]/40 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowVoiceRecorder(true)}
              className="w-9 h-9 rounded-xl bg-[#eff4ff] text-[#1f108e] border border-[#c8c4d5]/60 hover:bg-[#e0eaff] flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
              title="Enregistrer un message vocal"
            >
              <span className="material-symbols-outlined text-lg">mic</span>
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Posez votre question ou envoyez un vocal..."
              className="flex-1 border border-[#c8c4d5]/60 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#1f108e]/20 outline-none"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="bg-[#1f108e] text-white px-4 h-9 rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-40 flex items-center justify-center flex-shrink-0"
            >
              <span className="material-symbols-outlined text-base">send</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
