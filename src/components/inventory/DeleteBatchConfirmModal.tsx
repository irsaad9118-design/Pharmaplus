import React from 'react';
import { InventoryBatch, MedicationInventory } from '../../types/pharmacy';
import { AlertCircle, Trash2, X } from 'lucide-react';

interface DeleteBatchConfirmModalProps {
  isOpen: boolean;
  medicine: MedicationInventory | null;
  batch: InventoryBatch | null;
  onClose: () => void;
  onConfirm: (medicineId: string, batchIdOrNumber: string) => void;
}

export const DeleteBatchConfirmModal: React.FC<DeleteBatchConfirmModalProps> = ({
  isOpen,
  medicine,
  batch,
  onClose,
  onConfirm
}) => {
  if (!isOpen || !medicine || !batch) return null;

  const currentTotal = medicine.stockQuantity ?? 0;
  const batchQty = batch.stockQuantity ?? 0;
  const newProjectedTotal = Math.max(0, currentTotal - batchQty);

  // Format expiry MM/YY
  const formatExp = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      return `${parts[1]}/${parts[0].slice(-2)}`;
    }
    return dateStr;
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 dark:border-rose-900/50 space-y-4"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-batch-title"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="delete-batch-title" className="text-base font-bold text-slate-900 dark:text-white">
                Delete Batch
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to delete this batch?
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 dark:text-white">
              {medicine.brandName}
            </span>
            <span className="font-mono px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 font-bold">
              Batch: #{batch.batchNumber}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300 font-mono text-[11px] pt-1 border-t border-rose-200/60 dark:border-rose-900/40">
            <div>
              <span className="text-slate-400 block text-[10px]">Expiry Date:</span>
              <strong className="text-slate-800 dark:text-slate-200">{formatExp(batch.expirationDate)}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Batch Stock:</span>
              <strong className="text-rose-600 dark:text-rose-400">-{batchQty} {medicine.unit}</strong>
            </div>
          </div>

          <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/40 text-[11px] text-slate-600 dark:text-slate-400">
            Total in-stock for {medicine.brandName} will immediately reduce from <strong>{currentTotal}</strong> to <strong>{newProjectedTotal} {medicine.unit}</strong>.
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(medicine.id, batch.id || batch.batchNumber);
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shadow-md shadow-rose-600/20 cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Batch</span>
          </button>
        </div>
      </div>
    </div>
  );
};
