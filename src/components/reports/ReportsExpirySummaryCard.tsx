import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  AlertCircle,
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  Tag,
  Package,
  Layers
} from 'lucide-react';
import { MedicationInventory } from '../../types/pharmacy';
import { DateRangeState } from '../../utils/dateRangeUtils';

interface ReportsExpirySummaryCardProps {
  inventory: MedicationInventory[];
  getDaysUntilExpiry: (dateStr: string) => number;
  onNavigateToExpiryCenter: (categoryFilter?: '30days' | '60days' | '90days' | 'expired' | 'all') => void;
  dateRangeFilter?: DateRangeState;
}

export const ReportsExpirySummaryCard: React.FC<ReportsExpirySummaryCardProps> = ({
  inventory = [],
  getDaysUntilExpiry,
  onNavigateToExpiryCenter,
  dateRangeFilter
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [selectedHorizon, setSelectedHorizon] = useState<'30' | '60' | '90' | 'interval' | 'all'>('all');

  // Compute batches per horizon
  const batchData = useMemo(() => {
    // Only analyze active in-stock items with inventory quantity > 0
    const activeItems = (inventory || []).filter(item => (item.stockQuantity ?? 0) > 0 && !item.quarantined);

    const mapped = activeItems.map(item => {
      const days = getDaysUntilExpiry(item.expirationDate || '');
      const cost = item.purchaseRate ?? item.costPrice ?? ((item.mrp ?? 0) * 0.7);
      const stockVal = Number((cost * (item.stockQuantity ?? 0)).toFixed(2));
      return {
        ...item,
        daysLeft: days,
        stockVal
      };
    });

    // Buckets
    const expired = mapped.filter(i => i.daysLeft <= 0);
    const in30 = mapped.filter(i => i.daysLeft > 0 && i.daysLeft <= 30);
    const in60 = mapped.filter(i => i.daysLeft > 30 && i.daysLeft <= 60);
    const in90 = mapped.filter(i => i.daysLeft > 60 && i.daysLeft <= 90);
    const safe = mapped.filter(i => i.daysLeft > 90);

    // Cumulative next 30, 60, 90 days
    const cumulative30 = in30;
    const cumulative60 = [...in30, ...in60];
    const cumulative90 = [...in30, ...in60, ...in90];

    // Filter batches strictly within the active dashboard date range interval
    const inSelectedInterval = dateRangeFilter
      ? mapped.filter(i => {
          const expDate = (i.expirationDate || '').slice(0, 10);
          return expDate >= dateRangeFilter.startDate && expDate <= dateRangeFilter.endDate;
        })
      : [];

    const intervalStockVal = inSelectedInterval.reduce((sum, i) => sum + i.stockVal, 0);
    const intervalUnits = inSelectedInterval.reduce((sum, i) => sum + (i.stockQuantity ?? 0), 0);

    const totalAtRiskVal = cumulative90.reduce((sum, i) => sum + i.stockVal, 0);
    const totalAtRiskUnits = cumulative90.reduce((sum, i) => sum + (i.stockQuantity ?? 0), 0);

    return {
      expired,
      in30,
      in60,
      in90,
      safe,
      cumulative30,
      cumulative60,
      cumulative90,
      inSelectedInterval,
      intervalStockVal,
      intervalUnits,
      totalAtRiskVal,
      totalAtRiskUnits,
      totalBatchesTracked: mapped.length
    };
  }, [inventory, getDaysUntilExpiry, dateRangeFilter]);

  // List to display in the collapsible preview
  const displayBatches = useMemo(() => {
    if (selectedHorizon === '30') return batchData.in30;
    if (selectedHorizon === '60') return batchData.in60;
    if (selectedHorizon === '90') return batchData.in90;
    if (selectedHorizon === 'interval') return batchData.inSelectedInterval;
    return batchData.cumulative90;
  }, [selectedHorizon, batchData]);

  const totalExpiring90Days = batchData.cumulative90.length;

  return (
    <div 
      id="reports-expiry-summary-card"
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4"
    >
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800/60">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                Medicine Batch Expiry Horizons
              </h3>
              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-600">
                Next 30 • 60 • 90 Days
              </span>
              {batchData.expired.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-black bg-rose-600 text-white rounded-full">
                  {batchData.expired.length} Expired Batch{batchData.expired.length > 1 ? 'es' : ''}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Proactive shelf-life monitoring across active batches to prevent expired dead-stock and recover distributor credits.
            </p>
          </div>
        </div>

        {/* Action Button: Open Expiry Alert Center */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            id="reports-open-expiry-center-btn"
            onClick={() => onNavigateToExpiryCenter('all')}
            className="px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Open Full Expiry Alert Center & Return Slip Management"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Open Expiry Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Date Range Interval Expiry Banner (if active filter provided) */}
      {dateRangeFilter && (
        <div 
          id="reports-expiry-interval-banner"
          onClick={() => {
            setSelectedHorizon(selectedHorizon === 'interval' ? 'all' : 'interval');
            setIsExpanded(true);
          }}
          className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none ${
            selectedHorizon === 'interval'
              ? 'bg-teal-50/90 dark:bg-teal-950/50 border-teal-400 dark:border-teal-600 shadow-xs ring-2 ring-teal-400/20'
              : 'bg-teal-50/40 dark:bg-slate-900/40 border-teal-200/80 dark:border-teal-900/40 hover:bg-teal-50/70 dark:hover:bg-teal-950/30'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 border border-teal-200 dark:border-teal-800">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-teal-950 dark:text-teal-100">
                  Batches Expiring in Selected Range ({dateRangeFilter.shortLabel})
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 font-mono">
                  {dateRangeFilter.startDate} to {dateRangeFilter.endDate}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                {batchData.inSelectedInterval.length === 0 
                  ? 'No active batches expire during this selected interval.' 
                  : `${batchData.inSelectedInterval.length} batch(es) totaling ${batchData.intervalUnits} units expire within this selected window.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
            <div className="text-right">
              <span className="text-sm font-black text-teal-950 dark:text-teal-100 font-mono">
                ₹{batchData.intervalStockVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              <span className="block text-[10px] text-slate-400 font-medium">Cost In Window</span>
            </div>
            <span className="text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-100/80 dark:bg-teal-900/80 px-2.5 py-1 rounded-lg">
              {selectedHorizon === 'interval' ? 'Active Filter ✓' : 'Inspect Interval →'}
            </span>
          </div>
        </div>
      )}

      {/* 3 Interactive Horizon Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Tier 1: Next 30 Days (Critical) */}
        <div 
          id="reports-expiry-tier-30d"
          onClick={() => {
            setSelectedHorizon(selectedHorizon === '30' ? 'all' : '30');
            setIsExpanded(true);
          }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
            selectedHorizon === '30'
              ? 'bg-rose-50/90 dark:bg-rose-950/50 border-rose-400 dark:border-rose-600 shadow-xs ring-2 ring-rose-400/20'
              : 'bg-rose-50/40 dark:bg-slate-900/40 border-rose-200/80 dark:border-rose-900/40 hover:bg-rose-50/70 dark:hover:bg-rose-950/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              ≤ 30 Days Horizon
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200/80 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
              Immediate Risk
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline justify-between">
            <div>
              <div className="text-2xl font-black text-rose-950 dark:text-rose-100">
                {batchData.in30.length} <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">Batches</span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                {batchData.in30.reduce((s, i) => s + (i.stockQuantity ?? 0), 0)} units on shelf
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                ₹{batchData.in30.reduce((s, i) => s + i.stockVal, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Cost At Risk</div>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">Distributor Return / Clearance</span>
            <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
              Inspect →
            </span>
          </div>
        </div>

        {/* Tier 2: 31–60 Days (Warning) */}
        <div 
          id="reports-expiry-tier-60d"
          onClick={() => {
            setSelectedHorizon(selectedHorizon === '60' ? 'all' : '60');
            setIsExpanded(true);
          }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
            selectedHorizon === '60'
              ? 'bg-amber-50/90 dark:bg-amber-950/50 border-amber-400 dark:border-amber-600 shadow-xs ring-2 ring-amber-400/20'
              : 'bg-amber-50/40 dark:bg-slate-900/40 border-amber-200/80 dark:border-amber-900/40 hover:bg-amber-50/70 dark:hover:bg-amber-950/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              31–60 Days Horizon
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
              Clearance Window
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline justify-between">
            <div>
              <div className="text-2xl font-black text-amber-950 dark:text-amber-100">
                {batchData.in60.length} <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Batches</span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                {batchData.in60.reduce((s, i) => s + (i.stockQuantity ?? 0), 0)} units on shelf
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                ₹{batchData.in60.reduce((s, i) => s + i.stockVal, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Cost At Risk</div>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">Offer Markdown Scheme</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
              Inspect →
            </span>
          </div>
        </div>

        {/* Tier 3: 61–90 Days (Advisory) */}
        <div 
          id="reports-expiry-tier-90d"
          onClick={() => {
            setSelectedHorizon(selectedHorizon === '90' ? 'all' : '90');
            setIsExpanded(true);
          }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
            selectedHorizon === '90'
              ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-400 dark:border-blue-600 shadow-xs ring-2 ring-blue-400/20'
              : 'bg-blue-50/40 dark:bg-slate-900/40 border-blue-200/80 dark:border-blue-900/40 hover:bg-blue-50/70 dark:hover:bg-blue-950/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              61–90 Days Horizon
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-200/80 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              Advance Notice
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline justify-between">
            <div>
              <div className="text-2xl font-black text-blue-950 dark:text-blue-100">
                {batchData.in90.length} <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Batches</span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                {batchData.in90.reduce((s, i) => s + (i.stockQuantity ?? 0), 0)} units on shelf
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                ₹{batchData.in90.reduce((s, i) => s + i.stockVal, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Cost At Risk</div>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">Supplier Debit Note Buffer</span>
            <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
              Inspect →
            </span>
          </div>
        </div>
      </div>

      {/* Proportional Shelf-Life Distribution Progress Track */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Total 90-Day Expiry Horizon: <span className="text-slate-900 dark:text-white font-black">{totalExpiring90Days} Batches</span> ({batchData.totalAtRiskUnits} Units)
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Value at Risk: <strong className="text-slate-800 dark:text-slate-200 font-mono">₹{batchData.totalAtRiskVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
            </span>
          </div>

          <button
            type="button"
            id="reports-toggle-expiry-preview-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <span>{isExpanded ? 'Hide Batch Details' : `Show Batches (${displayBatches.length})`}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Visual Multi-Segment Bar */}
        {batchData.totalBatchesTracked > 0 && (
          <div className="h-2 w-full bg-slate-100 dark:bg-slate-700/80 rounded-full overflow-hidden flex">
            {batchData.in30.length > 0 && (
              <div 
                style={{ width: `${(batchData.in30.length / batchData.totalBatchesTracked) * 100}%` }}
                className="bg-rose-500 h-full transition-all"
                title={`${batchData.in30.length} batches expiring in ≤ 30 days`}
              />
            )}
            {batchData.in60.length > 0 && (
              <div 
                style={{ width: `${(batchData.in60.length / batchData.totalBatchesTracked) * 100}%` }}
                className="bg-amber-500 h-full transition-all"
                title={`${batchData.in60.length} batches expiring in 31–60 days`}
              />
            )}
            {batchData.in90.length > 0 && (
              <div 
                style={{ width: `${(batchData.in90.length / batchData.totalBatchesTracked) * 100}%` }}
                className="bg-blue-500 h-full transition-all"
                title={`${batchData.in90.length} batches expiring in 61–90 days`}
              />
            )}
            {batchData.safe.length > 0 && (
              <div 
                style={{ width: `${(batchData.safe.length / batchData.totalBatchesTracked) * 100}%` }}
                className="bg-emerald-500/80 h-full transition-all"
                title={`${batchData.safe.length} batches safe (> 90 days)`}
              />
            )}
          </div>
        )}

        <div className="flex items-center gap-4 text-[10px] text-slate-500 dark:text-slate-400 pt-0.5 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            ≤ 30d ({batchData.in30.length})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            31–60d ({batchData.in60.length})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            61–90d ({batchData.in90.length})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Safe &gt;90d ({batchData.safe.length})
          </span>
        </div>
      </div>

      {/* Expandable Preview Table of Batches */}
      {isExpanded && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 dark:text-white">
                {selectedHorizon === '30' && 'Batches Expiring Within ≤ 30 Days'}
                {selectedHorizon === '60' && 'Batches Expiring Within 31–60 Days'}
                {selectedHorizon === '90' && 'Batches Expiring Within 61–90 Days'}
                {selectedHorizon === 'all' && 'All Batches Expiring in Next 90 Days'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                {displayBatches.length} items
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {(['all', '30', '60', '90'] as const).map(tier => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setSelectedHorizon(tier)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    selectedHorizon === tier 
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {tier === 'all' ? 'All (90d)' : `≤${tier}d`}
                </button>
              ))}
            </div>
          </div>

          {displayBatches.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
              No medicine batches found expiring in this timeframe. Shelf-life buffer is clean.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 py-2.5">Medicine / Salt</th>
                    <th className="px-3 py-2.5">Batch No.</th>
                    <th className="px-3 py-2.5">Expiry Date</th>
                    <th className="px-3 py-2.5 text-center">Days Left</th>
                    <th className="px-3 py-2.5 text-right">In Stock</th>
                    <th className="px-3 py-2.5 text-right">Cost Value</th>
                    <th className="px-3 py-2.5">Rack Location</th>
                    <th className="px-3 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {displayBatches.map(item => {
                    const is30 = item.daysLeft <= 30;
                    const is60 = item.daysLeft > 30 && item.daysLeft <= 60;
                    return (
                      <tr 
                        key={item.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors"
                      >
                        <td className="px-3 py-2">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {item.brandName}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                            {item.saltComposition || item.genericName}
                          </div>
                        </td>

                        <td className="px-3 py-2 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {item.batchNumber || 'N/A'}
                        </td>

                        <td className="px-3 py-2 font-mono text-xs">
                          {item.expirationDate}
                        </td>

                        <td className="px-3 py-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black font-mono ${
                            is30 
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                              : is60 
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                          }`}>
                            {item.daysLeft <= 0 ? 'EXPIRED' : `${item.daysLeft}d left`}
                          </span>
                        </td>

                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {item.stockQuantity}
                        </td>

                        <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-300">
                          ₹{item.stockVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>

                        <td className="px-3 py-2 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                          {item.locationShelf || `${item.rackNumber || 'Rack A'}`}
                        </td>

                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const tier = is30 ? '30days' : is60 ? '60days' : '90days';
                              onNavigateToExpiryCenter(tier);
                            }}
                            className="px-2 py-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-md border border-rose-200 dark:border-rose-800/80 transition-all cursor-pointer"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Proactive Tip Notice */}
          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-xl text-xs flex items-start gap-2.5">
            <Tag className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-amber-900 dark:text-amber-200">
              <span className="font-bold">Proactive Return Strategy:</span> Most pharmaceutical stockists offer 100% replacement or credit notes for near-expiry medicines returned within the <strong>60-day to 90-day window</strong>. Batches under 30 days should be marked down for fast counter clearance or quarantined for return credit.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
