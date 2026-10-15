import React, { useState, useEffect } from 'react';
import {
  getNotificationPermissionStatus,
  requestDeviceNotificationPermission,
  sendTestNotification,
  isAndroidDevice,
} from '../../utils/deviceNotifications';

interface AndroidNotificationCardProps {
  currentUser?: { name?: string; email?: string; role?: string };
  onShowToast?: (msg: string) => void;
  compact?: boolean;
}

export const AndroidNotificationCard: React.FC<AndroidNotificationCardProps> = ({
  currentUser,
  onShowToast,
  compact = false,
}) => {
  const [permission, setPermission] = useState<string>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    setPermission(getNotificationPermissionStatus());
    setIsAndroid(isAndroidDevice());
  }, []);

  const handleRequestPermission = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const granted = await requestDeviceNotificationPermission(currentUser);
      const newStatus = getNotificationPermissionStatus();
      setPermission(newStatus);
      if (granted) {
        setFeedback('Notifications Android activées avec succès (avant-plan et arrière-plan) !');
        if (onShowToast) onShowToast('Notifications Android activées avec succès !');
      } else {
        setFeedback('Autorisation non accordée. Veuillez vérifier les paramètres de votre navigateur.');
      }
    } catch (_e) {
      setFeedback('Erreur lors de la demande d\'autorisation.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const result = await sendTestNotification(currentUser);
      setFeedback(result.message);
      if (onShowToast) onShowToast(result.message);
      setPermission(getNotificationPermissionStatus());
    } catch (_e) {
      setFeedback('Erreur lors de l\'envoi de la notification test.');
    } finally {
      setIsLoading(false);
    }
  };

  const isGranted = permission === 'granted';
  const isDenied = permission === 'denied';

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-[#1f108e]/10 to-[#312e81]/10 border border-[#1f108e]/20 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#1f108e] text-white flex items-center justify-center shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-lg">
              {isGranted ? 'notifications_active' : 'notifications'}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[#0b1c30] truncate">Notifications Android</span>
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isGranted ? 'bg-emerald-500 animate-pulse' : isDenied ? 'bg-rose-500' : 'bg-amber-500'
                }`}
              />
            </div>
            <p className="text-[11px] text-[#464553] truncate">
              {isGranted ? 'Actives (avant et arrière-plan)' : 'Désactivées sur cet appareil'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isGranted ? (
            <button
              type="button"
              onClick={handleRequestPermission}
              disabled={isLoading}
              className="px-3 py-1.5 bg-[#1f108e] hover:bg-[#312e81] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer touch-manipulation"
            >
              Activer
            </button>
          ) : (
            <button
              type="button"
              onClick={handleTestNotification}
              disabled={isLoading}
              className="px-2.5 py-1.5 bg-white border border-[#1f108e]/30 text-[#1f108e] text-xs font-bold rounded-xl hover:bg-[#eff4ff] transition-all active:scale-95 cursor-pointer touch-manipulation flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">send</span>
              <span>Tester</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#c8c4d5]/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#eff4ff] border border-[#1f108e]/20 text-[#1f108e] flex items-center justify-center shrink-0 shadow-2xs">
            <span className="material-symbols-outlined text-2xl">
              {isGranted ? 'notifications_active' : 'notifications'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-[#0b1c30]">Notifications Android & Web Push</h4>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                  isGranted
                    ? 'bg-emerald-100 text-emerald-800'
                    : isDenied
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isGranted ? 'bg-emerald-600 animate-pulse' : isDenied ? 'bg-rose-600' : 'bg-amber-600'
                  }`}
                />
                {isGranted ? 'Autorisées' : isDenied ? 'Bloquées' : 'À Activer'}
              </span>
            </div>
            <p className="text-xs text-[#777584] mt-0.5">
              Réception en temps réel en fonctionnement (avant-plan) et lorsque l'écran est verrouillé (arrière-plan).
            </p>
          </div>
        </div>

        {isAndroid && (
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 hidden sm:inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">android</span>
            <span>Appareil Android Détecté</span>
          </span>
        )}
      </div>

      {/* Feature Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-[#f8f9ff] border border-[#c8c4d5]/40 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-[#1f108e]">speed</span>
          <div>
            <p className="font-bold text-[#0b1c30]">Avant-plan</p>
            <p className="text-[11px] text-[#777584]">Sonnette & vibration haptique</p>
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-[#f8f9ff] border border-[#c8c4d5]/40 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-[#1f108e]">cloud_sync</span>
          <div>
            <p className="font-bold text-[#0b1c30]">Arrière-plan (FCM)</p>
            <p className="text-[11px] text-[#777584]">Push système autonome</p>
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-[#f8f9ff] border border-[#c8c4d5]/40 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-[#1f108e]">touch_app</span>
          <div>
            <p className="font-bold text-[#0b1c30]">Ouverture directe</p>
            <p className="text-[11px] text-[#777584]">Clic ouvre le ticket concerné</p>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-blue-700">info</span>
          <span>{feedback}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        {!isGranted ? (
          <button
            type="button"
            onClick={handleRequestPermission}
            disabled={isLoading}
            className="px-4 py-2 bg-[#1f108e] hover:bg-[#312e81] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer touch-manipulation flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">notifications</span>
            <span>{isLoading ? 'Activation en cours...' : 'Activer les notifications Android'}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <span className="material-symbols-outlined text-sm">verified</span>
              <span>Abonnement Push actif</span>
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={handleTestNotification}
          disabled={isLoading}
          className="px-3.5 py-2 bg-white border border-[#c8c4d5] hover:border-[#1f108e] text-[#0b1c30] hover:text-[#1f108e] text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer touch-manipulation flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-base text-[#1f108e]">vibration</span>
          <span>Envoyer une notification test</span>
        </button>
      </div>
    </div>
  );
};
