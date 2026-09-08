import React from 'react';
import { 
  X, 
  Printer, 
  Store, 
  FileText, 
  CreditCard, 
  User, 
  Phone, 
  Calendar, 
  CheckCircle2, 
  ShieldCheck, 
  MapPin,
  QrCode,
  IndianRupee,
  Share2,
  Copy,
  Receipt
} from 'lucide-react';
import { PlatformInvoice } from '../../types/pharmacy';

interface InvoiceInspectorModalProps {
  invoice: PlatformInvoice | null;
  onClose: () => void;
}

export const InvoiceInspectorModal: React.FC<InvoiceInspectorModalProps> = ({ invoice, onClose }) => {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const text = `Invoice: ${invoice.invoiceNumber}\nStore: ${invoice.storeName}\nDate: ${invoice.timestamp}\nCustomer: ${invoice.customerName} (${invoice.customerPhone || 'N/A'})\nTotal: ₹${invoice.grandTotal.toFixed(2)}\nPayment: ${invoice.paymentMethod}\nItems:\n${(invoice.items || []).map(i => `- ${i.brandName} x${i.quantity} (Batch: ${i.batchNumber}) = ₹${i.totalAmount}`).join('\n')}`;
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
        id="invoice-inspector-modal"
      >
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-400/30 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  TAX INVOICE & THERMAL RECEIPT AUDIT
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30">
                  {invoice.invoiceNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Audited from tenant store: <span className="text-teal-300 font-semibold">{invoice.storeName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-slate-700"
              title="Print standard thermal receipt"
            >
              <Printer className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">Print Receipt</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body / Thermal Bill Preview */}
        <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto space-y-5 bg-slate-50/50 dark:bg-slate-900/50">
          
          {/* Thermal Paper Styling Card */}
          <div className="bg-white dark:bg-slate-950 p-5 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm font-sans relative">
            
            {/* Pharmacy Header */}
            <div className="text-center pb-4 border-b border-dashed border-slate-300 dark:border-slate-700 space-y-1">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">
                {invoice.storeName}
              </h2>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {invoice.storeAddress || 'Main Market Road, Commercial Complex'}
              </div>
              <div className="flex items-center justify-center flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                <span>DL No: <strong className="text-slate-800 dark:text-slate-200">{invoice.storeDl || 'DL-20B/3891 & 21B/3892'}</strong></span>
                <span>•</span>
                <span>GSTIN: <strong className="text-slate-800 dark:text-slate-200">{invoice.storeGstin || '07AAAAA0000A1Z5'}</strong></span>
                <span>•</span>
                <span>Ph: <strong>{invoice.storePhone || '+91 98765 43210'}</strong></span>
              </div>
            </div>

            {/* Bill Meta & Customer Information */}
            <div className="py-3 border-b border-dashed border-slate-300 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400">
                  <FileText className="w-3.5 h-3.5 text-teal-600" />
                  <span>Invoice No: <strong className="text-slate-900 dark:text-white font-mono">{invoice.invoiceNumber}</strong></span>
                </div>
                <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Date & Time: <strong className="text-slate-800 dark:text-slate-200 font-mono">{invoice.timestamp}</strong></span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Doctor: <span className="font-semibold text-slate-700 dark:text-slate-300">{invoice.doctorName || 'Self / Direct Prescription'}</span>
                </div>
              </div>

              <div className="space-y-1 sm:text-right">
                <div className="flex items-center sm:justify-end space-x-1.5 text-slate-600 dark:text-slate-400">
                  <User className="w-3.5 h-3.5 text-purple-600" />
                  <span>Customer: <strong className="text-slate-900 dark:text-white">{invoice.customerName}</strong></span>
                </div>
                {invoice.customerPhone && (
                  <div className="flex items-center sm:justify-end space-x-1.5 text-slate-600 dark:text-slate-400">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Phone: <strong className="text-slate-800 dark:text-slate-200 font-mono">+91 {invoice.customerPhone}</strong></span>
                  </div>
                )}
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Cashier: <span className="font-semibold text-slate-700 dark:text-slate-300">{invoice.cashierName || 'Store Cashier'}</span>
                </div>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="py-3 border-b border-dashed border-slate-300 dark:border-slate-700 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-800 pb-1.5">
                    <th className="pb-1.5"># Item & Composition</th>
                    <th className="pb-1.5 text-center">Batch / Rack</th>
                    <th className="pb-1.5 text-center">Qty</th>
                    <th className="pb-1.5 text-right">MRP (₹)</th>
                    <th className="pb-1.5 text-right">Rate (₹)</th>
                    <th className="pb-1.5 text-right">GST</th>
                    <th className="pb-1.5 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {(invoice.items || []).map((item, idx) => {
                    const brand = item.brandName || (item as any).medicationName || 'Medicine';
                    const salt = item.saltComposition || item.genericName || '';
                    const batch = item.batchNumber || 'STD';
                    const rack = item.rackLocation || 'Rack Shelf';
                    const qty = item.quantity || 1;
                    const mrp = item.mrp || item.sellingPrice || 0;
                    const rate = item.sellingPrice || mrp;
                    const gstRate = item.gstRate || 12;
                    const amount = item.totalAmount || (rate * qty);

                    return (
                      <tr key={idx} className="py-2">
                        <td className="py-2 pr-2 font-sans">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1">
                            <span>{brand}</span>
                            {item.isRx && (
                              <span className="px-1 py-0.2 text-[9px] font-bold rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-mono">
                                Rx
                              </span>
                            )}
                          </div>
                          {salt && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                              {salt}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center text-[10px]">
                          <div className="font-semibold text-slate-700 dark:text-slate-300">{batch}</div>
                          <div className="text-slate-400">{rack}</div>
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-slate-900 dark:text-white">
                          {qty}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-500">
                          ₹{mrp.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right font-semibold text-slate-800 dark:text-slate-200">
                          ₹{rate.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right text-[10px] text-slate-500">
                          {gstRate}%
                        </td>
                        <td className="py-2 pl-2 text-right font-bold text-slate-900 dark:text-white">
                          ₹{amount.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Financial Summary & Tax Slabs */}
            <div className="py-3 border-b border-dashed border-slate-300 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Payment Details
                </div>
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800 text-xs">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Mode: {invoice.paymentMethod || invoice.paymentMode || 'Cash'}</span>
                </div>
                {invoice.upiRefNumber && (
                  <div className="text-[10px] font-mono text-slate-500">
                    UPI Ref: {invoice.upiRefNumber}
                  </div>
                )}
                {invoice.notes && (
                  <div className="text-[11px] text-slate-500 italic mt-1">
                    Note: {invoice.notes}
                  </div>
                )}
              </div>

              <div className="space-y-1 font-mono text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal:</span>
                  <span>₹{invoice.subtotal.toFixed(2)}</span>
                </div>
                {invoice.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount Savings:</span>
                    <span>-₹{invoice.discountTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>CGST:</span>
                  <span>₹{(invoice.cgst || invoice.tax / 2 || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>SGST:</span>
                  <span>₹{(invoice.sgst || invoice.tax / 2 || 0).toFixed(2)}</span>
                </div>
                {invoice.roundOff !== undefined && invoice.roundOff !== 0 && (
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Round Off:</span>
                    <span>₹{invoice.roundOff.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-1.5 border-t border-slate-200 dark:border-slate-800">
                  <span>NET PAYABLE:</span>
                  <span className="text-teal-600 dark:text-teal-400">₹{invoice.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer Pharmacist Sign */}
            <div className="pt-3 text-center space-y-1 text-[10px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center justify-between pt-2">
                <div>
                  Dispensed by: <strong className="text-slate-700 dark:text-slate-300">{invoice.pharmacistStaff || 'Registered Pharmacist'}</strong>
                </div>
                <div>
                  Signature / Seal: <span className="font-mono text-slate-600">✓ VERIFIED</span>
                </div>
              </div>
              <div className="text-slate-400 italic pt-1">
                {invoice.footerNote || 'Thank you! Wish you a speedy recovery & good health.'}
              </div>
            </div>

          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              onClick={handleCopySummary}
              className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span>Copy Bill Details</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              Done & Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
