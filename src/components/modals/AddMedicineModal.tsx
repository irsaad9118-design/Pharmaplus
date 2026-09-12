import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { findExistingInventoryMatch } from '../../utils/inventoryDeduplication';
import { 
  X, 
  Plus, 
  MapPin, 
  DollarSign, 
  Boxes, 
  Layers, 
  Calendar, 
  CheckCircle2, 
  Pill, 
  ShieldCheck,
  Tag,
  Percent,
  Gift,
  Sparkles
} from 'lucide-react';
import { DosageForm, ScheduleClass, MedicineOfferType } from '../../types/pharmacy';

interface AddMedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBrandName?: string;
  onSuccess?: (newMedicineId: string) => void;
}

export const AddMedicineModal: React.FC<AddMedicineModalProps> = ({
  isOpen,
  onClose,
  initialBrandName = '',
  onSuccess
}) => {
  const { inventory, addInventoryItem, addToast } = usePharmacy();

  // Form State
  const [brandName, setBrandName] = useState(initialBrandName);
  const [saltComposition, setSaltComposition] = useState('');
  const [strength, setStrength] = useState('500 mg');
  const [dosageForm, setDosageForm] = useState<DosageForm>('Tablet');
  const [category, setCategory] = useState('General');
  const [scheduleClass, setScheduleClass] = useState<ScheduleClass>('Rx');

  const existingMatch = useMemo(() => {
    if (!brandName.trim()) return null;
    return findExistingInventoryMatch(inventory, { brandName, saltComposition });
  }, [inventory, brandName, saltComposition]);
  
  // Batch & Expiry
  const [batchNumber, setBatchNumber] = useState(
    'BT-' + Math.floor(1000 + Math.random() * 9000)
  );
  const [expiryMonth, setExpiryMonth] = useState('12');
  const [expiryYear, setExpiryYear] = useState('2028');

  // Pricing & Stock
  const [mrp, setMrp] = useState<number | ''>(45);
  const [purchasePtr, setPurchasePtr] = useState<number | ''>(28);
  const [stockQuantity, setStockQuantity] = useState<number | ''>(100);
  const [packSize, setPackSize] = useState<number>(10);
  const [unit, setUnit] = useState('Strips (10 tabs)');
  const [gstRate, setGstRate] = useState<number>(12);

  // Physical Location
  const [rackNumber, setRackNumber] = useState('Rack A-1');
  const [shelfRow, setShelfRow] = useState('Shelf 2');
  const [boxBin, setBoxBin] = useState('Bin 01');

  // Supplier
  const [supplierName, setSupplierName] = useState('Primary Distributor');

  // Medicine Offers & Schemes State
  const [offerType, setOfferType] = useState<MedicineOfferType>('none');
  const [offerLabel, setOfferLabel] = useState('');
  const [offerValue, setOfferValue] = useState<number | ''>(10);
  const [schemeBuyQty, setSchemeBuyQty] = useState<number | ''>(10);
  const [schemeFreeQty, setSchemeFreeQty] = useState<number | ''>(1);

  if (!isOpen) return null;

  const mrpNum = Number(mrp) || 0;
  const ptrNum = Number(purchasePtr) || Number((mrpNum * 0.65).toFixed(2));
  const stockNum = Number(stockQuantity) || 0;
  const offerValNum = Number(offerValue) || 0;
  const schemeBuyNum = Number(schemeBuyQty) || 10;
  const schemeFreeNum = Number(schemeFreeQty) || 1;

  // Calculated offer price
  let effectiveOfferPrice = mrpNum;
  let offerSavingsPerUnit = 0;
  if (offerType === 'percentage' && offerValNum > 0) {
    offerSavingsPerUnit = (mrpNum * offerValNum) / 100;
    effectiveOfferPrice = Math.max(0, mrpNum - offerSavingsPerUnit);
  } else if (offerType === 'flat' && offerValNum > 0) {
    offerSavingsPerUnit = Math.min(mrpNum, offerValNum);
    effectiveOfferPrice = Math.max(0, mrpNum - offerSavingsPerUnit);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!brandName.trim()) {
      addToast({
        type: 'warning',
        title: 'Brand Name Required',
        message: 'Please enter the medicine brand name.'
      });
      return;
    }

    if (!batchNumber.trim()) {
      addToast({
        type: 'warning',
        title: 'Batch Number Required',
        message: 'Please provide or generate a batch number.'
      });
      return;
    }

    const cleanExpiry = `${expiryYear}-${expiryMonth.padStart(2, '0')}-28`;
    const locationShelf = `${rackNumber} • ${shelfRow}${boxBin ? ` • ${boxBin}` : ''}`;

    // Auto-generate offer label if blank
    let computedLabel = offerLabel.trim();
    if (!computedLabel && offerType !== 'none') {
      if (offerType === 'percentage') computedLabel = `${offerValNum}% OFF`;
      else if (offerType === 'flat') computedLabel = `₹${offerValNum} OFF`;
      else if (offerType === 'scheme') computedLabel = `Buy ${schemeBuyNum} + ${schemeFreeNum} Free`;
    }

    const newMed = addInventoryItem({
      brandName: brandName.trim(),
      genericName: saltComposition.trim() || brandName.trim(),
      saltComposition: saltComposition.trim() || brandName.trim(),
      strength: strength.trim(),
      dosageForm,
      category,
      scheduleClass,
      batchNumber: batchNumber.trim().toUpperCase(),
      mfgDate: '2025-01-01',
      expirationDate: cleanExpiry,
      mrp: mrpNum,
      purchaseRate: ptrNum,
      costPrice: ptrNum,
      sellingPrice: offerType !== 'none' && effectiveOfferPrice > 0 ? effectiveOfferPrice : mrpNum,
      stockQuantity: stockNum,
      unit,
      packSize,
      gstRate,
      hsnCode: '300490',
      supplierName: supplierName.trim(),
      rackNumber,
      shelfRow,
      boxBin,
      locationShelf,
      minAlertLevel: 15,
      reorderLevel: 15,
      quarantined: false,
      offerType: offerType !== 'none' ? offerType : undefined,
      offerLabel: offerType !== 'none' ? computedLabel : undefined,
      offerValue: offerType === 'percentage' || offerType === 'flat' ? offerValNum : undefined,
      schemeBuyQty: offerType === 'scheme' ? schemeBuyNum : undefined,
      schemeFreeQty: offerType === 'scheme' ? schemeFreeNum : undefined
    });

    addToast({
      type: 'success',
      title: 'Medicine Saved Successfully!',
      message: `${newMed.brandName} is now active and ready for live search & billing.`
    });

    if (onSuccess) {
      onSuccess(newMed.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-teal-600 to-emerald-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <Pill className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white leading-tight">
                Add New Medicine
              </h3>
              <p className="text-xs text-teal-100 mt-0.5">
                Instant registration to inventory, physical rack coordinates & live POS search
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* Section 1: Brand & Chemical Salt Details */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
            <h4 className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5" />
              1. Brand & Chemical Composition
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Brand Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Brand Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Dolo 650, Augmentin 625 Duo, Pan 40"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />

                {/* Existing medicine match alert */}
                {existingMatch && (
                  <div className="mt-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-900 dark:text-emerald-100 text-xs flex items-start gap-2.5 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Existing medicine detected in inventory!</div>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                        <strong>{existingMatch.brandName}</strong> already exists with <strong>{existingMatch.stockQuantity} {existingMatch.unit}</strong> (Location: {existingMatch.locationShelf || existingMatch.rackNumber}). Submitting will merge <strong>+{stockNum} units</strong> into the master stock and update batch/rate details without creating duplicate rows.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Salt / Generic Composition */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Generic / Salt Composition (For Substitute Finder)
                </label>
                <input
                  type="text"
                  value={saltComposition}
                  onChange={(e) => setSaltComposition(e.target.value)}
                  placeholder="e.g. Paracetamol 650mg, Pantoprazole Sodium 40mg"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Strength */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Strength / Potency
                </label>
                <input
                  type="text"
                  value={strength}
                  onChange={(e) => setStrength(e.target.value)}
                  placeholder="e.g. 500 mg, 10 ml, 20 mcg"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Dosage Form */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Dosage Form
                </label>
                <select
                  value={dosageForm}
                  onChange={(e) => setDosageForm(e.target.value as DosageForm)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Syrup">Syrup</option>
                  <option value="Injection">Injection</option>
                  <option value="Ointment">Ointment / Cream</option>
                  <option value="Eye Drops">Eye / Ear Drops</option>
                  <option value="Inhaler">Inhaler / Respule</option>
                  <option value="Suspension">Suspension</option>
                  <option value="Powder">Powder / Sachet</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Batch, Expiry & Pricing */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
            <h4 className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              2. Batch, Expiry & Pricing Rates
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              
              {/* Batch Number */}
              <div className="col-span-2 sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Batch Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. BTH-8891"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase"
                />
              </div>

              {/* Expiry MM/YY */}
              <div className="col-span-2 sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Expiry (MM / YYYY)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={expiryMonth}
                    onChange={(e) => setExpiryMonth(e.target.value)}
                    className="px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                      <option key={m} value={m}>{m} ({['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m)-1]})</option>
                    ))}
                  </select>
                  <select
                    value={expiryYear}
                    onChange={(e) => setExpiryYear(e.target.value)}
                    className="px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    {[2025, 2026, 2027, 2028, 2029, 2030, 2031].map(y => (
                      <option key={y} value={String(y)}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* MRP (₹) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  MRP (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={mrp}
                    onChange={(e) => setMrp(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="45.00"
                    className="w-full pl-6 pr-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Purchase PTR (₹) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Purchase PTR (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={purchasePtr}
                    onChange={(e) => setPurchasePtr(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="28.00"
                    className="w-full pl-6 pr-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Stock Units */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Stock Units (Qty) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value === '' ? '' : parseInt(e.target.value))}
                  placeholder="100"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* GST Rate */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  GST Rate
                </label>
                <select
                  value={gstRate}
                  onChange={(e) => setGstRate(Number(e.target.value))}
                  className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  <option value={0}>0% (Exempt)</option>
                  <option value={5}>5% (Life Saving)</option>
                  <option value={12}>12% (Standard Rx)</option>
                  <option value={18}>18% (Supplements/OTC)</option>
                </select>
              </div>

            </div>
          </div>

          {/* Section 3: Physical Rack Location Coordinates */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
            <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              3. Physical Shelf & Rack Location Coordinates
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Rack */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Rack / Aisle
                </label>
                <input
                  type="text"
                  value={rackNumber}
                  onChange={(e) => setRackNumber(e.target.value)}
                  placeholder="e.g. Rack A-1, Cold-Storage"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Shelf */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Shelf Row
                </label>
                <input
                  type="text"
                  value={shelfRow}
                  onChange={(e) => setShelfRow(e.target.value)}
                  placeholder="e.g. Shelf 2, Top Drawer"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Bin */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Box / Bin #
                </label>
                <input
                  type="text"
                  value={boxBin}
                  onChange={(e) => setBoxBin(e.target.value)}
                  placeholder="e.g. Bin 04"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
              <MapPin className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Full Tag: <strong>{rackNumber} • {shelfRow} • {boxBin}</strong> (Displayed on billing cards and invoices for instant retrieval)</span>
            </div>
          </div>

          {/* Section 4: Medicine Offers & Promotional Schemes */}
          <div className="space-y-3 bg-gradient-to-br from-rose-50/50 via-amber-50/30 to-purple-50/40 dark:from-slate-800/80 dark:to-slate-800/40 p-4 rounded-2xl border border-rose-200/80 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                4. Medicine Offers & Promotional Schemes (Optional)
              </h4>
              {offerType !== 'none' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-xs animate-pulse">
                  <Sparkles className="w-3 h-3" />
                  Offer Active
                </span>
              )}
            </div>

            {/* Offer Type Selector Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setOfferType('none')}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  offerType === 'none'
                    ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <span>No Offer</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOfferType('percentage');
                  if (!offerLabel) setOfferLabel('Special 10% OFF');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  offerType === 'percentage'
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                    : 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50/50'
                }`}
              >
                <Percent className="w-3.5 h-3.5" />
                <span>% Discount</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOfferType('flat');
                  if (!offerLabel) setOfferLabel('Flat ₹5 OFF');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  offerType === 'flat'
                    ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30'
                    : 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 hover:bg-amber-50/50'
                }`}
              >
                <span>₹ Flat OFF</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOfferType('scheme');
                  if (!offerLabel) setOfferLabel('Buy 10 + 1 Free Scheme');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  offerType === 'scheme'
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                    : 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/50 hover:bg-purple-50/50'
                }`}
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Scheme (Free Qty)</span>
              </button>
            </div>

            {/* Dynamic Offer Parameters */}
            {offerType === 'percentage' && (
              <div className="space-y-3 pt-2 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/40">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Discount Percentage (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={offerValue}
                        onChange={(e) => setOfferValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        placeholder="10"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                    </div>
                    {/* Quick presets */}
                    <div className="flex items-center gap-1.5 mt-2">
                      {[5, 10, 15, 20, 25].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            setOfferValue(pct);
                            setOfferLabel(`Special ${pct}% OFF`);
                          }}
                          className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Offer Label / Badge Text
                    </label>
                    <input
                      type="text"
                      value={offerLabel}
                      onChange={(e) => setOfferLabel(e.target.value)}
                      placeholder="e.g. Special 10% OFF, Monsoon Discount"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                {/* Offer Price Live Preview */}
                {mrpNum > 0 && (
                  <div className="flex items-center justify-between p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/50 text-xs">
                    <span className="text-slate-600 dark:text-slate-300">
                      Original: <s className="text-slate-400">₹{mrpNum.toFixed(2)}</s> ➔ Offer Price: <strong className="text-rose-600 font-bold">₹{effectiveOfferPrice.toFixed(2)}</strong>
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      Saves ₹{offerSavingsPerUnit.toFixed(2)} / unit
                    </span>
                  </div>
                )}
              </div>
            )}

            {offerType === 'flat' && (
              <div className="space-y-3 pt-2 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/40">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Flat Rupee Discount (₹ / unit)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={offerValue}
                        onChange={(e) => setOfferValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        placeholder="5.00"
                        className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    {/* Quick presets */}
                    <div className="flex items-center gap-1.5 mt-2">
                      {[2, 5, 10, 15, 20].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            setOfferValue(val);
                            setOfferLabel(`Flat ₹${val} OFF`);
                          }}
                          className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
                        >
                          ₹{val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Offer Label / Badge Text
                    </label>
                    <input
                      type="text"
                      value={offerLabel}
                      onChange={(e) => setOfferLabel(e.target.value)}
                      placeholder="e.g. Flat ₹5 OFF, Clearance Price"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Offer Price Live Preview */}
                {mrpNum > 0 && (
                  <div className="flex items-center justify-between p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs">
                    <span className="text-slate-600 dark:text-slate-300">
                      Original: <s className="text-slate-400">₹{mrpNum.toFixed(2)}</s> ➔ Offer Price: <strong className="text-amber-700 dark:text-amber-400 font-bold">₹{effectiveOfferPrice.toFixed(2)}</strong>
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      Saves ₹{offerSavingsPerUnit.toFixed(2)} / unit
                    </span>
                  </div>
                )}
              </div>
            )}

            {offerType === 'scheme' && (
              <div className="space-y-3 pt-2 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/40">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Buy Quantity (Units)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={schemeBuyQty}
                      onChange={(e) => setSchemeBuyQty(e.target.value === '' ? '' : parseInt(e.target.value))}
                      placeholder="10"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Get Free (Units)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={schemeFreeQty}
                      onChange={(e) => setSchemeFreeQty(e.target.value === '' ? '' : parseInt(e.target.value))}
                      placeholder="1"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Scheme Badge Label
                    </label>
                    <input
                      type="text"
                      value={offerLabel}
                      onChange={(e) => setOfferLabel(e.target.value)}
                      placeholder="Buy 10 + 1 Free Scheme"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Scheme Presets */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold">Presets:</span>
                  {[
                    { b: 10, f: 1, label: '10 + 1 Free' },
                    { b: 5, f: 1, label: '5 + 1 Free' },
                    { b: 20, f: 2, label: '20 + 2 Free' }
                  ].map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setSchemeBuyQty(preset.b);
                        setSchemeFreeQty(preset.f);
                        setOfferLabel(`Buy ${preset.b} + ${preset.f} Free`);
                      }}
                      className="px-2.5 py-0.5 text-[10px] font-bold rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-900/50 text-xs text-purple-800 dark:text-purple-300 flex items-center justify-between">
                  <span className="font-semibold">
                    🎁 Every <strong>{schemeBuyNum}</strong> units purchased grants <strong>+{schemeFreeNum}</strong> Free Unit(s) in Cart & Bill!
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    Saves ₹{(schemeFreeNum * mrpNum).toFixed(2)} on {schemeBuyNum} units
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-medicine-submit-btn"
              className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-md shadow-teal-600/20 flex items-center gap-2 cursor-pointer active:scale-98 min-h-[44px]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Medicine</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
