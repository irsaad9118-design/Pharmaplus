import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Send, 
  FileDown, 
  Printer, 
  Plus, 
  X, 
  Phone, 
  Check, 
  Copy, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Receipt
} from 'lucide-react';
import { PointOfSaleTransaction } from '../../types/pharmacy';
import { usePharmacy } from '../../context/PharmacyContext';
import { generateInvoicePdf } from '../../utils/invoicePdfGenerator';

interface BillCompletedModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: PointOfSaleTransaction | null;
  onNextSale: () => void;
  onOpenThermalReceipt?: () => void;
}

export const BillCompletedModal: React.FC<BillCompletedModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onNextSale,
  onOpenThermalReceipt
}) => {
  const { shopSettings, formatWhatsAppInvoice, currentPharmacist, addToast } = usePharmacy();
  
  const [phoneNumberInput, setPhoneNumberInput] = useState('');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  useEffect(() => {
    if (transaction) {
      const existingPhone = transaction.customerPhone || transaction.contactNumber || (transaction as any).patientPhone || '';
      setPhoneNumberInput(existingPhone.replace(/\D/g, '').slice(-10));
      setIsEditingPhone(!existingPhone || existingPhone.replace(/\D/g, '').length < 10);
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const invoiceNo = transaction.invoiceNumber || transaction.receiptNumber || `#INV-${transaction.id?.substring(0, 6) || '1001'}`;
  const customerName = transaction.customerName || (transaction as any).patientName || 'Walk-in Customer';
  const grandTotal = Number(transaction.grandTotal || 0);
  const paymentMode = transaction.paymentMode || (transaction as any).paymentMethod || 'Cash';
  const totalItemsCount = (transaction.items || []).reduce((sum, it) => sum + Number(it.quantity || 1), 0);
  const storeName = (shopSettings?.storeName || shopSettings?.shopName || 'PHARMPULSE HEALTHCARE').toUpperCase();
  const upiId = shopSettings?.upiId || 'irsaad9118@okhdfcbank';

  // 1. One-tap WhatsApp Dispatch
  const handleSendWhatsApp = () => {
    const cleanDigits = phoneNumberInput.replace(/\D/g, '');
    const effectivePhone = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : undefined;
    const { waUrl } = formatWhatsAppInvoice(transaction, effectivePhone);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    
    addToast({
      type: 'success',
      title: 'WhatsApp Invoice Ready',
      message: effectivePhone 
        ? `Tax invoice dispatched to +91 ${effectivePhone}` 
        : 'Opened WhatsApp share tray for receipt dispatch.'
    });
  };

  // 2. Re-download PDF
  const handleRedownloadPdf = () => {
    try {
      generateInvoicePdf({
        transaction,
        shopSettings,
        cashierName: (transaction.pharmacistName || currentPharmacist || 'Pharmacist On Duty').split(',')[0]
      });
      addToast({
        type: 'success',
        title: 'Invoice PDF Downloaded',
        message: `Standard Pharmacy Tax Invoice ${invoiceNo} downloaded successfully.`
      });
    } catch (err) {
      console.error('PDF error:', err);
      addToast({
        type: 'error',
        title: 'PDF Generation Failed',
        message: 'Could not generate PDF invoice.'
      });
    }
  };

  // 3. Thermal Print Direct
  const handleThermalPrint = () => {
    if (onOpenThermalReceipt) {
      onOpenThermalReceipt();
    } else {
      window.print();
    }
  };

  // 4. Next Sale
  const handleNextSaleClick = () => {
    onClose();
    onNextSale();
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  return (
    <div 
      id="bill-completed-success-modal"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-200">
        
        {/* Top Header Banner */}
        <div className="p-4 bg-emerald-600 dark:bg-emerald-700 text-white flex items-center justify-between shrink-0 relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-sm pointer-events-none" />
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs text-white flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm sm:text-base leading-tight">Bill Completed Successfully!</span>
                <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
              </div>
              <p className="text-[11px] text-emerald-100 font-medium font-mono">
                Invoice Generated & Saved ({invoiceNo})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-emerald-100 hover:text-white hover:bg-emerald-800/40 transition-colors cursor-pointer relative z-10"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* Card: Invoice Summary Info */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Billed Customer:</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                {customerName}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Dispensed Medicines:</span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {transaction.items?.length || 0} items ({totalItemsCount} units)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Payment Mode:</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                {paymentMode} (Paid)
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">Grand Total Amount:</span>
              <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Quick PDF Auto-Downloaded Status Pill */}
          <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center gap-2 text-teal-800 dark:text-teal-300 text-xs">
            <ShieldCheck className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" />
            <span className="font-medium">
              Standard Tax Invoice PDF (<strong className="font-mono">Invoice_{invoiceNo.replace('#', '')}.pdf</strong>) auto-downloaded.
            </span>
          </div>

          {/* Customer WhatsApp Mobile Input & Instant 1-Tap Share Button */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 shadow-xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Customer WhatsApp Mobile:
              </label>
              {phoneNumberInput && !isEditingPhone && (
                <button
                  type="button"
                  onClick={() => setIsEditingPhone(true)}
                  className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Change
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={phoneNumberInput}
                  onChange={(e) => setPhoneNumberInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 10-digit WhatsApp number"
                  className="w-full pl-11 pr-3 py-2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Instant 1-Tap "Share Bill on WhatsApp" Button */}
            <button
              type="button"
              id="share-bill-whatsapp-btn"
              onClick={handleSendWhatsApp}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-emerald-700/30 cursor-pointer transition-all border border-emerald-400/30"
            >
              <Send className="w-4 h-4 text-white" />
              <span>Share Bill on WhatsApp</span>
            </button>

            <p className="text-[10px] text-emerald-800 dark:text-emerald-300/80 text-center">
              Formats the bill into a clean receipt message with store name, items, batch, total, and payment mode.
            </p>
          </div>

          {/* Action Grid: Re-download PDF & Thermal Print */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Button: Re-download PDF */}
            <button
              type="button"
              id="modal-redownload-pdf-btn"
              onClick={handleRedownloadPdf}
              className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer shadow-2xs"
            >
              <FileDown className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>📄 Re-download PDF</span>
            </button>

            {/* Button: Thermal Print */}
            <button
              type="button"
              id="modal-thermal-print-btn"
              onClick={handleThermalPrint}
              className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer shadow-2xs"
            >
              <Printer className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <span>🖨️ Thermal Print</span>
            </button>
          </div>

        </div>

        {/* Bottom Prominent Action: Next Sale / New Bill */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
          
          <button
            type="button"
            id="modal-next-sale-btn"
            onClick={handleNextSaleClick}
            className="w-full py-3.5 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-98 text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-600/25 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>➕ Next Sale / New Bill</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 px-1 pt-1">
            <span>{storeName}</span>
            {upiId && (
              <div className="flex items-center gap-1">
                <span>UPI: {upiId}</span>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="text-teal-600 hover:underline cursor-pointer"
                >
                  {copiedUpi ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
