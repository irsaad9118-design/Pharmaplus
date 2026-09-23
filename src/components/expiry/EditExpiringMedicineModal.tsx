import React, { useState, useEffect, useMemo } from 'react';
import { MedicationInventory, InventoryBatch } from '../../types/pharmacy';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  X, 
  Save, 
  RotateCcw, 
  ShieldAlert, 
  Calendar, 
  MapPin, 
  Package, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Check, 
  Sparkles,
  Info,
  Percent,
  Plus,
  Layers,
  AlertCircle
} from 'lucide-react';

interface EditExpiringMedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MedicationInventory | null;
  onSave: (updates: Partial<MedicationInventory>) => void;
  onInitiateReturn?: (item: MedicationInventory) => void;
  onQuarantine?: (id: string, reason: string) => void;
  onArchive?: (id: string) => void;
}

const MONTH_NAMES = [
  'Jan (01)', 'Feb (02)', 'Mar (03)', 'Apr (04)',
  'May (05)', 'Jun (06)', 'Jul (07)', 'Aug (08)',
  'Sep (09)', 'Oct (10)', 'Nov (11)', 'Dec (12)'
];

export const EditExpiringMedicineModal: React.FC<EditExpiringMedicineModalProps> = ({
  isOpen,
  onClose,
  item,
  onSave,
  onInitiateReturn,
  onQuarantine,
  onArchive
}) => {
  const { deleteBatch, addToast, updateInventoryItem } = usePharmacy();
  if (!isOpen || !item) return null;

  // Editable Form State prefilled with current medicine values
  const [brandName, setBrandName] = useState<string>(item.brandName || '');
  const [saltComposition, setSaltComposition] = useState<string>(item.saltComposition || item.genericName || '');
  const [batchNumber, setBatchNumber] = useState<string>(item.batchNumber || '');
  const [expirationDate, setExpirationDate] = useState<string>(item.expirationDate || '');
  const [stockQuantity, setStockQuantity] = useState<number>(item.stockQuantity || 0);
  const [unit, setUnit] = useState<string>(item.unit || 'Strips');
  const [rackNumber, setRackNumber] = useState<string>(item.rackNumber || 'Rack A');
  const [shelfRow, setShelfRow] = useState<string>(item.shelfRow || 'Shelf 1');
  const [boxBin, setBoxBin] = useState<string>(item.boxBin || 'Bin 01');
  const [mrp, setMrp] = useState<number>(item.mrp || 0);
  const [purchaseRate, setPurchaseRate] = useState<number>(item.purchaseRate ?? item.costPrice ?? (item.mrp * 0.7));
  const [supplierName, setSupplierName] = useState<string>(item.supplierName || '');
  const [isNearExpiryDiscount, setIsNearExpiryDiscount] = useState<boolean>(item.isNearExpiryDiscount || false);
  const [discountPercent, setDiscountPercent] = useState<number>(item.discountPercent || 30);
  
  // Batches state for multi-batch medicines
  const [batchesState, setBatchesState] = useState<InventoryBatch[]>(() => {
    if (item.batches && item.batches.length > 0) {
      return [...item.batches];
    }
    return [
      {
        id: `batch-${item.id}-0`,
        batchNumber: item.batchNumber || 'BT-01',
        expirationDate: item.expirationDate || '',
        stockQuantity: item.stockQuantity || 0,
        mrp: item.mrp || 0,
        purchaseRate: item.purchaseRate || item.costPrice || 0
      }
    ];
  });
  const [activeBatchIdx, setActiveBatchIdx] = useState<number>(0);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [showQuarantineConfirm, setShowQuarantineConfirm] = useState<boolean>(false);

  // Sync state whenever the target item changes
  useEffect(() => {
    if (item) {
      setBrandName(item.brandName || '');
      setSaltComposition(item.saltComposition || item.genericName || '');
      setBatchNumber(item.batchNumber || '');
      setExpirationDate(item.expirationDate || '');
      setStockQuantity(item.stockQuantity || 0);
      setUnit(item.unit || 'Strips');
      setRackNumber(item.rackNumber || 'Rack A');
      setShelfRow(item.shelfRow || 'Shelf 1');
      setBoxBin(item.boxBin || 'Bin 01');
      setMrp(item.mrp || 0);
      setPurchaseRate(item.purchaseRate ?? item.costPrice ?? (item.mrp * 0.7));
      setSupplierName(item.supplierName || '');
      setIsNearExpiryDiscount(item.isNearExpiryDiscount || false);
      setDiscountPercent(item.discountPercent || 30);
      setShowDeleteConfirm(false);
      setShowQuarantineConfirm(false);

      if (item.batches && item.batches.length > 0) {
        setBatchesState([...item.batches]);
        const foundIdx = item.batches.findIndex(b => b.batchNumber === item.batchNumber);
        setActiveBatchIdx(foundIdx !== -1 ? foundIdx : 0);
      } else {
        setBatchesState([
          {
            id: `batch-${item.id}-0`,
            batchNumber: item.batchNumber || 'BT-01',
            expirationDate: item.expirationDate || '',
            stockQuantity: item.stockQuantity || 0,
            mrp: item.mrp || 0,
            purchaseRate: item.purchaseRate || item.costPrice || 0
          }
        ]);
        setActiveBatchIdx(0);
      }
    }
  }, [item]);

  // Parse Month and Year from current expirationDate
  const parsedDate = useMemo(() => {
    if (!expirationDate) {
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
    }
    const parts = expirationDate.split('-');
    if (parts.length >= 2) {
      const y = parseInt(parts[0], 10) || new Date().getFullYear();
      const m = parseInt(parts[1], 10) || (new Date().getMonth() + 1);
      const d = parts.length >= 3 ? parseInt(parts[2], 10) : 28;
      return { year: y, month: m, day: d };
    }
    return { year: new Date().getFullYear(), month: new Date().getMonth() + 1, day: 28 };
  }, [expirationDate]);

  // Real-time calculation of days left based on updated expirationDate
  const calculatedDaysLeft = useMemo(() => {
    if (!expirationDate) return 0;
    try {
      const exp = new Date(expirationDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      exp.setHours(0, 0, 0, 0);
      const diffTime = exp.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }, [expirationDate]);

  // Calculate new status tier
  const newStatusTier = useMemo(() => {
    if (calculatedDaysLeft <= 0) {
      return { 
        label: 'Expired', 
        color: 'rose', 
        bg: 'bg-rose-50 border-rose-300 dark:bg-rose-950/80 dark:border-rose-800 text-rose-900 dark:text-rose-100', 
        badgeBg: 'bg-rose-600 text-white',
        isSafe: false,
        isExpired: true 
      };
    }
    if (calculatedDaysLeft <= 30) {
      return { 
        label: 'Critical (< 30 Days)', 
        color: 'rose', 
        bg: 'bg-rose-50 border-rose-300 dark:bg-rose-950/80 dark:border-rose-800 text-rose-900 dark:text-rose-100', 
        badgeBg: 'bg-rose-600 text-white',
        isSafe: false,
        isExpired: false 
      };
    }
    if (calculatedDaysLeft <= 60) {
      return { 
        label: 'Near Expiry (31-60 Days)', 
        color: 'amber', 
        bg: 'bg-amber-50 border-amber-300 dark:bg-amber-950/80 dark:border-amber-800 text-amber-900 dark:text-amber-100', 
        badgeBg: 'bg-amber-600 text-white',
        isSafe: false,
        isExpired: false 
      };
    }
    if (calculatedDaysLeft <= 90) {
      return { 
        label: 'Expiring in 61-90 Days', 
        color: 'yellow', 
        bg: 'bg-yellow-50 border-yellow-300 dark:bg-yellow-950/80 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100', 
        badgeBg: 'bg-yellow-500 text-slate-950',
        isSafe: false,
        isExpired: false 
      };
    }
    return { 
      label: 'Healthy & Valid Shelf Life (> 90 Days)', 
      color: 'emerald', 
      bg: 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/80 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100', 
      badgeBg: 'bg-emerald-600 text-white',
      isSafe: true,
      isExpired: false 
    };
  }, [calculatedDaysLeft]);

  // Helper to change Month and Year
  const handleMonthYearChange = (newMonth: number, newYear: number) => {
    const lastDay = new Date(newYear, newMonth, 0).getDate();
    const formattedMonth = String(newMonth).padStart(2, '0');
    const formattedDay = String(lastDay).padStart(2, '0');
    const newDate = `${newYear}-${formattedMonth}-${formattedDay}`;
    setExpirationDate(newDate);

    // Synchronize into batchesState
    if (batchesState[activeBatchIdx]) {
      const updated = [...batchesState];
      updated[activeBatchIdx] = {
        ...updated[activeBatchIdx],
        expirationDate: newDate
      };
      setBatchesState(updated);
    }
  };

  // Quick-extend expiry buttons (+1m, +3m, +6m, +1y, +2y)
  const handleQuickExtend = (monthsToAdd: number) => {
    const base = new Date();
    base.setMonth(base.getMonth() + monthsToAdd);
    const y = base.getFullYear();
    const m = base.getMonth() + 1;
    handleMonthYearChange(m, y);
  };

  // Switch Active Batch
  const handleSwitchBatch = (idx: number) => {
    if (idx < 0 || idx >= batchesState.length) return;
    // Save current active batch before switching
    const currentBatches = [...batchesState];
    currentBatches[activeBatchIdx] = {
      ...currentBatches[activeBatchIdx],
      batchNumber: batchNumber.trim(),
      expirationDate: expirationDate,
      stockQuantity: Math.max(0, Number(stockQuantity) || 0),
      mrp: Math.max(0, Number(mrp) || 0),
      purchaseRate: Math.max(0, Number(purchaseRate) || 0)
    };
    setBatchesState(currentBatches);
    setActiveBatchIdx(idx);

    // Load new active batch values
    const target = currentBatches[idx];
    if (target) {
      setBatchNumber(target.batchNumber || '');
      setExpirationDate(target.expirationDate || '');
      setStockQuantity(target.stockQuantity || 0);
      if (target.mrp) setMrp(target.mrp);
      if (target.purchaseRate) setPurchaseRate(target.purchaseRate);
    }
  };

  // Add new replacement batch
  const handleAddNewBatch = () => {
    const now = new Date();
    const nextYear = now.getFullYear() + 2;
    const formattedDate = `${nextYear}-12-31`;
    const newBatch: InventoryBatch = {
      id: `batch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      batchNumber: `BT-${Math.floor(1000 + Math.random() * 9000)}`,
      expirationDate: formattedDate,
      stockQuantity: 10,
      mrp: mrp,
      purchaseRate: purchaseRate
    };

    const nextBatches = [...batchesState, newBatch];
    setBatchesState(nextBatches);
    setActiveBatchIdx(nextBatches.length - 1);
    setBatchNumber(newBatch.batchNumber);
    setExpirationDate(newBatch.expirationDate);
    setStockQuantity(newBatch.stockQuantity);
  };

  // Delete specific batch, update total stock, and synchronize with global inventory
  const handleDeleteBatch = (idxToDelete: number) => {
    if (idxToDelete < 0 || idxToDelete >= batchesState.length) return;
    const batchToDelete = batchesState[idxToDelete];
    if (!batchToDelete) return;

    // Remove from local array
    const filtered = batchesState.filter((_, i) => i !== idxToDelete);

    // Call deleteBatch from PharmacyContext so global inventory, total stock, and backend update immediately
    deleteBatch(item.id, batchToDelete.id || batchToDelete.batchNumber);

    if (filtered.length === 0) {
      setBatchesState([]);
      setActiveBatchIdx(0);
      setBatchNumber('N/A');
      setExpirationDate('');
      setStockQuantity(0);
      updateInventoryItem(item.id, {
        batches: [],
        stockQuantity: 0,
        batchNumber: 'N/A',
        expirationDate: ''
      });
    } else {
      setBatchesState(filtered);
      const newIdx = Math.min(
        Math.max(0, idxToDelete === activeBatchIdx ? (idxToDelete === 0 ? 0 : idxToDelete - 1) : (activeBatchIdx > idxToDelete ? activeBatchIdx - 1 : activeBatchIdx)),
        filtered.length - 1
      );
      setActiveBatchIdx(newIdx);
      const target = filtered[newIdx];
      if (target) {
        setBatchNumber(target.batchNumber);
        setExpirationDate(target.expirationDate);
        setStockQuantity(target.stockQuantity);
        if (target.mrp) setMrp(target.mrp);
        if (target.purchaseRate) setPurchaseRate(target.purchaseRate);
      }
      const newTotalStock = filtered.reduce((acc, b) => acc + (Number(b.stockQuantity) || 0), 0);
      updateInventoryItem(item.id, {
        batches: filtered,
        stockQuantity: newTotalStock,
        batchNumber: target?.batchNumber || 'N/A',
        expirationDate: target?.expirationDate || ''
      });
    }
  };

  // Submit Handler
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) return;

    const shelfClean = shelfRow.replace(/[^0-9]/g, '') || '1';
    const locationShelf = `${rackNumber}-${shelfClean} • ${boxBin}`;

    // Compile updated batches array: automatically filter out any batch with stock <= 0
    let compiledBatches = batchesState.map((b, idx) => {
      if (idx === activeBatchIdx) {
        return {
          ...b,
          batchNumber: batchNumber.trim(),
          expirationDate: expirationDate,
          stockQuantity: Math.max(0, Number(stockQuantity) || 0),
          mrp: Math.max(0, Number(mrp) || 0),
          purchaseRate: Math.max(0, Number(purchaseRate) || 0),
          costPrice: Math.max(0, Number(purchaseRate) || 0)
        };
      }
      return b;
    }).filter(b => (Number(b.stockQuantity) || 0) > 0);

    const totalStock = compiledBatches.reduce((acc, b) => acc + (Number(b.stockQuantity) || 0), 0);
    const sorted = compiledBatches.slice().sort((a, b) => new Date(a.expirationDate || '2099-12-31').getTime() - new Date(b.expirationDate || '2099-12-31').getTime());
    const activeBatchData = sorted[0];
    const finalBatchNo = activeBatchData?.batchNumber || (batchNumber.trim() || 'N/A');
    const finalExpDate = activeBatchData?.expirationDate || expirationDate;

    onSave({
      brandName: brandName.trim(),
      saltComposition: saltComposition.trim() || brandName.trim(),
      genericName: saltComposition.trim() || brandName.trim(),
      batchNumber: finalBatchNo,
      expirationDate: finalExpDate,
      stockQuantity: totalStock,
      batches: compiledBatches,
      unit: unit,
      rackNumber: rackNumber,
      shelfRow: shelfRow,
      boxBin: boxBin,
      locationShelf: locationShelf,
      mrp: Math.max(0, Number(mrp) || 0),
      purchaseRate: Math.max(0, Number(purchaseRate) || 0),
      costPrice: Math.max(0, Number(purchaseRate) || 0),
      sellingPrice: Math.max(0, Number(mrp) || 0),
      supplierName: supplierName.trim(),
      isNearExpiryDiscount: isNearExpiryDiscount,
      discountPercent: isNearExpiryDiscount ? discountPercent : 0
    });

    onClose();
  };

  // Dynamic Year Options: covers past expired years (from 4 years ago) to 10 years ahead
  const currentYear = new Date().getFullYear();
  const minYear = Math.min(currentYear - 4, parsedDate.year);
  const maxYear = Math.max(currentYear + 10, parsedDate.year + 4);
  const yearOptions = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

  // Profit Margin calculation
  const marginPerUnit = mrp > 0 ? (mrp - purchaseRate) : 0;
  const marginPercentage = mrp > 0 ? ((marginPerUnit / mrp) * 100).toFixed(1) : '0';

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black shadow-xs ${
              calculatedDaysLeft <= 0 
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                : 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
            }`}>
              {calculatedDaysLeft <= 0 ? <AlertTriangle className="w-5 h-5 text-rose-400" /> : <Calendar className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-white">
                  {calculatedDaysLeft <= 0 ? 'Edit Expired Medicine Batch' : 'Edit Expiring Medicine'}
                </h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                  calculatedDaysLeft <= 0
                    ? 'bg-rose-900/60 text-rose-200 border-rose-700'
                    : 'bg-slate-700 text-slate-300 border-slate-600'
                }`}>
                  {batchNumber || 'Batch #'}
                </span>
                {calculatedDaysLeft <= 0 && (
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-rose-600 text-white">
                    EXPIRED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Direct in-place correction of expiry dates, physical rack location, and stock counts.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <form onSubmit={handleFormSubmit} className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-4 text-xs">
          
          {/* EXPIRY STATUS BANNER */}
          <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${newStatusTier.bg}`}>
            <div className="flex items-center gap-2.5">
              {newStatusTier.isExpired ? (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              ) : newStatusTier.isSafe ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              )}
              <div>
                <div className="font-extrabold text-xs sm:text-sm flex items-center gap-2 flex-wrap">
                  <span>Status: {newStatusTier.label}</span>
                  <span className="font-mono font-bold text-xs opacity-90">
                    ({calculatedDaysLeft <= 0 ? `Expired ${Math.abs(calculatedDaysLeft)} days ago` : `${calculatedDaysLeft} days remaining`})
                  </span>
                </div>
                <p className="text-[11px] opacity-90 mt-0.5">
                  {newStatusTier.isExpired ? (
                    <span className="font-semibold text-rose-900 dark:text-rose-200">
                      ⚠️ Expired stock cannot be billed at POS. You can extend the date if this was a clerical entry error, zero the stock if disposed, or file a distributor debit note.
                    </span>
                  ) : newStatusTier.isSafe ? (
                    <span className="font-semibold text-emerald-800 dark:text-emerald-200">
                      ✓ Extending this date to &gt;90 days automatically moves it to Safe Inventory on save.
                    </span>
                  ) : (
                    <span>
                      Batch requires clearance markdown, distributor return, or shelf relocation.
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1.5 self-end sm:self-auto font-mono text-xs font-bold px-2.5 py-1 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-current/20">
              <Clock className="w-3.5 h-3.5" />
              <span>{expirationDate || 'No Date'}</span>
            </div>
          </div>

          {/* EXPIRED MEDICINE 1-CLICK QUICK ACTION BAR */}
          {calculatedDaysLeft <= 0 && (
            <div className="p-3 bg-rose-50/70 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 space-y-2">
              <div className="text-[11px] font-bold text-rose-900 dark:text-rose-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>1-Click Expired Stock Actions:</span>
                </span>
                <span className="text-[10px] text-rose-700 dark:text-rose-300 font-mono">
                  Current Stock: {stockQuantity} {unit}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* 1. Set Stock to 0 (Disposed) */}
                <button
                  type="button"
                  onClick={() => setStockQuantity(0)}
                  className="px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  title="Zero out inventory count if expired medicine was destroyed or physically disposed"
                >
                  <Trash2 className="w-3 h-3 text-rose-600" />
                  <span>Zero Stock (0)</span>
                </button>

                {/* 2. Quick +1 Year Extend (Data Entry Error Fix) */}
                <button
                  type="button"
                  onClick={() => handleQuickExtend(12)}
                  className="px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  title="Extend expiry date by 1 year to fix clerical typo during inward entry"
                >
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>Extend +1 Year</span>
                </button>

                {/* 3. Debit Note Return */}
                {onInitiateReturn && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onInitiateReturn(item);
                    }}
                    className="px-2.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    title="Generate supplier debit note for return refund"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Return Slip</span>
                  </button>
                )}

                {/* 4. Quarantine Bay */}
                {onQuarantine && (
                  <button
                    type="button"
                    onClick={() => setShowQuarantineConfirm(true)}
                    className="px-2.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    title="Lock batch in quarantine bay"
                  >
                    <ShieldAlert className="w-3 h-3" />
                    <span>Quarantine</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* MULTI-BATCH SELECTOR BAR (if medicine has multiple batches) */}
          {batchesState.length > 0 && (
            <div className="bg-slate-50/90 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-teal-600" />
                    Batch Records ({batchesState.length})
                  </span>
                  <span className="font-mono text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800 text-[10px] font-bold">
                    Total In-Stock: {batchesState.reduce((sum, b, i) => sum + (i === activeBatchIdx ? (Number(stockQuantity) || 0) : (Number(b.stockQuantity) || 0)), 0)} {unit}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddNewBatch}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Batch</span>
                </button>
              </div>

              {/* Batches List Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {batchesState.map((b, idx) => {
                  const bDays = (() => {
                    try {
                      const exp = new Date(b.expirationDate || '');
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      exp.setHours(0,0,0,0);
                      return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    } catch {
                      return 999;
                    }
                  })();
                  const isExp = bDays <= 0;
                  const isNear = bDays > 0 && bDays <= 90;
                  const isSelected = activeBatchIdx === idx;
                  const currentBatchQty = idx === activeBatchIdx ? Number(stockQuantity) : b.stockQuantity;

                  return (
                    <div
                      key={b.id || idx}
                      onClick={() => handleSwitchBatch(idx)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium shrink-0 cursor-pointer border transition-all flex items-center gap-2 ${
                        isSelected
                          ? 'bg-white dark:bg-slate-800 border-teal-500 shadow-xs ring-2 ring-teal-500/20'
                          : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-200/70'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {b.batchNumber || `Batch ${idx + 1}`}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Exp: {b.expirationDate || 'N/A'} • {currentBatchQty} {unit}
                        </span>
                      </div>

                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        isExp 
                          ? 'bg-rose-600 text-white' 
                          : isNear 
                          ? 'bg-amber-500 text-white' 
                          : 'bg-emerald-600 text-white'
                      }`}>
                        {isExp ? 'EXPIRED' : isNear ? `${bDays}d` : 'SAFE'}
                      </span>

                      {/* X Button to delete specific batch and update total stock */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBatch(idx);
                        }}
                        className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-0.5 cursor-pointer"
                        title={`Delete Batch ${b.batchNumber || idx + 1} and reduce total stock`}
                        aria-label={`Delete Batch ${b.batchNumber || idx + 1}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 1: MEDICINE IDENTITY & BATCH */}
          <div className="bg-slate-50/80 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-teal-600" />
                <span>Medicine Identity &amp; Active Batch</span>
              </div>
              {batchesState.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleDeleteBatch(activeBatchIdx)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 dark:text-rose-300 dark:border-rose-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Delete the currently selected batch from state"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Delete Selected Batch</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Medicine Brand Name */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Medicine Name / Brand *
                </label>
                <input
                  type="text"
                  required
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Augmentin 625 Duo"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Generic Salt / Composition */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Generic Salt / Composition *
                </label>
                <input
                  type="text"
                  required
                  value={saltComposition}
                  onChange={(e) => setSaltComposition(e.target.value)}
                  placeholder="e.g. Amoxicillin + Clavulanic Acid"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Batch Number */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Batch Number *
                </label>
                <input
                  type="text"
                  required
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="e.g. BT-9024"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 uppercase"
                />
              </div>

              {/* Supplier / Distributor */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Supplier / Distributor Name
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="e.g. Sun Pharma Distribution"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: EXPIRY DATE (MONTH / YEAR / DATE PICKER) */}
          <div className="bg-slate-50/80 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-rose-500" />
                <span>Expiry Date (Month / Year Selection)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono font-semibold">
                Current Date: {expirationDate}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Month Selector */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Expiry Month
                </label>
                <select
                  value={parsedDate.month}
                  onChange={(e) => handleMonthYearChange(parseInt(e.target.value, 10), parsedDate.year)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Selector */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Expiry Year
                </label>
                <select
                  value={parsedDate.year}
                  onChange={(e) => handleMonthYearChange(parsedDate.month, parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  {yearOptions.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Native Date Picker */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Exact Date
                </label>
                <input
                  type="date"
                  required
                  value={expirationDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setExpirationDate(newDate);
                    if (batchesState[activeBatchIdx]) {
                      const updated = [...batchesState];
                      updated[activeBatchIdx] = { ...updated[activeBatchIdx], expirationDate: newDate };
                      setBatchesState(updated);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Quick Extension Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1">
                Quick Extend:
              </span>
              {[
                { label: '+1 Month', months: 1 },
                { label: '+3 Months', months: 3 },
                { label: '+6 Months', months: 6 },
                { label: '+1 Year', months: 12 },
                { label: '+2 Years', months: 24 },
                { label: '+3 Years', months: 36 }
              ].map(chip => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleQuickExtend(chip.months)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 dark:hover:bg-teal-950 dark:hover:text-teal-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 3: STOCK & PHYSICAL LOCATION */}
          <div className="bg-slate-50/80 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-teal-600" />
              <span>Stock Quantity &amp; Physical Shelf Coordinates</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Available Stock Qty */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 dark:text-slate-200">
                    Current Stock Quantity *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setStockQuantity(0);
                      if (batchesState[activeBatchIdx]) {
                        const updated = [...batchesState];
                        updated[activeBatchIdx] = { ...updated[activeBatchIdx], stockQuantity: 0 };
                        setBatchesState(updated);
                      }
                    }}
                    className="text-[10px] text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer"
                  >
                    Set to 0 (Disposed)
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    required
                    value={stockQuantity}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                      setStockQuantity(val);
                      if (batchesState[activeBatchIdx]) {
                        const updated = [...batchesState];
                        updated[activeBatchIdx] = { ...updated[activeBatchIdx], stockQuantity: val };
                        setBatchesState(updated);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-black text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="px-2.5 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 shrink-0 cursor-pointer"
                  >
                    <option value="Strips">Strips</option>
                    <option value="Tablets">Tablets</option>
                    <option value="Capsules">Capsules</option>
                    <option value="Bottles">Bottles</option>
                    <option value="Vials">Vials</option>
                    <option value="Tubes">Tubes</option>
                    <option value="Sachets">Sachets</option>
                  </select>
                </div>
              </div>

              {/* Rack & Bin Selection */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Rack &amp; Shelf / Bin Location
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <input
                    type="text"
                    value={rackNumber}
                    onChange={(e) => setRackNumber(e.target.value)}
                    placeholder="Rack A"
                    className="px-2.5 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                    title="Rack Number"
                  />
                  <input
                    type="text"
                    value={shelfRow}
                    onChange={(e) => setShelfRow(e.target.value)}
                    placeholder="Shelf 1"
                    className="px-2.5 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                    title="Shelf Row"
                  />
                  <input
                    type="text"
                    value={boxBin}
                    onChange={(e) => setBoxBin(e.target.value)}
                    placeholder="Bin 01"
                    className="px-2.5 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                    title="Box / Bin"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: PRICING & CLEARANCE MARKDOWN */}
          <div className="bg-slate-50/80 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pricing &amp; Clearance Markdown</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* MRP */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Maximum Retail Price (MRP) ₹ *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={mrp}
                    onChange={(e) => {
                      const val = Math.max(0, parseFloat(e.target.value) || 0);
                      setMrp(val);
                      if (batchesState[activeBatchIdx]) {
                        const updated = [...batchesState];
                        updated[activeBatchIdx] = { ...updated[activeBatchIdx], mrp: val };
                        setBatchesState(updated);
                      }
                    }}
                    className="w-full pl-7 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-black text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Purchase Rate / PTR */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Purchase Rate (PTR / Cost) ₹ *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={purchaseRate}
                    onChange={(e) => {
                      const val = Math.max(0, parseFloat(e.target.value) || 0);
                      setPurchaseRate(val);
                      if (batchesState[activeBatchIdx]) {
                        const updated = [...batchesState];
                        updated[activeBatchIdx] = { ...updated[activeBatchIdx], purchaseRate: val };
                        setBatchesState(updated);
                      }
                    }}
                    className="w-full pl-7 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-black text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Profit Margin and Total Value Calculation */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-[11px]">
                <span className="text-emerald-700 dark:text-emerald-300 font-medium">Profit Margin per Unit:</span>
                <div className="font-extrabold text-emerald-800 dark:text-emerald-200 text-xs mt-0.5">
                  ₹{marginPerUnit.toFixed(2)} ({marginPercentage}%)
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-[11px]">
                <span className="text-rose-700 dark:text-rose-300 font-medium">Capital at Risk (Stock Cost):</span>
                <div className="font-extrabold text-rose-800 dark:text-rose-200 text-xs mt-0.5">
                  ₹{(purchaseRate * stockQuantity).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Clearance Discount Checkbox */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isNearExpiryDiscount}
                  onChange={(e) => setIsNearExpiryDiscount(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Offer Clearance Discount at POS Counter
                </span>
              </label>

              {isNearExpiryDiscount && (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="5"
                    max="90"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Math.max(5, Math.min(90, parseInt(e.target.value, 10) || 30)))}
                    className="w-16 px-2 py-1 text-xs rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/50 font-black text-amber-800 dark:text-amber-200 text-center"
                  />
                  <span className="font-bold text-amber-700 dark:text-amber-300">% OFF</span>
                </div>
              )}
            </div>
          </div>

          {/* CONFIRMATION STRIPS */}
          {showQuarantineConfirm && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold text-xs">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Confirm Quarantine / Disposed Stock</span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                This will move <strong>{item.brandName}</strong> ({stockQuantity} {unit}) to the Quarantine Bay and immediately block it from active POS billing counters.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuarantineConfirm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onQuarantine) onQuarantine(item.id, 'Quarantined - Expired Batch Disposed');
                    onClose();
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  Confirm Quarantine
                </button>
              </div>
            </div>
          )}

          {showDeleteConfirm && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold text-xs">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Confirm Soft Archive / Deletion</span>
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-300">
                Are you sure you want to archive <strong>{item.brandName}</strong> (Batch: {item.batchNumber})? It will be removed from inventory.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onArchive) onArchive(item.id);
                    onClose();
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  Archive Medicine
                </button>
              </div>
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            
            {/* Left: Quick Quarantine / Return Actions */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {onInitiateReturn && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onInitiateReturn(item);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Initiate Distributor Debit Note Return"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Debit Note Return</span>
                </button>
              )}

              {onQuarantine && (
                <button
                  type="button"
                  onClick={() => setShowQuarantineConfirm(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Mark as Disposed or Move to Quarantine"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Mark Disposed</span>
                </button>
              )}

              {onArchive && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  title="Archive or Delete Record"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Right: Cancel & Save Changes */}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                id="save-expiring-medicine-btn"
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-98 text-white text-xs font-bold shadow-md shadow-teal-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>

          </div>

        </form>
      </div>
    </div>
  );
};
