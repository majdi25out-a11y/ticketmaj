import React, { useState, useEffect } from 'react';
import { AppNotification } from '../../types';
import {
  getNotificationPermissionStatus,
  requestDeviceNotificationPermission,
  sendTestNotification,
  NotificationPermissionState,
} from '../../utils/deviceNotifications';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTicket: (id: string) => void;
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  currentUser?: { name: string; role: string; email?: string };
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onSelectTicket,
  notifications = [],
  onMarkAllRead,
  currentUser,
}) => {
  const [permStatus, setPermStatus] = useState<NotificationPermissionState>('default');
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPermStatus(getNotificationPermissionStatus());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter relevant notifications for current user (or show all if admin/architect)
  const isAdmin = currentUser?.role.toLowerCase().includes('admin') || currentUser?.role.toLowerCase().includes('architecte');

  const userNotifications = notifications.filter((n) => {
    if (isAdmin) return true;
    if (!n.targetUserEmail && !n.targetUserName) return true; // Global
    if (currentUser?.email && n.targetUserEmail?.toLowerCase() === currentUser.email.toLowerCase()) return true;
    if (currentUser?.name && n.targetUserName?.toLowerCase() === currentUser.name.toLowerCase()) return true;
    return false;
  });

  const unreadCount = userNotifications.filter((n) => !n.read).length;

  const handleRequestPermission = async () => {
    const granted = await requestDeviceNotificationPermission();
    setPermStatus(getNotificationPermissionStatus());
    if (granted) {
      setTestResult('Notifications autorisées avec succès !');
      setTimeout(() => setTestResult(null), 3000);
    }
  };

  const handleTestNotification = async () => {
    setTestResult('Envoi en cours...');
    const ok = await sendTestNotification();
    setPermStatus(getNotificationPermissionStatus());
    if (ok) {
      setTestResult('Notification système envoyée sur votre appareil !');
    } else {
      setTestResult('Veuillez autoriser les notifications sur votre navigateur/appareil.');
    }
    setTimeout(() => setTestResult(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 bg-slate-900/20 backdrop-blur-xs">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-[#c8c4d5]/60 overflow-hidden mt-14 animate-in fade-in slide-in-from-top-4 duration-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-[#eff4ff] border-b border-[#c8c4d5]/40 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#1f108e]">notifications</span>
            <h3 className="font-bold text-sm text-[#0b1c30]">Notifications Système</h3>
            {unreadCount > 0 && (
              <span className="bg-[#ba1a1a] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#777584] hover:bg-[#dce9ff] rounded-full transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Android / Device Push Notifications Control Panel */}
        <div className="p-3 bg-gradient-to-r from-indigo-50/80 to-emerald-50/80 border-b border-[#c8c4d5]/40 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-emerald-600">smartphone</span>
              <span>Statut Android & PWA</span>
            </span>
            <span
              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                permStatus === 'granted'
                  ? 'bg-emerald-100 text-emerald-800'
                  : permStatus === 'denied'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {permStatus === 'granted' ? 'Activé' : permStatus === 'denied' ? 'Bloqué' : 'En attente'}
            </span>
          </div>

          <p className="text-[11px] text-slate-600 leading-tight">
            {permStatus === 'granted'
              ? 'Alertes actives en avant-plan et en arrière-plan avec son et vibration.'
              : permStatus === 'denied'
              ? 'Notifications bloquées dans les paramètres de votre navigateur/Android.'
              : 'Activez les alertes pour recevoir les tickets en temps réel sur votre mobile.'}
          </p>

          <div className="flex items-center gap-2 pt-1">
            {permStatus !== 'granted' ? (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="flex-1 bg-[#1f108e] hover:bg-[#170b6e] text-white text-[11px] font-bold py-1.5 px-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">notifications_active</span>
                <span>Activer les notifications</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleTestNotification}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-1.5 px-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">ring_volume</span>
                <span>Tester la notification</span>
              </button>
            )}
          </div>

          {testResult && (
            <p className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 p-1.5 rounded-lg text-center animate-in fade-in">
              {testResult}
            </p>
          )}
        </div>

        {/* Notifications List */}
        <div className="divide-y divide-[#c8c4d5]/30 flex-1 overflow-y-auto">
          {userNotifications.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#777584]">
              Aucune notification pour le moment.
            </div>
          ) : (
            userNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (n.ticketId) {
                    onSelectTicket(n.ticketId);
                  }
                  onClose();
                }}
                className={`p-3.5 hover:bg-[#eff4ff]/60 cursor-pointer transition-colors space-y-1 ${
                  !n.read ? 'bg-indigo-50/40 border-l-4 border-l-[#1f108e]' : ''
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold ${n.urgent ? 'text-[#ba1a1a]' : 'text-[#0b1c30]'}`}>
                    {n.title}
                  </span>
                  <span className="text-[10px] text-[#777584] font-geist">{n.time}</span>
                </div>
                <p className="text-xs text-[#464553]">{n.desc}</p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#eff4ff] text-center border-t border-[#c8c4d5]/40 flex-shrink-0">
          <button
            onClick={() => {
              onMarkAllRead();
            }}
            className="text-xs font-bold text-[#1f108e] hover:underline cursor-pointer"
          >
            Tout marquer comme lu
          </button>
        </div>
      </div>
    </div>
  );
};
