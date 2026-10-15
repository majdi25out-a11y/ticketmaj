import React from 'react';
import { ViewMode } from '../../types';
import { triggerHapticVibration } from '../../utils/deviceNotifications';

interface MobileBottomNavProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  pendingCount?: number;
  unreadNotifsCount?: number;
  isAdmin?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onNavigate,
  pendingCount = 0,
  unreadNotifsCount = 0,
  isAdmin = false,
}) => {
  const isTicketsActive =
    currentView === 'tickets' ||
    currentView === 'ticket_detail' ||
    currentView === 'dev_tasks';

  const navItems = [
    {
      id: 'dashboard' as ViewMode,
      label: 'Accueil',
      icon: 'dashboard',
      isActive: currentView === 'dashboard',
    },
    {
      id: 'projects' as ViewMode,
      label: 'Projets',
      icon: 'folder_open',
      isActive: currentView === 'projects',
    },
    {
      id: 'tickets' as ViewMode,
      label: 'Tickets',
      icon: 'confirmation_number',
      isActive: isTicketsActive,
      badge: pendingCount > 0 ? (pendingCount > 9 ? '9+' : pendingCount) : undefined,
    },
    ...(isAdmin
      ? [
          {
            id: 'team' as ViewMode,
            label: 'Équipe',
            icon: 'groups',
            isActive: currentView === 'team',
          },
        ]
      : []),
    {
      id: 'settings' as ViewMode,
      label: 'Options',
      icon: 'settings',
      isActive: currentView === 'settings',
      badge: unreadNotifsCount > 0 ? (unreadNotifsCount > 9 ? '9+' : unreadNotifsCount) : undefined,
    },
  ];

  const handleItemClick = (viewId: ViewMode) => {
    triggerHapticVibration(false);
    onNavigate(viewId);
  };

  return (
    <nav
      aria-label="Navigation Tactile Android Material 3"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] pb-[calc(env(safe-area-inset-bottom)+0.35rem)] select-none transition-all"
    >
      <div className="max-w-md mx-auto px-3 flex items-center justify-around h-16">
        {navItems.map((item, idx) => {
          // Center CTA placement
          const isBeforeCenter = idx === 2;

          return (
            <React.Fragment key={item.id}>
              {/* Elevated Floating Center CTA Button (+ Nouveau Ticket) */}
              {isBeforeCenter && (
                <div className="flex-1 flex items-center justify-center px-1">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticVibration(true);
                      onNavigate('create_ticket');
                    }}
                    aria-label="Nouveau Ticket"
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center -translate-y-3.5 shadow-xl transition-all duration-200 active:scale-90 touch-manipulation cursor-pointer ${
                      currentView === 'create_ticket'
                        ? 'bg-[#1f108e] text-white ring-4 ring-[#1f108e]/25 scale-105 shadow-[#1f108e]/40'
                        : 'bg-gradient-to-tr from-[#1f108e] via-[#2917aa] to-[#3730a3] text-white hover:opacity-95 shadow-[#1f108e]/35'
                    }`}
                  >
                    <span className="material-symbols-outlined text-2xl font-bold">add</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleItemClick(item.id)}
                className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 active:scale-92 touch-manipulation cursor-pointer relative ${
                  item.isActive
                    ? 'text-[#1f108e] font-extrabold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {/* Android Material 3 Pill Indicator */}
                <div
                  className={`relative flex items-center justify-center px-3.5 py-1 rounded-full transition-all duration-200 ${
                    item.isActive ? 'bg-[#1f108e]/12' : 'bg-transparent'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[22px] transition-transform ${
                      item.isActive ? 'scale-110 font-bold' : ''
                    }`}
                  >
                    {item.icon}
                  </span>
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-[#ba1a1a] text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
                      {item.badge}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[10px] tracking-tight whitespace-nowrap mt-0.5 leading-none transition-colors ${
                    item.isActive ? 'font-bold text-[#1f108e]' : 'font-medium text-slate-500'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
};
