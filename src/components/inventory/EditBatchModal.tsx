import React, { useState } from 'react';
import { InventoryBatch, MedicationInventory } from '../../types/pharmacy';
import { X, Layers, Check, Calendar, Hash, Package } from 'lucide-react';

interface EditBatchModalProps {
  isOpen: boolean;
  medicine: MedicationInventory | null;
  batch: InventoryBatch | null;
  onClose: () => void;
  onSave: (
    medicineId: string,
    batchIdOrNumber: string,
    updatedBatch: { batchNumber: string; expirationDate: string; stockQuantity: number }
  ) => void;
}

export const EditBatchModal: React.FC<EditBatchModalProps> = ({
  isOpen,
  medicine,
  batch,
  onClose,
  onSave
}) => {
  if (!isOpen || !medicine || !batch) return null;

  // Convert expirationDate (YYYY-MM-DD or MM/YY) to MM/YY display
  const formatToMMYY = (dStr?: string) => {
    if (!dStr) return '';
    if (dStr.includes('/')) return dStr;
    const parts = dStr.split('-');
    if (parts.length >= 2) {
      return `${parts[1]}/${parts[0].slice(-2)}`;
    }
    return dStr;
  };

  const [batchNumber, setBatchNumber] = useState(batch.batchNumber || '');
  const [expiryMMYY, setExpiryMMYY] = useState(formatToMMYY(batch.expirationDate));
  const [stockQuantity, setStockQuantity] = useState<number | string>(batch.stockQuantity ?? 0);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const bNum = batchNumber.trim();
    if (!bNum) {
      setError('Batch number is required.');
      return;
    }

    const expTrimmed = expiryMMYY.trim();
    let isoDate = batch.expirationDate || new Date().toISOString().split('T')[0];

    // Validate MM/YY or YYYY-MM-DD
    if (/^(0[1-9]|1[0-2])\/?([0-9]{2})$/.test(expTrimmed)) {
      const match = expTrimmed.replace('/', '');
      const month = match.slice(0, 2);
      const year = `20${match.slice(2, 4)}`;
      // Find last day of month
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      isoDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(expTrimmed)) {
      isoDate = expTrimmed;
    } else if (expTrimmed.length > 0) {
      setError('Please enter expiry in MM/YY format (e.g. 11/27 or 08/26).');
      return;
    }

    const qty = Math.max(0, parseInt(String(stockQuantity), 10) || 0);

    onSave(medicine.id, batch.id || batch.batchNumber, {
      batchNumber: bNum,
      expirationDate: isoDate,
      stockQuantity: qty
    });

    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-batch-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 id="edit-batch-title" className="text-base font-bold text-slate-900 dark:text-white">
                Edit Batch Details
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {medicine.brandName} • {medicine.unit}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Batch Number */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Batch Number (Lot ID) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-mono">
                <Hash className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value.toUpperCase())}
                placeholder="e.g. B-9481"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold uppercase focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              />
            </div>
          </div>

          {/* Expiry Date (MM/YY format) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Expiry Date (MM/YY) *
              </label>
              <span className="text-[11px] text-slate-400">e.g. 11/27 or 04/28</span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">
                <Calendar className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                maxLength={7}
                value={expiryMMYY}
                onChange={(e) => {
                  let val = e.target.value;
                  // Auto insert slash if typing 2 digits
                  if (val.length === 2 && !val.includes('/') && !expiryMMYY.includes('/')) {
                    val = `${val}/`;
                  }
                  setExpiryMMYY(val);
                }}
                placeholder="MM/YY (e.g. 12/26)"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              />
            </div>
          </div>

          {/* Stock / Strips Count */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Available Stock Quantity ({medicine.unit}) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">
                <Package className="w-4 h-4" />
              </span>
              <input
                type="number"
                min={0}
                required
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="Number of strips / units in this batch"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Saving will automatically recalculate the medicine's total in-stock count.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
