import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallBannerProps {
  onOpenMobileModal: () => void;
  appName?: string;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  onOpenMobileModal,
  appName = 'TicketFlow',
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);

  // If already running in standalone mode (installed as PWA/WebAPK) or dismissed, hide
  if (isInstalled || isDismissed) {
    return null;
  }

  return (
    <div className="lg:pl-[260px] pt-16 w-full">
      <div className="bg-gradient-to-r from-[#1f108e] via-[#2e1aa8] to-[#3730a3] text-white px-3 sm:px-4 py-2 flex items-center justify-between text-xs shadow-sm relative z-30 transition-all">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-sm text-emerald-300">
            install_mobile
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-bold truncate text-[11px] sm:text-xs">
            Version Mobile & APK disponible pour {appName}
          </p>
          <p className="text-[10px] text-indigo-100 hidden sm:block truncate">
            Installez l'application sur votre smartphone ou générez l'APK natif Android.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isInstallable && (
          <button
            type="button"
            onClick={install}
            className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-lg text-[11px] transition-all shadow-xs cursor-pointer flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-xs">download</span>
            <span>Installer APK</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenMobileModal}
          className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white font-bold rounded-lg text-[11px] transition-all cursor-pointer flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-xs">settings</span>
          <span className="hidden sm:inline">Options Mobile</span>
          <span className="sm:hidden">APK</span>
        </button>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="p-1 text-white/70 hover:text-white rounded-md cursor-pointer"
          aria-label="Ignorer le bandeau"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>
    </div>
  </div>
  );
};
