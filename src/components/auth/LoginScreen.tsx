import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  Pill, 
  Store, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  KeyRound, 
  Smartphone, 
  Mail, 
  User, 
  Phone, 
  FileText, 
  Sparkles,
  Lock,
  Building2,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { MasterAdminPinModal } from '../admin/MasterAdminPinModal';

export const LoginScreen: React.FC = () => {
  const { 
    login, 
    register, 
    isLoading, 
    navigateToSuperAdmin, 
    superAdminLogin, 
    revocationNotice, 
    clearRevocationNotice 
  } = useAuth();
  const { addToast } = usePharmacy();
  
  // Public tabs: 'login' | 'register'
  const [viewMode, setViewMode] = useState<'login' | 'register'>('login');

  // ==========================================
  // 1. LOGIN FORM STATE (100% Blank by Default)
  // ==========================================
  const [loginIdentifier, setLoginIdentifier] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState<boolean>(false);
  const [showMasterPinModal, setShowMasterPinModal] = useState<boolean>(false);

  // Secret Admin Trigger: 5 Consecutive Taps on Pill Logo within 3 seconds
  const tapCountRef = useRef<number>(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoSecretTap = () => {
    tapCountRef.current += 1;

    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
    }

    if (tapCountRef.current >= 5) {
      // Secret 5-Tap Triggered!
      tapCountRef.current = 0;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 150]);
      }
      setShowMasterPinModal(true);
    } else {
      // 3-second rolling window for 5 consecutive taps
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 3000);
    }
  };

  // 3-Second Long Press on Brand Icon to Trigger Super Admin Gateway (Alternative gesture)
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const HOLD_DURATION_MS = 3000;

  const startHold = (e: React.SyntheticEvent) => {
    setIsHolding(true);
    setHoldProgress(0);

    const startTime = Date.now();

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, Math.round((elapsed / HOLD_DURATION_MS) * 100));
      setHoldProgress(progress);
    }, 50);

    holdTimerRef.current = setTimeout(() => {
      cleanupHold();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 150]);
      }
      setShowMasterPinModal(true);
    }, HOLD_DURATION_MS);
  };

  const cleanupHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setIsHolding(false);
    setHoldProgress(0);
  };

  useEffect(() => {
    return () => {
      cleanupHold();
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
      }
    };
  }, []);

  // ==========================================
  // 2. REGISTER NEW STORE FORM STATE
  // ==========================================
  const [regStoreName, setRegStoreName] = useState<string>('');
  const [regOwnerName, setRegOwnerName] = useState<string>('');
  const [regMobile, setRegMobile] = useState<string>('');
  const [regDlNumber, setRegDlNumber] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);

  // Common UI State
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Handle Clean Store Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanId = loginIdentifier.trim();
    const cleanPass = loginPassword.trim();

    if (!cleanId) {
      setErrorMsg('Please enter your Store ID or Registered Email.');
      return;
    }

    if (!cleanPass) {
      setErrorMsg('Please enter your Password / PIN.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Check Super Admin Master Credentials:
      // (storeId.toLowerCase() === 'admin' || storeId === '1417' || storeId === '1817') AND (password === 'admin@RK' || password === '1417' || password === '1817')
      const isSuperAdminId = cleanId.toLowerCase() === 'admin' || cleanId === '1417' || cleanId === '1817' || cleanId.toLowerCase() === 'admin@pharmpulse.com' || cleanId.toLowerCase() === 'masteradmin';
      const isSuperAdminPass = cleanPass === 'admin@RK' || cleanPass.toLowerCase() === 'admin@rk' || cleanPass === '1417' || cleanPass === '1817' || cleanPass === 'MasterAdmin@2026';

      if (isSuperAdminId && isSuperAdminPass) {
        const adminRes = await superAdminLogin(cleanId, cleanPass);
        if (adminRes.success) {
          addToast({
            type: 'success',
            title: 'Super Admin Access Granted',
            message: 'Switched to SaaS Master Command Hub'
          });
          navigateToSuperAdmin();
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Chemist Store Login via Multi-tenant Store Authentication
      const res = await login({
        identifier: cleanId,
        password: cleanPass
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Invalid Store ID or Password.');
        addToast({
          type: 'error',
          title: 'Login Failed',
          message: res.error || 'Invalid Store ID or Password.'
        });
        setIsSubmitting(false);
      } else {
        addToast({
          type: 'success',
          title: 'Store POS Logged In',
          message: `Connected to ${res.store?.storeName || cleanId}`
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Connection error. Please retry.');
      setIsSubmitting(false);
    }
  };

  // Handle Clean Store Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!regStoreName.trim()) {
      setErrorMsg('Please enter your Medical Store Name.');
      return;
    }
    if (!regOwnerName.trim()) {
      setErrorMsg('Please enter Owner Name.');
      return;
    }
    if (!regMobile.trim() || regMobile.trim().length < 10) {
      setErrorMsg('Please enter a valid 10-digit Mobile Number.');
      return;
    }
    if (!regDlNumber.trim()) {
      setErrorMsg('Please enter Drug License (DL) Number.');
      return;
    }
    if (!regPassword.trim()) {
      setErrorMsg('Please set a secure password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await register({
        storeName: regStoreName.trim(),
        ownerName: regOwnerName.trim(),
        ownerPhone: regMobile.trim(),
        dlNumber: regDlNumber.trim(),
        email: regEmail.trim() || undefined,
        password: regPassword.trim()
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to register store.');
        setIsSubmitting(false);
      } else {
        addToast({
          type: 'success',
          title: 'Store Created Successfully',
          message: `Your store workspace has been initialized!`
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please retry.');
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      id="pharmpulse-login-container" 
      className="min-h-screen min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100 font-sans selection:bg-teal-500 selection:text-white relative"
    >
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />
      </div>

      {/* Clean Login Screen Card */}
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-950/60 relative z-10 space-y-6">
        
        {/* Brand Icon & Heading with Secret 5-Tap & 3-Second Hold Gate */}
        <div className="text-center space-y-2 select-none">
          <div 
            id="login-brand-icon-trigger"
            onClick={handleLogoSecretTap}
            onMouseDown={startHold}
            onMouseUp={cleanupHold}
            onMouseLeave={cleanupHold}
            onTouchStart={startHold}
            onTouchEnd={cleanupHold}
            onTouchCancel={cleanupHold}
            className="relative inline-block cursor-pointer group select-none active:scale-95 transition-transform"
            title="PharmPulse Medical POS"
          >
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-teal-900/30 border border-teal-400/20 transition-all ${
              isHolding ? 'scale-110 ring-4 ring-purple-500 animate-pulse bg-gradient-to-tr from-purple-600 to-indigo-600' : 'group-hover:scale-105'
            }`}>
              <Pill className="w-7 h-7 text-white" />
            </div>

            {/* Circular Hold Progress Ring */}
            {isHolding && (
              <div className="absolute -inset-2 flex items-center justify-center pointer-events-none">
                <svg className="w-18 h-18 -rotate-90">
                  <circle
                    cx="36"
                    cy="36"
                    r="30"
                    className="stroke-purple-900/40 fill-none"
                    strokeWidth="4"
                  />
                  <circle
                    cx="36"
                    cy="36"
                    r="30"
                    className="stroke-purple-400 fill-none transition-all duration-75 ease-linear"
                    strokeWidth="4"
                    strokeDasharray={188.4}
                    strokeDashoffset={188.4 - (188.4 * holdProgress) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-[9px] font-black text-purple-300">
                  {Math.ceil((HOLD_DURATION_MS * (100 - holdProgress)) / 100000)}s
                </div>
              </div>
            )}
          </div>

          <h1 
            onClick={handleLogoSecretTap}
            className="text-2xl sm:text-3xl font-black tracking-tight text-white cursor-pointer hover:text-teal-400 transition-colors"
            title="PharmPulse Medical POS"
          >
            PharmPulse
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Medical Store Billing, Inventory & Expiry Management System
          </p>
        </div>

        {/* Public Tab Navigation: Login vs Register */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setViewMode('login');
              setErrorMsg(null);
            }}
            id="tab-login-btn"
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              viewMode === 'login'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Chemist Login</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode('register');
              setErrorMsg(null);
            }}
            id="tab-register-btn"
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              viewMode === 'register'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Register New Store</span>
          </button>
        </div>

        {/* Revocation Notice if Session Was Terminated by Administrator */}
        {revocationNotice && (
          <div 
            id="revocation-notice-alert" 
            className="p-3.5 bg-rose-950/80 border border-rose-600 text-rose-200 rounded-xl text-xs flex items-start gap-2.5 shadow-lg shadow-rose-950/50 animate-bounce"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-rose-100">Session Terminated</p>
              <p className="mt-0.5 text-rose-300 font-medium">{revocationNotice}</p>
            </div>
            <button 
              type="button" 
              onClick={clearRevocationNotice} 
              className="text-rose-400 hover:text-rose-200 text-base leading-none p-0.5 cursor-pointer"
              title="Dismiss"
            >
              &times;
            </button>
          </div>
        )}

        {/* Dynamic Error Alert */}
        {errorMsg && (
          <div 
            id="login-error-alert" 
            className="p-3.5 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-start gap-2.5 animate-shake"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span className="flex-1 font-medium">{errorMsg}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* 1. MEDICAL STORE CHEMIST LOGIN (Store ID + Password)      */}
        {/* ========================================================= */}
        {viewMode === 'login' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <form onSubmit={handleLoginSubmit} className="space-y-4" autoComplete="off">
              
              {/* Store ID / Email Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-200">
                  Store ID / Registered Email <span className="text-teal-400">*</span>
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-identifier"
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="e.g. STORE-101 or chemist@gmail.com"
                    className="w-full bg-slate-950 border border-slate-700/80 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-500"
                    autoComplete="off"
                    required
                  />
                </div>
              </div>

              {/* Password / PIN Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-200">
                    Store Password / PIN <span className="text-teal-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(true)}
                    id="forgot-password-link"
                    className="text-xs text-teal-400 hover:text-teal-300 font-semibold cursor-pointer transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter store password"
                    className="w-full bg-slate-950 border border-slate-700/80 text-white rounded-xl pl-10 pr-11 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-500 tracking-wider"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                    title={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Login Button */}
              <button
                type="submit"
                id="login-submit-btn"
                disabled={isSubmitting || isLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-sm tracking-wide shadow-lg shadow-teal-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed min-h-[48px] active:scale-98 mt-2"
              >
                {isSubmitting || isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Login to Store</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. REGISTER / NEW STORE SIGN UP TAB                       */}
        {/* ========================================================= */}
        {viewMode === 'register' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5" autoComplete="off">
              {/* Store Name */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-200">
                  Medical Store Name <span className="text-teal-400">*</span>
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reg-store-name"
                    type="text"
                    value={regStoreName}
                    onChange={(e) => setRegStoreName(e.target.value)}
                    placeholder="e.g. Apex Medicos & Healthcare"
                    className="w-full bg-slate-950 border border-slate-700/80 text-white rounded-xl pl-10 pr-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-500"
                    autoComplete="off"
                    required
                  />
                </div>
              </div>

              {/* Grid: Owner Name & Mobile Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-200">
                    Owner Name <span className="text-teal-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reg-owner-name"
                      type="text"
                      value={regOwnerName}
                      onChange={(e) => setRegOwnerName(e.target.value)}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full bg-slate-950 border border-slate-700/80 text-white rounded-xl pl-10 pr-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-500"
                      autoComplete="off"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-200">
                    Mobile Number <span className="text-teal-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reg-mobile"
                      type="tel"
                      value={regMobile}
                      onChange={(e) => setRegMobile(e.target.value)}
                      placeholder="10-digit mobile"
                      className="w-full bg-slate-950 border border-slate-700/80 text-white rounded-xl pl-10 pr-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-500"
                      autoComplete="off"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Grid: Drug License (DL) & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-200">
                    Drug License (DL) <span className="text-teal-400">*</span>
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reg-dl-number"
                      type="text"
                      value={regDlNumber}
                      onChange={(e) => setRegDlNumber(e.target.value)}
                      placeholder="e.g. DL-20B/3891"
                      className="w-full bg-slate-950 border border-slate-700/80 text-white rounded-xl pl-10 pr-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-500"
                      autoComplete="off"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-200">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reg-email"
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="owner@gmail.com"
                      className="w-full bg-slate-950 border border-slate-700/80 text-white rounded-xl pl-10 pr-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-500"
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>

              {/* Set Password */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-200">
                  Set Password <span className="text-teal-400">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reg-password"
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full bg-slate-950 border border-slate-700/80 text-white rounded-xl pl-10 pr-11 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-500 tracking-wider"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                    title={showRegPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Register Button */}
              <button
                type="submit"
                id="register-submit-btn"
                disabled={isSubmitting || isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-sm tracking-wide shadow-lg shadow-teal-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed min-h-[46px] active:scale-98 mt-2"
              >
                {isSubmitting || isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Provisioning Store Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Create Store & Launch POS</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

      </div>

      {/* Footer info */}
      <div className="mt-6 text-center text-xs text-slate-400 z-10 flex items-center justify-center gap-2">
        <span>PharmPulse Medical POS</span>
        <span>•</span>
        <span className="flex items-center gap-1 text-slate-400">
          <Smartphone className="w-3.5 h-3.5 text-slate-400" />
          <span>Multi-Device Sync</span>
        </span>
      </div>

      {/* Forgot Password Self-Service Recovery Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
        initialStoreId={loginIdentifier}
        onPasswordResetSuccess={(resetStoreId) => {
          setLoginIdentifier(resetStoreId);
          setLoginPassword('');
          setErrorMsg(null);
          setViewMode('login');
        }}
      />

      {/* Secret Master Admin PIN Dialog */}
      <MasterAdminPinModal
        isOpen={showMasterPinModal}
        onClose={() => setShowMasterPinModal(false)}
        onSuccess={() => {
          setShowMasterPinModal(false);
          navigateToSuperAdmin();
        }}
      />
    </div>
  );
};
