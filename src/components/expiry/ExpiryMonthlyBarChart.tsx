import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import { MedicationInventory, ExpiryAlertTier } from '../../types/pharmacy';
import {
  Calendar,
  TrendingDown,
  AlertTriangle,
  Layers,
  Sparkles,
  Info,
  DollarSign,
  Package,
  CheckCircle2,
  Filter,
  X,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';

export interface MonthlyExpiryBucket {
  monthKey: string;          // e.g. "2026-09"
  monthLabel: string;        // e.g. "Sep '26"
  fullMonthName: string;     // e.g. "September 2026"
  year: number;
  monthIndex: number;        // 0-11
  
  // Aggregate Counts
  batchCount: number;
  totalUnits: number;
  atRiskCost: number;        // purchaseRate * stockQuantity
  atRiskMrp: number;         // mrp * stockQuantity

  // Tier Breakdown
  redBatches: number;        // <=30 days
  amberBatches: number;      // 31-60 days
  yellowBatches: number;     // 61-90 days
  greenBatches: number;      // >90 days

  redUnits: number;
  amberUnits: number;
  yellowUnits: number;
  greenUnits: number;

  redCost: number;
  amberCost: number;
  yellowCost: number;
  greenCost: number;

  // Urgent flag
  hasUrgentItems: boolean;
  dominantTier: ExpiryAlertTier;
  items: (MedicationInventory & { daysLeft: number; tier: ExpiryAlertTier })[];
}

interface ExpiryMonthlyBarChartProps {
  inventory: MedicationInventory[];
  getDaysUntilExpiry: (dateStr: string) => number;
  getExpiryTier: (dateStr: string) => ExpiryAlertTier;
  selectedMonthFilter?: string | null;
  onSelectMonthFilter?: (monthKey: string | null) => void;
}

type MetricMode = 'batches' | 'units' | 'cost';
type ViewRange = '6months' | '12months' | 'all';
type BarMode = 'stacked' | 'unified';

export const ExpiryMonthlyBarChart: React.FC<ExpiryMonthlyBarChartProps> = ({
  inventory,
  getDaysUntilExpiry,
  getExpiryTier,
  selectedMonthFilter = null,
  onSelectMonthFilter
}) => {
  const [metricMode, setMetricMode] = useState<MetricMode>('batches');
  const [viewRange, setViewRange] = useState<ViewRange>('6months');
  const [barMode, setBarMode] = useState<BarMode>('stacked');
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  // Parse inventory into monthly buckets
  const { monthlyBuckets, summaryMetrics } = useMemo(() => {
    const bucketsMap = new Map<string, MonthlyExpiryBucket>();
    const activeInventory = (inventory || []).filter(item => item && !item.quarantined);

    // Reference today date: Aug 2026
    const today = new Date('2026-08-23');
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // Determine horizon months to pre-populate (e.g. current month + next 11 months)
    const totalMonthsToGenerate = viewRange === '6months' ? 6 : viewRange === '12months' ? 12 : 18;

    for (let i = 0; i < totalMonthsToGenerate; i++) {
      const targetDate = new Date(currentYear, currentMonth + i, 1);
      const y = targetDate.getFullYear();
      const m = targetDate.getMonth();
      const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
      const monthLabel = targetDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const fullMonthName = targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      bucketsMap.set(monthKey, {
        monthKey,
        monthLabel,
        fullMonthName,
        year: y,
        monthIndex: m,
        batchCount: 0,
        totalUnits: 0,
        atRiskCost: 0,
        atRiskMrp: 0,
        redBatches: 0,
        amberBatches: 0,
        yellowBatches: 0,
        greenBatches: 0,
        redUnits: 0,
        amberUnits: 0,
        yellowUnits: 0,
        greenUnits: 0,
        redCost: 0,
        amberCost: 0,
        yellowCost: 0,
        greenCost: 0,
        hasUrgentItems: false,
        dominantTier: 'green',
        items: []
      });
    }

    // Populate data with active inventory items
    activeInventory.forEach(item => {
      if (!item.expirationDate) return;
      
      const expDate = new Date(item.expirationDate);
      if (isNaN(expDate.getTime())) return;

      const y = expDate.getFullYear();
      const m = expDate.getMonth();
      const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;

      const daysLeft = getDaysUntilExpiry(item.expirationDate);
      const tier = getExpiryTier(item.expirationDate);
      const itemWithMeta = { ...item, daysLeft, tier };

      const qty = item.stockQuantity || 0;
      const cost = (item.purchaseRate || item.costPrice || 0) * qty;
      const mrp = (item.mrp || 0) * qty;

      let bucket = bucketsMap.get(monthKey);
      if (!bucket) {
        // If outside pre-populated range but within 'all' view
        if (viewRange === 'all') {
          const monthLabel = expDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          const fullMonthName = expDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          bucket = {
            monthKey,
            monthLabel,
            fullMonthName,
            year: y,
            monthIndex: m,
            batchCount: 0,
            totalUnits: 0,
            atRiskCost: 0,
            atRiskMrp: 0,
            redBatches: 0,
            amberBatches: 0,
            yellowBatches: 0,
            greenBatches: 0,
            redUnits: 0,
            amberUnits: 0,
            yellowUnits: 0,
            greenUnits: 0,
            redCost: 0,
            amberCost: 0,
            yellowCost: 0,
            greenCost: 0,
            hasUrgentItems: false,
            dominantTier: 'green',
            items: []
          };
          bucketsMap.set(monthKey, bucket);
        } else {
          return;
        }
      }

      bucket.batchCount += 1;
      bucket.totalUnits += qty;
      bucket.atRiskCost += cost;
      bucket.atRiskMrp += mrp;
      bucket.items.push(itemWithMeta);

      if (tier === 'red') {
        bucket.redBatches += 1;
        bucket.redUnits += qty;
        bucket.redCost += cost;
        bucket.hasUrgentItems = true;
      } else if (tier === 'amber') {
        bucket.amberBatches += 1;
        bucket.amberUnits += qty;
        bucket.amberCost += cost;
        bucket.hasUrgentItems = true;
      } else if (tier === 'yellow') {
        bucket.yellowBatches += 1;
        bucket.yellowUnits += qty;
        bucket.yellowCost += cost;
      } else {
        bucket.greenBatches += 1;
        bucket.greenUnits += qty;
        bucket.greenCost += cost;
      }
    });

    // Sort buckets chronologically
    const sorted = Array.from(bucketsMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthIndex - b.monthIndex;
    });

    // Calculate dominant tier per bucket
    sorted.forEach(b => {
      if (b.redBatches > 0) b.dominantTier = 'red';
      else if (b.amberBatches > 0) b.dominantTier = 'amber';
      else if (b.yellowBatches > 0) b.dominantTier = 'yellow';
      else b.dominantTier = 'green';
    });

    // Calculate summary metrics across range
    let peakMonth: MonthlyExpiryBucket | null = null;
    let maxMetricVal = -1;
    let total90DayBatches = 0;
    let total90DayCost = 0;
    let total90DayUnits = 0;
    let totalBatchesInRange = 0;

    sorted.forEach((b, idx) => {
      totalBatchesInRange += b.batchCount;
      if (idx < 3) {
        // Next 3 months (approx 90 days)
        total90DayBatches += b.batchCount;
        total90DayCost += b.atRiskCost;
        total90DayUnits += b.totalUnits;
      }
      const val = metricMode === 'batches' ? b.batchCount : metricMode === 'units' ? b.totalUnits : b.atRiskCost;
      if (val > maxMetricVal && val > 0) {
        maxMetricVal = val;
        peakMonth = b;
      }
    });

    return {
      monthlyBuckets: sorted,
      summaryMetrics: {
        peakMonth,
        total90DayBatches,
        total90DayCost,
        total90DayUnits,
        totalBatchesInRange,
        avgBatchesPerMonth: sorted.length > 0 ? (totalBatchesInRange / sorted.length).toFixed(1) : '0'
      }
    };
  }, [inventory, viewRange, metricMode, getDaysUntilExpiry, getExpiryTier]);

  // Format Recharts data based on active metric
  const chartData = useMemo(() => {
    return monthlyBuckets.map(b => {
      let redVal = b.redBatches;
      let amberVal = b.amberBatches;
      let yellowVal = b.yellowBatches;
      let greenVal = b.greenBatches;
      let totalVal = b.batchCount;

      if (metricMode === 'units') {
        redVal = b.redUnits;
        amberVal = b.amberUnits;
        yellowVal = b.yellowUnits;
        greenVal = b.greenUnits;
        totalVal = b.totalUnits;
      } else if (metricMode === 'cost') {
        redVal = Math.round(b.redCost);
        amberVal = Math.round(b.amberCost);
        yellowVal = Math.round(b.yellowCost);
        greenVal = Math.round(b.greenCost);
        totalVal = Math.round(b.atRiskCost);
      }

      return {
        monthKey: b.monthKey,
        label: b.monthLabel,
        fullName: b.fullMonthName,
        total: totalVal,
        red: redVal,
        amber: amberVal,
        yellow: yellowVal,
        green: greenVal,
        rawBucket: b,
        isSelected: selectedMonthFilter === b.monthKey
      };
    });
  }, [monthlyBuckets, metricMode, selectedMonthFilter]);

  // Custom Chart Tooltip
  const CustomChartTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0]?.payload;
    const bucket: MonthlyExpiryBucket = data?.rawBucket;
    if (!bucket) return null;

    const isSelected = selectedMonthFilter === bucket.monthKey;

    return (
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/90 text-white rounded-xl p-3.5 shadow-2xl max-w-xs text-xs space-y-2.5 z-50 pointer-events-none">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-700/80">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-teal-400" />
            <span className="font-bold text-slate-100 text-sm">{bucket.fullMonthName}</span>
          </div>
          {bucket.dominantTier === 'red' && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
              Critical (≤30d)
            </span>
          )}
          {bucket.dominantTier === 'amber' && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Urgent (31-60d)
            </span>
          )}
          {bucket.dominantTier === 'yellow' && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
              Review (61-90d)
            </span>
          )}
          {bucket.dominantTier === 'green' && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Safe &gt;90d
            </span>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/60 p-2 rounded-lg border border-slate-800">
          <div>
            <span className="text-slate-400 block">Expiring Batches:</span>
            <span className="font-bold text-white text-xs">{bucket.batchCount} batch{bucket.batchCount === 1 ? '' : 'es'}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Total Units:</span>
            <span className="font-bold text-white text-xs">{bucket.totalUnits.toLocaleString()} units</span>
          </div>
          <div>
            <span className="text-slate-400 block">Cost at Risk (PTR):</span>
            <span className="font-bold text-rose-400 font-mono text-xs">₹{bucket.atRiskCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
          <div>
            <span className="text-slate-400 block">MRP Value:</span>
            <span className="font-bold text-teal-300 font-mono text-xs">₹{bucket.atRiskMrp.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        {/* Breakdown by Tier Pills */}
        {bucket.batchCount > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Urgency Breakdown:
            </div>
            <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
              {bucket.redBatches > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  ● Red: {bucket.redBatches} ({bucket.redUnits}u)
                </span>
              )}
              {bucket.amberBatches > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ● Amber: {bucket.amberBatches} ({bucket.amberUnits}u)
                </span>
              )}
              {bucket.yellowBatches > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                  ● Yellow: {bucket.yellowBatches} ({bucket.yellowUnits}u)
                </span>
              )}
              {bucket.greenBatches > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  ● Safe: {bucket.greenBatches} ({bucket.greenUnits}u)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Top Sample Medicines Expiring this month */}
        {bucket.items.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-slate-800">
            <div className="text-[10px] text-slate-400 font-medium">Medications expiring in this month:</div>
            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
              {bucket.items.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px] bg-slate-800/60 px-2 py-1 rounded">
                  <span className="font-semibold text-slate-200 truncate max-w-[140px]">{item.brandName}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{item.stockQuantity}u • {item.daysLeft}d left</span>
                </div>
              ))}
              {bucket.items.length > 3 && (
                <div className="text-[10px] text-teal-400 text-center">
                  +{bucket.items.length - 3} more medications
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-[10px] text-teal-300/80 italic pt-1 text-center bg-teal-950/40 rounded py-1 border border-teal-800/40">
          {isSelected ? '✓ Currently filtering table below' : '💡 Click bar to filter table by this month'}
        </div>
      </div>
    );
  };

  // Color generator for unified bar mode
  const getUnifiedBarColor = (bucket: MonthlyExpiryBucket, isSelected: boolean) => {
    if (isSelected) return '#38bdf8'; // Sky-400 for selected
    if (bucket.redBatches > 0) return '#f43f5e'; // Rose-500
    if (bucket.amberBatches > 0) return '#f59e0b'; // Amber-500
    if (bucket.yellowBatches > 0) return '#eab308'; // Yellow-500
    return '#14b8a6'; // Teal-500
  };

  return (
    <div id="monthly-expiry-distribution-chart" className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all">
      
      {/* Header Toolbar */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/30">
        
        {/* Title & Description */}
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <span>Monthly Expiry Timeline &amp; Risk Distribution</span>
                {summaryMetrics.peakMonth && (
                  <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    Peak: {summaryMetrics.peakMonth.fullMonthName}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visual forward-looking projection of medication batch expiries to schedule supplier debit returns and clearance markdowns.
              </p>
            </div>
          </div>
        </div>

        {/* Controls & Metric Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Metric Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setMetricMode('batches')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                metricMode === 'batches'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="View number of distinct medicine batches expiring per month"
            >
              Batches
            </button>
            <button
              onClick={() => setMetricMode('units')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                metricMode === 'units'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="View total physical units (strips/bottles) expiring per month"
            >
              Units
            </button>
            <button
              onClick={() => setMetricMode('cost')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                metricMode === 'cost'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="View total cost value at financial risk (PTR Cost)"
            >
              Cost (₹)
            </button>
          </div>

          {/* Time Horizon Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setViewRange('6months')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                viewRange === '6months'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Next 6M
            </button>
            <button
              onClick={() => setViewRange('12months')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                viewRange === '12months'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              12 Months
            </button>
            <button
              onClick={() => setViewRange('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                viewRange === 'all'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All
            </button>
          </div>

          {/* Bar Stacking Toggle */}
          <button
            onClick={() => setBarMode(barMode === 'stacked' ? 'unified' : 'stacked')}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              barMode === 'stacked'
                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
            title="Toggle between Urgency Stacked Breakdown and Unified Bar"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{barMode === 'stacked' ? 'Stacked Tiers' : 'Unified Bars'}</span>
          </button>

        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-700/80 bg-slate-50/30 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-700/80 text-xs">
        
        <div className="p-3.5 sm:px-5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            90-Day Critical Window
          </span>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">
              {summaryMetrics.total90DayBatches} Batches
            </span>
            <span className="text-[11px] text-slate-400">({summaryMetrics.total90DayUnits} units)</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Expiring within next 3 calendar months</p>
        </div>

        <div className="p-3.5 sm:px-5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            90-Day Cost Exposure
          </span>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">
              ₹{summaryMetrics.total90DayCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 px-1 py-0.2 rounded">
              At Risk
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Eligible for supplier debit note claim</p>
        </div>

        <div className="p-3.5 sm:px-5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Peak Expiry Volume Month
          </span>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-slate-900 dark:text-white truncate">
              {summaryMetrics.peakMonth?.monthLabel || 'N/A'}
            </span>
            {summaryMetrics.peakMonth && (
              <span className="text-[11px] text-slate-400 font-mono">
                ({summaryMetrics.peakMonth.batchCount} batches)
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Highest concentration of batch renewals</p>
        </div>

        <div className="p-3.5 sm:px-5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Average Run-Rate
          </span>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-teal-600 dark:text-teal-400 font-mono">
              {summaryMetrics.avgBatchesPerMonth}
            </span>
            <span className="text-[11px] text-slate-400">batches / month</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Projected replenishment cycle</p>
        </div>

      </div>

      {/* Active Month Filter Chip Banner */}
      {selectedMonthFilter && (
        <div className="mx-5 mt-4 p-2.5 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 rounded-xl flex items-center justify-between text-xs text-teal-800 dark:text-teal-200 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              Filtering medications expiring in: <strong className="text-slate-900 dark:text-white font-bold">{
                monthlyBuckets.find(b => b.monthKey === selectedMonthFilter)?.fullMonthName || selectedMonthFilter
              }</strong>
              <span className="ml-2 font-mono text-teal-600 dark:text-teal-400">
                ({monthlyBuckets.find(b => b.monthKey === selectedMonthFilter)?.batchCount || 0} batches)
              </span>
            </span>
          </div>
          <button
            onClick={() => onSelectMonthFilter && onSelectMonthFilter(null)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-100 dark:bg-teal-900/60 hover:bg-teal-200 text-teal-900 dark:text-teal-100 font-bold transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear Filter</span>
          </button>
        </div>
      )}

      {/* Recharts Bar Chart Area */}
      <div className="p-5">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
              onClick={(state: any) => {
                if (state && state.activePayload && state.activePayload.length > 0) {
                  const clickedKey = state.activePayload[0].payload.monthKey;
                  if (onSelectMonthFilter) {
                    onSelectMonthFilter(selectedMonthFilter === clickedKey ? null : clickedKey);
                  }
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
              
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: '#88888830' }}
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
              />
              
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={(val) => {
                  if (metricMode === 'cost') {
                    return `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`;
                  }
                  return val.toString();
                }}
              />

              <Tooltip content={<CustomChartTooltip />} />

              {barMode === 'stacked' ? (
                <>
                  {/* Stacked Tiers by Expiry Urgency */}
                  <Bar
                    dataKey="red"
                    name="Red Alert (≤30d)"
                    stackId="expiry"
                    fill="#f43f5e"
                    cursor="pointer"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="amber"
                    name="Amber Alert (31-60d)"
                    stackId="expiry"
                    fill="#f59e0b"
                    cursor="pointer"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="yellow"
                    name="Yellow Alert (61-90d)"
                    stackId="expiry"
                    fill="#eab308"
                    cursor="pointer"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="green"
                    name="Safe Stock (>90d)"
                    stackId="expiry"
                    fill="#14b8a6"
                    cursor="pointer"
                    radius={[4, 4, 0, 0]}
                  />
                </>
              ) : (
                /* Unified Bar with dynamic color coding */
                <Bar
                  dataKey="total"
                  name={metricMode === 'batches' ? 'Batches' : metricMode === 'units' ? 'Units' : 'Cost (₹)'}
                  cursor="pointer"
                  radius={[4, 4, 0, 0]}
                >
                  {chartData.map((entry, index) => {
                    const isSelected = selectedMonthFilter === entry.monthKey;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={getUnifiedBarColor(entry.rawBucket, isSelected)}
                        stroke={isSelected ? '#0284c7' : 'none'}
                        strokeWidth={isSelected ? 2 : 0}
                      />
                    );
                  })}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom Legend & Interactive Guide */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          
          {/* Urgency Legend Pills */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Red (&le;30 Days)
            </span>
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Amber (31–60 Days)
            </span>
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" /> Yellow (61–90 Days)
            </span>
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" /> Safe (&gt;90 Days)
            </span>
          </div>

          {/* Interaction Instruction */}
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Info className="w-3.5 h-3.5 text-teal-500" />
            <span>Click any bar to drill down and filter batch items below.</span>
          </div>

        </div>

      </div>

    </div>
  );
};
