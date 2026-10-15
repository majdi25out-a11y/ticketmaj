/**
 * Device & Background Notifications Manager for Android, PWA, and Modern Browsers
 * Supports Android Chrome, WebAPK, Foreground & Background Web Push (FCM / VAPID)
 */

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export interface DeviceNotificationPayload {
  title: string;
  body: string;
  ticketId?: string;
  urgent?: boolean;
}

// Track Service Worker registration reference
let swRegistration: ServiceWorkerRegistration | null = null;
let onTicketOpenCallback: ((ticketId: string) => void) | null = null;

export function setOnTicketOpenHandler(handler: (ticketId: string) => void) {
  onTicketOpenCallback = handler;
}

/**
 * Detect if currently running on Android device or Android WebView
 */
export function isAndroidDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return /android/.test(ua);
}

/**
 * Helper to convert Base64 URL to Uint8Array for VAPID public key
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Play a pleasant audio chime using Web Audio API synthesis (works offline, zero external asset failure)
 */
export function playNotificationChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Two-tone chime (F5 -> A5)
    osc.frequency.setValueAtTime(698.46, ctx.currentTime);
    osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch (_e) {
    // Audio context may be restricted before first user interaction
  }
}

/**
 * Trigger mobile hardware vibration if supported (Android vibration pattern)
 */
export function triggerHapticVibration(urgent: boolean = false) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (urgent) {
        navigator.vibrate([250, 100, 250, 100, 400]);
      } else {
        navigator.vibrate([150, 80, 150]);
      }
    } catch (_e) {
      // Haptics not available
    }
  }
}

/**
 * Initialize Service Worker registration and setup listeners
 */
export async function initServiceWorkerAndNotifications(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    // Listen for messages from Service Worker (e.g., when notification is clicked on Android)
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'OPEN_TICKET' && event.data.ticketId) {
        if (onTicketOpenCallback) {
          onTicketOpenCallback(event.data.ticketId);
        }
      }
    });

    // Register custom notification service worker
    const reg = await navigator.serviceWorker.register('/sw-notifications.js', { scope: '/' });
    swRegistration = reg;

    // Check if permission already granted, auto-subscribe to push
    if ('Notification' in window && Notification.permission === 'granted') {
      subscribeToWebPush().catch(() => {});
    }

    return reg;
  } catch (err) {
    console.warn('[TicketFlow Notifications] Service Worker registration info:', err);
    try {
      swRegistration = await navigator.serviceWorker.ready;
      return swRegistration;
    } catch (_e) {
      return null;
    }
  }
}

/**
 * Check current device permission status
 */
export function getNotificationPermissionStatus(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
}

/**
 * Subscribe browser to Server Web Push (FCM / VAPID) for Android background delivery
 */
export async function subscribeToWebPush(user?: { email?: string; name?: string }): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  try {
    const reg = swRegistration || (await navigator.serviceWorker.ready);
    if (!reg || !reg.pushManager) return false;

    // Fetch VAPID public key from backend
    const keyRes = await fetch('/api/push/public-key');
    if (!keyRes.ok) return false;
    const { publicKey } = await keyRes.json();
    if (!publicKey) return false;

    // Check existing subscription or create new
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const appServerKey = urlBase64ToUint8Array(publicKey);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey.buffer as ArrayBuffer,
      });
    }

    // Send subscription to server
    const saveRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        userEmail: user?.email || localStorage.getItem('ticketflow_user_email'),
        userName: user?.name || localStorage.getItem('ticketflow_user_name'),
      }),
    });

    return saveRes.ok;
  } catch (err) {
    console.warn('[TicketFlow Push] Error subscribing to web push:', err);
    return false;
  }
}

/**
 * Explicitly prompt user for notification permissions on Android / desktop
 */
export async function requestDeviceNotificationPermission(user?: {
  email?: string;
  name?: string;
}): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  try {
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      // Register push immediately
      await subscribeToWebPush(user);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return false;
  }
}

/**
 * Display a real system tray / status bar notification on Android & desktop
 * Works both when the app is active and in background / screen off
 */
export async function showDeviceNotification(payload: DeviceNotificationPayload): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  // Check permission
  if (Notification.permission !== 'granted') {
    return false;
  }

  // Always play audio chime and trigger vibration
  playNotificationChime();
  triggerHapticVibration(payload.urgent);

  const title = payload.title || 'TicketFlow';
  const tag = `tf-${payload.ticketId || Date.now()}`;
  const options: NotificationOptions = {
    body: payload.body,
    icon: '/pwa-192x192.png',
    badge: '/favicon.png',
    tag,
    data: {
      ticketId: payload.ticketId,
      url: payload.ticketId ? `/?ticket=${payload.ticketId}` : '/',
    },
  };

  // 1. Primary path on Android Chrome / WebAPK / PWA: ServiceWorkerRegistration.showNotification()
  try {
    let reg = swRegistration;
    if (!reg && 'serviceWorker' in navigator) {
      reg = await navigator.serviceWorker.ready;
    }

    if (reg && typeof reg.showNotification === 'function') {
      await reg.showNotification(title, options);
      return true;
    }
  } catch (swErr) {
    console.warn('[TicketFlow Notifications] Service Worker showNotification failed:', swErr);
  }

  // 2. Fallback: Window Notification API (Desktop only — Android Chrome throws Illegal Constructor for new Notification)
  if (!isAndroidDevice()) {
    try {
      const n = new Notification(title, options);
      n.onclick = () => {
        window.focus();
        if (payload.ticketId && onTicketOpenCallback) {
          onTicketOpenCallback(payload.ticketId);
        }
        n.close();
      };
      return true;
    } catch (windowErr) {
      console.warn('[TicketFlow Notifications] Window Notification fallback failed:', windowErr);
      return false;
    }
  }

  return false;
}

/**
 * Dispatch an immediate test notification to verify Android system status bar delivery
 */
export async function sendTestNotification(user?: { email?: string; name?: string }): Promise<{
  success: boolean;
  message: string;
}> {
  const perm = getNotificationPermissionStatus();
  if (perm !== 'granted') {
    const granted = await requestDeviceNotificationPermission(user);
    if (!granted) {
      return {
        success: false,
        message: 'Permission refusée par le système Android. Activez les notifications dans les paramètres du navigateur.',
      };
    }
  }

  // Ensure push subscription is active
  await subscribeToWebPush(user);

  // Attempt server-side push for true background simulation
  try {
    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: user?.email }),
    });

    if (res.ok) {
      // Also trigger chime & haptic
      playNotificationChime();
      triggerHapticVibration(true);
      return {
        success: true,
        message: 'Notification système envoyée sur votre appareil Android (avant-plan et arrière-plan) !',
      };
    }
  } catch (_e) {
    // Fallback to local service worker notification
  }

  const localOk = await showDeviceNotification({
    title: '🔔 TicketFlow - Test Android Réussi',
    body: 'Les notifications système fonctionnent correctement en avant-plan et arrière-plan !',
    urgent: true,
  });

  return {
    success: localOk,
    message: localOk
      ? 'Notification locale envoyée avec succès sur votre appareil Android !'
      : 'Impossible d\'afficher la notification. Vérifiez les autorisations de votre téléphone.',
  };
}
