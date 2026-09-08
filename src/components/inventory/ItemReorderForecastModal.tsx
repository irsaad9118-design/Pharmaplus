import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  MessageSquare, 
  X, 
  ShieldCheck, 
  Truck, 
  Package, 
  DollarSign, 
  Sparkles,
  Info
} from 'lucide-react';
import { MedicationInventory, PointOfSaleTransaction } from '../../types/pharmacy';
import { calculateItemReorderForecast, ItemReorderForecast, formatReorderDateDisplay } from '../../utils/reorderForecastUtils';

interface ItemReorderForecastModalProps {
  item: MedicationInventory;
  transactions: PointOfSaleTransaction[];
  onClose: () => void;
  onOrderPlaced?: (qty: number) => void;
  onToast?: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
}

export const ItemReorderForecastModal: React.FC<ItemReorderForecastModalProps> = ({
  item,
  transactions,
  onClose,
  onToast
}) => {
  const [customLeadTime, setCustomLeadTime] = useState<number>(3);
  const [customSafetyBuffer, setCustomSafetyBuffer] = useState<number>(5);
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  // Recalculate forecast in real-time based on adjusted parameters
  const forecast = useMemo<ItemReorderForecast>(() => {
    return calculateItemReorderForecast(item, transactions, {
      defaultLeadTimeDays: customLeadTime,
      defaultSafetyStockDays: customSafetyBuffer
    });
  }, [item, transactions, customLeadTime, customSafetyBuffer]);

  // Copy PO Draft to Clipboard
  const handleCopyPoDraft = () => {
    const poText = [
      `*PURCHASE ORDER REQUISITION*`,
      `Store: PHARMPULSE HEALTHCARE`,
      `Date: ${new Date().toISOString().slice(0, 10)}`,
      `Supplier: ${forecast.supplierName} (${forecast.supplierContact})`,
      `-----------------------------------------`,
      `Item: ${item.brandName} (${item.dosageForm})`,
      `Salt: ${item.saltComposition || item.genericName}`,
      `Current Stock: ${forecast.currentStock} ${forecast.unit}`,
      `Avg Daily Sales: ${forecast.averageDailySales} units/day`,
      `Suggested Reorder Date: ${forecast.suggestedReorderDate} (${forecast.suggestedReorderDateFormatted})`,
      `-----------------------------------------`,
      `ORDER QUANTITY: ${forecast.suggestedOrderQty} units (${forecast.suggestedOrderPacks} packs/strips)`,
      `Estimated Purchase Rate: ₹${item.purchaseRate.toFixed(2)}/unit`,
      `Estimated Requisition Total: ₹${forecast.estimatedOrderCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
      `-----------------------------------------`,
      `Please confirm batch delivery within ${customLeadTime} business days.`
    ].join('\n');

    navigator.clipboard.writeText(poText);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2500);

    if (onToast) {
      onToast({
        type: 'success',
        title: 'PO Draft Copied',
        message: `Purchase order requisition for ${item.brandName} (${forecast.suggestedOrderPacks} packs) copied to clipboard.`
      });
    }
  };

  // WhatsApp Order to Distributor
  const handleWhatsAppDistributor = () => {
    const rawPhone = forecast.supplierContact.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `Hi ${forecast.supplierName}, please prepare a replenishment order for ${item.brandName} (${item.dosageForm}, ${item.strength}):\n` +
      `• Reorder Qty: ${forecast.suggestedOrderQty} units (${forecast.suggestedOrderPacks} packs)\n` +
      `• Current Stock: ${forecast.currentStock} ${forecast.unit}\n` +
      `• Needed by: ${forecast.suggestedReorderDate}\n` +
      `Thank you!`
    );

    const waUrl = rawPhone.length >= 10 
      ? `https://wa.me/${rawPhone}?text=${message}` 
      : `https://wa.me/?text=${message}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const getUrgencyColor = () => {
    switch (forecast.urgencyStatus) {
      case 'out_of_stock':
      case 'urgent':
        return 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'soon':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'upcoming':
        return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'overstocked':
        return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
  };

  return (
    <div 
      id="item-reorder-forecast-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        id="item-reorder-forecast-modal-content"
        className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 my-8 text-slate-900 dark:text-white animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-200 dark:border-teal-800">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold">
                  {item.brandName}
                </h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {item.dosageForm} • {item.strength}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getUrgencyColor()}`}>
                  {forecast.urgencyLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                {item.saltComposition || item.genericName} • Location: {forecast.locationShelf}
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Metric Strip: Suggested Date & Daily Sales */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Suggested Reorder Date */}
          <div className="p-3.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
            <div className="flex items-center justify-between text-teal-700 dark:text-teal-300 mb-1">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Suggested Reorder Date
              </span>
            </div>
            <div className="text-lg font-black text-teal-950 dark:text-teal-100 font-mono">
              {formatReorderDateDisplay(forecast.suggestedReorderDate)}
            </div>
            <div className="text-[11px] font-medium text-teal-700 dark:text-teal-300 mt-0.5">
              {forecast.suggestedReorderDateFormatted}
            </div>
          </div>

          {/* Average Daily Sales */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
                Avg Daily Consumption
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 uppercase">
                {forecast.confidence === 'high' ? 'Measured' : forecast.confidence === 'medium' ? 'Trend' : 'Estimated'}
              </span>
            </div>
            <div className="text-lg font-black font-mono text-slate-900 dark:text-white">
              {forecast.averageDailySales} <span className="text-xs font-normal text-slate-400">units/day</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {forecast.monthlyRunRate} units / 30-day run rate
            </div>
          </div>

          {/* Stock Runway */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                Current Stock Runway
              </span>
            </div>
            <div className="text-lg font-black font-mono text-slate-900 dark:text-white">
              {forecast.daysOfStockRemaining} <span className="text-xs font-normal text-slate-400">days</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Current: {forecast.currentStock} {forecast.unit}
            </div>
          </div>
        </div>

        {/* Calculation Formula Card */}
        <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs space-y-3">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-bold">
            <span className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-teal-600" />
              Reorder Timing Formula & Variables
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Expected Stockout: {formatReorderDateDisplay(forecast.stockoutDate)}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-slate-500">Runway: </span>
              <span className="font-bold">{forecast.currentStock} stock</span> ÷ <span className="font-bold">{forecast.averageDailySales}/day</span> = <span className="font-black text-teal-600">{forecast.daysOfStockRemaining} days</span>
            </div>
            <div className="text-slate-400">→</div>
            <div>
              <span className="text-slate-500">Reorder In: </span>
              <span className="font-bold">{forecast.daysOfStockRemaining} days</span> - <span className="font-bold">{forecast.supplierLeadTimeDays}d lead time</span> = <span className="font-black text-indigo-600">{forecast.daysUntilReorder} days</span>
            </div>
          </div>

          {/* Interactive Parameters Adjuster */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-slate-400" />
                  Supplier Delivery Lead Time:
                </span>
                <span className="font-bold font-mono text-teal-600">{customLeadTime} business days</span>
              </div>
              <input 
                type="range"
                min="1"
                max="14"
                value={customLeadTime}
                onChange={(e) => setCustomLeadTime(Number(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  Safety Buffer Stock:
                </span>
                <span className="font-bold font-mono text-indigo-600">{customSafetyBuffer} days buffer</span>
              </div>
              <input 
                type="range"
                min="2"
                max="15"
                value={customSafetyBuffer}
                onChange={(e) => setCustomSafetyBuffer(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Recommended Purchase Order Box */}
        <div className="p-4 rounded-xl bg-teal-900 text-white space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-300" />
              Suggested Purchase Order Replenishment
            </span>
            <span className="text-xs font-mono text-teal-300">
              Supplier: {forecast.supplierName}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-teal-800/80 pt-3 text-xs">
            <div>
              <span className="block text-teal-300 text-[11px]">Recommended Qty</span>
              <span className="text-base font-black font-mono text-white">
                {forecast.suggestedOrderQty} units
              </span>
            </div>
            <div>
              <span className="block text-teal-300 text-[11px]">Order Packs</span>
              <span className="text-base font-black font-mono text-amber-300">
                {forecast.suggestedOrderPacks} {forecast.suggestedOrderPacks === 1 ? 'pack' : 'packs'}
              </span>
            </div>
            <div>
              <span className="block text-teal-300 text-[11px]">Purchase Rate</span>
              <span className="text-base font-black font-mono text-white">
                ₹{item.purchaseRate.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="block text-teal-300 text-[11px]">Total Estimated PO</span>
              <span className="text-base font-black font-mono text-emerald-300">
                ₹{forecast.estimatedOrderCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span>Supplier Contact:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{forecast.supplierContact}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyPoDraft}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
            >
              {hasCopied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy PO Draft</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleWhatsAppDistributor}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm shadow-emerald-600/30 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Supplier</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
