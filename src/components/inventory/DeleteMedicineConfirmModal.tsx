import React, { useState } from 'react';
import { MedicationInventory } from '../../types/pharmacy';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

interface DeleteMedicineConfirmModalProps {
  isOpen: boolean;
  medicine: MedicationInventory | null;
  onClose: () => void;
  onConfirm: (medicineId: string) => void | Promise<any>;
}

export const DeleteMedicineConfirmModal: React.FC<DeleteMedicineConfirmModalProps> = ({
  isOpen,
  medicine,
  onClose,
  onConfirm
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !medicine) return null;

  const totalBatches = medicine.batches?.length || 1;
  const totalStock = medicine.stockQuantity ?? 0;

  const handleConfirmClick = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(medicine.id);
      onClose();
    } catch (err) {
      console.error("Delete failed in database:", err);
    } finally {
      setIsDeleting(false);
    }
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
        aria-labelledby="delete-medicine-title"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="delete-medicine-title" className="text-base font-bold text-slate-900 dark:text-white">
                Delete Medicine Card
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to delete this medicine?
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 dark:text-white text-sm">
              {medicine.brandName}
            </span>
            <span className="font-mono text-slate-500 dark:text-slate-400">
              {medicine.saltComposition || medicine.genericName}
            </span>
          </div>

          <p className="text-rose-800 dark:text-rose-300 leading-relaxed">
            This will permanently remove the medicine card and all associated{' '}
            <strong>{totalBatches} batch{totalBatches === 1 ? '' : 'es'}</strong> ({totalStock} {medicine.unit}) from active stock and catalogue.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shadow-md shadow-rose-600/20 cursor-pointer flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting from Database...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Medicine</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
