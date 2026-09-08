// Service Worker Registration for Progressive Web App (PWA) on Android & Modern Browsers

export function registerServiceWorker() {
  if (typeof window === 'undefined') return;

  // In development, dev server, or preview environments, ensure all legacy service workers and caches are purged to prevent stale script caching
  const isDevOrPreview = 
    Boolean((import.meta as any).env?.DEV) || 
    window.location.hostname === 'localhost' || 
    window.location.hostname.includes('.run.app') ||
    window.location.hostname.includes('webcontainer') ||
    window.location.port === '3000';

  if (isDevOrPreview) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister().then(() => {
            console.log('[PharmPulse] Purged service worker for fresh dev execution:', reg.scope);
          });
        }
      });
    }
    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          caches.delete(key);
        }
      });
    }
    return;
  }

  // Only in true production standalone deployments:
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((error) => {
          console.warn('[PharmPulse PWA] Service Worker registration notice:', error);
        });
    });
  }
}
