import React, { useState, useEffect } from 'react';
import { 
  Store, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Users, 
  Layers, 
  Sparkles, 
  Save, 
  X, 
  AlertCircle,
  Smartphone
} from 'lucide-react';
import { StoreWorkspace, SubscriptionPlanKey } from '../../types/pharmacy';
import { updateStorePermissionsInRegistry, getRegisteredStores } from '../../utils/storeRegistry';

interface EditStoreModalProps {
  store: StoreWorkspace | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedStore: StoreWorkspace) => void;
}

export const EditStoreModal: React.FC<EditStoreModalProps> = ({
  store,
  isOpen,
  onClose,
  onSuccess
}) => {
  if (!isOpen || !store) return null;

  const regRecord = getRegisteredStores().find(r => r.storeId === store.storeId);
  const initialPass = regRecord?.initialPassword || regRecord?.password || (store.storeId === 'STORE-APEX01' ? 'apex123' : store.storeId === 'STORE-SANJ02' ? 'sanj123' : 'care123');

  const [storeName, setStoreName] = useState<string>(store.storeName);
  const [ownerName, setOwnerName] = useState<string>(store.ownerName);
  const [ownerPhone, setOwnerPhone] = useState<string>(store.ownerPhone);
  const [password, setPassword] = useState<string>(initialPass);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [allowedUserLimit, setAllowedUserLimit] = useState<number>(store.allowedUserLimit ?? 0);
  const [status, setStatus] = useState<StoreWorkspace['status']>(store.status || 'active');
  const [plan, setPlan] = useState<SubscriptionPlanKey | string>(store.subscriptionPlan || 'pro_1999_yr');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (store) {
      setStoreName(store.storeName);
      setOwnerName(store.ownerName);
      setOwnerPhone(store.ownerPhone);
      setPassword(initialPass);
      setAllowedUserLimit(store.allowedUserLimit ?? 0);
      setStatus(store.status || 'active');
      setPlan(store.subscriptionPlan || 'pro_1999_yr');
      setErrorMsg(null);
    }
  }, [store]);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$';
    let res = '';
    for (let i = 0; i < 8; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
    setShowPassword(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    setIsSaving(true);
    setErrorMsg(null);

    try {
      // 1. Update Permissions on backend
      const permRes = await fetch(`/api/admin/stores/${store.storeId}/update-permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName,
          ownerName,
          ownerPhone,
          status,
          subscriptionPlan: plan,
          allowedUserLimit: Number(allowedUserLimit)
        })
      });

      // 2. Update Password if changed
      if (password.trim()) {
        await fetch(`/api/admin/stores/${store.storeId}/update-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newPassword: password.trim()
          })
        });
      }

      // 3. Update Registry
      updateStorePermissionsInRegistry(store.storeId, {
        storeName,
        ownerName,
        ownerPhone,
        status,
        subscriptionPlan: plan as any,
        allowedUserLimit: Number(allowedUserLimit),
        password: password.trim() || undefined
      });

      const permData = await permRes.json();
      if (permRes.ok && permData.success) {
        onSuccess({
          ...store,
          storeName,
          ownerName,
          ownerPhone,
          status,
          subscriptionPlan: plan as any,
          allowedUserLimit: Number(allowedUserLimit)
        });
        onClose();
      } else {
        setErrorMsg(permData.error || 'Failed to save store permissions.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Connection error while saving permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-800">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Edit Store Password & Permissions
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Store ID: {store.storeId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Store Name & Owner Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Medical Store Name
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium dark:text-white focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Chemist Owner Name
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium dark:text-white focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>

          {/* Owner Mobile & Drug License */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Owner Mobile (+91)
              </label>
              <input
                type="tel"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-medium dark:text-white focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Status Account State
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold dark:text-white focus:ring-2 focus:ring-purple-500"
              >
                <option value="active">Active (Access Granted)</option>
                <option value="trial">Trial Period</option>
                <option value="deactivated">Deactivated (Locked Out)</option>
              </select>
            </div>
          </div>

          {/* Reset / Edit Password */}
          <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-purple-600" />
                <span>Store Chemist Password</span>
              </label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-[11px] text-purple-600 hover:text-purple-700 dark:text-purple-400 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto-Generate</span>
              </button>
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Set new store password"
                className="w-full pl-3 pr-10 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold dark:text-white tracking-wider"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              The chemist uses this password together with Store ID <strong>{store.storeId}</strong> to sign in.
            </p>
          </div>

          {/* Allowed Device / User Limit */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
              <span>Allowed Device / Counter Limit (Licensing Cap)</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3, 5, 8, 10].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAllowedUserLimit(val)}
                  className={`py-1.5 text-xs font-bold rounded-xl border transition-all ${
                    allowedUserLimit === val
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                  }`}
                >
                  {val === 0 ? 'Unlimited' : `${val} Devices`}
                </button>
              ))}
            </div>
          </div>

          {/* Subscription Plan */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span>Assigned Subscription Tier</span>
            </label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold dark:text-white"
            >
              <option value="starter_299_mo">Starter Monthly (₹299/mo)</option>
              <option value="pro_1999_yr">Pro Annual (₹1,999/yr) - Recommended</option>
              <option value="enterprise_2999_yr">Enterprise Growth (₹2,999/yr)</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-md shadow-purple-900/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isSaving ? (
                <span>Saving Updates...</span>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Permissions & Password</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
