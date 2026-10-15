import React from 'react';
import { ViewMode, AppBrandingConfig } from '../../types';
import { useDevicePlatform } from '../../hooks/useDevicePlatform';
import { triggerHapticVibration } from '../../utils/deviceNotifications';
import { DEFAULT_CARTOON_AVATAR } from '../../data/avatars';

interface SidebarProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  pendingCount?: number;
  onLogout: () => void;
  currentUser?: { name: string; role: string; avatar: string; email?: string };
  branding?: AppBrandingConfig;
  onOpenExportModal?: () => void;
  onOpenImportModal?: () => void;
  onOpenMobileApkModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  pendingCount = 24,
  onLogout,
  currentUser,
  branding,
  onOpenExportModal,
  onOpenImportModal,
  onOpenMobileApkModal,
}) => {
  const { isAndroid } = useDevicePlatform();
  const appName = branding?.appName || 'TicketFlow';
  const appSubtitle = branding?.appSubtitle || 'Operational Control';
  const appLogoUrl = branding?.appLogoUrl;
  const isAdmin =
    currentUser?.role?.toLowerCase().includes('admin') ||
    currentUser?.role?.toLowerCase().includes('architect') ||
    currentUser?.email === 'admin@ticketflow.io';

  const navItems = [
    {
      id: 'dashboard' as ViewMode,
      label: 'Tableau de bord',
      icon: 'dashboard',
    },
    {
      id: 'projects' as ViewMode,
      label: 'Projets',
      icon: 'folder_open',
    },
    {
      id: 'tickets' as ViewMode,
      label: 'Tickets & Tâches',
      icon: 'confirmation_number',
      count: pendingCount > 0 ? pendingCount : undefined,
    },
    ...(isAdmin
      ? [
          {
            id: 'team' as ViewMode,
            label: 'Équipe & Utilisateurs',
            icon: 'groups',
            badge: 'Admin',
          },
        ]
      : []),
    {
      id: 'settings' as ViewMode,
      label: 'Paramètres & Profil',
      icon: 'settings',
    },
  ];

  const handleNavClick = (viewId: ViewMode) => {
    triggerHapticVibration(false);
    onNavigate(viewId);
    if (onCloseMobile) onCloseMobile();
  };

  const renderContent = (isMobileDrawer: boolean) => (
    <div className="flex flex-col h-full py-4 overflow-y-auto">
      {/* Brand & User Profile Header on Mobile */}
      {isMobileDrawer && currentUser ? (
        <div className="px-5 pb-5 mb-3 border-b border-slate-200/80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#1f108e] rounded-xl flex items-center justify-center text-white shadow-xs p-1">
                {appLogoUrl ? (
                  <img src={appLogoUrl} alt="" className="w-full h-full object-contain" />
                ) : (
                  <span className="material-symbols-outlined text-lg">confirmation_number</span>
                )}
              </div>
              <span className="font-black text-sm text-[#0b1c30]">{appName}</span>
            </div>
            {isAndroid && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">android</span>
                <span>Android UI</span>
              </span>
            )}
          </div>

          {/* User Card */}
          <div className="p-3 bg-gradient-to-tr from-[#1f108e]/8 to-[#312e81]/5 rounded-2xl border border-[#1f108e]/15 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-xs shrink-0">
              <img
                src={currentUser.avatar || DEFAULT_CARTOON_AVATAR}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#0b1c30] truncate">{currentUser.name}</p>
              <p className="text-[10px] text-[#777584] truncate">{currentUser.email || 'Session active'}</p>
              <span className="inline-block mt-0.5 text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-[#eff4ff] text-[#1f108e] rounded">
                {currentUser.role}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Standard Brand Header on Desktop */
        <div className="px-5 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1f108e] rounded-xl flex items-center justify-center text-white shadow-xs overflow-hidden flex-shrink-0 p-1">
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
              <span className="material-symbols-outlined text-2xl">confirmation_number</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-black tracking-tight text-[#0b1c30] leading-none truncate">
              {appName}
            </h1>
            <p className="text-[10px] font-bold text-[#1f108e] tracking-wider uppercase mt-1 truncate">
              {appSubtitle}
            </p>
          </div>
        </div>
      )}

      {/* Primary Action Button */}
      <div className="px-4 mb-4">
        <button
          type="button"
          onClick={() => {
            triggerHapticVibration(true);
            onNavigate('create_ticket');
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full flex items-center justify-center gap-2 bg-[#1f108e] text-white py-2.5 px-4 rounded-xl text-xs font-bold hover:bg-[#312e81] active:scale-[0.98] transition-all shadow-sm shadow-[#1f108e]/20 cursor-pointer touch-manipulation"
        >
          <span className="material-symbols-outlined text-base">add_circle</span>
          <span>Nouveau Ticket</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const isActive =
            currentView === item.id ||
            (item.id === 'tickets' &&
              (currentView === 'ticket_detail' ||
                currentView === 'dev_tasks' ||
                currentView === 'create_ticket'));

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-150 text-xs font-semibold cursor-pointer touch-manipulation ${
                isActive
                  ? 'bg-[#1f108e] text-white shadow-xs font-bold'
                  : 'text-[#464553] hover:bg-[#dce9ff]/60 hover:text-[#0b1c30] active:scale-[0.98]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <span className="text-xs">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#e5eeff] text-[#1f108e]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
              {item.count !== undefined && !item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#ba1a1a] text-white'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}

        {/* Custom Import & Export Buttons */}
        {isAdmin && onOpenImportModal && (
          <button
            type="button"
            onClick={() => {
              if (onCloseMobile) onCloseMobile();
              onOpenImportModal();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-200 text-xs font-semibold text-[#006c4a] bg-emerald-50/80 border border-emerald-200 hover:bg-[#006c4a] hover:text-white cursor-pointer mt-3 group"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-xl">upload_file</span>
              <span className="font-bold text-xs">Import Excel (.xlsx)</span>
            </div>
            <span className="bg-emerald-100 text-[#006c4a] group-hover:bg-white text-[9px] px-1.5 py-0.5 rounded font-black uppercase">
              Import
            </span>
          </button>
        )}

        {onOpenExportModal && (
          <button
            type="button"
            onClick={() => {
              if (onCloseMobile) onCloseMobile();
              onOpenExportModal();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-200 text-xs font-semibold text-[#1f108e] bg-indigo-50/70 border border-indigo-200/80 hover:bg-[#1f108e] hover:text-white cursor-pointer mt-2 group"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-xl">download</span>
              <span className="font-bold text-xs">Export XLSX / PDF</span>
            </div>
            <span className="bg-indigo-100 text-[#1f108e] group-hover:bg-white text-[9px] px-1.5 py-0.5 rounded font-black uppercase">
              Rapport
            </span>
          </button>
        )}

        {onOpenMobileApkModal && (
          <button
            type="button"
            onClick={() => {
              if (onCloseMobile) onCloseMobile();
              onOpenMobileApkModal();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-200 text-xs font-semibold text-emerald-800 bg-emerald-50/90 border border-emerald-200/80 hover:bg-emerald-600 hover:text-white cursor-pointer mt-2 group"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-xl text-emerald-700 group-hover:text-white">
                android
              </span>
              <span className="font-bold text-xs">Version Mobile (APK)</span>
            </div>
            <span className="bg-emerald-100 text-emerald-800 group-hover:bg-white text-[9px] px-1.5 py-0.5 rounded font-black uppercase">
              APK
            </span>
          </button>
        )}
      </nav>

      {/* Bottom section / Database Status & Logout */}
      <div className="mt-auto pt-4 border-t border-[#c8c4d5]/40 px-3 space-y-2">
        <div className="px-3 py-2 bg-white/80 rounded-xl border border-[#c8c4d5]/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div className="text-[11px] font-bold text-[#0b1c30]">
              Base Synchronisée
            </div>
          </div>
          <span className="material-symbols-outlined text-xs text-[#1f108e]">
            sync
          </span>
        </div>

        <button
          onClick={() => {
            if (onCloseMobile) onCloseMobile();
            onLogout();
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/50 rounded-xl transition-all cursor-pointer touch-manipulation"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          <span className="text-xs font-medium">Déconnexion</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-[260px] bg-[#eff4ff] border-r border-[#c8c4d5]/50 z-50">
        {renderContent(false)}
      </aside>

      {/* Android-Adapted Mobile Drawer */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={onCloseMobile}
          />
          <aside className="relative flex flex-col w-[310px] max-w-[85vw] h-full bg-white rounded-r-3xl border-r border-slate-200/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] z-50 animate-in slide-in-from-left duration-250 select-none">
            <button
              onClick={onCloseMobile}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors z-10"
              aria-label="Fermer le menu"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
            {renderContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};
