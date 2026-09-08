import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { PointOfSaleTransaction, PosBillItem, SalesReturnRecord } from '../../types/pharmacy';
import { 
  RotateCcw, 
  Search, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Receipt, 
  Send, 
  Printer, 
  Phone, 
  User, 
  DollarSign, 
  Package, 
  ArrowRight, 
  Plus, 
  Minus, 
  Copy, 
  Check, 
  Calendar,
  Sparkles,
  RefreshCw,
  FileText
} from 'lucide-react';

interface SalesReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedInvoiceId?: string | null;
}

interface ReturnItemState {
  inventoryId: string;
  brandName: string;
  batchNumber: string;
  originalQuantity: number;
  returnQuantity: number;
  unitPrice: number;
  gstRate: number;
  refundAmount: number;
  reason: string;
  selected: boolean;
}

export const SalesReturnModal: React.FC<SalesReturnModalProps> = ({
  isOpen,
  onClose,
  preselectedInvoiceId
}) => {
  const { 
    transactions, 
    inventory, 
    shopSettings, 
    processSalesReturn, 
    formatWhatsAppCreditNote,
    addToast 
  } = usePharmacy();

  // Search invoice state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<PointOfSaleTransaction | null>(null);

  // Return items form state
  const [itemsToReturn, setItemsToReturn] = useState<ReturnItemState[]>([]);
  const [refundMethod, setRefundMethod] = useState<'Cash' | 'Khata Credit' | 'Store Credit Note' | 'UPI Transfer'>('Cash');
  const [returnNotes, setReturnNotes] = useState<string>('');

  // Post-processing success state
  const [processedReturn, setProcessedReturn] = useState<SalesReturnRecord | null>(null);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState<boolean>(false);

  // Preset return reasons
  const returnReasons = [
    'Unopened / Sealed',
    'Doctor Changed Medicine',
    'Expired / Defective',
    'Wrong Item Dispensed',
    'Excess Strips Returned',
    'Customer Reaction / Intolerance'
  ];

  // If preselectedInvoiceId is passed, select it on mount/change
  React.useEffect(() => {
    if (preselectedInvoiceId && isOpen) {
      const match = transactions.find(t => t.id === preselectedInvoiceId || t.invoiceNumber === preselectedInvoiceId);
      if (match) {
        handleSelectInvoice(match);
      }
    }
  }, [preselectedInvoiceId, isOpen, transactions]);

  // Matching transactions by invoice ID or phone
  const searchResults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return transactions.slice(0, 8);

    return transactions.filter(t => {
      const matchInv = (t.invoiceNumber || t.id || '').toLowerCase().includes(q);
      const matchPhone = (t.customerPhone || t.patientPhone || t.contactNumber || '').includes(q);
      const matchName = (t.customerName || t.patientName || '').toLowerCase().includes(q);
      return matchInv || matchPhone || matchName;
    });
  }, [transactions, searchTerm]);

  // When an invoice is selected, initialize the return item states
  const handleSelectInvoice = (inv: PointOfSaleTransaction) => {
    setSelectedInvoice(inv);
    setProcessedReturn(null);

    const initialItems: ReturnItemState[] = (inv.items || []).map(item => {
      const qty = item.quantity || 1;
      const uPrice = item.unitPrice || item.sellingPrice || (item.totalAmount ? item.totalAmount / qty : 10);
      const gst = item.gstRate || 12;

      return {
        inventoryId: item.inventoryId || item.id || '',
        brandName: item.brandName || item.medicationName || 'Medicine',
        batchNumber: item.batchNumber || (item as any).batch || 'DEFAULT',
        originalQuantity: qty,
        returnQuantity: 1,
        unitPrice: uPrice,
        gstRate: gst,
        refundAmount: Number(uPrice.toFixed(2)),
        reason: 'Unopened / Sealed',
        selected: false
      };
    });

    setItemsToReturn(initialItems);
  };

  // Toggle item selection
  const handleToggleItem = (index: number) => {
    setItemsToReturn(prev => prev.map((item, idx) => {
      if (idx === index) {
        const nextSelected = !item.selected;
        return {
          ...item,
          selected: nextSelected,
          refundAmount: nextSelected ? Number((item.returnQuantity * item.unitPrice).toFixed(2)) : 0
        };
      }
      return item;
    }));
  };

  // Adjust return quantity
  const handleQtyChange = (index: number, newQty: number) => {
    setItemsToReturn(prev => prev.map((item, idx) => {
      if (idx === index) {
        const validQty = Math.max(1, Math.min(item.originalQuantity, newQty));
        return {
          ...item,
          returnQuantity: validQty,
          refundAmount: Number((validQty * item.unitPrice).toFixed(2))
        };
      }
      return item;
    }));
  };

  // Update return reason
  const handleReasonChange = (index: number, reason: string) => {
    setItemsToReturn(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, reason };
      }
      return item;
    }));
  };

  // Calculate total refund amount
  const selectedItemsToRefund = itemsToReturn.filter(it => it.selected);
  const totalRefundAmount = selectedItemsToRefund.reduce((sum, it) => sum + it.refundAmount, 0);

  // Submit return
  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    if (selectedItemsToRefund.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Items Selected',
        message: 'Please check at least one medicine item to return.'
      });
      return;
    }

    const res = processSalesReturn({
      originalInvoiceId: selectedInvoice.id,
      itemsToReturn: selectedItemsToRefund.map(it => ({
        inventoryId: it.inventoryId,
        brandName: it.brandName,
        batchNumber: it.batchNumber,
        originalQuantity: it.originalQuantity,
        returnQuantity: it.returnQuantity,
        unitPrice: it.unitPrice,
        gstRate: it.gstRate,
        refundAmount: it.refundAmount,
        reason: it.reason,
        restocked: true
      })),
      refundMethod: refundMethod,
      notes: returnNotes
    });

    setProcessedReturn(res);
  };

  const handlePrintCreditNote = () => {
    window.print();
  };

  const handleCopyWhatsApp = () => {
    if (!processedReturn) return;
    const { text } = formatWhatsAppCreditNote(processedReturn);
    navigator.clipboard.writeText(text);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Sales Return &amp; Refund Engine
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Process customer returns, restock inventory batches, and issue official Credit Notes.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* STEP 3: RETURN SUCCESS SCREEN */}
          {processedReturn ? (
            <div className="space-y-5">
              
              {/* Success Badge */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-1">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-base text-emerald-900 dark:text-emerald-200">
                  Sales Return Successfully Processed
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Inventory stock restored. Credit Note <strong>{processedReturn.creditNoteNumber}</strong> issued.
                </p>
              </div>

              {/* Printable Credit Note Card */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 font-sans print:p-0 print:border-none">
                <div className="flex items-center justify-between pb-3 border-b border-dashed border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                      OFFICIAL CREDIT NOTE
                    </span>
                    <h5 className="font-mono font-bold text-base text-slate-900 dark:text-white">
                      {processedReturn.creditNoteNumber}
                    </h5>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-slate-500">Original Invoice:</span>
                    <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      #{processedReturn.originalInvoiceNumber}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">Customer:</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{processedReturn.customerName}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Phone:</span>
                    <p className="font-mono text-slate-800 dark:text-slate-200">{processedReturn.customerPhone || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Date &amp; Time:</span>
                    <p className="text-slate-800 dark:text-slate-200">{processedReturn.timestamp}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Refund Method:</span>
                    <p className="font-bold text-teal-700 dark:text-teal-300">{processedReturn.refundMethod}</p>
                  </div>
                </div>

                {/* Returned Items Table */}
                <div className="divide-y divide-slate-200 dark:divide-slate-700 text-xs">
                  <div className="py-1.5 flex justify-between font-bold text-slate-500 text-[11px] uppercase">
                    <span>Item &amp; Reason</span>
                    <span>Qty x Rate = Refund</span>
                  </div>
                  {processedReturn.items.map((it, idx) => (
                    <div key={idx} className="py-2 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{it.brandName}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          Batch: {it.batchNumber} • Reason: <span className="text-slate-600 dark:text-slate-300 font-sans">{it.reason}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold font-mono text-slate-900 dark:text-white">
                          ₹{it.refundAmount.toFixed(2)}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {it.returnQuantity} x ₹{it.unitPrice.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Refund Footer */}
                <div className="pt-3 border-t border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">Total Refund Amount:</span>
                  <span className="font-black text-xl font-mono text-teal-600 dark:text-teal-400">
                    ₹{processedReturn.totalRefundAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                <a
                  href={formatWhatsAppCreditNote(processedReturn).waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyWhatsApp}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  {copiedWhatsApp ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWhatsApp ? 'Copied!' : 'Copy Summary'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintCreditNote}
                  className="py-2.5 px-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInvoice(null);
                    setProcessedReturn(null);
                    setSearchTerm('');
                  }}
                  className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
                >
                  ← Process Another Return
                </button>
              </div>

            </div>
          ) : !selectedInvoice ? (
            
            /* STEP 1: SEARCH & SELECT ORIGINAL INVOICE */
            <div className="space-y-4">
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Search Original Invoice by ID or Customer Mobile Number:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoFocus
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="e.g. INV-2026-8812, 9876543210, or customer name..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none dark:text-white"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Matching Transactions List */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Select Sale to Return ({searchResults.length} Results):
                </span>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-900/40">
                  {searchResults.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      No invoices found matching "{searchTerm}". Please check invoice number or customer phone.
                    </div>
                  ) : (
                    searchResults.map(inv => (
                      <div
                        key={inv.id}
                        onClick={() => handleSelectInvoice(inv)}
                        className="p-3.5 hover:bg-teal-50/80 dark:hover:bg-teal-950/40 cursor-pointer transition-all flex items-center justify-between gap-3 group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-900 dark:text-white group-hover:text-teal-600">
                              #{inv.invoiceNumber || inv.id}
                            </span>
                            <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                              {inv.paymentMode || inv.paymentMethod || 'Cash'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                            {inv.customerName || inv.patientName || 'Customer'} • <span className="font-mono text-slate-400">{inv.customerPhone || inv.patientPhone || 'No Phone'}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {inv.timestamp} • {inv.items?.length || 0} items purchased
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex items-center gap-3">
                          <div>
                            <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                              ₹{(inv.grandTotal || inv.totalPaid || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          ) : (

            /* STEP 2: SELECT MEDICINES TO RETURN & REASONS */
            <form onSubmit={handleSubmitReturn} className="space-y-4">
              
              {/* Selected Invoice Header */}
              <div className="p-3.5 bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-teal-900 dark:text-teal-200 text-sm">
                      #{selectedInvoice.invoiceNumber || selectedInvoice.id}
                    </span>
                    <span className="text-[10px] text-teal-700 dark:text-teal-300 bg-white/80 dark:bg-teal-900 px-2 py-0.5 rounded font-semibold">
                      {selectedInvoice.timestamp}
                    </span>
                  </div>
                  <p className="text-teal-800 dark:text-teal-300 mt-0.5">
                    Customer: <strong>{selectedInvoice.customerName || selectedInvoice.patientName || 'Walk-in'}</strong> ({selectedInvoice.customerPhone || selectedInvoice.patientPhone || 'N/A'})
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="text-xs font-bold text-teal-700 dark:text-teal-300 hover:underline"
                >
                  Change Invoice
                </button>
              </div>

              {/* Items Selection Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Select Medicines &amp; Strips to Return:
                  </span>
                  <span className="text-xs text-slate-500">
                    {selectedItemsToRefund.length} of {itemsToReturn.length} selected
                  </span>
                </div>

                <div className="space-y-2.5">
                  {itemsToReturn.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border transition-all ${
                        item.selected
                          ? 'border-teal-500 bg-teal-50/40 dark:bg-teal-950/30 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => handleToggleItem(idx)}
                            className="mt-1 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                          />
                          <div>
                            <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                              {item.brandName}
                            </h5>
                            <p className="text-[11px] text-slate-400 font-mono">
                              Batch: {item.batchNumber} • Purchased: {item.originalQuantity} units @ ₹{item.unitPrice.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                            ₹{item.refundAmount.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            incl. {item.gstRate}% GST
                          </span>
                        </div>
                      </div>

                      {/* Quantity & Reason Controls if Selected */}
                      {item.selected && (
                        <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-700/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          {/* Quantity Counter */}
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                              Return Quantity (Max: {item.originalQuantity}):
                            </label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleQtyChange(idx, item.returnQuantity - 1)}
                                disabled={item.returnQuantity <= 1}
                                className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-mono font-bold text-sm text-slate-900 dark:text-white px-2">
                                {item.returnQuantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQtyChange(idx, item.returnQuantity + 1)}
                                disabled={item.returnQuantity >= item.originalQuantity}
                                className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-[11px] text-slate-400">Restock to inventory</span>
                            </div>
                          </div>

                          {/* Reason Selector */}
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                              Return Reason / Condition:
                            </label>
                            <select
                              value={item.reason}
                              onChange={(e) => handleReasonChange(idx, e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none dark:text-white"
                            >
                              {returnReasons.map((r, i) => (
                                <option key={i} value={r}>{r}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Refund Method & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Refund Payout Method:
                  </label>
                  <select
                    value={refundMethod}
                    onChange={(e: any) => setRefundMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none dark:text-white"
                  >
                    <option value="Cash">💵 Cash Payout</option>
                    <option value="Khata Credit">📖 Khata Credit (Deduct from Udhaar Due)</option>
                    <option value="Store Credit Note">🎟️ Store Credit Note (Future Adjustment)</option>
                    <option value="UPI Transfer">📱 Instant UPI Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Return Notes / Pharmacist Remarks:
                  </label>
                  <input
                    type="text"
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    placeholder="e.g., Unopened blister pack, sealed box verified"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none dark:text-white"
                  />
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block">Total Refund Calculated:</span>
                  <span className="font-mono font-black text-xl text-teal-600 dark:text-teal-400">
                    ₹{totalRefundAmount.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedInvoice(null)}
                    className="py-2.5 px-4 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={selectedItemsToRefund.length === 0}
                    className="py-2.5 px-5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Confirm Return &amp; Restock</span>
                  </button>
                </div>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
};
