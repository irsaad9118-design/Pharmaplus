import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  ShoppingCart, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  X, 
  CheckCircle2, 
  Boxes, 
  Send, 
  Copy, 
  Filter, 
  Sparkles, 
  MapPin, 
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { MedicationInventory } from '../../types/pharmacy';
import { ItemReorderForecast } from '../../utils/reorderForecastUtils';

export interface ReorderAlertItem {
  item: MedicationInventory;
  forecast: ItemReorderForecast;
}

interface AutomaticReorderAlertBannerProps {
  alertItems: ReorderAlertItem[];
  allForecastsMap: Map<string, ItemReorderForecast>;
  isTableFiltered: boolean;
  onToggleFilterTable: () => void;
  onOpenForecastModal: (item: MedicationInventory) => void;
  onLocateItem: (brandName: string) => void;
  onCreateConsolidatedPO?: (items: ReorderAlertItem[]) => void;
  onToast: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
}

export const AutomaticReorderAlertBanner: React.FC<AutomaticReorderAlertBannerProps> = ({
  alertItems,
  allForecastsMap,
  isTableFiltered,
  onToggleFilterTable,
  onOpenForecastModal,
  onLocateItem,
  onCreateConsolidatedPO,
  onToast
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [timeHorizon, setTimeHorizon] = useState<'critical' | 'all'>('critical');
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  // Filter items based on selected urgency threshold
  const displayedItems = useMemo(() => {
    if (timeHorizon === 'critical') {
      return alertItems.filter(({ item, forecast }) => {
        const isStockAtOrBelow = (item.stockQuantity ?? 0) <= (item.reorderLevel || item.minAlertLevel || 10);
        return isStockAtOrBelow || forecast.daysUntilReorder <= 3 || forecast.urgencyStatus === 'out_of_stock' || forecast.urgencyStatus === 'urgent';
      });
    }
    return alertItems;
  }, [alertItems, timeHorizon]);

  // Aggregate metrics
  const totalReplenishmentCost = useMemo(() => {
    return displayedItems.reduce((acc, { forecast }) => acc + (forecast.estimatedOrderCost || 0), 0);
  }, [displayedItems]);

  const outOfStockCount = useMemo(() => {
    return displayedItems.filter(({ item }) => (item.stockQuantity ?? 0) <= 0).length;
  }, [displayedItems]);

  const criticalCount = useMemo(() => {
    return displayedItems.filter(({ forecast }) => forecast.daysUntilReorder <= 3).length;
  }, [displayedItems]);

  // Copy structured replenishment list to clipboard
  const handleCopyReplenishmentList = () => {
    if (displayedItems.length === 0) return;
    const lines = [
      `*URGENT REORDER REQUISITION - REORDER POINT REACHED*`,
      `Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      `Total Triggered Items: ${displayedItems.length}`,
      `Total Estimated Reorder Capital: ₹${totalReplenishmentCost.toFixed(2)}`,
      `--------------------------------------------------`,
      ...displayedItems.map(({ item, forecast }, idx) => {
        return `${idx + 1}. ${item.brandName} (${item.saltComposition || item.genericName || ''})
   • Current Stock: ${item.stockQuantity ?? 0} ${item.unit || 'units'} (Reorder Point: ${item.reorderLevel || item.minAlertLevel || 10})
   • Consumption Velocity: ${forecast.averageDailySales} units/day (~${forecast.monthlyRunRate} /month)
   • Stock Runway: ${forecast.daysOfStockRemaining} days (${forecast.daysUntilReorder <= 0 ? 'Stockout Imminent' : `Reorder in ${forecast.daysUntilReorder}d`})
   • Suggested Order: ${forecast.suggestedOrderQty} units (${forecast.suggestedOrderPacks} packs)
   • Supplier: ${forecast.supplierName || 'Primary Distributor'}`;
      }),
      `--------------------------------------------------`,
      `_Generated automatically by PharmPulse Inventory Consumption Radar_`
    ];

    navigator.clipboard.writeText(lines.join('\n\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);

    onToast({
      type: 'success',
      title: 'Reorder List Copied',
      message: `Copied requisition details for ${displayedItems.length} medicines to clipboard.`
    });
  };

  // If no items have reached reorder point and not dismissed, do not render
  if (alertItems.length === 0) {
    return null;
  }

  // If dismissed, render a subtle re-open pill
  if (isDismissed) {
    return (
      <div className="flex items-center justify-between px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-200 animate-in fade-in">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span className="font-bold">
            {alertItems.length} {alertItems.length === 1 ? 'medicine has' : 'medicines have'} reached reorder point based on consumption.
          </span>
        </div>
        <button
          type="button"
          id="reopen-reorder-alert-banner-btn"
          onClick={() => setIsDismissed(false)}
          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition-colors cursor-pointer shadow-xs"
        >
          View Alert Banner
        </button>
      </div>
    );
  }

  return (
    <div 
      id="automatic-reorder-alert-banner"
      className="rounded-2xl border border-amber-300 dark:border-amber-700/80 bg-gradient-to-br from-amber-50/95 via-orange-50/80 to-amber-100/50 dark:from-slate-900 dark:via-amber-950/30 dark:to-slate-900 shadow-sm relative overflow-hidden transition-all animate-in fade-in slide-in-from-top-2"
    >
      {/* Decorative top accent line */}
      <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600" />

      {/* Main Banner Header */}
      <div className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left info */}
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[11px] font-black uppercase tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                </span>
                Consumption Velocity Alert
              </span>

              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                30-Day POS Burn Rate Model
              </span>

              {outOfStockCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold">
                  {outOfStockCount} Out of Stock
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {displayedItems.length} {displayedItems.length === 1 ? 'Medicine Has' : 'Medicines Have'} Reached Reorder Point
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Calculated from actual retail sales volume and supplier lead time buffers. These fast-moving items will stock out before standard restocking unless reordered immediately.
            </p>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Filter Toggle */}
            <button
              type="button"
              id="reorder-banner-filter-toggle-btn"
              onClick={onToggleFilterTable}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                isTableFiltered
                  ? 'bg-amber-600 text-white ring-2 ring-amber-400/50'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{isTableFiltered ? 'Showing In Table ✓' : 'Filter Table Below'}</span>
            </button>

            {/* Copy Requisition */}
            <button
              type="button"
              id="reorder-banner-copy-btn"
              onClick={handleCopyReplenishmentList}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-xs"
              title="Copy reorder list to clipboard"
            >
              {copiedAll ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedAll ? 'Copied' : 'Copy Requisition'}</span>
            </button>

            {/* Create PO / Distributor Order */}
            {onCreateConsolidatedPO && (
              <button
                type="button"
                id="reorder-banner-create-po-btn"
                onClick={() => onCreateConsolidatedPO(displayedItems)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs shadow-teal-600/20"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Create PO for All</span>
              </button>
            )}

            {/* Collapse/Expand Toggle */}
            <button
              type="button"
              id="reorder-banner-collapse-btn"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
              title={isCollapsed ? "Expand item list" : "Collapse item list"}
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>

            {/* Dismiss Banner */}
            <button
              type="button"
              id="reorder-banner-dismiss-btn"
              onClick={() => setIsDismissed(true)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Quick KPI Bar & Horizon Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3.5 border-t border-amber-200/80 dark:border-slate-800 text-xs">
          
          {/* Key Metrics */}
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap text-slate-700 dark:text-slate-300">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Critical (&le;3d Runway)</span>
              <span className="font-extrabold text-sm text-rose-600 dark:text-rose-400">
                {criticalCount} items
              </span>
            </div>

            <div className="border-l border-amber-200 dark:border-slate-700 pl-4">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Replenishment Capital</span>
              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                ₹{totalReplenishmentCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>

            <div className="border-l border-amber-200 dark:border-slate-700 pl-4">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Suggested Units</span>
              <span className="font-extrabold text-sm text-amber-700 dark:text-amber-300">
                {displayedItems.reduce((s, { forecast }) => s + forecast.suggestedOrderQty, 0)} units
              </span>
            </div>
          </div>

          {/* Horizon Selector Pill */}
          <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 p-0.5 rounded-xl border border-amber-200 dark:border-slate-700 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setTimeHorizon('critical')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                timeHorizon === 'critical'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Immediate Only ({alertItems.filter(({ forecast, item }) => (item.stockQuantity ?? 0) <= (item.reorderLevel || 10) || forecast.daysUntilReorder <= 3).length})
            </button>
            <button
              type="button"
              onClick={() => setTimeHorizon('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                timeHorizon === 'all'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Approaching ({alertItems.length})
            </button>
          </div>

        </div>

        {/* Expandable Highlighted Items Grid */}
        {!isCollapsed && (
          <div className="mt-4 pt-3.5 border-t border-amber-200/80 dark:border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {displayedItems.map(({ item, forecast }) => {
                const stock = item.stockQuantity ?? 0;
                const reorderLvl = item.reorderLevel || item.minAlertLevel || 10;
                const isStockout = stock <= 0;
                const isUnderLvl = stock <= reorderLvl;
                const pctOfReorder = Math.min(100, Math.round((stock / Math.max(1, reorderLvl)) * 100));

                return (
                  <div
                    key={item.id}
                    id={`reorder-item-card-${item.id}`}
                    className={`p-3.5 rounded-xl border transition-all relative flex flex-col justify-between ${
                      isStockout
                        ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                        : isUnderLvl
                        ? 'bg-white/95 dark:bg-slate-800/90 border-amber-200 dark:border-amber-800/60 shadow-2xs'
                        : 'bg-white/90 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Card Header: Brand & Urgency Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {item.brandName}
                            </h4>
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                              {item.dosageForm || 'Tab'} • {item.strength}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {item.saltComposition || item.genericName || 'Standard Composition'}
                          </p>
                        </div>

                        {/* Runway Badge */}
                        <div className="shrink-0 text-right">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                            isStockout
                              ? 'bg-rose-600 text-white'
                              : forecast.daysUntilReorder <= 0
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                              : forecast.daysUntilReorder <= 3
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}>
                            <Clock className="w-2.5 h-2.5" />
                            {isStockout 
                              ? 'Out of Stock' 
                              : forecast.daysOfStockRemaining === 0 
                              ? 'Stockout Today' 
                              : `${forecast.daysOfStockRemaining}d Runway`}
                          </span>
                        </div>
                      </div>

                      {/* Stock vs Reorder Level Progress Bar */}
                      <div className="mt-3 bg-slate-100 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/70 dark:border-slate-800">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                            <Boxes className="w-3 h-3 text-amber-600" />
                            Current: <strong className={stock <= reorderLvl ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}>{stock} {item.unit || 'units'}</strong>
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Reorder Point: <strong>{reorderLvl}</strong>
                          </span>
                        </div>

                        {/* Micro Progress Bar */}
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              pctOfReorder < 30 ? 'bg-rose-500' : pctOfReorder < 75 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${pctOfReorder}%` }}
                          />
                        </div>
                      </div>

                      {/* Consumption Velocity & Lead Time Details */}
                      <div className="grid grid-cols-2 gap-2 mt-2.5 text-[11px]">
                        <div className="bg-slate-50/80 dark:bg-slate-900/40 px-2 py-1 rounded border border-slate-200/50 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Daily Consumption</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-teal-600" />
                            {forecast.averageDailySales} /day
                          </span>
                        </div>

                        <div className="bg-slate-50/80 dark:bg-slate-900/40 px-2 py-1 rounded border border-slate-200/50 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Suggested Reorder</span>
                          <span className="font-bold text-amber-700 dark:text-amber-300">
                            +{forecast.suggestedOrderQty} {item.unit || 'units'} ({forecast.suggestedOrderPacks} pk)
                          </span>
                        </div>
                      </div>

                      {/* Location & Supplier */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-2 px-0.5">
                        <span className="flex items-center gap-1 truncate" title={item.locationShelf || item.rackNumber}>
                          <MapPin className="w-2.5 h-2.5 text-teal-600 shrink-0" />
                          {item.locationShelf || `${item.rackNumber || 'Rack A'} / ${item.shelfRow || 'Shelf 1'}`}
                        </span>
                        <span className="truncate max-w-[120px]" title={forecast.supplierName}>
                          {forecast.supplierName || 'Distributor'}
                        </span>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700">
                      <button
                        type="button"
                        id={`reorder-locate-btn-${item.id}`}
                        onClick={() => onLocateItem(item.brandName)}
                        className="flex-1 py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        title="Locate medicine in master table"
                      >
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>Locate</span>
                      </button>

                      <button
                        type="button"
                        id={`reorder-forecast-btn-${item.id}`}
                        onClick={() => onOpenForecastModal(item)}
                        className="flex-1 py-1 px-2 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        title="Open detailed consumption & stockout forecast"
                      >
                        <TrendingUp className="w-3 h-3 text-teal-600" />
                        <span>Forecast</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
