import React from 'react';
import { AppNotification } from '../../types';

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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 bg-slate-900/20 backdrop-blur-xs">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-[#c8c4d5]/60 overflow-hidden mt-14 animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="p-4 bg-[#eff4ff] border-b border-[#c8c4d5]/40 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#1f108e]">notifications</span>
            <h3 className="font-bold text-sm text-[#0b1c30]">Notifications System</h3>
            {unreadCount > 0 && (
              <span className="bg-[#ba1a1a] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#777584] hover:bg-[#dce9ff] rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="divide-y divide-[#c8c4d5]/30 max-h-[380px] overflow-y-auto">
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

        <div className="p-3 bg-[#eff4ff] text-center border-t border-[#c8c4d5]/40">
          <button
            onClick={() => {
              onMarkAllRead();
            }}
            className="text-xs font-bold text-[#1f108e] hover:underline"
          >
            Tout marquer comme lu
          </button>
        </div>
      </div>
    </div>
  );
};
