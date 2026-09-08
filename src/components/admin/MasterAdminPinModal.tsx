import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, X, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePharmacy } from '../../context/PharmacyContext';
import { verifyMasterPin } from '../../utils/storeRegistry';

interface MasterAdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const MasterAdminPinModal: React.FC<MasterAdminPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { superAdminLogin, navigateToSuperAdmin } = useAuth();
  const { addToast } = usePharmacy();

  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setShowPin(false);
      setErrorMsg(null);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerifyPin = async (pinValueToVerify?: string) => {
    const targetPin = (pinValueToVerify !== undefined ? pinValueToVerify : pin).trim();
    if (!targetPin) {
      setErrorMsg('Invalid Security Key. Access Denied.');
      addToast({
        type: 'error',
        title: 'Access Denied',
        message: 'Invalid Security Key. Access Denied.'
      });
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);

    const isMatched = verifyMasterPin(targetPin);

    if (isMatched) {
      const res = await superAdminLogin('admin@pharmpulse.com', 'admin@RK');
      setIsVerifying(false);

      if (res.success) {
        addToast({
          type: 'success',
          title: 'Master Admin Access Granted',
          message: 'Welcome to Super Admin Command Hub'
        });
        onClose();
        if (onSuccess) {
          onSuccess();
        } else {
          navigateToSuperAdmin();
        }
      } else {
        setErrorMsg(res.error || 'Invalid Security Key. Access Denied.');
        addToast({
          type: 'error',
          title: 'Access Denied',
          message: res.error || 'Invalid Security Key. Access Denied.'
        });
      }
    } else {
      setIsVerifying(false);
      setErrorMsg('Invalid Security Key. Access Denied.');
      addToast({
        type: 'error',
        title: 'Access Denied',
        message: 'Invalid Security Key. Access Denied.'
      });
      setPin('');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([120, 60, 120]);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerifyPin();
  };

  return (
    <div 
      id="master-admin-pin-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm bg-slate-900 border border-purple-500/40 rounded-3xl p-6 shadow-2xl shadow-purple-950/70 text-white relative animate-in zoom-in-95 duration-200 space-y-5">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close Dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-purple-950/60 border border-purple-400/30">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight flex items-center justify-center gap-1.5">
              <span>🛡️ Master Admin Authentication</span>
            </h3>
            <p className="text-xs text-purple-200/80 mt-1">
              Secret 5-Tap trigger activated. Master access authorization required.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Security Authentication
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Enter Security PIN / Password"
                autoComplete="off"
                data-lpignore="true"
                className="w-full bg-slate-950 border border-purple-500/50 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 rounded-xl pl-4 pr-11 py-3 text-white placeholder-slate-500 text-sm font-medium tracking-wide transition-all"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                title={showPin ? 'Hide PIN' : 'Show PIN'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-950/70 border border-rose-800 text-xs font-semibold text-rose-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isVerifying || !pin}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-purple-950/60 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isVerifying ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <span>Verify & Open Admin Hub</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
