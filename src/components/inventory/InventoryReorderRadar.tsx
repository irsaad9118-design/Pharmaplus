import React from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  Calendar, 
  DollarSign, 
  ArrowUpDown, 
  Filter, 
  Clock,
  Sparkles
} from 'lucide-react';
import { ReorderRadarSummary } from '../../utils/reorderForecastUtils';

interface InventoryReorderRadarProps {
  summary: ReorderRadarSummary;
  isUrgentFilterActive: boolean;
  onToggleUrgentFilter: () => void;
  isSortByUrgencyActive: boolean;
  onToggleSortByUrgency: () => void;
}

export const InventoryReorderRadar: React.FC<InventoryReorderRadarProps> = ({
  summary,
  isUrgentFilterActive,
  onToggleUrgentFilter,
  isSortByUrgencyActive,
  onToggleSortByUrgency
}) => {
  return (
    <div 
      id="inventory-reorder-radar-banner"
      className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 border border-teal-800/60 shadow-md relative overflow-hidden"
    >
      {/* Subtle Background Glow */}
      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute right-1/3 -top-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
        
        {/* Left Info: Header & Description */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-300 border border-teal-400/30 text-[11px] font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              Automated Consumption Intelligence
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Average Daily Sales (ADS) Forecast
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
            Suggested Reorder Radar
          </h3>
          <p className="text-xs text-slate-300 max-w-xl">
            Calculates predictive stockout dates and optimal replenishment timing by analyzing POS transaction velocity, pack sizes, and 3-day supplier lead times.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            id="filter-urgent-reorder-btn"
            onClick={onToggleUrgentFilter}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isUrgentFilterActive
                ? 'bg-rose-500 text-white ring-2 ring-rose-400/40 shadow-xs'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>
              {isUrgentFilterActive ? 'Showing Urgent Only (≤ 7 Days) ✓' : 'Filter Urgent Reorders (≤ 7 Days)'}
            </span>
          </button>

          <button
            type="button"
            id="sort-reorder-urgency-btn"
            onClick={onToggleSortByUrgency}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isSortByUrgencyActive
                ? 'bg-teal-500 text-white ring-2 ring-teal-400/40 shadow-xs'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-teal-300" />
            <span>
              {isSortByUrgencyActive ? 'Sorted: Most Urgent First' : 'Sort by Reorder Urgency'}
            </span>
          </button>
        </div>

      </div>

      {/* Metrics Counter Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3.5 border-t border-white/10 text-xs">
        
        {/* Urgent Today / Stockout */}
        <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
          <span className="text-[11px] text-rose-300 flex items-center gap-1 font-semibold">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            Urgent (≤ 3 Days)
          </span>
          <div className="text-xl font-black font-mono text-white mt-0.5">
            {summary.urgentReorderCount} <span className="text-[11px] font-normal text-slate-400">items</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {summary.outOfStockCount > 0 ? `${summary.outOfStockCount} currently zero stock` : 'Order immediately today'}
          </span>
        </div>

        {/* Approaching (4-7 Days) */}
        <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
          <span className="text-[11px] text-amber-300 flex items-center gap-1 font-semibold">
            <Clock className="w-3 h-3 text-amber-400" />
            Approaching (4–7 Days)
          </span>
          <div className="text-xl font-black font-mono text-white mt-0.5">
            {summary.upcomingReorderCount} <span className="text-[11px] font-normal text-slate-400">items</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Plan distributor purchase order
          </span>
        </div>

        {/* Reorders This Month */}
        <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
          <span className="text-[11px] text-teal-300 flex items-center gap-1 font-semibold">
            <Calendar className="w-3 h-3 text-teal-400" />
            Reorder Horizon (30d)
          </span>
          <div className="text-xl font-black font-mono text-white mt-0.5">
            {summary.reorderThisMonthCount} <span className="text-[11px] font-normal text-slate-400">items</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Total items needing cycle stock
          </span>
        </div>

        {/* Capital Required */}
        <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
          <span className="text-[11px] text-emerald-300 flex items-center gap-1 font-semibold">
            <DollarSign className="w-3 h-3 text-emerald-400" />
            PO Capital Required
          </span>
          <div className="text-xl font-black font-mono text-emerald-300 mt-0.5">
            ₹{summary.totalCapitalRequired.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Estimated PTR for critical items
          </span>
        </div>

      </div>
    </div>
  );
};
