import React, { useState } from 'react';
import { 
  Printer, 
  Send, 
  FileDown, 
  X, 
  CheckCircle2, 
  Receipt, 
  Copy, 
  Check, 
  Sliders
} from 'lucide-react';
import { PointOfSaleTransaction, PosBillItem } from '../../types/pharmacy';
import { usePharmacy } from '../../context/PharmacyContext';
import { generateInvoicePdf } from '../../utils/invoicePdfGenerator';

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: PointOfSaleTransaction | null;
  onStartNextBill?: () => void;
  defaultPaperWidth?: '80mm' | '58mm';
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onStartNextBill,
  defaultPaperWidth = '80mm'
}) => {
  const { shopSettings, formatWhatsAppInvoice, currentPharmacist, addToast } = usePharmacy();
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>(defaultPaperWidth);
  const [copiedUpi, setCopiedUpi] = useState(false);

  if (!isOpen || !transaction) {
    return null;
  }

  // Defensive extraction
  const storeName = (shopSettings?.storeName || shopSettings?.shopName || 'PHARMPULSE HEALTHCARE').toUpperCase();
  const address = shopSettings?.address || 'Medical Store, Main Market, Sector 14';
  const phone = shopSettings?.phone || '+91 98765 43210';
  const dlNumbers = shopSettings?.drugLicense || shopSettings?.dlNumber || 'DL-20B/3891 • 21B/3892';
  const gstin = shopSettings?.gstin || '07AAAAA0000A1Z5';
  const upiId = shopSettings?.upiId || 'irsaad9118@okhdfcbank';

  const invoiceNo = transaction?.invoiceNumber || transaction?.receiptNumber || `#INV-${transaction?.id?.substring(0, 6) || '1001'}`;
  const rawDate = transaction?.timestamp || (transaction as any)?.createdAt || new Date().toISOString();
  
  let formattedDate = 'Today';
  let formattedTime = 'Just now';
  try {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      formattedTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } else {
      formattedDate = String(rawDate).split(' ')[0] || 'Today';
      formattedTime = String(rawDate).split(' ')[1] || '12:00 PM';
    }
  } catch {
    // fallback
  }

  const customerName = transaction?.customerName || transaction?.patientName || 'Walk-in Customer';
  const customerPhone = transaction?.customerPhone || transaction?.contactNumber || transaction?.patientPhone || '';
  const doctorName = transaction?.doctorName || transaction?.prescriberName || 'Self / Direct Counter';
  const paymentMode = transaction?.paymentMode || transaction?.paymentMethod || 'Cash';
  const cashier = (transaction?.pharmacistName || currentPharmacist || 'Pharmacist On Duty').split(',')[0];

  const subtotal = Number(transaction?.subtotal ?? transaction?.grandTotal ?? 0);
  const gstTotal = Number(transaction?.gstTotal ?? transaction?.taxTotal ?? transaction?.tax ?? 0);
  const discount = Number(transaction?.discountAmount ?? transaction?.discountTotal ?? 0);
  const roundOff = Number(transaction?.roundOff ?? 0);
  const grandTotal = Number(transaction?.grandTotal ?? 0);

  const rawItems: PosBillItem[] = Array.isArray(transaction?.items) ? transaction.items : [];
  const totalItemSavings = rawItems.reduce((sum, it) => sum + (Number(it?.totalSavings) || 0), 0);

  // Half GST for CGST / SGST breakdown
  const halfGst = gstTotal / 2;
  const taxableVal = Math.max(0, subtotal - gstTotal);

  // Trigger Native Thermal Print
  const handlePrint = () => {
    window.print();
    addToast({
      type: 'success',
      title: 'Print Command Sent',
      message: `Thermal receipt sent to ${paperWidth} printer spooler.`
    });
  };

  // Download Standard PDF
  const handleDownloadPdf = () => {
    try {
      generateInvoicePdf({
        transaction,
        shopSettings,
        cashierName: cashier
      });
      addToast({
        type: 'success',
        title: 'Tax Invoice Downloaded',
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

  // Dispatch WhatsApp
  const handleWhatsApp = () => {
    const { waUrl, text } = formatWhatsAppInvoice(transaction, customerPhone);
    if (customerPhone && customerPhone.replace(/\D/g, '').length >= 10) {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      addToast({
        type: 'success',
        title: 'WhatsApp Dispatched',
        message: `Direct invoice chat opened for ${customerName}`
      });
    } else {
      navigator.clipboard.writeText(text);
      if (waUrl) window.open(waUrl, '_blank', 'noopener,noreferrer');
      addToast({
        type: 'info',
        title: 'Invoice Text Copied',
        message: 'Invoice text copied to clipboard (no 10-digit mobile stored).'
      });
    }
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  return (
    <>
      {/* =========================================================
          1. ON-SCREEN INTERACTIVE MODAL (Desktop & Mobile)
          ========================================================= */}
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto no-print animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
          
          {/* Top Modal Header */}
          <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base leading-tight">POS Thermal Receipt</h3>
                <p className="text-[11px] text-slate-400 font-medium">Ready for 80mm & 58mm roll printing</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Paper Roll Width Selector */}
          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              Paper Roll Width:
            </span>
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-xl border border-slate-300 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  paperWidth === '80mm'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                80mm (Standard POS)
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  paperWidth === '58mm'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                58mm (Compact Roll)
              </button>
            </div>
          </div>

          {/* Scrollable Receipt Preview (Authentic Paper Aesthetic) */}
          <div className="p-3 sm:p-4 overflow-y-auto flex-1 bg-slate-100/60 dark:bg-slate-950/60 flex justify-center">
            
            {/* Authentic Thermal Paper Ticket Container */}
            <div 
              className={`bg-white text-slate-950 p-4 rounded-xl shadow-md border border-slate-300 transition-all font-mono ${
                paperWidth === '58mm' ? 'w-[240px] text-[10.5px]' : 'w-[320px] text-[11.5px]'
              }`}
            >
              
              {/* Header */}
              <div className="text-center space-y-0.5">
                {shopSettings?.logoUrl && (
                  <div className="flex justify-center mb-1.5">
                    <div className="w-12 h-12 rounded-lg bg-white p-0.5 border border-slate-200 flex items-center justify-center overflow-hidden">
                      <img 
                        src={shopSettings.logoUrl} 
                        alt="Store Logo" 
                        className="w-full h-full object-contain" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}
                <h2 className="font-black text-sm uppercase tracking-wide text-slate-900">{storeName}</h2>
                <p className="text-[10px] text-slate-600 leading-tight">{address}</p>
                <p className="text-[10px] text-slate-600">Ph: {phone}</p>
                <p className="text-[10px] font-bold text-slate-800">DL: {dlNumbers}</p>
                <p className="text-[10px] font-bold text-slate-800">GSTIN: {gstin}</p>
              </div>

              {/* Dashed Line */}
              <div className="my-2 border-b border-dashed border-slate-400" />

              {/* Invoice Meta */}
              <div className="space-y-0.5 text-[10.5px]">
                <div className="flex justify-between">
                  <span className="font-bold">INVOICE:</span>
                  <span className="font-bold text-slate-900">{invoiceNo}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[10px]">
                  <span>Date & Time:</span>
                  <span>{formattedDate} {formattedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-bold truncate max-w-[150px]">{customerName}</span>
                </div>
                {customerPhone && (
                  <div className="flex justify-between text-slate-600 text-[10px]">
                    <span>Mobile:</span>
                    <span>{customerPhone}</span>
                  </div>
                )}
                {doctorName && (
                  <div className="flex justify-between text-slate-600 text-[10px]">
                    <span>Doctor:</span>
                    <span className="truncate max-w-[140px]">{doctorName}</span>
                  </div>
                )}
                <div className="flex justify-between text-[10px]">
                  <span>Payment Mode:</span>
                  <span className="font-bold text-teal-800">{paymentMode}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[9.5px]">
                  <span>Dispensed By:</span>
                  <span>{cashier}</span>
                </div>
              </div>

              {/* Dashed Line */}
              <div className="my-2 border-b border-dashed border-slate-400" />

              {/* Items Table */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-12 font-bold text-[10px] uppercase border-b border-slate-300 pb-1">
                  <span className="col-span-6">Item / Batch</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-2 text-right">Rate</span>
                  <span className="col-span-2 text-right">Amt</span>
                </div>

                {rawItems.map((it, idx) => {
                  const name = it?.brandName || it?.medicationName || it?.genericName || 'Item';
                  const batch = it?.batchNumber || 'B-101';
                  const exp = it?.expirationDate || it?.expiryDate || '12/27';
                  const qty = Number(it?.quantity || 1);
                  const rate = Number(it?.unitPrice || it?.sellingPrice || it?.mrp || 0);
                  const total = Number(it?.totalPrice || it?.totalAmount || (rate * qty));
                  const hasOffer = it?.offerType && it.offerType !== 'none';

                  return (
                    <div key={idx} className="grid grid-cols-12 text-[10px] leading-snug py-0.5 border-b border-slate-100 last:border-0">
                      <div className="col-span-6 pr-1">
                        <div className="font-bold text-slate-900 leading-tight">{name}</div>
                        <div className="text-[8.5px] text-slate-500">{batch} • Exp {exp}</div>
                        {hasOffer && (
                          <div className="text-[8px] font-bold text-emerald-700">
                            {it.offerType === 'scheme'
                              ? `🎁 Scheme: +${it.freeQuantity || 0} Free`
                              : `🏷️ ${it.offerLabel || `${it.offerValue}% OFF`} (Saved ₹${(it.totalSavings || 0).toFixed(0)})`}
                          </div>
                        )}
                      </div>
                      <div className="col-span-2 text-center font-bold text-slate-800 self-center">
                        {qty}
                      </div>
                      <div className="col-span-2 text-right text-slate-700 self-center">
                        ₹{rate.toFixed(0)}
                      </div>
                      <div className="col-span-2 text-right font-bold text-slate-950 self-center">
                        ₹{total.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dashed Line */}
              <div className="my-2 border-b border-dashed border-slate-400" />

              {/* Financial Breakdown */}
              <div className="space-y-0.5 text-[10.5px]">
                <div className="flex justify-between">
                  <span className="text-slate-600">Taxable Subtotal:</span>
                  <span>₹{taxableVal.toFixed(2)}</span>
                </div>
                {halfGst > 0 && (
                  <>
                    <div className="flex justify-between text-[10px] text-slate-600">
                      <span>CGST (Central Tax):</span>
                      <span>₹{halfGst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-600">
                      <span>SGST (State Tax):</span>
                      <span>₹{halfGst.toFixed(2)}</span>
                    </div>
                  </>
                )}
                {totalItemSavings > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Scheme/Offer Savings:</span>
                    <span>-₹{totalItemSavings.toFixed(2)}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-red-600 font-bold">
                    <span>Discount:</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                )}
                {roundOff !== 0 && (
                  <div className="flex justify-between text-slate-500 text-[10px]">
                    <span>Round-off:</span>
                    <span>{roundOff > 0 ? '+' : ''}₹{roundOff.toFixed(2)}</span>
                  </div>
                )}
                
                {/* Grand Total Bar */}
                <div className="pt-1.5 mt-1 border-t-2 border-slate-900 flex justify-between items-center font-black text-sm">
                  <span>GRAND TOTAL:</span>
                  <span className="text-base font-black">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Dashed Line */}
              <div className="my-2 border-b border-dashed border-slate-400" />

              {/* Footer */}
              <div className="text-center text-[9.5px] text-slate-600 space-y-1">
                <p className="font-bold text-slate-900">Thank you! Visit again.</p>
                <p>Please keep medicines in a cool & dry place.</p>
                <p className="text-[8.5px] text-slate-400 uppercase tracking-wide">
                  Computer Generated Tax Invoice
                </p>
                {upiId && (
                  <div className="pt-1 text-[9px] flex items-center justify-center gap-1 text-slate-500">
                    <span>UPI: {upiId}</span>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="text-teal-700 hover:text-teal-900"
                    >
                      {copiedUpi ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                    </button>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Bottom Interactive Actions */}
          <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
            
            <div className="grid grid-cols-3 gap-2">
              {/* Button 1: Thermal Print */}
              <button
                type="button"
                onClick={handlePrint}
                className="py-2.5 sm:py-3 px-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-teal-600/20 active:scale-98 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>🖨️ Print</span>
              </button>

              {/* Button 2: Download PDF */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="py-2.5 sm:py-3 px-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 dark:bg-teal-950/60 dark:text-teal-200 border border-teal-200 dark:border-teal-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer"
              >
                <FileDown className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>📄 PDF</span>
              </button>

              {/* Button 3: WhatsApp */}
              <button
                type="button"
                onClick={handleWhatsApp}
                className="py-2.5 sm:py-3 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 active:scale-98 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>💬 WhatsApp</span>
              </button>
            </div>

            {onStartNextBill && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartNextBill();
                }}
                className="w-full py-2 text-center text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                ✓ Start Next Bill & Clear Counter
              </button>
            )}

          </div>

        </div>
      </div>

      {/* =========================================================
          2. DEDICATED PRINT CONTAINER (@media print ONLY)
          ========================================================= */}
      <div id="pos-thermal-print-area-wrapper" className="hidden">
        <div 
          id="pos-thermal-print-area" 
          className={paperWidth === '58mm' ? 'thermal-58mm' : 'thermal-80mm'}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '4px' }}>
            {shopSettings?.logoUrl && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
                <img 
                  src={shopSettings.logoUrl} 
                  alt="Logo" 
                  style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                  referrerPolicy="no-referrer" 
                />
              </div>
            )}
            <div style={{ fontWeight: 'bold', fontSize: paperWidth === '58mm' ? '12px' : '14px', textTransform: 'uppercase' }}>
              {storeName}
            </div>
            <div style={{ fontSize: '9px', marginTop: '1px' }}>{address}</div>
            <div style={{ fontSize: '9px' }}>Ph: {phone}</div>
            <div style={{ fontSize: '9px', fontWeight: 'bold' }}>DL: {dlNumbers}</div>
            <div style={{ fontSize: '9px', fontWeight: 'bold' }}>GSTIN: {gstin}</div>
          </div>

          <div className="print-dashed-divider" />

          {/* Invoice Meta */}
          <div style={{ fontSize: '9.5px', lineHeight: '1.3' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>INVOICE:</span>
              <span>{invoiceNo}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Date:</span>
              <span>{formattedDate} {formattedTime}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Customer:</span>
              <span style={{ fontWeight: 'bold' }}>{customerName}</span>
            </div>
            {customerPhone && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Mobile:</span>
                <span>{customerPhone}</span>
              </div>
            )}
            {doctorName && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Doctor:</span>
                <span>{doctorName}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Pay Mode:</span>
              <span style={{ fontWeight: 'bold' }}>{paymentMode} (PAID)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Cashier:</span>
              <span>{cashier}</span>
            </div>
          </div>

          <div className="print-dashed-divider" />

          {/* Item Table */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '9px', borderBottom: '1px solid #000', paddingBottom: '2px', textTransform: 'uppercase' }}>
              <span style={{ width: '50%' }}>Item / Batch</span>
              <span style={{ width: '15%', textAlign: 'center' }}>Qty</span>
              <span style={{ width: '15%', textAlign: 'right' }}>Rate</span>
              <span style={{ width: '20%', textAlign: 'right' }}>Amt</span>
            </div>

            {rawItems.map((it, idx) => {
              const name = it?.brandName || it?.medicationName || it?.genericName || 'Item';
              const batch = it?.batchNumber || 'B-101';
              const exp = it?.expirationDate || it?.expiryDate || '12/27';
              const qty = Number(it?.quantity || 1);
              const rate = Number(it?.unitPrice || it?.sellingPrice || it?.mrp || 0);
              const total = Number(it?.totalPrice || it?.totalAmount || (rate * qty));
              const hasOffer = it?.offerType && it.offerType !== 'none';

              return (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', padding: '2px 0', borderBottom: '0.5px solid #eee' }}>
                  <div style={{ width: '50%', paddingRight: '2px' }}>
                    <div style={{ fontWeight: 'bold' }}>{name}</div>
                    <div style={{ fontSize: '8px' }}>{batch} Exp:{exp}</div>
                    {hasOffer && (
                      <div style={{ fontSize: '7.5px', fontWeight: 'bold' }}>
                        {it.offerType === 'scheme'
                          ? `[Scheme: +${it.freeQuantity || 0} Free]`
                          : `[Offer: ${it.offerLabel || `${it.offerValue}% OFF`}]`}
                      </div>
                    )}
                  </div>
                  <div style={{ width: '15%', textAlign: 'center', fontWeight: 'bold' }}>{qty}</div>
                  <div style={{ width: '15%', textAlign: 'right' }}>₹{rate.toFixed(0)}</div>
                  <div style={{ width: '20%', textAlign: 'right', fontWeight: 'bold' }}>₹{total.toFixed(2)}</div>
                </div>
              );
            })}
          </div>

          <div className="print-dashed-divider" />

          {/* Summary Breakdown */}
          <div style={{ fontSize: '9.5px', lineHeight: '1.35' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Taxable Subtotal:</span>
              <span>₹{taxableVal.toFixed(2)}</span>
            </div>
            {halfGst > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>CGST:</span>
                  <span>₹{halfGst.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>SGST:</span>
                  <span>₹{halfGst.toFixed(2)}</span>
                </div>
              </>
            )}
            {totalItemSavings > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>Scheme/Offer Savings:</span>
                <span>-₹{totalItemSavings.toFixed(2)}</span>
              </div>
            )}
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>Discount:</span>
                <span>-₹{discount.toFixed(2)}</span>
              </div>
            )}
            {roundOff !== 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Round-off:</span>
                <span>{roundOff > 0 ? '+' : ''}₹{roundOff.toFixed(2)}</span>
              </div>
            )}

            <div className="print-solid-divider" />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperWidth === '58mm' ? '12px' : '13px', fontWeight: 'bold', padding: '2px 0' }}>
              <span>GRAND TOTAL:</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="print-dashed-divider" />

          {/* Footer */}
          <div style={{ textAlign: 'center', fontSize: '8.5px', marginTop: '4px', lineHeight: '1.3' }}>
            <div style={{ fontWeight: 'bold' }}>Thank you! Visit again.</div>
            <div>Please keep medicines in a cool & dry place.</div>
            <div style={{ fontSize: '8px', textTransform: 'uppercase', marginTop: '2px' }}>
              Computer Generated Tax Invoice
            </div>
            {upiId && <div style={{ fontSize: '8px' }}>UPI: {upiId}</div>}
          </div>
        </div>
      </div>
    </>
  );
};
