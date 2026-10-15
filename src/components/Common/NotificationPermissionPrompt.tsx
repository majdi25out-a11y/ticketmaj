import React, { useState, useEffect } from 'react';
import {
  getNotificationPermissionStatus,
  requestDeviceNotificationPermission,
  sendTestNotification,
  NotificationPermissionState,
  triggerHapticVibration,
} from '../../utils/deviceNotifications';

interface NotificationPermissionPromptProps {
  currentUser?: { name?: string; email?: string };
}

export const NotificationPermissionPrompt: React.FC<NotificationPermissionPromptProps> = ({
  currentUser,
}) => {
  const [permState, setPermState] = useState<NotificationPermissionState>(() =>
    typeof window !== 'undefined' ? getNotificationPermissionStatus() : 'default'
  );
  const [isDismissed, setIsDismissed] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('tf_notif_prompt_dismissed');
      if (dismissed) {
        setIsDismissed(true);
      }
      setPermState(getNotificationPermissionStatus());
    }
  }, []);

  if (permState === 'granted' || permState === 'unsupported' || isDismissed) {
    return null;
  }

  const handleEnable = async () => {
    setIsLoading(true);
    triggerHapticVibration(true);
    try {
      const granted = await requestDeviceNotificationPermission(currentUser);
      setPermState(getNotificationPermissionStatus());
      if (granted) {
        setSuccessMsg(true);
        await sendTestNotification(currentUser);
        setTimeout(() => {
          setIsDismissed(true);
        }, 3500);
      }
    } catch (_e) {
      // Error requesting permission
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem('tf_notif_prompt_dismissed', 'true');
    } catch (_e) {}
  };

  return (
    <aside
      aria-label="Autorisation des notifications Android"
      className="fixed bottom-20 lg:bottom-5 right-3 sm:right-5 z-40 max-w-sm w-[calc(100vw-1.5rem)] sm:w-auto bg-[#0b1c30] text-white p-4 rounded-2xl shadow-2xl border border-indigo-500/40 animate-in fade-in slide-in-from-bottom-3 duration-300 select-none"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-xl">notifications_active</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white leading-tight flex items-center gap-1.5">
            <span>Activer les notifications Android ?</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold px-1.5 py-0.2 rounded">
              Web Push
            </span>
          </p>
          <p className="text-[11px] text-slate-300 mt-1 leading-snug">
            Recevez les alertes en temps réel, même lorsque votre téléphone est verrouillé ou que l'application est en arrière-plan.
          </p>

          {successMsg ? (
            <p className="mt-2 text-xs font-bold text-emerald-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Notifications actives ! Test système envoyé.
            </p>
          ) : (
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={handleEnable}
                disabled={isLoading}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shadow-xs active:scale-95 cursor-pointer touch-manipulation flex items-center gap-1"
              >
                <span>{isLoading ? 'Activation...' : 'Activer'}</span>
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="text-slate-400 hover:text-white px-2 py-1.5 text-xs font-semibold cursor-pointer"
              >
                Plus tard
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer shrink-0"
          aria-label="Fermer"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
    </aside>
  );
};
