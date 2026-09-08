import React, { useState, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { PointOfSaleTransaction, PosBillItem, SalesReturnRecord } from '../../types/pharmacy';
import { generateInvoicePdf } from '../../utils/invoicePdfGenerator';
import { ThermalReceiptModal } from '../pos/ThermalReceiptModal';
import { SalesReturnModal } from './SalesReturnModal';
import { DailyRevenueLineChart } from './DailyRevenueLineChart';
import { 
  History, 
  Search, 
  Printer, 
  Send, 
  Calendar, 
  CreditCard, 
  Banknote, 
  QrCode, 
  BookOpen, 
  ChevronRight, 
  Receipt, 
  CheckCircle2, 
  Phone, 
  User, 
  UserCheck, 
  FileText,
  FileDown,
  Download,
  X,
  Copy,
  Check,
  MapPin,
  TrendingUp,
  AlertCircle,
  Stethoscope,
  Clock,
  Sparkles,
  RefreshCw,
  RotateCcw,
  Plus,
  BarChart3
} from 'lucide-react';

// Internal Error Boundary to isolate sales view crashes
interface LocalErrorBoundaryProps {
  children: ReactNode;
  fallbackMessage?: string;
}

interface LocalErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class SalesLocalErrorBoundary extends Component<LocalErrorBoundaryProps, LocalErrorBoundaryState> {
  constructor(props: LocalErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): LocalErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SalesView caught an internal render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">Sales Ledger Safe Mode</h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            {this.props.fallbackMessage || 'An unexpected error occurred while rendering the sales ledger. The data was kept safe.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Rendering</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Helper to format safe timestamp & date
function formatInvoiceDateTime(rawTimestamp?: string | null): { dateStr: string; timeStr: string } {
  if (!rawTimestamp) {
    return { dateStr: 'Today', timeStr: 'Just now' };
  }
  try {
    const d = new Date(rawTimestamp);
    if (isNaN(d.getTime())) {
      // Fallback if rawTimestamp is string like "2026-08-24 14:30:00"
      const parts = rawTimestamp.split(' ');
      if (parts.length >= 2) {
        return { dateStr: parts[0], timeStr: parts[1].substring(0, 5) };
      }
      return { dateStr: rawTimestamp, timeStr: 'Just now' };
    }
    const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    return { dateStr, timeStr };
  } catch {
    return { dateStr: 'Today', timeStr: 'Just now' };
  }
}

// Helper to extract clean payment mode label
function getPaymentModeTag(mode?: string | null): { label: string; type: 'cash' | 'upi' | 'khata' | 'card' | 'other' } {
  if (!mode) return { label: 'Cash', type: 'cash' };
  const lower = mode.toLowerCase();
  if (lower.includes('cash')) return { label: 'Cash', type: 'cash' };
  if (lower.includes('upi') || lower.includes('qr')) return { label: 'UPI', type: 'upi' };
  if (lower.includes('khata') || lower.includes('udhaar') || lower.includes('credit')) return { label: 'Khata', type: 'khata' };
  if (lower.includes('card') || lower.includes('debit')) return { label: 'Card', type: 'card' };
  return { label: mode, type: 'other' };
}

// Helper to generate concise item list summary
function getItemSummaryPreview(items?: PosBillItem[] | null, defaultSummary?: string[] | null): string {
  if (defaultSummary && Array.isArray(defaultSummary) && defaultSummary.length > 0) {
    return defaultSummary.join(', ');
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return 'General Medicine';
  }
  const names = items
    .map(i => i?.brandName || i?.medicationName || i?.genericName || '')
    .filter(Boolean);
  
  if (names.length === 0) return 'General Medicine';
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
}

// Individual Safe Card Component
interface SaleCardProps {
  invoice: PointOfSaleTransaction;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onReprint: (tx: PointOfSaleTransaction) => void;
  onSendWhatsApp: (tx: PointOfSaleTransaction) => void;
  onDownloadPdf: (tx: PointOfSaleTransaction) => void;
  onInitiateReturn: (tx: PointOfSaleTransaction) => void;
}

const SaleCard: React.FC<SaleCardProps> = ({
  invoice,
  isExpanded,
  onToggleExpand,
  onReprint,
  onSendWhatsApp,
  onDownloadPdf,
  onInitiateReturn
}) => {
  // Defensive property extraction
  const invoiceId = invoice?.invoiceNumber || invoice?.receiptNumber || `#INV-${invoice?.id?.substring(0, 6) || '1001'}`;
  const customerName = invoice?.customerName || invoice?.patientName || 'Walk-in Customer';
  const customerPhone = invoice?.customerPhone || invoice?.contactNumber || invoice?.patientPhone || 'N/A';
  const doctorName = invoice?.doctorName || invoice?.prescriberName || 'Self / Direct Counter';
  const rawItems = invoice?.items || [];
  const itemCount = Array.isArray(rawItems) ? rawItems.length : 0;
  const itemsPreview = getItemSummaryPreview(rawItems, invoice?.itemsSummary);
  
  const grandTotal = Number(invoice?.grandTotal ?? 0);
  const gstTotal = Number(invoice?.gstTotal ?? invoice?.taxTotal ?? invoice?.tax ?? 0);
  const subtotal = Number(invoice?.subtotal ?? grandTotal);
  
  const { dateStr, timeStr } = formatInvoiceDateTime(invoice?.timestamp || (invoice as any)?.createdAt);
  const paymentTag = getPaymentModeTag(invoice?.paymentMode || invoice?.paymentMethod);

  return (
    <div 
      id={`invoice-card-${invoice?.id || 'row'}`}
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-all"
    >
      <div className="p-4 sm:p-5 flex flex-col gap-3">
        
        {/* Top Row: Invoice ID, Timestamp, Payment Tag */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white font-mono tracking-tight">
              {invoiceId}
            </span>
            
            {/* Timestamp Badge */}
            <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-slate-100 dark:bg-slate-900/70 px-2.5 py-0.5 rounded-lg">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{dateStr} • {timeStr}</span>
            </span>

            {/* Payment Tag */}
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border flex items-center gap-1 ${
              paymentTag.type === 'cash'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : paymentTag.type === 'upi'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                : paymentTag.type === 'khata'
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                : 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800'
            }`}>
              {paymentTag.type === 'cash' && <Banknote className="w-3 h-3" />}
              {paymentTag.type === 'upi' && <QrCode className="w-3 h-3" />}
              {paymentTag.type === 'khata' && <BookOpen className="w-3 h-3" />}
              {paymentTag.type === 'card' && <CreditCard className="w-3 h-3" />}
              <span>{paymentTag.label}</span>
            </span>
          </div>

          {/* Expand Details Trigger */}
          <button
            onClick={onToggleExpand}
            className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>{isExpanded ? 'Hide Details' : 'View Items'}</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {/* Middle Row: Customer Name & Phone, Item Count & Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300 pt-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              {customerName}
            </span>

            {customerPhone !== 'N/A' && (
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono text-[11px]">
                <Phone className="w-3 h-3 text-slate-400" />
                {customerPhone}
              </span>
            )}

            {doctorName && doctorName !== 'Self / Direct Counter' && (
              <span className="text-slate-400 flex items-center gap-1 text-[11px] hidden md:flex">
                <Stethoscope className="w-3 h-3 text-slate-400" />
                {doctorName}
              </span>
            )}
          </div>

          {/* Item count summary preview */}
          <div className="text-slate-500 dark:text-slate-400 text-xs truncate max-w-md">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
            <span className="mx-1.5">•</span>
            <span className="italic">{itemsPreview}</span>
          </div>
        </div>

        {/* Bottom Row: Grand Total & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 mt-1">
          
          {/* Grand Total in bold emerald */}
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
              ₹{grandTotal.toFixed(2)}
            </div>
            {gstTotal > 0 && (
              <div className="text-[10px] text-slate-400">
                Includes GST: ₹{gstTotal.toFixed(2)}
              </div>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* 📄 Download PDF */}
            <button
              onClick={() => onDownloadPdf(invoice)}
              title="Download Standard Pharmacy Tax Invoice PDF"
              className="h-9 px-3.5 rounded-xl bg-teal-50 hover:bg-teal-100 active:scale-98 text-teal-800 dark:bg-teal-950/60 dark:hover:bg-teal-900/80 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <FileDown className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>📄 Download PDF</span>
            </button>

            {/* 💬 WhatsApp Resend */}
            <button
              onClick={() => onSendWhatsApp(invoice)}
              title="Resend Itemized Digital WhatsApp Receipt"
              className="h-9 px-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:scale-98 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>💬 WhatsApp</span>
            </button>

            {/* 🖨️ Reprint */}
            <button
              onClick={() => onReprint(invoice)}
              title="Reprint Thermal Receipt"
              className="h-9 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-98 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>🖨️ Reprint</span>
            </button>

            {/* 🔄 Return / Refund */}
            <button
              onClick={() => onInitiateReturn(invoice)}
              title="Return or Exchange Medicines from this Bill"
              className="h-9 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-98 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>🔄 Return / Refund</span>
            </button>

          </div>

        </div>

      </div>

      {/* Expanded Itemized Breakdown Table */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-3 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-200/80 dark:border-slate-700/80 animate-in fade-in duration-150">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-teal-600" />
              <span>Itemized Bill Details</span>
            </div>
            <button
              onClick={() => onDownloadPdf(invoice)}
              className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <FileDown className="w-3 h-3" />
              <span>Get Full A4 Tax Invoice (PDF)</span>
            </button>
          </div>

          {itemCount === 0 ? (
            <p className="text-xs text-slate-400 py-2">No individual line items recorded for this invoice.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 text-[10px] uppercase font-semibold">
                    <th className="pb-1.5 font-medium">Medicine & Salt</th>
                    <th className="pb-1.5 font-medium">Batch</th>
                    <th className="pb-1.5 font-medium">Rack</th>
                    <th className="pb-1.5 font-medium text-center">Qty</th>
                    <th className="pb-1.5 font-medium text-right">Unit Price</th>
                    <th className="pb-1.5 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rawItems.map((item, idx) => {
                    const brand = item?.brandName || item?.medicationName || item?.genericName || 'Medicine Item';
                    const salt = item?.saltComposition || item?.genericSalt || item?.genericName || '';
                    const batch = item?.batchNumber || 'N/A';
                    const rack = item?.rackLocation || 'Rack A';
                    const qty = Number(item?.quantity || 1);
                    const unitPrice = Number(item?.unitPrice || item?.sellingPrice || item?.mrp || 0);
                    const lineTotal = Number(item?.totalPrice || item?.totalAmount || (unitPrice * qty));

                    return (
                      <tr key={item?.id || idx} className="text-slate-700 dark:text-slate-300">
                        <td className="py-2 pr-2">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {brand}
                          </div>
                          {salt && (
                            <div className="text-[10px] text-slate-400 truncate max-w-xs">
                              {salt}
                            </div>
                          )}
                        </td>
                        <td className="py-2 pr-2 font-mono text-[11px] text-slate-500">
                          {batch}
                        </td>
                        <td className="py-2 pr-2">
                          <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono text-slate-700 dark:text-slate-300">
                            {rack}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-slate-900 dark:text-white">
                          {qty}
                        </td>
                        <td className="py-2 pl-2 text-right">
                          ₹{unitPrice.toFixed(2)}
                        </td>
                        <td className="py-2 pl-2 text-right font-semibold text-slate-900 dark:text-white">
                          ₹{lineTotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="text-slate-500">
              Doctor Ref: <span className="font-semibold text-slate-800 dark:text-slate-200">{doctorName}</span>
              {invoice?.chronicRefillDate && (
                <span className="ml-3 text-teal-600 dark:text-teal-400 font-medium">
                  • Next Refill Due: {invoice.chronicRefillDate}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-right text-xs">
              <span>Subtotal: <strong>₹{subtotal.toFixed(2)}</strong></span>
              <span>GST: <strong>₹{gstTotal.toFixed(2)}</strong></span>
              <span>Grand Total: <strong className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">₹{grandTotal.toFixed(2)}</strong></span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Main Sales View Component
export const SalesHistoryView: React.FC = () => {
  const { 
    transactions, 
    invoices,
    salesReturns,
    formatWhatsAppCreditNote,
    shopSettings, 
    formatWhatsAppInvoice, 
    setActiveTab,
    addToast,
    currentPharmacist 
  } = usePharmacy();

  const [activeViewTab, setActiveViewTab] = useState<'invoices' | 'returns'>('invoices');
  const [isReturnModalOpen, setIsReturnModalOpen] = useState<boolean>(false);
  const [returnModalInvoiceId, setReturnModalInvoiceId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<string>('all');
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [printModalTx, setPrintModalTx] = useState<PointOfSaleTransaction | null>(null);
  const [thermalPaperWidth, setThermalPaperWidth] = useState<'80mm' | '58mm'>('80mm');

  // Safe fallback defaults for sales data (Requirement 1)
  const safeInvoices: PointOfSaleTransaction[] = useMemo(() => {
    const rawList = invoices || transactions || [];
    if (!Array.isArray(rawList)) return [];
    return rawList.filter(Boolean);
  }, [invoices, transactions]);

  // Defensive Filter Transactions
  const filteredTransactions = useMemo(() => {
    return safeInvoices.filter(tx => {
      if (!tx) return false;
      const q = (searchTerm || '').toLowerCase().trim();
      
      const invNo = (tx.invoiceNumber || tx.receiptNumber || tx.id || '').toLowerCase();
      const cust = (tx.customerName || tx.patientName || '').toLowerCase();
      const phone = (tx.customerPhone || tx.contactNumber || tx.patientPhone || '');
      const doc = (tx.doctorName || tx.prescriberName || '').toLowerCase();
      const itemsList = tx.items || [];
      const matchMedicine = Array.isArray(itemsList) && itemsList.some(it => 
        (it?.brandName || it?.medicationName || it?.genericName || it?.saltComposition || '').toLowerCase().includes(q)
      );

      const matchSearch = !q || invNo.includes(q) || cust.includes(q) || phone.includes(q) || doc.includes(q) || matchMedicine;

      const pMode = tx.paymentMode || tx.paymentMethod || 'Cash';
      let matchPayment = true;
      if (selectedPaymentFilter !== 'all') {
        if (selectedPaymentFilter === 'Cash') {
          matchPayment = pMode.toLowerCase().includes('cash');
        } else if (selectedPaymentFilter === 'UPI') {
          matchPayment = pMode.toLowerCase().includes('upi') || pMode.toLowerCase().includes('qr');
        } else if (selectedPaymentFilter === 'Khata') {
          matchPayment = pMode.toLowerCase().includes('khata') || pMode.toLowerCase().includes('udhaar') || pMode.toLowerCase().includes('credit');
        } else {
          matchPayment = pMode === selectedPaymentFilter;
        }
      }

      return matchSearch && matchPayment;
    });
  }, [safeInvoices, searchTerm, selectedPaymentFilter]);

  // Aggregate Metrics for Today / Total
  const metrics = useMemo(() => {
    const totalSales = safeInvoices.reduce((sum, tx) => sum + Number(tx?.grandTotal || 0), 0);
    const totalGst = safeInvoices.reduce((sum, tx) => sum + Number(tx?.gstTotal || tx?.taxTotal || tx?.tax || 0), 0);
    const totalBills = safeInvoices.length;

    const cashSales = safeInvoices
      .filter(t => {
        const m = (t?.paymentMode || t?.paymentMethod || '').toLowerCase();
        return m.includes('cash');
      })
      .reduce((sum, t) => sum + Number(t?.grandTotal || 0), 0);

    const upiSales = safeInvoices
      .filter(t => {
        const m = (t?.paymentMode || t?.paymentMethod || '').toLowerCase();
        return m.includes('upi') || m.includes('qr') || m.includes('card');
      })
      .reduce((sum, t) => sum + Number(t?.grandTotal || 0), 0);

    const khataSales = safeInvoices
      .filter(t => {
        const m = (t?.paymentMode || t?.paymentMethod || '').toLowerCase();
        return m.includes('khata') || m.includes('udhaar') || m.includes('credit');
      })
      .reduce((sum, t) => sum + Number(t?.grandTotal || 0), 0);

    return {
      totalSales: Math.round(totalSales),
      totalGst: Math.round(totalGst),
      totalBills,
      cashSales: Math.round(cashSales),
      upiSales: Math.round(upiSales),
      khataSales: Math.round(khataSales)
    };
  }, [safeInvoices]);

  // Download Standard Pharmacy Tax Invoice PDF
  const handleDownloadPdf = (tx: PointOfSaleTransaction) => {
    if (!tx) return;
    try {
      generateInvoicePdf({
        transaction: tx,
        shopSettings,
        cashierName: currentPharmacist ? currentPharmacist.split(',')[0] : 'Pharmacist On Duty'
      });
      const invNo = tx.invoiceNumber || tx.receiptNumber || `#INV-${tx.id?.substring(0, 6) || '1001'}`;
      addToast({
        type: 'success',
        title: 'Tax Invoice PDF Downloaded',
        message: `Standard Pharmacy Tax Invoice ${invNo} downloaded successfully.`
      });
    } catch (err) {
      console.error('Failed to generate invoice PDF:', err);
      addToast({
        type: 'error',
        title: 'PDF Generation Error',
        message: 'Could not generate the PDF tax invoice. Please try again.'
      });
    }
  };

  // Direct WhatsApp bill dispatcher with formatted message
  const handleSendWhatsAppBill = (tx: PointOfSaleTransaction) => {
    if (!tx) return;
    try {
      const phone = tx.customerPhone || tx.contactNumber || tx.patientPhone;
      const { waUrl, text } = formatWhatsAppInvoice(tx, phone);
      if (phone && phone.replace(/[^0-9]/g, '').length >= 10) {
        window.open(waUrl, '_blank', 'noopener,noreferrer');
        addToast({
          type: 'success',
          title: 'WhatsApp Invoice Dispatched',
          message: `Direct invoice chat opened for ${tx.customerName || tx.patientName || 'Customer'}`
        });
      } else {
        // Fallback: Copy invoice text to clipboard and offer generic waUrl
        navigator.clipboard.writeText(text);
        if (waUrl) {
          window.open(waUrl, '_blank', 'noopener,noreferrer');
        }
        addToast({
          type: 'info',
          title: 'Invoice Text Copied',
          message: 'Itemized invoice text copied to clipboard since no 10-digit mobile number was stored.'
        });
      }
    } catch (err) {
      console.error('Error opening WhatsApp invoice:', err);
      addToast({
        type: 'error',
        title: 'WhatsApp Dispatch Issue',
        message: 'Could not construct WhatsApp message template.'
      });
    }
  };

  return (
    <SalesLocalErrorBoundary fallbackMessage="Unable to render sales transactions. Please try reloading or check store connection.">
      <div id="sales-history-view" className="space-y-5 pb-20 lg:pb-8">
        
        {/* Header & Quick Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <History className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              Sales History &amp; Invoices
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Daily counter sales ledger, customer sales returns, thermal receipt reprint, and 1-click WhatsApp bills.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              id="sales-view-reports-btn"
              onClick={() => setActiveTab('reports')}
              className="h-11 px-4 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/80 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
              title="Open Recharts Profit Margins, Monthly Sales & Stock Decision Intelligence"
            >
              <BarChart3 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Reports &amp; Stock Intelligence</span>
            </button>

            <button
              id="sales-view-return-btn"
              onClick={() => {
                setReturnModalInvoiceId(null);
                setIsReturnModalOpen(true);
              }}
              className="h-11 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Sales Return / Refund</span>
            </button>

            <button
              id="sales-view-new-bill-btn"
              onClick={() => setActiveTab('pos')}
              className="h-11 px-5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-98 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <Receipt className="w-4 h-4" />
              <span>+ New Counter Bill</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs: Invoices Ledger vs Credit Notes */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => setActiveViewTab('invoices')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeViewTab === 'invoices'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Sales Invoices ({safeInvoices.length})</span>
          </button>

          <button
            onClick={() => setActiveViewTab('returns')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeViewTab === 'returns'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Credit Notes &amp; Returns ({salesReturns.length})</span>
          </button>
        </div>

        {activeViewTab === 'returns' ? (
          /* CREDIT NOTES & SALES RETURNS LEDGER */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Customer Returns &amp; Restocked Medicines
              </h3>
              <button
                onClick={() => {
                  setReturnModalInvoiceId(null);
                  setIsReturnModalOpen(true);
                }}
                className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Process Return by Bill #</span>
              </button>
            </div>

            {salesReturns.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 p-8 sm:p-12 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">
                  No medicine returns recorded yet.
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  When customers return sealed strips or doctor-changed medicines, returned stock and credit notes will appear here.
                </p>
                <button
                  onClick={() => setIsReturnModalOpen(true)}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Start a Sales Return</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {salesReturns.map((ret: SalesReturnRecord) => (
                  <div
                    key={ret.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 shadow-xs flex flex-col gap-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800">
                          {ret.creditNoteNumber}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          Ref: #{ret.originalInvoiceNumber}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          • {ret.timestamp}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2.5 py-0.5 rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 font-semibold border border-teal-200 dark:border-teal-800">
                          {ret.refundMethod}
                        </span>
                        <span className="font-mono font-black text-base text-rose-600 dark:text-rose-400">
                          -₹{ret.totalRefundAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-4">
                      <span>Customer: <strong>{ret.customerName}</strong> ({ret.customerPhone || 'N/A'})</span>
                      {ret.notes && <span className="text-slate-400 italic">Notes: "{ret.notes}"</span>}
                    </div>

                    {/* Returned items */}
                    <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3 divide-y divide-slate-200/80 dark:divide-slate-800 text-xs">
                      {ret.items.map((it, i) => (
                        <div key={i} className="py-1.5 flex justify-between items-center first:pt-0 last:pb-0">
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{it.brandName}</span>
                            <span className="text-slate-400 font-mono text-[11px] ml-2">
                              Batch: {it.batchNumber} • Reason: {it.reason}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                              {it.returnQuantity} units returned @ ₹{it.unitPrice.toFixed(2)}
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 text-[10px] block">
                              ✓ Restocked into inventory
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <a
                        href={formatWhatsAppCreditNote(ret).waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800"
                      >
                        <Send className="w-3 h-3" />
                        <span>Send WhatsApp Credit Note</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Summary KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          <div className="bg-white dark:bg-slate-800 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Total Sales</span>
            <div className="text-xl sm:text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1">
              ₹{metrics.totalSales.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">{metrics.totalBills} Invoices issued</span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Cash Counter</span>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              ₹{metrics.cashSales.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 block">Physical Drawer</span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">UPI & Card</span>
            <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              ₹{metrics.upiSales.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5 block">Bank Settlement</span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Khata (Credit)</span>
            <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              ₹{metrics.khataSales.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 block">Due Ledger Balance</span>
          </div>

        </div>

        {/* Daily Revenue Trends Line Chart (Recharts) */}
        <DailyRevenueLineChart invoices={safeInvoices} />

        {/* Filter & Search Toolbar */}
        <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
          
          {/* Search input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="sales-history-search-input"
              type="text"
              placeholder="Search by Bill #, Customer Name, Mobile, or Medicine..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Payment mode filter tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Modes' },
              { id: 'Cash', label: 'Cash' },
              { id: 'UPI', label: 'UPI' },
              { id: 'Khata', label: 'Khata' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedPaymentFilter(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer min-h-[38px] ${
                  selectedPaymentFilter === tab.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>

        {/* Transactions List */}
        <div className="space-y-3">
          {safeInvoices.length === 0 ? (
            /* Requirement 1 Empty State: Exact user-specified text */
            <div className="bg-white dark:bg-slate-800 p-8 sm:p-12 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto mb-3">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">
                No sales recorded yet. Completed bills will appear here.
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Start billing items from the POS Counter to automatically generate invoices and record GST logs.
              </p>
              <button
                onClick={() => setActiveTab('pos')}
                className="mt-4 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Go to POS Counter</span>
              </button>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
              <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm">No Invoices Match Your Search</h3>
              <p className="text-xs text-slate-400 mt-1">Try clearing filters or search by a different bill number or medicine name.</p>
              <button
                onClick={() => { setSearchTerm(''); setSelectedPaymentFilter('all'); }}
                className="mt-3 text-xs text-teal-600 dark:text-teal-400 font-semibold hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            filteredTransactions.map((tx, idx) => (
              <SaleCard
                key={tx?.id || `tx-${idx}`}
                invoice={tx}
                isExpanded={expandedTxId === (tx?.id || `tx-${idx}`)}
                onToggleExpand={() => setExpandedTxId(expandedTxId === (tx?.id || `tx-${idx}`) ? null : (tx?.id || `tx-${idx}`))}
                onReprint={(targetTx) => setPrintModalTx(targetTx)}
                onSendWhatsApp={(targetTx) => handleSendWhatsAppBill(targetTx)}
                onDownloadPdf={(targetTx) => handleDownloadPdf(targetTx)}
                onInitiateReturn={(targetTx) => {
                  setReturnModalInvoiceId(targetTx.id || targetTx.invoiceNumber || null);
                  setIsReturnModalOpen(true);
                }}
              />
            ))
          )}
        </div>
        </>
        )}

        {/* Sales Return / Refund Modal */}
        <SalesReturnModal
          isOpen={isReturnModalOpen}
          onClose={() => {
            setIsReturnModalOpen(false);
            setReturnModalInvoiceId(null);
          }}
          preselectedInvoiceId={returnModalInvoiceId}
        />

        {/* Thermal Receipt Print Modal (80mm & 58mm) */}
        <ThermalReceiptModal
          isOpen={Boolean(printModalTx)}
          onClose={() => setPrintModalTx(null)}
          transaction={printModalTx}
          defaultPaperWidth={thermalPaperWidth}
        />

      </div>
    </SalesLocalErrorBoundary>
  );
};

// Aliases for comprehensive compatibility
export const SalesHistory = SalesHistoryView;
export const SalesView = SalesHistoryView;
export default SalesHistoryView;
