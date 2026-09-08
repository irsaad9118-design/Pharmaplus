import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  User, 
  Phone, 
  FileText, 
  KeyRound, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Share2, 
  Copy, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  ExternalLink,
  MessageCircle,
  X,
  Zap,
  MapPin,
  QrCode,
  Layers,
  Smartphone,
  CheckCircle
} from 'lucide-react';
import { 
  generateUniqueStoreId, 
  generateRandomPassword, 
  saveRegisteredStore, 
  RegisteredStoreRecord,
  shareCredentialsViaWhatsApp,
  formatWhatsAppCredentialsMessage
} from '../../utils/storeRegistry';
import { INITIAL_INVENTORY } from '../../data/initialData';
import { useAuth } from '../../context/AuthContext';
import { usePharmacy } from '../../context/PharmacyContext';
import { SubscriptionPlanKey, SUBSCRIPTION_TIERS } from '../../types/pharmacy';

interface OnboardPharmacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newStore: RegisteredStoreRecord) => void;
  onStoreCreated?: (newStore?: RegisteredStoreRecord) => void;
}

export const OnboardPharmacyModal: React.FC<OnboardPharmacyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onStoreCreated
}) => {
  const { register, login, provisionStore } = useAuth();
  const { addToast, setActiveTab } = usePharmacy();

  // Form inputs
  const [storeName, setStoreName] = useState<string>('');
  const [branchName, setBranchName] = useState<string>('');
  const [ownerName, setOwnerName] = useState<string>('');
  const [ownerPhone, setOwnerPhone] = useState<string>('');
  const [dlNumber, setDlNumber] = useState<string>('');
  const [storeId, setStoreId] = useState<string>('');
  const [isCustomStoreId, setIsCustomStoreId] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [address, setAddress] = useState<string>('');
  const [gstin, setGstin] = useState<string>('');
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlanKey>('yearly_3999');
  const [allowedUserLimit, setAllowedUserLimit] = useState<number>(2); // Default 2 Devices/Counters

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdStore, setCreatedStore] = useState<RegisteredStoreRecord | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Initialize auto-generated credentials on open
  useEffect(() => {
    if (isOpen) {
      setStoreId(generateUniqueStoreId());
      setIsCustomStoreId(false);
      setPassword(generateRandomPassword());
      setCreatedStore(null);
      setStoreName('');
      setBranchName('');
      setOwnerName('');
      setOwnerPhone('');
      setDlNumber('');
      setAddress('');
      setGstin('');
      setSubscriptionPlan('yearly_3999');
      setAllowedUserLimit(2);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRegenerateStoreId = () => {
    setStoreId(generateUniqueStoreId());
  };

  const handleRegeneratePassword = () => {
    setPassword(generateRandomPassword());
  };

  const handleCopyText = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(label);
      addToast({
        type: 'info',
        title: 'Copied to Clipboard',
        message: `${label} copied successfully`
      });
      setTimeout(() => setCopiedField(null), 2500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = ownerPhone.replace(/[^0-9]/g, '');

    if (!storeName.trim()) {
      addToast({ type: 'warning', title: 'Store Name Required', message: 'Please enter pharmacy or medical store name.' });
      return;
    }
    if (cleanPhone.length < 10) {
      addToast({ type: 'warning', title: 'Invalid Phone Number', message: 'Please enter a valid 10-digit mobile number.' });
      return;
    }
    if (!dlNumber.trim()) {
      addToast({ type: 'warning', title: 'Drug License Required', message: 'Please enter Drug License (DL) number.' });
      return;
    }
    if (!storeId.trim()) {
      addToast({ type: 'warning', title: 'Store ID Required', message: 'Please provide or generate a unique Store ID.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const planConfig = SUBSCRIPTION_TIERS[subscriptionPlan] || SUBSCRIPTION_TIERS['yearly_3999'];
      const planPrice = planConfig.price;
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + (planConfig.durationDays || 365));
      const expDateStr = expDate.toISOString().split('T')[0];

      const fullStoreName = branchName.trim() 
        ? `${storeName.trim()} (${branchName.trim()})`
        : storeName.trim();

      const cleanStoreId = storeId.trim().toUpperCase();
      const cleanStorePassword = password.trim() || 'store123';

      // Real-Time Store Provisioning (unified localStorage 'pharmpulse_stores' & instant login)
      const provisionedStore = provisionStore({
        id: cleanStoreId,
        storeId: cleanStoreId,
        name: fullStoreName,
        storeName: fullStoreName,
        ownerName: ownerName.trim() || 'Store Owner',
        ownerPhone: cleanPhone,
        phone: cleanPhone,
        ownerEmail: `${cleanStoreId.toLowerCase()}@pharmpulse.store`,
        dlNumber: dlNumber.trim(),
        gstin: gstin.trim() || '07AAAAA0000A1Z5',
        address: address.trim() || 'Commercial Market, Medical Hub',
        password: cleanStorePassword,
        initialPassword: cleanStorePassword,
        status: 'ACTIVE',
        subscriptionPlan,
        subscriptionPrice: planPrice,
        subscriptionExpiryDate: expDateStr,
        createdAt: new Date().toISOString().split('T')[0],
        connectedDevicesCount: 1,
        totalRevenueCollected: planPrice,
        allowedUserLimit: Number(allowedUserLimit) >= 0 ? Number(allowedUserLimit) : 2,
        upiId: `${cleanPhone}@upi`,
        inventory: INITIAL_INVENTORY,
        sales: [],
        onboardedBy: 'Master Super Admin (admin@pharmpulse.com)'
      });

      setCreatedStore(provisionedStore);
      addToast({
        type: 'success',
        title: 'Pharmacy Provisioned Successfully!',
        message: `${provisionedStore.storeName} (${provisionedStore.storeId}) is now active & ready for POS billing.`
      });

      if (onSuccess) {
        onSuccess(provisionedStore);
      }
      if (onStoreCreated) {
        onStoreCreated(provisionedStore);
      }
    } catch (e: any) {
      addToast({
        type: 'error',
        title: 'Onboarding Error',
        message: e.message || 'Failed to onboard pharmacy.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLaunchStorePOS = async () => {
    if (!createdStore) return;
    const res = await login({
      identifier: createdStore.storeId,
      password: createdStore.password,
      role: 'owner',
      userName: `${createdStore.ownerName} (Owner)`
    });

    if (res.success) {
      onClose();
      setActiveTab('pos');
      addToast({
        type: 'success',
        title: `Switched to ${createdStore.storeName}`,
        message: 'Loaded isolated POS workspace.'
      });
    }
  };

  return (
    <div id="onboard-pharmacy-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-purple-200 shadow-inner">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">➕ Create New Pharmacy Store</h2>
              <p className="text-xs text-purple-200 font-medium">
                Automated workspace provisioning with 1-click WhatsApp onboarding invite
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {!createdStore ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Auto-Generated Credentials Highlight Banner */}
              <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50 to-teal-50 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-teal-950/20 rounded-2xl border border-purple-200/80 dark:border-purple-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Automated Store Authentication Credentials
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCustomStoreId(!isCustomStoreId)}
                      className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 hover:underline cursor-pointer"
                    >
                      {isCustomStoreId ? 'Auto-Generate ID' : 'Custom Store ID'}
                    </button>
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                      Isolated Tenant
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Generated Store ID */}
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {isCustomStoreId ? 'Custom Store ID' : 'Generated Store ID'}
                      </span>
                      {!isCustomStoreId && (
                        <button
                          type="button"
                          onClick={handleRegenerateStoreId}
                          className="text-[11px] text-purple-600 hover:text-purple-700 dark:text-purple-400 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Regenerate random unique Store ID"
                        >
                          <RefreshCw className="w-3 h-3" /> Regenerate
                        </button>
                      )}
                    </div>
                    {isCustomStoreId ? (
                      <input
                        type="text"
                        value={storeId}
                        onChange={(e) => setStoreId(e.target.value.toUpperCase())}
                        placeholder="e.g. PHARM-101"
                        className="w-full font-mono text-sm font-black text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border border-purple-300 dark:border-purple-700 rounded-lg px-2.5 py-1"
                        required
                      />
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-base font-black text-purple-700 dark:text-purple-300">
                          {storeId}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(storeId, 'Store ID')}
                          className="p-1 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer"
                          title="Copy Store ID"
                        >
                          {copiedField === 'Store ID' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Generated Initial Password */}
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Store Login Password / PIN</span>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400 flex items-center gap-1 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{showPassword ? 'Hide' : 'Show'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRegeneratePassword}
                          className="text-[11px] text-purple-600 hover:text-purple-700 dark:text-purple-400 font-bold flex items-center gap-1 cursor-pointer"
                          title="Regenerate random initial password"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="e.g. Pass-4821"
                        className="w-full font-mono text-sm font-black text-slate-900 dark:text-white bg-transparent border-none focus:outline-none p-0"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyText(password, 'Owner Password')}
                        className="p-1 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer shrink-0"
                        title="Copy Password"
                      >
                        {copiedField === 'Owner Password' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pharmacy Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Store / Pharmacy Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="e.g. Apollo Medicos"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 dark:text-white font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pharmacy Branch Name (Optional)
                  </label>
                  <div className="relative">
                    <Layers className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      placeholder="e.g. Sector 14 Main Branch"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 dark:text-white font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Owner Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 dark:text-white font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Owner WhatsApp / Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="tel"
                      required
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      placeholder="10-digit mobile (e.g. 9876543210)"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 dark:text-white font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Drug License (DL) Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={dlNumber}
                      onChange={(e) => setDlNumber(e.target.value)}
                      placeholder="e.g. DL-20B/3891 & 21B/3892"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 dark:text-white font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    GSTIN Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="e.g. 07AAAAA0000A1Z5"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Store Location / Address (Optional)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Shop No, Market, City, State"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 dark:text-white font-medium"
                  />
                </div>
              </div>

              {/* Plan Selection (4 Official SaaS Tiers) */}
              <div>
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-2">
                  Assign SaaS Subscription Plan
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* 7-Day Free Trial */}
                  <div
                    onClick={() => setSubscriptionPlan('trial_7d')}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      subscriptionPlan === 'trial_7d'
                        ? 'border-purple-600 bg-purple-50/80 dark:bg-purple-950/40 ring-2 ring-purple-500 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">Free Trial</span>
                      <span className="text-[9px] font-black px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md">7 Days</span>
                    </div>
                    <div className="font-black text-sm text-purple-700 dark:text-purple-400 mt-1">₹0</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">1 Counter • Full Access</div>
                  </div>

                  {/* Monthly Plan */}
                  <div
                    onClick={() => setSubscriptionPlan('monthly_399')}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      subscriptionPlan === 'monthly_399'
                        ? 'border-purple-600 bg-purple-50/80 dark:bg-purple-950/40 ring-2 ring-purple-500 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-purple-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900 dark:text-white">Monthly</div>
                    <div className="font-black text-sm text-purple-700 dark:text-purple-400 mt-1">₹399<span className="text-[10px] font-normal text-slate-500">/mo</span></div>
                    <div className="text-[10px] text-slate-500 mt-0.5">30 Days • Full POS</div>
                  </div>

                  {/* Quarterly Plan */}
                  <div
                    onClick={() => setSubscriptionPlan('quarterly_999')}
                    className={`p-3 rounded-2xl border cursor-pointer relative transition-all ${
                      subscriptionPlan === 'quarterly_999'
                        ? 'border-purple-600 bg-purple-50/80 dark:bg-purple-950/40 ring-2 ring-purple-500 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-purple-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900 dark:text-white">Quarterly</div>
                    <div className="font-black text-sm text-purple-700 dark:text-purple-400 mt-1">₹999<span className="text-[10px] font-normal text-slate-500">/3mo</span></div>
                    <div className="text-[10px] text-slate-500 mt-0.5">90 Days • Value Pack</div>
                  </div>

                  {/* Yearly Plan */}
                  <div
                    onClick={() => setSubscriptionPlan('yearly_3999')}
                    className={`p-3 rounded-2xl border cursor-pointer relative transition-all ${
                      subscriptionPlan === 'yearly_3999'
                        ? 'border-purple-600 bg-purple-50/80 dark:bg-purple-950/40 ring-2 ring-purple-500 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-purple-300'
                    }`}
                  >
                    <span className="absolute -top-2 right-2 px-1.5 py-0.2 bg-amber-500 text-white text-[9px] font-black rounded-full shadow-xs">
                      BEST
                    </span>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">Yearly</div>
                    <div className="font-black text-sm text-purple-700 dark:text-purple-400 mt-1">₹3,999<span className="text-[10px] font-normal text-slate-500">/yr</span></div>
                    <div className="text-[10px] text-slate-500 mt-0.5">365 Days • Multi-Counter</div>
                  </div>
                </div>
              </div>

              {/* Super Admin User Licensing Limit Setting (Default 1, Scalable up to 10) */}
              <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                    Allowed Counter / Device Limit (Licensing Enforcement)
                  </label>
                  <span className="text-xs font-mono font-black text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950 px-2 py-0.5 rounded-lg border border-purple-300 dark:border-purple-800">
                    {allowedUserLimit === 0 ? 'Unlimited Counters' : `${allowedUserLimit} Counter Limit`}
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {[1, 2, 3, 5, 10, 0].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAllowedUserLimit(preset)}
                      className={`py-1.5 px-1 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        allowedUserLimit === preset
                          ? 'bg-purple-600 text-white border-purple-600 shadow-md scale-102'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-purple-400'
                      }`}
                    >
                      {preset === 0 ? 'Unlimited' : `${preset} ${preset === 1 ? 'Counter' : 'Counters'}`}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Default 2 billing counters/devices. Chemist cannot exceed this active device count without contacting Super Admin.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black rounded-xl shadow-lg shadow-purple-600/30 text-xs flex items-center space-x-2 transition-all disabled:opacity-50 cursor-pointer active:scale-98"
                >
                  {isSubmitting ? (
                    <span>Provisioning Store Workspace...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Provision Store & Generate Credentials</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Success Screen with Direct 1-Click WhatsApp Onboarding Pack */
            <div className="space-y-5 text-center sm:text-left animate-in fade-in duration-200">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-start space-x-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                    Store Successfully Provisioned & Registered!
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Isolated pharmacy database initialized. Send instant login credentials to the chemist via WhatsApp.
                  </p>
                </div>
              </div>

              {/* Credentials Summary Card */}
              <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
                  <div>
                    <h4 className="font-black text-base text-slate-900 dark:text-white">
                      {createdStore.storeName}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Owner: <strong className="text-slate-700 dark:text-slate-300">{createdStore.ownerName}</strong> • Ph: +91 {createdStore.ownerPhone}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-black rounded-full w-fit border border-emerald-300 dark:border-emerald-800">
                    ACTIVE LICENSE
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">Store ID (Login ID)</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-lg font-black text-purple-700 dark:text-purple-300">
                        {createdStore.storeId}
                      </span>
                      <button
                        onClick={() => handleCopyText(createdStore.storeId, 'Store ID')}
                        className="text-slate-400 hover:text-purple-600 p-1 cursor-pointer"
                        title="Copy Store ID"
                      >
                        {copiedField === 'Store ID' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">Initial Owner Password</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-lg font-black text-teal-700 dark:text-teal-300">
                        {createdStore.initialPassword || createdStore.password}
                      </span>
                      <button
                        onClick={() => handleCopyText(createdStore.initialPassword || createdStore.password || '', 'Password')}
                        className="text-slate-400 hover:text-teal-600 p-1 cursor-pointer"
                        title="Copy Password"
                      >
                        {copiedField === 'Password' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>DL: <strong className="text-slate-700 dark:text-slate-300">{createdStore.dlNumber}</strong></span>
                  <span>Counters: <strong className="text-slate-700 dark:text-slate-300">{createdStore.allowedUserLimit === 0 ? 'Unlimited' : createdStore.allowedUserLimit}</strong></span>
                  <span>Validity Expiry: <strong className="text-slate-700 dark:text-slate-300">{createdStore.subscriptionExpiryDate}</strong></span>
                </div>
              </div>

              {/* WhatsApp Share & Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => shareCredentialsViaWhatsApp(createdStore)}
                  className="flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg shadow-emerald-600/30 text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>📲 Send WhatsApp Credentials (+91 {createdStore.ownerPhone})</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyText(formatWhatsAppCredentialsMessage(createdStore), 'All Credentials')}
                  className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  {copiedField === 'All Credentials' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>📋 Copy WhatsApp Invite</span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  Done & Return to Fleet
                </button>

                <button
                  type="button"
                  onClick={handleLaunchStorePOS}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl flex items-center space-x-1.5 transition-colors shadow-md cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Test Launch Store POS</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
