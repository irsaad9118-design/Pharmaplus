import React from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Pill, 
  Plus, 
  LogOut,
  Tag,
  Zap
} from 'lucide-react';

interface HeaderProps {
  onOpenNewBill?: () => void;
  onOpenLowStock?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewBill
}) => {
  const { 
    setActiveTab, 
    shopSettings, 
    mobileSearchActive, 
    setIsCartOpen,
    patients,
    setIsBulkReminderModalOpen,
    addToast 
  } = usePharmacy();

  const { 
    currentStore, 
    connectedDevices, 
    logout, 
    setIsLoggedIn 
  } = useAuth();

  const activeStoreId = currentStore?.storeId || 'STORE-139';
  const activeStoreName = currentStore?.storeName || shopSettings?.shopName || shopSettings?.storeName || 'Ahmad Medical';
  const activeDlNumber = currentStore?.dlNumber || shopSettings?.dlNumber || shopSettings?.drugLicense || 'DL-20B/3891';
  const activeDeviceCount = (connectedDevices || []).length || currentStore?.connectedDevicesCount || 1;

  const handleNewBillClick = () => {
    setActiveTab('pos');
    setIsCartOpen(true);
    if (onOpenNewBill) {
      onOpenNewBill();
    }
  };

  const handleInstantLogout = () => {
    logout();
    setIsLoggedIn(false);
    addToast({
      type: 'info',
      title: 'Logged Out',
      message: 'Session closed. Returned to Chemist Login screen.'
    });
  };

  return (
    <header 
      id="pharmpulse-header" 
      className={`sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-2xs transition-all duration-300 ease-in-out select-none ${
        mobileSearchActive ? 'max-h-0 opacity-0 py-0 border-b-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="px-3 sm:px-6 py-2 max-w-7xl mx-auto flex flex-col gap-1.5">
        
        {/* Top Row: Strict Flex Spacing with Static Logo + Store Name (Left) & [+ Bill] / [Logout] (Right) */}
        <div 
          id="header-top-row"
          className="w-full flex items-center justify-between gap-2 flex-nowrap"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}
        >
          {/* Left: Static PharmPulse Logo + Store Name */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink">
            {/* Static PharmPulse Logo */}
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Pill className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            
            {/* App Name + Store Name */}
            <div className="min-w-0 flex items-center gap-1.5 sm:gap-2 truncate">
              <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight shrink-0">
                PharmPulse
              </span>
              <span className="text-slate-300 dark:text-slate-600 text-xs shrink-0">•</span>
              <span 
                className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 truncate"
                title={activeStoreName}
              >
                {activeStoreName}
              </span>
            </div>
          </div>

          {/* Right: [⚡ Remind All], [+ Bill] button and [↳ Logout] button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* [⚡ 1-Click Medicine Reminders] Quick Action */}
            <button
              type="button"
              onClick={() => setIsBulkReminderModalOpen(true)}
              id="header-bulk-reminder-btn"
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-xs transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer min-h-[36px] sm:min-h-[38px] whitespace-nowrap active:scale-98"
              title="1-Click Send All Customers Medicine Reminder"
            >
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" />
              <span className="hidden sm:inline">1-Click Reminders</span>
              <span className="sm:hidden">Remind</span>
            </button>

            {/* [+ Bill] Quick Action */}
            <button
              type="button"
              onClick={handleNewBillClick}
              id="header-quick-new-bill"
              className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white shadow-xs transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer min-h-[36px] sm:min-h-[38px] whitespace-nowrap active:scale-98"
              title="Start New Bill (+ Bill)"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>+ Bill</span>
            </button>

            {/* [↳ Logout] Action */}
            <button
              type="button"
              onClick={handleInstantLogout}
              id="header-logout-btn"
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/80 shadow-2xs transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer min-h-[36px] sm:min-h-[38px] whitespace-nowrap active:scale-98"
              title="Logout Session"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Logout</span>
            </button>
          </div>

        </div>

        {/* Sub-Row (Below Header): Small clean badge for Store ID & License */}
        <div 
          id="header-sub-row"
          className="w-full flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-1"
        >
          <div className="flex items-center gap-2 min-w-0">
            {/* Small clean badge for Store ID */}
            <div 
              id="header-store-id-badge"
              className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-mono font-bold bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800/70 shrink-0"
              title={`Active Store ID: ${activeStoreId}`}
            >
              <Tag className="w-2.5 h-2.5 text-teal-600 shrink-0" />
              <span>{activeStoreId}</span>
            </div>

            {/* DL Number */}
            {activeDlNumber && (
              <span className="truncate font-mono text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">
                DL: {activeDlNumber}
              </span>
            )}
          </div>

          {/* Sync Status Badge */}
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{activeDeviceCount} Synced</span>
          </div>
        </div>

      </div>
    </header>
  );
};
