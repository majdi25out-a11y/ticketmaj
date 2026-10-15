/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { ViewMode, Ticket, Comment, Developer, AppNotification, AppBrandingConfig, Attachment, Project } from './types';
import { INITIAL_TICKETS, INITIAL_DEVELOPERS } from './data/mockData';
import { Navbar } from './components/Navigation/Navbar';
import { Sidebar } from './components/Navigation/Sidebar';
import { MobileBottomNav } from './components/Navigation/MobileBottomNav';
import { AdminDashboard } from './components/Dashboard/AdminDashboard';
import { TicketDetail } from './components/Tickets/TicketDetail';
import { TicketsList } from './components/Tickets/TicketsList';
import { CreateTicket } from './components/Tickets/CreateTicket';
import { ProjectsView } from './components/Projects/ProjectsView';
import { DevTasks } from './components/Developer/DevTasks';
import { TeamView } from './components/Team/TeamView';
import { SettingsView } from './components/Settings/SettingsView';
import { SupportChatModal } from './components/Common/SupportChatModal';
import { NotificationsModal } from './components/Common/NotificationsModal';
import { CustomExportModal } from './components/Common/CustomExportModal';
import { ExcelImportModal } from './components/Common/ExcelImportModal';
import { LoginView } from './components/Auth/LoginView';
import { TicketInspectionDrawer } from './components/Tickets/TicketInspectionDrawer';
import { MobileApkModal } from './components/Mobile/MobileApkModal';
import { PWAInstallBanner } from './components/Mobile/PWAInstallBanner';
import { OfflineIndicator } from './components/Common/OfflineIndicator';
import { NotificationPermissionPrompt } from './components/Common/NotificationPermissionPrompt';
import { applyTheme, getInitialTheme, applyFontSize, getInitialFontSize, getInitialBranding, saveBrandingToLocal } from './utils/theme';
import { initServiceWorkerAndNotifications, showDeviceNotification, setOnTicketOpenHandler } from './utils/deviceNotifications';

export function getSessionTimeoutMs(timeoutSetting?: string): number | null {
  switch (timeoutSetting) {
    case '15m': return 15 * 60 * 1000;
    case '30m': return 30 * 60 * 1000;
    case '1h': return 60 * 60 * 1000; // 1 hour token expiration (standard)
    case '4h': return 4 * 60 * 60 * 1000;
    case '8h': return 8 * 60 * 60 * 1000;
    case '24h': return 24 * 60 * 60 * 1000;
    case '7d': return 7 * 24 * 60 * 60 * 1000;
    case 'never': return null;
    default: return 60 * 60 * 1000; // Default token expiration: 1 hour
  }
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const sessionStr = localStorage.getItem('tf_session');
      const configuredTimeout = localStorage.getItem('tf_session_timeout') || '1h';
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          if (session && (session.name || session.token)) {
            // Check absolute token expiration (1 hour)
            if (session.expiresAt && Date.now() > session.expiresAt) {
              localStorage.removeItem('tf_session');
              return false;
            }
            // Check configured inactivity timeout
            const timeoutMs = getSessionTimeoutMs(configuredTimeout);
            if (timeoutMs) {
              const lastActive = session.lastActivityTimestamp || session.loginTimestamp || 0;
              if (Date.now() - lastActive > timeoutMs) {
                localStorage.removeItem('tf_session');
                return false;
              }
            }
            return true;
          }
        } catch (e) {
          localStorage.removeItem('tf_session');
        }
      }
    }
    return false;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const sessionStr = localStorage.getItem('tf_session');
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          if (session && session.name) {
            return session;
          }
        } catch (e) {}
      }
    }
    return {
      name: '',
      role: '',
      avatar: '',
      email: '',
    };
  });

  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [createTicketInitialProjectId, setCreateTicketInitialProjectId] = useState<string>('');
  const [developers, setDevelopers] = useState<Developer[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('tf_local_developers');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {}
    }
    return INITIAL_DEVELOPERS;
  });
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSupportChatOpen, setIsSupportChatOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isMobileApkModalOpen, setIsMobileApkModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; message?: string; syncStatus?: string }>({ connected: true, syncStatus: 'synced' });
  const [isSyncing, setIsSyncing] = useState(false);
  const [branding, setBranding] = useState<AppBrandingConfig>(getInitialBranding());
  const [isInspectionDrawerOpen, setIsInspectionDrawerOpen] = useState(false);
  const [inspectedTicketId, setInspectedTicketId] = useState<string | null>(null);
  const [compareTicketId, setCompareTicketId] = useState<string | null>(null);

  const knownNotifIdsRef = useRef<Set<string>>(new Set());
  const isInitialNotifsLoadedRef = useRef<boolean>(false);

  // Dynamically update browser tab title & favicon with App Logo & Name
  useEffect(() => {
    const appName = branding?.appName || 'TicketFlow';
    const appSubtitle = branding?.appSubtitle || 'Operational Control';
    document.title = `${appName} - ${appSubtitle}`;

    let iconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    if (!iconLink) {
      iconLink = document.createElement('link');
      iconLink.rel = 'icon';
      document.head.appendChild(iconLink);
    }
    iconLink.href = branding?.appLogoUrl || '/favicon.svg';

    let appleIconLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
    if (!appleIconLink) {
      appleIconLink = document.createElement('link');
      appleIconLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleIconLink);
    }
    appleIconLink.href = branding?.appLogoUrl || '/favicon.svg';
  }, [branding]);

  // Continuous Database & App Synchronization (every 3 seconds)
  const loadBackendData = async () => {
    try {
      const [statusRes, devsRes, tixRes, notifsRes, brandingRes, projectsRes] = await Promise.all([
        fetch('/api/db-status'),
        fetch('/api/developers'),
        fetch('/api/tickets'),
        fetch('/api/notifications'),
        fetch('/api/branding'),
        fetch('/api/projects'),
      ]);

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setDbStatus(statusData);
      }

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        if (Array.isArray(projectsData)) {
          setProjects(projectsData);
        }
      }

      if (devsRes.ok) {
        const devsData: Developer[] = await devsRes.json();
        if (Array.isArray(devsData) && devsData.length > 0) {
          setDevelopers(devsData);
          try {
            localStorage.setItem('tf_local_developers', JSON.stringify(devsData));
          } catch (_e) {}

          // Keep user session updated if details changed in database
          if (currentUser && currentUser.email) {
            const currentEmail = currentUser.email.toLowerCase();
            const userInDb = devsData.find(
              (d) =>
                (d.email && d.email.toLowerCase() === currentEmail) ||
                (d.id && currentUser.id && d.id === currentUser.id)
            );

            if (userInDb) {
              if (
                userInDb.name !== currentUser.name ||
                userInDb.role !== currentUser.role ||
                (userInDb.avatar && userInDb.avatar !== currentUser.avatar)
              ) {
                const syncedUser = {
                  ...currentUser,
                  name: userInDb.name,
                  role: userInDb.role,
                  avatar: userInDb.avatar || currentUser.avatar,
                  email: userInDb.email || currentUser.email,
                };
                setCurrentUser(syncedUser);
                localStorage.setItem('tf_session', JSON.stringify(syncedUser));
              }
            }
          }
        }
      }

      if (tixRes.ok) {
        const tixData = await tixRes.json();
        if (Array.isArray(tixData)) {
          setTickets(tixData);
        }
      }

      if (notifsRes.ok) {
        const notifsData = await notifsRes.json();
        if (Array.isArray(notifsData)) {
          const uniqueNotifs: AppNotification[] = [];
          const seenKeys = new Set<string>();

          for (const n of notifsData) {
            const key = n.id || `${n.title}-${n.ticketId}-${n.desc}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              uniqueNotifs.push(n);
            }
          }

          // Trigger Android system notification when a new notification arrives via polling (foreground or background)
          if (isInitialNotifsLoadedRef.current) {
            const isAdminUser =
              currentUser.role?.toLowerCase().includes('admin') ||
              currentUser.role?.toLowerCase().includes('architect');

            for (const n of uniqueNotifs) {
              if (n.id && !knownNotifIdsRef.current.has(n.id) && !n.read) {
                const isTargeted =
                  (!n.targetUserEmail && !n.targetUserName) ||
                  (currentUser.email && n.targetUserEmail?.toLowerCase() === currentUser.email.toLowerCase()) ||
                  (currentUser.name && n.targetUserName?.toLowerCase() === currentUser.name.toLowerCase()) ||
                  isAdminUser;

                if (isTargeted) {
                  showDeviceNotification({
                    title: n.title,
                    body: n.desc,
                    ticketId: n.ticketId,
                    urgent: n.urgent,
                  });
                }
              }
            }
          }

          // Mark known IDs
          uniqueNotifs.forEach((n) => {
            if (n.id) knownNotifIdsRef.current.add(n.id);
          });
          isInitialNotifsLoadedRef.current = true;

          setNotifications(uniqueNotifs);
        }
      }

      if (brandingRes.ok) {
        const brandingData = await brandingRes.json();
        if (brandingData && brandingData.appName) {
          setBranding(brandingData);
          saveBrandingToLocal(brandingData);
        }
      }
    } catch (e) {
      // Fallback silently if temporary network delay
    }
  };

  useEffect(() => {
    applyTheme(getInitialTheme());
    applyFontSize(getInitialFontSize());

    // Initialize Service Worker for Android PWA / WebAPK notifications
    initServiceWorkerAndNotifications();
    setOnTicketOpenHandler((tId) => {
      setSelectedTicketId(tId);
      setCurrentView('ticket_detail');
    });

    loadBackendData();

    // Auto-refresh interval (every 3 seconds) for live database sync
    const pollInterval = setInterval(loadBackendData, 3000);
    return () => clearInterval(pollInterval);
  }, []);

  // Force Instant Manual Database Sync
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickets, developers }),
      });
      if (res.ok) {
        const syncData = await res.json();
        if (syncData.tickets) setTickets(syncData.tickets);
        if (syncData.developers) setDevelopers(syncData.developers);
        if (syncData.notifications) setNotifications(syncData.notifications);
        if (syncData.branding) setBranding(syncData.branding);
        setToastMessage('Base de données synchronisée avec succès.');
      } else {
        await loadBackendData();
        setToastMessage('Données actualisées depuis la base de données.');
      }
    } catch (e) {
      await loadBackendData();
      setToastMessage('Synchronisation effectuée.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Active session tracking & strict 1-hour session token enforcement
  useEffect(() => {
    if (!isAuthenticated) return;

    let lastRecordedActivity = Date.now();

    const recordUserActivity = () => {
      const now = Date.now();
      // Throttle localStorage writes to once every 10 seconds
      if (now - lastRecordedActivity > 10000) {
        lastRecordedActivity = now;
        try {
          const sessionStr = localStorage.getItem('tf_session');
          if (sessionStr) {
            const session = JSON.parse(sessionStr);
            session.lastActivityTimestamp = now;
            localStorage.setItem('tf_session', JSON.stringify(session));
          }
        } catch (_e) {}
      }
    };

    window.addEventListener('mousemove', recordUserActivity, { passive: true });
    window.addEventListener('keydown', recordUserActivity, { passive: true });
    window.addEventListener('click', recordUserActivity, { passive: true });
    window.addEventListener('touchstart', recordUserActivity, { passive: true });
    window.addEventListener('scroll', recordUserActivity, { passive: true });

    // Check expiration periodically every 10 seconds
    const timeoutChecker = setInterval(() => {
      const configuredTimeout = branding?.sessionTimeout || (typeof window !== 'undefined' ? localStorage.getItem('tf_session_timeout') : '1h') || '1h';
      const timeoutMs = getSessionTimeoutMs(configuredTimeout);

      try {
        const sessionStr = localStorage.getItem('tf_session');
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          const now = Date.now();

          // 1. Check absolute token expiration (1 hour limit)
          if (session.expiresAt && now > session.expiresAt) {
            handleLogout();
            setToastMessage('Votre session / token a expiré après 1 heure. Veuillez vous reconnecter.');
            return;
          }

          // 2. Check inactivity timeout (1 hour default)
          if (timeoutMs) {
            const lastActive = session.lastActivityTimestamp || session.loginTimestamp || now;
            if (now - lastActive > timeoutMs) {
              handleLogout();
              setToastMessage('Votre session a expiré en raison d\'une période d\'inactivité (1 h).');
              return;
            }
          }
        }
      } catch (_e) {}
    }, 10000);

    return () => {
      window.removeEventListener('mousemove', recordUserActivity);
      window.removeEventListener('keydown', recordUserActivity);
      window.removeEventListener('click', recordUserActivity);
      window.removeEventListener('touchstart', recordUserActivity);
      window.removeEventListener('scroll', recordUserActivity);
      clearInterval(timeoutChecker);
    };
  }, [isAuthenticated, branding?.sessionTimeout]);

  // Sync state changes with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tf_developers', JSON.stringify(developers));
    } catch (e) {
      // ignore
    }
  }, [developers]);

  useEffect(() => {
    try {
      localStorage.setItem('tf_tickets', JSON.stringify(tickets));
    } catch (e) {
      // ignore
    }
  }, [tickets]);

  // Helper to dispatch a notification to the backend and state
  const sendNotification = async (notifData: {
    title: string;
    desc: string;
    ticketId: string;
    urgent?: boolean;
    targetUserEmail?: string;
    targetUserName?: string;
  }) => {
    const newNotif: AppNotification = {
      id: `n-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: notifData.title,
      desc: notifData.desc,
      time: 'À l\'instant',
      ticketId: notifData.ticketId,
      urgent: Boolean(notifData.urgent),
      targetUserEmail: notifData.targetUserEmail,
      targetUserName: notifData.targetUserName,
      read: false,
      createdAt: new Date().toISOString(),
    };

    setNotifications((prev) => {
      const isDup = prev.some(
        (n) =>
          n.id === newNotif.id ||
          (n.ticketId === newNotif.ticketId && n.title === newNotif.title && n.desc === newNotif.desc && n.targetUserName === newNotif.targetUserName)
      );
      if (isDup) return prev;
      return [newNotif, ...prev];
    });

    if (newNotif.id) {
      knownNotifIdsRef.current.add(newNotif.id);
    }

    // Trigger Android device notification (sound, vibration, status bar)
    showDeviceNotification({
      title: notifData.title,
      body: notifData.desc,
      ticketId: notifData.ticketId,
      urgent: notifData.urgent,
    });

    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNotif),
      });
    } catch (e) {
      console.error('Error saving notification:', e);
    }
  };

  // Helper to notify ALL concerned users for a ticket modification or creation (without duplicates)
  const notifyConcernedUsers = (
    ticket: { id: string; title: string; requestedBy?: string; assignedTo?: Developer },
    actionTitle: string,
    actionDesc: string,
    urgent: boolean = false
  ) => {
    const notifiedUsers = new Set<string>();

    // 1. Notify Ticket Requester
    if (ticket.requestedBy && ticket.requestedBy !== currentUser.name) {
      notifiedUsers.add(ticket.requestedBy.toLowerCase());
      sendNotification({
        title: actionTitle,
        desc: actionDesc,
        ticketId: ticket.id,
        urgent,
        targetUserName: ticket.requestedBy,
      });
    }

    // 2. Notify Assigned Developer if present
    if (
      ticket.assignedTo &&
      ticket.assignedTo.name !== currentUser.name &&
      !notifiedUsers.has(ticket.assignedTo.name.toLowerCase())
    ) {
      notifiedUsers.add(ticket.assignedTo.name.toLowerCase());
      sendNotification({
        title: actionTitle,
        desc: actionDesc,
        ticketId: ticket.id,
        urgent,
        targetUserEmail: ticket.assignedTo.email,
        targetUserName: ticket.assignedTo.name,
      });
    }

    // 3. Notify Admin / Architect if the acting user is not admin
    const isAdminUser = currentUser.role.toLowerCase().includes('admin') || currentUser.role.toLowerCase().includes('architecte');
    if (!isAdminUser) {
      const adminDev = developers.find((d) => d.role.toLowerCase().includes('admin') || d.role.toLowerCase().includes('architecte'));
      const adminName = adminDev ? adminDev.name : 'Administrateur';
      if (!notifiedUsers.has(adminName.toLowerCase())) {
        sendNotification({
          title: actionTitle,
          desc: `${actionDesc} (par ${currentUser.name})`,
          ticketId: ticket.id,
          urgent,
          targetUserEmail: adminDev?.email || 'admin@ticketflow.io',
          targetUserName: adminName,
        });
      }
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    if (selectedTicketId === ticketId) {
      setCurrentView('tickets');
    }

    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error('Error deleting ticket:', e);
    }
  };

  const handleSelectTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setCurrentView('ticket_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInspectTicket = (ticketId: string, mode: 'inspect' | 'compare' = 'inspect') => {
    setInspectedTicketId(ticketId);
    if (mode === 'compare') {
      const alt = tickets.find((t) => t.id !== ticketId)?.id || '';
      setCompareTicketId(alt);
    }
    setIsInspectionDrawerOpen(true);
  };

  const handleAssignDev = async (ticketId: string, devId: string) => {
    const isAdminUser =
      currentUser.role.toLowerCase().includes('admin') ||
      currentUser.role.toLowerCase().includes('architect') ||
      currentUser.email === 'admin@ticketflow.io';

    if (!isAdminUser) {
      console.warn("Seul un administrateur peut assigner des tickets.");
      return;
    }

    let assignedDev = devId
      ? developers.find(
          (d) =>
            d.id === devId ||
            d.name?.toLowerCase() === devId.toLowerCase() ||
            (d.email && d.email.toLowerCase() === devId.toLowerCase()) ||
            d.id.toString() === devId.toString()
        )
      : undefined;

    if (!assignedDev && devId && (devId === 'self' || devId === currentUser.id || devId.toLowerCase() === currentUser.name.toLowerCase() || (currentUser.email && devId.toLowerCase() === currentUser.email.toLowerCase()))) {
      assignedDev = developers.find(
        (d) =>
          d.name?.toLowerCase() === currentUser.name.toLowerCase() ||
          (currentUser.email && d.email?.toLowerCase() === currentUser.email.toLowerCase())
      ) || {
        id: currentUser.id || `dev-${Date.now()}`,
        name: currentUser.name,
        role: currentUser.role,
        email: currentUser.email || 'dev@ticketflow.io',
        avatar: currentUser.avatar,
        availability: 'active',
        activeTickets: 1,
        performanceScore: 95,
      };
    }

    const targetTicket = tickets.find((t) => t.id === ticketId);
    if (!targetTicket) return;

    const updatedTicket: Ticket = {
      ...targetTicket,
      assignedTo: assignedDev,
      history: [
        ...(targetTicket.history || []),
        {
          id: `h-${Date.now()}`,
          title: assignedDev ? `Assigné à ${assignedDev.name}` : `Ticket non assigné`,
          author: currentUser.name,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          active: true,
        },
      ],
    };

    setTickets((prev) => prev.map((t) => (t.id === ticketId ? updatedTicket : t)));

    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTicket),
      });

      notifyConcernedUsers(
        updatedTicket,
        'Ticket Assigné',
        `Le ticket "${updatedTicket.title}" a été assigné à ${assignedDev ? assignedDev.name : 'personne'}.`
      );
    } catch (e) {
      console.error('Error assigning developer:', e);
    }
  };

  const handleValidateTicket = async (ticketId: string, devId?: string) => {
    const targetTicket = tickets.find((t) => t.id === ticketId);
    if (!targetTicket) return;

    let assignedDev = devId
      ? developers.find(
          (d) =>
            d.id === devId ||
            d.name?.toLowerCase() === devId.toLowerCase() ||
            (d.email && d.email.toLowerCase() === devId.toLowerCase()) ||
            d.id.toString() === devId.toString()
        )
      : targetTicket.assignedTo;

    if (!assignedDev && devId && (devId === 'self' || devId === currentUser.id || devId.toLowerCase() === currentUser.name.toLowerCase() || (currentUser.email && devId.toLowerCase() === currentUser.email.toLowerCase()))) {
      assignedDev = developers.find(
        (d) =>
          d.name?.toLowerCase() === currentUser.name.toLowerCase() ||
          (currentUser.email && d.email?.toLowerCase() === currentUser.email.toLowerCase())
      ) || {
        id: currentUser.id || `dev-${Date.now()}`,
        name: currentUser.name,
        role: currentUser.role,
        email: currentUser.email || 'dev@ticketflow.io',
        avatar: currentUser.avatar,
        availability: 'active',
        activeTickets: 1,
        performanceScore: 95,
      };
    }

    const updatedTicket: Ticket = {
      ...targetTicket,
      status: 'in_progress',
      statusLabel: 'En cours',
      assignedTo: assignedDev,
      history: [
        ...(targetTicket.history || []),
        {
          id: `h-${Date.now()}`,
          title: assignedDev ? `Validé & Assigné à ${assignedDev.name}` : `Ticket validé (Non assigné)`,
          author: currentUser.name,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          active: true,
        },
      ],
    };

    setTickets((prev) => prev.map((t) => (t.id === ticketId ? updatedTicket : t)));

    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTicket),
      });

      notifyConcernedUsers(
        updatedTicket,
        'Ticket Validé & En Cours',
        `Le ticket "${updatedTicket.title}" a été validé par l'admin ${assignedDev ? `et assigné à ${assignedDev.name}` : ''}.`
      );
    } catch (e) {
      console.error('Error saving ticket validation:', e);
    }
  };

  const handleRejectTicket = async (ticketId: string) => {
    const targetTicket = tickets.find((t) => t.id === ticketId);
    if (!targetTicket) return;

    const updatedTicket: Ticket = {
      ...targetTicket,
      status: 'rejected',
      statusLabel: 'Rejeté',
      history: [
        ...(targetTicket.history || []),
        {
          id: `h-${Date.now()}`,
          title: `Ticket rejeté par ${currentUser.name}`,
          author: currentUser.name,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          active: false,
        },
      ],
    };

    setTickets((prev) => prev.map((t) => (t.id === ticketId ? updatedTicket : t)));

    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTicket),
      });

      notifyConcernedUsers(
        updatedTicket,
        'Ticket Rejeté',
        `Le ticket "${updatedTicket.title}" a été rejeté.`,
        true
      );
    } catch (e) {
      console.error('Error saving ticket rejection:', e);
    }
  };

  const handleAddComment = async (ticketId: string, newComment: Comment) => {
    const targetTicket = tickets.find((t) => t.id === ticketId);

    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? { ...t, comments: [...(t.comments || []), newComment] }
          : t
      )
    );

    try {
      await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newComment),
      });

      if (targetTicket) {
        notifyConcernedUsers(
          targetTicket,
          'Nouveau Commentaire',
          `${newComment.author} a commenté sur le ticket "${targetTicket.title}".`
        );
      }
    } catch (e) {
      console.error('Error saving comment:', e);
    }
  };

  const handleAddAttachments = async (ticketId: string, newAttachments: Attachment[]) => {
    const targetTicket = tickets.find((t) => t.id === ticketId);
    if (!targetTicket) return;

    const updatedAttachments = [...(targetTicket.attachments || []), ...newAttachments];
    const updatedTicket: Ticket = {
      ...targetTicket,
      attachments: updatedAttachments,
    };

    setTickets((prev) => prev.map((t) => (t.id === ticketId ? updatedTicket : t)));

    try {
      await fetch(`/api/tickets/${ticketId}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachments: newAttachments }),
      });

      await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachments: updatedAttachments }),
      });

      notifyConcernedUsers(
        updatedTicket,
        'Nouvelle Pièce Jointe',
        `${currentUser.name} a ajouté ${newAttachments.length} pièce(s) jointe(s) / vocal au ticket "${updatedTicket.title}".`
      );
    } catch (e) {
      console.error('Error saving attachments:', e);
    }
  };

  const handleUpdateTicketStatus = async (
    ticketId: string,
    newStatus: Ticket['status'],
    newStatusLabel: string
  ) => {
    const targetTicket = tickets.find((t) => t.id === ticketId);
    if (!targetTicket) return;

    const updatedTicket: Ticket = {
      ...targetTicket,
      status: newStatus,
      statusLabel: newStatusLabel,
      history: [
        ...(targetTicket.history || []),
        {
          id: `h-${Date.now()}`,
          title: `Statut changé à ${newStatusLabel}`,
          author: currentUser.name,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          active: newStatus === 'in_progress',
        },
      ],
    };

    setTickets((prev) => prev.map((t) => (t.id === ticketId ? updatedTicket : t)));

    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTicket),
      });

      notifyConcernedUsers(
        updatedTicket,
        'Statut Mis à Jour',
        `Le ticket "${updatedTicket.title}" est maintenant: ${newStatusLabel}.`
      );
    } catch (e) {
      console.error('Error updating ticket status:', e);
    }
  };

  const handleEditTicket = async (updatedTicket: Ticket) => {
    const isUserAdmin =
      currentUser.role?.toLowerCase().includes('admin') ||
      currentUser.role?.toLowerCase().includes('architect') ||
      currentUser.email === 'admin@ticketflow.io';

    if (!isUserAdmin) {
      setToastMessage('Action refusée : La modification des tickets est strictement réservée aux administrateurs.');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    const existingTicket = tickets.find((t) => t.id === updatedTicket.id);
    const newHistory = [
      ...(existingTicket?.history || updatedTicket.history || []),
      {
        id: `h-${Date.now()}`,
        title: `Ticket modifié par ${currentUser.name}`,
        author: currentUser.name,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        active: false,
      },
    ];

    // L'administrateur peut modifier toutes les propriétés du ticket (titre, description, pièces jointes, etc.)
    const finalUpdatedTicket: Ticket = {
      ...updatedTicket,
      history: newHistory,
    };

    setTickets((prev) =>
      prev.map((t) => (t.id === finalUpdatedTicket.id ? finalUpdatedTicket : t))
    );

    try {
      await fetch(`/api/tickets/${finalUpdatedTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalUpdatedTicket),
      });

      notifyConcernedUsers(
        finalUpdatedTicket,
        'Ticket Modifié',
        `Le ticket "${finalUpdatedTicket.title}" (#${finalUpdatedTicket.id}) a été modifié par ${currentUser.name}.`
      );
      setToastMessage(`Ticket #${finalUpdatedTicket.id} enregistré avec succès.`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e) {
      console.error('Error updating ticket:', e);
      setToastMessage('Erreur lors de la sauvegarde du ticket.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleAssignProject = async (ticketId: string, projectId: string) => {
    const isUserAdmin =
      currentUser.role?.toLowerCase().includes('admin') ||
      currentUser.role?.toLowerCase().includes('architect') ||
      currentUser.email === 'admin@ticketflow.io';

    if (!isUserAdmin) {
      setToastMessage("Action refusée : L'assignation de projet est réservée aux administrateurs.");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const matchedProject = projects.find((p) => p.id === projectId);
    const existingTicket = tickets.find((t) => t.id === ticketId);
    if (!existingTicket) return;

    const updatedTicket: Ticket = {
      ...existingTicket,
      projectId: projectId || undefined,
      projectName: matchedProject ? matchedProject.name : undefined,
      projectCode: matchedProject ? matchedProject.code : undefined,
      projectColor: matchedProject ? matchedProject.color : undefined,
      history: [
        ...(existingTicket.history || []),
        {
          id: `h-${Date.now()}`,
          title: matchedProject
            ? `Assigné au projet [${matchedProject.code || matchedProject.name}] par ${currentUser.name}`
            : `Dissocié du projet par ${currentUser.name}`,
          author: currentUser.name,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          active: false,
        },
      ],
    };

    setTickets((prev) => prev.map((t) => (t.id === ticketId ? updatedTicket : t)));

    try {
      if (projectId) {
        await fetch(`/api/projects/${projectId}/assign-tickets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticketIds: [ticketId] }),
        });
      } else {
        await fetch(`/api/tickets/${ticketId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: null,
            projectName: null,
            projectCode: null,
            projectColor: null,
          }),
        });
      }

      setToastMessage(
        matchedProject
          ? `Ticket #${ticketId} assigné au projet "${matchedProject.name}".`
          : `Ticket #${ticketId} retiré du projet.`
      );
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e) {
      console.error('Error assigning project to ticket:', e);
      setToastMessage("Erreur lors de l'assignation au projet.");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleAssignTicketsToProject = async (projectId: string, ticketIds: string[]) => {
    const isUserAdmin =
      currentUser.role?.toLowerCase().includes('admin') ||
      currentUser.role?.toLowerCase().includes('architect') ||
      currentUser.email === 'admin@ticketflow.io';

    if (!isUserAdmin) {
      setToastMessage("Action refusée : L'assignation de projet est réservée aux administrateurs.");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const matchedProject = projects.find((p) => p.id === projectId);
    if (!matchedProject) return;

    setTickets((prev) =>
      prev.map((t) => {
        if (ticketIds.includes(t.id)) {
          return {
            ...t,
            projectId: matchedProject.id,
            projectName: matchedProject.name,
            projectCode: matchedProject.code,
            projectColor: matchedProject.color,
            history: [
              ...(t.history || []),
              {
                id: `h-${Date.now()}-${t.id}`,
                title: `Assigné au projet [${matchedProject.code || matchedProject.name}] par ${currentUser.name}`,
                author: currentUser.name,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                active: false,
              },
            ],
          };
        }
        return t;
      })
    );

    try {
      const res = await fetch(`/api/projects/${projectId}/assign-tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketIds }),
      });
      if (res.ok) {
        setToastMessage(`${ticketIds.length} ticket(s) assigné(s) au projet "${matchedProject.name}".`);
      } else {
        setToastMessage("Erreur lors de l'assignation groupée.");
      }
      setTimeout(() => setToastMessage(null), 3500);
    } catch (e) {
      console.error('Error assigning tickets to project:', e);
      setToastMessage("Erreur lors de l'assignation au projet.");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleCreateTicket = async (newTicketData: Partial<Ticket>) => {
    const fullTicket: Ticket = {
      id: newTicketData.id || `TF-${Math.floor(9000 + Math.random() * 999)}`,
      title: newTicketData.title || 'Sans titre',
      description: newTicketData.description || '',
      requestedBy: newTicketData.requestedBy || currentUser.name,
      requestedByAvatar: newTicketData.requestedByAvatar || currentUser.avatar,
      status: 'pending',
      statusLabel: 'À VALIDER',
      priority: newTicketData.priority || 'medium',
      platform: newTicketData.platform || 'web',
      createdDate: newTicketData.createdDate || 'Aujourd\'hui',
      tags: newTicketData.tags || ['NEW'],
      projectId: newTicketData.projectId,
      projectName: newTicketData.projectName,
      projectCode: newTicketData.projectCode,
      projectColor: newTicketData.projectColor,
      attachments: newTicketData.attachments || [],
      comments: [],
      history: [
        {
          id: `h-${Date.now()}`,
          title: 'Ticket soumis par l\'utilisateur',
          author: newTicketData.requestedBy || currentUser.name,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          active: true,
        },
      ],
    };

    setTickets((prev) => [fullTicket, ...prev]);

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullTicket),
      });
      if (res.ok) {
        const saved = await res.json();
        setTickets((prev) => prev.map((t) => (t.id === fullTicket.id ? saved : t)));
      }

      // 1. Notification to Creator
      sendNotification({
        title: 'Ticket Créé',
        desc: `Votre ticket "${fullTicket.title}" (#${fullTicket.id}) a bien été enregistré et est en attente de validation par l'administrateur.`,
        ticketId: fullTicket.id,
        targetUserName: fullTicket.requestedBy,
      });

      // 2. Notification to Admin
      const isAdmin = currentUser.role.toLowerCase().includes('admin') || currentUser.role.toLowerCase().includes('architecte');
      if (!isAdmin) {
        sendNotification({
          title: 'Nouveau Ticket Proposé',
          desc: `#${fullTicket.id} (${fullTicket.title}) proposé par ${fullTicket.requestedBy}. En attente de validation & assignation.`,
          ticketId: fullTicket.id,
          targetUserName: 'Alexandre Dubois',
          urgent: fullTicket.priority === 'urgent' || fullTicket.priority === 'high',
        });
      }
    } catch (e) {
      console.error('Error creating ticket:', e);
    }
  };

  const handleBatchImportTickets = async (
    ticketsToImport: Ticket[],
    options: { generateNewIds: boolean }
  ) => {
    const isUserAdmin =
      currentUser.role?.toLowerCase().includes('admin') ||
      currentUser.role?.toLowerCase().includes('architect') ||
      currentUser.email === 'admin@ticketflow.io';

    if (!isUserAdmin) {
      setToastMessage("Action refusée : L'importation de données Excel est strictement réservée aux administrateurs.");
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    // 1. Optimistic update
    setTickets((prev) => {
      let updated = [...prev];
      for (const newT of ticketsToImport) {
        const idx = updated.findIndex((t) => t.id === newT.id);
        if (idx !== -1 && !options.generateNewIds) {
          updated[idx] = newT;
        } else {
          updated.unshift(newT);
        }
      }
      return updated;
    });

    // 2. Server API call
    try {
      const res = await fetch('/api/tickets/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickets: ticketsToImport,
          importedBy: currentUser.name || 'Administrateur',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.imported && Array.isArray(data.imported)) {
          loadBackendData();
        }
      }

      sendNotification({
        title: 'Importation Excel Réussie',
        desc: `${ticketsToImport.length} ticket(s) importé(s) depuis Excel par ${currentUser.name}.`,
        ticketId: ticketsToImport[0]?.id || 'TF-EXCEL',
        targetUserName: currentUser.name,
      });

      setToastMessage(`${ticketsToImport.length} ticket(s) importé(s) avec succès depuis Excel.`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (e) {
      console.error('Error importing batch tickets:', e);
      setToastMessage('Erreur lors de la synchronisation des tickets importés.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleCompleteTask = async (ticketId: string, closingNote?: string) => {
    const targetTicket = tickets.find((t) => t.id === ticketId);
    if (!targetTicket) return;

    const updatedTicket: Ticket = {
      ...targetTicket,
      status: 'completed',
      statusLabel: 'Terminé',
      closingNote,
      history: [
        ...(targetTicket.history || []),
        {
          id: `h-${Date.now()}`,
          title: 'Tâche marquée comme Terminée par le Développeur',
          author: currentUser.name,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          active: false,
        },
      ],
    };

    setTickets((prev) => prev.map((t) => (t.id === ticketId ? updatedTicket : t)));

    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTicket),
      });

      notifyConcernedUsers(
        updatedTicket,
        'Tâche Terminée !',
        `La résolution du ticket "${updatedTicket.title}" a été complétée par ${currentUser.name}.`
      );
    } catch (e) {
      console.error('Error completing task:', e);
    }
  };

  const handleToggleClarity = async (ticketId: string, clarity: 'clair' | 'clarifier') => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, clarity } : t))
    );

    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clarity }),
      });
    } catch (e) {
      console.error('Error toggling clarity:', e);
    }
  };

  const handleAddDeveloper = async (newDev: Omit<Developer, 'id'>) => {
    const tempId = `dev-${Date.now()}`;
    const createdLocally: Developer = { ...newDev, id: tempId };
    setDevelopers((prev) => {
      const next = [...prev, createdLocally];
      try {
        localStorage.setItem('tf_local_developers', JSON.stringify(next));
      } catch (_e) {}
      return next;
    });

    try {
      const res = await fetch('/api/developers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDev),
      });
      if (res.ok) {
        const savedDev = await res.json();
        setDevelopers((prev) => {
          const next = prev.map((d) => (d.id === tempId ? savedDev : d));
          try {
            localStorage.setItem('tf_local_developers', JSON.stringify(next));
          } catch (_e) {}
          return next;
        });
      }
    } catch (e) {
      console.error('Error adding developer:', e);
    }
  };

  const handleUpdateDeveloper = async (devId: string, updatedData: Partial<Developer>) => {
    setDevelopers((prev) => {
      const next = prev.map((d) => (d.id === devId ? { ...d, ...updatedData } : d));
      try {
        localStorage.setItem('tf_local_developers', JSON.stringify(next));
      } catch (_e) {}
      return next;
    });

    try {
      await fetch(`/api/developers/${devId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
    } catch (e) {
      console.error('Error updating developer:', e);
    }
  };

  const handleResetPassword = async (devId: string, newPass: string) => {
    setDevelopers((prev) => {
      const next = prev.map((d) => (d.id === devId ? { ...d, password: newPass } : d));
      try {
        localStorage.setItem('tf_local_developers', JSON.stringify(next));
      } catch (_e) {}
      return next;
    });

    try {
      await fetch(`/api/developers/${devId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPass }),
      });
    } catch (e) {
      console.error('Error resetting password:', e);
    }
  };

  const handleDeleteDeveloper = async (devId: string, reassignTicketsToDevId?: string) => {
    setDevelopers((prev) => {
      const next = prev.filter((d) => d.id !== devId);
      try {
        localStorage.setItem('tf_local_developers', JSON.stringify(next));
      } catch (_e) {}
      return next;
    });
    if (reassignTicketsToDevId) {
      const targetDev = developers.find((d) => d.id === reassignTicketsToDevId);
      if (targetDev) {
        setTickets((prev) =>
          prev.map((t) =>
            t.assignedTo?.id === devId
              ? {
                  ...t,
                  assignedTo: targetDev,
                  history: [
                    ...(t.history || []),
                    {
                      id: `h-${Date.now()}`,
                      title: `Réassigné à ${targetDev.name} suite au départ du développeur`,
                      author: currentUser.name,
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      active: true,
                    },
                  ],
                }
              : t
          )
        );
      }
    } else {
      setTickets((prev) =>
        prev.map((t) => (t.assignedTo?.id === devId ? { ...t, assignedTo: undefined } : t))
      );
    }

    setDevelopers((prev) => prev.filter((d) => d.id !== devId));

    try {
      await fetch(`/api/developers/${devId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reassignToId: reassignTicketsToDevId }),
      });
    } catch (e) {
      console.error('Error deleting developer:', e);
    }
  };

  const handleAddProject = async (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev]);
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });
      setToastMessage(`Projet "${newProject.name}" créé avec succès.`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e) {
      console.error('Error creating project:', e);
    }
  };

  const handleUpdateProject = async (updatedProject: Project) => {
    setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
    setTickets((prev) =>
      prev.map((t) =>
        t.projectId === updatedProject.id
          ? {
              ...t,
              projectName: updatedProject.name,
              projectCode: updatedProject.code,
              projectColor: updatedProject.color,
            }
          : t
      )
    );
    try {
      await fetch(`/api/projects/${updatedProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProject),
      });
      setToastMessage(`Projet "${updatedProject.name}" mis à jour.`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e) {
      console.error('Error updating project:', e);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setTickets((prev) =>
      prev.map((t) =>
        t.projectId === projectId
          ? { ...t, projectId: undefined, projectName: undefined, projectCode: undefined, projectColor: undefined }
          : t
      )
    );
    try {
      await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      setToastMessage('Projet supprimé.');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e) {
      console.error('Error deleting project:', e);
    }
  };

  const handleSelectProjectFilter = (projId: string) => {
    setSelectedProjectFilter(projId);
    setCurrentView('tickets');
  };

  const handleCreateTicketForProject = (projId: string) => {
    setCreateTicketInitialProjectId(projId);
    setCurrentView('create_ticket');
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      await fetch('/api/notifications/read', { method: 'PUT' });
    } catch (e) {
      console.error('Error marking notifications as read:', e);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser({ name: '', role: '', avatar: '', email: '' });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tf_session');
    }
  };

  const handleLogin = (user: { name: string; role: string; avatar: string; email?: string; id?: string; token?: string; expiresAt?: number }) => {
    const now = Date.now();
    const tokenExpiresAt = user.expiresAt || (now + 60 * 60 * 1000); // Strict 1-hour expiration
    const token = user.token || `tf_tk_${now}_${Math.random().toString(36).substring(2, 9)}`;
    const fullUser = {
      ...user,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      email: user.email || `${user.name.toLowerCase().replace(/\s+/g, '.')}@ticketflow.io`,
      token,
      expiresAt: tokenExpiresAt,
      loginTimestamp: now,
      lastActivityTimestamp: now,
    };
    setCurrentUser(fullUser);
    setIsAuthenticated(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tf_session', JSON.stringify(fullUser));
    }
    setCurrentView('dashboard');
  };

  const handleSwitchUser = (u: { name: string; role: string; avatar: string; email?: string; token?: string; expiresAt?: number }) => {
    const now = Date.now();
    const fullUser = {
      ...u,
      email: u.email || `${u.name.toLowerCase().replace(/\s+/g, '.')}@ticketflow.io`,
      token: u.token || currentUser.token || `tf_tk_${now}_${Math.random().toString(36).substring(2, 9)}`,
      expiresAt: u.expiresAt || currentUser.expiresAt || (now + 60 * 60 * 1000),
      loginTimestamp: currentUser.loginTimestamp || now,
      lastActivityTimestamp: now,
    };
    setCurrentUser(fullUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tf_session', JSON.stringify(fullUser));
    }
  };

  const handleSaveBranding = async (newBranding: AppBrandingConfig) => {
    setBranding(newBranding);
    saveBrandingToLocal(newBranding);
    try {
      await fetch('/api/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBranding),
      });
    } catch (e) {
      console.error('Error saving branding to backend:', e);
    }
  };

  const handleUpdateProfile = async (newProfile: { name: string; role: string; avatar: string; email?: string }) => {
    const oldName = currentUser.name;
    const oldEmail = currentUser.email;

    const updatedUser = {
      ...currentUser,
      ...newProfile,
      email: newProfile.email || currentUser.email,
      loginTimestamp: currentUser.loginTimestamp || Date.now(),
    };
    setCurrentUser(updatedUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tf_session', JSON.stringify(updatedUser));
    }

    setDevelopers((prevDevs) =>
      prevDevs.map((dev) =>
        (currentUser.id && dev.id === currentUser.id) ||
        (dev.name && oldName && dev.name.toLowerCase() === oldName.toLowerCase()) ||
        (dev.email && oldEmail && dev.email.toLowerCase() === oldEmail.toLowerCase())
          ? {
              ...dev,
              name: newProfile.name,
              role: newProfile.role,
              avatar: newProfile.avatar,
              email: newProfile.email || dev.email,
            }
          : dev
      )
    );

    // Update tickets assignedTo avatar and requestedBy name
    setTickets((prevTickets) =>
      prevTickets.map((t) => {
        let updated = false;
        let reqName = t.requestedBy;
        let assigned = t.assignedTo;

        if (oldName && t.requestedBy === oldName) {
          reqName = newProfile.name;
          updated = true;
        }

        if (
          t.assignedTo &&
          ((currentUser.id && t.assignedTo.id === currentUser.id) ||
            (oldName && t.assignedTo.name && t.assignedTo.name.toLowerCase() === oldName.toLowerCase()) ||
            (newProfile.name && t.assignedTo.name && t.assignedTo.name.toLowerCase() === newProfile.name.toLowerCase()))
        ) {
          assigned = { ...t.assignedTo, name: newProfile.name, role: newProfile.role, avatar: newProfile.avatar };
          updated = true;
        }

        return updated ? { ...t, requestedBy: reqName, assignedTo: assigned } : t;
      })
    );

    try {
      await fetch('/api/user-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProfile,
          id: currentUser.id,
          oldName,
          oldEmail,
        }),
      });
    } catch (e) {
      console.error('Error saving user profile to server:', e);
    }
  };

  const currentTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];
  const userSubmittedTickets = tickets.filter((t) => t.requestedBy === currentUser.name || t.requestedBy === 'Marc Dupont' || t.id.startsWith('TF-'));

  const isAdmin =
    currentUser.role?.toLowerCase().includes('admin') ||
    currentUser.role?.toLowerCase().includes('architect') ||
    currentUser.email === 'admin@ticketflow.io';
  const userUnreadNotifsCount = notifications.filter((n) => {
    if (n.read) return false;
    if (isAdmin) return true;
    if (!n.targetUserEmail && !n.targetUserName) return true;
    if (currentUser.email && n.targetUserEmail?.toLowerCase() === currentUser.email.toLowerCase()) return true;
    if (currentUser.name && n.targetUserName?.toLowerCase() === currentUser.name.toLowerCase()) return true;
    return false;
  }).length;

  if (!isAuthenticated) {
    return (
      <LoginView
        developers={developers}
        onLogin={handleLogin}
        dbConnected={dbStatus.connected}
        branding={branding}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30]">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        currentUser={currentUser}
        developers={developers}
        onSwitchUser={handleSwitchUser}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenSupport={() => setIsSupportChatOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenImportModal={isAdmin ? () => setIsImportModalOpen(true) : undefined}
        onOpenMobileApkModal={() => setIsMobileApkModalOpen(true)}
        onToggleSidebar={() => setIsMobileSidebarOpen(true)}
        onLogout={handleLogout}
        onManualSync={handleManualSync}
        isSyncing={isSyncing}
        dbStatus={dbStatus}
        unreadCount={userUnreadNotifsCount}
        branding={branding}
      />

      {/* PWA / APK Mobile Notification Banner */}
      <PWAInstallBanner
        onOpenMobileModal={() => setIsMobileApkModalOpen(true)}
        appName={branding?.appName}
      />

      {/* Left Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        pendingCount={tickets.filter((t) => t.status === 'pending').length}
        onLogout={handleLogout}
        currentUser={currentUser}
        branding={branding}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenImportModal={isAdmin ? () => setIsImportModalOpen(true) : undefined}
        onOpenMobileApkModal={() => setIsMobileApkModalOpen(true)}
      />

      {/* Main Content View Switcher */}
      <main className="lg:ml-[260px] min-h-screen">
        {currentView === 'dashboard' && (
          <AdminDashboard
            tickets={tickets}
            developers={developers}
            projects={projects}
            onSelectTicket={handleSelectTicket}
            onInspectTicket={handleInspectTicket}
            isInspectionOpen={isInspectionDrawerOpen}
            onValidateTicket={handleValidateTicket}
            onRejectTicket={handleRejectTicket}
            onDeleteTicket={handleDeleteTicket}
            onNavigateCreate={() => setCurrentView('create_ticket')}
            onOpenExportModal={() => setIsExportModalOpen(true)}
            onOpenImportModal={isAdmin ? () => setIsImportModalOpen(true) : undefined}
            onEditTicket={handleEditTicket}
            onAssignProject={handleAssignProject}
            currentUser={currentUser}
          />
        )}

        {currentView === 'projects' && (
          <ProjectsView
            projects={projects}
            tickets={tickets}
            developers={developers}
            onSelectProjectFilter={handleSelectProjectFilter}
            onSaveProject={(p) => {
              const exists = projects.some((existing) => existing.id === p.id);
              if (exists) {
                handleUpdateProject(p);
              } else {
                handleAddProject(p);
              }
            }}
            onDeleteProject={handleDeleteProject}
            onNavigateToTicket={handleSelectTicket}
            onCreateTicketForProject={handleCreateTicketForProject}
            onAssignProject={handleAssignProject}
            onAssignTicketsToProject={handleAssignTicketsToProject}
          />
        )}

        {currentView === 'tickets' && (
          <TicketsList
            tickets={tickets}
            developers={developers}
            projects={projects}
            initialProjectFilter={selectedProjectFilter}
            onSelectTicket={handleSelectTicket}
            onInspectTicket={handleInspectTicket}
            isInspectionOpen={isInspectionDrawerOpen}
            onDeleteTicket={handleDeleteTicket}
            onNavigateCreate={() => setCurrentView('create_ticket')}
            onToggleClarity={handleToggleClarity}
            onAssignDev={handleAssignDev}
            onEditTicket={handleEditTicket}
            onAssignProject={handleAssignProject}
            onOpenExportModal={() => setIsExportModalOpen(true)}
            onOpenImportModal={isAdmin ? () => setIsImportModalOpen(true) : undefined}
            currentUser={currentUser}
          />
        )}

        {currentView === 'ticket_detail' && (
          <TicketDetail
            ticket={currentTicket}
            developers={developers}
            projects={projects}
            onBack={() => setCurrentView('tickets')}
            onUpdateTicketStatus={handleUpdateTicketStatus}
            onAddComment={handleAddComment}
            onAddAttachments={handleAddAttachments}
            onSelectRelatedTicket={handleSelectTicket}
            currentUser={currentUser}
            onAssignDev={handleAssignDev}
            onValidateTicket={handleValidateTicket}
            onDeleteTicket={handleDeleteTicket}
            onToggleClarity={handleToggleClarity}
            onEditTicket={handleEditTicket}
            onAssignProject={handleAssignProject}
          />
        )}

        {currentView === 'create_ticket' && (
          <CreateTicket
            onSubmitTicket={handleCreateTicket}
            onCancel={() => setCurrentView('tickets')}
            userTickets={userSubmittedTickets}
            projects={projects}
            initialProjectId={createTicketInitialProjectId}
            onOpenSupportChat={() => setIsSupportChatOpen(true)}
            onSelectTicket={handleSelectTicket}
            currentUser={currentUser}
          />
        )}

        {currentView === 'dev_tasks' && (
          <DevTasks
            tickets={tickets}
            developers={developers}
            onCompleteTask={handleCompleteTask}
            onToggleClarity={handleToggleClarity}
            onRefresh={() => {
              // Forced reload
            }}
            currentUser={currentUser}
            onSelectTicket={handleSelectTicket}
            onAssignDev={handleAssignDev}
            onEditTicket={handleEditTicket}
          />
        )}

        {currentView === 'team' && isAdmin && (
          <TeamView
            developers={developers}
            tickets={tickets}
            onAddDeveloper={handleAddDeveloper}
            onUpdateDeveloper={handleUpdateDeveloper}
            onDeleteDeveloper={handleDeleteDeveloper}
            onResetPassword={handleResetPassword}
            currentUser={currentUser}
            branding={branding}
            onNavigate={(view) => {
              setCurrentView(view);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentView === 'settings' && (
          <SettingsView
            branding={branding}
            onSaveBranding={handleSaveBranding}
            currentUser={currentUser}
            onSaveUserProfile={handleUpdateProfile}
            isAdmin={isAdmin}
            onManualSync={handleManualSync}
            isSyncing={isSyncing}
            dbStatus={dbStatus}
            onOpenExportModal={() => setIsExportModalOpen(true)}
            onOpenImportModal={isAdmin ? () => setIsImportModalOpen(true) : undefined}
            onOpenMobileApkModal={() => setIsMobileApkModalOpen(true)}
          />
        )}
      </main>

      {/* Support Chat Modal */}
      <SupportChatModal
        isOpen={isSupportChatOpen}
        onClose={() => setIsSupportChatOpen(false)}
      />

      {/* Notifications Drawer Modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onSelectTicket={handleSelectTicket}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
        currentUser={currentUser}
      />

      {/* Custom XLSX/PDF Export Modal */}
      <CustomExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        tickets={tickets}
        developers={developers}
        branding={branding}
        currentUser={currentUser}
        onSuccessToast={(msg) => {
          setToastMessage(msg);
          setTimeout(() => setToastMessage(null), 5000);
        }}
      />

      {/* Custom Excel Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        developers={developers}
        onImportTickets={handleBatchImportTickets}
        currentUser={currentUser}
        onSuccessToast={(msg) => {
          setToastMessage(msg);
          setTimeout(() => setToastMessage(null), 5000);
        }}
      />

      {/* Retractable Right-Anchored Side Panel for Inspection & Comparison */}
      <TicketInspectionDrawer
        isOpen={isInspectionDrawerOpen}
        onOpen={() => {
          if (!inspectedTicketId && tickets.length > 0) {
            setInspectedTicketId(tickets[0].id);
          }
          setIsInspectionDrawerOpen(true);
        }}
        onClose={() => setIsInspectionDrawerOpen(false)}
        ticketId={inspectedTicketId || (tickets[0]?.id ?? null)}
        compareTicketId={compareTicketId}
        tickets={tickets}
        developers={developers}
        projects={projects}
        currentUser={currentUser}
        onChangeTicket={(tId) => setInspectedTicketId(tId)}
        onOpenFullScreen={(tId) => {
          setIsInspectionDrawerOpen(false);
          handleSelectTicket(tId);
        }}
        onUpdateTicketStatus={handleUpdateTicketStatus}
        onAddComment={handleAddComment}
        onAssignDev={handleAssignDev}
        onAssignProject={handleAssignProject}
        onToggleClarity={handleToggleClarity}
        onEditTicket={handleEditTicket}
        onDeleteTicket={handleDeleteTicket}
      />

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        pendingCount={tickets.filter((t) => t.status === 'pending').length}
        unreadNotifsCount={userUnreadNotifsCount}
        isAdmin={isAdmin}
      />

      {/* Mobile APK & PWA Generator Modal */}
      <MobileApkModal
        isOpen={isMobileApkModalOpen}
        onClose={() => setIsMobileApkModalOpen(false)}
        branding={branding}
      />

      {/* Offline Mode Indicator */}
      <OfflineIndicator />

      {/* Android / Device Push Notification Prompt */}
      <NotificationPermissionPrompt currentUser={currentUser} />

      {/* Success/Information Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-[#0b1c30] text-white px-4 py-3 rounded-2xl shadow-2xl border border-indigo-500/30 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <span className="material-symbols-outlined text-emerald-400 text-xl">check_circle</span>
          <span className="text-xs font-semibold leading-tight">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-auto text-slate-400 hover:text-white"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}
    </div>
  );
}
