import React, { useState } from 'react';
import { DEFAULT_CARTOON_AVATAR } from '../../data/avatars';
import { ViewMode, AppBrandingConfig } from '../../types';
import { ThemePicker } from './ThemePicker';
import { triggerHapticVibration, getNotificationPermissionStatus } from '../../utils/deviceNotifications';
import { useDevicePlatform } from '../../hooks/useDevicePlatform';

interface NavbarProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  currentUser: {
    name: string;
    role: string;
    avatar: string;
    token?: string;
    expiresAt?: number;
  };
  developers?: { id: string; name: string; role: string; avatar: string }[];
  onSwitchUser: (user: { name: string; role: string; avatar: string }) => void;
  onOpenNotifications: () => void;
  onOpenSupport: () => void;
  onOpenExportModal?: () => void;
  onOpenImportModal?: () => void;
  onOpenMobileApkModal?: () => void;
  onToggleSidebar?: () => void;
  onLogout?: () => void;
  onManualSync?: () => void;
  isSyncing?: boolean;
  dbStatus?: { connected: boolean; message?: string; syncStatus?: string };
  unreadCount?: number;
  branding?: AppBrandingConfig;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  currentUser,
  developers = [],
  onSwitchUser,
  onOpenNotifications,
  onOpenSupport,
  onOpenExportModal,
  onOpenImportModal,
  onOpenMobileApkModal,
  onToggleSidebar,
  onLogout,
  onManualSync,
  isSyncing = false,
  dbStatus = { connected: true, syncStatus: 'synced' },
  unreadCount = 0,
  branding,
}) => {
  const { isAndroid } = useDevicePlatform();
  const [searchQuery, setSearchQuery] = useState('');
  const appName = branding?.appName || 'TicketFlow';
  const appLogoUrl = branding?.appLogoUrl;
  const isAdmin =
    currentUser?.role?.toLowerCase().includes('admin') ||
    currentUser?.role?.toLowerCase().includes('architect');

  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const notifPermission = typeof window !== 'undefined' ? getNotificationPermissionStatus() : 'default';

  return (
    <header
      className={`fixed top-0 right-0 left-0 lg:left-[260px] z-40 bg-white/95 backdrop-blur-md border-b border-[#c8c4d5]/40 flex justify-between items-center transition-all duration-300 ${
        isAndroid
          ? 'h-16 pt-[calc(env(safe-area-inset-top)+0.2rem)] px-3 sm:px-6 shadow-[0_2px_12px_rgba(31,16,142,0.06)]'
          : 'h-16 px-3.5 md:px-8'
      }`}
    >
      {/* Left side: Hamburger for mobile + Brand */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-[#464553] hover:bg-[#eff4ff] active:bg-[#dce9ff] rounded-xl cursor-pointer touch-manipulation"
          aria-label="Open sidebar"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>

        {/* Brand preview on mobile */}
        <div className="lg:hidden flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 bg-[#1f108e] rounded-lg flex items-center justify-center text-white font-bold text-xs overflow-hidden flex-shrink-0 p-0.5 shadow-xs">
            {appLogoUrl ? (
              <img
                src={appLogoUrl}
                alt="Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              appName.substring(0, 2).toUpperCase()
            )}
          </div>
          <span className="font-extrabold text-[#0b1c30] text-sm truncate max-w-[120px] sm:max-w-[180px]">
            {appName}
          </span>
        </div>

        {/* Global Search Bar (Desktop) */}
        <div className="relative hidden md:block w-64 lg:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#777584] text-base">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un ticket, tag..."
            className="w-full bg-[#f8f9ff] border border-[#c8c4d5]/60 rounded-xl pl-9 pr-4 py-1.5 text-xs text-[#0b1c30] placeholder-[#777584] focus:ring-2 focus:ring-[#1f108e]/20 focus:border-[#1f108e] outline-none transition-all"
          />
        </div>

        {/* Live Database Sync Badge & Button */}
        {onManualSync && (
          <button
            type="button"
            onClick={onManualSync}
            disabled={isSyncing}
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
              dbStatus.connected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
            title="Base de données synchronisée en continu. Cliquez pour forcer l'actualisation immédiate."
          >
            <span
              className={`w-2 h-2 rounded-full ${
                dbStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="material-symbols-outlined text-sm ${isSyncing ? 'animate-spin' : ''}">
              sync
            </span>
            <span className="hidden xl:inline">
              {isSyncing ? 'Synchronisation...' : 'BDD Synchronisée'}
            </span>
          </button>
        )}
      </div>

      {/* Right side: Actions, Notifications, User Persona */}
      <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
        {/* Mobile search toggle button */}
        <button
          type="button"
          onClick={() => setShowMobileSearch(!showMobileSearch)}
          className="md:hidden p-2 text-[#464553] hover:bg-[#eff4ff] rounded-xl cursor-pointer"
          title="Rechercher"
        >
          <span className="material-symbols-outlined text-xl">search</span>
        </button>

        {/* Rapid "Nouveau ticket" CTA button on desktop */}
        <button
          onClick={() => onNavigate('create_ticket')}
          className="hidden sm:flex items-center gap-1.5 bg-[#1f108e] text-white text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-[#312e81] transition-all shadow-xs active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">add</span>
          <span>{isAdmin ? 'Nouveau Ticket' : 'Proposer Ticket'}</span>
        </button>

        {/* Theme Picker Button */}
        <ThemePicker />

        {/* Import Excel Button (Admin Only) */}
        {isAdmin && onOpenImportModal && (
          <button
            onClick={onOpenImportModal}
            className="p-2 text-[#006c4a] hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
            title="Importer données Excel (.xlsx, .xls, .csv)"
          >
            <span className="material-symbols-outlined text-xl">upload_file</span>
          </button>
        )}

        {/* Export Button */}
        {onOpenExportModal && (
          <button
            onClick={onOpenExportModal}
            className="p-2 text-[#1f108e] hover:bg-[#eff4ff] rounded-xl transition-colors cursor-pointer"
            title="Exporter XLSX / PDF"
          >
            <span className="material-symbols-outlined text-xl">download</span>
          </button>
        )}

        {/* Mobile APK Generation Button */}
        {onOpenMobileApkModal && (
          <button
            type="button"
            onClick={onOpenMobileApkModal}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200/90 transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Version Mobile & Générateur APK Android"
          >
            <span className="material-symbols-outlined text-base text-emerald-700">
              android
            </span>
            <span className="hidden xl:inline text-[11px] font-extrabold">APK Mobile</span>
          </button>
        )}

        {/* Notifications */}
        <button
          onClick={() => {
            triggerHapticVibration(false);
            onOpenNotifications();
          }}
          className="p-2 text-[#464553] hover:bg-[#eff4ff] active:scale-95 rounded-xl transition-all relative cursor-pointer touch-manipulation"
          title="Notifications (Avant et Arrière-plan)"
        >
          <span className="material-symbols-outlined text-xl">notifications</span>
          {unreadCount > 0 ? (
            <span className="absolute 1 top-1 right-1 min-w-[16px] h-[16px] px-1 bg-[#ba1a1a] text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : isAndroid && notifPermission === 'granted' ? (
            <span className="absolute bottom-1 right-1 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white" title="Notifications Android Actives" />
          ) : null}
        </button>

        {/* Help / Support button */}
        <button
          onClick={onOpenSupport}
          className="hidden sm:flex p-2 text-[#464553] hover:bg-[#eff4ff] rounded-xl transition-colors cursor-pointer"
          title="Support & Aide"
        >
          <span className="material-symbols-outlined text-xl">help</span>
        </button>

        <div className="h-6 w-px bg-[#c8c4d5]/50 hidden sm:block"></div>

        {/* Current User Info with Session Badge */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onNavigate('settings')}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-[#eff4ff] transition-all cursor-pointer group text-left touch-manipulation"
            title="Mon Profil & Paramètres de Session"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden border border-[#c8c4d5] shadow-2xs group-hover:border-[#1f108e] relative">
              <img
                src={currentUser.avatar || DEFAULT_CARTOON_AVATAR}
                alt={currentUser.name || 'User'}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="hidden md:block">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold leading-tight text-[#0b1c30] group-hover:text-[#1f108e] truncate max-w-[110px]">
                  {currentUser.name || 'Utilisateur'}
                </p>
                <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-mono" title="Durée du token : 1h">
                  1h
                </span>
              </div>
              <p className="text-[10px] text-[#1f108e] font-bold tracking-wider uppercase truncate">
                {currentUser.role || 'Membre'}
              </p>
            </div>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              title="Déconnexion"
              className="p-2 text-[#777584] hover:text-[#ba1a1a] hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Mobile Search Bar */}
      {showMobileSearch && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-[#c8c4d5]/60 p-3 shadow-md animate-in slide-in-from-top-2 duration-150">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#777584] text-base">
              search
            </span>
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un ticket, ID..."
              className="w-full bg-[#f8f9ff] border border-[#c8c4d5]/80 rounded-xl pl-9 pr-9 py-2 text-xs text-[#0b1c30] placeholder-[#777584] outline-none"
            />
            <button
              type="button"
              onClick={() => setShowMobileSearch(false)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#777584] p-1"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
