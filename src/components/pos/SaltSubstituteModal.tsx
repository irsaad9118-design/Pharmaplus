import React, { useMemo, useEffect } from 'react';
import { MedicationInventory } from '../../types/pharmacy';
import { findExactSaltSubstitutes, getStandardLocationDisplay } from '../../utils/saltSubstituteEngine';
import { ArrowRightLeft, X, MapPin, CheckCircle2, AlertCircle, Sparkles, Building2, PackageCheck } from 'lucide-react';

interface SaltSubstituteModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetItem: MedicationInventory | null;
  inventory: MedicationInventory[];
  onSelectSubstitute: (substituteItem: MedicationInventory) => void;
}

export const SaltSubstituteModal: React.FC<SaltSubstituteModalProps> = ({
  isOpen,
  onClose,
  targetItem,
  inventory,
  onSelectSubstitute,
}) => {
  // ESC key listener to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Read active medicine's generic salt composition
  const activeSalt = useMemo(() => {
    if (!targetItem) return '';
    return targetItem.saltComposition || targetItem.genericName || 'Standard Formula';
  }, [targetItem]);

  // Match all in-stock medicines sharing the EXACT same generic salt/strength
  const substitutes = useMemo(() => {
    if (!targetItem || !isOpen) return [];
    return findExactSaltSubstitutes(targetItem, inventory, { requireInStock: true });
  }, [targetItem, inventory, isOpen]);

  if (!isOpen || !targetItem) return null;

  const targetLocation = getStandardLocationDisplay(targetItem);
  const targetIsOutOfStock = (targetItem.stockQuantity || 0) <= 0;

  return (
    <div 
      id="salt-substitute-bottom-sheet-backdrop"
      className="fixed inset-0 z-[10000] bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-200"
      onClick={onClose}
    >
      <div 
        id="salt-substitute-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="salt-substitute-modal-title"
        className="bg-white dark:bg-slate-900 w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[82vh] animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Swipe / Pull Handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center bg-slate-50 dark:bg-slate-900/50">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Header Bar */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 
                id="salt-substitute-modal-title" 
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2"
              >
                <span>Salt Substitutes & In-Stock Alternatives</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Bioequivalent pharmaceutical matches with identical active molecules & dosage
              </p>
            </div>
          </div>
          <button
            id="close-salt-substitute-modal-btn"
            type="button"
            onClick={onClose}
            aria-label="Close salt substitute modal"
            className="w-9 h-9 rounded-full bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Medicine Reference Banner */}
        <div className="p-4 bg-teal-50/60 dark:bg-teal-950/30 border-b border-teal-100 dark:border-teal-900/50">
          <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-teal-800 dark:text-teal-300">
                Active Selection
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                {targetItem.brandName}
              </span>
              {targetItem.strength && (
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  ({targetItem.strength})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                targetIsOutOfStock 
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800' 
                  : 'bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}>
                {targetIsOutOfStock ? 'Out of Stock (0)' : `${targetItem.stockQuantity} in stock`}
              </span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                ₹{targetItem.mrp.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Generic Salt Composition Pill */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Generic Salt:</span>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-100/80 dark:bg-teal-900/60 text-teal-900 dark:text-teal-200 font-semibold text-xs border border-teal-200 dark:border-teal-800">
              <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>{activeSalt}</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span>Current loc: {targetLocation}</span>
            </span>
          </div>
        </div>

        {/* Alternatives List or Empty Fallback */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {substitutes.length > 0 ? (
            <>
              <div className="flex items-center justify-between pb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <PackageCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Available In-Stock Equivalents ({substitutes.length})</span>
                </span>
                <span className="text-[11px] text-slate-400">Sorted by highest stock</span>
              </div>

              {substitutes.map((subItem) => {
                const subLocation = getStandardLocationDisplay(subItem);
                const priceDiff = targetItem.mrp - subItem.mrp;
                const isCheaper = priceDiff > 0.05;
                const isCostlier = priceDiff < -0.05;

                return (
                  <div
                    key={subItem.id}
                    id={`substitute-item-${subItem.id}`}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 hover:border-teal-500/50 dark:hover:border-teal-500/50 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                  >
                    {/* Left: Medicine Brand & Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-base text-slate-900 dark:text-white truncate">
                          {subItem.brandName}
                        </h4>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                          {subItem.dosageForm || 'Tablet'} {subItem.strength ? `• ${subItem.strength}` : ''}
                        </span>
                        {subItem.manufacturer && (
                          <span className="text-[11px] text-slate-400 dark:text-slate-400 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[120px]">{subItem.manufacturer}</span>
                          </span>
                        )}
                      </div>

                      {/* Salt confirmation */}
                      <div className="text-xs text-teal-700 dark:text-teal-400 font-medium mt-1 truncate">
                        {subItem.saltComposition || subItem.genericName || activeSalt}
                      </div>

                      {/* Metadata Badges: Location, Stock & Batch */}
                      <div className="flex items-center gap-2 flex-wrap mt-2 text-xs">
                        {/* Exact Location Badge: [📍 Rack B-2 • Bin 04] */}
                        <span 
                          id={`location-badge-${subItem.id}`}
                          className="px-2.5 py-1 rounded-lg font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/80 flex items-center gap-1.5 shadow-2xs text-[11px]"
                          title={`Physical Storage Location: ${subLocation}`}
                        >
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>[📍 {subLocation}]</span>
                        </span>

                        {/* Live Stock Count */}
                        <span 
                          id={`stock-badge-${subItem.id}`}
                          className="px-2.5 py-1 rounded-lg font-bold bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 text-[11px] flex items-center gap-1 font-mono"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>{subItem.stockQuantity} in stock</span>
                        </span>

                        {/* Batch Number */}
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          B: {subItem.batchNumber}
                        </span>
                      </div>
                    </div>

                    {/* Right: Pricing & 1-Tap Switch & Add Button */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-100 dark:border-slate-800">
                      <div className="text-left sm:text-right">
                        <div className="flex items-baseline gap-1 sm:justify-end">
                          <span className="text-[10px] text-slate-400 font-medium">MRP</span>
                          <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
                            ₹{subItem.mrp.toFixed(2)}
                          </span>
                        </div>
                        {isCheaper && (
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block sm:text-right">
                            Save ₹{priceDiff.toFixed(2)} / strip
                          </span>
                        )}
                        {isCostlier && (
                          <span className="text-[10px] text-slate-400 block sm:text-right">
                            +₹{Math.abs(priceDiff).toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* 1-Tap [ ⇄ Switch & Add ] Button */}
                      <button
                        id={`switch-and-add-btn-${subItem.id}`}
                        type="button"
                        onClick={() => {
                          onSelectSubstitute(subItem);
                          onClose();
                        }}
                        className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer whitespace-nowrap active:scale-95"
                        title={`Switch to ${subItem.brandName} and add to bill`}
                      >
                        <ArrowRightLeft className="w-4 h-4 shrink-0" />
                        <span>⇄ Switch & Add</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            /* Fallback / Empty State */
            <div 
              id="salt-substitute-empty-state"
              className="py-12 px-4 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">
                No direct salt substitutes currently available in inventory.
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
                No other in-stock medications share the exact generic salt composition & strength (
                <span className="font-semibold text-slate-700 dark:text-slate-300">{activeSalt}</span>
                ). You may reorder from distributor or check alternative strengths.
              </p>
            </div>
          )}
        </div>

        {/* Footer info & close */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span>💡 Substitutions share identical active pharmaceutical ingredient & strength.</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer transition-colors shrink-0"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
