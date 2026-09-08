import React from 'react';
import { 
  AlertTriangle, 
  AlertCircle, 
  ArrowRight, 
  CheckCircle2, 
  Package, 
  Boxes, 
  Sparkles,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { MedicationInventory } from '../../types/pharmacy';

interface ReportsLowStockWidgetProps {
  lowStockItems: MedicationInventory[];
  onNavigateToInventory: () => void;
  dateRangeLabel?: string;
  intervalUnitsSold?: number;
}

export const ReportsLowStockWidget: React.FC<ReportsLowStockWidgetProps> = ({
  lowStockItems = [],
  onNavigateToInventory,
  dateRangeLabel,
  intervalUnitsSold
}) => {
  const totalCount = lowStockItems.length;
  const outOfStockCount = lowStockItems.filter(item => (item.stockQuantity ?? 0) <= 0).length;
  const criticallyLowCount = totalCount - outOfStockCount;

  // Take the top 3-4 most critical items (lowest stock first)
  const urgentPreview = lowStockItems.slice(0, 3);

  // If there are zero low stock items
  if (totalCount === 0) {
    return (
      <div 
        id="reports-low-stock-widget"
        className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-300 dark:border-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-black text-emerald-950 dark:text-emerald-100">
                All Inventory Well-Stocked (0 Low-Stock Items)
              </h4>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 rounded-full">
                Safe Buffer
              </span>
            </div>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
              Every medicine in your catalog currently meets or exceeds its minimum safety reorder threshold.
            </p>
          </div>
        </div>

        <button
          type="button"
          id="reports-quick-restock-btn"
          onClick={onNavigateToInventory}
          className="px-3.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 rounded-xl transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer shadow-2xs"
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Open Inventory</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div 
      id="reports-low-stock-widget"
      className="bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-rose-50/80 dark:from-slate-800 dark:via-slate-800/95 dark:to-slate-800/90 border border-amber-200/90 dark:border-amber-700/50 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Indicator, Title & Count */}
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-300/80 dark:border-amber-600/40">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                Low-Stock Inventory Alert
              </h4>
              <span className="px-2 py-0.5 text-[11px] font-black bg-rose-600 text-white rounded-full shadow-2xs flex items-center gap-1">
                <span>{totalCount} Items</span>
              </span>

              {outOfStockCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 rounded-full border border-rose-300 dark:border-rose-800">
                  {outOfStockCount} Out of Stock
                </span>
              )}

              {criticallyLowCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-full border border-amber-300 dark:border-amber-800">
                  {criticallyLowCount} Below Minimum Alert
                </span>
              )}

              {dateRangeLabel && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full border border-slate-200 dark:border-slate-700">
                  Range: {dateRangeLabel}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {totalCount === 1 
                ? '1 medicine is running dangerously low and needs a purchase order replenishment.' 
                : `${totalCount} medicines are at or below safety reorder levels risking counter stockouts.`}
              {intervalUnitsSold !== undefined && intervalUnitsSold > 0 && (
                <span className="ml-1 text-amber-700 dark:text-amber-400 font-semibold">
                  ({intervalUnitsSold} units sold during this filtered interval)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right: Quick Action Button to Navigate to Inventory */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            id="reports-quick-restock-btn"
            onClick={onNavigateToInventory}
            className="px-4 py-2 text-xs font-black text-white bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950 rounded-xl transition-all flex items-center gap-2 shadow-2xs hover:shadow-xs active:scale-[0.99] cursor-pointer"
            title="Navigate directly to Inventory Management to restock items"
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Restock in Inventory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Urgent Item Preview Strip */}
      {urgentPreview.length > 0 && (
        <div className="pt-2.5 border-t border-amber-200/60 dark:border-slate-700/80 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            Urgent Restocks:
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            {urgentPreview.map((item, idx) => {
              const qty = item.stockQuantity ?? 0;
              const isOut = qty <= 0;
              return (
                <div
                  key={item.id || idx}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                    isOut 
                      ? 'bg-rose-100/90 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200' 
                      : 'bg-white/80 dark:bg-slate-900/80 border-amber-200 dark:border-amber-800/60 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <span className="font-bold truncate max-w-[130px]" title={item.brandName}>
                    {item.brandName}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                    isOut 
                      ? 'bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200' 
                      : 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200'
                  }`}>
                    {qty} left
                  </span>
                  {item.locationShelf && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono hidden md:inline">
                      ({item.locationShelf})
                    </span>
                  )}
                </div>
              );
            })}

            {totalCount > urgentPreview.length && (
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 pl-1">
                +{totalCount - urgentPreview.length} more in inventory
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
