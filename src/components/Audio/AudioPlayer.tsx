import React, { useState, useRef, useEffect } from 'react';

interface AudioPlayerProps {
  src: string;
  duration?: number;
  fileName?: string;
  size?: string;
  compact?: boolean;
  className?: string;
  onDelete?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  duration,
  fileName,
  size,
  compact = false,
  className = '',
  onDelete,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setAudioDuration(Math.round(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.error('Audio playback error:', e);
        setIsPlaying(false);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const skipTime = (seconds: number) => {
    if (!audioRef.current) return;
    const newTime = Math.min(Math.max(0, audioRef.current.currentTime + seconds), audioDuration || 1000);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const changeSpeed = (speed: number) => {
    setPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    audioRef.current.muted = newMuted;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
      if (newVol === 0) {
        setIsMuted(true);
        audioRef.current.muted = true;
      } else if (isMuted) {
        setIsMuted(false);
        audioRef.current.muted = false;
      }
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const downloadAudio = () => {
    const a = document.createElement('a');
    a.href = src;
    a.download = fileName || 'remarque-vocale.webm';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const progressPercent = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  // Generate synthetic waveform bars
  const totalBars = 32;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#eff4ff] border border-[#c8c4d5]/60 text-xs text-[#0b1c30] shadow-2xs ${className}`}>
        <audio ref={audioRef} src={src} preload="metadata" />
        <button
          type="button"
          onClick={togglePlay}
          className="w-6 h-6 rounded-full bg-[#1f108e] text-white flex items-center justify-center hover:opacity-90 transition-all flex-shrink-0"
        >
          <span className="material-symbols-outlined text-sm">
            {isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>
        <div className="flex items-center gap-1 font-geist text-[11px] text-[#464553]">
          <span className="material-symbols-outlined text-xs text-[#1f108e]">mic</span>
          <span>{formatTime(currentTime)} / {formatTime(audioDuration)}</span>
        </div>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="text-[#777584] hover:text-[#ba1a1a] p-0.5 ml-1 transition-colors"
            title="Supprimer la note vocale"
          >
            <span className="material-symbols-outlined text-xs">close</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-[#ffffff] via-[#f8faff] to-[#eef4ff] border border-[#c8c4d5]/80 rounded-2xl p-3.5 sm:p-4 shadow-sm relative overflow-hidden ${className}`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Header Info */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#1f108e]/10 text-[#1f108e] flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-base">graphic_eq</span>
          </div>
          <div className="min-w-0">
            <h5 className="text-xs font-bold text-[#0b1c30] truncate">
              {fileName || 'Remarque vocale'}
            </h5>
            {size && (
              <span className="text-[10px] text-[#777584] font-geist">
                Fichier audio • {size}
              </span>
            )}
          </div>
        </div>

        {/* Speed & Download actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Speed selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white border border-[#c8c4d5]/70 text-[#1f108e] hover:bg-[#eff4ff] transition-colors"
              title="Vitesse de lecture"
            >
              {playbackRate}x
            </button>
            {showSpeedMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-[#c8c4d5]/80 rounded-lg shadow-lg py-1 z-20 flex flex-col w-16">
                {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => changeSpeed(s)}
                    className={`px-2 py-1 text-[11px] text-left hover:bg-[#eff4ff] ${playbackRate === s ? 'font-bold text-[#1f108e] bg-[#eff4ff]/60' : 'text-[#464553]'}`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Download Audio */}
          <button
            type="button"
            onClick={downloadAudio}
            className="w-6 h-6 rounded-md hover:bg-white text-[#777584] hover:text-[#1f108e] flex items-center justify-center transition-colors"
            title="Télécharger l'audio"
          >
            <span className="material-symbols-outlined text-sm">download</span>
          </button>

          {/* Delete button if provided */}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="w-6 h-6 rounded-md hover:bg-white text-[#777584] hover:text-[#ba1a1a] flex items-center justify-center transition-colors ml-1"
              title="Supprimer la note vocale"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Visual Waveform Interactive Scrubbing */}
      <div className="mb-2.5">
        <div className="relative flex items-center h-8 bg-[#e8eefc]/50 rounded-xl px-3 py-1 gap-[2px] sm:gap-1 overflow-hidden group cursor-pointer border border-[#c8c4d5]/40">
          {/* Simulated Waveform Bars */}
          {Array.from({ length: totalBars }).map((_, i) => {
            const barProgress = (i / totalBars) * 100;
            const isPassed = barProgress <= progressPercent;
            // Harmonic height curve
            const heightFactor = Math.sin((i / totalBars) * Math.PI) * 0.7 + 0.3;
            const variance = ((i * 17) % 10) / 10 * 0.3;
            const barHeight = Math.max(20, Math.min(100, (heightFactor + variance) * 85));

            return (
              <div
                key={i}
                style={{ height: `${barHeight}%` }}
                className={`flex-1 rounded-full transition-all duration-75 ${
                  isPassed
                    ? 'bg-[#1f108e]'
                    : 'bg-[#c8c4d5]/70 group-hover:bg-[#c8c4d5]'
                }`}
              />
            );
          })}

          {/* Invisible Overlaid Slider for exact scrub control */}
          <input
            type="range"
            min="0"
            max={audioDuration || 100}
            step="0.05"
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            title="Glisser pour avancer ou reculer dans l'audio"
          />
        </div>
      </div>

      {/* Controls & Timing Bar */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Rewind -5s */}
          <button
            type="button"
            onClick={() => skipTime(-5)}
            className="w-7 h-7 rounded-lg hover:bg-white text-[#464553] hover:text-[#1f108e] flex items-center justify-center transition-colors"
            title="Reculer de 5 secondes"
          >
            <span className="material-symbols-outlined text-base">replay_5</span>
          </button>

          {/* Main Play/Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#1f108e] text-white flex items-center justify-center hover:bg-[#3730a3] transition-all shadow-md active:scale-95 flex-shrink-0"
            title={isPlaying ? 'Mettre en pause' : 'Écouter'}
          >
            <span className="material-symbols-outlined text-xl">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>

          {/* Forward +5s */}
          <button
            type="button"
            onClick={() => skipTime(5)}
            className="w-7 h-7 rounded-lg hover:bg-white text-[#464553] hover:text-[#1f108e] flex items-center justify-center transition-colors"
            title="Avancer de 5 secondes"
          >
            <span className="material-symbols-outlined text-base">forward_5</span>
          </button>

          {/* Time display */}
          <div className="text-[11px] sm:text-xs font-mono font-semibold text-[#0b1c30] pl-1">
            <span className="text-[#1f108e]">{formatTime(currentTime)}</span>
            <span className="text-[#777584]"> / {formatTime(audioDuration)}</span>
          </div>
        </div>

        {/* Volume & Mute */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleMute}
            className="w-7 h-7 rounded-lg hover:bg-white text-[#464553] hover:text-[#1f108e] flex items-center justify-center transition-colors"
            title={isMuted ? 'Activer le son' : 'Couper le son'}
          >
            <span className="material-symbols-outlined text-base">
              {isMuted || volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'}
            </span>
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-14 sm:w-18 h-1 bg-[#c8c4d5]/50 rounded-lg appearance-none cursor-pointer accent-[#1f108e] focus:outline-none hidden xs:inline-block"
            title="Volume"
          />
        </div>
      </div>
    </div>
  );
};
