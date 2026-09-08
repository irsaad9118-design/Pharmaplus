import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  ShieldCheck, 
  Search, 
  Filter, 
  RefreshCw, 
  ArrowUpRight, 
  Power, 
  Smartphone, 
  CreditCard, 
  Store, 
  Lock, 
  Clock, 
  ExternalLink,
  PlusCircle,
  IndianRupee,
  Layers,
  ChevronDown,
  PackageCheck,
  Trophy,
  Receipt,
  FileText,
  Plus,
  MessageSquare,
  Share2,
  Copy,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  LogIn,
  KeyRound,
  Check,
  Settings,
  Sparkles,
  Zap,
  AlertCircle,
  Mail,
  Phone,
  LayoutGrid,
  List,
  Activity,
  ShoppingBag
} from 'lucide-react';
import { StoreWorkspace, SuperAdminOverview, SubscriptionPlanKey, CompletedBillRecord } from '../../types/pharmacy';
import { useAuth } from '../../context/AuthContext';
import { usePharmacy } from '../../context/PharmacyContext';
import { LiveSoldFeed } from './LiveSoldFeed';
import { SalesLeaderboard } from './SalesLeaderboard';
import { InvoicesListView } from './InvoicesListView';
import { SecurityAlertsView } from './SecurityAlertsView';
import { OnboardPharmacyModal } from '../modals/OnboardPharmacyModal';
import { EditStoreModal } from './EditStoreModal';
import { StoreRemoteConsoleModal } from './StoreRemoteConsoleModal';
import { 
  getRegisteredStores, 
  shareCredentialsViaWhatsApp, 
  RegisteredStoreRecord,
  updateStoreUserLimitInRegistry,
  deleteStoreFromRegistry,
  getDeletedStoreIds,
  formatWhatsAppCredentialsMessage,
  getMasterPin,
  setMasterPin,
  toggleStoreStatusInRegistry,
  extendStoreValidityInRegistry,
  updateStorePasswordInRegistry
} from '../../utils/storeRegistry';

export const SuperAdminView: React.FC = () => {
  const { 
    superAdminLogout, 
    login, 
    launchStoreDirectly, 
    currentSession, 
    setAppRoute,
    stores,
    setStores,
    deleteStore
  } = useAuth();
  const { addToast, setActiveTab: setAppActiveTab } = usePharmacy();

  // Admin sub-navigation tabs
  const [adminTab, setAdminTab] = useState<'stores' | 'security' | 'live-feed' | 'leaderboard' | 'invoices'>('stores');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [recentBillsStore, setRecentBillsStore] = useState<StoreWorkspace | null>(null);

  const [overview, setOverview] = useState<SuperAdminOverview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expiring_soon' | 'deactivated' | 'expired'>('all');

  // Modals & Action States
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState<boolean>(false);
  const [editingPermissionsStore, setEditingPermissionsStore] = useState<StoreWorkspace | null>(null);
  const [extendingStore, setExtendingStore] = useState<StoreWorkspace | null>(null);
  const [extendDays, setExtendDays] = useState<number>(30);
  const [extendFee, setExtendFee] = useState<number>(399);

  const [limitEditingStore, setLimitEditingStore] = useState<StoreWorkspace | null>(null);
  const [newAllowedLimit, setNewAllowedLimit] = useState<number>(1);

  const [passwordResetStore, setPasswordResetStore] = useState<StoreWorkspace | null>(null);
  const [newStorePassword, setNewStorePassword] = useState<string>('');
  const [showNewStorePassword, setShowNewStorePassword] = useState<boolean>(false);

  const [deleteConfirmStore, setDeleteConfirmStore] = useState<StoreWorkspace | null>(null);

  // Deep Remote Console Modal state
  const [remoteConsoleStoreId, setRemoteConsoleStoreId] = useState<string | null>(null);

  // Master PIN settings modal
  const [isPinSettingsOpen, setIsPinSettingsOpen] = useState<boolean>(false);
  const [currentMasterPin, setCurrentMasterPin] = useState<string>('');
  const [newMasterPinInput, setNewMasterPinInput] = useState<string>('');
  const [showMasterPin, setShowMasterPin] = useState<boolean>(false);

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedStoreId, setCopiedStoreId] = useState<string | null>(null);

  // Link copy states
  const [copiedChemistLink, setCopiedChemistLink] = useState<boolean>(false);
  const [copiedAdminLink, setCopiedAdminLink] = useState<boolean>(false);

  const togglePasswordReveal = (storeId: string) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [storeId]: !prev[storeId]
    }));
  };

  const getStoreRegisteredData = (storeId: string): RegisteredStoreRecord | undefined => {
    return getRegisteredStores().find(s => s.storeId === storeId);
  };

  const handleCopyChemistLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://pharmpulse.store';
    const path = typeof window !== 'undefined' ? window.location.pathname : '/';
    const link = `${origin}${path}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
      setCopiedChemistLink(true);
      addToast({
        type: 'success',
        title: 'Chemist Link Copied',
        message: 'Chemist store login link copied to clipboard.'
      });
      setTimeout(() => setCopiedChemistLink(false), 2500);
    }
  };

  const handleCopyAdminLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://pharmpulse.store';
    const path = typeof window !== 'undefined' ? window.location.pathname : '/';
    const link = `${origin}${path}?admin=true`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
      setCopiedAdminLink(true);
      addToast({
        type: 'success',
        title: 'Master Admin Link Copied',
        message: 'Confidential Super Admin URL with ?admin=true parameter copied.'
      });
      setTimeout(() => setCopiedAdminLink(false), 2500);
    }
  };

  const handleShareWhatsApp = (store: StoreWorkspace) => {
    const regRecord = getStoreRegisteredData(store.storeId);
    const fullStore: RegisteredStoreRecord = {
      ...store,
      initialPassword: regRecord?.initialPassword || regRecord?.password || (store.storeId === 'STORE-APEX01' ? 'apex123' : store.storeId === 'STORE-SANJ02' ? 'password123' : 'store123')
    };
    shareCredentialsViaWhatsApp(fullStore);
  };

  const handleCopyCredentials = (store: StoreWorkspace) => {
    const regRecord = getStoreRegisteredData(store.storeId);
    const fullStore: RegisteredStoreRecord = {
      ...store,
      initialPassword: regRecord?.initialPassword || regRecord?.password || (store.storeId === 'STORE-APEX01' ? 'apex123' : store.storeId === 'STORE-SANJ02' ? 'password123' : 'store123')
    };
    const msg = formatWhatsAppCredentialsMessage(fullStore);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(msg);
      setCopiedStoreId(store.storeId);
      addToast({
        type: 'success',
        title: 'Credentials Copied',
        message: `WhatsApp onboarding invite copied for ${store.storeName}`
      });
      setTimeout(() => setCopiedStoreId(null), 2500);
    }
  };

  // Fetch overview from backend
  const fetchOverview = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/overview');
      if (res.ok) {
        const json = await res.json();
        setOverview(json.overview);
      }
    } catch (e) {
      console.error('Failed to load super admin overview', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    setCurrentMasterPin(getMasterPin());

    const handleStoresChange = () => {
      fetchOverview();
    };

    window.addEventListener('pharmpulse_stores_updated', handleStoresChange);
    window.addEventListener('pharmpulse_store_deleted', handleStoresChange);

    return () => {
      window.removeEventListener('pharmpulse_stores_updated', handleStoresChange);
      window.removeEventListener('pharmpulse_store_deleted', handleStoresChange);
    };
  }, []);

  // Helper: calculate days remaining until expiry
  const getDaysRemaining = (expiryDateStr?: string): number => {
    if (!expiryDateStr) return 999;
    const exp = new Date(expiryDateStr);
    if (isNaN(exp.getTime())) return 999;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    exp.setHours(0, 0, 0, 0);
    const diffTime = exp.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // 1-Click Activate / Deactivate Store Account
  const handleToggleStoreStatus = async (store: StoreWorkspace) => {
    const newStatus = store.status === 'active' ? 'deactivated' : 'active';
    setActionLoadingId(store.storeId);

    try {
      // 1. Sync to backend
      const res = await fetch(`/api/admin/stores/${store.storeId}/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      // 2. Sync to local registry
      toggleStoreStatusInRegistry(store.storeId, newStatus);

      const data = await res.json();
      if (res.ok && data.success) {
        setOverview(data.overview);
        addToast({
          type: newStatus === 'active' ? 'success' : 'warning',
          title: `Store ${newStatus === 'active' ? 'Activated' : 'Deactivated / Suspended'}`,
          message: `${store.storeName} is now ${newStatus.toUpperCase()}`
        });
      } else {
        fetchOverview();
        addToast({
          type: 'info',
          title: 'Status Updated',
          message: `Store ${store.storeName} status changed to ${newStatus}`
        });
      }
    } catch (e) {
      toggleStoreStatusInRegistry(store.storeId, newStatus);
      fetchOverview();
      addToast({
        type: 'info',
        title: 'Status Updated (Local)',
        message: `${store.storeName} status updated.`
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Permanently Delete Store Workspace & Account
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmStore) return;
    const store = deleteConfirmStore;
    const cleanId = (store.storeId || store.id).trim();
    setActionLoadingId(`delete-${cleanId}`);

    try {
      // 1. Instant execution: removes from localStorage ('pharmpulse_stores'), updates reactive stores array (-1 badge), forces immediate session revocation if chemist is logged in
      await deleteStore(cleanId);

      setOverview(prev => {
        if (!prev) return null;
        const remaining = (prev.stores || []).filter(s => (s.storeId || s.id).toLowerCase() !== cleanId.toLowerCase());
        return {
          ...prev,
          totalStores: remaining.length,
          stores: remaining
        };
      });

      addToast({
        type: 'info',
        title: 'Store Permanently Deleted',
        message: `Store ${store.storeName} (${cleanId}) and its workspace data have been deleted.`
      });
      setDeleteConfirmStore(null);
    } catch (e) {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: 'Could not delete store.'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Extend Subscription
  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendingStore) return;

    setActionLoadingId(extendingStore.storeId);
    try {
      const res = await fetch(`/api/admin/stores/${extendingStore.storeId}/extend-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          daysToAdd: extendDays,
          feeCollected: extendFee
        })
      });

      extendStoreValidityInRegistry(extendingStore.storeId, extendDays, extendFee);

      const data = await res.json();
      if (res.ok && data.success) {
        setOverview(data.overview);
      } else {
        fetchOverview();
      }
      addToast({
        type: 'success',
        title: 'Validity Extended',
        message: `${extendingStore.storeName} validity extended by +${extendDays} days. Revenue updated.`
      });
      setExtendingStore(null);
    } catch (e) {
      extendStoreValidityInRegistry(extendingStore.storeId, extendDays, extendFee);
      fetchOverview();
      addToast({
        type: 'success',
        title: 'Validity Extended (Local)',
        message: `${extendingStore.storeName} validity extended.`
      });
      setExtendingStore(null);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick 1-Click Validity Extender (+7d, +30d, +365d)
  const handleQuickExtend = async (store: StoreWorkspace, days: number, fee: number) => {
    setActionLoadingId(`extend-${store.storeId}`);
    try {
      await fetch(`/api/admin/stores/${store.storeId}/extend-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysToAdd: days, feeCollected: fee })
      });
      extendStoreValidityInRegistry(store.storeId, days, fee);
      fetchOverview();
      addToast({
        type: 'success',
        title: `+${days} Days Added!`,
        message: `${store.storeName} validity extended by ${days} days.`
      });
    } catch (e) {
      extendStoreValidityInRegistry(store.storeId, days, fee);
      fetchOverview();
      addToast({
        type: 'success',
        title: `+${days} Days Added!`,
        message: `${store.storeName} validity extended.`
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Save Reset Password
  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordResetStore) return;
    const cleanPass = newStorePassword.trim();
    if (!cleanPass) {
      addToast({ type: 'warning', title: 'Password Required', message: 'Please enter a valid password.' });
      return;
    }

    setActionLoadingId(`pass-${passwordResetStore.storeId}`);
    try {
      await fetch(`/api/admin/stores/${passwordResetStore.storeId}/update-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: cleanPass })
      });
      updateStorePasswordInRegistry(passwordResetStore.storeId, cleanPass);
      fetchOverview();
      addToast({
        type: 'success',
        title: 'Password Reset Successfully',
        message: `New password assigned for ${passwordResetStore.storeName}`
      });
      setPasswordResetStore(null);
      setNewStorePassword('');
    } catch (e) {
      updateStorePasswordInRegistry(passwordResetStore.storeId, cleanPass);
      fetchOverview();
      addToast({
        type: 'success',
        title: 'Password Reset (Local)',
        message: `New password saved for ${passwordResetStore.storeName}`
      });
      setPasswordResetStore(null);
      setNewStorePassword('');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Update Allowed User / Counter Limit
  const handleSaveUserLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!limitEditingStore) return;

    setActionLoadingId(`limit-${limitEditingStore.storeId}`);
    try {
      const limitVal = Number(newAllowedLimit) >= 0 ? Number(newAllowedLimit) : 1;
      const res = await fetch(`/api/admin/stores/${limitEditingStore.storeId}/update-user-limit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedUserLimit: limitVal })
      });

      updateStoreUserLimitInRegistry(limitEditingStore.storeId, limitVal);

      const data = await res.json();
      if (res.ok && data.success) {
        setOverview(data.overview);
      } else {
        fetchOverview();
      }
      addToast({
        type: 'success',
        title: 'Counter Limit Updated',
        message: `${limitEditingStore.storeName} licensing cap set to ${limitVal === 0 ? 'Unlimited' : `${limitVal} Active Counter(s)`}.`
      });
      setLimitEditingStore(null);
    } catch (e) {
      const limitVal = Number(newAllowedLimit) >= 0 ? Number(newAllowedLimit) : 1;
      updateStoreUserLimitInRegistry(limitEditingStore.storeId, limitVal);
      fetchOverview();
      addToast({
        type: 'success',
        title: 'Limit Updated (Local)',
        message: `${limitEditingStore.storeName} limit updated.`
      });
      setLimitEditingStore(null);
    } finally {
      setActionLoadingId(null);
    }
  };

  // 1-Click Launch/Inspect Store POS Workspace
  const handleOpenStoreWorkspace = async (store: StoreWorkspace) => {
    const res = await launchStoreDirectly(store);
    if (res.success) {
      setRemoteConsoleStoreId(null);
      addToast({
        type: 'success',
        title: 'POS Terminal Launched',
        message: `Now viewing live billing POS & inventory for ${store.storeName}`
      });
      setAppActiveTab('pos');
    } else {
      addToast({
        type: 'error',
        title: 'Launch Failed',
        message: res.error || `Could not open workspace for ${store.storeName}`
      });
    }
  };

  // Save Master PIN Change
  const handleSaveMasterPin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = newMasterPinInput.trim();
    if (!cleanPin || cleanPin.length < 3) {
      addToast({ type: 'warning', title: 'Invalid PIN', message: 'Master PIN must be at least 3 characters long.' });
      return;
    }
    setMasterPin(cleanPin);
    setCurrentMasterPin(cleanPin);
    setIsPinSettingsOpen(false);
    setNewMasterPinInput('');
    addToast({
      type: 'success',
      title: 'Master PIN Updated',
      message: `New Master Admin Security PIN is now active.`
    });
  };

  // KPI Calculations across all stores (Combined server overview + reactive persistent stores)
  const allStoresList: StoreWorkspace[] = useMemo(() => {
    const deletedIds = getDeletedStoreIds();
    const map = new Map<string, StoreWorkspace>();

    // 1. Add overview stores if not deleted
    if (overview?.stores && Array.isArray(overview.stores)) {
      overview.stores.forEach(s => {
        const sid = (s.storeId || s.id || '').trim().toLowerCase();
        if (sid && !deletedIds.has(sid)) {
          map.set(sid, s);
        }
      });
    }

    // 2. Add or merge with reactive persistent stores
    if (stores && Array.isArray(stores)) {
      stores.forEach(s => {
        const sid = (s.storeId || s.id || '').trim().toLowerCase();
        if (sid && !deletedIds.has(sid)) {
          const existing = map.get(sid);
          const rawStatus = (s.status || 'ACTIVE').toUpperCase();
          const normalizedStatus = (rawStatus === 'DEACTIVATED' || rawStatus === 'SUSPENDED') 
            ? 'SUSPENDED' 
            : rawStatus === 'EXPIRED' 
            ? 'EXPIRED' 
            : 'ACTIVE';

          const storeId = (s.storeId || s.id || '').toUpperCase();
          const name = s.name || s.storeName || 'Medical Store';
          const ownerEmail = s.ownerEmail || (existing as any)?.ownerEmail || `${storeId.toLowerCase()}@pharmpulse.store`;
          const phone = s.phone || s.ownerPhone || (existing as any)?.phone || (existing as any)?.ownerPhone || '9876543210';
          const dlNumber = s.dlNumber || (existing as any)?.dlNumber || 'DL-20B/3891 & 21B/3892';

          const salesHistory = Array.isArray(s.salesHistory) && s.salesHistory.length > 0 
            ? s.salesHistory 
            : (Array.isArray((existing as any)?.salesHistory) ? (existing as any).salesHistory : []);

          const todayStr = new Date().toISOString().split('T')[0];
          const todaysBills = salesHistory.filter((b: any) => b.date === todayStr);

          const calculatedDailyTotal = todaysBills.length > 0 
            ? todaysBills.reduce((acc: number, b: any) => acc + (Number(b.amount) || 0), 0)
            : (s.dailySalesTotal !== undefined ? Number(s.dailySalesTotal) : ((existing as any)?.dailySalesTotal || 0));

          const calculatedTotalCount = todaysBills.length > 0 
            ? todaysBills.length 
            : (s.totalSalesCount !== undefined ? Number(s.totalSalesCount) : ((existing as any)?.totalSalesCount || 0));

          map.set(sid, {
            ...existing,
            ...s,
            id: storeId,
            storeId,
            name,
            storeName: name,
            ownerEmail,
            phone,
            ownerPhone: phone,
            dlNumber,
            status: normalizedStatus,
            dailySalesTotal: Math.round(calculatedDailyTotal * 100) / 100,
            totalSalesCount: calculatedTotalCount,
            salesHistory,
            subscriptionExpiryDate: s.subscriptionExpiryDate || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0]
          } as StoreWorkspace);
        }
      });
    }

    return Array.from(map.values());
  }, [overview?.stores, stores]);
  
  const kpiMetrics = useMemo(() => {
    const totalStores = allStoresList.length;
    const activeSubs = allStoresList.filter(s => {
      const days = getDaysRemaining(s.subscriptionExpiryDate);
      const isAct = s.status === 'ACTIVE' || s.status === 'active';
      return isAct && days >= 0;
    }).length;

    const expiringSoon = allStoresList.filter(s => {
      const days = getDaysRemaining(s.subscriptionExpiryDate);
      return days >= 0 && days <= 3;
    }).length;

    const suspended = allStoresList.filter(s => {
      return s.status === 'SUSPENDED' || s.status === 'deactivated';
    }).length;

    // Total Fleet Daily Sales (₹)
    const fleetDailySalesTotal = allStoresList.reduce((acc, curr) => acc + (Number(curr.dailySalesTotal) || 0), 0);
    // Total Fleet Invoices Processed Today
    const fleetDailySalesCount = allStoresList.reduce((acc, curr) => acc + (Number(curr.totalSalesCount) || 0), 0);

    // Monthly SaaS Revenue in INR (MRR)
    const monthlyRevenue = allStoresList.reduce((acc, curr) => {
      if (curr.subscriptionPlan === 'monthly_399' || curr.subscriptionPlan === 'starter_299_mo') {
        return acc + (curr.subscriptionPrice || 399);
      } else if (curr.subscriptionPlan === 'quarterly_999') {
        return acc + Math.round((curr.subscriptionPrice || 999) / 3);
      } else if (curr.subscriptionPlan === 'yearly_3999' || curr.subscriptionPlan === 'pro_1999_yr' || curr.subscriptionPlan === 'enterprise_2999_yr') {
        return acc + Math.round((curr.subscriptionPrice || 3999) / 12);
      }
      return acc + (curr.subscriptionPrice ? Math.round(curr.subscriptionPrice / 12) : 333);
    }, 0);

    return {
      totalStores,
      activeSubs,
      expiringSoon,
      suspended,
      fleetDailySalesTotal: Math.round(fleetDailySalesTotal * 100) / 100,
      fleetDailySalesCount,
      monthlyRevenue
    };
  }, [allStoresList]);

  // Filtered stores
  const filteredStores = allStoresList.filter(store => {
    if (!store) return false;
    const q = (searchTerm || '').toLowerCase().trim();
    const daysLeft = getDaysRemaining(store.subscriptionExpiryDate);

    const matchesSearch = !q ||
      (store.storeName || '').toLowerCase().includes(q) ||
      (store.storeId || '').toLowerCase().includes(q) ||
      (store.ownerPhone || '').includes(q) ||
      (store.dlNumber || '').toLowerCase().includes(q) ||
      (store.gstin || '').toLowerCase().includes(q);

    let matchesStatus = true;
    if (statusFilter === 'active') {
      matchesStatus = store.status === 'active' && daysLeft >= 0;
    } else if (statusFilter === 'expiring_soon') {
      matchesStatus = daysLeft >= 0 && daysLeft <= 3;
    } else if (statusFilter === 'deactivated') {
      matchesStatus = store.status === 'deactivated';
    } else if (statusFilter === 'expired') {
      matchesStatus = daysLeft < 0;
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <div id="super-admin-command-hub" className="space-y-6 pb-16">
      
      {/* SaaS Admin Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-2xl border border-purple-800/50 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">PharmPulse SaaS Super Admin Hub</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/30 text-purple-200 border border-purple-400/30 uppercase tracking-wider">
                  MASTER CONTROLLER
                </span>
              </div>
              <p className="text-xs sm:text-sm text-purple-200 mt-1">
                Multi-Tenant Cloud Pharmacy Fleet • Master Security Protected
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-y-2">
            <button
              type="button"
              onClick={() => setIsOnboardModalOpen(true)}
              id="btn-admin-create-store"
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 transition-all shadow-lg shadow-emerald-900/40 border border-emerald-300/30 cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>➕ Create New Store</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPinSettingsOpen(true)}
              className="px-3.5 py-2.5 bg-purple-800/60 hover:bg-purple-700/80 text-purple-100 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors border border-purple-500/40 cursor-pointer"
              title="Change Master Admin PIN & Access Keys"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>PIN Settings</span>
            </button>

            <button
              type="button"
              onClick={fetchOverview}
              disabled={isLoading}
              className="px-3 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Refresh live fleet overview"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => {
                superAdminLogout();
              }}
              className="px-3.5 py-2.5 bg-rose-600/90 hover:bg-rose-600 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 transition-colors shadow-md cursor-pointer border border-rose-400/40"
              title="Exit Super Admin Hub to Chemist Portal"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Exit Admin</span>
            </button>
          </div>
        </div>
      </div>

      {/* TOP 5 LIVE KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* KPI 1: Total Fleet Daily Sales (₹) */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fleet Daily Sales</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate">
              ₹{kpiMetrics.fleetDailySalesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live POS
            </span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 truncate">
            Across {kpiMetrics.activeSubs} active store counters
          </div>
        </div>

        {/* KPI 2: Invoices Processed Today */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-blue-200 dark:border-blue-900/50 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Invoices Today</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
              {kpiMetrics.fleetDailySalesCount}
            </div>
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
              Bills Today
            </span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 truncate">
            Total counter bills processed
          </div>
        </div>

        {/* KPI 3: Total Active Stores */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-purple-200 dark:border-purple-900/50 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Stores</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-black text-purple-700 dark:text-purple-300">
              {kpiMetrics.activeSubs} <span className="text-sm font-semibold text-slate-400">/ {kpiMetrics.totalStores}</span>
            </div>
            <span className="text-[10px] font-black text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full">
              Fleet Active
            </span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 truncate">
            Licensed & compliant pharmacies
          </div>
        </div>

        {/* KPI 4: Monthly SaaS Recurring Revenue (MRR) */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Monthly SaaS MRR</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div className="text-xl sm:text-2xl font-black text-indigo-700 dark:text-indigo-300 truncate">
              ₹{kpiMetrics.monthlyRevenue.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full">
              SaaS MRR
            </span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 truncate">
            Recurring platform billing
          </div>
        </div>

        {/* KPI 5: License Alerts & Health */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">License Alerts</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${kpiMetrics.expiringSoon > 0 ? 'bg-amber-100 text-amber-600 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div className={`text-2xl sm:text-3xl font-black ${kpiMetrics.expiringSoon > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
              {kpiMetrics.expiringSoon + kpiMetrics.suspended}
            </div>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${kpiMetrics.expiringSoon > 0 ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
              {kpiMetrics.suspended > 0 ? `${kpiMetrics.suspended} Suspended` : 'Good Standing'}
            </span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 truncate">
            {kpiMetrics.expiringSoon} Expiring ≤3d · {kpiMetrics.suspended} Locked
          </div>
        </div>
      </div>

      {/* QUICK ACCESS & DIRECT LINKS CARD */}
      <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-4 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <span>Quick Chemist & Admin Access Links</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Chemist screen remains 100% clean (Store ID + Password). Admin hub triggered via 5 rapid taps on logo or Master PIN.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyChemistLink}
            className="py-2 px-3 bg-teal-600/90 hover:bg-teal-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            {copiedChemistLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedChemistLink ? 'Chemist Link Copied!' : '📋 Copy Chemist Login Link'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyAdminLink}
            className="py-2 px-3 bg-purple-600/90 hover:bg-purple-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            {copiedAdminLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedAdminLink ? 'Admin Link Copied!' : '📋 Copy Secret Admin Link'}</span>
          </button>
        </div>
      </div>

      {/* SUPER ADMIN MAIN TAB CONTROLS */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setAdminTab('stores')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            adminTab === 'stores'
              ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4 text-purple-600" />
          <span>Stores & Licenses</span>
          <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
            {allStoresList.length}
          </span>
        </button>

        <button
          onClick={() => setAdminTab('security')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            adminTab === 'security'
              ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          <span>Security & Device Alerts</span>
          <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
            Policy
          </span>
        </button>

        <button
          onClick={() => setAdminTab('live-feed')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            adminTab === 'live-feed'
              ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <PackageCheck className="w-4 h-4 text-teal-600" />
          <span>Live Sold Medicines Feed</span>
        </button>

        <button
          onClick={() => setAdminTab('leaderboard')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            adminTab === 'leaderboard'
              ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-600" />
          <span>Sales Leaderboard</span>
        </button>

        <button
          onClick={() => setAdminTab('invoices')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            adminTab === 'invoices'
              ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4 text-blue-600" />
          <span>Thermal Bill Audit</span>
        </button>
      </div>

      {/* CONDITIONAL CONTENT BASED ON SELECTED ADMIN TAB */}
      {adminTab === 'security' && (
        <SecurityAlertsView 
          stores={allStoresList} 
          onRefreshOverview={fetchOverview} 
        />
      )}

      {adminTab === 'live-feed' && (
        <LiveSoldFeed />
      )}

      {adminTab === 'leaderboard' && (
        <SalesLeaderboard />
      )}

      {adminTab === 'invoices' && (
        <InvoicesListView />
      )}

      {adminTab === 'stores' && (
        <div className="space-y-4">
          
          {/* FILTER & QUICK SEARCH BAR */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Store ID, Pharmacy Name, Chemist Email, Phone, or DL Number..."
                className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 dark:text-white font-medium"
              />
            </div>

            {/* View Mode Switcher & Status Filter Chips */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Cards vs Table Toggle */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Store Cards Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Dense Table View"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Table</span>
                </button>
              </div>

              {/* Status Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  All ({allStoresList.length})
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'active'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                  }`}
                >
                  Active ({kpiMetrics.activeSubs})
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('expiring_soon')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'expiring_soon'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                  }`}
                >
                  Expiring ≤3 Days ({kpiMetrics.expiringSoon})
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('deactivated')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'deactivated'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                  }`}
                >
                  Suspended ({kpiMetrics.suspended})
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('expired')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'expired'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  Expired
                </button>
              </div>
            </div>
          </div>

          {/* VIEW MODE 1: STORE CARDS GRID */}
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredStores.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                  No pharmacy store accounts found matching your filter or search query.
                </div>
              ) : (
                filteredStores.map(store => {
                  const daysLeft = getDaysRemaining(store.subscriptionExpiryDate);
                  const isExpiringSoon = daysLeft >= 0 && daysLeft <= 3;
                  const isExpired = daysLeft < 0;
                  const regData = getStoreRegisteredData(store.storeId);
                  const currentPass = regData?.initialPassword || regData?.password || store.password || (store.storeId === 'STORE-APEX01' ? 'apex123' : store.storeId === 'STORE-SANJ02' ? 'password123' : 'store123');
                  const isPassRevealed = revealedPasswords[store.storeId];
                  const rawStatus = (store.status || 'ACTIVE').toUpperCase();
                  const isSuspended = rawStatus === 'SUSPENDED' || rawStatus === 'DEACTIVATED';
                  const isStoreActive = !isSuspended && !isExpired;

                  return (
                    <div 
                      key={store.storeId} 
                      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4 relative group"
                    >
                      {/* Top Header: ID Badge, Name & Status */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-[11px] font-black bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800">
                                {store.storeId}
                              </span>
                              {currentSession?.storeId === store.storeId && (
                                <span className="px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-[9px] font-black">
                                  CURRENT SESSION
                                </span>
                              )}
                            </div>
                            <h4 
                              onClick={() => setRemoteConsoleStoreId(store.storeId)}
                              className="font-black text-base text-slate-900 dark:text-white mt-1.5 truncate cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                              title="Open Store Console"
                            >
                              {store.storeName || store.name}
                            </h4>
                          </div>

                          {/* Status Pill */}
                          <div className="shrink-0">
                            {isSuspended ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                                <span>SUSPENDED</span>
                              </span>
                            ) : isExpired ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                <span>EXPIRED</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span>ACTIVE</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Chemist Contact & Compliance Info */}
                        <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                          {/* Owner Email */}
                          <div className="flex items-center space-x-2 truncate">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-medium truncate" title={store.ownerEmail}>
                              {store.ownerEmail || `${store.storeId.toLowerCase()}@pharmpulse.store`}
                            </span>
                          </div>

                          {/* Owner Phone */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                +91 {store.ownerPhone || store.phone}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">
                              {store.ownerName}
                            </span>
                          </div>

                          {/* Drug License Number */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Drug License</span>
                            <span className="font-mono text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                              {store.dlNumber || 'DL-20B/3891 & 21B/3892'}
                            </span>
                          </div>
                        </div>

                        {/* TODAY'S COUNTER SALES & INVOICES (LIVE POS ANALYTICS) */}
                        <div className="mt-3 bg-gradient-to-br from-emerald-50/90 to-teal-50/70 dark:from-emerald-950/30 dark:to-teal-950/20 p-3 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/50">
                          <div className="flex items-center justify-between">
                            <div className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                              <Activity className="w-3 h-3 text-emerald-600" />
                              <span>Today's Counter Sales</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setRecentBillsStore(store)}
                              className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 flex items-center gap-0.5 underline cursor-pointer"
                            >
                              <Receipt className="w-3 h-3" />
                              <span>Recent Bills</span>
                            </button>
                          </div>
                          
                          <div className="mt-1.5 flex items-baseline justify-between">
                            <div className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                              ₹{(store.dailySalesTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs font-black text-emerald-800 dark:text-emerald-200 bg-white/80 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-700">
                              {store.totalSalesCount || 0} Invoices Today
                            </div>
                          </div>

                          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                            <span>SaaS Plan: {store.subscriptionPlan === 'yearly_3999' ? 'Yearly (₹3,999)' : store.subscriptionPlan || 'Monthly'}</span>
                            <span className={isExpiringSoon ? 'text-amber-600 font-bold' : ''}>
                              {daysLeft} days left
                            </span>
                          </div>
                        </div>

                        {/* Credentials Quick Bar */}
                        <div className="mt-2.5 flex items-center justify-between px-1 text-xs">
                          <div className="flex items-center space-x-1 font-mono text-[11px] text-slate-500">
                            <span>Pass:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {isPassRevealed ? currentPass : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordReveal(store.storeId)}
                              className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              {isPassRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleShareWhatsApp(store)}
                              className="p-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 transition-colors cursor-pointer"
                              title="WhatsApp Credentials"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyCredentials(store)}
                              className="p-1 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 hover:bg-purple-200 transition-colors cursor-pointer"
                              title="Copy Credentials"
                            >
                              {copiedStoreId === store.storeId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-purple-600" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Primary Actions */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        {/* 1-Click Launch POS action */}
                        <button
                          type="button"
                          onClick={() => handleOpenStoreWorkspace(store)}
                          className="flex-1 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-black flex items-center justify-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                          title="1-Click Launch POS Workspace"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Launch POS</span>
                        </button>

                        {/* Recent Bills Modal Trigger */}
                        <button
                          type="button"
                          onClick={() => setRecentBillsStore(store)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black flex items-center space-x-1 transition-colors cursor-pointer"
                          title="View Store Invoices & Bills"
                        >
                          <Receipt className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <span>Bills</span>
                        </button>

                        {/* Console */}
                        <button
                          type="button"
                          onClick={() => setRemoteConsoleStoreId(store.storeId)}
                          className="p-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 rounded-xl transition-colors cursor-pointer border border-purple-200 dark:border-purple-800"
                          title="Remote Store Console"
                        >
                          <Store className="w-3.5 h-3.5" />
                        </button>

                        {/* Suspend / Reactivate */}
                        <button
                          type="button"
                          onClick={() => handleToggleStoreStatus(store)}
                          disabled={actionLoadingId === store.storeId}
                          className={`p-2 rounded-xl transition-colors cursor-pointer ${
                            isStoreActive
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 dark:border-amber-800'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                          title={isStoreActive ? 'Suspend Store' : 'Activate Store'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* VIEW MODE 2: DETAILED FLEET TABLE */
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-black text-[11px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Store Profile</th>
                      <th className="py-3.5 px-4">Owner, Email & DL</th>
                      <th className="py-3.5 px-4">Today's POS Sales</th>
                      <th className="py-3.5 px-4">Login Password</th>
                      <th className="py-3.5 px-4">SaaS Plan & Revenue</th>
                      <th className="py-3.5 px-4">Counter Limit</th>
                      <th className="py-3.5 px-4">Subscription Validity</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredStores.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-slate-400 font-medium">
                          No pharmacy store accounts found matching your filter or search query.
                        </td>
                      </tr>
                    ) : (
                      filteredStores.map(store => {
                        const daysLeft = getDaysRemaining(store.subscriptionExpiryDate);
                        const isExpiringSoon = daysLeft >= 0 && daysLeft <= 3;
                        const isExpired = daysLeft < 0;
                        const regData = getStoreRegisteredData(store.storeId);
                        const currentPass = regData?.initialPassword || regData?.password || store.password || (store.storeId === 'STORE-APEX01' ? 'apex123' : store.storeId === 'STORE-SANJ02' ? 'password123' : 'store123');
                        const isPassRevealed = revealedPasswords[store.storeId];
                        const rawStatus = (store.status || 'ACTIVE').toUpperCase();
                        const isSuspended = rawStatus === 'SUSPENDED' || rawStatus === 'DEACTIVATED';
                        const isStoreActive = !isSuspended && !isExpired;

                        return (
                          <tr key={store.storeId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                            
                            {/* Store Details */}
                            <td className="py-4 px-4">
                              <div 
                                onClick={() => setRemoteConsoleStoreId(store.storeId)}
                                className="group cursor-pointer"
                                title="Click to open Deep Store Master Remote Console"
                              >
                                <div className="font-black text-slate-900 dark:text-white flex items-center space-x-1.5 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                  <span>{store.storeName}</span>
                                  <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-black">
                                    🖥️ Console
                                  </span>
                                  {currentSession?.storeId === store.storeId && (
                                    <span className="px-1.5 py-0.2 rounded bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-[9px] font-black">
                                      ACTIVE VIEW
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs font-mono font-black text-purple-700 dark:text-purple-400 mt-0.5 flex items-center space-x-1">
                                  <span>{store.storeId}</span>
                                  <span className="text-[9px] text-slate-400 font-sans font-normal">(click to manage)</span>
                                </div>
                                <div className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5">
                                  {store.address || 'Standard Medical Hub'}
                                </div>
                              </div>
                            </td>

                            {/* Owner, Email & DL Number */}
                            <td className="py-4 px-4">
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                {store.ownerName}
                              </div>
                              <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[180px]" title={store.ownerEmail}>
                                {store.ownerEmail || `${store.storeId.toLowerCase()}@pharmpulse.store`}
                              </div>
                              <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                                Ph: +91 {store.ownerPhone}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                DL: {store.dlNumber}
                              </div>
                            </td>

                            {/* Today's POS Sales */}
                            <td className="py-4 px-4">
                              <div className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                ₹{(store.dailySalesTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="text-[10px] text-slate-500 font-semibold">
                                {store.totalSalesCount || 0} bills today
                              </div>
                              <button
                                type="button"
                                onClick={() => setRecentBillsStore(store)}
                                className="mt-1 text-[10px] font-black text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                              >
                                <Receipt className="w-3 h-3" />
                                <span>View Invoices</span>
                              </button>
                            </td>

                            {/* Credentials & WhatsApp Share */}
                            <td className="py-4 px-4">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                                  {isPassRevealed ? currentPass : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordReveal(store.storeId)}
                                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                  title={isPassRevealed ? 'Hide Password' : 'Show Password'}
                                >
                                  {isPassRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleShareWhatsApp(store)}
                                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all cursor-pointer"
                                  title={`Send WhatsApp login invite to +91 ${store.ownerPhone}`}
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  <span>WhatsApp</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleCopyCredentials(store)}
                                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer"
                                  title="Copy Store ID and Password formatted for chemist"
                                >
                                  {copiedStoreId === store.storeId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-purple-600" />}
                                  <span>Copy Info</span>
                                </button>
                              </div>
                            </td>

                            {/* SaaS Plan & Revenue */}
                            <td className="py-4 px-4">
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                {store.subscriptionPlan === 'trial_7d'
                                  ? '7-Day Free Trial'
                                  : store.subscriptionPlan === 'monthly_399' || store.subscriptionPlan === 'starter_299_mo'
                                  ? 'Monthly Plan (₹399)'
                                  : store.subscriptionPlan === 'quarterly_999'
                                  ? 'Quarterly Plan (₹999)'
                                  : 'Yearly Plan (₹3,999)'}
                              </div>
                              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-black">
                                ₹{store.subscriptionPrice?.toLocaleString('en-IN') || 3999}
                              </div>
                            </td>

                            {/* Counter / Device Limit */}
                            <td className="py-4 px-4">
                              <div className="flex items-center space-x-1.5">
                                {store.allowedUserLimit === 0 ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                                    Unlimited
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                                    {store.allowedUserLimit ?? 1} Counter(s)
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLimitEditingStore(store);
                                    setNewAllowedLimit(store.allowedUserLimit ?? 1);
                                  }}
                                  className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                                  title="Edit Allowed Counter Limit"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>

                            {/* Subscription Validity */}
                            <td className="py-4 px-4">
                              <div className="font-medium text-slate-800 dark:text-slate-200">
                                {store.subscriptionExpiryDate}
                              </div>
                              {isExpired ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 mt-1">
                                  EXPIRED
                                </span>
                              ) : isExpiringSoon ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 mt-1 animate-pulse">
                                  {daysLeft} Days Left (Urgent)
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 mt-0.5 block">
                                  {daysLeft} days left
                                </span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-4 px-4">
                              {isSuspended ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                                  SUSPENDED
                                </span>
                              ) : isExpired ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                                  EXPIRED
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                  ACTIVE
                                </span>
                              )}
                            </td>

                            {/* Actions Column */}
                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                
                                {/* Deep Remote Console */}
                                <button
                                  type="button"
                                  onClick={() => setRemoteConsoleStoreId(store.storeId)}
                                  className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[11px] font-black flex items-center space-x-1 shadow-xs transition-colors cursor-pointer"
                                  title="Open Deep Store Master Remote Console"
                                >
                                  <Store className="w-3 h-3 text-purple-200" />
                                  <span>Console</span>
                                </button>

                                {/* Quick +Validity Extender */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExtendingStore(store);
                                    setExtendDays(30);
                                    setExtendFee(399);
                                  }}
                                  className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-[11px] font-black flex items-center space-x-1 transition-colors cursor-pointer"
                                  title="Extend Store Subscription Expiry"
                                >
                                  <Zap className="w-3 h-3 text-purple-600" />
                                  <span>+Extend</span>
                                </button>

                                {/* Reset Password */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPasswordResetStore(store);
                                    setNewStorePassword(currentPass);
                                  }}
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-[11px] font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                                  title="Reset Chemist Password"
                                >
                                  <KeyRound className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                                  <span>Password</span>
                                </button>

                                {/* Suspend / Activate Toggle */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleStoreStatus(store)}
                                  disabled={actionLoadingId === store.storeId}
                                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center space-x-1 transition-all cursor-pointer ${
                                    isStoreActive
                                      ? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                  }`}
                                  title={isStoreActive ? 'Suspend Store Access' : 'Reactivate Store Account'}
                                >
                                  <Power className="w-3 h-3" />
                                  <span>{isStoreActive ? 'Suspend' : 'Activate'}</span>
                                </button>

                                {/* 1-Click Launch Store POS */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenStoreWorkspace(store)}
                                  className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-xl text-[11px] font-black flex items-center space-x-1 transition-colors cursor-pointer"
                                  title="Inspect Store POS Workspace"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Open POS</span>
                                </button>

                                {/* Delete Store */}
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmStore(store)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 rounded-xl transition-colors cursor-pointer"
                                  title="Permanently delete store workspace"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* EXTEND SUBSCRIPTION MODAL */}
      {extendingStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4" />
                </div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  Extend Validity & Renew License
                </h3>
              </div>
              <button
                onClick={() => setExtendingStore(null)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>Store: <strong className="text-slate-900 dark:text-white">{extendingStore.storeName}</strong> ({extendingStore.storeId})</div>
              <div>Current Expiry Date: <strong className="font-mono text-purple-700 dark:text-purple-300">{extendingStore.subscriptionExpiryDate}</strong></div>
            </div>

            <form onSubmit={handleExtendSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Validity Extension Package
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => { setExtendDays(7); setExtendFee(0); }}
                    className={`py-2 px-1 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                      extendDays === 7
                        ? 'border-purple-600 bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-200 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
                    }`}
                  >
                    +7 Days (Free)
                  </button>

                  <button
                    type="button"
                    onClick={() => { setExtendDays(30); setExtendFee(399); }}
                    className={`py-2 px-1 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                      extendDays === 30
                        ? 'border-purple-600 bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-200 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
                    }`}
                  >
                    +30 Days (₹399)
                  </button>

                  <button
                    type="button"
                    onClick={() => { setExtendDays(365); setExtendFee(3999); }}
                    className={`py-2 px-1 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                      extendDays === 365
                        ? 'border-purple-600 bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-200 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
                    }`}
                  >
                    +1 Year (₹3,999)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subscription Fee Collected (₹ INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={extendFee}
                    onChange={(e) => setExtendFee(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-black dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExtendingStore(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoadingId !== null}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl text-xs shadow-md cursor-pointer disabled:opacity-50"
                >
                  {actionLoadingId ? 'Updating...' : 'Confirm Validity Extension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET STORE PASSWORD MODAL */}
      {passwordResetStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  Reset Store Password / PIN
                </h3>
              </div>
              <button
                onClick={() => setPasswordResetStore(null)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <div>Store: <strong className="text-slate-900 dark:text-white">{passwordResetStore.storeName}</strong> ({passwordResetStore.storeId})</div>
              <div>Owner: <strong>{passwordResetStore.ownerName}</strong> (Ph: +91 {passwordResetStore.ownerPhone})</div>
            </div>

            <form onSubmit={handleSaveResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Store Password / PIN
                </label>
                <div className="relative">
                  <input
                    type={showNewStorePassword ? 'text' : 'password'}
                    value={newStorePassword}
                    onChange={(e) => setNewStorePassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold dark:text-white pr-16"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewStorePassword(!showNewStorePassword)}
                    className="absolute right-2 top-2 text-[11px] text-slate-500 font-bold px-2 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    {showNewStorePassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordResetStore(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoadingId !== null}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl text-xs shadow-md cursor-pointer disabled:opacity-50"
                >
                  {actionLoadingId ? 'Updating...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER / COUNTER LICENSING LIMIT MODAL */}
      {limitEditingStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    Assign Allowed Counter Limit
                  </h3>
                  <p className="text-xs text-slate-500">
                    {limitEditingStore.storeName} ({limitEditingStore.storeId})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLimitEditingStore(null)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUserLimit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Select Preset License Counter Limit
                </label>
                <div className="grid grid-cols-6 gap-1.5">
                  {[1, 2, 3, 5, 10, 0].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setNewAllowedLimit(val)}
                      className={`py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                        newAllowedLimit === val
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                      }`}
                    >
                      {val === 0 ? '∞' : `${val}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Selected Cap: </span>
                <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">
                  {newAllowedLimit === 0 ? 'Unlimited Counters' : `${newAllowedLimit} Active Counter Terminal(s)`}
                </span>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLimitEditingStore(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoadingId !== null}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs shadow-md cursor-pointer disabled:opacity-50"
                >
                  {actionLoadingId ? 'Saving...' : 'Save Counter Limit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MASTER PIN SETTINGS MODAL */}
      {isPinSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    Master Admin PIN Security
                  </h3>
                  <p className="text-xs text-slate-500">
                    Controls confidential access via 5-Tap Logo Trigger
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPinSettingsOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-purple-50/70 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800 text-xs space-y-1">
              <span className="text-purple-800 dark:text-purple-300 font-bold block">Current Active Master PIN:</span>
              <span className="font-mono text-base font-black text-purple-900 dark:text-purple-200 tracking-wider">
                {currentMasterPin}
              </span>
            </div>

            <form onSubmit={handleSaveMasterPin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Master Admin Access PIN
                </label>
                <div className="relative">
                  <input
                    type={showMasterPin ? 'text' : 'password'}
                    value={newMasterPinInput}
                    onChange={(e) => setNewMasterPinInput(e.target.value)}
                    placeholder="Enter new Master PIN"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold dark:text-white pr-16"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowMasterPin(!showMasterPin)}
                    className="absolute right-2 top-2 text-[11px] text-slate-500 font-bold px-2 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    {showMasterPin ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPinSettingsOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl text-xs shadow-md cursor-pointer"
                >
                  Update Master PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PERMANENT DELETE STORE CONFIRMATION MODAL */}
      {deleteConfirmStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-rose-200 dark:border-rose-900/60 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Permanently Delete Store?
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                  This action immediately revokes chemist access.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div>Store: <strong className="text-slate-900 dark:text-white">{deleteConfirmStore.storeName}</strong></div>
              <div>Store ID: <strong className="font-mono text-purple-600">{deleteConfirmStore.storeId}</strong></div>
              <div>Owner: <strong>{deleteConfirmStore.ownerName}</strong> (Ph: +91 {deleteConfirmStore.ownerPhone})</div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmStore(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={actionLoadingId !== null}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs shadow-md shadow-rose-900/30 cursor-pointer disabled:opacity-50"
              >
                {actionLoadingId ? 'Deleting...' : 'Confirm Delete Store'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ONBOARD NEW PHARMACY MODAL */}
      <OnboardPharmacyModal
        isOpen={isOnboardModalOpen}
        onClose={() => setIsOnboardModalOpen(false)}
        onStoreCreated={() => {
          fetchOverview();
        }}
      />

      {/* EDIT STORE PERMISSIONS MODAL */}
      <EditStoreModal
        isOpen={editingPermissionsStore !== null}
        store={editingPermissionsStore}
        onClose={() => setEditingPermissionsStore(null)}
        onSuccess={(updatedStore) => {
          fetchOverview();
          addToast({
            type: 'success',
            title: 'Permissions Updated',
            message: `Permissions updated for ${updatedStore.storeName}`
          });
        }}
      />

      {/* DEEP STORE MASTER REMOTE CONSOLE MODAL */}
      {remoteConsoleStoreId && (
        <StoreRemoteConsoleModal
          storeId={remoteConsoleStoreId}
          onClose={() => setRemoteConsoleStoreId(null)}
          onStoreUpdated={() => {
            fetchOverview();
          }}
          onStoreDeleted={() => {
            fetchOverview();
          }}
          onOpenStoreWorkspace={(store) => {
            handleOpenStoreWorkspace(store);
          }}
        />
      )}
    </div>
  );
};
