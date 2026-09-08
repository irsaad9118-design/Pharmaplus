import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  Building2, 
  Smartphone, 
  Tablet, 
  Monitor, 
  ShieldCheck, 
  User, 
  Phone, 
  FileText, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ChevronRight, 
  Sparkles,
  Store,
  Crown,
  KeyRound,
  Layers,
  CreditCard,
  QrCode,
  Check,
  Copy,
  Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePharmacy } from '../../context/PharmacyContext';
import { SUBSCRIPTION_TIERS, SubscriptionPlanKey } from '../../types/pharmacy';
import { getRegisteredStores, RegisteredStoreRecord } from '../../utils/storeRegistry';
import { ForgotPasswordModal } from './ForgotPasswordModal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register' | 'admin';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultTab = 'login' }) => {
  const { 
    login, 
    register, 
    superAdminLogin, 
    currentSession, 
    isSuperAdmin,
    authModalTab,
    setAuthModalOpen
  } = useAuth();
  const { addToast } = usePharmacy();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'admin'>(defaultTab || authModalTab);
  
  // Login form state - 100% clean empty default
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [deviceName, setDeviceName] = useState('Counter Terminal');
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('tablet');
  const [userRole, setUserRole] = useState<'owner' | 'staff' | 'cashier'>('owner');
  const [userName, setUserName] = useState('');

  // Register form state
  const [regStoreName, setRegStoreName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regOwnerPhone, setRegOwnerPhone] = useState('');
  const [regDlNumber, setRegDlNumber] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regGstin, setRegGstin] = useState('');
  const [regUpiId, setRegUpiId] = useState('');
  const [regPlan, setRegPlan] = useState<SubscriptionPlanKey>('pro_1999_yr');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Check hash for direct super admin route
  useEffect(() => {
    if (typeof window !== 'undefined' && (window.location.hash === '#super-admin' || window.location.pathname === '/super-admin')) {
      setActiveTab('admin');
    }
  }, []);

  // Generate UPI QR code whenever the selected plan changes
  useEffect(() => {
    const plan = SUBSCRIPTION_TIERS[regPlan] || SUBSCRIPTION_TIERS['pro_1999_yr'];
    const upiPayload = `upi://pay?pa=irsaad9118@okhdfcbank&pn=PharmPulse%20SaaS&am=${plan.price}&cu=INR&tn=PharmPulse%20${encodeURIComponent(plan.name)}%20Subscription`;
    
    QRCode.toDataURL(upiPayload, {
      width: 220,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    }).then(url => {
      setQrDataUrl(url);
    }).catch(err => {
      console.error('Failed to generate UPI QR:', err);
    });
  }, [regPlan]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText('irsaad9118@okhdfcbank');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Super Admin form state - 100% clean empty default
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const res = await login({
      identifier: loginIdentifier.trim(),
      password: loginPassword,
      deviceName,
      deviceType,
      role: userRole,
      userName: userName.trim()
    });

    setIsSubmitting(false);
    if (res.success) {
      addToast({
        type: 'success',
        title: 'Logged In Successfully',
        message: `Welcome to ${res.store?.storeName || 'Medical Store POS'}`
      });
      onClose();
    } else {
      setErrorMessage(res.error || 'Failed to login to medical store.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regStoreName.trim() || !regOwnerPhone.trim() || !regDlNumber.trim()) {
      setErrorMessage('Please fill in Store Name, Owner Phone Number, and Drug License (DL) Number.');
      return;
    }

    setIsSubmitting(true);
    const res = await register({
      storeName: regStoreName.trim(),
      ownerName: regOwnerName.trim() || 'Store Owner',
      ownerPhone: regOwnerPhone.trim(),
      dlNumber: regDlNumber.trim(),
      password: regPassword || 'store123',
      gstin: regGstin.trim(),
      address: regAddress.trim(),
      upiId: regUpiId.trim(),
      subscriptionPlan: regPlan
    });

    setIsSubmitting(false);
    if (res.success) {
      addToast({
        type: 'success',
        title: 'Store Workspace Provisioned',
        message: `Store ID: ${res.storeId} registered with active subscription!`
      });
      onClose();
    } else {
      setErrorMessage(res.error || 'Registration failed.');
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const res = await superAdminLogin(adminEmail.trim(), adminPassword);
    setIsSubmitting(false);

    if (res.success) {
      addToast({
        type: 'success',
        title: 'Super Admin Access Granted',
        message: 'Welcome SaaS Platform Owner (Irsaad9118@gmail.com)'
      });
      onClose();
    } else {
      setErrorMessage(res.error || 'Super Admin authorization failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white border border-white/20">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">PharmPulse Multi-Tenant POS</h2>
              <p className="text-xs text-teal-100">Medical Store Authentication & SaaS Workspaces</p>
            </div>
          </div>
          {/* Close button only visible when already authenticated */}
          {(currentSession || isSuperAdmin) && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        {activeTab === 'admin' ? (
          <div className="flex items-center justify-between px-6 py-3 border-b border-purple-200 dark:border-purple-800/60 bg-purple-50/70 dark:bg-purple-950/40">
            <button
              type="button"
              onClick={() => { setActiveTab('login'); setErrorMessage(null); }}
              className="text-xs font-bold text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-white flex items-center space-x-1 transition-colors cursor-pointer"
            >
              <span>← Return to Medical Store Login</span>
            </button>
            <div className="flex items-center space-x-1.5 text-xs font-bold text-purple-800 dark:text-purple-200">
              <Crown className="w-4 h-4 text-purple-600" />
              <span>SaaS Master Control Gateway</span>
            </div>
          </div>
        ) : (
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <button
              onClick={() => { setActiveTab('login'); setErrorMessage(null); }}
              className={`flex-1 py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold flex items-center justify-center space-x-1.5 sm:space-x-2 border-b-2 transition-all ${
                activeTab === 'login'
                  ? 'border-teal-600 text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Building2 className="w-4 h-4 shrink-0" />
              <span className="truncate">Staff / Owner Login</span>
            </button>

            <button
              onClick={() => { setActiveTab('register'); setErrorMessage(null); }}
              className={`flex-1 py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold flex items-center justify-center space-x-1.5 sm:space-x-2 border-b-2 transition-all ${
                activeTab === 'register'
                  ? 'border-teal-600 text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="truncate">Register New Medical Store</span>
            </button>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className={`mx-6 mt-4 p-3.5 rounded-xl border flex items-start space-x-3 text-xs sm:text-sm ${
            errorMessage.includes('Account limit reached') || errorMessage.includes('Max 2 devices')
              ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 shadow-sm'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300'
          }`}>
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold block">{errorMessage}</span>
              {(errorMessage.includes('Account limit reached') || errorMessage.includes('irsaad9118@gmail.com')) && (
                <div className="text-[11px] text-rose-700 dark:text-rose-300 pt-1 border-t border-rose-200 dark:border-rose-800/50 flex flex-wrap items-center gap-2">
                  <span>Contact SaaS Super Admin:</span>
                  <a 
                    href="mailto:irsaad9118@gmail.com?subject=Multi-Counter%20Device%20Add-on%20Request"
                    className="font-bold underline text-rose-900 dark:text-rose-100 hover:text-rose-950"
                  >
                    irsaad9118@gmail.com
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {/* TAB 1: STORE LOGIN */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4" autoComplete="off">
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Store Identifier (Store ID, Owner Phone, or DL Number)
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="Enter Store ID"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none dark:text-white font-medium placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {userRole === 'owner' 
                      ? 'Store Security Password or Owner PIN' 
                      : '4-Digit Staff PIN or Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(true)}
                    className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-semibold cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter Password"
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-form-type="other"
                    className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none dark:text-white placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Role-Based Login Selector */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Login Role & Access Level:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Option 1: Shop Owner / Admin */}
                  <div
                    onClick={() => {
                      setUserRole('owner');
                      setUserName('Store Owner');
                    }}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      userRole === 'owner'
                        ? 'border-teal-600 bg-teal-50/80 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center">
                          <Crown className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-xs">Store Owner / Admin</span>
                      </div>
                      {userRole === 'owner' && <CheckCircle2 className="w-4 h-4 text-teal-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                      <strong>Full Access:</strong> Inventory editing, PTR costs, profit margins, purchase orders, and analytics.
                    </p>
                  </div>

                  {/* Option 2: Salesman / Counter Staff */}
                  <div
                    onClick={() => {
                      setUserRole('staff');
                      setUserName('Counter Staff');
                    }}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      userRole === 'staff' || userRole === 'cashier'
                        ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                          <User className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-xs">Salesman / Staff</span>
                      </div>
                      {(userRole === 'staff' || userRole === 'cashier') && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                      <strong>Restricted POS:</strong> Fast billing, WhatsApp bills, customer search. Blocked from net profit &amp; PTR costs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Multi-Device Login Configuration */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-teal-600" />
                  <span>Multi-Device Counter Setup (Simultaneous Login):</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Your Name / Counter Person</label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="e.g. Rajesh (Owner) or Priya (Cashier)"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Device Label</label>
                    <input
                      type="text"
                      value={deviceName}
                      onChange={(e) => setDeviceName(e.target.value)}
                      placeholder="e.g. Counter 1 Tablet, Mobile Billing"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setDeviceType('mobile')}
                    className={`py-2 px-2 rounded-lg border text-xs flex items-center justify-center space-x-1.5 transition-all ${
                      deviceType === 'mobile'
                        ? 'bg-teal-50 border-teal-500 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200 font-semibold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mobile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeviceType('tablet')}
                    className={`py-2 px-2 rounded-lg border text-xs flex items-center justify-center space-x-1.5 transition-all ${
                      deviceType === 'tablet'
                        ? 'bg-teal-50 border-teal-500 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200 font-semibold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Tablet className="w-3.5 h-3.5" />
                    <span>Tablet</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeviceType('desktop')}
                    className={`py-2 px-2 rounded-lg border text-xs flex items-center justify-center space-x-1.5 transition-all ${
                      deviceType === 'desktop'
                        ? 'bg-teal-50 border-teal-500 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200 font-semibold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Billing PC</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-600/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <span>Authenticating Store Workspace...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Login & Launch Counter POS</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: REGISTER / ONBOARD NEW MEDICAL STORE */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Store / Pharmacy Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={regStoreName}
                    onChange={(e) => setRegStoreName(e.target.value)}
                    placeholder="e.g. LifeCare Medicos & Healthcare"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Owner Full Name
                  </label>
                  <input
                    type="text"
                    value={regOwnerName}
                    onChange={(e) => setRegOwnerName(e.target.value)}
                    placeholder="e.g. Anil Kumar Gupta"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Owner WhatsApp / Mobile Phone *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="tel"
                      required
                      value={regOwnerPhone}
                      onChange={(e) => setRegOwnerPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Drug License (DL) Number *
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={regDlNumber}
                      onChange={(e) => setRegDlNumber(e.target.value)}
                      placeholder="e.g. DL-20B/4921 & 21B/4922"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Store Login Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Create security password"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Store GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    value={regGstin}
                    onChange={(e) => setRegGstin(e.target.value)}
                    placeholder="15-digit GSTIN"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Store Address / Location
                  </label>
                  <input
                    type="text"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    placeholder="Shop No, Market, City, State"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    UPI ID for Instant QR Billing
                  </label>
                  <input
                    type="text"
                    value={regUpiId}
                    onChange={(e) => setRegUpiId(e.target.value)}
                    placeholder="e.g. medstore@okaxis"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 dark:text-white"
                  />
                </div>
              </div>

              {/* Plan Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Choose Subscription Tier
                  </label>
                  <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Auto-activated on store creation
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Tier 1: Starter Monthly */}
                  <div 
                    onClick={() => setRegPlan('starter_299_mo')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      regPlan === 'starter_299_mo'
                        ? 'border-teal-500 bg-teal-50/80 dark:bg-teal-950/40 text-teal-950 dark:text-teal-200 ring-2 ring-teal-500 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 hover:border-teal-300 bg-white dark:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Starter Monthly</span>
                        {regPlan === 'starter_299_mo' && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />}
                      </div>
                      <div className="text-sm sm:text-base font-black text-teal-700 dark:text-teal-400 mt-1">
                        ₹299 <span className="text-[11px] font-medium text-slate-500">/ mo</span>
                      </div>
                    </div>
                    <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-medium">
                      2 Devices Synced • Fast POS Billing • WhatsApp Bills
                    </div>
                  </div>

                  {/* Tier 2: Pro Annual (POPULAR Badge) */}
                  <div 
                    onClick={() => setRegPlan('pro_1999_yr')}
                    className={`p-3 rounded-xl border cursor-pointer relative transition-all flex flex-col justify-between ${
                      regPlan === 'pro_1999_yr'
                        ? 'border-teal-500 bg-teal-50/80 dark:bg-teal-950/40 text-teal-950 dark:text-teal-200 ring-2 ring-teal-500 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 hover:border-teal-300 bg-white dark:bg-slate-800/60'
                    }`}
                  >
                    <div className="absolute -top-2 right-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      POPULAR
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Pro Annual</span>
                        {regPlan === 'pro_1999_yr' && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />}
                      </div>
                      <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        Save over 44%
                      </div>
                      <div className="text-sm sm:text-base font-black text-teal-700 dark:text-teal-400 mt-0.5">
                        ₹1,999 <span className="text-[11px] font-medium text-slate-500">/ yr</span>
                      </div>
                    </div>
                    <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-medium">
                      2 Devices Synced • Full Inventory & Expiry • WhatsApp Bills
                    </div>
                  </div>

                  {/* Tier 3: Enterprise Growth */}
                  <div 
                    onClick={() => setRegPlan('enterprise_2999_yr')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      regPlan === 'enterprise_2999_yr'
                        ? 'border-teal-500 bg-teal-50/80 dark:bg-teal-950/40 text-teal-950 dark:text-teal-200 ring-2 ring-teal-500 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 hover:border-teal-300 bg-white dark:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Enterprise Growth</span>
                        {regPlan === 'enterprise_2999_yr' && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />}
                      </div>
                      <div className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                        Multi-Counter Master
                      </div>
                      <div className="text-sm sm:text-base font-black text-teal-700 dark:text-teal-400 mt-0.5">
                        ₹2,999 <span className="text-[11px] font-medium text-slate-500">/ yr</span>
                      </div>
                    </div>
                    <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-medium">
                      Up to 10 Devices Synced • Multi-Counter Live Sync • Full SaaS Suite
                    </div>
                  </div>
                </div>

                {/* Live UPI QR Payment & Setup Calculation */}
                <div className="mt-3 p-3.5 bg-gradient-to-br from-slate-50 to-teal-50/40 dark:from-slate-800/70 dark:to-teal-950/20 rounded-2xl border border-teal-200/80 dark:border-teal-900/60 flex flex-col sm:flex-row items-center gap-4">
                  {/* Dynamic QR Code */}
                  <div className="shrink-0 bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center">
                    {qrDataUrl ? (
                      <img 
                        src={qrDataUrl} 
                        alt="PharmPulse SaaS UPI QR" 
                        className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-lg"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-100 flex items-center justify-center rounded-lg">
                        <QrCode className="w-8 h-8 text-slate-400 animate-pulse" />
                      </div>
                    )}
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                      Scan with any UPI App
                    </span>
                  </div>

                  {/* Pricing and Details Breakdown */}
                  <div className="flex-1 min-w-0 space-y-1.5 w-full text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {SUBSCRIPTION_TIERS[regPlan]?.name || 'Pro Annual'} Plan
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300">
                        {SUBSCRIPTION_TIERS[regPlan]?.durationDays === 30 ? '30 Days Validity' : '365 Days (1 Year) Validity'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      Calculated Amount: <span className="font-mono font-black text-sm text-teal-700 dark:text-teal-300">₹{SUBSCRIPTION_TIERS[regPlan]?.price?.toLocaleString('en-IN')}</span>{' '}
                      <span className="text-[11px] text-slate-400">({SUBSCRIPTION_TIERS[regPlan]?.displayPrice})</span>
                    </div>

                    {/* UPI ID & Supported Apps */}
                    <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                        <span>UPI: <strong className="text-slate-900 dark:text-white">irsaad9118@okhdfcbank</strong></span>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="text-teal-600 hover:text-teal-700 p-0.5 transition-colors"
                          title="Copy UPI ID"
                        >
                          {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">
                        GPay • PhonePe • Paytm • BHIM
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-600/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 mt-4 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Creating Isolated Store Workspace...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Create Store Workspace & Start Billing</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: SAAS SUPER ADMIN (Master Access) */}
          {activeTab === 'admin' && (
            <form onSubmit={handleAdminSubmit} className="space-y-4" autoComplete="off">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800/60 flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div className="text-xs text-purple-900 dark:text-purple-200">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>SaaS Master Control Gateway</span>
                    <span className="px-1.5 py-0.2 bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 rounded text-[10px] font-mono">
                      Master Key
                    </span>
                  </div>
                  <div className="mt-0.5 text-purple-700 dark:text-purple-300">
                    Restricted Platform Administrator Access. Authorized personnel only.
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Master Email
                </label>
                <div className="relative">
                  <Crown className="w-4 h-4 absolute left-3 top-3 text-purple-500" />
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="Enter Master Email"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-xl focus:ring-2 focus:ring-purple-500 dark:text-white font-medium placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Master Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter Master Password"
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-form-type="other"
                    className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 dark:text-white font-mono placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <div className="font-semibold text-slate-700 dark:text-slate-200">Super Admin Master Capabilities:</div>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <li>Onboard new medical stores & generate Store ID / Owner passwords</li>
                  <li>Direct WhatsApp credentials share with pharmacy owners</li>
                  <li>Centralized multi-tenant fleet overview & real-time revenue metrics</li>
                  <li>1-Click Activate / Deactivate store subscriptions & device limit policies</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-purple-600/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Verifying Master Credentials...</span>
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    <span>Enter SaaS Master Admin Dashboard</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer Discrete Master Gateway */}
        {activeTab !== 'admin' && (
          <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-center flex items-center justify-between text-[11px] text-slate-400">
            <span>PharmPulse Multi-Tenant Platform</span>
            <button
              type="button"
              onClick={() => { setActiveTab('admin'); setErrorMessage(null); }}
              className="hover:text-purple-600 dark:hover:text-purple-400 font-medium transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Platform Super Admin Gateway</span>
            </button>
          </div>
        )}
      </div>

      {/* Forgot Password Self-Service Recovery Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
        initialStoreId={loginIdentifier}
        onPasswordResetSuccess={(resetStoreId) => {
          setLoginIdentifier(resetStoreId);
          setLoginPassword('');
          setErrorMessage(null);
        }}
      />
    </div>
  );
};
