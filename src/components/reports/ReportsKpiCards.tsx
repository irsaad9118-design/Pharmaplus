import React from 'react';
import { 
  TrendingUp, 
  IndianRupee, 
  Percent, 
  Zap, 
  AlertTriangle, 
  Package, 
  Layers
} from 'lucide-react';
import { ComprehensiveReportsAnalysis } from '../../utils/reportsAnalytics';

interface ReportsKpiCardsProps {
  analysis: ComprehensiveReportsAnalysis;
  onFilterRestock?: () => void;
  onFilterDeadStock?: () => void;
}

export const ReportsKpiCards: React.FC<ReportsKpiCardsProps> = ({
  analysis,
  onFilterRestock,
  onFilterDeadStock
}) => {
  const { summary } = analysis;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Total Net Revenue */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-2xs relative overflow-hidden group hover:border-teal-400 dark:hover:border-teal-600 transition-all">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Net Sales Revenue
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-1">
              <span>₹{summary.totalRevenue.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+10.5% MoM Growth</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 flex items-center justify-center text-teal-600 dark:text-teal-300 shrink-0">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>{summary.totalTransactions} Invoices</span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">Avg ₹{summary.averageOrderValue}/Bill</span>
        </div>
      </div>

      {/* 2. Gross Profit & Net Margin % */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-2xs relative overflow-hidden group hover:border-emerald-400 dark:hover:border-emerald-600 transition-all">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Gross Pharmacy Profit
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 flex items-baseline gap-1">
              <span>₹{summary.totalGrossProfit.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80">
                {summary.overallProfitMargin}% Margin
              </span>
              <span className="text-slate-400">across catalog</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-300 shrink-0">
            <Percent className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>{summary.totalUnitsSold} Units Dispensed</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Healthy Margin</span>
        </div>
      </div>

      {/* 3. Fast-Moving & Star SKUs */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-2xs relative overflow-hidden group hover:border-sky-400 dark:hover:border-sky-600 transition-all">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              High-Velocity SKUs
            </span>
            <div className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400 flex items-baseline gap-1">
              <span>{summary.fastMovingSkuCount} Fast Movers</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{summary.classAShareRevenuePercent}% Revenue Share (Class A)</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 flex items-center justify-center text-sky-600 dark:text-sky-300 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>Daily burn rate tracked</span>
          <span className="font-semibold text-sky-600 dark:text-sky-400">Pareto Optimized</span>
        </div>
      </div>

      {/* 4. Stock Decision Alerts: Restock Risk & Dead Stock */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-2xs relative overflow-hidden group hover:border-rose-400 dark:hover:border-rose-600 transition-all">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Stock Decision Radar
            </span>
            <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 flex items-baseline gap-1">
              <span>{summary.criticalRestockCount} Reorders Due</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span>₹{summary.deadStockCapital.toLocaleString()} in Slow Stock</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-rose-600 dark:text-rose-300 shrink-0">
            <Package className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
          <button
            type="button"
            onClick={onFilterRestock}
            className="text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
          >
            View Restock List →
          </button>
          <button
            type="button"
            onClick={onFilterDeadStock}
            className="text-amber-600 dark:text-amber-400 font-semibold hover:underline cursor-pointer"
          >
            Liquidate Slow
          </button>
        </div>
      </div>
    </div>
  );
};
