import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PharmacyProvider, usePharmacy } from './context/PharmacyContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { Toasts } from './components/layout/Toasts';
import { PosView } from './components/pos/PosView';
import { InventoryView } from './components/inventory/InventoryView';
import { ExpiryAlertCenterView } from './components/expiry/ExpiryAlertCenterView';
import { SalesHistoryView } from './components/sales/SalesHistoryView';
import { WhatsAppRefillServiceComponent } from './components/reminders/WhatsAppRefillServiceComponent';
import { ReportsView } from './components/reports/ReportsView';
import { SuperAdminView } from './components/admin/SuperAdminView';
import { SuperAdminPinLogin } from './components/admin/SuperAdminPinLogin';
import { ExpiryLowStockDrawer } from './components/expiry/ExpiryLowStockDrawer';
import { LoginScreen } from './components/auth/LoginScreen';
import { AuthModal } from './components/auth/AuthModal';
import { DeactivatedStoreNotice } from './components/auth/DeactivatedStoreNotice';
import { BulkReminderModal } from './components/modals/BulkReminderModal';
import { FallbackLoader } from './components/common/FallbackLoader';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const MainLayout: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    setIsCartOpen, 
    isStoreLoading,
    isBulkReminderModalOpen,
    setIsBulkReminderModalOpen
  } = usePharmacy();
  const { 
    authModalOpen, 
    authModalTab, 
    setAuthModalOpen, 
    isLoading: isAuthLoading,
    isAuthenticated,
    isLoggedIn,
    currentSession,
    isSuperAdmin,
    appRoute,
    setAppRoute,
    returnToSuperAdminPortal
  } = useAuth();
  const [isExpiryDrawerOpen, setIsExpiryDrawerOpen] = useState<boolean>(false);

  const handleOpenNewBill = () => {
    setActiveTab('pos');
    setIsCartOpen(true);
  };

  const handleOpenLowStock = () => {
    setIsExpiryDrawerOpen(true);
  };

  if (isAuthLoading || isStoreLoading) {
    return <FallbackLoader subtitle="PharmPulse • Loading Workspace..." />;
  }

  // =========================================================================
  // ROUTE 1: DEDICATED SUPER ADMIN MASTER SAAS CONTROL HUB (?admin=true)
  // =========================================================================
  if (appRoute === 'superadmin') {
    // If not authenticated as Super Admin -> Render Master PIN Keypad / Login
    if (!isSuperAdmin) {
      return (
        <div 
          id="pharmpulse-super-admin-gate" 
          className="min-h-screen min-h-[100dvh] bg-slate-950 flex flex-col font-sans selection:bg-purple-500 selection:text-white"
        >
          <ErrorBoundary>
            <SuperAdminPinLogin 
              onSuccess={() => {}}
              onSwitchToStore={() => setAppRoute('store')}
            />
          </ErrorBoundary>
          <Toasts />
        </div>
      );
    }

    // Once unlocked with Master PIN -> Render ONLY the Super Admin SaaS Dashboard
    return (
      <div 
        id="pharmpulse-super-admin-portal"
        className="min-h-screen min-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white"
      >
        <ErrorBoundary>
          <SuperAdminView />
        </ErrorBoundary>

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          defaultTab={authModalTab}
        />

        <Toasts />
      </div>
    );
  }

  // =========================================================================
  // ROUTE 2: CLEAN MEDICAL STORE CHEMIST PORTAL (Normal URL without ?admin=true)
  // =========================================================================

  // If Chemist is not logged in -> Render ONLY the Blank Chemist Login Screen
  if (!isAuthenticated && !currentSession) {
    return (
      <div 
        id="pharmpulse-login-root" 
        className="min-h-screen min-h-[100dvh] bg-slate-950 flex flex-col font-sans selection:bg-teal-500 selection:text-white"
      >
        <ErrorBoundary>
          <LoginScreen />
        </ErrorBoundary>

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          defaultTab={authModalTab}
        />

        <Toasts />
      </div>
    );
  }

  // STORE OWNER / COUNTER STAFF WORKSPACE (Authenticated Pharmacy POS)
  return (
    <div 
      id="pharmpulse-app" 
      className="min-h-screen min-h-[100dvh] bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-white overscroll-none"
      style={{ backgroundColor: '#F8FAFC' }}
    >
      {/* Super Admin Technical Support / Store Inspection Banner */}
      {isSuperAdmin && currentSession && (
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white px-4 py-2 text-xs font-medium flex flex-wrap items-center justify-between gap-2 shadow-md border-b border-purple-500/30 z-50 sticky top-0">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-bold text-amber-300">🛠️ Technical Support Mode:</span>
            <span>Inspecting store <strong>{currentSession.store?.storeName || currentSession.storeId}</strong> ({currentSession.storeId})</span>
          </div>
          <button
            onClick={returnToSuperAdminPortal}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs border border-purple-400/40 cursor-pointer"
          >
            ← Exit Inspection & Return to Super Admin Hub
          </button>
        </div>
      )}

      {/* Deactivated Store Alert Banner if account is suspended */}
      <DeactivatedStoreNotice />

      {/* Top Store Header */}
      <Header
        onOpenNewBill={handleOpenNewBill}
        onOpenLowStock={handleOpenLowStock}
      />

      {/* Main Body with Sidebar + Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto pb-16 lg:pb-0 min-h-0">
        {/* Navigation Sidebar (Desktop) */}
        <Sidebar />

        {/* Viewport Content Area with fluid dynamic viewport scrolling wrapped in ErrorBoundary */}
        <main className="flex-1 p-2 sm:p-5 lg:p-6 min-w-0 min-h-0 overflow-y-auto">
          <ErrorBoundary>
            {activeTab === 'pos' && (
              <PosView />
            )}

            {activeTab === 'inventory' && (
              <InventoryView />
            )}

            {activeTab === 'expiry' && (
              <ExpiryAlertCenterView />
            )}

            {activeTab === 'reports' && (
              <ReportsView />
            )}

            {activeTab === 'sales' && (
              <SalesHistoryView />
            )}

            {activeTab === 'refills' && (
              <WhatsAppRefillServiceComponent />
            )}

            {/* Fallback to POS if unknown tab ID */}
            {!['pos', 'reports', 'inventory', 'expiry', 'sales', 'refills'].includes(activeTab) && (
              <PosView />
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* Bottom Navigation for 1-Thumb Mobile Tapping */}
      <BottomNav />

      {/* Slide-over Expiry & Low Stock Drawer */}
      <ExpiryLowStockDrawer
        isOpen={isExpiryDrawerOpen}
        onClose={() => setIsExpiryDrawerOpen(false)}
      />

      {/* Multi-Tenant Authentication & Store Onboarding Modal (Store Switcher / Register) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authModalTab}
      />

      {/* 1-Click Send All Customers Medicine Reminder Modal */}
      <BulkReminderModal
        isOpen={isBulkReminderModalOpen}
        onClose={() => setIsBulkReminderModalOpen(false)}
      />

      {/* Toast Notification Container */}
      <Toasts />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <PharmacyProvider>
          <MainLayout />
        </PharmacyProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
