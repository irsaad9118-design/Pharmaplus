import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Smartphone, 
  Tablet, 
  Monitor, 
  Globe, 
  MapPin, 
  Clock, 
  Power, 
  CheckCircle2, 
  RefreshCw, 
  Search, 
  Lock, 
  Radio, 
  Activity, 
  UserX,
  Play,
  Fingerprint,
  Building2,
  Filter,
  Check,
  ChevronRight
} from 'lucide-react';
import { SecurityAnomalyAlert, StoreDeviceSession, StoreWorkspace } from '../../types/pharmacy';
import { usePharmacy } from '../../context/PharmacyContext';

interface SecurityAlertsViewProps {
  stores?: StoreWorkspace[];
  onRefreshOverview?: () => void;
}

export const SecurityAlertsView: React.FC<SecurityAlertsViewProps> = ({ 
  stores = [],
  onRefreshOverview 
}) => {
  const { addToast } = usePharmacy();

  const [alerts, setAlerts] = useState<SecurityAnomalyAlert[]>([]);
  const [stats, setStats] = useState({
    totalAlerts: 0,
    unresolvedAlerts: 0,
    multiIpCollisions: 0,
    blockedThirdDevices: 0,
    velocityFlags: 0,
    totalActiveDevicesAcrossPlatform: 0
  });
  const [activeSessionsByStore, setActiveSessionsByStore] = useState<Record<string, StoreDeviceSession[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch security alerts and active device fleet
  const fetchSecurityData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/security/alerts');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }

      // Fetch active devices for all stores
      if (stores.length > 0) {
        const storeSessionsMap: Record<string, StoreDeviceSession[]> = {};
        await Promise.all(
          stores.map(async (s) => {
            try {
              const devRes = await fetch(`/api/store/${s.storeId}/devices`);
              if (devRes.ok) {
                const devData = await devRes.json();
                storeSessionsMap[s.storeId] = devData.devices || [];
              }
            } catch (e) {
              // fallback
            }
          })
        );
        setActiveSessionsByStore(storeSessionsMap);
      }
    } catch (err) {
      console.error('Failed to load security alerts', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, [stores.length]);

  // 1-Click Revoke All Sessions & Force Logout per Store
  const handleRevokeAllSessions = async (storeId: string, storeName: string) => {
    if (!window.confirm(`Are you sure you want to force logout and terminate ALL active terminal sessions for "${storeName}" (${storeId})?`)) {
      return;
    }

    setActionLoadingId(`revoke-all-${storeId}`);
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/revoke-all-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revokedBy: 'Super Admin (irsaad9118@gmail.com)' })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        addToast({
          type: 'success',
          title: 'Sessions Revoked & Terminated',
          message: data.message || `All active sessions revoked for ${storeName}`
        });
        fetchSecurityData();
        if (onRefreshOverview) onRefreshOverview();
      } else {
        addToast({
          type: 'error',
          title: 'Action Failed',
          message: data.error || 'Failed to revoke store sessions'
        });
      }
    } catch (e) {
      addToast({
        type: 'error',
        title: 'Connection Error',
        message: 'Could not connect to server to revoke sessions'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Revoke individual device session
  const handleRevokeSingleDevice = async (storeId: string, deviceId: string, devName: string) => {
    setActionLoadingId(`revoke-dev-${deviceId}`);
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/devices/${deviceId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();
      if (res.ok && data.success) {
        addToast({
          type: 'info',
          title: 'Device Session Revoked',
          message: `Device "${devName}" disconnected and logged out.`
        });
        fetchSecurityData();
        if (onRefreshOverview) onRefreshOverview();
      }
    } catch (e) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to revoke device session'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Mark Alert as Resolved
  const handleResolveAlert = async (alertId: string) => {
    setActionLoadingId(`resolve-${alertId}`);
    try {
      const res = await fetch(`/api/admin/security/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolved: true, resolvedAt: new Date().toISOString() } : a));
        setStats(prev => ({ ...prev, unresolvedAlerts: Math.max(0, prev.unresolvedAlerts - 1) }));
        addToast({
          type: 'success',
          title: 'Alert Acknowledged',
          message: 'Security warning marked as resolved.'
        });
      }
    } catch (e) {
      // error handling
    } finally {
      setActionLoadingId(null);
    }
  };

  // Simulate 3rd Device Blocked Attempt (for interactive testing)
  const handleSimulateBlockedAttempt = async () => {
    const targetStore = stores[0] || { storeId: 'STORE-APEX01', storeName: 'Apex Medicos' };
    setActionLoadingId('simulate-blocked');
    try {
      const res = await fetch('/api/admin/security/simulate-blocked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: targetStore.storeId,
          deviceName: 'Unrecognized Cashier OnePlus 11 (3rd Device)',
          ip: '122.161.49.204'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addToast({
          type: 'warning',
          title: '3rd Device Block Simulated',
          message: `Blocked 3rd device attempt logged for ${targetStore.storeName}`
        });
        fetchSecurityData();
        if (onRefreshOverview) onRefreshOverview();
      }
    } catch (e) {
      // error
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered alerts
  const filteredAlerts = alerts.filter(a => {
    const matchesType = filterType === 'all' ? true : (
      filterType === 'unresolved' ? !a.resolved : a.type === filterType
    );
    const matchesSearch = 
      a.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.storeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.ipAddresses && a.ipAddresses.some(ip => ip.includes(searchQuery)));

    return matchesType && matchesSearch;
  });

  const getDeviceIcon = (type?: string) => {
    if (type === 'mobile') return Smartphone;
    if (type === 'tablet') return Tablet;
    return Monitor;
  };

  return (
    <div className="space-y-6">
      
      {/* 1. SECURITY HEADER & METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Unresolved Alerts */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Security Alerts</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              stats.unresolvedAlerts > 0 
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400' 
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
            }`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {stats.unresolvedAlerts}
            </span>
            <span className="text-xs text-slate-500">unresolved of {stats.totalAlerts}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center space-x-1">
            {stats.unresolvedAlerts > 0 ? (
              <span className="text-rose-600 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                Action Required
              </span>
            ) : (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <Check className="w-3 h-3" />
                Fleet Secure
              </span>
            )}
          </div>
        </div>

        {/* Metric 2: Multi-IP Collisions */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Multi-IP Collisions</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              {stats.multiIpCollisions}
            </span>
            <span className="text-xs text-slate-500">stores with distinct IPs</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Simultaneous logins from distant cities
          </div>
        </div>

        {/* Metric 3: Blocked 3rd Devices */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">3rd Device Blocks</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">
              {stats.blockedThirdDevices}
            </span>
            <span className="text-xs text-slate-500">blocked attempts</span>
          </div>
          <div className="mt-2 text-[11px] text-purple-600 font-semibold">
            Max 2 Concurrent Devices enforced
          </div>
        </div>

        {/* Metric 4: Total Active Connected Terminals */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Terminals Fleet</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-teal-600 dark:text-teal-400">
              {stats.totalActiveDevicesAcrossPlatform}
            </span>
            <span className="text-xs text-slate-500">live counter sessions</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Real-time heartbeat tracked
          </div>
        </div>

      </div>

      {/* 2. SECURITY ANOMALY SIMULATOR & TEST CONTROLS */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-4 sm:p-5 rounded-2xl border border-indigo-800/40 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold">Multi-Device Security Policy & Anomaly Tester</h3>
            <p className="text-xs text-indigo-200 mt-0.5">
              Strict Policy: <span className="font-semibold text-white">Max 2 Concurrent Devices per Store</span>. 3rd unrecognized device blocked with alert.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSimulateBlockedAttempt}
            disabled={actionLoadingId === 'simulate-blocked'}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Simulate 3rd Device Block Attempt</span>
          </button>

          <button
            onClick={fetchSecurityData}
            disabled={isLoading}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 3. STORE CONCURRENT SESSIONS & 1-CLICK FORCE LOGOUT FLEET TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-purple-600" />
              <span>Medical Stores Concurrent Device Fleet (Max 2 Devices Allowed)</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Inspect live terminal sessions, IP addresses, geolocations, and trigger 1-click forced session revocation.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 self-start sm:self-auto">
            {stores.length} Registered Stores
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {stores.map(store => {
            const storeSessions = activeSessionsByStore[store.storeId] || [];
            const isFull = storeSessions.length >= 2;

            return (
              <div key={store.storeId} className="p-4 sm:p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Store Meta */}
                  <div className="space-y-1 min-w-[240px]">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                        {store.storeName}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {store.storeId}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>Owner: <strong className="text-slate-700 dark:text-slate-300">{store.ownerName}</strong> ({store.ownerPhone})</span>
                      <span>DL: <strong className="font-mono text-slate-600 dark:text-slate-400">{store.dlNumber}</strong></span>
                    </div>

                    <div className="flex items-center space-x-2 pt-1">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        storeSessions.length === 0 
                          ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' 
                          : (storeSessions.length === 1 
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800')
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${storeSessions.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        <span>{storeSessions.length} / 2 Devices Connected</span>
                      </span>

                      {isFull && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          MAX CAPACITY
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Active Terminals Breakdown (Slot 1 & Slot 2) */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    
                    {/* Device Slot 1 */}
                    <div className={`p-3 rounded-xl border transition-all ${
                      storeSessions[0]
                        ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                        : 'bg-slate-50/30 dark:bg-slate-900/30 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400'
                    }`}>
                      {storeSessions[0] ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                              <Smartphone className="w-3.5 h-3.5 text-teal-600" />
                              <span className="truncate max-w-[140px]">{storeSessions[0].deviceName}</span>
                            </div>
                            <button
                              onClick={() => handleRevokeSingleDevice(store.storeId, storeSessions[0].deviceId, storeSessions[0].deviceName)}
                              disabled={actionLoadingId === `revoke-dev-${storeSessions[0].deviceId}`}
                              className="text-[10px] font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                              title="Disconnect this terminal"
                            >
                              Disconnect
                            </button>
                          </div>
                          
                          <div className="text-[11px] text-slate-500 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span>User: <strong>{storeSessions[0].userName}</strong> ({storeSessions[0].userRole})</span>
                              <span className="font-mono text-[10px] text-teal-700 dark:text-teal-400 font-semibold">{storeSessions[0].ipAddress || '49.36.12.98'}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-[10px] text-slate-400">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{storeSessions[0].location || 'New Delhi, DL (Jio 5G)'}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">Slot 1: Available</span>
                      )}
                    </div>

                    {/* Device Slot 2 */}
                    <div className={`p-3 rounded-xl border transition-all ${
                      storeSessions[1]
                        ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                        : 'bg-slate-50/30 dark:bg-slate-900/30 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400'
                    }`}>
                      {storeSessions[1] ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                              <Monitor className="w-3.5 h-3.5 text-blue-600" />
                              <span className="truncate max-w-[140px]">{storeSessions[1].deviceName}</span>
                            </div>
                            <button
                              onClick={() => handleRevokeSingleDevice(store.storeId, storeSessions[1].deviceId, storeSessions[1].deviceName)}
                              disabled={actionLoadingId === `revoke-dev-${storeSessions[1].deviceId}`}
                              className="text-[10px] font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                              title="Disconnect this terminal"
                            >
                              Disconnect
                            </button>
                          </div>
                          
                          <div className="text-[11px] text-slate-500 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span>User: <strong>{storeSessions[1].userName}</strong> ({storeSessions[1].userRole})</span>
                              <span className="font-mono text-[10px] text-blue-700 dark:text-blue-400 font-semibold">{storeSessions[1].ipAddress || '103.21.144.22'}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-[10px] text-slate-400">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{storeSessions[1].location || 'Counter Terminal'}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">Slot 2: Available</span>
                      )}
                    </div>

                  </div>

                  {/* 1-Click Force Logout & Revoke All Sessions Button */}
                  <div className="shrink-0 flex items-center">
                    <button
                      onClick={() => handleRevokeAllSessions(store.storeId, store.storeName)}
                      disabled={storeSessions.length === 0 || actionLoadingId === `revoke-all-${store.storeId}`}
                      className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold flex items-center justify-center space-x-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer active:scale-95"
                      title="Terminate all active devices and force immediate logout"
                    >
                      <UserX className="w-4 h-4 text-rose-600" />
                      <span>Revoke All Sessions & Force Logout</span>
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. PLATFORM-WIDE LIVE SECURITY ANOMALIES & AUDIT FEED */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Controls Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <span>Real-Time Security & Multi-Login Anomaly Feed</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live audit stream of blocked 3rd devices, multi-IP collisions, and security session overrides.
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search alerts, IPs, stores..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold dark:text-white"
            >
              <option value="all">All Alerts ({alerts.length})</option>
              <option value="unresolved">Unresolved ({stats.unresolvedAlerts})</option>
              <option value="THIRD_DEVICE_BLOCKED">3rd Device Blocked</option>
              <option value="MULTI_IP_COLLISION">Multi-IP Collisions</option>
              <option value="FORCED_SESSION_REVOKE">Session Revocations</option>
              <option value="BILLING_VELOCITY_EXCEEDED">Billing Velocity</option>
            </select>
          </div>
        </div>

        {/* Alerts List */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredAlerts.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-60" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Security Alerts Found</p>
              <p className="text-xs text-slate-500 mt-1">All registered store workspaces are operating within security thresholds.</p>
            </div>
          ) : (
            filteredAlerts.map(alert => {
              const isCritical = alert.severity === 'CRITICAL';
              const isHigh = alert.severity === 'HIGH';

              return (
                <div 
                  key={alert.id}
                  className={`p-4 sm:p-5 transition-colors ${
                    !alert.resolved 
                      ? (isCritical ? 'bg-rose-50/40 dark:bg-rose-950/20' : 'bg-amber-50/30 dark:bg-amber-950/15')
                      : 'hover:bg-slate-50 dark:hover:bg-slate-850/40 opacity-75'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    
                    {/* Alert Content */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        
                        {/* Severity Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          alert.severity === 'CRITICAL' 
                            ? 'bg-rose-600 text-white' 
                            : (alert.severity === 'HIGH' 
                              ? 'bg-amber-500 text-white' 
                              : 'bg-purple-600 text-white')
                        }`}>
                          {alert.severity}
                        </span>

                        {/* Type Badge */}
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {alert.type.replace(/_/g, ' ')}
                        </span>

                        {/* Store Badge */}
                        <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-purple-600" />
                          <span>{alert.storeName}</span>
                          <span className="text-slate-400 font-mono text-[10px]">({alert.storeId})</span>
                        </span>

                        {/* Status */}
                        {alert.resolved ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            ✓ RESOLVED
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            UNRESOLVED
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {alert.title}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                          {alert.description}
                        </p>
                      </div>

                      {/* Forensic Metadata Pills */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <div className="flex items-center space-x-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-mono">
                          <Globe className="w-3 h-3 text-slate-400" />
                          <span>IPs: {alert.ipAddresses.join(' & ')}</span>
                        </div>

                        {alert.locations && alert.locations.length > 0 && (
                          <div className="flex items-center space-x-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{alert.locations.join(' • ')}</span>
                          </div>
                        )}

                        <div className="flex items-center space-x-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{alert.timestamp}</span>
                        </div>
                      </div>

                    </div>

                    {/* Action Controls */}
                    <div className="flex flex-wrap lg:flex-col items-center lg:items-end gap-2 shrink-0">
                      
                      {/* 1-Click Revoke Store Sessions */}
                      <button
                        onClick={() => handleRevokeAllSessions(alert.storeId, alert.storeName)}
                        disabled={actionLoadingId === `revoke-all-${alert.storeId}`}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                        title="Force logout all connected terminals for this pharmacy"
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>Force Logout Store</span>
                      </button>

                      {/* Resolve Toggle */}
                      {!alert.resolved && (
                        <button
                          onClick={() => handleResolveAlert(alert.id)}
                          disabled={actionLoadingId === `resolve-${alert.id}`}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Acknowledge</span>
                        </button>
                      )}

                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
};
