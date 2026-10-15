/**
 * Mobile and Android Environment Detection Helper
 */

export function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /android/i.test(ua);
}

export function isMobileScreen(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 1024;
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
