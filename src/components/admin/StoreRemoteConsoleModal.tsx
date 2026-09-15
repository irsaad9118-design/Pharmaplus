import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowLeft, 
  Store, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  KeyRound, 
  Trash2, 
  MessageSquare, 
  Copy, 
  Check, 
  ExternalLink, 
  Plus, 
  Search, 
  Edit2, 
  RefreshCw, 
  AlertTriangle, 
  TrendingUp, 
  Receipt, 
  Package, 
  BarChart3, 
  Layers, 
  Zap, 
  Clock, 
  Power, 
  Eye, 
  EyeOff, 
  Smartphone, 
  FileText, 
  CheckCircle2, 
  Printer, 
  DollarSign, 
  Building2, 
  User, 
  Phone, 
  Tag, 
  Calendar, 
  BadgeCheck,
  AlertCircle,
  TrendingDown,
  Percent,
  Sparkles,
  Bot,
  Bell,
  Sliders,
  Send
} from 'lucide-react';
import { StoreWorkspace, SubscriptionPlanKey, SUBSCRIPTION_TIERS, PlatformInvoice } from '../../types/pharmacy';
import { usePharmacy } from '../../context/PharmacyContext';
import { useAuth } from '../../context/AuthContext';
import { InvoiceInspectorModal } from './InvoiceInspectorModal';
import { 
  findStoreInRegistry, 
  saveRegisteredStore, 
  deleteStoreFromRegistry, 
  updateStorePasswordInRegistry,
  updateStorePermissionsInRegistry,
  getOrCreateRegisteredStore,
  formatWhatsAppCredentialsMessage
} from '../../utils/storeRegistry';

interface StoreRemoteConsoleModalProps {
  storeId: string;
  onClose: () => void;
  onStoreUpdated: () => void;
  onStoreDeleted?: (storeId: string) => void;
  onOpenStoreWorkspace?: (store: StoreWorkspace) => void;
}

const getDaysRemaining = (dateStr?: string): number => {
  if (!dateStr) return 0;
  const target = new Date(dateStr).getTime();
  const now = new Date().getTime();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
};

export const StoreRemoteConsoleModal: React.FC<StoreRemoteConsoleModalProps> = ({
  storeId,
  onClose,
  onStoreUpdated,
  onStoreDeleted,
  onOpenStoreWorkspace
}) => {
  const { addToast } = usePharmacy();
  const { login, launchStoreDirectly, deleteStore } = useAuth();

  // Tab State
  const [activeTab, setActiveTab] = useState<'controls' | 'inventory' | 'sales' | 'share' | 'analytics' | 'devices'>('controls');

  // Loading & Guaranteed Store Data State
  const initialStore = getOrCreateRegisteredStore(storeId);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [storeData, setStoreData] = useState<StoreWorkspace>(initialStore);
  const [inventoryList, setInventoryList] = useState<any[]>(initialStore.inventory || []);
  const [transactionsList, setTransactionsList] = useState<any[]>(initialStore.salesHistory || []);
  const [devicesList, setDevicesList] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // Controls State
  const [isPasswordRevealed, setIsPasswordRevealed] = useState<boolean>(false);
  const [newPasswordInput, setNewPasswordInput] = useState<string>(() => {
    const regRecord = findStoreInRegistry(initialStore.storeId);
    return regRecord?.initialPassword || regRecord?.password || initialStore.password || '1234';
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState<boolean>(false);
  const [isDeletingStore, setIsDeletingStore] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [allowedLimitInput, setAllowedLimitInput] = useState<number>(
    initialStore.allowedUserLimit !== undefined ? initialStore.allowedUserLimit : 2
  );
  const [isUpdatingLimit, setIsUpdatingLimit] = useState<boolean>(false);

  // Plan & Validity State
  const [planSelect, setPlanSelect] = useState<string>(initialStore.subscriptionPlan || 'pro_1999_yr');
  const [expiryDateInput, setExpiryDateInput] = useState<string>(
    initialStore.subscriptionExpiryDate || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [isUpdatingPlan, setIsUpdatingPlan] = useState<boolean>(false);

  // WhatsApp Bot State
  const [whatsappBotEnabled, setWhatsappBotEnabled] = useState<boolean>(initialStore.whatsappBotEnabled ?? true);
  const [isUpdatingWhatsAppBot, setIsUpdatingWhatsAppBot] = useState<boolean>(false);

  // Operational Limits State
  const [dailyBillLimitInput, setDailyBillLimitInput] = useState<number>(
    initialStore.dailyBillLimit !== undefined ? initialStore.dailyBillLimit : 100
  );
  const [expiryAlertDaysInput, setExpiryAlertDaysInput] = useState<number>(
    initialStore.expiryAlertDays !== undefined ? initialStore.expiryAlertDays : 60
  );
  const [isUpdatingLimits, setIsUpdatingLimits] = useState<boolean>(false);

  // Edit Profile State
  const [editStoreName, setEditStoreName] = useState<string>(initialStore.storeName || '');
  const [editOwnerName, setEditOwnerName] = useState<string>(initialStore.ownerName || '');
  const [editOwnerPhone, setEditOwnerPhone] = useState<string>(initialStore.ownerPhone || '');
  const [editDlNumber, setEditDlNumber] = useState<string>(initialStore.dlNumber || '');
  const [editGstin, setEditGstin] = useState<string>(initialStore.gstin || '');
  const [editAddress, setEditAddress] = useState<string>(initialStore.address || '');
  const [editUpiId, setEditUpiId] = useState<string>(initialStore.upiId || '');
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);

  // Validity Extender
  const [extendDaysInput, setExtendDaysInput] = useState<number>(30);
  const [extendFeeInput, setExtendFeeInput] = useState<number>(399);
  const [isExtendingValidity, setIsExtendingValidity] = useState<boolean>(false);

  // Inventory Sub-states
  const [inventorySearch, setInventorySearch] = useState<string>('');
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'low_stock' | 'out_of_stock' | 'expiring_soon'>('all');
  const [editingMedicine, setEditingMedicine] = useState<any | null>(null);
  const [isAddMedicineOpen, setIsAddMedicineOpen] = useState<boolean>(false);
  const [newMedicineForm, setNewMedicineForm] = useState({
    brandName: '',
    genericName: '',
    saltComposition: '',
    category: 'Analgesic',
    batchNumber: '',
    expirationDate: '',
    mrp: 100,
    purchaseRate: 70,
    stockQuantity: 50,
    unit: 'Strips',
    scheduleClass: 'OTC',
    locationShelf: 'Rack A-1'
  });

  // Sales Sub-states
  const [salesSearch, setSalesSearch] = useState<string>('');
  const [inspectingInvoice, setInspectingInvoice] = useState<PlatformInvoice | null>(null);

  // Fetch Deep Store Data
  const fetchDeepData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/deep-data`);
      if (res.ok) {
        const data = await res.json();
        const merged = { ...initialStore, ...(data.store || {}) };
        setStoreData(merged);
        if (data.inventory && data.inventory.length) setInventoryList(data.inventory);
        if (data.transactions && data.transactions.length) setTransactionsList(data.transactions);
        if (data.devices) setDevicesList(data.devices);
        if (data.analytics) setAnalyticsData(data.analytics);

        // Prepopulate profile & controls form
        if (merged) {
          setEditStoreName(merged.storeName || '');
          setEditOwnerName(merged.ownerName || '');
          setEditOwnerPhone(merged.ownerPhone || '');
          setEditDlNumber(merged.dlNumber || '');
          setEditGstin(merged.gstin || '');
          setEditAddress(merged.address || '');
          setEditUpiId(merged.upiId || '');
          setAllowedLimitInput(merged.allowedUserLimit !== undefined ? merged.allowedUserLimit : 2);
          setPlanSelect(merged.subscriptionPlan || 'pro_1999_yr');
          setExpiryDateInput(
            merged.subscriptionExpiryDate || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0]
          );
          setWhatsappBotEnabled(merged.whatsappBotEnabled ?? true);
          setDailyBillLimitInput(merged.dailyBillLimit !== undefined ? merged.dailyBillLimit : 100);
          setExpiryAlertDaysInput(merged.expiryAlertDays !== undefined ? merged.expiryAlertDays : 60);

          const regRecord = findStoreInRegistry(merged.storeId);
          setNewPasswordInput(regRecord?.initialPassword || regRecord?.password || merged.password || '1234');
        }
      } else {
        // Fallback gracefully without error screen
        const fallback = getOrCreateRegisteredStore(storeId);
        setStoreData(fallback);
      }
    } catch (e) {
      console.warn('Network fallback for store deep data', e);
      const fallback = getOrCreateRegisteredStore(storeId);
      setStoreData(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (storeId) {
      fetchDeepData();
    }
  }, [storeId]);

  // Smooth Back / Navigation Handler
  const handleSmoothClose = () => {
    try {
      onStoreUpdated();
    } catch (e) {
      // ignore
    }
    onClose();
  };

  // Keyboard navigation: Escape key closes modal cleanly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSmoothClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Current active password / PIN
  const regRecord = storeData ? findStoreInRegistry(storeData.storeId) : null;
  const currentPassword = regRecord?.initialPassword || regRecord?.password || storeData?.password || '1234';

  // Toggle Store Active / Suspended
  const handleToggleStatus = async () => {
    if (!storeData) return;
    setIsTogglingStatus(true);
    const newStatus = storeData.status === 'active' || storeData.status === 'ACTIVE' ? 'deactivated' : 'active';
    try {
      const res = await fetch(`/api/admin/stores/${storeData.storeId}/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const updated: StoreWorkspace = { ...storeData, status: newStatus };
      setStoreData(updated);
      saveRegisteredStore(updated as any);
      addToast({
        type: newStatus === 'active' ? 'success' : 'warning',
        title: newStatus === 'active' ? 'Store Activated' : 'Store Suspended',
        message: `${storeData.storeName} is now ${newStatus.toUpperCase()}`
      });
      onStoreUpdated();
    } catch (e) {
      addToast({ type: 'error', title: 'Status Toggle Failed', message: 'Failed to update store status' });
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Toggle WhatsApp Bot Integration
  const handleToggleWhatsAppBot = async () => {
    if (!storeData) return;
    const nextVal = !whatsappBotEnabled;
    setWhatsappBotEnabled(nextVal);
    setIsUpdatingWhatsAppBot(true);
    try {
      const res = await fetch(`/api/admin/stores/${storeData.storeId}/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappBotEnabled: nextVal })
      });
      const updated: StoreWorkspace = { ...storeData, whatsappBotEnabled: nextVal };
      setStoreData(updated);
      saveRegisteredStore(updated as any);
      addToast({
        type: nextVal ? 'success' : 'info',
        title: nextVal ? 'WhatsApp Bot Activated' : 'WhatsApp Bot Disabled',
        message: nextVal
          ? `Automated invoice dispatch and refill reminders enabled for ${storeData.storeName}`
          : `WhatsApp automated bots paused for ${storeData.storeName}`
      });
      onStoreUpdated();
    } catch (e) {
      addToast({ type: 'error', title: 'Update Failed', message: 'Failed to toggle WhatsApp Bot' });
    } finally {
      setIsUpdatingWhatsAppBot(false);
    }
  };

  // Save Subscription Plan & Validity Date
  const handleSavePlanAndValidity = async () => {
    if (!storeData) return;
    setIsUpdatingPlan(true);
    try {
      const res = await fetch(`/api/admin/stores/${storeData.storeId}/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionPlan: planSelect,
          subscriptionExpiryDate: expiryDateInput
        })
      });
      const updated: StoreWorkspace = {
        ...storeData,
        subscriptionPlan: planSelect,
        subscriptionExpiryDate: expiryDateInput
      };
      setStoreData(updated);
      saveRegisteredStore(updated as any);
      addToast({
        type: 'success',
        title: 'Plan & Validity Saved',
        message: `Updated to ${planSelect} (Valid until ${expiryDateInput})`
      });
      onStoreUpdated();
    } catch (e) {
      addToast({ type: 'error', title: 'Update Failed', message: 'Failed to update subscription plan' });
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  // Save Daily Bill Limits & Expiry Alerts Threshold
  const handleSaveLimitsAndThreshold = async () => {
    if (!storeData) return;
    setIsUpdatingLimits(true);
    try {
      const res = await fetch(`/api/admin/stores/${storeData.storeId}/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyBillLimit: Number(dailyBillLimitInput),
          expiryAlertDays: Number(expiryAlertDaysInput)
        })
      });
      const updated: StoreWorkspace = {
        ...storeData,
        dailyBillLimit: Number(dailyBillLimitInput),
        expiryAlertDays: Number(expiryAlertDaysInput)
      };
      setStoreData(updated);
      saveRegisteredStore(updated as any);
      addToast({
        type: 'success',
        title: 'Operational Limits Saved',
        message: `Daily Bill Limit: ${Number(dailyBillLimitInput) === 0 ? 'Unlimited' : dailyBillLimitInput} bills | Expiry Alerts: ${expiryAlertDaysInput} days`
      });
      onStoreUpdated();
    } catch (e) {
      addToast({ type: 'error', title: 'Save Failed', message: 'Failed to update operational limits' });
    } finally {
      setIsUpdatingLimits(false);
    }
  };

  // Quick Random PIN Generator
  const handleQuickGeneratePin = () => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setNewPasswordInput(randomPin);
    addToast({
      type: 'info',
      title: 'New PIN Generated',
      message: `Generated PIN "${randomPin}". Click "Reset & Save PIN" to apply.`
    });
  };

  // Update Password or PIN
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeData) return;
    const cleanPass = newPasswordInput.trim();
    if (!cleanPass) {
      addToast({ type: 'warning', title: 'Empty PIN / Password', message: 'Please enter a valid PIN or password' });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await fetch(`/api/admin/stores/${storeData.storeId}/update-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: cleanPass })
      });

      updateStorePasswordInRegistry(storeData.storeId, cleanPass);
      const updated = { ...storeData, password: cleanPass };
      setStoreData(updated);
      saveRegisteredStore(updated as any);
      addToast({
        type: 'success',
        title: 'Store PIN Updated',
        message: `New login PIN "${cleanPass}" saved for ${storeData.storeName}.`
      });
      onStoreUpdated();
    } catch (e) {
      addToast({ type: 'error', title: 'Password Update Failed', message: 'Could not sync password to server' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Update Allowed Counter Limit
  const handleSaveCounterLimit = async () => {
    if (!storeData) return;
    setIsUpdatingLimit(true);
    try {
      const res = await fetch(`/api/admin/stores/${storeData.storeId}/update-user-limit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedUserLimit: allowedLimitInput })
      });
      if (res.ok) {
        setStoreData(prev => prev ? { ...prev, allowedUserLimit: allowedLimitInput } : null);
        addToast({
          type: 'success',
          title: 'Counter Limit Updated',
          message: `Allowed active devices set to ${allowedLimitInput === 0 ? 'Unlimited' : allowedLimitInput}`
        });
        onStoreUpdated();
      }
    } catch (e) {
      addToast({ type: 'error', title: 'Update Failed', message: 'Could not update device limit' });
    } finally {
      setIsUpdatingLimit(false);
    }
  };

  // Save Store Profile Details
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeData) return;
    setIsSavingProfile(true);
    try {
      const res = await fetch(`/api/admin/stores/${storeData.storeId}/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: editStoreName.trim(),
          ownerName: editOwnerName.trim(),
          ownerPhone: editOwnerPhone.trim(),
          dlNumber: editDlNumber.trim(),
          gstin: editGstin.trim(),
          address: editAddress.trim(),
          upiId: editUpiId.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setStoreData(data.store);
        addToast({
          type: 'success',
          title: 'Store Profile Saved',
          message: `Updated profile details for ${editStoreName}`
        });
        onStoreUpdated();
      }
    } catch (e) {
      addToast({ type: 'error', title: 'Save Failed', message: 'Failed to update store profile' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Extend Subscription Validity
  const handleExtendValidity = async (days: number, fee: number) => {
    if (!storeData) return;
    setIsExtendingValidity(true);
    try {
      const res = await fetch(`/api/admin/stores/${storeData.storeId}/extend-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysToAdd: days, feeCollected: fee })
      });
      if (res.ok) {
        const data = await res.json();
        setStoreData(data.store);
        addToast({
          type: 'success',
          title: 'Subscription Extended',
          message: `Validity extended by +${days} days (New Expiry: ${data.store.subscriptionExpiryDate})`
        });
        onStoreUpdated();
      }
    } catch (e) {
      addToast({ type: 'error', title: 'Extension Failed', message: 'Failed to extend subscription' });
    } finally {
      setIsExtendingValidity(false);
    }
  };

  // Delete Store Permanently
  const handleDeleteStore = async () => {
    if (!storeData) return;
    setIsDeletingStore(true);
    const targetStoreId = storeData.storeId;
    const targetStoreName = storeData.storeName;

    try {
      // 1. Instant execution: removes from localStorage ('pharmpulse_stores'), updates reactive array (-1 badge), forces immediate session revocation if chemist is logged in
      await deleteStore(targetStoreId);

      addToast({
        type: 'info',
        title: 'Store Deleted',
        message: `Store ${targetStoreName} (${targetStoreId}) was permanently removed.`
      });
      if (onStoreDeleted) {
        onStoreDeleted(targetStoreId);
      }
      onStoreUpdated();
      onClose();
    } catch (e) {
      addToast({ type: 'error', title: 'Delete Failed', message: 'Failed to delete store' });
    } finally {
      setIsDeletingStore(false);
      setShowDeleteConfirm(false);
    }
  };

  // WhatsApp Share
  const handleShareWhatsApp = () => {
    if (!storeData) return;
    const cleanPhone = (storeData.ownerPhone || '').replace(/[^0-9]/g, '');
    const appUrl = window.location.origin;
    const msg = `*Welcome to PharmPulse Medical POS & Inventory Suite!* 🏥💊\n\nYour pharmacy cloud terminal has been configured.\n\n🔑 *Store ID:* ${storeData.storeId}\n🔒 *Password/PIN:* ${currentPassword}\n🏪 *Pharmacy:* ${storeData.storeName}\n📋 *Drug License:* ${storeData.dlNumber}\n⏳ *Validity:* Active until ${storeData.subscriptionExpiryDate}\n\n🌐 *Direct Login Link:* ${appUrl}\n\n_Keep your credentials secure. For multi-counter support, contact Super Admin._`;
    const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  // Copy Credentials
  const handleCopyCredentials = () => {
    if (!storeData) return;
    const appUrl = window.location.origin;
    const text = `🏪 Pharmacy: ${storeData.storeName}\n🔑 Store ID: ${storeData.storeId}\n🔒 Password: ${currentPassword}\n📋 DL No: ${storeData.dlNumber}\n🌐 Login URL: ${appUrl}`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    addToast({
      type: 'success',
      title: 'Copied to Clipboard!',
      message: `Store ID (${storeData.storeId}) and Password copied.`
    });
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Switch POS to this Store Workspace (1-Click Instant Launch)
  const handleOpenStoreWorkspace = async () => {
    if (!storeData) return;
    if (onOpenStoreWorkspace) {
      onOpenStoreWorkspace(storeData);
      onClose();
      return;
    }

    const res = await launchStoreDirectly(storeData);
    if (res.success) {
      addToast({
        type: 'success',
        title: 'POS Terminal Launched',
        message: `Now viewing live billing POS & inventory for ${storeData.storeName}`
      });
      onClose();
    } else {
      addToast({
        type: 'error',
        title: 'Launch Failed',
        message: res.error || `Could not launch POS for ${storeData.storeName}`
      });
    }
  };

  // Add Medicine to Store Inventory
  const handleAddMedicineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeData) return;
    if (!newMedicineForm.brandName || !newMedicineForm.batchNumber) {
      addToast({ type: 'warning', title: 'Missing Fields', message: 'Medicine Name and Batch Number are required.' });
      return;
    }

    try {
      const res = await fetch(`/api/admin/stores/${storeData.storeId}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newMedicineForm,
          mrp: Number(newMedicineForm.mrp) || 100,
          purchaseRate: Number(newMedicineForm.purchaseRate) || 70,
          stockQuantity: Number(newMedicineForm.stockQuantity) || 50,
          minAlertLevel: 15
        })
      });

      if (res.ok) {
        const data = await res.json();
        setInventoryList(data.inventory);
        setIsAddMedicineOpen(false);
        setNewMedicineForm({
          brandName: '',
          genericName: '',
          saltComposition: '',
          category: 'Analgesic',
          batchNumber: '',
          expirationDate: '',
          mrp: 100,
          purchaseRate: 70,
          stockQuantity: 50,
          unit: 'Strips',
          scheduleClass: 'OTC',
          locationShelf: 'Rack A-1'
        });
        addToast({
          type: 'success',
          title: 'Medicine Added',
          message: `Added medicine to ${storeData.storeName}'s inventory`
        });
      }
    } catch (e) {
      addToast({ type: 'error', title: 'Add Failed', message: 'Failed to add medicine to store' });
    }
  };

  // Edit Medicine Item
  const handleUpdateMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeData || !editingMedicine) return;

    try {
      const res = await fetch(`/api/admin/stores/${storeData.storeId}/inventory/${editingMedicine.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingMedicine)
      });

      if (res.ok) {
        const data = await res.json();
        setInventoryList(data.inventory);
        setEditingMedicine(null);
        addToast({
          type: 'success',
          title: 'Inventory Item Updated',
          message: `Updated stock and rate for ${editingMedicine.brandName}`
        });
      }
    } catch (e) {
      addToast({ type: 'error', title: 'Update Failed', message: 'Failed to update medicine' });
    }
  };

  // Delete Medicine Item
  const handleDeleteMedicine = async (itemId: string, brandName: string) => {
    if (!storeData) return;
    if (!confirm(`Are you sure you want to remove ${brandName} from ${storeData.storeName}?`)) return;

    try {
      const res = await fetch(`/api/admin/stores/${storeData.storeId}/inventory/${itemId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const data = await res.json();
        setInventoryList(data.inventory);
        addToast({
          type: 'info',
          title: 'Medicine Removed',
          message: `Removed ${brandName} from store inventory`
        });
      }
    } catch (e) {
      addToast({ type: 'error', title: 'Delete Failed', message: 'Failed to delete medicine' });
    }
  };

  // Force Revoke Device Session
  const handleRevokeDevice = async (deviceId: string) => {
    if (!storeData) return;
    try {
      const res = await fetch(`/api/admin/stores/${storeData.storeId}/devices/${deviceId}/revoke`, {
        method: 'POST'
      });
      if (res.ok) {
        setDevicesList(prev => prev.map(d => d.deviceId === deviceId ? { ...d, status: 'revoked' } : d));
        addToast({
          type: 'info',
          title: 'Terminal Session Revoked',
          message: `Device ${deviceId} has been disconnected.`
        });
      }
    } catch (e) {
      addToast({ type: 'error', title: 'Revoke Failed', message: 'Could not disconnect device' });
    }
  };

  // Revoke All Sessions
  const handleRevokeAllSessions = async () => {
    if (!storeData) return;
    try {
      const res = await fetch(`/api/admin/stores/${storeData.storeId}/revoke-all-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revokedBy: 'Super Admin Remote Console' })
      });
      if (res.ok) {
        setDevicesList(prev => prev.map(d => ({ ...d, status: 'revoked' })));
        setStoreData(prev => prev ? { ...prev, connectedDevicesCount: 0 } : null);
        addToast({
          type: 'warning',
          title: 'All Sessions Terminated',
          message: `Forced logout applied to all devices of ${storeData.storeName}`
        });
        onStoreUpdated();
      }
    } catch (e) {
      addToast({ type: 'error', title: 'Action Failed', message: 'Could not revoke sessions' });
    }
  };

  // Filtered Inventory
  const filteredInventory = inventoryList.filter(item => {
    const q = (inventorySearch || '').toLowerCase().trim();
    const matchesSearch = !q ||
      (item.brandName || '').toLowerCase().includes(q) ||
      (item.genericName || '').toLowerCase().includes(q) ||
      (item.saltComposition || '').toLowerCase().includes(q) ||
      (item.batchNumber || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q) ||
      (item.locationShelf || '').toLowerCase().includes(q);

    const qty = Number(item.stockQuantity || 0);
    const minAlert = Number(item.minAlertLevel || item.reorderLevel || 15);
    const exp = item.expirationDate || item.expiryDate || '';
    const ninetyDays = new Date();
    ninetyDays.setDate(ninetyDays.getDate() + 90);
    const ninetyDaysStr = ninetyDays.toISOString().split('T')[0];

    let matchesFilter = true;
    if (inventoryFilter === 'low_stock') {
      matchesFilter = qty > 0 && qty <= minAlert;
    } else if (inventoryFilter === 'out_of_stock') {
      matchesFilter = qty <= 0;
    } else if (inventoryFilter === 'expiring_soon') {
      matchesFilter = !!exp && exp <= ninetyDaysStr;
    }

    return matchesSearch && matchesFilter;
  });

  // Filtered Sales Transactions
  const filteredSales = transactionsList.filter(tx => {
    const q = (salesSearch || '').toLowerCase().trim();
    if (!q) return true;
    return (
      (tx.invoiceNumber || tx.receiptNumber || tx.id || '').toLowerCase().includes(q) ||
      (tx.customerName || tx.patientName || '').toLowerCase().includes(q) ||
      (tx.customerPhone || tx.patientPhone || tx.contactNumber || '').includes(q) ||
      (tx.doctorName || tx.prescriberName || '').toLowerCase().includes(q)
    );
  });

  const daysRemaining = storeData ? getDaysRemaining(storeData.subscriptionExpiryDate) : 0;
  const isExpiringSoon = daysRemaining >= 0 && daysRemaining <= 3;
  const isExpired = daysRemaining < 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      <div className="w-full max-w-6xl h-[92vh] max-h-[900px] bg-slate-50 dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden relative">
        
        {/* TOP HEADER BAR */}
        <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 text-white p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-purple-900/50 shrink-0">
          
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleSmoothClose}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer flex items-center space-x-1.5 text-xs font-bold shrink-0"
              title="Return to store fleet table (Esc)"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">⬅️ Back to All Stores</span>
              <span className="sm:hidden">Back</span>
            </button>

            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0">
              <Store className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="text-xs text-purple-300 font-bold uppercase tracking-wider">Store Management:</span>
                <h2 className="text-base sm:text-lg font-black text-white">
                  {storeData?.storeName || initialStore.storeName || 'Pharmacy Workspace'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-purple-500/30 text-purple-200 border border-purple-400/40">
                  {storeData?.storeId || storeId}
                </span>
                {(storeData?.status === 'active' || storeData?.status === 'ACTIVE') && !isExpired && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>ACTIVE 🟢</span>
                  </span>
                )}
                {((storeData?.status as string)?.toLowerCase() !== 'active' && !isExpired) && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-400/30">
                    SUSPENDED 🔴
                  </span>
                )}
                {isExpired && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    EXPIRED ⚠️
                  </span>
                )}
              </div>
              <p className="text-xs text-purple-200/80 mt-0.5">
                Owner: <strong>{storeData?.ownerName || initialStore.ownerName || 'Licensed Chemist'}</strong> • Ph: {storeData?.ownerPhone ? (storeData.ownerPhone.startsWith('+91') ? storeData.ownerPhone : `+91 ${storeData.ownerPhone}`) : `+91 ${initialStore.ownerPhone || '9876543210'}`} • DL: {storeData?.dlNumber || initialStore.dlNumber || 'DL-20B/1802 & 21B/1803'}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <button
              type="button"
              onClick={handleOpenStoreWorkspace}
              className="px-3 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 transition-all shadow-md cursor-pointer"
              title="Launch this pharmacy's POS dispensary workspace"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Launch Live POS</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('share')}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Share credentials on WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Share Credentials</span>
            </button>

            <button
              type="button"
              onClick={handleCopyCredentials}
              className="px-3 py-2 bg-purple-800/70 hover:bg-purple-700 text-purple-100 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors border border-purple-500/30 cursor-pointer"
              title="Copy credentials"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Copied!' : 'Copy Info'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer text-sm font-bold ml-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center space-x-1 overflow-x-auto shrink-0 shadow-xs">
          
          {/* TAB 1 */}
          <button
            type="button"
            onClick={() => setActiveTab('controls')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'controls'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>⚙️ Master Controls</span>
          </button>

          {/* TAB 2 */}
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>📦 Stock & Medicine Inventory ({inventoryList.length})</span>
          </button>

          {/* TAB 3 */}
          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'sales'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>💰 Sales Record & Invoices ({transactionsList.length})</span>
          </button>

          {/* TAB 4 */}
          <button
            type="button"
            onClick={() => setActiveTab('share')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'share'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>📲 Share Credentials</span>
          </button>

          {/* SUPPLEMENTARY TABS */}
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>📊 Live Analytics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('devices')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'devices'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>🛡️ Active Terminals ({devicesList.filter(d => d.status === 'active').length})</span>
          </button>

        </div>

        {/* TAB CONTENTS (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {isLoading && !inventoryList.length && !transactionsList.length ? (
            <div className="py-24 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                Synchronizing workspace for <span className="font-mono text-purple-600">{storeData.storeName} ({storeId})</span>...
              </p>
            </div>
          ) : (
            <>
              {/* ======================================================== */}
              {/* TAB A: MASTER CONTROLS & SECURITY                       */}
              {/* ======================================================== */}
              {activeTab === 'controls' && (
                <div className="space-y-6 max-w-5xl mx-auto">
                  
                  {/* Row 1: Operational Status & WhatsApp AI Bot Integration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Status Toggle Card */}
                    <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Store Operational Status</span>
                          <Power className={`w-4 h-4 ${storeData.status === 'active' || storeData.status === 'ACTIVE' ? 'text-emerald-500' : 'text-rose-500'}`} />
                        </div>
                        <div className="mt-2 flex items-center space-x-2">
                          <span className={`text-lg font-black ${storeData.status === 'active' || storeData.status === 'ACTIVE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {storeData.status === 'active' || storeData.status === 'ACTIVE' ? 'ACTIVE & OPERATIONAL 🟢' : 'SUSPENDED / BLOCKED 🔴'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {storeData.status === 'active' || storeData.status === 'ACTIVE'
                            ? 'Pharmacists can log in, dispense medicines, and process counter sales across all terminals.' 
                            : 'All terminal sessions are locked. Staff will see an account suspended screen upon login.'}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={handleToggleStatus}
                          disabled={isTogglingStatus}
                          className={`w-full py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                            storeData.status === 'active' || storeData.status === 'ACTIVE'
                              ? 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-900/30'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{storeData.status === 'active' || storeData.status === 'ACTIVE' ? '⏸️ Suspend Store Access' : '▶️ Reactivate Store Account'}</span>
                        </button>
                      </div>
                    </div>

                    {/* WhatsApp Bot Integration Card */}
                    <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">WhatsApp Bot & Automation</span>
                          <Bot className={`w-4 h-4 ${whatsappBotEnabled ? 'text-emerald-500' : 'text-slate-400'}`} />
                        </div>
                        <div className="mt-2 flex items-center space-x-2">
                          <span className={`text-lg font-black ${whatsappBotEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                            {whatsappBotEnabled ? 'WHATSAPP BOT: ACTIVE 🟢' : 'WHATSAPP BOT: DISABLED ⏸️'}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center space-x-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                            <span className={whatsappBotEnabled ? 'text-emerald-500 font-bold' : 'text-slate-400'}>✓</span>
                            <span>Digital GST bill dispatch via WhatsApp link</span>
                          </div>
                          <div className="flex items-center space-x-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                            <span className={whatsappBotEnabled ? 'text-emerald-500 font-bold' : 'text-slate-400'}>✓</span>
                            <span>30-Day chronic patient refill reminders</span>
                          </div>
                          <div className="flex items-center space-x-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                            <span className={whatsappBotEnabled ? 'text-emerald-500 font-bold' : 'text-slate-400'}>✓</span>
                            <span>Daily stock expiry & low-inventory alerts to owner</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={handleToggleWhatsAppBot}
                          disabled={isUpdatingWhatsAppBot}
                          className={`w-full py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                            whatsappBotEnabled
                              ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-900/30'
                          }`}
                        >
                          <Bot className="w-3.5 h-3.5" />
                          <span>{whatsappBotEnabled ? 'Disable WhatsApp Bot' : 'Enable WhatsApp Bot'}</span>
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Row 2: Subscription Plan & Validity Manager */}
                  <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-bold">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-black text-sm text-slate-900 dark:text-white">
                            Subscription Plan & Validity Configuration
                          </h3>
                          <p className="text-xs text-slate-500">
                            Current Validity Expiry: <strong className="font-mono text-purple-700 dark:text-purple-300">{storeData.subscriptionExpiryDate}</strong> ({daysRemaining} days remaining)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                          isExpired 
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200' 
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200'
                        }`}>
                          {isExpired ? 'EXPIRED ⚠️' : `${daysRemaining} Days Active 🟢`}
                        </span>
                      </div>
                    </div>

                    {/* Plan and Date Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Assigned Subscription Plan
                        </label>
                        <select
                          value={planSelect}
                          onChange={(e) => setPlanSelect(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="starter_299_mo">Starter (Single Counter) - ₹299 / Month</option>
                          <option value="pro_1999_yr">Pro Pharmacy (Annual) - ₹1,999 / Year (Recommended)</option>
                          <option value="enterprise_2999_yr">Enterprise (Multi-Counter) - ₹3,999 / Year</option>
                          <option value="yearly_3999">Annual Pro Unlimited - ₹3,999 / Year</option>
                          <option value="monthly_399">Monthly Flex - ₹399 / Month</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Subscription Validity Expiry Date
                        </label>
                        <input
                          type="date"
                          value={expiryDateInput}
                          onChange={(e) => setExpiryDateInput(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold dark:text-white focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={handleSavePlanAndValidity}
                          disabled={isUpdatingPlan}
                          className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition-colors shadow-sm cursor-pointer"
                        >
                          {isUpdatingPlan ? 'Saving...' : '💾 Save Plan & Expiry Date'}
                        </button>
                      </div>
                    </div>

                    {/* Quick Extender Buttons */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                        Quick Validity Boost:
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleExtendValidity(7, 0)}
                          disabled={isExtendingValidity}
                          className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-black transition-colors cursor-pointer"
                        >
                          ⚡ +7 Days Trial
                        </button>

                        <button
                          type="button"
                          onClick={() => handleExtendValidity(30, 399)}
                          disabled={isExtendingValidity}
                          className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-black transition-colors cursor-pointer"
                        >
                          ⚡ +30 Days Renewal (₹399)
                        </button>

                        <button
                          type="button"
                          onClick={() => handleExtendValidity(90, 999)}
                          disabled={isExtendingValidity}
                          className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-black transition-colors cursor-pointer"
                        >
                          ⚡ +90 Days (₹999)
                        </button>

                        <button
                          type="button"
                          onClick={() => handleExtendValidity(365, 1999)}
                          disabled={isExtendingValidity}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer"
                        >
                          ⚡ +365 Days (₹1,999 Annual)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Daily Bill Limits & Expiry Alerts Threshold */}
                  <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold">
                          <Sliders className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-black text-sm text-slate-900 dark:text-white">
                            Daily Bill Limits & Expiry Alerts Threshold
                          </h3>
                          <p className="text-xs text-slate-500">
                            Configure store billing throttles and medicine expiration alert window
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Daily Bill Limit */}
                      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                          Daily Bill / Invoice Limit
                        </label>
                        <select
                          value={dailyBillLimitInput}
                          onChange={(e) => setDailyBillLimitInput(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold dark:text-white focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value={50}>50 Bills / Day (Basic Clinic Dispensary)</option>
                          <option value={100}>100 Bills / Day (Standard Retail - Recommended)</option>
                          <option value={250}>250 Bills / Day (High Volume Chemist)</option>
                          <option value={500}>500 Bills / Day (Supermarket / Multi-Counter)</option>
                          <option value={0}>0 (Unlimited Daily Bills)</option>
                        </select>
                        <p className="text-[11px] text-slate-500">
                          Today's Invoices: <strong>{storeData.totalSalesCount || transactionsList.length || 0}</strong> {Number(dailyBillLimitInput) > 0 ? `(Cap: ${dailyBillLimitInput})` : '(No cap)'}
                        </p>
                      </div>

                      {/* Expiry Alert Days */}
                      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                          Medicine Expiry Alert Threshold
                        </label>
                        <select
                          value={expiryAlertDaysInput}
                          onChange={(e) => setExpiryAlertDaysInput(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold dark:text-white focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value={30}>30 Days (Urgent Clearance Window)</option>
                          <option value={60}>60 Days (Standard 2-Month Buffer - Recommended)</option>
                          <option value={90}>90 Days (Quarterly Return Buffer)</option>
                          <option value={180}>180 Days (6-Month Advance Stock Review)</option>
                        </select>
                        <p className="text-[11px] text-slate-500">
                          Medicines expiring within {expiryAlertDaysInput} days are flagged on the POS dashboard with alert badges.
                        </p>
                      </div>

                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveLimitsAndThreshold}
                        disabled={isUpdatingLimits}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-colors shadow-sm cursor-pointer flex items-center space-x-1.5"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>{isUpdatingLimits ? 'Saving...' : '💾 Save Operational Limits & Thresholds'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Row 4: Store Login PIN & Credentials Reset */}
                  <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-bold">
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-black text-sm text-slate-900 dark:text-white">
                            Store Login PIN & Chemist Credentials
                          </h3>
                          <p className="text-xs text-slate-500">
                            Manage the master 4-digit PIN or password for pharmacist counter login
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const origin = typeof window !== 'undefined' ? window.location.origin : '';
                          const text = formatWhatsAppCredentialsMessage(storeData, `${origin}/?storeId=${storeData.storeId}`);
                          const cleanPhone = (storeData.ownerPhone || '').replace(/[^0-9]/g, '');
                          const phoneForUrl = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                          const url = `https://wa.me/${phoneForUrl}?text=${encodeURIComponent(text)}`;
                          window.open(url, '_blank');
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer"
                        title="Send login PIN directly to owner WhatsApp"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>📲 Share PIN via WhatsApp</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Current Active Login PIN
                        </label>
                        <div className="flex items-center space-x-2">
                          <span className="flex-1 text-sm font-mono font-black bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-xl text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600 text-center tracking-wider">
                            {isPasswordRevealed ? currentPassword : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsPasswordRevealed(!isPasswordRevealed)}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl cursor-pointer"
                            title="Toggle PIN Visibility"
                          >
                            {isPasswordRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(currentPassword);
                              setIsCopied(true);
                              setTimeout(() => setIsCopied(false), 2000);
                              addToast({ type: 'success', title: 'PIN Copied', message: `Copied "${currentPassword}" to clipboard` });
                            }}
                            className="p-2 text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 bg-slate-100 dark:bg-slate-800 rounded-xl cursor-pointer"
                            title="Copy PIN"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            New Login PIN / Password
                          </label>
                          <button
                            type="button"
                            onClick={handleQuickGeneratePin}
                            className="text-[11px] text-purple-600 hover:text-purple-700 dark:text-purple-400 font-bold cursor-pointer underline"
                          >
                            🎲 Generate 4-digit PIN
                          </button>
                        </div>
                        <input
                          type="text"
                          value={newPasswordInput}
                          onChange={(e) => setNewPasswordInput(e.target.value)}
                          placeholder="e.g. 1802 or secretPin..."
                          className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 dark:text-white"
                        />
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={handleSavePassword}
                          disabled={isUpdatingPassword}
                          className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition-colors shadow-sm cursor-pointer"
                        >
                          {isUpdatingPassword ? 'Saving...' : '🔑 Reset & Save PIN'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Row 5: Allowed Counter Terminal Limit */}
                  <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <Smartphone className="w-4 h-4 text-indigo-600" />
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                          Active Counter / Device Limit
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Currently: <strong>{storeData.allowedUserLimit === 0 ? 'Unlimited Terminals' : `${storeData.allowedUserLimit ?? 2} Counters`}</strong> • Active sessions: {storeData.connectedDevicesCount || 1}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <select
                        value={allowedLimitInput}
                        onChange={(e) => setAllowedLimitInput(Number(e.target.value))}
                        className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                      >
                        <option value={1}>1 Counter (Single Terminal)</option>
                        <option value={2}>2 Counters (Default)</option>
                        <option value={3}>3 Counters</option>
                        <option value={5}>5 Counters (Multi-Desk)</option>
                        <option value={10}>10 Counters (Enterprise)</option>
                        <option value={0}>Unlimited Devices</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleSaveCounterLimit}
                        disabled={isUpdatingLimit}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-colors cursor-pointer"
                      >
                        Set Limit
                      </button>
                    </div>
                  </div>

                  {/* Store Profile Details Editor */}
                  <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-purple-600" />
                        <h3 className="font-black text-sm text-slate-900 dark:text-white">
                          Edit Pharmacy Profile & License Metadata
                        </h3>
                      </div>
                      <span className="text-[11px] text-slate-400">Direct Workspace Sync</span>
                    </div>

                    <form onSubmit={handleSaveProfile} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Pharmacy Store Name *
                        </label>
                        <input
                          type="text"
                          value={editStoreName}
                          onChange={(e) => setEditStoreName(e.target.value)}
                          required
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Owner Full Name *
                        </label>
                        <input
                          type="text"
                          value={editOwnerName}
                          onChange={(e) => setEditOwnerName(e.target.value)}
                          required
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium dark:text-white focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Owner Mobile (WhatsApp) *
                        </label>
                        <input
                          type="text"
                          value={editOwnerPhone}
                          onChange={(e) => setEditOwnerPhone(e.target.value)}
                          required
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-medium dark:text-white focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Drug License Numbers (20B/21B) *
                        </label>
                        <input
                          type="text"
                          value={editDlNumber}
                          onChange={(e) => setEditDlNumber(e.target.value)}
                          required
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-medium dark:text-white focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                          GSTIN Number
                        </label>
                        <input
                          type="text"
                          value={editGstin}
                          onChange={(e) => setEditGstin(e.target.value)}
                          placeholder="e.g. 07AAAAA0000A1Z5"
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-medium dark:text-white focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Store UPI ID (For Thermal QR)
                        </label>
                        <input
                          type="text"
                          value={editUpiId}
                          onChange={(e) => setEditUpiId(e.target.value)}
                          placeholder="store@upi"
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-medium dark:text-white focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div className="sm:col-span-2 lg:col-span-3">
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Shop Physical Address
                        </label>
                        <input
                          type="text"
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          placeholder="Shop No. 4, Medical Market, Station Road..."
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium dark:text-white focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div className="sm:col-span-2 lg:col-span-3 flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={isSavingProfile}
                          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-md cursor-pointer"
                        >
                          {isSavingProfile ? 'Saving...' : '💾 Save Profile Updates'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Danger Zone: Delete Store */}
                  <div className="bg-rose-50/70 dark:bg-rose-950/20 p-5 rounded-2xl border border-rose-200 dark:border-rose-900/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-400">
                        <AlertTriangle className="w-5 h-5" />
                        <h4 className="font-black text-sm">Danger Zone: Permanently Delete Store</h4>
                      </div>
                      
                      {!showDeleteConfirm ? (
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(true)}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Store Workspace</span>
                        </button>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(false)}
                            className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteStore}
                            disabled={isDeletingStore}
                            className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-md cursor-pointer animate-pulse"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Confirm Permanent Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-rose-600 dark:text-rose-300">
                      Permanently wipes all medicine inventory, transactions, bills, and patients for {storeData.storeName}. Chemist will immediately be blocked from logging into the portal.
                    </p>
                  </div>

                </div>
              )}

              {/* ======================================================== */}
              {/* TAB B: MEDICINE INVENTORY & STOCK LIST                  */}
              {/* ======================================================== */}
              {activeTab === 'inventory' && (
                <div className="space-y-4">
                  
                  {/* Top Search & Filter Bar */}
                  <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                    
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={inventorySearch}
                        onChange={(e) => setInventorySearch(e.target.value)}
                        placeholder="Search medicines by brand name, salt composition, batch, or shelf..."
                        className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 dark:text-white font-medium"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setInventoryFilter('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          inventoryFilter === 'all'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        All ({inventoryList.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setInventoryFilter('low_stock')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          inventoryFilter === 'low_stock'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-700 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        Low Stock ({inventoryList.filter(i => (i.stockQuantity || 0) > 0 && (i.stockQuantity || 0) <= (i.minAlertLevel || 15)).length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setInventoryFilter('out_of_stock')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          inventoryFilter === 'out_of_stock'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-700 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        Out of Stock ({inventoryList.filter(i => (i.stockQuantity || 0) <= 0).length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsAddMedicineOpen(true)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center space-x-1 transition-all shadow-xs cursor-pointer ml-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Medicine</span>
                      </button>
                    </div>

                  </div>

                  {/* Inventory Table */}
                  <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-black text-[10px] border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="py-3 px-3">Medicine & Salt</th>
                            <th className="py-3 px-3">Category</th>
                            <th className="py-3 px-3">Batch No</th>
                            <th className="py-3 px-3">Expiry Date</th>
                            <th className="py-3 px-3">Stock Qty</th>
                            <th className="py-3 px-3">MRP (₹)</th>
                            <th className="py-3 px-3">Cost Price (₹)</th>
                            <th className="py-3 px-3">Rack/Shelf</th>
                            <th className="py-3 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                          {filteredInventory.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                                No medicines found matching your criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredInventory.map(item => {
                              const qty = Number(item.stockQuantity || 0);
                              const isLow = qty > 0 && qty <= (item.minAlertLevel || 15);
                              const isOut = qty <= 0;

                              return (
                                <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/50 transition-colors">
                                  <td className="py-3 px-3">
                                    <div className="font-bold text-slate-900 dark:text-white">
                                      {item.brandName}
                                    </div>
                                    <div className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">
                                      {item.saltComposition || item.genericName || 'Standard Formulation'}
                                    </div>
                                  </td>

                                  <td className="py-3 px-3">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                      {item.category || 'General'}
                                    </span>
                                  </td>

                                  <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                                    {item.batchNumber}
                                  </td>

                                  <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                                    {item.expirationDate || item.expiryDate || '2027-12-31'}
                                  </td>

                                  <td className="py-3 px-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black ${
                                      isOut 
                                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300' 
                                        : isLow 
                                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' 
                                        : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                    }`}>
                                      {qty} {item.unit || 'Strips'}
                                    </span>
                                  </td>

                                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                                    ₹{item.mrp || item.sellingPrice || 0}
                                  </td>

                                  <td className="py-3 px-3 font-medium text-slate-500">
                                    ₹{item.purchaseRate || item.costPrice || 0}
                                  </td>

                                  <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                                    {item.locationShelf || item.rackLocation || 'Rack A-1'}
                                  </td>

                                  <td className="py-3 px-3 text-right">
                                    <div className="flex items-center justify-end space-x-1">
                                      <button
                                        type="button"
                                        onClick={() => setEditingMedicine(item)}
                                        className="p-1.5 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
                                        title="Edit Stock & Pricing"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteMedicine(item.id, item.brandName)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                        title="Delete Medicine"
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

                </div>
              )}

              {/* ======================================================== */}
              {/* TAB C: SALES HISTORY & INVOICES                         */}
              {/* ======================================================== */}
              {activeTab === 'sales' && (
                <div className="space-y-4">
                  
                  {/* Search Bar */}
                  <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={salesSearch}
                        onChange={(e) => setSalesSearch(e.target.value)}
                        placeholder="Search bills by invoice number, customer name, mobile, or doctor..."
                        className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 dark:text-white font-medium"
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-500">
                      Total Invoices: <strong className="text-slate-900 dark:text-white">{filteredSales.length}</strong>
                    </span>
                  </div>

                  {/* Transactions Table */}
                  <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-black text-[10px] border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="py-3 px-3">Bill / Invoice No</th>
                            <th className="py-3 px-3">Date & Time</th>
                            <th className="py-3 px-3">Customer Profile</th>
                            <th className="py-3 px-3">Items Dispensed</th>
                            <th className="py-3 px-3">Grand Total (₹)</th>
                            <th className="py-3 px-3">Payment Mode</th>
                            <th className="py-3 px-3 text-right">Receipt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                          {filteredSales.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                                No sales bills generated yet for this pharmacy.
                              </td>
                            </tr>
                          ) : (
                            filteredSales.map(tx => {
                              const invNo = tx.invoiceNumber || tx.receiptNumber || tx.id;
                              const cust = tx.customerName || tx.patientName || 'Walk-in Customer';
                              const phone = tx.customerPhone || tx.patientPhone || tx.contactNumber || 'N/A';
                              const total = Number(tx.grandTotal || tx.totalAmount || 0);

                              return (
                                <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/50 transition-colors">
                                  <td className="py-3 px-3 font-mono font-bold text-purple-700 dark:text-purple-400">
                                    {invNo}
                                  </td>

                                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                                    {tx.timestamp}
                                  </td>

                                  <td className="py-3 px-3">
                                    <div className="font-bold text-slate-900 dark:text-white">
                                      {cust}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono">
                                      Ph: {phone}
                                    </div>
                                  </td>

                                  <td className="py-3 px-3">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                      {(tx.items || []).length} items
                                    </span>
                                  </td>

                                  <td className="py-3 px-3 font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                    ₹{total.toFixed(2)}
                                  </td>

                                  <td className="py-3 px-3">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                      {tx.paymentMode || tx.paymentMethod || 'Cash'}
                                    </span>
                                  </td>

                                  <td className="py-3 px-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setInspectingInvoice({
                                          id: tx.id,
                                          invoiceNumber: invNo,
                                          storeId: storeData.storeId,
                                          storeName: storeData.storeName,
                                          storeDl: storeData.dlNumber,
                                          storeGstin: storeData.gstin || '07AAAAA0000A1Z5',
                                          customerName: cust,
                                          customerPhone: phone,
                                          doctorName: tx.doctorName || 'General Practitioner',
                                          paymentMethod: tx.paymentMode || tx.paymentMethod || 'Cash',
                                          subtotal: tx.subtotal || total,
                                          discountTotal: tx.discountAmount || 0,
                                          tax: tx.tax || 0,
                                          totalGst: tx.tax || 0,
                                          grandTotal: total,
                                          totalPaid: total,
                                          timestamp: tx.timestamp,
                                          items: tx.items || []
                                        });
                                      }}
                                      className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-colors cursor-pointer ml-auto"
                                    >
                                      <Receipt className="w-3 h-3" />
                                      <span>Print View</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 4: SHARE CREDENTIALS & ONBOARDING                    */}
              {/* ======================================================== */}
              {activeTab === 'share' && (
                <div className="space-y-6 max-w-4xl mx-auto">
                  
                  {/* WhatsApp Quick Dispatch Banner */}
                  <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-black">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Instant Onboarding WhatsApp Dispatch</span>
                      </div>
                      <h3 className="text-xl font-black text-white">
                        Send Chemist Login Credentials via WhatsApp
                      </h3>
                      <p className="text-xs text-emerald-100 max-w-xl">
                        Send a complete, formatted WhatsApp message directly to <strong>{storeData.ownerName}</strong> (+91 {storeData.ownerPhone}) with their private Store ID, Password, and clean login portal link.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleShareWhatsApp}
                        className="px-5 py-3 bg-white hover:bg-emerald-50 text-emerald-800 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4 text-emerald-600" />
                        <span>📲 Open WhatsApp Invite</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyCredentials}
                        className="px-4 py-3 bg-emerald-800/60 hover:bg-emerald-800 text-white rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 border border-emerald-400/40 transition-colors cursor-pointer"
                      >
                        {isCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                        <span>{isCopied ? 'Copied!' : 'Copy Formatted Text'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Credentials Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Raw Credentials Card */}
                    <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                        <span className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center space-x-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-purple-600" />
                          <span>Store Access Keys</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                          Encrypted Auth
                        </span>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1">Store ID (Login Identifier)</label>
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-black text-purple-700 dark:text-purple-300 text-sm">
                              {storeData.storeId}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(storeData.storeId);
                                addToast({ type: 'success', title: 'Copied', message: `Store ID ${storeData.storeId} copied` });
                              }}
                              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors cursor-pointer"
                              title="Copy Store ID"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1">Store Password</label>
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-black text-slate-800 dark:text-slate-200 text-sm flex items-center justify-between">
                              <span>{isPasswordRevealed ? currentPassword : '••••••••••••'}</span>
                              <button
                                type="button"
                                onClick={() => setIsPasswordRevealed(!isPasswordRevealed)}
                                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                              >
                                {isPasswordRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(currentPassword);
                                addToast({ type: 'success', title: 'Copied', message: 'Store Password copied' });
                              }}
                              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors cursor-pointer"
                              title="Copy Store Password"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1">Direct Chemist Portal Login Link</label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              readOnly
                              value={typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : 'https://pharmpulse.app'}
                              className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-600 dark:text-slate-400 truncate"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const url = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : 'https://pharmpulse.app';
                                navigator.clipboard.writeText(url);
                                addToast({ type: 'success', title: 'Link Copied', message: 'Chemist clean portal URL copied' });
                              }}
                              className="px-3 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl font-bold transition-colors cursor-pointer"
                              title="Copy Link"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Formatted Message Preview Card */}
                    <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                          <span className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center space-x-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp Message Preview</span>
                          </span>
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                            Formatted & Ready
                          </span>
                        </div>

                        <div className="mt-3 p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-200 space-y-1.5 leading-relaxed">
                          <p className="font-bold text-emerald-800 dark:text-emerald-300">🏪 *PharmPulse Pharmacy Portal Access*</p>
                          <p>Dear *{storeData.ownerName}*, your store workspace is active.</p>
                          <p className="text-purple-800 dark:text-purple-300">🔑 *Store ID:* `{storeData.storeId}`</p>
                          <p className="text-purple-800 dark:text-purple-300">🔒 *Password:* `{currentPassword}`</p>
                          <p>📍 *Store:* {storeData.storeName}</p>
                          <p>🌐 *Login Portal:* {typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : 'https://pharmpulse.app'}</p>
                          <p className="text-slate-500 text-[10px] pt-1">Instructions: Enter your Store ID and Password on the clean login screen.</p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={handleShareWhatsApp}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-sm cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Send on WhatsApp</span>
                        </button>
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* ======================================================== */}
              {/* TAB D: LIVE STORE ANALYTICS                             */}
              {/* ======================================================== */}
              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  
                  {/* Top Metric Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    
                    <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                        <span>TODAY'S SALES</span>
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                        ₹{(analyticsData?.todaySales || 0).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Live from POS Cash Desk</div>
                    </div>

                    <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                        <span>MONTHLY REVENUE</span>
                        <DollarSign className="w-4 h-4 text-teal-500" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                        ₹{(analyticsData?.monthlyRevenue || 0).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Current Calendar Month</div>
                    </div>

                    <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                        <span>TOTAL BILLS GENERATED</span>
                        <Receipt className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {analyticsData?.totalBillsCount || transactionsList.length}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Lifetime Invoices</div>
                    </div>

                    <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                        <span>INVENTORY VALUATION</span>
                        <Package className="w-4 h-4 text-purple-500" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-purple-700 dark:text-purple-400 mt-1">
                        ₹{(analyticsData?.totalInventoryValue || 0).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">MRP Retail Value ({inventoryList.length} items)</div>
                    </div>

                  </div>

                  {/* Stock Health & Alerts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          <span>Stock Health & Critical Alerts</span>
                        </h4>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                          <span className="text-xs font-bold text-amber-800 dark:text-amber-300">Low Stock Reorder Alerts:</span>
                          <span className="text-xs font-black text-amber-900 dark:text-amber-200 px-2 py-0.5 bg-amber-200 dark:bg-amber-900 rounded-full">
                            {analyticsData?.lowStockCount || 0} drugs
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50">
                          <span className="text-xs font-bold text-rose-800 dark:text-rose-300">Out of Stock (Zero Stock):</span>
                          <span className="text-xs font-black text-rose-900 dark:text-rose-200 px-2 py-0.5 bg-rose-200 dark:bg-rose-900 rounded-full">
                            {analyticsData?.outOfStockCount || 0} drugs
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50">
                          <span className="text-xs font-bold text-purple-800 dark:text-purple-300">Expiring in ≤ 90 Days:</span>
                          <span className="text-xs font-black text-purple-900 dark:text-purple-200 px-2 py-0.5 bg-purple-200 dark:bg-purple-900 rounded-full">
                            {analyticsData?.expiringSoonCount || 0} drugs
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-teal-500" />
                        <span>Fast Dispense Insights</span>
                      </h4>

                      <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div className="font-bold text-slate-900 dark:text-white">Average Basket Value</div>
                          <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                            ₹{transactionsList.length > 0 ? (transactionsList.reduce((acc, t) => acc + (t.grandTotal || 0), 0) / transactionsList.length).toFixed(2) : '0.00'}
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div className="font-bold text-slate-900 dark:text-white">Active Licensing Tier</div>
                          <div className="text-xs font-mono text-purple-700 dark:text-purple-300 mt-0.5">
                            {storeData.subscriptionPlan} • ₹{storeData.subscriptionPrice} Total Paid
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* ======================================================== */}
              {/* TAB E: ACTIVE TERMINALS & DEVICE SESSIONS                */}
              {/* ======================================================== */}
              {activeTab === 'devices' && (
                <div className="space-y-4">
                  
                  <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        Connected Counter Terminals & Hardware Sessions
                      </h4>
                      <p className="text-xs text-slate-500">
                        Max Allowed Devices: <strong>{storeData.allowedUserLimit === 0 ? 'Unlimited' : storeData.allowedUserLimit ?? 2}</strong>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleRevokeAllSessions}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>Revoke All Sessions</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {devicesList.map(dev => (
                      <div
                        key={dev.deviceId}
                        className={`p-4 rounded-2xl border transition-all ${
                          dev.status === 'active'
                            ? 'bg-white dark:bg-slate-800 border-emerald-300 dark:border-emerald-800/60 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-bold">
                              <Smartphone className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-xs text-slate-900 dark:text-white">
                                {dev.deviceName}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                ID: {dev.deviceId}
                              </div>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            dev.status === 'active'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
                          }`}>
                            {dev.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 space-y-1 font-mono">
                          <div>User: <strong className="text-slate-800 dark:text-slate-200">{dev.userName}</strong> ({dev.userRole})</div>
                          <div>IP Address: {dev.ipAddress || '103.21.144.22'}</div>
                          <div>Location: {dev.location || 'Mumbai, MH'}</div>
                          <div>Last Heartbeat: {dev.lastActive}</div>
                        </div>

                        {dev.status === 'active' && (
                          <div className="mt-3 pt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleRevokeDevice(dev.deviceId)}
                              className="px-3 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-lg text-[10px] font-bold border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                            >
                              Disconnect Session
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                </div>
              )}

            </>
          )}

        </div>

      </div>

      {/* EDIT MEDICINE MODAL */}
      {editingMedicine && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                Edit Medicine: {editingMedicine.brandName}
              </h3>
              <button onClick={() => setEditingMedicine(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleUpdateMedicine} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Stock Quantity</label>
                <input
                  type="number"
                  value={editingMedicine.stockQuantity}
                  onChange={(e) => setEditingMedicine({ ...editingMedicine, stockQuantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    value={editingMedicine.mrp}
                    onChange={(e) => setEditingMedicine({ ...editingMedicine, mrp: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Purchase Rate (₹)</label>
                  <input
                    type="number"
                    value={editingMedicine.purchaseRate}
                    onChange={(e) => setEditingMedicine({ ...editingMedicine, purchaseRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Batch Number</label>
                  <input
                    type="text"
                    value={editingMedicine.batchNumber}
                    onChange={(e) => setEditingMedicine({ ...editingMedicine, batchNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={editingMedicine.expirationDate || editingMedicine.expiryDate}
                    onChange={(e) => setEditingMedicine({ ...editingMedicine, expirationDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMedicine(null)}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD MEDICINE MODAL */}
      {isAddMedicineOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                ➕ Add Medicine to {storeData?.storeName}
              </h3>
              <button onClick={() => setIsAddMedicineOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleAddMedicineSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paracetamol 650"
                  value={newMedicineForm.brandName}
                  onChange={(e) => setNewMedicineForm({ ...newMedicineForm, brandName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Generic Salt Composition</label>
                <input
                  type="text"
                  placeholder="e.g. Paracetamol IP 650mg"
                  value={newMedicineForm.saltComposition}
                  onChange={(e) => setNewMedicineForm({ ...newMedicineForm, saltComposition: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Batch Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="BATCH-001"
                    value={newMedicineForm.batchNumber}
                    onChange={(e) => setNewMedicineForm({ ...newMedicineForm, batchNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Expiration Date</label>
                  <input
                    type="date"
                    value={newMedicineForm.expirationDate}
                    onChange={(e) => setNewMedicineForm({ ...newMedicineForm, expirationDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Stock Qty</label>
                  <input
                    type="number"
                    value={newMedicineForm.stockQuantity}
                    onChange={(e) => setNewMedicineForm({ ...newMedicineForm, stockQuantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    value={newMedicineForm.mrp}
                    onChange={(e) => setNewMedicineForm({ ...newMedicineForm, mrp: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Purchase Rate</label>
                  <input
                    type="number"
                    value={newMedicineForm.purchaseRate}
                    onChange={(e) => setNewMedicineForm({ ...newMedicineForm, purchaseRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddMedicineOpen(false)}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black cursor-pointer"
                >
                  Add Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVOICE INSPECTOR MODAL */}
      {inspectingInvoice && (
        <InvoiceInspectorModal
          invoice={inspectingInvoice}
          onClose={() => setInspectingInvoice(null)}
        />
      )}

    </div>
  );
};
