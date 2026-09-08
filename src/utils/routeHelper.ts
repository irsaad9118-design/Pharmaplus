/**
 * Dynamic URL Route Helper for PharmPulse
 * 
 * Rules:
 * 1. When URL has `?admin=true` (or `admin=true` in query params/hash), activate Super Admin SaaS Dashboard.
 * 2. When URL is opened normally (without `?admin=true`), show ONLY the blank Store Login (Store ID + Password) and hide all admin controls.
 */

export type AppRoute = 'store' | 'superadmin';

export const isSuperAdminUrl = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    const search = window.location.search;
    const hash = window.location.hash;
    const pathname = window.location.pathname;

    // Check search params directly
    const urlParams = new URLSearchParams(search);
    const adminParam = urlParams.get('admin');
    const viewParam = urlParams.get('view');
    const modeParam = urlParams.get('mode');

    if (
      adminParam === 'true' || 
      adminParam === '1' || 
      viewParam === 'superadmin' || 
      viewParam === 'admin' || 
      modeParam === 'admin'
    ) {
      return true;
    }

    const lowerSearch = search.toLowerCase();
    const lowerHash = hash.toLowerCase();
    const lowerPath = pathname.toLowerCase();

    return (
      lowerSearch.includes('admin=true') ||
      lowerSearch.includes('view=superadmin') ||
      lowerSearch.includes('view=admin') ||
      lowerSearch.includes('superadmin=true') ||
      lowerHash.includes('admin=true') ||
      lowerHash.includes('/admin') ||
      lowerHash.includes('superadmin') ||
      lowerHash === '#admin' ||
      lowerPath.endsWith('/admin')
    );
  } catch (e) {
    return false;
  }
};

export const getInitialAppRoute = (): AppRoute => {
  return isSuperAdminUrl() ? 'superadmin' : 'store';
};

export const setAppUrlRoute = (route: AppRoute) => {
  if (typeof window === 'undefined' || !window.history || !window.history.pushState) return;

  try {
    const url = new URL(window.location.href);
    if (route === 'superadmin') {
      url.searchParams.set('admin', 'true');
      url.searchParams.delete('view');
      url.searchParams.delete('mode');
      if (url.hash && (url.hash.includes('admin') || url.hash.includes('super'))) {
        url.hash = '';
      }
      window.history.pushState({ route: 'superadmin' }, '', url.pathname + url.search);
    } else {
      url.searchParams.delete('admin');
      url.searchParams.delete('view');
      url.searchParams.delete('superadmin');
      url.searchParams.delete('mode');
      if (url.hash.includes('admin') || url.hash.includes('super')) {
        url.hash = '';
      }
      const newQuery = url.search ? url.search : '';
      window.history.pushState({ route: 'store' }, '', url.pathname + newQuery);
    }
  } catch (e) {
    console.error('Failed to update URL route', e);
  }
};

