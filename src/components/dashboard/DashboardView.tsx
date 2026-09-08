import React, { useMemo } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  FileText, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  PhoneCall, 
  ShieldCheck, 
  RefreshCw, 
  Package, 
  DollarSign,
  MapPin,
  MessageSquare,
  ShoppingBag,
  RotateCcw,
  Tag,
  Zap
} from 'lucide-react';
import { Prescription, Patient } from '../../types/pharmacy';
import { OwnerAnalyticsSection } from './OwnerAnalyticsSection';

interface DashboardViewProps {
  onSelectPatient: (patient: Patient) => void;
  onOpenNewRx: () => void;
  onOpenCopilot: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onSelectPatient,
  onOpenNewRx,
  onOpenCopilot
}) => {
  const { 
    prescriptions, 
    patients, 
    inventory, 
    transactions, 
    activityLogs, 
    setActiveTab,
    setIsBulkReminderModalOpen,
    processRefill,
    dispensePrescription,
    updatePrescriptionStatus,
    getExpiryTier,
    getDaysUntilExpiry,
    markChronicRefilled
  } = usePharmacy();

  // Metrics calculations
  const pendingReview = prescriptions.filter(p => p.status === 'pending_review' || p.status === 'clinical_check');
  const readyPickup = prescriptions.filter(p => p.status === 'ready_for_pickup');
  const dispensedToday = prescriptions.filter(p => p.status === 'dispensed');
  const lowStock = inventory.filter(i => i.stockQuantity <= i.minAlertLevel);

  // 90-day expiry counts
  const expiryMetrics = useMemo(() => {
    let red = 0;
    let amber = 0;
    let yellow = 0;
    inventory.forEach(item => {
      if (item.quarantined) return;
      const tier = getExpiryTier(item.expirationDate);
      if (tier === 'red') red++;
      else if (tier === 'amber') amber++;
      else if (tier === 'yellow') yellow++;
    });
    return { red, amber, yellow, total: red + amber + yellow };
  }, [inventory, getExpiryTier]);

  // Chronic refill overdue/due soon count
  const chronicDueSoon = useMemo(() => {
    const list: any[] = [];
    const today = new Date('2026-08-23').getTime();
    patients.forEach(p => {
      (p.chronicMedications || []).forEach(m => {
        const diff = Math.ceil((new Date(m.nextDueDate).getTime() - today) / (1000 * 60 * 60 * 24));
        if (diff <= 5) {
          list.push({ patient: p, med: m, days: diff });
        }
      });
    });
    return list;
  }, [patients]);

  const avgAdherence = Math.round(
    patients.reduce((acc, p) => acc + p.adherenceScore, 0) / (patients.length || 1)
  );

  const totalSales = transactions.reduce((acc, t) => acc + t.totalPaid, 0);
  const highRiskPatients = patients.filter(p => p.adherenceScore < 75 || p.tags.includes('High-Risk'));

  return (
    <div id="dashboard-view" className="space-y-6">
      
      {/* Top Metric Cards - Clean Minimalism */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: 90-Day Expiry Engine Alert */}
        <div 
          onClick={() => setActiveTab('expiry')}
          className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">90-Day Expiry Engine</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">{expiryMetrics.total}</span>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
              {expiryMetrics.red} Red Alert (&le;30d)
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-700">
            <span>{expiryMetrics.amber} Amber (31-60d) • {expiryMetrics.yellow} Yellow</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Metric 2: 30-Day Chronic Refills Due */}
        <div 
          onClick={() => setActiveTab('patients')}
          className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">30-Day Chronic Refills</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">{chronicDueSoon.length}</span>
            <span className="text-xs font-bold text-teal-700 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
              WhatsApp Ready
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-700">
            <span>{patients.length} Registered CRM Profiles</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Metric 3: POS & Counter Revenue */}
        <div 
          onClick={() => setActiveTab('pos')}
          className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Today's Counter POS</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">₹{totalSales.toFixed(2)}</span>
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
              {transactions.length} Bills
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-700">
            <span>Instant 80mm Thermal Receipts</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Metric 4: Inventory & Physical Racks */}
        <div 
          onClick={() => setActiveTab('inventory')}
          className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Formulary & Racks</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">{inventory.length}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              lowStock.length > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700'
            }`}>
              {lowStock.length} Low Stock
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-700">
            <span>Structured Shelf Coordinates</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

      </div>

      {/* Store Owner Visual Analytics & Interactive Profit Intelligence */}
      <OwnerAnalyticsSection />

      {/* Main Grid: Priority Action Hub & Chronic Refill Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Expiry Action Engine & Dispensing Queue */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 90-Day Expiry Fast Action Panel */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 gap-2">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose-500" />
                  <span>90-Day Expiry Engine: Immediate Stock Actions</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Batches reaching distributor return policy deadlines or eligible for clearance discounts.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('expiry')}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-800 flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Open Expiry Center ({expiryMetrics.total})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Quick Expiry Batch Items */}
            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {inventory.slice(0, 4).map(item => {
                const days = getDaysUntilExpiry(item.expirationDate);
                const tier = getExpiryTier(item.expirationDate);

                return (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{item.brandName}</span>
                        <span className="font-mono text-[10px] text-slate-400">Batch: {item.batchNumber}</span>
                        {item.isNearExpiryDiscount && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-white">
                            {item.discountPercent}% OFF
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 font-mono text-[11px] truncate max-w-sm">
                        {item.saltComposition || item.genericName}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 font-bold text-teal-700 dark:text-teal-300 text-[11px]">
                          <MapPin className="w-3 h-3 text-teal-600" />
                          <span>{item.locationShelf}</span>
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500">Qty: {item.stockQuantity} {item.unit}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
                        tier === 'red' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                        tier === 'amber' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
                      }`}>
                        {days <= 0 ? 'EXPIRED' : `${days}d left`}
                      </span>
                      <div className="text-[11px] text-slate-500 font-mono">Exp: {item.expirationDate}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dispensing Workstation Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span>Prescription Dispensing Pipeline</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Live prescriptions undergoing intake, verification, or counter pickup.</p>
              </div>

              <button
                onClick={onOpenNewRx}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm shadow-teal-600/20"
              >
                <span>+ Intake Rx</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {prescriptions.slice(0, 4).map((rx) => {
                const isPending = rx.status === 'pending_review' || rx.status === 'clinical_check';
                const isReady = rx.status === 'ready_for_pickup';

                return (
                  <div key={rx.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{rx.medicationName}</span>
                        <span className="font-mono text-slate-400 text-[11px]">{rx.rxNumber}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                        <strong className="text-slate-900 dark:text-white">{rx.patientName}</strong> — {rx.sig}
                      </p>
                      <div className="text-[11px] text-teal-700 font-medium mt-0.5">Copay: ₹{rx.copayAmount.toFixed(2)}</div>
                    </div>

                    <div className="shrink-0">
                      {isPending ? (
                        <button
                          onClick={() => updatePrescriptionStatus(rx.id, 'ready_for_pickup', 'Passed clinical review.')}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold"
                        >
                          Verify & Pack
                        </button>
                      ) : isReady ? (
                        <button
                          onClick={() => dispensePrescription(rx.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Dispense</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 font-medium">Dispensed</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Col: Chronic Refills WhatsApp Radar & Activity Feed */}
        <div className="space-y-6">
          
          {/* Chronic 30-Day Refill Radar */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>30-Day Chronic Refills Due</span>
              </h3>
              <span className="text-xs font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                {chronicDueSoon.length} Due
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Send 1-click WhatsApp refill reminders directly to patient smartphones to sustain medication adherence.
            </p>

            {/* 1-Click Send All Customers Medicine Reminder Quick Action */}
            <button
              type="button"
              onClick={() => setIsBulkReminderModalOpen(true)}
              id="dashboard-1click-reminders-btn"
              className="w-full py-2.5 px-4 rounded-xl font-black text-xs text-white bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:scale-98 shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>⚡ 1-Click Send All Customers ({chronicDueSoon.length}) Reminders</span>
            </button>

            <div className="space-y-3">
              {chronicDueSoon.slice(0, 4).map(({ patient, med, days }, idx) => (
                <div 
                  key={idx}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">{patient.firstName} {patient.lastName}</h4>
                      <p className="text-[11px] text-teal-700 font-semibold">{med.brandName}</p>
                      <p className="text-[10px] text-slate-400">{med.dosage}</p>
                    </div>

                    <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                      days < 0 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {days < 0 ? `${Math.abs(days)}d Overdue` : `Due in ${days}d`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                    <span className="text-[10px] text-slate-400 font-mono">{patient.phone}</span>
                    
                    <a
                      href={`https://wa.me/${patient.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${patient.firstName}, your 30-day refill for ${med.brandName} is due from PharmPulse Pharmacy. Reply YES to confirm pickup!`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setActiveTab('refills')}
              className="w-full py-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl transition-colors text-center block border border-emerald-200 dark:border-emerald-800 shadow-2xs cursor-pointer"
            >
              Open WhatsApp Refill Automation Hub →
            </button>
          </div>

          {/* Live Activity Stream */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Audit & Activity Log</h3>
              <span className="text-[10px] text-slate-400">Timestamped</span>
            </div>

            <div className="space-y-2.5">
              {activityLogs.slice(0, 4).map((log) => (
                <div key={log.id} className="text-xs space-y-0.5 border-l-2 border-teal-500 pl-2.5 py-0.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{log.action}</span>
                    <span>{log.timestamp.split(' ')[1] || log.timestamp}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">{log.details}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
