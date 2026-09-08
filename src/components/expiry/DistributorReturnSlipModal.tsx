import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { generateStockistReturnPdf } from '../../utils/stockistReturnPdfGenerator';
import { 
  FileText, 
  X, 
  Send, 
  Printer, 
  Check, 
  Copy, 
  RotateCcw, 
  Building2, 
  Calendar, 
  DollarSign,
  AlertTriangle,
  Package,
  FileDown,
  CheckCircle2
} from 'lucide-react';
import { MedicationInventory, DebitNote } from '../../types/pharmacy';

interface DistributorReturnSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: MedicationInventory[];
  onReturnGenerated: (debitNote: DebitNote) => void;
}

export const DistributorReturnSlipModal: React.FC<DistributorReturnSlipModalProps> = ({
  isOpen,
  onClose,
  inventory,
  onReturnGenerated
}) => {
  const { 
    shopSettings, 
    getDaysUntilExpiry, 
    getExpiryTier, 
    createDebitNoteReturn, 
    addToast 
  } = usePharmacy();

  // Selected supplier filter
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [expiryDaysLimit, setExpiryDaysLimit] = useState<number>(90);
  const [selectedItems, setSelectedItems] = useState<Record<string, { selected: boolean; returnQty: number }>>({});
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [generatedSlip, setGeneratedSlip] = useState<DebitNote | null>(null);

  // Eligible near-expiry inventory (<= limit days)
  const eligibleItems = useMemo(() => {
    return inventory
      .filter(item => {
        if (item.quarantined || item.stockQuantity <= 0) return false;
        const days = getDaysUntilExpiry(item.expirationDate);
        return days <= expiryDaysLimit;
      })
      .map(item => {
        const days = getDaysUntilExpiry(item.expirationDate);
        const ptr = item.purchaseRate || item.costPrice || (item.mrp * 0.7);
        return {
          ...item,
          daysLeft: days,
          ptrRate: ptr,
          tier: getExpiryTier(item.expirationDate)
        };
      });
  }, [inventory, expiryDaysLimit, getDaysUntilExpiry, getExpiryTier]);

  // Unique suppliers from eligible items
  const suppliers = useMemo(() => {
    const set = new Set<string>();
    eligibleItems.forEach(i => {
      if (i.supplierName) set.add(i.supplierName);
    });
    return Array.from(set);
  }, [eligibleItems]);

  // Filtered by selected supplier
  const displayItems = useMemo(() => {
    return eligibleItems.filter(i => selectedSupplier === 'all' || i.supplierName === selectedSupplier);
  }, [eligibleItems, selectedSupplier]);

  // Auto-initialize selected items state
  React.useEffect(() => {
    const init: Record<string, { selected: boolean; returnQty: number }> = {};
    displayItems.forEach(it => {
      init[it.id] = { selected: true, returnQty: it.stockQuantity };
    });
    setSelectedItems(init);
  }, [displayItems]);

  // Toggle selection
  const toggleItem = (id: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [id]: {
        selected: !prev[id]?.selected,
        returnQty: prev[id]?.returnQty || 1
      }
    }));
  };

  // Update return qty
  const updateQty = (id: string, qty: number, max: number) => {
    const valid = Math.max(1, Math.min(max, qty));
    setSelectedItems(prev => ({
      ...prev,
      [id]: {
        selected: prev[id]?.selected ?? true,
        returnQty: valid
      }
    }));
  };

  // Selected items calculation
  const itemsToReturn = useMemo(() => {
    return displayItems.filter(it => selectedItems[it.id]?.selected);
  }, [displayItems, selectedItems]);

  // Total PTR Return Value
  const totalPtrCredit = useMemo(() => {
    return itemsToReturn.reduce((sum, it) => {
      const qty = selectedItems[it.id]?.returnQty || it.stockQuantity;
      return sum + (it.ptrRate * qty);
    }, 0);
  }, [itemsToReturn, selectedItems]);

  // Generate & Dispatch Debit Note
  const handleGenerateSlip = () => {
    if (itemsToReturn.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Items Selected',
        message: 'Please select at least one near-expiry medicine batch to return.'
      });
      return;
    }

    const supplierToUse = selectedSupplier === 'all' 
      ? (itemsToReturn[0]?.supplierName || 'Sun Pharma Dist')
      : selectedSupplier;

    const returnManifest = itemsToReturn.map(it => ({
      inventoryId: it.id,
      quantity: selectedItems[it.id]?.returnQty || it.stockQuantity,
      reason: `Near-Expiry Return (≤${expiryDaysLimit} Days Policy)`
    }));

    const newNote = createDebitNoteReturn(
      supplierToUse,
      returnManifest,
      `Official Near-Expiry Debit Note generated on ${new Date().toLocaleDateString('en-IN')}`
    );

    setGeneratedSlip(newNote);
    onReturnGenerated(newNote);

    addToast({
      type: 'success',
      title: 'Debit Note Generated',
      message: `Return slip ${newNote.noteNumber} created (Total PTR: ₹${newNote.totalAmount.toFixed(2)}). Stock deducted.`
    });
  };

  // WhatsApp formatted Return Slip
  const getWhatsAppSlipText = (note: DebitNote) => {
    const storeName = shopSettings.shopName || 'PharmPulse Pharmacy';
    const rawContact = note.supplierContact?.replace(/[^0-9]/g, '') || '';
    const cleanPhone = rawContact.length === 10 ? `91${rawContact}` : rawContact;

    const itemsFormatted = note.items.map((it, idx) => {
      return `${idx + 1}. *${it.brandName}* [Batch: ${it.batchNumber}]\n   • Return Qty: *${it.quantity} units* | Exp: *${it.expiryDate}*\n   • Purchase PTR: ₹${it.purchaseRate.toFixed(2)} | *Credit Due: ₹${it.totalCredit.toFixed(2)}*`;
    }).join('\n\n');

    const message = [
      `📋 *NEAR-EXPIRY RETURN SLIP / DEBIT NOTE*`,
      `*Debit Note No:* ${note.noteNumber}`,
      `*Date:* ${note.date}`,
      `*To Distributor:* ${note.supplierName}`,
      `*From Medical Store:* ${storeName.toUpperCase()}`,
      `*Drug License:* ${shopSettings.dlNumber}`,
      `*GSTIN:* ${shopSettings.gstin}`,
      `*Address:* ${shopSettings.address}`,
      `*Phone:* ${shopSettings.phone}`,
      `───────────────────────────────`,
      `Dear *${note.supplierName}*,`,
      `Please find our near-expiry return debit note manifest below for credit adjustment / replacement as per standard 60-90 day pharmaceutical return policy:`,
      ``,
      itemsFormatted,
      ``,
      `───────────────────────────────`,
      `*Total Return Batches:* ${note.items.length}`,
      `*Total Claim Credit Amount (PTR):* *₹${note.totalAmount.toFixed(2)}*`,
      `───────────────────────────────`,
      `_Please issue corresponding credit note / adjust against current month statement._`
    ].join('\n');

    const encoded = encodeURIComponent(message);
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    return { text: message, waUrl };
  };

  // Share on WhatsApp
  const handleShareWhatsApp = () => {
    if (!generatedSlip) return;
    const { waUrl } = getWhatsAppSlipText(generatedSlip);
    window.open(waUrl, '_blank');
  };

  // Print Slip
  const handlePrintSlip = () => {
    if (!generatedSlip) return;
    const printWin = window.open('', '_blank', 'width=800,height=900');
    if (!printWin) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Distributor Return Slip - ${generatedSlip.noteNumber}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #111; line-height: 1.4; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
          .store-name { font-size: 20px; font-weight: bold; text-transform: uppercase; }
          .meta { font-size: 12px; color: #444; margin-top: 4px; }
          .title-box { background: #f4f4f5; padding: 8px; margin: 15px 0; border: 1px solid #ddd; text-align: center; font-weight: bold; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          th { background: #f2f2f2; font-weight: bold; }
          .total { text-align: right; font-size: 15px; font-weight: bold; margin-top: 20px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 60px; font-size: 12px; }
          .sig-line { border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="store-name">${shopSettings.shopName}</div>
          <div class="meta">${shopSettings.address} | Phone: ${shopSettings.phone}</div>
          <div class="meta">Drug License: <strong>${shopSettings.dlNumber}</strong> | GSTIN: <strong>${shopSettings.gstin}</strong></div>
        </div>

        <div class="title-box">
          NEAR-EXPIRY DISTRIBUTOR DEBIT NOTE / RETURN SLIP (${generatedSlip.noteNumber})
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 10px;">
          <div><strong>To Distributor:</strong> ${generatedSlip.supplierName}<br>Contact: ${generatedSlip.supplierContact}</div>
          <div style="text-align: right;"><strong>Date:</strong> ${generatedSlip.date}<br><strong>Status:</strong> ${generatedSlip.status}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Medicine Description & Salt</th>
              <th>Batch No</th>
              <th>Expiry Date</th>
              <th>Rack Location</th>
              <th>Return Qty</th>
              <th>Purchase PTR (₹)</th>
              <th>Credit Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${generatedSlip.items.map((it, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${it.brandName}</strong><br><small style="color: #666;">${it.saltComposition}</small></td>
                <td><strong>${it.batchNumber}</strong></td>
                <td>${it.expiryDate}</td>
                <td>${it.rackLocation}</td>
                <td><strong>${it.quantity}</strong></td>
                <td>₹${it.purchaseRate.toFixed(2)}</td>
                <td><strong>₹${it.totalCredit.toFixed(2)}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total">
          Total Return Batches: ${generatedSlip.items.length} | Total Net Claim (PTR): ₹${generatedSlip.totalAmount.toFixed(2)}
        </div>

        <div class="signatures">
          <div class="sig-line">Pharmacist In-Charge</div>
          <div class="sig-line">Distributor Representative / Delivery Agent</div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWin.document.write(html);
    printWin.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
      <div 
        id="distributor-return-slip-modal"
        className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[92vh] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95"
      >
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
                Generate 60–90 Day Return Slip / Debit Note
              </h3>
              <p className="text-xs text-slate-400">
                Calculated at purchase PTR (Price to Retailer) for full distributor credit claim.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        {!generatedSlip ? (
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            
            {/* Filter Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Expiry Threshold Filter:
                </label>
                <select
                  value={expiryDaysLimit}
                  onChange={(e) => setExpiryDaysLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value={90}>Expiring within 90 Days (60-90 Day Window)</option>
                  <option value={60}>Expiring within 60 Days (30-60 Day Window)</option>
                  <option value={30}>Expiring within 30 Days (Critical &lt; 30 Days)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Distributor / Supplier:
                </label>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="all">All Registered Distributors ({eligibleItems.length} items)</option>
                  {suppliers.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Items Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Select Batches to Return ({itemsToReturn.length} / {displayItems.length} selected):</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                  Total Claim: ₹{totalPtrCredit.toFixed(2)} PTR
                </span>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/60 max-h-72 overflow-y-auto">
                {displayItems.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No items expiring within {expiryDaysLimit} days for this distributor.
                  </div>
                ) : (
                  displayItems.map(item => {
                    const isSelected = selectedItems[item.id]?.selected ?? true;
                    const returnQty = selectedItems[item.id]?.returnQty || item.stockQuantity;
                    const lineCredit = item.ptrRate * returnQty;

                    return (
                      <div 
                        key={item.id} 
                        className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                          isSelected ? 'bg-rose-50/40 dark:bg-rose-950/20' : 'bg-white dark:bg-slate-900 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleItem(item.id)}
                            className="w-4 h-4 rounded-sm accent-rose-600"
                          />
                          <div>
                            <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                              {item.brandName}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Batch: <strong>{item.batchNumber}</strong> • Exp: <strong>{item.expirationDate}</strong> ({item.daysLeft}d left)
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Rack: {item.locationShelf} • Supplier: {item.supplierName}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-right">
                          <div>
                            <label className="block text-[10px] text-slate-400 font-medium">Return Qty</label>
                            <input
                              type="number"
                              min={1}
                              max={item.stockQuantity}
                              value={returnQty}
                              disabled={!isSelected}
                              onChange={(e) => updateQty(item.id, Number(e.target.value) || 1, item.stockQuantity)}
                              className="w-16 px-2 py-1 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold font-mono text-slate-900 dark:text-white"
                            />
                          </div>

                          <div className="min-w-[80px]">
                            <div className="text-[10px] text-slate-400">PTR Rate</div>
                            <div className="text-xs font-black text-rose-600 dark:text-rose-400 font-mono">
                              ₹{lineCredit.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Financial Summary Box */}
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-rose-900 dark:text-rose-200 block">
                  Total Distributor Claim Amount (PTR):
                </span>
                <span className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
                  {itemsToReturn.length} batches selected for debit adjustment
                </span>
              </div>
              <div className="text-2xl font-black text-rose-700 dark:text-rose-300 font-mono">
                ₹{totalPtrCredit.toFixed(2)}
              </div>
            </div>

          </div>
        ) : (
          /* Generated Slip View with WhatsApp & Print */
          <div className="p-6 space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center space-y-1">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                Debit Note {generatedSlip.noteNumber} Created Successfully!
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Stock deducted from inventory. Total claim value: <strong className="text-emerald-700 dark:text-emerald-300 font-mono">₹{generatedSlip.totalAmount.toFixed(2)}</strong>
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Distributor:</span>
                <span className="font-bold text-slate-900 dark:text-white">{generatedSlip.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="font-bold">{generatedSlip.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Line Items:</span>
                <span className="font-bold">{generatedSlip.items.length} Batches</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (generatedSlip) {
                    generateStockistReturnPdf({
                      inventoryItems: generatedSlip.items.map(it => {
                        const existing = inventory.find(inv => inv.id === it.inventoryId);
                        if (existing) {
                          return {
                            ...existing,
                            stockQuantity: it.quantity,
                            purchaseRate: it.purchaseRate || existing.purchaseRate || existing.costPrice,
                            ptrRate: it.purchaseRate || existing.purchaseRate || existing.costPrice,
                            supplierName: generatedSlip.supplierName
                          };
                        }
                        return {
                          id: it.inventoryId,
                          brandName: it.brandName,
                          genericName: it.brandName,
                          batchNumber: it.batchNumber,
                          expirationDate: it.expiryDate,
                          stockQuantity: it.quantity,
                          mrp: it.purchaseRate * 1.3,
                          purchaseRate: it.purchaseRate,
                          ptrRate: it.purchaseRate,
                          costPrice: it.purchaseRate,
                          locationShelf: 'Main Storage',
                          rackNumber: 'Rack A',
                          shelfRow: '1',
                          saltComposition: it.brandName,
                          category: 'Allopathy' as any,
                          dosageForm: 'Tablet' as any,
                          strength: '',
                          packSize: '10s',
                          unit: 'units',
                          taxRate: 12,
                          gstRate: 12,
                          requiresPrescription: false,
                          scheduleType: 'OTC' as any,
                          scheduleClass: 'OTC' as any,
                          supplierName: generatedSlip.supplierName,
                          minStockLevel: 5,
                          reorderPoint: 5,
                          reorderQuantity: 10,
                          ndc: '',
                          quarantined: false
                        } as any;
                      }),
                      shopSettings: shopSettings || null,
                      supplierName: generatedSlip.supplierName,
                      debitNoteNumber: generatedSlip.noteNumber,
                      notes: generatedSlip.notes
                    });
                  }
                }}
                className="py-3 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-rose-600/20 cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                <span>Download PDF Sheet</span>
              </button>

              <button
                type="button"
                onClick={handlePrintSlip}
                className="py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Voucher</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>WhatsApp Slip</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        {!generatedSlip && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={itemsToReturn.length === 0}
              onClick={handleGenerateSlip}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md shadow-rose-600/20 cursor-pointer flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Generate Return Slip & Deduct Stock
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
