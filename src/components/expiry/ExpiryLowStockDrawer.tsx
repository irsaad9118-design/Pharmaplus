import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { MedicationInventory, ExpiryAlertTier, DebitNote } from '../../types/pharmacy';
import { 
  X, 
  AlertTriangle, 
  Clock, 
  RotateCcw, 
  Package, 
  MapPin, 
  Building2, 
  Printer, 
  Share2, 
  CheckCircle2, 
  Percent, 
  ShieldAlert, 
  Plus, 
  Minus,
  MessageCircle,
  FileText,
  Calendar
} from 'lucide-react';

interface ExpiryLowStockDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialFilter?: 'all' | 'red' | 'amber' | 'yellow' | 'low_stock';
}

export const ExpiryLowStockDrawer: React.FC<ExpiryLowStockDrawerProps> = ({
  isOpen,
  onClose,
  initialFilter = 'all'
}) => {
  const { 
    inventory, 
    shopSettings, 
    currentPharmacist, 
    getExpiryTier, 
    getDaysUntilExpiry, 
    applyNearExpiryDiscount, 
    createDebitNoteReturn, 
    quarantineItem,
    addToast
  } = usePharmacy();

  const [activeFilter, setActiveFilter] = useState<'all' | 'red' | 'amber' | 'yellow' | 'low_stock'>(initialFilter);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals inside drawer
  const [debitNoteModalItem, setDebitNoteModalItem] = useState<MedicationInventory | null>(null);
  const [returnQty, setReturnQty] = useState<number>(1);
  const [returnReason, setReturnReason] = useState<string>('Near Expiry Return (≤ 90-day Distributor Credit Policy)');
  const [discountModalItem, setDiscountModalItem] = useState<MedicationInventory | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(30);
  const [generatedDebitNote, setGeneratedDebitNote] = useState<DebitNote | null>(null);

  // Group inventory items with calculation
  const categorizedItems = useMemo(() => {
    return inventory.map(item => {
      const daysLeft = getDaysUntilExpiry(item.expirationDate);
      const tier = getExpiryTier(item.expirationDate);
      const isLowStock = item.stockQuantity <= (item.minAlertLevel || 15);
      return {
        ...item,
        daysLeft,
        tier,
        isLowStock
      };
    });
  }, [inventory, getDaysUntilExpiry, getExpiryTier]);

  // Counts
  const counts = useMemo(() => {
    const red = categorizedItems.filter(i => !i.quarantined && i.tier === 'red');
    const amber = categorizedItems.filter(i => !i.quarantined && i.tier === 'amber');
    const yellow = categorizedItems.filter(i => !i.quarantined && i.tier === 'yellow');
    const lowStock = categorizedItems.filter(i => !i.quarantined && i.isLowStock);
    const totalAlerts = categorizedItems.filter(i => !i.quarantined && (['red', 'amber', 'yellow'].includes(i.tier) || i.isLowStock));

    return {
      all: totalAlerts.length,
      red: red.length,
      amber: amber.length,
      yellow: yellow.length,
      lowStock: lowStock.length
    };
  }, [categorizedItems]);

  // Filtered List
  const filteredList = useMemo(() => {
    return categorizedItems.filter(item => {
      if (item.quarantined) return false;

      let matchesCategory = false;
      if (activeFilter === 'all') {
        matchesCategory = ['red', 'amber', 'yellow'].includes(item.tier) || item.isLowStock;
      } else if (activeFilter === 'red') {
        matchesCategory = item.tier === 'red';
      } else if (activeFilter === 'amber') {
        matchesCategory = item.tier === 'amber';
      } else if (activeFilter === 'yellow') {
        matchesCategory = item.tier === 'yellow';
      } else if (activeFilter === 'low_stock') {
        matchesCategory = item.isLowStock;
      }

      if (!matchesCategory) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const mBrand = item.brandName.toLowerCase().includes(q);
        const mSalt = (item.saltComposition || item.genericName || '').toLowerCase().includes(q);
        const mBatch = item.batchNumber.toLowerCase().includes(q);
        const mSupplier = (item.supplierName || '').toLowerCase().includes(q);
        const mRack = (item.locationShelf || '').toLowerCase().includes(q);
        return mBrand || mSalt || mBatch || mSupplier || mRack;
      }

      return true;
    }).sort((a, b) => a.daysLeft - b.daysLeft);
  }, [categorizedItems, activeFilter, searchTerm]);

  if (!isOpen) return null;

  // Execute Debit Note Generation
  const handleConfirmDebitNote = () => {
    if (!debitNoteModalItem) return;
    const note = createDebitNoteReturn(
      debitNoteModalItem.supplierName || 'Primary Distributor',
      [
        {
          inventoryId: debitNoteModalItem.id,
          quantity: returnQty,
          reason: returnReason
        }
      ],
      `Distributor Return for ${debitNoteModalItem.brandName} (Batch: ${debitNoteModalItem.batchNumber}). Exp: ${debitNoteModalItem.expirationDate}`
    );

    setGeneratedDebitNote(note);
    setDebitNoteModalItem(null);
  };

  // WhatsApp Debit Note to Supplier
  const handleShareDebitNoteWhatsApp = (note: DebitNote) => {
    const lines = [
      `📦 *SUPPLIER DEBIT NOTE / RETURN SLIP*`,
      `*Pharmacy:* ${shopSettings.shopName.toUpperCase()}`,
      `*DL:* ${shopSettings.dlNumber} | *GSTIN:* ${shopSettings.gstin}`,
      `*Debit Note No:* ${note.noteNumber}`,
      `*Date:* ${note.date}`,
      `*Distributor:* ${note.supplierName}`,
      `──────────────────────────`,
      `*RETURN ITEMS:*`,
      ...note.items.map((it, idx) => 
        `${idx + 1}. *${it.brandName}* (${it.batchNumber}) × ${it.quantity} units @ ₹${it.purchaseRate} = ₹${it.totalCredit} [Exp: ${it.expiryDate}]`
      ),
      `──────────────────────────`,
      `*TOTAL CREDIT REFUND:* *₹${note.totalAmount.toFixed(2)}*`,
      `*Reason:* ${note.items[0]?.reason || 'Near Expiry Return'}`,
      `*Authorized Pharmacist:* ${currentPharmacist}`,
      `──────────────────────────`,
      `_Please acknowledge receipt and adjust credit in our ledger._`
    ].join('\n');

    const phone = (note.supplierContact || '').replace(/[^0-9]/g, '');
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(lines)}` : `https://wa.me/?text=${encodeURIComponent(lines)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fade-in"
      />

      {/* Slide-Over Drawer Container */}
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 dark:border-slate-800 animate-slide-left">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-800 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>90-Day Expiry & Safety Stock Alert Sheet</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {counts.all} items requiring return, clearance markdown, or reorder
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[40px] cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            All Alerts ({counts.all})
          </button>

          <button
            onClick={() => setActiveFilter('red')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[40px] flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'red'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Red &lt;30d ({counts.red})</span>
          </button>

          <button
            onClick={() => setActiveFilter('amber')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[40px] flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'amber'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Orange 31-60d ({counts.amber})</span>
          </button>

          <button
            onClick={() => setActiveFilter('yellow')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[40px] flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'yellow'
                ? 'bg-yellow-600 text-white shadow-xs'
                : 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            <span>Yellow 61-90d ({counts.yellow})</span>
          </button>

          <button
            onClick={() => setActiveFilter('low_stock')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[40px] flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'low_stock'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Low Stock ({counts.lowStock})</span>
          </button>
        </div>

        {/* Search within Drawer */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by medicine, salt, batch, or distributor..."
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          />
        </div>

        {/* Drawer Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredList.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
              <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">All Clear in this category!</p>
              <p className="text-xs text-slate-400 mt-1">No medicines currently matching this alert threshold.</p>
            </div>
          ) : (
            filteredList.map((item) => {
              const isRed = item.tier === 'red';
              const isAmber = item.tier === 'amber';
              const isYellow = item.tier === 'yellow';

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                    isRed
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900'
                      : isAmber
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900'
                      : isYellow
                      ? 'bg-yellow-50/40 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {/* Top line: Name + Expiry Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                          {item.brandName}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-200/80 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                          {item.strength}
                        </span>
                        {item.isNearExpiryDiscount && (
                          <span className="text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded">
                            {item.discountPercent}% OFF
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate mt-0.5">
                        {item.saltComposition || item.genericName}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                        isRed
                          ? 'bg-rose-600 text-white'
                          : isAmber
                          ? 'bg-amber-600 text-white'
                          : isYellow
                          ? 'bg-yellow-500 text-slate-950'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        <Clock className="w-2.5 h-2.5" />
                        <span>{item.daysLeft <= 0 ? 'EXPIRED' : `${item.daysLeft}d left`}</span>
                      </span>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Exp: {item.expirationDate}</p>
                    </div>
                  </div>

                  {/* Middle specs: Rack + Stock + Batch + Distributor */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60 text-[11px]">
                    <div className="flex items-center gap-1 text-teal-700 dark:text-teal-300 font-bold bg-teal-50 dark:bg-teal-950/40 px-2 py-1 rounded-lg">
                      <MapPin className="w-3 h-3 text-teal-600 shrink-0" />
                      <span className="truncate">Rack: {item.locationShelf || `${item.rackNumber}-${item.shelfRow}`}</span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                      <Package className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="font-semibold">{item.stockQuantity} in Stock</span>
                    </div>

                    <div className="text-slate-500 dark:text-slate-400 font-mono flex items-center px-1">
                      Batch: <strong className="text-slate-700 dark:text-slate-200 ml-1">{item.batchNumber}</strong>
                    </div>

                    <div className="text-slate-500 dark:text-slate-400 font-mono flex items-center px-1">
                      PTR: <strong className="text-slate-700 dark:text-slate-200 ml-1">₹{item.purchaseRate || item.costPrice || 0}</strong>
                    </div>
                  </div>

                  {item.supplierName && (
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      <span>Distributor: <strong className="text-slate-600 dark:text-slate-300">{item.supplierName}</strong></span>
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                    {/* Return to Distributor Slip */}
                    <button
                      onClick={() => {
                        setDebitNoteModalItem(item);
                        setReturnQty(Math.min(item.stockQuantity, 10) || 1);
                      }}
                      className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs min-h-[40px] cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Return to Distributor</span>
                    </button>

                    {/* Apply Discount */}
                    <button
                      onClick={() => {
                        setDiscountModalItem(item);
                        setDiscountPercent(item.discountPercent || 30);
                      }}
                      className="py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold flex items-center gap-1 min-h-[40px] cursor-pointer transition-colors"
                    >
                      <Percent className="w-3.5 h-3.5" />
                      <span>Markdown</span>
                    </button>

                    {/* Quarantine */}
                    <button
                      onClick={() => quarantineItem(item.id, 'Near-Expiry Quarantine from Alert Drawer')}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors cursor-pointer"
                      title="Move to Quarantine Bay"
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-xs">
          <div className="text-slate-500">
            <span>Automated 90-Day Credit Protocol</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold min-h-[40px] cursor-pointer"
          >
            Close Sheet
          </button>
        </div>

      </div>

      {/* MODAL 1: RETURN TO DISTRIBUTOR (DEBIT NOTE SLIP GENERATOR) */}
      {debitNoteModalItem && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Distributor Debit Note Slip
                  </h3>
                  <p className="text-[10px] text-slate-400">Generate 90-Day Credit Return Voucher</p>
                </div>
              </div>
              <button
                onClick={() => setDebitNoteModalItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1.5 text-xs">
              <div className="font-bold text-slate-900 dark:text-white">
                {debitNoteModalItem.brandName} ({debitNoteModalItem.strength})
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {debitNoteModalItem.saltComposition}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 font-mono pt-1">
                <span>Batch: {debitNoteModalItem.batchNumber}</span>
                <span>Exp: {debitNoteModalItem.expirationDate}</span>
                <span>Rack: {debitNoteModalItem.locationShelf}</span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                Distributor: <strong>{debitNoteModalItem.supplierName || 'Apex Pharma Distributors'}</strong>
              </div>
            </div>

            {/* Qty Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Quantity to Return (Max: {debitNoteModalItem.stockQuantity} units)
              </label>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setReturnQty(Math.max(1, returnQty - 1))}
                    className="p-2.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 font-bold font-mono text-sm">{returnQty}</span>
                  <button
                    type="button"
                    onClick={() => setReturnQty(Math.min(debitNoteModalItem.stockQuantity, returnQty + 1))}
                    className="p-2.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 text-right">
                  <span className="text-[11px] text-slate-400 block">Total Credit Claim:</span>
                  <span className="font-black text-rose-600 dark:text-rose-400 font-mono text-base">
                    ₹{((debitNoteModalItem.purchaseRate || debitNoteModalItem.costPrice || 0) * returnQty).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Return Reason
              </label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200"
              >
                <option value="Near Expiry Return (≤ 90-day Distributor Credit Policy)">Near Expiry Return (≤ 90-day Distributor Credit Policy)</option>
                <option value="Damaged / Broken Seal Batch">Damaged / Broken Seal Batch</option>
                <option value="Expired Stock Clearance">Expired Stock Clearance</option>
                <option value="Slow Moving / Excess Stock">Slow Moving / Excess Stock</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDebitNoteModalItem(null)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDebitNote}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs min-h-[44px] cursor-pointer"
              >
                Generate Debit Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: GENERATED DEBIT NOTE PREVIEW & 1-CLICK WHATSAPP/PRINT */}
      {generatedDebitNote && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Debit Note Issued Successfully!
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">{generatedDebitNote.noteNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setGeneratedDebitNote(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Slip Preview Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs font-mono">
              <div className="text-center pb-2 border-b border-slate-200 dark:border-slate-700">
                <p className="font-bold text-slate-900 dark:text-white">{shopSettings.shopName.toUpperCase()}</p>
                <p className="text-[10px] text-slate-500">DL: {shopSettings.dlNumber} • GSTIN: {shopSettings.gstin}</p>
                <p className="text-[10px] font-bold text-rose-600 mt-1">PURCHASE RETURN / DEBIT NOTE</p>
              </div>

              <div className="flex justify-between text-[11px]">
                <span>Note No: {generatedDebitNote.noteNumber}</span>
                <span>Date: {generatedDebitNote.date}</span>
              </div>

              <div className="text-[11px] text-slate-700 dark:text-slate-300">
                To: <strong>{generatedDebitNote.supplierName}</strong>
              </div>

              <div className="border-t border-b border-slate-200 dark:border-slate-700 py-1.5 space-y-1">
                {generatedDebitNote.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span className="truncate max-w-[200px]">{it.brandName} ({it.batchNumber}) × {it.quantity}</span>
                    <span className="font-bold">₹{it.totalCredit.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-white pt-1">
                <span>TOTAL CREDIT:</span>
                <span className="text-rose-600">₹{generatedDebitNote.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleShareDebitNoteWhatsApp(generatedDebitNote)}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs min-h-[44px] cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Send on WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.print();
                  addToast({
                    type: 'info',
                    title: 'Printing Debit Note',
                    message: 'Sent to thermal receipt printer.'
                  });
                }}
                className="py-2.5 px-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: MARKDOWN DISCOUNT */}
      {discountModalItem && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Apply Clearance Markdown
              </h3>
              <button onClick={() => setDiscountModalItem(null)} className="text-slate-400 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">{discountModalItem.brandName}</p>
              <p className="text-slate-500 font-mono">Current MRP: ₹{discountModalItem.mrp.toFixed(2)}</p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Discount Percentage:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 25, 35, 50].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDiscountPercent(pct)}
                    className={`py-2 rounded-xl text-xs font-bold border min-h-[40px] cursor-pointer ${
                      discountPercent === pct
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {pct}% OFF
                  </button>
                ))}
              </div>
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-xs font-mono text-amber-900 dark:text-amber-200">
                New Counter Price: <strong>₹{(discountModalItem.mrp * (1 - discountPercent / 100)).toFixed(2)}</strong>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDiscountModalItem(null)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  applyNearExpiryDiscount(discountModalItem.id, discountPercent);
                  setDiscountModalItem(null);
                }}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold min-h-[44px] cursor-pointer"
              >
                Save Discount
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
