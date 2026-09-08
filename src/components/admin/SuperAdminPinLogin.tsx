import React, { useState } from 'react';
import { 
  ShieldCheck, 
  KeyRound, 
  Lock, 
  ArrowRight, 
  Store, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Sparkles,
  Server,
  Building2,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePharmacy } from '../../context/PharmacyContext';
import { verifyMasterPin } from '../../utils/storeRegistry';

interface SuperAdminPinLoginProps {
  onSuccess?: () => void;
  onSwitchToStore?: () => void;
}

export const SuperAdminPinLogin: React.FC<SuperAdminPinLoginProps> = ({
  onSuccess,
  onSwitchToStore
}) => {
  const { superAdminLogin, isLoading } = useAuth();
  const { addToast } = usePharmacy();

  const [authMode, setAuthMode] = useState<'pin' | 'password'>('pin');
  const [pinDigits, setPinDigits] = useState<string>('');
  const [masterEmail, setMasterEmail] = useState<string>('admin@pharmpulse.com');
  const [masterPassword, setMasterPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Quick PIN Pad Input
  const handleNumberClick = (num: string) => {
    if (pinDigits.length < 6) {
      const nextPin = pinDigits + num;
      setPinDigits(nextPin);
      setErrorMessage(null);

      // Auto-submit on 4-digit Master PIN
      if (nextPin === '1417' || nextPin === '1817' || nextPin === '2026' || nextPin === '9999' || nextPin === '0000') {
        submitWithPin(nextPin);
      }
    }
  };

  const handleDeleteDigit = () => {
    setPinDigits(prev => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleClearPin = () => {
    setPinDigits('');
    setErrorMessage(null);
  };

  const submitWithPin = async (pinToVerify: string) => {
    setIsVerifying(true);
    setErrorMessage(null);

    // Accept valid Master PINs / Password
    const isValid = verifyMasterPin(pinToVerify);
    if (isValid) {
      const res = await superAdminLogin('admin@pharmpulse.com', 'admin@RK');
      setIsVerifying(false);
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Master Access Granted',
          message: 'Welcome to Super Admin Master SaaS Control Hub'
        });
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage('Invalid Security Key. Access Denied.');
        addToast({
          type: 'error',
          title: 'Access Denied',
          message: 'Invalid Security Key. Access Denied.'
        });
        setPinDigits('');
      }
    } else {
      setIsVerifying(false);
      setErrorMessage('Invalid Security Key. Access Denied.');
      addToast({
        type: 'error',
        title: 'Access Denied',
        message: 'Invalid Security Key. Access Denied.'
      });
      setPinDigits('');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPassword.trim()) {
      setErrorMessage('Please enter Security PIN / Password.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    const isMatch = verifyMasterPin(masterPassword.trim());
    if (isMatch) {
      const res = await superAdminLogin(masterEmail.trim() || 'admin@pharmpulse.com', 'admin@RK');
      setIsVerifying(false);

      if (res.success) {
        addToast({
          type: 'success',
          title: 'Master Access Granted',
          message: 'Welcome to Super Admin Master SaaS Control Hub'
        });
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage('Invalid Security Key. Access Denied.');
        addToast({
          type: 'error',
          title: 'Access Denied',
          message: 'Invalid Security Key. Access Denied.'
        });
      }
    } else {
      setIsVerifying(false);
      setErrorMessage('Invalid Security Key. Access Denied.');
      addToast({
        type: 'error',
        title: 'Access Denied',
        message: 'Invalid Security Key. Access Denied.'
      });
    }
  };

  return (
    <div 
      id="super-admin-gateway"
      className="min-h-screen min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100 font-sans selection:bg-purple-500 selection:text-white"
    >
      {/* Background ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      {/* Top Header Bar */}
      <div className="w-full max-w-md flex items-center justify-between px-2 mb-3 relative z-20">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-300">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
          <span>Super Admin Security Gateway</span>
        </div>
      </div>

      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-purple-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-950/40 relative z-10 space-y-6">
        
        {/* Top return link to Store Login */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onSwitchToStore}
            id="btn-return-store-login"
            className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Chemist Store Login</span>
          </button>
          
          <span className="text-[11px] font-bold text-purple-400 bg-purple-950/60 px-2.5 py-1 rounded-full border border-purple-500/30 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-purple-400" />
            <span>Master Security Gateway</span>
          </span>
        </div>

        {/* Header Icon & Title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-purple-900/40 border border-purple-400/30">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Super Admin Master Hub
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Authorized multi-tenant control center. Enter Master PIN or credentials to access fleet.
          </p>
        </div>

        {/* Mode Toggle Pills */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setAuthMode('pin'); setErrorMessage(null); }}
            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'pin'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Master PIN Keypad</span>
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('password'); setErrorMessage(null); }}
            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'password'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Password Login</span>
          </button>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* MODE 1: MASTER PIN KEYPAD */}
        {authMode === 'pin' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* PIN Indicator Dots */}
            <div className="flex items-center justify-center gap-3 py-2">
              {[0, 1, 2, 3].map((idx) => {
                const filled = pinDigits.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full transition-all duration-150 border ${
                      filled 
                        ? 'bg-purple-500 border-purple-400 scale-110 shadow-md shadow-purple-500/50' 
                        : 'bg-slate-950 border-slate-700'
                    }`}
                  />
                );
              })}
            </div>

            {/* 3x4 Number Keypad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleNumberClick(num)}
                  disabled={isVerifying || isLoading}
                  className="h-12 rounded-2xl bg-slate-950 hover:bg-purple-950/60 active:bg-purple-900 border border-slate-800 hover:border-purple-500/40 text-lg font-bold text-white transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClearPin}
                disabled={isVerifying || isLoading || pinDigits.length === 0}
                className="h-12 rounded-2xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-white transition-all flex items-center justify-center cursor-pointer disabled:opacity-30"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleNumberClick('0')}
                disabled={isVerifying || isLoading}
                className="h-12 rounded-2xl bg-slate-950 hover:bg-purple-950/60 active:bg-purple-900 border border-slate-800 hover:border-purple-500/40 text-lg font-bold text-white transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleDeleteDigit}
                disabled={isVerifying || isLoading || pinDigits.length === 0}
                className="h-12 rounded-2xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-sm font-semibold text-slate-400 hover:text-white transition-all flex items-center justify-center cursor-pointer disabled:opacity-30"
              >
                ⌫
              </button>
            </div>

            {/* Direct Submit PIN Button */}
            <button
              type="button"
              onClick={() => submitWithPin(pinDigits)}
              disabled={isVerifying || isLoading || pinDigits.length === 0}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-purple-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[46px] active:scale-98"
            >
              {isVerifying || isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Master PIN...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Unlock Master Control Hub</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* MODE 2: EMAIL & PASSWORD FORM */}
        {authMode === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4 animate-in fade-in duration-150">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-300">
                Master Admin Email
              </label>
              <input
                type="email"
                value={masterEmail}
                onChange={(e) => setMasterEmail(e.target.value)}
                placeholder="admin@pharmpulse.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder:text-slate-600"
                autoComplete="off"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-300">
                Master Security Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="Enter Security PIN / Password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder:text-slate-600 tracking-wider"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifying || isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-purple-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[46px] active:scale-98 mt-2"
            >
              {isVerifying || isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Access Master Control Hub</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
