import React from 'react';
import { ShieldAlert, Phone, Mail, RotateCcw, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const DeactivatedStoreNotice: React.FC = () => {
  const { currentStore, setAuthModalOpen } = useAuth();

  if (currentStore?.status !== 'deactivated') return null;

  return (
    <div className="bg-rose-600 text-white px-4 py-3 shadow-md border-b border-rose-700">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center space-x-2.5">
          <ShieldAlert className="w-5 h-5 shrink-0 text-rose-200 animate-bounce" />
          <div>
            <span className="font-bold">Store Account Suspended / Deactivated:</span>{' '}
            <span>{currentStore.storeName} ({currentStore.storeId}) billing is paused due to subscription status.</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <a
            href="mailto:Irsaad9118@gmail.com?subject=PharmPulse Store Account Reactivation Request"
            className="px-3 py-1.5 bg-white text-rose-700 font-bold rounded-lg hover:bg-rose-50 text-xs transition-colors shadow-xs"
          >
            Contact Support (Irsaad9118@gmail.com)
          </a>
          
          <button
            onClick={() => setAuthModalOpen(true, 'login')}
            className="px-3 py-1.5 bg-rose-800 text-white font-medium rounded-lg hover:bg-rose-900 text-xs transition-colors"
          >
            Switch Store
          </button>
        </div>
      </div>
    </div>
  );
};
