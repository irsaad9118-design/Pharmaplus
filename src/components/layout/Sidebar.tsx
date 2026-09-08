import React from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  ShoppingBag, 
  Package, 
  Clock, 
  History,
  MessageSquare,
  BarChart3,
  Zap
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, inventory, getExpiryTier, patients, setIsBulkReminderModalOpen } = usePharmacy();

  const invList = inventory || [];
  const lowStockCount = invList.filter(i => (i?.stockQuantity || 0) <= (i?.minAlertLevel || 15)).length;
  
  // Count near expiry items (<90d)
  const redExpiryCount = invList.filter(i => !i?.quarantined && getExpiryTier(i?.expirationDate) === 'red').length;
  const totalExpiryCount = invList.filter(i => !i?.quarantined && ['red', 'amber', 'yellow'].includes(getExpiryTier(i?.expirationDate))).length;

  // Count chronic refills due / overdue
  const allChronic = (patients || []).flatMap(p => p.chronicMedications || []);
  const overdueRefillsCount = allChronic.filter(m => m.reminderStatus === 'overdue' || (m.nextRefillDueDate && new Date(m.nextRefillDueDate).getTime() < new Date('2026-08-23').getTime() && m.reminderStatus !== 'refilled')).length;
  const dueRefillsCount = allChronic.filter(m => m.reminderStatus !== 'refilled').length;

  const navItems = [
    {
      id: 'pos',
      label: 'POS / New Sale',
      icon: ShoppingBag,
      badge: 'Fast Bill',
      badgeColor: 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300'
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
      badge: 'Insights',
      badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
    },
    {
      id: 'refills',
      label: 'Refill Reminders',
      icon: MessageSquare,
      badge: overdueRefillsCount > 0 ? `${overdueRefillsCount} Overdue` : (dueRefillsCount > 0 ? `${dueRefillsCount} Due` : null),
      badgeColor: overdueRefillsCount > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
    },
    {
      id: 'inventory',
      label: 'Inventory & Racks',
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount} Low` : null,
      badgeColor: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
    },
    {
      id: 'expiry',
      label: 'Expiry Alerts',
      icon: Clock,
      badge: redExpiryCount > 0 ? `${redExpiryCount} Due` : (totalExpiryCount > 0 ? `${totalExpiryCount}` : null),
      badgeColor: redExpiryCount > 0 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
    },
    {
      id: 'sales',
      label: 'Sales History',
      icon: History,
      badge: null,
      badgeColor: ''
    }
  ];

  return (
    <aside id="pharmpulse-sidebar" className="w-full lg:w-60 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shrink-0 p-3 lg:p-4 flex flex-col justify-between border-r border-slate-200 dark:border-slate-800">
      <div className="space-y-3">
        
        {/* Navigation Section */}
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 py-1 mb-1">
            Store Navigation
          </p>
          
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap lg:whitespace-normal w-full text-left cursor-pointer min-h-[44px] ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 ${isActive ? 'bg-teal-700/80 text-white' : item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

      </div>

      {/* 1-Click Reminder Quick Action in Sidebar */}
      <div className="hidden lg:block my-2 p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/20 border border-amber-200/80 dark:border-amber-800/60">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Refill Radar</span>
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200">
            {dueRefillsCount} Due
          </span>
        </div>
        <p className="text-[11px] text-amber-800 dark:text-amber-300/80 leading-tight mb-2">
          Dispatch WhatsApp reminders to all customers in 1 click.
        </p>
        <button
          type="button"
          onClick={() => setIsBulkReminderModalOpen(true)}
          id="sidebar-1click-reminders-btn"
          className="w-full py-1.5 px-2.5 rounded-lg text-xs font-extrabold text-white bg-amber-500 hover:bg-amber-600 active:bg-amber-700 shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
        >
          <Zap className="w-3.5 h-3.5 fill-white" />
          <span>⚡ 1-Click Remind All</span>
        </button>
      </div>

      {/* System Status Footer */}
      <div className="hidden lg:block pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Medical Store POS
          </span>
          <span className="text-slate-400 font-mono text-[10px]">v3.0</span>
        </div>
      </div>
    </aside>
  );
};
