import React, { useState, useRef, useEffect } from 'react';
import { AudioPlayer } from './AudioPlayer';

interface VoiceRecorderProps {
  onSaveAudio: (audioData: {
    url: string;
    duration: number;
    name: string;
    size: string;
    blob: Blob;
  }) => void;
  onCancel?: () => void;
  title?: string;
  compact?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onSaveAudio,
  onCancel,
  title = 'Enregistrer une remarque vocale',
  compact = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>([40, 20, 70, 50, 90, 60, 30, 80, 50]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<any>(null);

  // Clean up streams & timers on unmount
  useEffect(() => {
    return () => {
      stopTracks();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    setErrorMessage(null);
    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingTime(0);
    audioChunksRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage("L'enregistrement audio n'est pas supporté sur ce navigateur.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Select supported mimeType
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
        else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
        else mimeType = '';
      }

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalBlob = new Blob(audioChunksRef.current, {
          type: mimeType || 'audio/webm',
        });
        setAudioBlob(finalBlob);

        // Convert to data url for persistent state
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioUrl(reader.result as string);
        };
        reader.readAsDataURL(finalBlob);

        stopTracks();
      };

      mediaRecorder.start(250); // Slice data every 250ms
      setIsRecording(true);
      setIsPaused(false);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
        // Random visualizer bounce
        setAudioLevels([
          Math.floor(20 + Math.random() * 80),
          Math.floor(30 + Math.random() * 70),
          Math.floor(40 + Math.random() * 60),
          Math.floor(60 + Math.random() * 40),
          Math.floor(30 + Math.random() * 70),
          Math.floor(50 + Math.random() * 50),
          Math.floor(20 + Math.random() * 80),
          Math.floor(40 + Math.random() * 60),
        ]);
      }, 1000);
    } catch (err: any) {
      console.error("Erreur d'accès au micro :", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage("Veuillez autoriser l'accès au microphone dans les paramètres de votre navigateur.");
      } else {
        setErrorMessage("Impossible d'accéder au microphone : " + (err.message || 'Erreur inconnue'));
      }
      stopTracks();
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resetRecording = () => {
    stopTracks();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setAudioUrl(null);
    setAudioBlob(null);
    setErrorMessage(null);
    audioChunksRef.current = [];
  };

  const handleConfirmAudio = () => {
    if (!audioUrl || !audioBlob) return;

    const sizeInKb = (audioBlob.size / 1024).toFixed(1);
    const sizeStr = `${sizeInKb} KB`;
    const extension = audioBlob.type.includes('mp4') ? 'm4a' : audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
    const generatedName = `Remarque_vocale_${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')}.${extension}`;

    onSaveAudio({
      url: audioUrl,
      duration: recordingTime > 0 ? recordingTime : 1,
      name: generatedName,
      size: sizeStr,
      blob: audioBlob,
    });

    resetRecording();
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-[#f8f9ff] border border-[#c8c4d5]/80 rounded-2xl p-4 md:p-5 shadow-xs space-y-4">
      {/* Title & Cancel */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#eff4ff] text-[#1f108e] flex items-center justify-center border border-[#c8c4d5]/40">
            <span className="material-symbols-outlined text-lg">mic</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#0b1c30]">{title}</h4>
            <p className="text-[11px] text-[#777584]">Enregistrez un message vocal pour expliquer votre besoin</p>
          </div>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={() => {
              resetRecording();
              onCancel();
            }}
            className="text-xs text-[#777584] hover:text-[#ba1a1a] p-1 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        )}
      </div>

      {/* Error display */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
          <span className="material-symbols-outlined text-base flex-shrink-0 text-red-500">error</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1. Initial State: Start Recording Button */}
      {!isRecording && !audioUrl && (
        <div className="flex flex-col sm:flex-row items-center gap-3 p-4 bg-white border border-[#c8c4d5]/60 rounded-xl">
          <button
            type="button"
            onClick={startRecording}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#1f108e] hover:bg-[#3730a3] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-base">radio_button_checked</span>
            Commencer l'enregistrement vocal
          </button>
          <span className="text-[11px] text-[#777584] text-center sm:text-left">
            Parlez clairement dans le micro de votre smartphone ou ordinateur.
          </span>
        </div>
      )}

      {/* 2. Recording in Progress State */}
      {isRecording && (
        <div className="p-4 bg-white border border-red-200 rounded-xl space-y-3 animate-in fade-in duration-200 shadow-2xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
              </span>
              <span className="text-xs font-bold text-red-700 font-mono tracking-wider">
                {isPaused ? 'EN PAUSE' : 'ENREGISTREMENT...'} {formatTimer(recordingTime)}
              </span>
            </div>

            {/* Waveform Visualizer */}
            {!isPaused && (
              <div className="flex items-center gap-1 h-6 px-2 bg-red-50 rounded-lg">
                {audioLevels.map((lvl, i) => (
                  <span
                    key={i}
                    style={{ height: `${lvl}%` }}
                    className="w-1 bg-red-500 rounded-full transition-all duration-200"
                  ></span>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons: Pause / Resume / Stop / Cancel */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
            {isPaused ? (
              <button
                type="button"
                onClick={resumeRecording}
                className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200 text-xs font-bold flex items-center gap-1 transition-all"
              >
                <span className="material-symbols-outlined text-sm">play_arrow</span>
                Reprendre
              </button>
            ) : (
              <button
                type="button"
                onClick={pauseRecording}
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-[#0b1c30] hover:bg-slate-200 text-xs font-semibold flex items-center gap-1 transition-all"
              >
                <span className="material-symbols-outlined text-sm">pause</span>
                Pause
              </button>
            )}

            <button
              type="button"
              onClick={stopRecording}
              className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">stop</span>
              Arrêter & Écouter
            </button>

            <button
              type="button"
              onClick={resetRecording}
              className="px-3 py-1.5 rounded-lg text-[#777584] hover:text-[#ba1a1a] hover:bg-slate-100 text-xs font-medium transition-all ml-auto"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* 3. Finished Recording Preview & Confirmation State */}
      {!isRecording && audioUrl && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <AudioPlayer
            src={audioUrl}
            duration={recordingTime}
            fileName={`Remarque vocale (${formatTimer(recordingTime)})`}
            size={audioBlob ? `${(audioBlob.size / 1024).toFixed(1)} KB` : undefined}
          />

          <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
            <button
              type="button"
              onClick={startRecording}
              className="px-3 py-2 rounded-xl border border-[#c8c4d5] bg-white hover:bg-slate-50 text-xs font-semibold text-[#464553] flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Recommencer l'enregistrement
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetRecording}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-[#777584] hover:text-[#ba1a1a] transition-colors"
              >
                Supprimer
              </button>
              <button
                type="button"
                onClick={handleConfirmAudio}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Joindre la note vocale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
