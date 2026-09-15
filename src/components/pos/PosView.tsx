import React, { useState, useMemo, useRef, useEffect } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  Search, 
  User, 
  ShoppingBag, 
  Trash2, 
  Printer, 
  Plus, 
  Minus, 
  QrCode, 
  Camera,
  MapPin, 
  ArrowRightLeft, 
  Receipt, 
  X, 
  AlertCircle, 
  AlertTriangle,
  Zap,
  Copy, 
  Check, 
  Send, 
  Banknote, 
  BookOpen, 
  CreditCard,
  Phone, 
  Stethoscope,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  ArrowRight,
  Pill,
  Percent,
  Tag,
  Gift,
  Sparkles,
  RotateCcw,
  Mic,
  Layers,
  Maximize2,
  Pencil
} from 'lucide-react';
import { 
  MedicationInventory, 
  InventoryBatch,
  PosBillItem, 
  PointOfSaleTransaction, 
  PaymentMode 
} from '../../types/pharmacy';
import { AddMedicineModal } from '../modals/AddMedicineModal';
import { CheckoutDrawer } from './CheckoutDrawer';
import { ThermalReceiptModal } from './ThermalReceiptModal';
import { BillCompletedModal } from './BillCompletedModal';
import { CameraBarcodeScannerModal } from './CameraBarcodeScannerModal';
import { FullScreenSearchModal } from './FullScreenSearchModal';
import { SalesReturnModal } from '../sales/SalesReturnModal';
import { DrugInteractionChecker } from './DrugInteractionChecker';
import { PosDrugInteractionChecker } from './PosDrugInteractionChecker';
import { SaltSubstituteModal } from './SaltSubstituteModal';
import { EditMedicineModal } from '../inventory/EditMedicineModal';
import { DeleteMedicineConfirmModal } from '../inventory/DeleteMedicineConfirmModal';
import { EditBatchModal } from '../inventory/EditBatchModal';
import { DeleteBatchConfirmModal } from '../inventory/DeleteBatchConfirmModal';
import { generateInvoicePdf } from '../../utils/invoicePdfGenerator';

export const PosView: React.FC = () => {
  const { 
    patients, 
    inventory, 
    shopSettings, 
    completePosTransaction, 
    formatWhatsAppInvoice, 
    findSubstitutes, 
    getDaysUntilExpiry, 
    addToast,
    mobileSearchActive,
    setMobileSearchActive,
    isCartOpen,
    setIsCartOpen,
    isAddMedicineModalOpen,
    setIsAddMedicineModalOpen,
    cartItems,
    setCartItems,
    customerName,
    setCustomerName,
    contactNumber,
    setContactNumber,
    doctorName,
    setDoctorName,
    isChronicPatient,
    setIsChronicPatient,
    updateInventoryItem,
    deleteInventoryItem,
    deleteBatch,
    updateBatch
  } = usePharmacy();

  // Search input ref
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [isFullScreenSearchOpen, setIsFullScreenSearchOpen] = useState<boolean>(false);
  const [autoStartVoice, setAutoStartVoice] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const cashInputRef = useRef<HTMLInputElement>(null);

  const handleClearAndResetSearch = () => {
    setSearchTerm('');
    setIsSearchFocused(false);
    setIsFullScreenSearchOpen(false);
    setAutoStartVoice(false);
    setMobileSearchActive(false);
    searchInputRef.current?.blur();
  };

  // Payment State
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // Modals & Drawers
  const [substituteTargetItem, setSubstituteTargetItem] = useState<MedicationInventory | null>(null);
  const [completedTx, setCompletedTx] = useState<PointOfSaleTransaction | null>(null);
  const [showCompletedModal, setShowCompletedModal] = useState<boolean>(false);
  const [showThermalModal, setShowThermalModal] = useState<boolean>(false);
  const [thermalPaperWidth, setThermalPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false);
  const [copiedWhatsAppText, setCopiedWhatsAppText] = useState<boolean>(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [clinicalOverrideNote, setClinicalOverrideNote] = useState<string>('');

  // Medicine & Batch Edit / Delete Modal State
  const [editingMedicine, setEditingMedicine] = useState<MedicationInventory | null>(null);
  const [deletingMedicine, setDeletingMedicine] = useState<MedicationInventory | null>(null);
  const [editingBatch, setEditingBatch] = useState<{ medicine: MedicationInventory; batch: InventoryBatch } | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<{ medicine: MedicationInventory; batch: InventoryBatch } | null>(null);

  const handleSaveEditedMedicine = (medicineId: string, updates: Partial<MedicationInventory>) => {
    updateInventoryItem(medicineId, updates);
  };

  const handleConfirmDeleteMedicine = (medicineId: string) => {
    handleRemoveItem(medicineId);
    deleteInventoryItem(medicineId, false);
  };

  const handleSaveEditedBatch = (
    medicineId: string,
    batchIdOrNumber: string,
    updatedBatch: { batchNumber: string; expirationDate: string; stockQuantity: number }
  ) => {
    updateBatch(medicineId, batchIdOrNumber, updatedBatch);
  };

  const handleConfirmDeleteBatch = (medicineId: string, batchIdOrNumber: string) => {
    deleteBatch(medicineId, batchIdOrNumber);
  };

  // Auto-focus search on user action or F2
  useEffect(() => {
    // Keep clean on initial mount
  }, []);

  // Reset highlight index when search term changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  // Format Expiry as MM/YY
  const formatExpiryMonthYear = (dateStr: string) => {
    if (!dateStr) return '12/27';
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      const year = parts[0].slice(-2);
      const month = parts[1];
      return `${month}/${year}`;
    }
    return dateStr;
  };

  // Filter medicines by Brand Name, Salt/Generic composition, Batch, or Rack Location
  const searchResults = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    const invList = inventory || [];
    const filtered = invList.filter(item => !item?.quarantined && !item?.isArchived);

    if (!q) return filtered;

    return filtered.filter(item => {
      const matchBrand = (item?.brandName || '').toLowerCase().includes(q);
      const matchSalt = (item?.saltComposition || item?.genericName || '').toLowerCase().includes(q);
      const matchBatch = (item?.batchNumber || '').toLowerCase().includes(q);
      const matchRack = (item?.locationShelf || `${item?.rackNumber || ''} / ${item?.shelfRow || ''}`).toLowerCase().includes(q);
      const matchRackNumber = (item?.rackNumber || '').toLowerCase().includes(q);
      const matchShelfRow = (item?.shelfRow || '').toLowerCase().includes(q);
      const matchCat = (item?.category || '').toLowerCase().includes(q);
      const matchSecondaryBatches = (item?.batches || []).some(b => (b.batchNumber || '').toLowerCase().includes(q));
      return matchBrand || matchSalt || matchBatch || matchRack || matchRackNumber || matchShelfRow || matchCat || matchSecondaryBatches;
    });
  }, [inventory, searchTerm]);

  // Global Keyboard Shortcuts (F2, /, ArrowDown, ArrowUp, Enter, F4, Ctrl+P, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputFocused = activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;

      // 1. F2 or "/" to Focus Search
      if (e.key === 'F2' || (e.key === '/' && !isInputFocused)) {
        e.preventDefault();
        setIsFullScreenSearchOpen(true);
        return;
      }

      // 1.1 F3 or Ctrl+B / Alt+S to Open Camera Barcode / QR Scanner
      if (e.key === 'F3' || ((e.ctrlKey || e.altKey) && (e.key === 'b' || e.key === 'B' || e.key === 's' || e.key === 'S'))) {
        e.preventDefault();
        setIsScannerOpen(prev => !prev);
        return;
      }

      // 2. F4: Focus Payment Mode / Cash Input or Open Checkout Drawer
      if (e.key === 'F4') {
        e.preventDefault();
        if (cartItems.length > 0) {
          if (window.innerWidth < 1024) {
            setIsCartOpen(true);
          } else {
            if (paymentMode === 'Cash' && cashInputRef.current) {
              cashInputRef.current.focus();
              cashInputRef.current.select();
            } else {
              const payBtn = document.getElementById('pos-complete-and-bill-btn');
              payBtn?.focus();
            }
          }
        } else {
          addToast({
            type: 'info',
            title: 'Cart is Empty',
            message: 'Search and add medicines first before checkout.'
          });
        }
        return;
      }

      // 3. Ctrl + P / Cmd + P: Direct 1-tap thermal print & save invoice
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        if (cartItems.length > 0) {
          handlePrintThermalDirect();
        } else {
          addToast({
            type: 'warning',
            title: 'Cart is Empty',
            message: 'Add medicines to bill before printing receipt.'
          });
        }
        return;
      }

      // 4. Escape: Close Modals / Clear Search / Blur Input
      if (e.key === 'Escape') {
        if (isFullScreenSearchOpen) {
          setIsFullScreenSearchOpen(false);
          return;
        }
        if (isScannerOpen) {
          setIsScannerOpen(false);
          return;
        }
        if (substituteTargetItem) {
          setSubstituteTargetItem(null);
          return;
        }
        if (showCompletedModal) {
          setShowCompletedModal(false);
          return;
        }
        if (showThermalModal) {
          setShowThermalModal(false);
          return;
        }
        if (isAddMedicineModalOpen) {
          setIsAddMedicineModalOpen(false);
          return;
        }
        if (isReturnModalOpen) {
          setIsReturnModalOpen(false);
          return;
        }
        if (isCartOpen) {
          setIsCartOpen(false);
          return;
        }
        if (searchTerm || isSearchFocused) {
          handleClearAndResetSearch();
          return;
        }
        if (isInputFocused && activeEl instanceof HTMLElement) {
          activeEl.blur();
        }
        return;
      }

      // 5. ArrowDown / ArrowUp navigation in search results
      if (e.key === 'ArrowDown') {
        if (searchResults.length > 0) {
          e.preventDefault();
          setHighlightedIndex(prev => {
            const next = (prev + 1) % searchResults.length;
            const targetEl = document.getElementById(`med-card-${searchResults[next]?.id}`);
            targetEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            return next;
          });
        }
        return;
      }

      if (e.key === 'ArrowUp') {
        if (searchResults.length > 0) {
          e.preventDefault();
          setHighlightedIndex(prev => {
            const next = (prev - 1 + searchResults.length) % searchResults.length;
            const targetEl = document.getElementById(`med-card-${searchResults[next]?.id}`);
            targetEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            return next;
          });
        }
        return;
      }

      // 6. Enter key to add highlighted item from search
      if (e.key === 'Enter') {
        if (document.activeElement === searchInputRef.current) {
          if (searchResults.length > 0 && highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
            e.preventDefault();
            const targetItem = searchResults[highlightedIndex];
            if (targetItem) {
              handleAddItemToCart(targetItem);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchResults, highlightedIndex, cartItems, substituteTargetItem, showCompletedModal, showThermalModal, isAddMedicineModalOpen, isReturnModalOpen, isCartOpen, searchTerm, paymentMode]);

  // 1-Click Add Item to Active Bill (with Multi-Batch Selection & Offers Engine)
  const handleAddItemToCart = (item: MedicationInventory, selectedBatch?: InventoryBatch) => {
    if (item.quarantined) {
      addToast({
        type: 'error',
        title: 'Quarantined Item',
        message: 'This batch has been quarantined and cannot be billed.'
      });
      return;
    }

    const batchToUse = selectedBatch || (item.batches && item.batches.length > 0 ? item.batches[0] : null);
    const batchNumber = batchToUse ? batchToUse.batchNumber : item.batchNumber;
    const expirationDate = batchToUse ? batchToUse.expirationDate : item.expirationDate;
    const availableStock = batchToUse ? batchToUse.stockQuantity : item.stockQuantity;

    if (availableStock <= 0) {
      addToast({
        type: 'warning',
        title: 'Out of Stock',
        message: `${item.brandName} (Batch: ${batchNumber}) is currently out of stock. Use salt substitute finder.`
      });
      setSubstituteTargetItem(item);
      return;
    }

    const mrp = item.mrp || 10;
    const offerType = item.offerType || item.offer?.type || 'none';
    const offerLabel = item.offerLabel || item.offer?.label || '';
    const offerValue = item.offerValue ?? item.offer?.value ?? 0;
    const schemeBuyQty = item.schemeBuyQty ?? item.offer?.schemeBuyQty ?? 0;
    const schemeFreeQty = item.schemeFreeQty ?? item.offer?.schemeFreeQty ?? 0;

    const computeItemOffer = (qty: number) => {
      let unitPrice = mrp;
      let offerDiscountAmount = 0;
      let freeQuantity = 0;
      let totalSavings = 0;

      if (offerType === 'percentage' && offerValue > 0) {
        const discountPerUnit = Number(((mrp * offerValue) / 100).toFixed(2));
        unitPrice = Math.max(0, mrp - discountPerUnit);
        offerDiscountAmount = Number((discountPerUnit * qty).toFixed(2));
        totalSavings = offerDiscountAmount;
      } else if (offerType === 'flat' && offerValue > 0) {
        const discountPerUnit = Math.min(mrp, offerValue);
        unitPrice = Math.max(0, mrp - discountPerUnit);
        offerDiscountAmount = Number((discountPerUnit * qty).toFixed(2));
        totalSavings = offerDiscountAmount;
      } else if (offerType === 'scheme' && schemeBuyQty > 0) {
        unitPrice = mrp;
        const sets = Math.floor(qty / schemeBuyQty);
        freeQuantity = sets * (schemeFreeQty || 1);
        totalSavings = Number((freeQuantity * mrp).toFixed(2));
      } else {
        unitPrice = item.sellingPrice || mrp;
        totalSavings = mrp > unitPrice ? Number(((mrp - unitPrice) * qty).toFixed(2)) : 0;
      }

      const gstRate = item.gstRate || 12;
      const totalAmount = Number((unitPrice * qty).toFixed(2));
      const gstAmount = Number(((totalAmount * gstRate) / (100 + gstRate)).toFixed(2));

      return {
        unitPrice,
        offerDiscountAmount,
        freeQuantity,
        totalSavings,
        gstRate,
        gstAmount,
        totalPrice: totalAmount,
        totalAmount
      };
    };

    setCartItems(prev => {
      const existingIdx = prev.findIndex(i => i.inventoryId === item.id && i.batchNumber === batchNumber);
      if (existingIdx !== -1) {
        const existing = prev[existingIdx];
        const nextQty = existing.quantity + 1;
        if (nextQty > availableStock) {
          addToast({
            type: 'warning',
            title: 'Stock Limit Reached',
            message: `Only ${availableStock} units available for Batch ${batchNumber}.`
          });
          return prev;
        }
        const calc = computeItemOffer(nextQty);
        const updated = [...prev];
        updated[existingIdx] = {
          ...existing,
          quantity: nextQty,
          unitPrice: calc.unitPrice,
          offerDiscountAmount: calc.offerDiscountAmount,
          freeQuantity: calc.freeQuantity,
          totalSavings: calc.totalSavings,
          gstAmount: calc.gstAmount,
          totalPrice: calc.totalPrice,
          totalAmount: calc.totalAmount
        };
        return updated;
      } else {
        const calc = computeItemOffer(1);
        const newItem: PosBillItem = {
          inventoryId: item.id,
          brandName: item.brandName,
          medicationName: item.brandName,
          saltComposition: item.saltComposition || item.genericName,
          batchNumber: batchNumber,
          expirationDate: expirationDate,
          expiryDate: expirationDate,
          unitPrice: calc.unitPrice,
          mrp: mrp,
          originalPrice: mrp,
          costPrice: item.purchaseRate || item.costPrice || 0,
          purchaseRate: item.purchaseRate || item.costPrice || 0,
          sellingPrice: calc.unitPrice,
          quantity: 1,
          gstRate: calc.gstRate,
          gstAmount: calc.gstAmount,
          totalPrice: calc.totalPrice,
          totalAmount: calc.totalAmount,
          rackLocation: item.locationShelf || `${item.rackNumber} / ${item.shelfRow}`,
          unit: item.unit || 'Strip (10 Tabs)',
          discountPercent: 0,
          offerType: offerType,
          offerLabel: offerLabel,
          offerValue: offerValue,
          schemeBuyQty: schemeBuyQty,
          schemeFreeQty: schemeFreeQty,
          offerDiscountAmount: calc.offerDiscountAmount,
          freeQuantity: calc.freeQuantity,
          totalSavings: calc.totalSavings
        };
        return [newItem, ...prev];
      }
    });

    addToast({
      type: 'success',
      title: 'Added to Bill',
      message: `${item.brandName} (Batch: ${batchNumber}) added (Rack: ${item.locationShelf || item.rackNumber})`
    });
  };

  // Stepper Quantity Handler
  const handleUpdateQuantity = (inventoryId: string, newQty: number, batchNumber?: string) => {
    if (newQty <= 0) {
      handleRemoveItem(inventoryId, batchNumber);
      return;
    }

    const targetInv = inventory.find(i => i.id === inventoryId);
    let maxAllowed = targetInv?.stockQuantity || 999;
    if (targetInv?.batches && batchNumber) {
      const bMatch = targetInv.batches.find(b => b.batchNumber === batchNumber);
      if (bMatch) maxAllowed = bMatch.stockQuantity;
    }

    if (newQty > maxAllowed) {
      addToast({
        type: 'warning',
        title: 'Stock Limit Reached',
        message: `Only ${maxAllowed} units available for batch ${batchNumber || ''}.`
      });
      return;
    }

    setCartItems(prev => prev.map(item => {
      const isMatch = batchNumber
        ? (item.inventoryId === inventoryId && item.batchNumber === batchNumber)
        : (item.inventoryId === inventoryId);
      if (!isMatch) return item;

      const mrp = item.mrp || item.originalPrice || item.unitPrice;
      const offerType = item.offerType || 'none';
      const offerValue = item.offerValue || 0;
      const schemeBuyQty = item.schemeBuyQty || 0;
      const schemeFreeQty = item.schemeFreeQty || 0;

      let unitPrice = mrp;
      let offerDiscountAmount = 0;
      let freeQuantity = 0;
      let totalSavings = 0;

      if (offerType === 'percentage' && offerValue > 0) {
        const discountPerUnit = Number(((mrp * offerValue) / 100).toFixed(2));
        unitPrice = Math.max(0, mrp - discountPerUnit);
        offerDiscountAmount = Number((discountPerUnit * newQty).toFixed(2));
        totalSavings = offerDiscountAmount;
      } else if (offerType === 'flat' && offerValue > 0) {
        const discountPerUnit = Math.min(mrp, offerValue);
        unitPrice = Math.max(0, mrp - discountPerUnit);
        offerDiscountAmount = Number((discountPerUnit * newQty).toFixed(2));
        totalSavings = offerDiscountAmount;
      } else if (offerType === 'scheme' && schemeBuyQty > 0) {
        unitPrice = mrp;
        const sets = Math.floor(newQty / schemeBuyQty);
        freeQuantity = sets * (schemeFreeQty || 1);
        totalSavings = Number((freeQuantity * mrp).toFixed(2));
      } else {
        unitPrice = item.sellingPrice || mrp;
        totalSavings = mrp > unitPrice ? Number(((mrp - unitPrice) * newQty).toFixed(2)) : 0;
      }

      const totalAmount = Number((unitPrice * newQty).toFixed(2));
      const gstAmount = Number(((totalAmount * item.gstRate) / (100 + item.gstRate)).toFixed(2));

      return { 
        ...item, 
        quantity: newQty,
        unitPrice,
        offerDiscountAmount,
        freeQuantity,
        totalSavings,
        gstAmount,
        totalPrice: totalAmount,
        totalAmount
      };
    }));
  };

  // Remove Item
  const handleRemoveItem = (inventoryId: string, batchNumber?: string) => {
    setCartItems(prev => prev.filter(i => {
      if (batchNumber) {
        return !(i.inventoryId === inventoryId && i.batchNumber === batchNumber);
      }
      return i.inventoryId !== inventoryId;
    }));
  };

  // Invoice Financial Calculations (Subtotal, GST 5%/12%/18%, CGST/SGST 50-50 split, Discount, Round-off, Grand Total)
  const invoiceSummary = useMemo(() => {
    const items = cartItems || [];
    const subtotal = items.reduce((sum, it) => sum + ((it?.unitPrice || 0) * (it?.quantity || 0)), 0);
    const totalOfferSavings = items.reduce((sum, it) => sum + (it?.totalSavings || 0), 0);
    
    // Detailed GST Breakdown
    const gst5 = items.filter(i => i?.gstRate === 5).reduce((sum, i) => sum + (((i?.unitPrice || 0) * (i?.quantity || 0)) * 0.05), 0);
    const gst12 = items.filter(i => i?.gstRate === 12).reduce((sum, i) => sum + (((i?.unitPrice || 0) * (i?.quantity || 0)) * 0.12), 0);
    const gst18 = items.filter(i => i?.gstRate === 18).reduce((sum, i) => sum + (((i?.unitPrice || 0) * (i?.quantity || 0)) * 0.18), 0);
    const totalGst = gst5 + gst12 + gst18;
    const cgst = totalGst / 2;
    const sgst = totalGst / 2;

    const discountAmount = subtotal * ((discountPercent || 0) / 100);
    const rawTotal = Math.max(0, subtotal + totalGst - discountAmount);
    const grandTotal = Math.round(rawTotal);
    const roundOff = Number((grandTotal - rawTotal).toFixed(2));

    return {
      subtotal: Number(subtotal.toFixed(2)),
      totalOfferSavings: Number(totalOfferSavings.toFixed(2)),
      gst5: Number(gst5.toFixed(2)),
      gst12: Number(gst12.toFixed(2)),
      gst18: Number(gst18.toFixed(2)),
      totalGst: Number(totalGst.toFixed(2)),
      cgst: Number(cgst.toFixed(2)),
      sgst: Number(sgst.toFixed(2)),
      discountAmount: Number(discountAmount.toFixed(2)),
      roundOff,
      grandTotal,
      totalItemsCount: items.reduce((sum, it) => sum + (it?.quantity || 0), 0)
    };
  }, [cartItems, discountPercent]);

  // Cash Change Calculation
  const cashChange = useMemo(() => {
    if (paymentMode !== 'Cash' || cashTendered <= 0) return 0;
    return Math.max(0, cashTendered - invoiceSummary.grandTotal);
  }, [paymentMode, cashTendered, invoiceSummary.grandTotal]);

  // Generate plain text WhatsApp bill summary
  const generatePlainTextBillSummary = (tx: PointOfSaleTransaction) => {
    return (
      `*${shopSettings.storeName}*\n` +
      `DL: ${shopSettings.drugLicense} | GST: ${shopSettings.gstin}\n` +
      `Ph: ${shopSettings.phone}\n` +
      `-----------------------------\n` +
      `*INVOICE: ${tx.invoiceNumber}*\n` +
      `Date: ${new Date().toLocaleDateString('en-IN')} | Pay: ${tx.paymentMode}\n` +
      `Customer: ${tx.customerName}\n` +
      (tx.doctorName ? `Doctor: ${tx.doctorName}\n` : '') +
      `-----------------------------\n` +
      `*ITEMS PURCHASED:*\n` +
      tx.items.map((it, i) => `${i + 1}. ${it.brandName} x ${it.quantity} = ₹${(it.unitPrice * it.quantity).toFixed(2)} (Batch: ${it.batchNumber})`).join('\n') +
      `\n-----------------------------\n` +
      `Subtotal: ₹${tx.subtotal.toFixed(2)}\n` +
      `GST Tax: ₹${tx.gstTotal.toFixed(2)}\n` +
      (tx.discountAmount > 0 ? `Discount: -₹${tx.discountAmount.toFixed(2)}\n` : '') +
      `*GRAND TOTAL: ₹${tx.grandTotal.toFixed(2)}*\n` +
      `-----------------------------\n` +
      `Thank you for choosing ${shopSettings.storeName}! Keep medicines in a cool & dry place.`
    );
  };

  // Direct WhatsApp Link Opener
  const handleOpenWhatsAppDirect = () => {
    if (cartItems.length === 0) {
      addToast({
        type: 'warning',
        title: 'Empty Bill',
        message: 'Add items to bill before sending WhatsApp.'
      });
      return;
    }

    const tx = handleCheckout(false);
    if (tx) {
      const plainText = generatePlainTextBillSummary(tx);
      const cleanPhone = (tx.contactNumber || contactNumber).replace(/\D/g, '');
      const waUrl = cleanPhone.length >= 10
        ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(plainText)}`
        : `https://wa.me/?text=${encodeURIComponent(plainText)}`;

      window.open(waUrl, '_blank', 'noopener,noreferrer');
      addToast({
        type: 'success',
        title: 'WhatsApp Dispatched',
        message: 'Direct WhatsApp invoice message opened.'
      });
    }
  };

  // Complete POS Transaction & Open Receipt with Auto PDF download
  const handleCheckout = (openReceipt = true): PointOfSaleTransaction | null => {
    if (cartItems.length === 0) {
      addToast({
        type: 'error',
        title: 'Cart is Empty',
        message: 'Please tap or search medicines to add them to the bill.'
      });
      return null;
    }

    const tx = completePosTransaction({
      patientId: 'walkin',
      customerName: customerName.trim() || 'Walk-in Customer',
      contactNumber: contactNumber.trim(),
      doctorName: doctorName.trim() || 'Self / Direct',
      items: cartItems,
      subtotal: invoiceSummary.subtotal,
      gstTotal: invoiceSummary.totalGst,
      discountAmount: invoiceSummary.discountAmount,
      roundOff: invoiceSummary.roundOff,
      grandTotal: invoiceSummary.grandTotal,
      paymentMode: paymentMode,
      cashTendered: paymentMode === 'Cash' ? cashTendered : undefined,
      changeReturned: paymentMode === 'Cash' ? cashChange : undefined,
      pharmacistName: 'Lead Pharmacist',
      notes: clinicalOverrideNote.trim() ? clinicalOverrideNote.trim() : undefined
    });

    // 1. Automatically trigger PDF invoice download
    try {
      generateInvoicePdf({
        transaction: tx,
        shopSettings,
        cashierName: 'Lead Pharmacist'
      });
    } catch (e) {
      console.error('Auto PDF generation error:', e);
    }

    // 2. Open Bill Completed Modal & clear active counter state
    if (openReceipt) {
      setCompletedTx(tx);
      setShowCompletedModal(true);
    }
    setCartItems([]);
    setCashTendered(0);
    setSearchTerm('');
    setIsMobileCartOpen(false);
    setIsCartOpen(false);

    addToast({
      type: 'success',
      title: 'Invoice Generated & Saved 🎉',
      message: `Invoice #${tx.invoiceNumber} for ₹${tx.grandTotal} saved. PDF auto-downloaded.`
    });
    return tx;
  };

  // Print Thermal Directly
  const handlePrintThermalDirect = () => {
    if (cartItems.length === 0) return;
    const tx = handleCheckout(true);
    if (tx) {
      setTimeout(() => {
        window.print();
      }, 350);
    }
  };

  // Reset bill
  const handleClearBill = () => {
    if (cartItems.length === 0) return;
    if (window.confirm('Clear current bill items?')) {
      setCartItems([]);
      setCashTendered(0);
      setDiscountPercent(0);
    }
  };

  return (
    <div id="counter-pos-view" className="space-y-4 pb-20 lg:pb-8">
      
      {/* 2-Pane Split Layout for Desktop (>1024px: 65% Left / 35% Right) */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        
        {/* LEFT PANE (65% on Desktop): Fast Medicine Search and Inventory List */}
        <div className="w-full lg:w-[65%] shrink-0 space-y-3.5">
          
          {/* Sticky-Top Animated Search Bar with Clean Focus Transitions */}
          <div 
            id="pos-sticky-search-container"
            className={`sticky top-0 z-30 transition-all duration-300 ${
              isSearchFocused || searchTerm
                ? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-teal-500/50 dark:border-teal-500/50 shadow-lg shadow-teal-950/10 ring-2 ring-teal-500/20'
                : 'bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs'
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-2.5">
              <form 
                autoComplete="off" 
                onSubmit={(e) => e.preventDefault()} 
                className="relative flex-1 min-w-0"
              >
                <Search className={`w-4 h-4 sm:w-5 sm:h-5 absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
                  isSearchFocused || searchTerm ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'
                }`} />
                <input
                  ref={searchInputRef}
                  id="search_query_no_autofill_med_inventory"
                  name="search_query_no_autofill_med_inventory"
                  type="search"
                  value={searchTerm}
                  onFocus={() => {
                    setIsSearchFocused(true);
                  }}
                  onClick={() => {
                    setIsSearchFocused(true);
                  }}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsSearchFocused(true);
                  }}
                  placeholder="Search medicine, salt, rack (F2 or /)..."
                  className="w-full pl-9 sm:pl-10 pr-20 sm:pr-24 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-900 min-h-[42px] sm:min-h-[46px] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden shadow-2xs cursor-text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck="false"
                  data-lpignore="true"
                  data-form-type="other"
                />
                
                {/* Right inside input actions: F3 Fullscreen, Voice Search, & ✕ Clear Button */}
                <div className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    id="pos-fullscreen-search-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsFullScreenSearchOpen(true);
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-slate-200 dark:border-slate-700 shadow-2xs"
                    title="Open Fullscreen Search Hub (F3)"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline text-[10px] font-mono font-bold">F3</span>
                  </button>

                  <button
                    type="button"
                    id="pos-voice-search-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setAutoStartVoice(true);
                      setIsFullScreenSearchOpen(true);
                    }}
                    className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/80 hover:bg-teal-100 dark:hover:bg-teal-900 text-teal-600 dark:text-teal-400 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-teal-200/80 dark:border-teal-800/80 shadow-2xs"
                    title="Voice Search: Click to speak medicine or salt name"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span className="hidden md:inline text-[11px]">Voice</span>
                  </button>

                  {(searchTerm || isSearchFocused) && (
                    <button
                      type="button"
                      onClick={handleClearAndResetSearch}
                      className="px-1.5 py-1 bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      title="Clear & Exit Search Mode (Esc)"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </form>

              {/* Inline [📷 Scan] Button */}
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                id="pos-scan-barcode-shortcut-btn"
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shrink-0 min-h-[42px] sm:min-h-[46px] cursor-pointer shadow-xs whitespace-nowrap active:scale-98"
                title="Scan Medicine QR / Barcode with Camera (F3)"
              >
                <Camera className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                <span className="hidden xs:inline">Scan</span>
              </button>

              {/* Inline [➕ Add] Button */}
              <button
                type="button"
                onClick={() => setIsAddMedicineModalOpen(true)}
                id="pos-add-medicine-shortcut-btn"
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shrink-0 min-h-[42px] sm:min-h-[46px] cursor-pointer shadow-xs whitespace-nowrap active:scale-98"
                title="Add New Medicine to Inventory"
              >
                <Plus className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                <span className="hidden xs:inline">Add</span>
              </button>
            </div>

            {/* Live Filter Counter & Active Search Dock Banner */}
            <div className="flex items-center justify-between mt-2.5 px-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2 truncate">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {searchTerm ? `Results for "${searchTerm}"` : 'All Inventory Medicines'}
                </span>
                <span className="bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 font-mono font-bold px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800/60 text-[10px]">
                  {searchResults.length} {searchResults.length === 1 ? 'match' : 'matches'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {(isSearchFocused || searchTerm) && (
                  <button
                    type="button"
                    onClick={handleClearAndResetSearch}
                    className="text-[10px] sm:text-[11px] text-teal-600 dark:text-teal-400 hover:underline font-semibold cursor-pointer"
                  >
                    Restore Normal View
                  </button>
                )}
                <span className="text-emerald-600 dark:text-emerald-400 font-bold hidden sm:inline">
                  ⚡ 1-Tap to Add
                </span>
              </div>
            </div>
          </div>

          {/* Search Result Cards List */}
          <div className="space-y-2.5">
            {searchResults.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center shadow-xs">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No Medicine Found</h4>
                <p className="text-xs text-slate-500 mt-1">Check spelling or search by chemical salt name.</p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      searchInputRef.current?.focus();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 transition-colors"
                  >
                    Clear Filter
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddMedicineModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                  >
                    + Add New Medicine
                  </button>
                </div>
              </div>
            ) : (
              searchResults.map((item, index) => {
                const inCart = cartItems.find(c => c.inventoryId === item.id);
                const isOutOfStock = item.stockQuantity <= 0;
                const isLowStock = item.stockQuantity > 0 && item.stockQuantity <= (item.minAlertLevel || 15);
                const expFormatted = formatExpiryMonthYear(item.expirationDate);
                const isHighlighted = highlightedIndex === index;
                const daysLeft = getDaysUntilExpiry(item.expirationDate);

                return (
                  <div
                    key={item.id}
                    id={`med-card-${item.id}`}
                    onClick={() => handleAddItemToCart(item)}
                    className={`bg-white dark:bg-slate-800 p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md active:scale-[0.995] select-none relative ${
                      isHighlighted
                        ? 'border-teal-500 dark:border-teal-400 ring-2 ring-teal-500/30 bg-teal-50/40 dark:bg-teal-950/40'
                        : inCart 
                        ? 'border-teal-500/70 dark:border-teal-500/70 ring-1 ring-teal-500/20 bg-teal-50/20 dark:bg-teal-950/20' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      
                      {/* Medicine Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                            {item.brandName}
                          </h3>
                          {item.strength && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                              {item.strength}
                            </span>
                          )}
                          {item.dosageForm && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold bg-slate-100 dark:bg-slate-900/80 px-1.5 py-0.5 rounded">
                              {item.dosageForm}
                            </span>
                          )}

                          {/* Medicine Header Controls: Edit Medicine (✏️) and Delete Medicine (🗑️) */}
                          <div className="inline-flex items-center gap-0.5 ml-auto sm:ml-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              id={`edit-medicine-header-${item.id}`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditingMedicine(item);
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              title="Edit Medicine (Name, Salt, Rack & Bin, MRP, Unit)"
                              aria-label={`Edit ${item.brandName}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              id={`delete-medicine-header-${item.id}`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDeletingMedicine(item);
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              title="Delete Medicine Card and Batches"
                              aria-label={`Delete ${item.brandName}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {item.offerType && item.offerType !== 'none' && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              item.offerType === 'percentage'
                                ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800'
                                : item.offerType === 'flat'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800'
                                : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800'
                            }`}>
                              {item.offerType === 'percentage' && <Percent className="w-2.5 h-2.5" />}
                              {item.offerType === 'flat' && <Tag className="w-2.5 h-2.5" />}
                              {item.offerType === 'scheme' && <Gift className="w-2.5 h-2.5" />}
                              <span>
                                {item.offerLabel || (
                                  item.offerType === 'percentage'
                                    ? `${item.offerValue}% OFF`
                                    : item.offerType === 'flat'
                                    ? `₹${item.offerValue} OFF`
                                    : `Buy ${item.schemeBuyQty} + ${item.schemeFreeQty} Free`
                                )}
                              </span>
                            </span>
                          )}
                        </div>

                        {/* Salt Composition - Clickable for Instant Salt Substitutes */}
                        <button
                          type="button"
                          title="Click to view salt substitutes"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSubstituteTargetItem(item);
                          }}
                          className="text-xs text-teal-700 dark:text-teal-400 font-semibold mt-1 truncate flex items-center gap-1 hover:underline cursor-pointer text-left w-fit max-w-full group/salt"
                        >
                          <Pill className="w-3 h-3 shrink-0 text-teal-600 dark:text-teal-400 group-hover/salt:rotate-12 transition-transform" />
                          <span className="truncate">{item.saltComposition || item.genericName || 'Standard Formula'}</span>
                          <span className="text-[10px] text-teal-600/70 font-mono">⇄</span>
                        </button>

                        {/* Badges: Physical Rack / Bin Location, Batch No, Expiry (MM/YY), Stock */}
                        <div className="flex items-center gap-2 flex-wrap mt-2.5 text-[11px]">
                          {/* Physical Rack / Bin Location - Prominent Emerald Badge */}
                          <span 
                            className="px-2 py-0.5 rounded-lg font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/80 flex items-center gap-1 shadow-2xs"
                            title={`Medicine Storage Location: ${item.locationShelf || `${item.rackNumber} / ${item.shelfRow}`}`}
                          >
                            <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>{item.locationShelf || `${item.rackNumber || 'Rack A-1'} / ${item.shelfRow || 'Shelf 1'}`}</span>
                          </span>

                          {/* Batch Number */}
                          <span className="font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800 inline-flex items-center gap-1">
                            <span>B: {item.batchNumber}</span>
                            {/* If only 1 batch, provide quick edit/delete right here */}
                            {(!item.batches || item.batches.length <= 1) && (
                              <span className="inline-flex items-center ml-0.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const currentBatch = (item.batches && item.batches[0]) || {
                                      id: 'batch-primary',
                                      batchNumber: item.batchNumber,
                                      expirationDate: item.expirationDate,
                                      stockQuantity: item.stockQuantity
                                    };
                                    setEditingBatch({ medicine: item, batch: currentBatch });
                                  }}
                                  className="p-0.5 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                                  title={`Edit Batch ${item.batchNumber}`}
                                >
                                  <Pencil className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const currentBatch = (item.batches && item.batches[0]) || {
                                      id: 'batch-primary',
                                      batchNumber: item.batchNumber,
                                      expirationDate: item.expirationDate,
                                      stockQuantity: item.stockQuantity
                                    };
                                    setDeletingBatch({ medicine: item, batch: currentBatch });
                                  }}
                                  className="p-0.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                  title={`Delete Batch ${item.batchNumber}`}
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            )}
                          </span>

                          {/* Expiry Badge */}
                          <span className={`font-mono px-2 py-0.5 rounded-md font-bold border ${
                            daysLeft <= 90 
                              ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800' 
                              : daysLeft <= 180
                              ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                              : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'
                          }`}>
                            Exp: {expFormatted}
                          </span>

                          {/* Available Stock Units */}
                          <span className={`font-bold px-2 py-0.5 rounded-md border ${
                            isOutOfStock 
                              ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300' 
                              : isLowStock 
                              ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300' 
                              : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
                          }`}>
                            {isOutOfStock ? '0 (Out of Stock)' : `${item.stockQuantity} in stock`}
                          </span>
                        </div>

                        {/* Inline Batch Selector if multiple batches exist */}
                        {item.batches && item.batches.length > 1 && (
                          <div 
                            className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 flex-wrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                              <Layers className="w-3 h-3 text-teal-600" />
                              Batches ({item.batches.length}):
                            </span>
                            {item.batches.map(batch => {
                              const bDays = getDaysUntilExpiry(batch.expirationDate);
                              const bInCart = cartItems.find(c => c.inventoryId === item.id && c.batchNumber === batch.batchNumber);
                              return (
                                <div
                                  key={batch.batchNumber || batch.id}
                                  className="inline-flex items-center gap-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5"
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleAddItemToCart(item, batch)}
                                    className={`px-2 py-0.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                      bInCart
                                        ? 'bg-teal-600 text-white shadow-2xs'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
                                    }`}
                                    title={`Click to add Batch ${batch.batchNumber} (Expires ${formatExpiryMonthYear(batch.expirationDate)})`}
                                  >
                                    <span className="font-mono font-bold">#{batch.batchNumber}</span>
                                    <span className={`text-[10px] ${bDays <= 90 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                                      Exp: {formatExpiryMonthYear(batch.expirationDate)}
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-bold">
                                      {batch.stockQuantity} strips
                                    </span>
                                    <span className="text-teal-500 font-bold ml-0.5">+</span>
                                  </button>

                                  {/* Batch Edit Action */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingBatch({ medicine: item, batch });
                                    }}
                                    className="p-1 rounded text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                                    title={`Edit batch ${batch.batchNumber}`}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>

                                  {/* Batch Delete Action */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeletingBatch({ medicine: item, batch });
                                    }}
                                    className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                                    title={`Delete batch ${batch.batchNumber}`}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Right: MRP & 1-Tap Add / Interactive Quantity Counter */}
                      <div className="text-right shrink-0 flex flex-col items-end justify-between self-stretch">
                        {item.offerType && (item.offerType === 'percentage' || item.offerType === 'flat') && item.offerValue ? (
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Offer Price</span>
                            <div className="flex items-baseline gap-1.5 justify-end">
                              <span className="text-xs line-through text-slate-400 font-mono">
                                ₹{item.mrp.toFixed(2)}
                              </span>
                              <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 font-mono">
                                ₹{(item.offerType === 'percentage' ? Math.max(0, item.mrp - (item.mrp * item.offerValue) / 100) : Math.max(0, item.mrp - item.offerValue)).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">MRP</span>
                            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
                              ₹{item.mrp.toFixed(2)}
                            </span>
                          </div>
                        )}

                        <div className="mt-2 flex items-center gap-1.5">
                          {/* Generic Alternative Salt Matcher (⇄ Button) */}
                          <button
                            id={`substitute-btn-${item.id}`}
                            type="button"
                            title="⇄ Find Salt Substitutes & In-Stock Alternatives"
                            aria-label={`Find Salt Substitutes for ${item.brandName}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSubstituteTargetItem(item);
                            }}
                            className="p-2 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-slate-800 dark:hover:bg-teal-950/80 text-teal-700 hover:text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-slate-700 hover:border-teal-400 transition-all text-xs font-bold cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center active:scale-95 shadow-2xs group"
                          >
                            <ArrowRightLeft className="w-4 h-4 text-teal-600 dark:text-teal-400 group-hover:rotate-180 transition-transform duration-300" />
                          </button>

                          {/* 1-Tap Add or Interactive Quantity Counter */}
                          {inCart ? (
                            <div 
                              className="flex items-center bg-teal-50 dark:bg-teal-950/80 border border-teal-500 rounded-xl p-0.5 shadow-2xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(item.id, inCart.quantity - 1)}
                                className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 flex items-center justify-center font-black transition-colors cursor-pointer active:scale-95 shadow-2xs"
                                title="Decrease quantity"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-2 text-xs font-black text-teal-800 dark:text-teal-200 min-w-[26px] text-center font-mono">
                                {inCart.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(item.id, inCart.quantity + 1)}
                                className="w-8 h-8 rounded-lg bg-teal-600 text-white hover:bg-teal-700 flex items-center justify-center font-black transition-colors cursor-pointer active:scale-95 shadow-2xs"
                                title="Increase quantity"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddItemToCart(item);
                              }}
                              className={`h-9 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                                isHighlighted
                                  ? 'bg-teal-600 text-white ring-2 ring-teal-400'
                                  : 'bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white'
                              }`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Add</span>
                            </button>
                          )}
                        </div>

                      </div>

                    </div>

                    {/* Salt Substitute Suggestion Banner when Stock is 0 */}
                    {isOutOfStock && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/80 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-700/60">
                          <div className="flex items-center gap-1.5 text-xs font-black text-amber-800 dark:text-amber-300">
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>Out of Stock. Available in-stock alternatives with same salt composition:</span>
                          </div>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-200/80 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 font-bold shrink-0">
                            {findSubstitutes(item).length} In Stock
                          </span>
                        </div>

                        {findSubstitutes(item).length === 0 ? (
                          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                            <span>No alternative brand with matching salt currently in stock.</span>
                            <button
                              type="button"
                              onClick={() => setSubstituteTargetItem(item)}
                              className="text-xs text-teal-600 dark:text-teal-400 font-semibold hover:underline cursor-pointer"
                            >
                              Explore salt matrix →
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {findSubstitutes(item).slice(0, 3).map(sub => (
                              <div
                                key={sub.id}
                                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-amber-200 dark:border-amber-700/40 hover:border-amber-400 flex items-center justify-between gap-2 transition-colors"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">{sub.brandName}</span>
                                    {sub.strength && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                                        {sub.strength}
                                      </span>
                                    )}
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                      {sub.stockQuantity} in stock
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                                    <span className="text-teal-600 dark:text-teal-300 font-mono flex items-center gap-0.5">
                                      <MapPin className="w-2.5 h-2.5 text-teal-600 dark:text-teal-400" />
                                      {sub.locationShelf || `${sub.rackNumber || 'Rack A-1'}-${sub.shelfRow || '1'}`}
                                    </span>
                                    <span>•</span>
                                    <span className="text-slate-900 dark:text-white font-mono font-bold">MRP: ₹{sub.mrp.toFixed(2)}</span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddItemToCart(sub);
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shrink-0 shadow-xs active:scale-95 cursor-pointer"
                                >
                                  <Zap className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
                                  <span>1-Click Replace</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* RIGHT PANE (35% on Desktop): Persistent Live Cart Drawer with Customer details & Payment actions */}
        <div className="w-full lg:w-[35%] shrink-0 space-y-3.5 lg:sticky lg:top-4">
          
          {/* Customer Details Card (3 Clean Inputs) */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-teal-600" />
                Customer & Doctor Details
              </h3>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Bill Meta</span>
            </div>

            <div className="space-y-2.5">
              {/* Customer Name */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Customer Name
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="pos-customer-name-input"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Mobile Number (For WhatsApp Bill)
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="pos-customer-phone-input"
                    type="tel"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="10-digit mobile (e.g. 9876543210)"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>
              </div>

              {/* Doctor Reference */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Doctor Reference
                </label>
                <div className="relative">
                  <Stethoscope className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="pos-doctor-ref-input"
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="e.g. Dr. A. K. Verma, MD"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Active Bill Card */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-teal-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active Bill Items</h3>
                <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 text-[11px] font-bold">
                  {invoiceSummary.totalItemsCount}
                </span>
              </div>

              {cartItems.length > 0 && (
                <button
                  onClick={handleClearBill}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Real-time AI Drug Interaction & Conflict Checker */}
            {cartItems.length > 0 && (
              <DrugInteractionChecker
                cartItems={cartItems}
                customerName={customerName}
                onRemoveItem={handleRemoveItem}
                onFindAlternative={(altName) => {
                  setSearchTerm(altName);
                  if (searchInputRef.current) {
                    searchInputRef.current.focus();
                  }
                }}
                onApplyOverrideNote={(note) => {
                  setClinicalOverrideNote(prev => prev ? `${prev} | ${note}` : note);
                }}
              />
            )}

            {/* Bill Items List */}
            {cartItems.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <span>No medicines in bill yet. Select or press Enter on the left to add.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {cartItems.map((it) => (
                  <div 
                    key={it.inventoryId}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {it.brandName}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono">B: {it.batchNumber}</span>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
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
                                    (+{it.freeQuantity} Free Included)
                                  </span>
                                ) : null}
                              </>
                            ) : (
                              <>
                                <Tag className="w-2.5 h-2.5" />
                                <span>Offer Applied: {it.offerLabel || (it.offerType === 'percentage' ? `${it.offerValue}% OFF` : `₹${it.offerValue} OFF`)}</span>
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

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleUpdateQuantity(it.inventoryId, it.quantity - 1)}
                        className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 font-bold active:scale-95 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <span className="w-7 text-center font-bold text-xs text-slate-900 dark:text-white font-mono">
                        {it.quantity}
                      </span>

                      <button
                        onClick={() => handleUpdateQuantity(it.inventoryId, it.quantity + 1)}
                        className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 font-bold active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleRemoveItem(it.inventoryId)}
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 flex items-center justify-center cursor-pointer ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}

            {/* Payment Mode Selector: Cash / UPI Toggle */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Payment Mode
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Press F4 to Cycle</span>
              </div>

              {/* Segmented Cash / UPI Switch */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                {[
                  { id: 'Cash', label: 'Cash', icon: Banknote },
                  { id: 'Dynamic UPI QR', label: 'UPI / QR', icon: QrCode },
                  { id: 'Khata (Credit Ledger)', label: 'Khata', icon: BookOpen }
                ].map(mode => {
                  const Icon = mode.icon;
                  const isSelected = paymentMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setPaymentMode(mode.id as PaymentMode)}
                      className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[38px] ${
                        isSelected
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-teal-600 dark:text-teal-400' : ''}`} />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Cash Mode Details: Fast Preset Tendered & Change Return */}
              {paymentMode === 'Cash' && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Cash Tendered
                    </label>
                    {cashTendered > 0 && (
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 mr-1 font-medium">Change Due:</span>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                          ₹{cashChange.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                    <input
                      ref={cashInputRef}
                      type="number"
                      value={cashTendered || ''}
                      onChange={(e) => setCashTendered(Number(e.target.value) || 0)}
                      placeholder={`Exact (₹${invoiceSummary.grandTotal})`}
                      className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                    />
                  </div>
                  {/* Quick Tendered Presets */}
                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                    <button
                      type="button"
                      onClick={() => setCashTendered(invoiceSummary.grandTotal)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 hover:bg-teal-50 hover:text-teal-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      Exact (₹{invoiceSummary.grandTotal})
                    </button>
                    {[100, 200, 500, 1000, 2000].filter(amt => amt >= invoiceSummary.grandTotal).slice(0, 3).map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCashTendered(preset)}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                      >
                        ₹{preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* UPI Mode Details */}
              {paymentMode === 'Dynamic UPI QR' && (
                <div className="p-2.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-teal-800 dark:text-teal-200 flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5 text-teal-600" />
                      Dynamic UPI Active
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      VPA: {shopSettings.upiId || 'irsaad9118@okhdfcbank'}
                    </span>
                  </div>
                  <span className="text-xs font-black font-mono text-teal-700 dark:text-teal-300">
                    ₹{invoiceSummary.grandTotal.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Discount % Control */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-teal-600" />
                  Discount %
                </label>
                {discountPercent > 0 && (
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 font-mono">
                    -₹{invoiceSummary.discountAmount.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {[0, 5, 10, 15].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDiscountPercent(pct)}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      discountPercent === pct
                        ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-500'
                    }`}
                  >
                    {pct === 0 ? 'None' : `${pct}%`}
                  </button>
                ))}
                <div className="relative w-20">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent || ''}
                    onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                    placeholder="Custom %"
                    className="w-full pl-2 pr-5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">%</span>
                </div>
              </div>
            </div>

            {/* Live Financial Breakdown & GST Split */}
            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700 text-xs space-y-1.5">
              
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                  ₹{invoiceSummary.subtotal.toFixed(2)}
                </span>
              </div>

              {/* Offer & Scheme Savings highlight */}
              {invoiceSummary.totalOfferSavings > 0 && (
                <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 p-2 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    Offers / Scheme Savings:
                  </span>
                  <span className="font-black font-mono">
                    -₹{invoiceSummary.totalOfferSavings.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Discount Deduction */}
              {invoiceSummary.discountAmount > 0 && (
                <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 font-semibold">
                  <span>Bill Discount ({discountPercent}%):</span>
                  <span className="font-mono">
                    -₹{invoiceSummary.discountAmount.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Explicit GST Split (CGST + SGST) */}
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  <span>GST Split (Total: ₹{invoiceSummary.totalGst.toFixed(2)}):</span>
                  <span className="font-mono text-teal-600 dark:text-teal-400 font-extrabold">₹{invoiceSummary.totalGst.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-1">
                  <div className="flex items-center justify-between">
                    <span>CGST (50%):</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">₹{invoiceSummary.cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>SGST (50%):</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">₹{invoiceSummary.sgst.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {invoiceSummary.roundOff !== 0 && (
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Round-off:</span>
                  <span className="font-mono">{invoiceSummary.roundOff > 0 ? `+₹${invoiceSummary.roundOff}` : `-₹${Math.abs(invoiceSummary.roundOff)}`}</span>
                </div>
              )}

              {/* Live Grand Total */}
              <div className="flex items-center justify-between pt-2.5 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <span className="font-black text-slate-900 dark:text-white text-sm block leading-none">
                    Live Total:
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {invoiceSummary.totalItemsCount} item{invoiceSummary.totalItemsCount === 1 ? '' : 's'} included
                  </span>
                </div>
                <span className="font-black text-xl sm:text-2xl text-teal-600 dark:text-teal-400 font-mono tracking-tight">
                  ₹{invoiceSummary.grandTotal.toFixed(2)}
                </span>
              </div>

            </div>

            {/* Instant Actions (1-Click Complete & Send WhatsApp Bill + Thermal Receipt Print) */}
            <div className="pt-2 space-y-2">
              
              {/* 1-Click "Complete & Send WhatsApp Bill" Simulation Button */}
              <button
                id="pos-complete-and-whatsapp-btn"
                type="button"
                disabled={cartItems.length === 0}
                onClick={handleOpenWhatsAppDirect}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer active:scale-[0.99] min-h-[48px]"
                title="1-Click: Complete sale, update inventory, and open pre-formatted WhatsApp bill"
              >
                <Send className="w-5 h-5" />
                <span>Complete & Send WhatsApp Bill</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                {/* Standard Complete & Bill */}
                <button
                  id="pos-complete-and-bill-btn"
                  disabled={cartItems.length === 0}
                  onClick={() => handleCheckout(true)}
                  className="py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Bill</span>
                </button>

                {/* Standard Thermal Receipt Print */}
                <button
                  type="button"
                  id="pos-print-thermal-btn"
                  onClick={handlePrintThermalDirect}
                  disabled={cartItems.length === 0}
                  className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
                  title="Direct thermal receipt print (Ctrl + P)"
                >
                  <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  <span>Thermal Print (Ctrl+P)</span>
                </button>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* 1. BILL COMPLETED POPUP MODAL (Auto PDF Downloaded, WhatsApp, Re-download, Thermal, Next Bill) */}
      <BillCompletedModal
        isOpen={showCompletedModal && Boolean(completedTx)}
        onClose={() => setShowCompletedModal(false)}
        transaction={completedTx}
        onOpenThermalReceipt={() => {
          setShowCompletedModal(false);
          setShowThermalModal(true);
        }}
        onNextSale={() => {
          setShowCompletedModal(false);
          setCompletedTx(null);
          setCartItems([]);
          setCashTendered(0);
          setDiscountPercent(0);
          setSearchTerm('');
          setTimeout(() => {
            searchInputRef.current?.focus();
          }, 150);
        }}
      />

      {/* 2. DEDICATED POS THERMAL RECEIPT PRINTING MODAL */}
      <ThermalReceiptModal
        isOpen={showThermalModal && Boolean(completedTx)}
        onClose={() => setShowThermalModal(false)}
        transaction={completedTx}
        defaultPaperWidth={thermalPaperWidth}
        onStartNextBill={() => {
          setShowThermalModal(false);
          setCompletedTx(null);
          setCartItems([]);
          setCashTendered(0);
          setDiscountPercent(0);
          setSearchTerm('');
          setTimeout(() => {
            searchInputRef.current?.focus();
          }, 150);
        }}
      />

      {/* SMART SALT SUBSTITUTES & IN-STOCK ALTERNATIVES BOTTOM-SHEET MODAL */}
      <SaltSubstituteModal
        isOpen={Boolean(substituteTargetItem)}
        onClose={() => setSubstituteTargetItem(null)}
        targetItem={substituteTargetItem}
        inventory={inventory}
        onSelectSubstitute={(selectedSub) => {
          handleAddItemToCart(selectedSub);
          addToast({
            type: 'success',
            title: 'Salt Substitute Added',
            message: `Switched to ${selectedSub.brandName} (${selectedSub.stockQuantity} in stock)`
          });
        }}
      />

      {/* PERSISTENT FLOATING CART BAR ON MOBILE ONLY (<1024px) */}
      {cartItems.length > 0 && (
        <div 
          id="pos-persistent-floating-cart-bar"
          className="lg:hidden fixed bottom-14 left-3 right-3 z-40 animate-in slide-in-from-bottom-4 duration-300"
        >
          <div 
            onClick={() => setIsCartOpen(true)}
            className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-850 active:scale-[0.99] transition-all ring-2 ring-teal-500/40"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-teal-500 text-slate-950 flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                <ShoppingBag className="w-4 h-4 text-slate-950" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-black text-xs sm:text-sm text-white">
                    🛒 {invoiceSummary.totalItemsCount} {invoiceSummary.totalItemsCount === 1 ? 'Item' : 'Items'}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-xs sm:text-sm font-mono font-black text-teal-400">
                    ₹{invoiceSummary.grandTotal.toFixed(2)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">
                  Tap to review & proceed to bill
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsCartOpen(true);
              }}
              className="px-3.5 sm:px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shrink-0 shadow-md shadow-teal-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <span>Proceed to Bill</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* CHECKOUT & BILLING DRAWER / MODAL (FOR MOBILE / TABLET) */}
      <CheckoutDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        customerName={customerName}
        setCustomerName={setCustomerName}
        contactNumber={contactNumber}
        setContactNumber={setContactNumber}
        doctorName={doctorName}
        setDoctorName={setDoctorName}
        paymentMode={paymentMode}
        setPaymentMode={setPaymentMode}
        cashTendered={cashTendered}
        setCashTendered={setCashTendered}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearBill={handleClearBill}
        onCompleteSale={handleCheckout}
        onSendWhatsApp={handleOpenWhatsAppDirect}
        onPrintThermal={handlePrintThermalDirect}
      />

      {/* ADD NEW MEDICINE MODAL (Available Directly from POS Counter) */}
      <AddMedicineModal
        isOpen={isAddMedicineModalOpen}
        onClose={() => setIsAddMedicineModalOpen(false)}
        initialBrandName={searchTerm}
        onSuccess={(newId) => {
          setSearchTerm('');
          const added = inventory.find(i => i.id === newId);
          if (added) {
            handleAddItemToCart(added);
          }
        }}
      />

      {/* CAMERA BARCODE & QR SCANNER MODAL */}
      <CameraBarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        inventory={inventory}
        onItemScanned={(scannedItem) => {
          handleAddItemToCart(scannedItem);
        }}
      />

      {/* FULL-SCREEN DEDICATED SEARCH OVERLAY (FOCUS & MOBILE FRIENDLY) */}
      <FullScreenSearchModal
        isOpen={isFullScreenSearchOpen}
        onClose={() => {
          setIsFullScreenSearchOpen(false);
          setAutoStartVoice(false);
        }}
        searchTerm={searchTerm}
        onSearchChange={(term) => setSearchTerm(term)}
        inventory={inventory}
        cartItems={cartItems}
        onAddToCart={handleAddItemToCart}
        onUpdateQuantity={handleUpdateQuantity}
        onOpenSubstitute={(item) => setSubstituteTargetItem(item)}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenCart={() => setIsCartOpen(true)}
        cartTotal={invoiceSummary.grandTotal}
        totalItemsCount={invoiceSummary.totalItemsCount}
        autoStartVoice={autoStartVoice}
      />

      {/* SALES RETURN & REFUND MODAL */}
      <SalesReturnModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
      />

      {/* EDIT MEDICINE MODAL */}
      <EditMedicineModal
        isOpen={!!editingMedicine}
        medicine={editingMedicine}
        onClose={() => setEditingMedicine(null)}
        onSave={handleSaveEditedMedicine}
      />

      {/* DELETE MEDICINE CONFIRM MODAL */}
      <DeleteMedicineConfirmModal
        isOpen={!!deletingMedicine}
        medicine={deletingMedicine}
        onClose={() => setDeletingMedicine(null)}
        onConfirm={handleConfirmDeleteMedicine}
      />

      {/* EDIT BATCH MODAL */}
      <EditBatchModal
        isOpen={!!editingBatch}
        medicine={editingBatch?.medicine || null}
        batch={editingBatch?.batch || null}
        onClose={() => setEditingBatch(null)}
        onSave={handleSaveEditedBatch}
      />

      {/* DELETE BATCH CONFIRM MODAL */}
      <DeleteBatchConfirmModal
        isOpen={!!deletingBatch}
        medicine={deletingBatch?.medicine || null}
        batch={deletingBatch?.batch || null}
        onClose={() => setDeletingBatch(null)}
        onConfirm={handleConfirmDeleteBatch}
      />

    </div>
  );
};
