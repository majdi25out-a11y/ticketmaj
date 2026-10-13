import React from 'react';
import { ViewMode } from '../../types';

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
  const isTicketsActive = currentView === 'tickets' || currentView === 'ticket_detail' || currentView === 'dev_tasks';

  return (
    <nav
      aria-label="Navigation Mobile"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#c8c4d5]/50 px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[calc(env(safe-area-inset-bottom)+0.375rem)]"
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {/* 1. Dashboard */}
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 active:scale-90 touch-manipulation cursor-pointer ${
            currentView === 'dashboard'
              ? 'text-[#1f108e] font-bold'
              : 'text-[#464553] hover:text-[#0b1c30]'
          }`}
        >
          <div className="relative">
            <span
              className={`material-symbols-outlined text-[22px] transition-transform ${
                currentView === 'dashboard' ? 'scale-110' : ''
              }`}
            >
              dashboard
            </span>
          </div>
          <span className="text-[10px] tracking-tight whitespace-nowrap mt-0.5 font-geist">
            Dashboard
          </span>
        </button>

        {/* 1b. Projets */}
        <button
          type="button"
          onClick={() => onNavigate('projects')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 active:scale-90 touch-manipulation cursor-pointer ${
            currentView === 'projects'
              ? 'text-[#1f108e] font-bold'
              : 'text-[#464553] hover:text-[#0b1c30]'
          }`}
        >
          <div className="relative">
            <span
              className={`material-symbols-outlined text-[22px] transition-transform ${
                currentView === 'projects' ? 'scale-110' : ''
              }`}
            >
              folder_open
            </span>
          </div>
          <span className="text-[10px] tracking-tight whitespace-nowrap mt-0.5 font-geist">
            Projets
          </span>
        </button>

        {/* 2. Tickets */}
        <button
          type="button"
          onClick={() => onNavigate('tickets')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 active:scale-90 touch-manipulation cursor-pointer ${
            isTicketsActive
              ? 'text-[#1f108e] font-bold'
              : 'text-[#464553] hover:text-[#0b1c30]'
          }`}
        >
          <div className="relative">
            <span
              className={`material-symbols-outlined text-[22px] transition-transform ${
                isTicketsActive ? 'scale-110' : ''
              }`}
            >
              confirmation_number
            </span>
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-2.5 min-w-[15px] h-[15px] px-1 bg-[#ba1a1a] text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight whitespace-nowrap mt-0.5 font-geist">
            Tickets
          </span>
        </button>

        {/* 3. Center CTA: + Nouveau Ticket */}
        <div className="flex-1 flex items-center justify-center px-1">
          <button
            type="button"
            onClick={() => onNavigate('create_ticket')}
            aria-label="Nouveau Ticket"
            className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-90 touch-manipulation cursor-pointer ${
              currentView === 'create_ticket'
                ? 'bg-[#1f108e] text-white ring-4 ring-[#1f108e]/20 scale-105'
                : 'bg-[#1f108e] text-white hover:bg-[#312e81] shadow-[#1f108e]/30'
            }`}
          >
            <span className="material-symbols-outlined text-2xl font-bold">add</span>
          </button>
        </div>

        {/* 4. Team / Users (Admin Only) */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => onNavigate('team')}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 active:scale-90 touch-manipulation cursor-pointer ${
              currentView === 'team'
                ? 'text-[#1f108e] font-bold'
                : 'text-[#464553] hover:text-[#0b1c30]'
            }`}
          >
            <div className="relative">
              <span
                className={`material-symbols-outlined text-[22px] transition-transform ${
                  currentView === 'team' ? 'scale-110' : ''
                }`}
              >
                groups
              </span>
            </div>
            <span className="text-[10px] tracking-tight whitespace-nowrap mt-0.5 font-geist">
              Équipe
            </span>
          </button>
        )}

        {/* 5. Settings / Profile */}
        <button
          type="button"
          onClick={() => onNavigate('settings')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 active:scale-90 touch-manipulation cursor-pointer ${
            currentView === 'settings'
              ? 'text-[#1f108e] font-bold'
              : 'text-[#464553] hover:text-[#0b1c30]'
          }`}
        >
          <div className="relative">
            <span
              className={`material-symbols-outlined text-[22px] transition-transform ${
                currentView === 'settings' ? 'scale-110' : ''
              }`}
            >
              settings
            </span>
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] bg-[#ba1a1a] text-white text-[8px] font-black rounded-full flex items-center justify-center">
                {unreadNotifsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight whitespace-nowrap mt-0.5 font-geist">
            Options
          </span>
        </button>
      </div>
    </nav>
  );
};
