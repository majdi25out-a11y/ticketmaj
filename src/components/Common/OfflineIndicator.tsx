import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-16 sm:bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-50 flex items-center gap-2.5 rounded-xl bg-amber-500/95 text-white px-3.5 py-2 text-xs font-semibold shadow-lg backdrop-blur-md animate-in slide-in-from-bottom-2 duration-200"
    >
      <span className="relative flex h-2 w-2 flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
      </span>
      <div className="flex-1 min-w-0">
        <span className="font-bold">Mode Hors-Ligne Actif</span> — Données locales sauvegardées. Synchronisation automatique dès reconnexion.
      </div>
    </div>
  );
};
