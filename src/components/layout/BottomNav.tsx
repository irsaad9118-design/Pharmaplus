import React from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  ShoppingBag, 
  Package, 
  Clock, 
  History,
  MessageSquare,
  BarChart3
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, inventory, getExpiryTier, mobileSearchActive, patients } = usePharmacy();

  const invList = inventory || [];
  const lowStockCount = invList.filter(i => (i?.stockQuantity || 0) <= (i?.minAlertLevel || 15)).length;
  const redExpiryCount = invList.filter(i => !i?.quarantined && getExpiryTier(i?.expirationDate) === 'red').length;

  const allChronic = (patients || []).flatMap(p => p.chronicMedications || []);
  const overdueRefillsCount = allChronic.filter(m => m.reminderStatus === 'overdue' || (m.nextRefillDueDate && new Date(m.nextRefillDueDate).getTime() < new Date('2026-08-23').getTime() && m.reminderStatus !== 'refilled')).length;

  const tabs = [
    {
      id: 'pos',
      label: 'POS',
      icon: ShoppingBag,
      badge: null
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
      badge: null
    },
    {
      id: 'refills',
      label: 'Refill Tracker',
      icon: MessageSquare,
      badge: overdueRefillsCount > 0 ? overdueRefillsCount : null
    },
    {
      id: 'inventory',
      label: 'Stock',
      icon: Package,
      badge: lowStockCount > 0 ? lowStockCount : null
    },
    {
      id: 'expiry',
      label: 'Expiry',
      icon: Clock,
      badge: redExpiryCount > 0 ? redExpiryCount : null
    },
    {
      id: 'sales',
      label: 'Bills',
      icon: History,
      badge: null
    }
  ];

  return (
    <nav 
      id="pharmpulse-bottom-nav" 
      className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-1 py-1.5 shadow-lg safe-area-bottom transition-all duration-200 ${
        mobileSearchActive ? 'max-md:translate-y-full max-md:opacity-0 pointer-events-none' : 'max-md:translate-y-0 max-md:opacity-100'
      }`}
    >
      <div className="grid grid-cols-6 gap-0.5 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`bottom-nav-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer min-h-[46px] relative ${
                isActive 
                  ? 'text-teal-600 dark:text-teal-400 font-bold bg-teal-50/70 dark:bg-teal-950/50'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2 min-w-[14px] h-3.5 px-1 bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 leading-tight tracking-tight truncate max-w-full">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};


