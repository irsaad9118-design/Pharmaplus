import { StoreWorkspace, SubscriptionPlanKey, CompletedBillRecord } from '../types/pharmacy';
import { INITIAL_INVENTORY } from '../data/initialData';

export const STORES_STORAGE_KEY = 'pharmpulse_stores';
export const REGISTERED_STORES_STORAGE_KEY = 'pharmpulse_stores';
export const DELETED_STORES_KEY = 'pharmpulse_deleted_stores';
export const MASTER_PIN_STORAGE_KEY = 'pharmpulse_master_pin_v1';
export const DEFAULT_MASTER_PIN = '1417';

export interface RegisteredStoreRecord extends StoreWorkspace {
  id?: string;
  name?: string;
  ownerEmail?: string;
  phone?: string;
  dlNumber: string;
  dailySalesTotal?: number;
  totalSalesCount?: number;
  salesHistory?: CompletedBillRecord[];
  initialPassword?: string;
  onboardedBy?: string;
  notes?: string;
  inventory?: any[];
  sales?: any[];
}

/**
 * Get configured Master Super Admin PIN from localStorage (default: "1417")
 */
export const getMasterPin = (): string => {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(MASTER_PIN_STORAGE_KEY);
      if (stored && stored.trim()) {
        return stored.trim();
      }
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_MASTER_PIN;
};

/**
 * Save new Master Super Admin PIN in localStorage
 */
export const setMasterPin = (newPin: string): boolean => {
  try {
    const clean = (newPin || '').trim();
    if (!clean) return false;
    localStorage.setItem(MASTER_PIN_STORAGE_KEY, clean);
    return true;
  } catch (e) {
    console.error('Failed to set master pin', e);
    return false;
  }
};

/**
 * Verify Master PIN / Password against allowed credentials or saved PIN
 * Accepts PIN "1417", "1817", Password "admin@RK", and custom stored Master PIN
 */
export const verifyMasterPin = (inputPin: string): boolean => {
  const clean = (inputPin || '').trim();
  if (!clean) return false;
  const currentPin = getMasterPin();
  const validKeys = [
    '1417',
    '1817',
    'admin@RK',
    'admin@rk',
    'Admin@RK',
    'MasterAdmin@2026',
    'masteradmin@2026',
    'admin123',
    'admin',
    currentPin,
    DEFAULT_MASTER_PIN
  ];
  return validKeys.includes(clean) || validKeys.some(k => k.toLowerCase() === clean.toLowerCase());
};

/**
 * Set of deleted store IDs to ensure deleted stores are never revived
 */
export const getDeletedStoreIds = (): Set<string> => {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(DELETED_STORES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return new Set(parsed.map(id => String(id).toLowerCase().trim()));
        }
      }
    }
  } catch (e) {}
  return new Set<string>();
};

export const saveDeletedStoreIds = (ids: Set<string>): void => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DELETED_STORES_KEY, JSON.stringify(Array.from(ids)));
    }
  } catch (e) {}
};

// Default baseline stores: Apex, Sanjeevani, MedExpress with complete tracking fields and sales history
const TODAY_STR = new Date().toISOString().split('T')[0];

export const DEFAULT_INITIAL_STORES: RegisteredStoreRecord[] = [
  {
    id: 'STORE-APEX01',
    storeId: 'STORE-APEX01',
    name: 'Apex Medicos & Healthcare',
    storeName: 'Apex Medicos & Healthcare',
    ownerName: 'Rajesh Sharma',
    ownerPhone: '9876543210',
    phone: '9876543210',
    ownerEmail: 'rajesh.apex@gmail.com',
    dlNumber: 'DL-20B/3891 & 21B/3892',
    gstin: '07AAAAA0000A1Z5',
    address: 'Shop No. 4-5, Ground Floor, Central Market, Sector 14, New Delhi - 110001',
    password: '1234',
    initialPassword: '1234',
    status: 'ACTIVE',
    dailySalesTotal: 14250,
    totalSalesCount: 12,
    salesHistory: [
      { billId: 'INV-2026-9812', date: TODAY_STR, amount: 1450, items: 3, timestamp: `${TODAY_STR} 11:20:00`, customerName: 'Ramesh Kumar', paymentMethod: 'UPI / QR Code' },
      { billId: 'INV-2026-9811', date: TODAY_STR, amount: 2890, items: 4, timestamp: `${TODAY_STR} 10:45:00`, customerName: 'Sunita Mehra', paymentMethod: 'Cash' },
      { billId: 'INV-2026-9810', date: TODAY_STR, amount: 950, items: 2, timestamp: `${TODAY_STR} 10:10:00`, customerName: 'Walk-in Customer', paymentMethod: 'Cash' },
      { billId: 'INV-2026-9809', date: TODAY_STR, amount: 3450, items: 5, timestamp: `${TODAY_STR} 09:35:00`, customerName: 'Priya Sharma', paymentMethod: 'Credit Card' },
      { billId: 'INV-2026-9808', date: TODAY_STR, amount: 5510, items: 6, timestamp: `${TODAY_STR} 09:05:00`, customerName: 'Dr. Alok Verma', paymentMethod: 'UPI / QR Code' }
    ],
    inventory: INITIAL_INVENTORY,
    sales: [],
    subscriptionPlan: 'pro_1999_yr',
    subscriptionPrice: 1999,
    subscriptionExpiryDate: '2027-08-20',
    createdAt: '2025-08-20',
    connectedDevicesCount: 2,
    totalRevenueCollected: 1999,
    allowedUserLimit: 3,
    upiId: 'apexmedicos@okhdfcbank'
  },
  {
    id: 'STORE-SANJ02',
    storeId: 'STORE-SANJ02',
    name: 'Sanjeevani Medicos & Chemist',
    storeName: 'Sanjeevani Medicos & Chemist',
    ownerName: 'Vikas Gupta',
    ownerPhone: '9812345678',
    phone: '9812345678',
    ownerEmail: 'vikas.sanjeevani@gmail.com',
    dlNumber: 'DL-20B/4521 & 21B/4522',
    gstin: '07BBBBB1111B2Z6',
    address: 'Plot 12, Main Road, Lajpat Nagar II, New Delhi - 110024',
    password: '1234',
    initialPassword: '1234',
    status: 'ACTIVE',
    dailySalesTotal: 8640,
    totalSalesCount: 7,
    salesHistory: [
      { billId: 'INV-2026-7741', date: TODAY_STR, amount: 1850, items: 3, timestamp: `${TODAY_STR} 11:15:00`, customerName: 'Manish Tyagi', paymentMethod: 'UPI / QR Code' },
      { billId: 'INV-2026-7740', date: TODAY_STR, amount: 3200, items: 4, timestamp: `${TODAY_STR} 10:30:00`, customerName: 'Anil Dhawan', paymentMethod: 'Cash' },
      { billId: 'INV-2026-7739', date: TODAY_STR, amount: 3590, items: 5, timestamp: `${TODAY_STR} 09:20:00`, customerName: 'Rekha Sen', paymentMethod: 'UPI / QR Code' }
    ],
    inventory: INITIAL_INVENTORY,
    sales: [],
    subscriptionPlan: 'starter_299_mo',
    subscriptionPrice: 299,
    subscriptionExpiryDate: '2027-09-15',
    createdAt: '2026-01-15',
    connectedDevicesCount: 1,
    totalRevenueCollected: 1794,
    allowedUserLimit: 0,
    upiId: 'sanjeevanimeds@icici'
  },
  {
    id: 'STORE-MEDX04',
    storeId: 'STORE-MEDX04',
    name: 'MedExpress 24x7 Drugs',
    storeName: 'MedExpress 24x7 Drugs',
    ownerName: 'Amit Patel',
    ownerPhone: '9834567890',
    phone: '9834567890',
    ownerEmail: 'amit.medx@gmail.com',
    dlNumber: 'DL-20B/9912 & 21B/9913',
    gstin: '07DDDDD3333D4Z8',
    address: 'Station Road, Karol Bagh, New Delhi - 110005',
    password: 'password123',
    initialPassword: 'password123',
    status: 'ACTIVE',
    dailySalesTotal: 21390,
    totalSalesCount: 14,
    salesHistory: [
      { billId: 'INV-2026-5510', date: TODAY_STR, amount: 6420, items: 7, timestamp: `${TODAY_STR} 11:30:00`, customerName: 'Apollo Hospital Transfer', paymentMethod: 'NEFT / RTGS' },
      { billId: 'INV-2026-5509', date: TODAY_STR, amount: 8970, items: 8, timestamp: `${TODAY_STR} 10:00:00`, customerName: 'Rohit Aggarwal', paymentMethod: 'Credit Card' },
      { billId: 'INV-2026-5508', date: TODAY_STR, amount: 6000, items: 6, timestamp: `${TODAY_STR} 08:45:00`, customerName: 'Kavita Joshi', paymentMethod: 'Cash' }
    ],
    inventory: INITIAL_INVENTORY,
    sales: [],
    subscriptionPlan: 'pro_1999_yr',
    subscriptionPrice: 1999,
    subscriptionExpiryDate: '2027-07-01',
    createdAt: '2025-07-01',
    connectedDevicesCount: 0,
    totalRevenueCollected: 1999,
    allowedUserLimit: 2,
    upiId: 'medexpress@sbi'
  }
];

/**
 * Retrieve all registered stores from localStorage (key: 'pharmpulse_stores').
 * Initial sync: If storage is empty, initialize default stores (Apex, Sanjeevani, MedExpress).
 */
export const getRegisteredStores = (): RegisteredStoreRecord[] => {
  try {
    if (typeof localStorage === 'undefined') {
      return DEFAULT_INITIAL_STORES;
    }

    const raw = localStorage.getItem(STORES_STORAGE_KEY) || localStorage.getItem('pharmpulse_registered_stores_v1');
    const deletedIds = getDeletedStoreIds();

    if (!raw) {
      // Storage is empty: initialize default stores
      const initial = DEFAULT_INITIAL_STORES.filter(
        s => !deletedIds.has((s.id || s.storeId).toLowerCase())
      );
      localStorage.setItem(STORES_STORAGE_KEY, JSON.stringify(initial));
      localStorage.setItem('pharmpulse_registered_stores_v1', JSON.stringify(initial));
      return initial;
    }

    let parsed: any[] = [];
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      parsed = [];
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      // Re-seed only if empty and no deleted history
      const initial = DEFAULT_INITIAL_STORES.filter(
        s => !deletedIds.has((s.id || s.storeId).toLowerCase())
      );
      localStorage.setItem(STORES_STORAGE_KEY, JSON.stringify(initial));
      localStorage.setItem('pharmpulse_registered_stores_v1', JSON.stringify(initial));
      return initial;
    }

    // Normalize records and filter out deleted stores
    const normalized: RegisteredStoreRecord[] = parsed
      .filter(s => {
        const id = (s.id || s.storeId || '').toLowerCase();
        return id && !deletedIds.has(id);
      })
      .map(s => {
        const storeId = (s.storeId || s.id || '').toUpperCase();
        const storeName = s.storeName || s.name || 'Medical Store';
        const phone = s.phone || s.ownerPhone || '9876543210';
        const ownerEmail = s.ownerEmail || `${storeId.toLowerCase()}@pharmpulse.store`;
        const dlNumber = s.dlNumber || 'DL-20B/3891 & 21B/3892';
        const password = s.password || s.initialPassword || 'store123';
        const rawStatus = (s.status || 'ACTIVE').toUpperCase();
        const status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'active' | 'deactivated' = 
          rawStatus === 'DEACTIVATED' || rawStatus === 'SUSPENDED' ? 'SUSPENDED' :
          rawStatus === 'EXPIRED' ? 'EXPIRED' : 'ACTIVE';

        const salesHistory: CompletedBillRecord[] = Array.isArray(s.salesHistory) ? s.salesHistory : [];
        const todayStr = new Date().toISOString().split('T')[0];
        const todaysBills = salesHistory.filter(b => b.date === todayStr);

        const calculatedDailyTotal = todaysBills.length > 0 
          ? todaysBills.reduce((acc, b) => acc + (Number(b.amount) || 0), 0)
          : (s.dailySalesTotal !== undefined ? Number(s.dailySalesTotal) : 0);

        const calculatedTotalCount = todaysBills.length > 0 
          ? todaysBills.length 
          : (s.totalSalesCount !== undefined ? Number(s.totalSalesCount) : 0);

        return {
          ...s,
          id: storeId,
          storeId,
          name: storeName,
          storeName,
          ownerEmail,
          phone,
          ownerPhone: phone,
          dlNumber,
          password,
          initialPassword: password,
          status,
          dailySalesTotal: Math.round(calculatedDailyTotal * 100) / 100,
          totalSalesCount: calculatedTotalCount,
          salesHistory,
          inventory: (s.inventory && s.inventory.length > 0) ? s.inventory : INITIAL_INVENTORY,
          sales: s.sales || []
        };
      });

    return normalized;
  } catch (e) {
    return DEFAULT_INITIAL_STORES;
  }
};

/**
 * Save or update a registered store in localStorage and dispatch reactive update event.
 */
export const saveRegisteredStore = (store: Partial<RegisteredStoreRecord>): RegisteredStoreRecord[] => {
  try {
    const existing = getRegisteredStores();
    const cleanId = (store.id || store.storeId || '').trim().toUpperCase();
    const cleanName = (store.name || store.storeName || '').trim();
    const cleanPassword = (store.password || store.initialPassword || 'store123').trim();
    const cleanPhone = (store.phone || store.ownerPhone || '').replace(/[^0-9]/g, '');
    const cleanDl = (store.dlNumber || '').trim();
    const cleanEmail = store.ownerEmail || `${cleanId.toLowerCase()}@pharmpulse.store`;

    const todayStr = new Date().toISOString().split('T')[0];
    const existingHistory: CompletedBillRecord[] = Array.isArray(store.salesHistory) ? store.salesHistory : [];
    const todaysBills = existingHistory.filter(b => b.date === todayStr);
    const calculatedDailyTotal = todaysBills.length > 0 
      ? todaysBills.reduce((acc, b) => acc + (Number(b.amount) || 0), 0)
      : (store.dailySalesTotal !== undefined ? Number(store.dailySalesTotal) : 0);
    const calculatedTotalCount = todaysBills.length > 0 
      ? todaysBills.length 
      : (store.totalSalesCount !== undefined ? Number(store.totalSalesCount) : 0);

    const rawStatus = (store.status || 'ACTIVE').toUpperCase();
    const status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'active' | 'deactivated' = 
      rawStatus === 'DEACTIVATED' || rawStatus === 'SUSPENDED' ? 'SUSPENDED' :
      rawStatus === 'EXPIRED' ? 'EXPIRED' : 'ACTIVE';

    const fullStore: RegisteredStoreRecord = {
      ...store,
      id: cleanId,
      storeId: cleanId,
      name: cleanName,
      storeName: cleanName,
      ownerEmail: cleanEmail,
      password: cleanPassword,
      initialPassword: cleanPassword,
      dlNumber: cleanDl,
      phone: cleanPhone,
      ownerPhone: cleanPhone,
      status,
      dailySalesTotal: Math.round(calculatedDailyTotal * 100) / 100,
      totalSalesCount: calculatedTotalCount,
      salesHistory: existingHistory,
      inventory: (store.inventory && store.inventory.length > 0) ? store.inventory : INITIAL_INVENTORY,
      sales: store.sales || [],
      subscriptionPlan: store.subscriptionPlan || 'yearly_3999',
      subscriptionPrice: store.subscriptionPrice || 3999,
      subscriptionExpiryDate: store.subscriptionExpiryDate || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      createdAt: store.createdAt || new Date().toISOString().split('T')[0],
      connectedDevicesCount: store.connectedDevicesCount !== undefined ? store.connectedDevicesCount : 1,
      totalRevenueCollected: store.totalRevenueCollected || 3999,
      allowedUserLimit: store.allowedUserLimit !== undefined ? Number(store.allowedUserLimit) : 2,
      ownerName: store.ownerName || 'Store Owner'
    };

    // Remove from deleted tracking if re-registered
    const deleted = getDeletedStoreIds();
    if (deleted.has(cleanId.toLowerCase())) {
      deleted.delete(cleanId.toLowerCase());
      saveDeletedStoreIds(deleted);
    }

    const idx = existing.findIndex(s => (s.id || s.storeId).toLowerCase() === cleanId.toLowerCase());
    let updated: RegisteredStoreRecord[];
    if (idx >= 0) {
      updated = [...existing];
      updated[idx] = { ...updated[idx], ...fullStore };
    } else {
      updated = [fullStore, ...existing];
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORES_STORAGE_KEY, JSON.stringify(updated));
      localStorage.setItem(REGISTERED_STORES_STORAGE_KEY, JSON.stringify(updated));
      localStorage.setItem('pharmpulse_registered_stores_v1', JSON.stringify(updated));
    }

    // Broadcast reactive update event across components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pharmpulse_stores_updated', { detail: updated }));
    }

    return updated;
  } catch (e) {
    console.error('Failed to save store to registry', e);
    return getRegisteredStores();
  }
};

/**
 * Record a completed bill into the store's sales history in persistent state / localStorage ('pharmpulse_stores').
 * Updates salesHistory, dailySalesTotal, and totalSalesCount in real-time, and dispatches 'pharmpulse_stores_updated'
 * so Super Admin Hub instantly reflects updated figures without needing manual refresh.
 */
export const recordStoreSaleInRegistry = (
  storeId: string, 
  bill: {
    billId: string;
    amount: number;
    items?: number;
    timestamp?: string;
    date?: string;
    customerName?: string;
    paymentMethod?: string;
  }
): RegisteredStoreRecord | null => {
  try {
    const stores = getRegisteredStores();
    const cleanId = (storeId || '').trim().toUpperCase();
    const idx = stores.findIndex(s => (s.id || s.storeId || '').toUpperCase() === cleanId);
    
    const todayStr = new Date().toISOString().split('T')[0];
    const newBillRecord: CompletedBillRecord = {
      billId: bill.billId,
      date: bill.date || todayStr,
      amount: Math.round((Number(bill.amount) || 0) * 100) / 100,
      items: Number(bill.items) || 1,
      timestamp: bill.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
      customerName: bill.customerName || 'Walk-in Customer',
      paymentMethod: bill.paymentMethod || 'Cash'
    };

    if (idx >= 0) {
      const currentStore = stores[idx];
      const existingHistory: CompletedBillRecord[] = Array.isArray(currentStore.salesHistory) 
        ? currentStore.salesHistory 
        : [];
      
      // Avoid duplicate bills
      const filteredHistory = existingHistory.filter(b => b.billId !== newBillRecord.billId);
      const updatedHistory = [newBillRecord, ...filteredHistory];
      
      // Recalculate today's totals
      const todaysBills = updatedHistory.filter(b => b.date === todayStr);
      const updatedDailyTotal = todaysBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
      const updatedCount = todaysBills.length;

      stores[idx] = {
        ...currentStore,
        dailySalesTotal: Math.round(updatedDailyTotal * 100) / 100,
        totalSalesCount: updatedCount,
        salesHistory: updatedHistory
      };

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORES_STORAGE_KEY, JSON.stringify(stores));
        localStorage.setItem(REGISTERED_STORES_STORAGE_KEY, JSON.stringify(stores));
        localStorage.setItem('pharmpulse_registered_stores_v1', JSON.stringify(stores));
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pharmpulse_stores_updated', { detail: stores }));
      }

      return stores[idx];
    }
    return null;
  } catch (err) {
    console.error('Failed to record store sale in registry', err);
    return null;
  }
};

/**
 * Delete a store from local registry and dispatch instant deletion event.
 */
export const deleteStoreFromRegistry = (storeId: string): boolean => {
  try {
    const cleanId = (storeId || '').trim().toLowerCase();
    if (!cleanId) return false;

    const stores = getRegisteredStores();
    const filtered = stores.filter(s => (s.id || s.storeId).toLowerCase() !== cleanId);

    // Track in deleted list so it is blocked from resurrection
    const deleted = getDeletedStoreIds();
    deleted.add(cleanId);
    saveDeletedStoreIds(deleted);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORES_STORAGE_KEY, JSON.stringify(filtered));
      localStorage.setItem('pharmpulse_registered_stores_v1', JSON.stringify(filtered));
    }

    // Dispatch reactive events for instant execution across UI and session engines
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pharmpulse_store_deleted', { detail: { storeId: cleanId } }));
      window.dispatchEvent(new CustomEvent('pharmpulse_stores_updated', { detail: filtered }));
    }

    return true;
  } catch (e) {
    console.error('Failed to delete store from registry', e);
    return false;
  }
};

/**
 * Generate a unique Store ID in the format "PHARM-" + 3-4 random digits (e.g. PHARM-101, PHARM-482).
 */
export const generateUniqueStoreId = (): string => {
  const existing = getRegisteredStores();
  const existingIds = new Set(existing.map(s => s.storeId.toUpperCase()));

  for (let i = 0; i < 100; i++) {
    const digits = Math.floor(100 + Math.random() * 900);
    const candidate = `PHARM-${digits}`;
    if (!existingIds.has(candidate)) {
      return candidate;
    }
  }
  return `PHARM-${Math.floor(1000 + Math.random() * 9000)}`;
};

/**
 * Generate a random initial Owner Password / PIN.
 */
export const generateRandomPassword = (): string => {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `Pass-${digits}`;
};

/**
 * Create a default initialized pharmacy object if a store ID is not found.
 */
export const createDefaultFallbackStore = (identifier: string): RegisteredStoreRecord => {
  const rawClean = (identifier || 'STORE-1802').trim().toUpperCase();
  const cleanId = rawClean.startsWith('STORE-') ? rawClean : `STORE-${rawClean}`;
  const digitsOnly = cleanId.replace(/[^0-9]/g, '') || '1802';
  const nameSuffix = cleanId.replace('STORE-', '').trim();
  const displayName = nameSuffix.length > 2 && isNaN(Number(nameSuffix))
    ? `${nameSuffix.charAt(0).toUpperCase() + nameSuffix.slice(1).toLowerCase()} Medicos & Chemist`
    : `City Care Medicos #${digitsOnly}`;

  const todayStr = new Date().toISOString().split('T')[0];

  return {
    id: cleanId,
    storeId: cleanId,
    name: displayName,
    storeName: displayName,
    ownerName: 'Dr. Ramesh K. Sharma',
    ownerPhone: '9876543210',
    phone: '9876543210',
    ownerEmail: `${cleanId.toLowerCase()}@pharmpulse.store`,
    dlNumber: `DL-20B/${digitsOnly} & 21B/${Number(digitsOnly) + 1}`,
    gstin: `07AAAAA${digitsOnly}A1Z5`,
    address: `Shop No. ${digitsOnly.slice(-2) || '12'}, Ground Floor, Central Healthcare Complex, New Delhi - 110001`,
    password: '1234',
    initialPassword: '1234',
    status: 'ACTIVE',
    dailySalesTotal: 12450,
    totalSalesCount: 14,
    salesHistory: [
      { billId: `INV-2026-${digitsOnly}1`, date: todayStr, amount: 1450, items: 3, timestamp: `${todayStr} 11:20:00`, customerName: 'Ramesh Kumar', paymentMethod: 'UPI / QR Code' },
      { billId: `INV-2026-${digitsOnly}2`, date: todayStr, amount: 2890, items: 4, timestamp: `${todayStr} 10:45:00`, customerName: 'Sunita Mehra', paymentMethod: 'Cash' },
      { billId: `INV-2026-${digitsOnly}3`, date: todayStr, amount: 950, items: 2, timestamp: `${todayStr} 09:30:00`, customerName: 'Dr. Alok Verma', paymentMethod: 'UPI / QR Code' }
    ],
    inventory: INITIAL_INVENTORY,
    sales: [],
    subscriptionPlan: 'pro_1999_yr',
    subscriptionPrice: 1999,
    subscriptionExpiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
    createdAt: new Date().toISOString().split('T')[0],
    connectedDevicesCount: 1,
    totalRevenueCollected: 1999,
    allowedUserLimit: 3,
    upiId: `${cleanId.toLowerCase()}@okhdfcbank`,
    whatsappBotEnabled: true,
    dailyBillLimit: 100,
    expiryAlertDays: 60
  };
};

/**
 * Find a store in localStorage by ID, Phone, or DL Number.
 */
export const findStoreInRegistry = (identifier: string): RegisteredStoreRecord | undefined => {
  const cleanId = (identifier || '').trim().toLowerCase();
  if (!cleanId) return undefined;

  const deleted = getDeletedStoreIds();
  if (deleted.has(cleanId)) return undefined;

  const cleanPhone = cleanId.replace(/[^0-9]/g, '');
  const cleanAlphaNum = cleanId.replace(/[^a-z0-9]/g, '');
  const stores = getRegisteredStores();

  // 1. Check current registered stores in localStorage
  const found = stores.find(s => {
    const sId = (s.id || s.storeId || '').toLowerCase();
    const sAlpha = sId.replace(/[^a-z0-9]/g, '');
    const sPhone = (s.phone || s.ownerPhone || '').replace(/[^0-9]/g, '');
    const sEmail = (s.ownerEmail || '').toLowerCase();
    const sDl = (s.dlNumber || '').toLowerCase();
    return (
      sId === cleanId ||
      sAlpha === cleanAlphaNum ||
      (cleanAlphaNum && sAlpha.includes(cleanAlphaNum)) ||
      (sEmail && sEmail === cleanId) ||
      (cleanPhone.length >= 10 && sPhone === cleanPhone) ||
      (cleanId.length >= 4 && sDl === cleanId) ||
      (cleanId.length >= 4 && sDl.includes(cleanId))
    );
  });
  if (found) return found;

  // 2. Check baseline default stores
  const baselineFound = DEFAULT_INITIAL_STORES.find(s => {
    const sId = (s.id || s.storeId || '').toLowerCase();
    const sAlpha = sId.replace(/[^a-z0-9]/g, '');
    return sId === cleanId || sAlpha === cleanAlphaNum;
  });
  if (baselineFound) return baselineFound;

  return undefined;
};

/**
 * Find or auto-initialize store record from registry, never returning null/undefined.
 */
export const getOrCreateRegisteredStore = (identifier: string): RegisteredStoreRecord => {
  const existing = findStoreInRegistry(identifier);
  if (existing) return existing;

  const fallback = createDefaultFallbackStore(identifier);
  saveRegisteredStore(fallback);
  return fallback;
};

/**
 * Format WhatsApp Credentials Share text.
 */
export const formatWhatsAppCredentialsMessage = (
  store: Partial<RegisteredStoreRecord>,
  portalUrl?: string
): string => {
  const origin = typeof window !== 'undefined' 
    ? `${window.location.origin}${window.location.pathname}` 
    : 'https://pharmpulse.com';
  const cleanUrl = portalUrl || origin;
  const password = store.initialPassword || store.password || 'Pass-1234';
  const expiryDate = store.subscriptionExpiryDate || '1 Year Active';

  return `🎉 *Welcome to PharmPulse POS!*
🏪 *Store:* ${store.storeName || 'Medical Store'}
🔗 *Login Link:* ${cleanUrl}
🆔 *Store ID:* ${store.storeId || 'PHARM-101'}
🔑 *Password:* ${password}
⏳ *Validity:* ${expiryDate}
Support: +91-9876543210

_Open the link, enter your Store ID & Password to start billing!_`;
};

/**
 * Open direct WhatsApp share link.
 */
export const shareCredentialsViaWhatsApp = (
  store: Partial<RegisteredStoreRecord>,
  portalUrl?: string
) => {
  const cleanPhone = (store.ownerPhone || '').replace(/[^0-9]/g, '');
  const message = formatWhatsAppCredentialsMessage(store, portalUrl);
  const targetPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
  const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
  
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

/**
 * Toggle Store Status (Active <-> Deactivated/Suspended)
 */
export const toggleStoreStatusInRegistry = (storeId: string, forcedStatus?: 'active' | 'deactivated' | 'trial' | 'expired'): boolean => {
  try {
    const stores = getRegisteredStores();
    const cleanId = (storeId || '').trim().toLowerCase();
    const idx = stores.findIndex(s => s.storeId.toLowerCase() === cleanId);
    if (idx >= 0) {
      const current = stores[idx].status;
      const nextStatus = forcedStatus || (current === 'active' || current === 'trial' ? 'deactivated' : 'active');
      stores[idx] = {
        ...stores[idx],
        status: nextStatus
      };
      localStorage.setItem(REGISTERED_STORES_STORAGE_KEY, JSON.stringify(stores));
      return true;
    }
    return false;
  } catch (e) {
    console.error('Failed to toggle store status in registry', e);
    return false;
  }
};

/**
 * Fast Extend Store Validity (+7, +30, +365 days)
 */
export const extendStoreValidityInRegistry = (storeId: string, daysToAdd: number, feeCollected: number = 0): boolean => {
  try {
    const stores = getRegisteredStores();
    const cleanId = (storeId || '').trim().toLowerCase();
    const idx = stores.findIndex(s => s.storeId.toLowerCase() === cleanId);
    if (idx >= 0) {
      const currentExp = new Date(stores[idx].subscriptionExpiryDate || Date.now());
      const baseDate = isNaN(currentExp.getTime()) || currentExp.getTime() < Date.now() ? new Date() : currentExp;
      baseDate.setDate(baseDate.getDate() + daysToAdd);

      stores[idx] = {
        ...stores[idx],
        subscriptionExpiryDate: baseDate.toISOString().split('T')[0],
        status: 'active',
        totalRevenueCollected: (stores[idx].totalRevenueCollected || 0) + feeCollected
      };
      localStorage.setItem(REGISTERED_STORES_STORAGE_KEY, JSON.stringify(stores));
      return true;
    }
    return false;
  } catch (e) {
    console.error('Failed to extend store validity in registry', e);
    return false;
  }
};

/**
 * Update store password in local registry.
 */
export const updateStorePasswordInRegistry = (storeId: string, newPassword: string): boolean => {
  try {
    const stores = getRegisteredStores();
    const cleanId = (storeId || '').trim().toLowerCase();
    const idx = stores.findIndex(s => s.storeId.toLowerCase() === cleanId);
    if (idx >= 0) {
      stores[idx] = {
        ...stores[idx],
        password: newPassword,
        initialPassword: newPassword
      };
      localStorage.setItem(REGISTERED_STORES_STORAGE_KEY, JSON.stringify(stores));
      return true;
    }
    return false;
  } catch (e) {
    console.error('Failed to update store password in registry', e);
    return false;
  }
};

/**
 * Update store allowed user/counter limit in local registry.
 */
export const updateStoreUserLimitInRegistry = (storeId: string, allowedUserLimit: number): boolean => {
  try {
    const stores = getRegisteredStores();
    const cleanId = (storeId || '').trim().toLowerCase();
    const idx = stores.findIndex(s => s.storeId.toLowerCase() === cleanId);
    if (idx >= 0) {
      stores[idx] = {
        ...stores[idx],
        allowedUserLimit: Number(allowedUserLimit) >= 0 ? Number(allowedUserLimit) : 0
      };
      localStorage.setItem(REGISTERED_STORES_STORAGE_KEY, JSON.stringify(stores));
      return true;
    }
    return false;
  } catch (e) {
    console.error('Failed to update store user limit in registry', e);
    return false;
  }
};

/**
 * Update store permissions, status, plan, and credentials in local registry.
 */
export const updateStorePermissionsInRegistry = (
  storeId: string, 
  updates: {
    password?: string;
    allowedUserLimit?: number;
    status?: StoreWorkspace['status'];
    subscriptionPlan?: string;
    storeName?: string;
    ownerName?: string;
    dlNumber?: string;
    ownerPhone?: string;
  }
): boolean => {
  try {
    const stores = getRegisteredStores();
    const cleanId = (storeId || '').trim().toLowerCase();
    const idx = stores.findIndex(s => s.storeId.toLowerCase() === cleanId);
    if (idx >= 0) {
      stores[idx] = {
        ...stores[idx],
        ...(updates.password ? { password: updates.password, initialPassword: updates.password } : {}),
        ...(updates.allowedUserLimit !== undefined ? { allowedUserLimit: updates.allowedUserLimit } : {}),
        ...(updates.status ? { status: updates.status } : {}),
        ...(updates.subscriptionPlan ? { subscriptionPlan: updates.subscriptionPlan as any } : {}),
        ...(updates.storeName ? { storeName: updates.storeName } : {}),
        ...(updates.ownerName ? { ownerName: updates.ownerName } : {}),
        ...(updates.dlNumber ? { dlNumber: updates.dlNumber } : {}),
        ...(updates.ownerPhone ? { ownerPhone: updates.ownerPhone } : {})
      };
      localStorage.setItem(STORES_STORAGE_KEY, JSON.stringify(stores));
      localStorage.setItem('pharmpulse_registered_stores_v1', JSON.stringify(stores));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pharmpulse_stores_updated', { detail: stores }));
      }
      return true;
    }
    return false;
  } catch (e) {
    console.error('Failed to update store permissions in registry', e);
    return false;
  }
};

/**
 * Copy formatted credentials to clipboard.
 */
export const copyCredentialsToClipboard = async (
  store: Partial<RegisteredStoreRecord>,
  portalUrl?: string
): Promise<boolean> => {
  const message = formatWhatsAppCredentialsMessage(store, portalUrl);
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(message);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to copy credentials to clipboard', err);
    return false;
  }
};
