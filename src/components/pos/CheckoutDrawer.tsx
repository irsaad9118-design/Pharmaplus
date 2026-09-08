import React, { useState, useMemo, useRef } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  X, 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  User, 
  Phone, 
  Stethoscope, 
  Banknote, 
  QrCode, 
  BookOpen, 
  Printer, 
  Send, 
  CheckCircle2, 
  MapPin,
  Receipt,
  CalendarCheck,
  AlertCircle,
  Tag,
  Gift,
  Sparkles,
  Percent
} from 'lucide-react';
import { PosBillItem, PaymentMode, PointOfSaleTransaction } from '../../types/pharmacy';
import { DrugInteractionChecker } from './DrugInteractionChecker';
import { PosDrugInteractionChecker } from './PosDrugInteractionChecker';

interface CheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: PosBillItem[];
  customerName: string;
  setCustomerName: (name: string) => void;
  contactNumber: string;
  setContactNumber: (phone: string) => void;
  doctorName: string;
  setDoctorName: (doc: string) => void;
  paymentMode: PaymentMode;
  setPaymentMode: (mode: PaymentMode) => void;
  cashTendered: number;
  setCashTendered: (cash: number) => void;
  onUpdateQuantity: (inventoryId: string, qty: number) => void;
  onRemoveItem: (inventoryId: string) => void;
  onClearBill: () => void;
  onCompleteSale: (openReceipt?: boolean) => PointOfSaleTransaction | null;
  onSendWhatsApp: () => void;
  onPrintThermal: () => void;
}

export const CheckoutDrawer: React.FC<CheckoutDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  customerName,
  setCustomerName,
  contactNumber,
  setContactNumber,
  doctorName,
  setDoctorName,
  paymentMode,
  setPaymentMode,
  cashTendered,
  setCashTendered,
  onUpdateQuantity,
  onRemoveItem,
  onClearBill,
  onCompleteSale,
  onSendWhatsApp,
  onPrintThermal
}) => {
  const { 
    shopSettings, 
    addToast, 
    isChronicPatient, 
    setIsChronicPatient, 
    enrollChronicPatient, 
    formatWhatsAppInvoice 
  } = usePharmacy();

  const [phoneError, setPhoneError] = useState<string | null>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Invoice calculations
  const summary = useMemo(() => {
    const subtotal = cartItems.reduce((sum, it) => sum + (it.unitPrice * it.quantity), 0);
    const totalOfferSavings = cartItems.reduce((sum, it) => sum + (it.totalSavings || 0), 0);
    const gst5 = cartItems.filter(i => i.gstRate === 5).reduce((sum, i) => sum + ((i.unitPrice * i.quantity) * 0.05), 0);
    const gst12 = cartItems.filter(i => i.gstRate === 12).reduce((sum, i) => sum + ((i.unitPrice * i.quantity) * 0.12), 0);
    const gst18 = cartItems.filter(i => i.gstRate === 18).reduce((sum, i) => sum + ((i.unitPrice * i.quantity) * 0.18), 0);
    const totalGst = gst5 + gst12 + gst18;

    const rawTotal = subtotal + totalGst;
    const grandTotal = Math.round(rawTotal);
    const roundOff = Number((grandTotal - rawTotal).toFixed(2));

    return {
      subtotal: Number(subtotal.toFixed(2)),
      totalOfferSavings: Number(totalOfferSavings.toFixed(2)),
      totalGst: Number(totalGst.toFixed(2)),
      roundOff,
      grandTotal,
      totalUnits: cartItems.reduce((sum, it) => sum + it.quantity, 0)
    };
  }, [cartItems]);

  const cashChange = useMemo(() => {
    if (paymentMode !== 'Cash' || cashTendered <= 0) return 0;
    return Math.max(0, cashTendered - summary.grandTotal);
  }, [paymentMode, cashTendered, summary.grandTotal]);

  // Direct WhatsApp Bill Sender with Validation
  const handleWhatsAppSendClick = () => {
    if (cartItems.length === 0) {
      addToast({
        type: 'warning',
        title: 'Cart is Empty',
        message: 'Cart is empty. Tap any medicine below to add items before sending bill.'
      });
      return;
    }

    const cleanPhone = contactNumber.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setPhoneError('Please enter WhatsApp mobile number (10 digits)');
      if (phoneInputRef.current) {
        phoneInputRef.current.focus();
      }
      addToast({
        type: 'error',
        title: 'Phone Number Required',
        message: 'Please enter WhatsApp mobile number to dispatch the e-Bill.'
      });
      return;
    }

    setPhoneError(null);

    // Complete sale and generate WhatsApp URL
    const tx = onCompleteSale(false);
    if (tx) {
      // Auto enroll in 30-day chronic cycle if checked
      if (isChronicPatient) {
        try {
          enrollChronicPatient(
            customerName.trim() || 'Walk-in Customer',
            cleanPhone,
            cartItems,
            doctorName.trim() || 'Self / Direct',
            30
          );
        } catch (e) {
          // ignore
        }
      }

      const { waUrl } = formatWhatsAppInvoice(tx, cleanPhone);
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      
      addToast({
        type: 'success',
        title: 'WhatsApp e-Bill Sent',
        message: `e-Bill for Invoice #${tx.invoiceNumber} opened for +91 ${cleanPhone.slice(-10)}.`
      });
    }
  };

  const handleCompleteSaleClick = () => {
    if (cartItems.length === 0) {
      addToast({
        type: 'warning',
        title: 'Cart is Empty',
        message: 'Cart is empty. Tap any medicine below to add items.'
      });
      return;
    }

    const tx = onCompleteSale(true);
    if (tx && isChronicPatient && contactNumber.trim()) {
      try {
        enrollChronicPatient(
          customerName.trim() || 'Walk-in Customer',
          contactNumber.trim(),
          cartItems,
          doctorName.trim() || 'Self / Direct',
          30
        );
      } catch (e) {
        // ignore
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      id="active-cart-checkout-drawer-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center animate-in fade-in"
    >
      
      {/* Click outside to dismiss backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer / Modal Content Container */}
      <div 
        id="checkout-drawer-panel"
        className="relative bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full max-w-xl max-h-[92vh] sm:max-h-[88vh] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-10 animate-in slide-in-from-bottom-6 duration-300"
      >
        
        {/* Top Handle / Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500 text-white flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
                Active Cart / Checkout Drawer
                <span className="px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-700 text-[10px] font-mono">
                  {summary.totalUnits} Units
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {shopSettings?.storeName || shopSettings?.shopName || 'Apex Medicos & Healthcare'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={onClearBill}
                id="drawer-clear-cart-btn"
                className="px-2.5 py-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
              >
                Clear Cart
              </button>
            )}
            <button
              onClick={onClose}
              id="drawer-close-btn"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* SECTION 1: Added Medicines Summary List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-teal-600" />
                Added Medicines ({cartItems.length} Items)
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Subtotal: ₹{summary.subtotal.toFixed(2)}
              </span>
            </div>

            {/* Drug Interaction Realtime Alert */}
            {cartItems.length > 0 && (
              <DrugInteractionChecker
                cartItems={cartItems}
                customerName={customerName}
                onRemoveItem={onRemoveItem}
              />
            )}

            {cartItems.length === 0 ? (
              <div 
                id="drawer-empty-cart-state"
                className="py-10 px-4 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs space-y-2"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Cart is empty. Tap any medicine below to add items.
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Type in the search bar or tap the &ldquo;+ Add Med&rdquo; shortcut to quickly bill or catalog medicines.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {cartItems.map((it) => (
                  <div
                    key={it.inventoryId}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 shadow-2xs hover:border-teal-300 dark:hover:border-teal-700 transition-colors"
                  >
                    {/* Item info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        {it.brandName}
                      </div>
                      
                      {it.saltComposition && (
                        <div className="text-[10px] text-teal-700 dark:text-teal-400 truncate mt-0.5">
                          {it.saltComposition}
                        </div>
                      )}

                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap mt-1">
                        <span className="font-mono bg-slate-200/70 dark:bg-slate-900 px-1.5 py-0.2 rounded font-semibold text-slate-700 dark:text-slate-300">
                          Batch: {it.batchNumber}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold font-mono bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                          <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                          {it.rackLocation}
                        </span>
                      </div>

                      {/* Applied Offer Badge */}
                      {it.offerType && it.offerType !== 'none' && (
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            it.offerType === 'percentage'
                              ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800'
                              : it.offerType === 'flat'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800'
                              : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800'
                          }`}>
                            {it.offerType === 'scheme' ? (
                              <>
                                <Gift className="w-2.5 h-2.5" />
                                <span>Scheme: {it.offerLabel || `Buy ${it.schemeBuyQty} + ${it.schemeFreeQty} Free`}</span>
                                {it.freeQuantity && it.freeQuantity > 0 ? (
                                  <span className="text-purple-900 dark:text-purple-200 font-extrabold ml-1">
                                    (+{it.freeQuantity} Free)
                                  </span>
                                ) : null}
                              </>
                            ) : (
                              <>
                                <Tag className="w-2.5 h-2.5" />
                                <span>Offer: {it.offerLabel || (it.offerType === 'percentage' ? `${it.offerValue}% OFF` : `₹${it.offerValue} OFF`)}</span>
                                {it.totalSavings && it.totalSavings > 0 ? (
                                  <span className="text-emerald-700 dark:text-emerald-300 font-extrabold ml-1">
                                    (Saved ₹{it.totalSavings.toFixed(2)})
                                  </span>
                                ) : null}
                              </>
                            )}
                          </span>
                        </div>
                      )}

                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 flex items-baseline gap-1.5 flex-wrap">
                        {it.mrp && it.mrp > it.unitPrice && (
                          <span className="text-[11px] line-through text-slate-400 font-mono">
                            ₹{it.mrp.toFixed(2)}
                          </span>
                        )}
                        <span>
                          ₹{it.unitPrice.toFixed(2)} × {it.quantity} = <strong className="text-slate-900 dark:text-white font-mono">₹{(it.unitPrice * it.quantity).toFixed(2)}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Stepper + Remove Icon */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(it.inventoryId, it.quantity - 1)}
                        className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-800 dark:text-white font-bold hover:bg-slate-100 dark:hover:bg-slate-600 active:scale-95 cursor-pointer shadow-2xs"
                        title="Decrease Qty"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <span className="w-7 text-center font-black text-xs sm:text-sm text-slate-900 dark:text-white font-mono">
                        {it.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(it.inventoryId, it.quantity + 1)}
                        className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-800 dark:text-white font-bold hover:bg-slate-100 dark:hover:bg-slate-600 active:scale-95 cursor-pointer shadow-2xs"
                        title="Increase Qty"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(it.inventoryId)}
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center cursor-pointer transition-colors ml-1"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: Customer Information Card (Placed Directly ABOVE Payment Mode Selector) */}
          <div 
            id="checkout-customer-information-card"
            className={`p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border transition-all space-y-3 ${
              phoneError 
                ? 'border-rose-400 dark:border-rose-600 ring-2 ring-rose-400/20' 
                : 'border-slate-200 dark:border-slate-700/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-teal-600" />
                Customer Information & WhatsApp Contact
              </span>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
                e-Bill Dispatch
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Customer Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Name
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    id="checkout-customer-name-input"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar / Walk-in"
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* WhatsApp Mobile Number */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>WhatsApp Mobile Number</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">For WhatsApp Bill</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none text-slate-500 dark:text-slate-400 font-mono font-bold text-xs">
                    <Phone className="w-3 h-3 text-emerald-600" />
                    <span>+91</span>
                  </div>
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    id="checkout-whatsapp-mobile-input"
                    maxLength={10}
                    value={contactNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setContactNumber(val);
                      if (phoneError && val.length === 10) {
                        setPhoneError(null);
                      }
                    }}
                    placeholder="9876543210"
                    className={`w-full pl-16 pr-3 py-2 bg-white dark:bg-slate-900 border rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                      phoneError
                        ? 'border-rose-500 focus:ring-rose-500 text-rose-600 dark:text-rose-400'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-teal-500'
                    }`}
                  />
                </div>
                {phoneError && (
                  <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {phoneError}
                  </p>
                )}
              </div>
            </div>

            {/* Doctor Reference */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Doctor Reference (Optional)
              </label>
              <div className="relative">
                <Stethoscope className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  id="checkout-doctor-reference-input"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g. Dr. Verma / Self"
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Quick Toggle Checkbox: Mark as Monthly Chronic Patient */}
            <div className="pt-1">
              <label 
                id="checkout-chronic-patient-toggle-label"
                className="flex items-start gap-2.5 p-2.5 bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl cursor-pointer hover:bg-teal-100/60 dark:hover:bg-teal-900/40 transition-colors"
              >
                <input
                  type="checkbox"
                  id="checkout-chronic-patient-checkbox"
                  checked={isChronicPatient}
                  onChange={(e) => setIsChronicPatient(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-600 cursor-pointer accent-teal-600"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CalendarCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    Mark as Monthly Chronic Patient (30-day refill)
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    Auto-schedules automated 30-day WhatsApp refill reminder alerts in Patient CRM.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* SECTION 3: Payment Mode Selector */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5 text-teal-600" />
              Payment Mode Selector
            </span>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Cash', label: 'Cash', icon: Banknote },
                { id: 'Dynamic UPI QR', label: 'UPI / QR', icon: QrCode },
                { id: 'Khata (Credit Ledger)', label: 'Khata (Udhaar)', icon: BookOpen }
              ].map(mode => {
                const Icon = mode.icon;
                const isSelected = paymentMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPaymentMode(mode.id as PaymentMode)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer min-h-[46px] border ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Cash Tendered & Change Return */}
            {paymentMode === 'Cash' && (
              <div className="pt-2 flex items-center gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                    Cash Tendered (₹)
                  </label>
                  <input
                    type="number"
                    value={cashTendered || ''}
                    onChange={(e) => setCashTendered(Number(e.target.value) || 0)}
                    placeholder={`e.g. ${summary.grandTotal}`}
                    className="w-full px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                {cashTendered > 0 && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-medium">Change Return</span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      ₹{cashChange.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 4: Subtotal, GST & Total Payable Breakdown */}
          <div className="p-3.5 bg-teal-50/40 dark:bg-teal-950/20 rounded-2xl border border-teal-200 dark:border-teal-800/60 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Subtotal (Base Items):</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                ₹{summary.subtotal.toFixed(2)}
              </span>
            </div>

            {summary.totalOfferSavings > 0 && (
              <div className="flex justify-between items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  Offers / Scheme Savings:
                </span>
                <span className="font-black font-mono">
                  -₹{summary.totalOfferSavings.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>GST Total (CGST + SGST):</span>
              <span className="font-mono">₹{summary.totalGst.toFixed(2)}</span>
            </div>
            {summary.roundOff !== 0 && (
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Round-off:</span>
                <span className="font-mono">{summary.roundOff > 0 ? `+₹${summary.roundOff}` : `-₹${Math.abs(summary.roundOff)}`}</span>
              </div>
            )}
            <div className="pt-2 border-t border-teal-200 dark:border-teal-800/60 flex items-center justify-between">
              <span className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                Total Payable (₹):
              </span>
              <span className="font-black text-lg sm:text-xl text-teal-700 dark:text-teal-300 font-mono">
                ₹{summary.grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

        </div>

        {/* Action Buttons (Sticky Footer of Checkout Drawer) */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
          
          <div className="grid grid-cols-2 gap-2">
            
            {/* Button 1: Print Receipt */}
            <button
              type="button"
              id="checkout-print-receipt-btn"
              disabled={cartItems.length === 0}
              onClick={onPrintThermal}
              className="py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[48px] active:scale-98 disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span>🖨️ Print Receipt</span>
            </button>

            {/* Button 2 (Green): Send WhatsApp Bill */}
            <button
              type="button"
              id="checkout-send-whatsapp-btn"
              disabled={cartItems.length === 0}
              onClick={handleWhatsAppSendClick}
              className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer min-h-[48px] active:scale-98"
            >
              <Send className="w-4 h-4" />
              <span>💬 Send WhatsApp Bill</span>
            </button>

          </div>

          {/* Button 3: Complete & Save Invoice */}
          <button
            type="button"
            id="checkout-complete-sale-btn"
            disabled={cartItems.length === 0}
            onClick={handleCompleteSaleClick}
            className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-teal-600/20 cursor-pointer min-h-[46px] active:scale-98"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>✓ Complete & Save Invoice (₹{summary.grandTotal})</span>
          </button>

        </div>

      </div>

    </div>
  );
};
