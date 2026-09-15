import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { 
  Patient, 
  Prescription, 
  MedicationInventory, 
  InventoryBatch,
  Prescriber, 
  OutreachCampaign, 
  PointOfSaleTransaction,
  ActivityLog,
  MTMReview,
  ClinicalScreeningResult,
  RxStatus,
  PosBillItem,
  DebitNote,
  ExpiryAlertTier,
  ShopSettings,
  KhataLedgerEntry,
  ShortageOrderItem,
  DistributorPurchaseOrder,
  ChronicMedicationEntry,
  SalesReturnRecord,
  SalesReturnItem,
  BulkReminderResult,
  BulkReminderItem
} from '../types/pharmacy';
import { 
  INITIAL_PATIENTS, 
  INITIAL_PRESCRIPTIONS, 
  INITIAL_INVENTORY, 
  INITIAL_PRESCRIBERS, 
  INITIAL_CAMPAIGNS, 
  INITIAL_TRANSACTIONS, 
  INITIAL_LOGS,
  INITIAL_MTM_REVIEWS,
  INITIAL_DEBIT_NOTES,
  INITIAL_SHOP_SETTINGS
} from '../data/initialData';
import { useAuth } from './AuthContext';
import confetti from 'canvas-confetti';
import { findExactSaltSubstitutes } from '../utils/saltSubstituteEngine';
import { recordStoreSaleInRegistry } from '../utils/storeRegistry';
import {
  findExistingInventoryMatch,
  mergeInventoryItem,
  deduplicateMasterInventory,
  isMatchingMedicine
} from '../utils/inventoryDeduplication';

export interface MergeBannerData {
  brandName: string;
  previousStock: number;
  newStock: number;
  addedStock: number;
  batchNumber: string;
  unit?: string;
  timestamp?: number;
  isNewBatchAdded?: boolean;
  batchCount?: number;
}

interface ToastNotification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
}

interface PharmacyContextType {
  // State
  patients: Patient[];
  prescriptions: Prescription[];
  inventory: MedicationInventory[];
  prescribers: Prescriber[];
  campaigns: OutreachCampaign[];
  transactions: PointOfSaleTransaction[];
  invoices: PointOfSaleTransaction[];
  activityLogs: ActivityLog[];
  mtmReviews: MTMReview[];
  debitNotes: DebitNote[];
  shopSettings: ShopSettings;
  toasts: ToastNotification[];
  currentPharmacist: string;
  activeTab: string;
  searchQuery: string;
  darkMode: boolean;
  mobileSearchActive: boolean;
  isStoreLoading: boolean;

  // Cart & POS Modal State
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isAddMedicineModalOpen: boolean;
  setIsAddMedicineModalOpen: (open: boolean) => void;
  isStaffModalOpen: boolean;
  setIsStaffModalOpen: (open: boolean) => void;
  cartItems: PosBillItem[];
  setCartItems: React.Dispatch<React.SetStateAction<PosBillItem[]>>;
  customerName: string;
  setCustomerName: (name: string) => void;
  contactNumber: string;
  setContactNumber: (phone: string) => void;
  doctorName: string;
  setDoctorName: (doc: string) => void;
  isChronicPatient: boolean;
  setIsChronicPatient: (isChronic: boolean) => void;
  addItemToCart: (item: MedicationInventory) => void;
  updateCartQuantity: (inventoryId: string, qty: number) => void;
  removeCartItem: (inventoryId: string) => void;
  clearCart: () => void;

  // Setters & Navigation
  setActiveTab: (tab: string) => void;
  setSearchQuery: (query: string) => void;
  setMobileSearchActive: (active: boolean) => void;
  setCurrentPharmacist: (name: string) => void;
  updateShopSettings: (settings: Partial<ShopSettings>) => void;
  toggleDarkMode: () => void;
  addToast: (toast: Omit<ToastNotification, 'id'>) => void;
  removeToast: (id: string) => void;

  // Patient / Customer CRM Actions
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt' | 'mrn'>) => Patient;
  updatePatient: (id: string, updates: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  getPatientById: (id: string) => Patient | undefined;
  addChronicMedication: (patientId: string, med: any) => void;
  sendWhatsAppRefillReminder: (patientId: string, medId?: string, customNote?: string) => string;
  sendAllCustomersMedicineReminders: (targetCohort?: 'all' | 'due_and_overdue' | 'overdue_only', customNote?: string) => BulkReminderResult;
  isBulkReminderModalOpen: boolean;
  setIsBulkReminderModalOpen: (open: boolean) => void;
  lastBulkReminderResult: BulkReminderResult | null;
  setLastBulkReminderResult: (result: BulkReminderResult | null) => void;
  markChronicRefilled: (patientId: string, medId: string) => void;

  // Prescription Actions
  addPrescription: (rx: Omit<Prescription, 'id' | 'rxNumber'>) => Prescription;
  updatePrescriptionStatus: (id: string, newStatus: RxStatus, note?: string) => void;
  processRefill: (id: string) => boolean;
  dispensePrescription: (id: string) => void;
  deletePrescription: (id: string) => void;

  // Inventory & Physical Rack Positioning
  addInventoryItem: (item: Partial<MedicationInventory> & { brandName: string }) => MedicationInventory;
  addBulkInventoryItems: (items: (Partial<MedicationInventory> & { brandName: string })[]) => MedicationInventory[];
  updateInventoryItem: (id: string, updates: Partial<MedicationInventory>) => void;
  updateInventoryStock: (id: string, changeQty: number, reason?: string) => void;
  deleteInventoryItem: (id: string, softArchive?: boolean) => void;
  deleteBatch: (medicineId: string, batchIdOrNumber: string) => void;
  updateBatch: (medicineId: string, batchIdOrNumber: string, batchUpdates: Partial<InventoryBatch>) => void;
  updateRackPosition: (id: string, rack: string, shelf: string, bin: string) => void;
  findSubstitutes: (itemOrSalt: MedicationInventory | string, excludeId?: string) => MedicationInventory[];
  lastMergeBanner: MergeBannerData | null;
  setLastMergeBanner: (banner: MergeBannerData | null) => void;

  // 90-Day Expiry Engine Actions
  getExpiryTier: (expiryDate: string) => ExpiryAlertTier;
  getDaysUntilExpiry: (expiryDate: string) => number;
  applyNearExpiryDiscount: (id: string, discountPercent: number) => void;
  createDebitNoteReturn: (supplierName: string, items: { inventoryId: string; quantity: number; reason: string }[], notes?: string) => DebitNote;
  quarantineItem: (id: string, reason: string) => void;

  // Prescriber Actions
  addPrescriber: (prescriber: Omit<Prescriber, 'id'>) => Prescriber;
  addPrescriberCommunication: (prescriberId: string, note: string) => void;

  // Outreach Campaigns Actions
  createCampaign: (campaign: Omit<OutreachCampaign, 'id' | 'deliveredCount' | 'responseRate'>) => OutreachCampaign;
  triggerCampaign: (id: string) => void;
  updateCampaignStatus: (id: string, status: OutreachCampaign['status']) => void;

  // POS / Checkout Actions
  completePosTransaction: (transaction: Omit<PointOfSaleTransaction, 'id' | 'invoiceNumber' | 'timestamp'>) => PointOfSaleTransaction;
  formatWhatsAppInvoice: (tx: PointOfSaleTransaction, patientPhone?: string) => { text: string; waUrl: string };

  // Digital Khata Ledger & Udhaar
  khataLedger: KhataLedgerEntry[];
  recordKhataPayment: (patientId: string, amount: number, paymentMethod: string, notes?: string) => void;
  sendWhatsAppKhataReminder: (patientId: string, customMsg?: string) => string;

  // Chronic Patient 30-Day Auto Cycle Enrollment
  enrollChronicPatient: (patientName: string, patientPhone: string, items: PosBillItem[], doctorName?: string, cycleDays?: number) => Patient;

  // Daily Shortage Book & Purchase Orders to Distributors
  purchaseOrders: DistributorPurchaseOrder[];
  formatDistributorWhatsAppOrder: (supplierName: string, items: ShortageOrderItem[]) => { text: string; waUrl: string };
  savePurchaseOrder: (supplierName: string, items: ShortageOrderItem[], notes?: string) => DistributorPurchaseOrder;

  // Sales Returns & Refunds (Credit Notes)
  salesReturns: SalesReturnRecord[];
  processSalesReturn: (params: {
    originalInvoiceId: string;
    itemsToReturn: {
      inventoryId: string;
      brandName: string;
      batchNumber: string;
      originalQuantity: number;
      returnQuantity: number;
      unitPrice: number;
      gstRate: number;
      refundAmount: number;
      reason: string;
      restocked?: boolean;
    }[];
    refundMethod: 'Cash' | 'Khata Credit' | 'Store Credit Note' | 'UPI Transfer';
    notes?: string;
  }) => SalesReturnRecord;
  formatWhatsAppCreditNote: (returnRecord: SalesReturnRecord) => { text: string; waUrl: string };

  // MTM & Clinical Actions
  addMTMReview: (review: Omit<MTMReview, 'id' | 'date'>) => MTMReview;
  screenInteractions: (medications: string[], allergies: string[], conditions: string[], newRx?: string) => Promise<ClinicalScreeningResult | null>;
  generatePatientGuide: (medicationName: string, dosage: string, sig: string, patientName: string, targetLanguage: string, condition?: string) => Promise<any>;
  parseSigInstructions: (rawSigText: string, medicationName?: string) => Promise<any>;
  generateMtmCarePlan: (patient: Patient, activeRxs: Prescription[]) => Promise<any>;
  generateCampaignCopy: (campaignType: string, tone?: string, medicationName?: string) => Promise<any>;

  // Reset to Demo Data
  resetToDefaults: () => void;
}

const PharmacyContext = createContext<PharmacyContextType | undefined>(undefined);

// Current simulation date baseline
const TODAY_DATE = '2026-08-23';

export const PharmacyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentSession, currentStore } = useAuth();
  const storeId = currentSession?.storeId || 'STORE-APEX01';

  const getStorageKey = (key: string) => `pharmpulse_${storeId}_${key}`;

  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem(`pharmpulse_${storeId}_patients`);
    return saved ? JSON.parse(saved) : INITIAL_PATIENTS;
  });

  const [prescriptions, setPrescriptions] = useState<Prescription[]>(() => {
    const saved = localStorage.getItem(`pharmpulse_${storeId}_prescriptions`);
    return saved ? JSON.parse(saved) : INITIAL_PRESCRIPTIONS;
  });

  const [inventory, setInventory] = useState<MedicationInventory[]>(() => {
    const normalizeItem = (item: MedicationInventory): MedicationInventory => {
      const initialMatch = INITIAL_INVENTORY.find(i => i.id === item.id || i.brandName.toLowerCase() === item.brandName.toLowerCase());
      let batches = item.batches && item.batches.length > 0 ? item.batches.map(b => ({ ...b })) : [];

      // If item lacks batches or has unrealistic legacy numbers (> 200), reset to realistic retail batch structure
      if (batches.length === 0 || batches.some(b => Number(b.stockQuantity) > 200) || item.stockQuantity > 200) {
        if (initialMatch && initialMatch.batches && initialMatch.batches.length > 0) {
          batches = initialMatch.batches.map(b => ({ ...b }));
        } else {
          const realisticStock = item.stockQuantity > 200 ? 50 : Math.max(1, item.stockQuantity || 20);
          batches = [
            {
              id: `batch-${item.id}-0`,
              batchNumber: item.batchNumber || 'BT-101',
              expirationDate: item.expirationDate || '2027-12-31',
              mfgDate: item.mfgDate || '2025-01-01',
              stockQuantity: realisticStock,
              mrp: item.mrp,
              purchaseRate: item.purchaseRate || item.costPrice
            }
          ];
        }
      }

      // User requested: limit batches to maximum 1-2 realistic active batches
      if (batches.length > 2) {
        batches = batches.slice(0, 2);
      }

      const dynamicTotal = batches.reduce((sum, b) => sum + (Number(b.stockQuantity) || 0), 0);
      return {
        ...item,
        batches,
        stockQuantity: dynamicTotal
      };
    };

    const saved = localStorage.getItem(`pharmpulse_${storeId}_inventory`);
    if (!saved) return deduplicateMasterInventory(INITIAL_INVENTORY.map(normalizeItem));
    try {
      const parsed: MedicationInventory[] = JSON.parse(saved);
      // Ensure newly configured reference items (e.g. Pacimol 650, Crocin 650 Advance) are available
      const existingIds = new Set(parsed.map(i => i.id));
      const existingBrands = new Set(parsed.map(i => i.brandName.toLowerCase()));
      const missing = INITIAL_INVENTORY.filter(i => !existingIds.has(i.id) && !existingBrands.has(i.brandName.toLowerCase()));
      const combined = missing.length > 0 ? [...parsed, ...missing] : parsed;
      const normalized = combined.map(normalizeItem);
      return deduplicateMasterInventory(normalized);
    } catch {
      return deduplicateMasterInventory(INITIAL_INVENTORY.map(normalizeItem));
    }
  });

  const [lastMergeBanner, setLastMergeBanner] = useState<MergeBannerData | null>(null);

  const [prescribers, setPrescribers] = useState<Prescriber[]>(() => {
    const saved = localStorage.getItem(`pharmpulse_${storeId}_prescribers`);
    return saved ? JSON.parse(saved) : INITIAL_PRESCRIBERS;
  });

  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>(() => {
    const saved = localStorage.getItem(`pharmpulse_${storeId}_campaigns`);
    return saved ? JSON.parse(saved) : INITIAL_CAMPAIGNS;
  });

  const [transactions, setTransactions] = useState<PointOfSaleTransaction[]>(() => {
    const saved = localStorage.getItem(`pharmpulse_${storeId}_transactions`);
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem(`pharmpulse_${storeId}_logs`);
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });

  const [mtmReviews, setMtmReviews] = useState<MTMReview[]>(() => {
    const saved = localStorage.getItem(`pharmpulse_${storeId}_mtm`);
    return saved ? JSON.parse(saved) : INITIAL_MTM_REVIEWS;
  });

  const [debitNotes, setDebitNotes] = useState<DebitNote[]>(() => {
    const saved = localStorage.getItem(`pharmpulse_${storeId}_debit_notes`);
    return saved ? JSON.parse(saved) : INITIAL_DEBIT_NOTES;
  });

  const [khataLedger, setKhataLedger] = useState<KhataLedgerEntry[]>(() => {
    const saved = localStorage.getItem(`pharmpulse_${storeId}_khata_ledger`);
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'kht-1',
        patientId: 'pat-104',
        customerName: 'Arthur Pendelton',
        customerPhone: '+15553491109',
        type: 'debit',
        amount: 45.00,
        balanceAfter: 45.00,
        invoiceNumber: 'INV-2026-8812',
        paymentMethod: 'Udhaar (Khata Ledger)',
        timestamp: '2026-08-10 14:22:10',
        notes: 'Monthly chronic medicines on Udhaar / credit',
        recordedBy: 'Pharmacist'
      },
      {
        id: 'kht-2',
        patientId: 'pat-102',
        customerName: 'Marcus Chen',
        customerPhone: '+15558713320',
        type: 'debit',
        amount: 15.00,
        balanceAfter: 15.00,
        invoiceNumber: 'INV-2026-8740',
        paymentMethod: 'Udhaar (Khata Ledger)',
        timestamp: '2026-08-15 11:05:30',
        notes: 'Asthma Inhaler refill on credit',
        recordedBy: 'Pharmacist'
      }
    ];
  });

  const [purchaseOrders, setPurchaseOrders] = useState<DistributorPurchaseOrder[]>(() => {
    const saved = localStorage.getItem(`pharmpulse_${storeId}_purchase_orders`);
    return saved ? JSON.parse(saved) : [];
  });

  const [salesReturns, setSalesReturns] = useState<SalesReturnRecord[]>(() => {
    const saved = localStorage.getItem(`pharmpulse_${storeId}_sales_returns`);
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'ret-1',
        creditNoteNumber: 'CN-2026-8801',
        originalInvoiceId: 'pos-1',
        originalInvoiceNumber: 'INV-2026-8812',
        customerName: 'Arthur Pendelton',
        customerPhone: '+15553491109',
        patientId: 'pat-104',
        timestamp: '2026-08-20 16:45:00',
        items: [
          {
            inventoryId: 'med-2',
            brandName: 'Metformin HCl 500mg ER',
            batchNumber: 'MT-8831',
            originalQuantity: 2,
            returnQuantity: 1,
            unitPrice: 12.00,
            gstRate: 12,
            refundAmount: 12.00,
            reason: 'Doctor Changed Medicine',
            restocked: true
          }
        ],
        totalRefundAmount: 12.00,
        refundMethod: 'Cash',
        handledBy: 'Rajesh Sharma',
        notes: 'Unopened box returned due to dosage change by Dr. Miller'
      }
    ];
  });

  const [shopSettings, setShopSettings] = useState<ShopSettings>(() => {
    const saved = localStorage.getItem(`pharmpulse_${storeId}_shop_settings`);
    if (saved) return JSON.parse(saved);
    if (currentStore) {
      return {
        ...INITIAL_SHOP_SETTINGS,
        shopName: currentStore.storeName || INITIAL_SHOP_SETTINGS.shopName,
        storeName: currentStore.storeName || INITIAL_SHOP_SETTINGS.storeName,
        address: currentStore.address || INITIAL_SHOP_SETTINGS.address,
        phone: currentStore.ownerPhone || currentStore.phone || INITIAL_SHOP_SETTINGS.phone,
        dlNumber: currentStore.dlNumber || INITIAL_SHOP_SETTINGS.dlNumber,
        drugLicense: currentStore.dlNumber || INITIAL_SHOP_SETTINGS.drugLicense,
        gstin: currentStore.gstin || INITIAL_SHOP_SETTINGS.gstin,
        upiId: currentStore.upiId || INITIAL_SHOP_SETTINGS.upiId
      };
    }
    return INITIAL_SHOP_SETTINGS;
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('pharmpulse_dark_mode_v2');
    return saved ? JSON.parse(saved) : false;
  });

  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [currentPharmacist, setCurrentPharmacist] = useState<string>(
    currentSession?.user?.name ? `${currentSession.user.name}` : 'Rajesh Sharma, B.Pharm (Chief Pharmacist)'
  );
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mobileSearchActive, setMobileSearchActive] = useState<boolean>(false);
  const [isStoreLoading, setIsStoreLoading] = useState<boolean>(false);

  // Global Cart & POS Modal State
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isAddMedicineModalOpen, setIsAddMedicineModalOpen] = useState<boolean>(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState<boolean>(false);
  const [isBulkReminderModalOpen, setIsBulkReminderModalOpen] = useState<boolean>(false);
  const [lastBulkReminderResult, setLastBulkReminderResult] = useState<BulkReminderResult | null>(null);
  const [cartItems, setCartItems] = useState<PosBillItem[]>([]);
  const [customerName, setCustomerName] = useState<string>('Walk-in Customer');
  const [contactNumber, setContactNumber] = useState<string>('');
  const [doctorName, setDoctorName] = useState<string>('Self / Direct Counter');
  const [isChronicPatient, setIsChronicPatient] = useState<boolean>(false);

  // Cart helper functions
  const addItemToCart = (item: MedicationInventory) => {
    if (item.stockQuantity <= 0) {
      addToast({
        type: 'warning',
        title: 'Out of Stock',
        message: `${item.brandName} is currently out of stock. Use salt substitute finder.`
      });
      return;
    }

    setCartItems(prev => {
      const existing = prev.find(i => i.inventoryId === item.id);
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

      if (existing) {
        const nextQty = existing.quantity + 1;
        if (nextQty > item.stockQuantity) {
          addToast({
            type: 'warning',
            title: 'Max Stock Reached',
            message: `Only ${item.stockQuantity} units available in inventory.`
          });
          return prev;
        }
        const calc = computeItemOffer(nextQty);
        return prev.map(i =>
          i.inventoryId === item.id
            ? { 
                ...i, 
                quantity: nextQty,
                unitPrice: calc.unitPrice,
                offerDiscountAmount: calc.offerDiscountAmount,
                freeQuantity: calc.freeQuantity,
                totalSavings: calc.totalSavings,
                gstAmount: calc.gstAmount,
                totalPrice: calc.totalPrice,
                totalAmount: calc.totalAmount
              }
            : i
        );
      } else {
        const calc = computeItemOffer(1);
        const newItem: PosBillItem = {
          inventoryId: item.id,
          brandName: item.brandName,
          medicationName: item.brandName,
          genericName: item.genericName || item.saltComposition,
          genericSalt: item.saltComposition || item.genericName,
          saltComposition: item.saltComposition,
          strength: item.strength,
          batchNumber: item.batchNumber,
          expirationDate: item.expirationDate,
          expiryDate: item.expirationDate,
          rackLocation: item.locationShelf || `${item.rackNumber} / ${item.shelfRow}`,
          unit: item.unit || 'Strips',
          packSize: item.packSize || 10,
          quantity: 1,
          mrp: mrp,
          originalPrice: mrp,
          unitPrice: calc.unitPrice,
          purchaseRate: item.purchaseRate || item.costPrice,
          costPrice: item.costPrice || item.purchaseRate,
          sellingPrice: calc.unitPrice,
          totalPrice: calc.totalPrice,
          totalAmount: calc.totalAmount,
          gstRate: calc.gstRate,
          gstAmount: calc.gstAmount,
          isRx: item.scheduleClass !== 'OTC',
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
      title: 'Item Added to Bill',
      message: `${item.brandName} added to current invoice.`
    });
  };

  const updateCartQuantity = (inventoryId: string, qty: number) => {
    if (qty <= 0) {
      removeCartItem(inventoryId);
      return;
    }
    const inv = inventory.find(i => i.id === inventoryId);
    if (inv && qty > inv.stockQuantity) {
      addToast({
        type: 'warning',
        title: 'Insufficient Stock',
        message: `Only ${inv.stockQuantity} units available.`
      });
      return;
    }
    setCartItems(prev => prev.map(i => {
      if (i.inventoryId !== inventoryId) return i;
      const mrp = i.mrp || i.originalPrice || i.unitPrice;
      const offerType = i.offerType || 'none';
      const offerValue = i.offerValue || 0;
      const schemeBuyQty = i.schemeBuyQty || 0;
      const schemeFreeQty = i.schemeFreeQty || 0;

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
        unitPrice = i.sellingPrice || mrp;
        totalSavings = mrp > unitPrice ? Number(((mrp - unitPrice) * qty).toFixed(2)) : 0;
      }

      const totalAmount = Number((unitPrice * qty).toFixed(2));
      const gstAmount = Number(((totalAmount * i.gstRate) / (100 + i.gstRate)).toFixed(2));

      return { 
        ...i, 
        quantity: qty,
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

  const removeCartItem = (inventoryId: string) => {
    setCartItems(prev => prev.filter(i => i.inventoryId !== inventoryId));
  };

  const clearCart = () => {
    setCartItems([]);
    setCustomerName('Walk-in Customer');
    setContactNumber('');
    setDoctorName('Self / Direct Counter');
    setIsChronicPatient(false);
  };

  // Update currentPharmacist when session changes
  useEffect(() => {
    if (currentSession?.user?.name) {
      setCurrentPharmacist(currentSession.user.name);
    }
  }, [currentSession?.user?.name]);

  // Keep ShopSettings in sync with logged-in StoreWorkspace
  useEffect(() => {
    if (currentStore) {
      setShopSettings(prev => ({
        ...prev,
        shopName: currentStore.storeName || prev.shopName,
        storeName: currentStore.storeName || prev.storeName,
        address: currentStore.address || prev.address,
        phone: currentStore.ownerPhone || currentStore.phone || prev.phone,
        dlNumber: currentStore.dlNumber || prev.dlNumber,
        drugLicense: currentStore.dlNumber || prev.drugLicense,
        gstin: currentStore.gstin || prev.gstin,
        upiId: currentStore.upiId || prev.upiId
      }));
    }
  }, [currentStore]);

  // Fetch Store State from backend on mount or storeId switch + periodic multi-device live sync
  useEffect(() => {
    if (!storeId) return;
    let isSubscribed = true;

    const fetchStoreData = async () => {
      try {
        const res = await fetch(`/api/store/${storeId}/state`);
        if (res.ok) {
          const json = await res.json();
          if (json.data && isSubscribed) {
            if (json.data.inventory && Array.isArray(json.data.inventory)) {
              setInventory(json.data.inventory);
            }
            if (json.data.transactions && Array.isArray(json.data.transactions)) {
              setTransactions(json.data.transactions);
            }
            if (json.data.patients && Array.isArray(json.data.patients)) {
              setPatients(json.data.patients);
            }
            if (json.data.settings) {
              setShopSettings(prev => ({ ...prev, ...json.data.settings }));
            }
          }
        }
      } catch (err) {
        // network or server loading
      }
    };

    fetchStoreData();

    // Multi-device polling interval (3.5s) for instant real-time counter sync
    const syncInterval = setInterval(fetchStoreData, 3500);

    return () => {
      isSubscribed = false;
      clearInterval(syncInterval);
    };
  }, [storeId]);

  // Sync state to store-scoped localStorage
  useEffect(() => {
    localStorage.setItem(getStorageKey('patients'), JSON.stringify(patients));
  }, [patients, storeId]);

  useEffect(() => {
    localStorage.setItem(getStorageKey('prescriptions'), JSON.stringify(prescriptions));
  }, [prescriptions, storeId]);

  useEffect(() => {
    localStorage.setItem(getStorageKey('inventory'), JSON.stringify(inventory));
  }, [inventory, storeId]);

  useEffect(() => {
    localStorage.setItem(getStorageKey('prescribers'), JSON.stringify(prescribers));
  }, [prescribers, storeId]);

  useEffect(() => {
    localStorage.setItem(getStorageKey('campaigns'), JSON.stringify(campaigns));
  }, [campaigns, storeId]);

  useEffect(() => {
    localStorage.setItem(getStorageKey('transactions'), JSON.stringify(transactions));
  }, [transactions, storeId]);

  useEffect(() => {
    localStorage.setItem(getStorageKey('logs'), JSON.stringify(activityLogs));
  }, [activityLogs, storeId]);

  useEffect(() => {
    localStorage.setItem(getStorageKey('mtm'), JSON.stringify(mtmReviews));
  }, [mtmReviews, storeId]);

  useEffect(() => {
    localStorage.setItem(getStorageKey('debit_notes'), JSON.stringify(debitNotes));
  }, [debitNotes, storeId]);

  useEffect(() => {
    localStorage.setItem(getStorageKey('khata_ledger'), JSON.stringify(khataLedger));
  }, [khataLedger, storeId]);

  useEffect(() => {
    localStorage.setItem(getStorageKey('purchase_orders'), JSON.stringify(purchaseOrders));
  }, [purchaseOrders, storeId]);

  useEffect(() => {
    localStorage.setItem(getStorageKey('sales_returns'), JSON.stringify(salesReturns));
  }, [salesReturns, storeId]);

  useEffect(() => {
    localStorage.setItem(getStorageKey('shop_settings'), JSON.stringify(shopSettings));
  }, [shopSettings, storeId]);

  useEffect(() => {
    localStorage.setItem('pharmpulse_dark_mode_v2', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const updateShopSettings = (settings: Partial<ShopSettings>) => {
    setShopSettings(prev => ({ ...prev, ...settings }));
    
    // Sync to backend
    fetch(`/api/store/${storeId}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    }).catch(() => {});

    addToast({
      type: 'success',
      title: 'Store Settings Saved',
      message: 'Medical store profile and billing credentials updated.'
    });
  };


  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  // Toast Helpers
  const addToast = (toast: Omit<ToastNotification, 'id'>) => {
    const id = 'toast-' + Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const logActivity = (action: string, details: string, category: ActivityLog['category']) => {
    const newLog: ActivityLog = {
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      action,
      user: currentPharmacist.split(',')[0],
      details,
      category
    };
    setActivityLogs(prev => [newLog, ...prev.slice(0, 75)]);
  };

  // 90-Day Expiry Calculator
  const getDaysUntilExpiry = (expiryDateStr: string): number => {
    const exp = new Date(expiryDateStr);
    const today = new Date(TODAY_DATE);
    const diffTime = exp.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getExpiryTier = (expiryDateStr: string): ExpiryAlertTier => {
    const days = getDaysUntilExpiry(expiryDateStr);
    if (days <= 30) return 'red';
    if (days <= 60) return 'amber';
    if (days <= 90) return 'yellow';
    return 'green';
  };

  // Patient / Customer CRM Actions
  const addPatient = (patientData: Omit<Patient, 'id' | 'createdAt' | 'mrn'>): Patient => {
    const newId = 'pat-' + Math.floor(100 + Math.random() * 900);
    const newMrn = 'MRN-' + Math.floor(100000 + Math.random() * 900000);
    const newPatient: Patient = {
      ...patientData,
      id: newId,
      mrn: newMrn,
      chronicMedications: patientData.chronicMedications || [],
      createdAt: TODAY_DATE,
      lastVisitDate: TODAY_DATE,
    };
    setPatients(prev => [newPatient, ...prev]);
    fetch(`/api/store/${storeId}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPatient)
    }).catch(() => {});

    logActivity('New Customer Added', `Added ${newPatient.firstName} ${newPatient.lastName} (${newMrn}) with ${newPatient.chronicConditions?.join(', ') || 'General'}`, 'CRM');
    addToast({
      type: 'success',
      title: 'Customer Added',
      message: `${newPatient.firstName} ${newPatient.lastName} enrolled with MRN ${newMrn}.`
    });
    return newPatient;
  };

  const updatePatient = (id: string, updates: Partial<Patient>) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    logActivity('Customer Updated', `Updated profile for Patient ID ${id}`, 'CRM');
    addToast({
      type: 'info',
      title: 'Profile Updated',
      message: 'Customer information and chronic profile saved.'
    });
  };

  const deletePatient = (id: string) => {
    const target = patients.find(p => p.id === id);
    setPatients(prev => prev.filter(p => p.id !== id));
    logActivity('Customer Removed', `Deleted customer ${target?.firstName || ''} ${target?.lastName || id}`, 'CRM');
    addToast({
      type: 'warning',
      title: 'Record Removed',
      message: 'Customer profile deleted from database.'
    });
  };

  const getPatientById = (id: string) => {
    return patients.find(p => p.id === id);
  };

  const addChronicMedication = (patientId: string, med: any) => {
    setPatients(prev => prev.map(p => {
      if (p.id !== patientId) return p;
      const newMed = {
        id: 'cm-' + Date.now(),
        ...med,
        reminderStatus: 'pending' as const
      };
      return {
        ...p,
        chronicMedications: [...(p.chronicMedications || []), newMed]
      };
    }));
    logActivity('Chronic Med Added', `Added chronic medication to patient ${patientId}`, 'CRM');
    addToast({
      type: 'success',
      title: 'Chronic Medication Tracked',
      message: 'Automated 30-day refill tracker activated.'
    });
  };

  const sendWhatsAppRefillReminder = (patientId: string, medId?: string, customNote?: string): string => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return '';

    const med = medId 
      ? patient.chronicMedications.find(m => m.id === medId)
      : patient.chronicMedications[0];

    const cleanPhone = patient.phone.replace(/[^0-9]/g, '');
    const medName = med ? med.medicineName : 'your regular chronic medications';
    const dueDate = med ? med.nextRefillDueDate : 'soon';

    const defaultMsg = `Hello ${patient.firstName} 👋, This is a friendly reminder from *PharmPulse Medical & Pharmacy*.

Your monthly refill for *${medName}* is scheduled for *${dueDate}*. 

💊 We have your fresh batch ready at our dispensary rack. 
Reply *YES* to confirm ready-for-pickup, or text *DELIVER* with your address for fast doorstep delivery.

📞 Pharmacy Desk: +1 (555) 900-MEDS
Stay healthy! ${customNote ? `\n\n*Note:* ${customNote}` : ''}`;

    const encodedMsg = encodeURIComponent(defaultMsg);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;

    // Mark as sent in state
    setPatients(prev => prev.map(p => {
      if (p.id !== patientId) return p;
      return {
        ...p,
        chronicMedications: p.chronicMedications.map(m => {
          if (medId && m.id !== medId) return m;
          return {
            ...m,
            reminderStatus: 'sent',
            lastReminderSent: new Date().toISOString().replace('T', ' ').substring(0, 19)
          };
        })
      };
    }));

    logActivity('WhatsApp Refill Dispatched', `Sent direct WhatsApp refill reminder to ${patient.firstName} ${patient.lastName} (${patient.phone}) for ${medName}`, 'CRM');
    addToast({
      type: 'success',
      title: 'WhatsApp Refill Triggered',
      message: `Opening WhatsApp chat with ${patient.firstName} for ${medName}.`
    });

    // Open WhatsApp in new tab safely
    window.open(whatsappUrl, '_blank');
    return whatsappUrl;
  };

  const sendAllCustomersMedicineReminders = (
    targetCohort: 'all' | 'due_and_overdue' | 'overdue_only' = 'due_and_overdue',
    customNote?: string
  ): BulkReminderResult => {
    const storeName = shopSettings?.shopName || shopSettings?.storeName || 'PharmPulse Medical & Pharmacy';
    const storePhone = shopSettings?.phone || shopSettings?.whatsappPhone || '+91 98765 43210';
    const refDate = new Date(TODAY_DATE).getTime();

    const dispatchedItems: BulkReminderItem[] = [];
    const patientIdsUpdated = new Set<string>();

    const updatedPatients = patients.map(p => {
      if (!p.chronicMedications || p.chronicMedications.length === 0) return p;

      let patientModified = false;
      const updatedMeds = p.chronicMedications.map(med => {
        const dueDate = med.nextRefillDueDate || med.nextDueDate || '2026-08-25';
        const daysRemaining = Math.ceil((new Date(dueDate).getTime() - refDate) / (1000 * 60 * 60 * 24));
        const isOverdue = daysRemaining < 0 || med.reminderStatus === 'overdue';

        let shouldSend = false;
        if (targetCohort === 'overdue_only') {
          shouldSend = isOverdue && med.reminderStatus !== 'refilled';
        } else if (targetCohort === 'all') {
          shouldSend = med.reminderStatus !== 'refilled';
        } else {
          // 'due_and_overdue' (default): overdue OR due within 7 days OR pending
          shouldSend = (isOverdue || daysRemaining <= 7 || med.reminderStatus === 'pending') && med.reminderStatus !== 'refilled';
        }

        if (!shouldSend) return med;

        patientModified = true;
        patientIdsUpdated.add(p.id);

        const cleanPhone = p.phone.replace(/[^0-9]/g, '');
        const medName = med.brandName || med.medicineName || 'chronic medication';
        const dosageInfo = med.dosageInstructions || med.dosage || '';
        const daysText = isOverdue 
          ? `(Overdue by ${Math.abs(daysRemaining)} days)` 
          : daysRemaining === 0 
            ? `(Due Today)` 
            : `(Due in ${daysRemaining} days)`;

        const msg = `Hello ${p.firstName} 👋, This is a friendly refill reminder from *${storeName}*.

💊 *Medication:* ${medName}${dosageInfo ? ` (${dosageInfo})` : ''}
📅 *Refill Due Date:* *${dueDate}* ${daysText}

We have reserved your fresh monthly supply at our dispensary counter.
Reply *YES* to confirm ready-for-pickup, or text *DELIVER* for fast doorstep delivery.

📍 *Pharmacy Desk:* ${storePhone}
Stay healthy and take care!${customNote ? `\n\n*Note:* ${customNote}` : ''}`;

        const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;

        dispatchedItems.push({
          patientId: p.id,
          patientName: `${p.firstName} ${p.lastName}`,
          phone: p.phone,
          medicationId: med.id,
          medicineName: medName,
          dosage: dosageInfo,
          dueDate,
          daysRemaining,
          isOverdue,
          messageText: msg,
          whatsappUrl: waUrl,
          status: 'sent'
        });

        return {
          ...med,
          reminderStatus: 'sent' as const,
          lastReminderSent: new Date().toISOString().replace('T', ' ').substring(0, 19)
        };
      });

      return patientModified ? { ...p, chronicMedications: updatedMeds } : p;
    });

    if (dispatchedItems.length > 0) {
      setPatients(updatedPatients);
      try {
        localStorage.setItem(getStorageKey('patients'), JSON.stringify(updatedPatients));
      } catch (err) {
        console.warn('Failed to save updated patients to localStorage', err);
      }
    }

    const uniqueCustomerCount = patientIdsUpdated.size;
    const result: BulkReminderResult = {
      totalSent: dispatchedItems.length,
      customerCount: uniqueCustomerCount,
      items: dispatchedItems,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      cohort: targetCohort
    };

    setLastBulkReminderResult(result);

    logActivity(
      '1-Click Bulk Refill Reminders Dispatched',
      `Sent 1-Click WhatsApp medicine refill reminders to ${uniqueCustomerCount} customers (${dispatchedItems.length} prescriptions queued).`,
      'CRM'
    );

    addToast({
      type: 'success',
      title: '1-Click Reminders Dispatched!',
      message: `Successfully queued medicine reminders for ${uniqueCustomerCount} customers (${dispatchedItems.length} medicines).`
    });

    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // safe fallback
    }

    return result;
  };

  const markChronicRefilled = (patientId: string, medId: string) => {
    setPatients(prev => prev.map(p => {
      if (p.id !== patientId) return p;
      return {
        ...p,
        lastVisitDate: TODAY_DATE,
        chronicMedications: p.chronicMedications.map(m => {
          if (m.id !== medId) return m;
          // Calculate next 30-day date
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + (m.daysSupply || 30));
          const nextDateStr = nextDate.toISOString().split('T')[0];
          return {
            ...m,
            lastRefillDate: TODAY_DATE,
            nextRefillDueDate: nextDateStr,
            reminderStatus: 'refilled'
          };
        })
      };
    }));
    logActivity('Chronic Refill Processed', `Marked medication ${medId} as refilled for patient ${patientId}`, 'CRM');
    addToast({
      type: 'success',
      title: 'Refill Cycle Updated',
      message: 'Next 30-day chronic due date has been recalculated.'
    });
  };

  // Inventory & Physical Rack Management
  const addInventoryItem = (itemData: Partial<MedicationInventory> & { brandName: string }): MedicationInventory => {
    // 1. SMART DEDUPLICATION: Check if medicine name or salt composition already exists
    const existing = findExistingInventoryMatch(inventory, itemData);

    if (existing) {
      // Do NOT create a duplicate record or split entries across multiple rows.
      // Automatically update/merge the existing medicine entry: add new quantity to current stock, update batch, expiry, or purchase price.
      const mergeResult = mergeInventoryItem(existing, itemData);
      const mergedItem = mergeResult.mergedItem;

      setInventory(prev => prev.map(item => item.id === existing.id ? mergedItem : item));

      fetch(`/api/store/${storeId}/inventory/${existing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mergedItem)
      }).catch(() => {});

      logActivity(
        'Medicine Stock Merged',
        `Existing medicine found: ${existing.brandName}. Stock quantity updated from ${mergeResult.previousStock} to ${mergeResult.newStock} (+${mergeResult.addedStock}). Batch: ${mergedItem.batchNumber}`,
        'Inventory'
      );

      // Requirement: Show a confirmation banner: "Existing medicine found. Stock quantity updated."
      const mergeMsg = mergeResult.isNewBatchAdded
        ? `Existing medicine found: ${existing.brandName}. Attached new batch ${mergedItem.batchNumber} (+${mergeResult.addedStock} ${mergedItem.unit}) under master record.`
        : `Existing medicine found: ${existing.brandName}. Stock quantity updated from ${mergeResult.previousStock} to ${mergeResult.newStock} (+${mergeResult.addedStock}).`;

      addToast({
        type: 'success',
        title: mergeResult.isNewBatchAdded ? 'New Batch Attached to Existing Medicine' : 'Existing Medicine Found',
        message: mergeResult.isNewBatchAdded ? `Attached new batch ${mergedItem.batchNumber}. Total stock: ${mergeResult.newStock} ${mergedItem.unit}.` : 'Existing medicine found. Stock quantity updated.'
      });

      setLastMergeBanner({
        brandName: mergedItem.brandName,
        previousStock: mergeResult.previousStock,
        newStock: mergeResult.newStock,
        addedStock: mergeResult.addedStock,
        batchNumber: mergedItem.batchNumber,
        unit: mergedItem.unit,
        timestamp: Date.now(),
        isNewBatchAdded: mergeResult.isNewBatchAdded,
        batchCount: mergeResult.batchCount
      });

      return mergedItem;
    }

    // Otherwise: New master item creation
    const newId = 'inv-' + Math.floor(1000 + Math.random() * 9000);
    const rack = itemData.rackNumber || 'Rack A';
    const shelf = itemData.shelfRow || 'Shelf 1';
    const bin = itemData.boxBin || 'Bin 01';
    const locationShelf = itemData.locationShelf || `${rack}-${shelf.replace(/[^0-9]/g, '') || '1'} • ${bin}`;
    const purchaseRate = itemData.purchaseRate ?? ((itemData.mrp ?? 50) * 0.65);
    const mrp = itemData.mrp ?? 50;

    const newItem: MedicationInventory = {
      id: newId,
      ndc: itemData.ndc || '00000-000-00',
      brandName: itemData.brandName.trim(),
      genericName: itemData.genericName || itemData.saltComposition || itemData.brandName,
      saltComposition: itemData.saltComposition || itemData.genericName || itemData.brandName,
      strength: itemData.strength || '500 mg',
      dosageForm: itemData.dosageForm || 'Tablet',
      category: itemData.category || 'General Pharmacy',
      scheduleClass: itemData.scheduleClass || 'Rx',
      batchNumber: itemData.batchNumber || ('BT-' + Math.floor(1000 + Math.random() * 9000)),
      mfgDate: itemData.mfgDate || itemData.manufacturingDate || '2025-01-01',
      manufacturingDate: itemData.manufacturingDate || itemData.mfgDate || '2025-01-01',
      expirationDate: itemData.expirationDate || '2027-12-31',
      mrp: mrp,
      purchaseRate: purchaseRate,
      costPrice: purchaseRate,
      sellingPrice: itemData.sellingPrice || mrp,
      stockQuantity: itemData.stockQuantity ?? 50,
      unit: itemData.unit || 'Strips',
      packSize: itemData.packSize ?? 10,
      reorderLevel: itemData.reorderLevel ?? 15,
      minAlertLevel: itemData.minAlertLevel ?? 15,
      gstRate: itemData.gstRate ?? 12,
      hsnCode: itemData.hsnCode || '300490',
      supplierName: itemData.supplierName || 'Primary Distributor',
      supplierContact: itemData.supplierContact || '+91 98765 43210',
      rackNumber: rack,
      shelfRow: shelf,
      boxBin: bin,
      locationShelf: locationShelf,
      manufacturer: itemData.manufacturer || 'Cipla / Sun Pharma',
      storageCondition: itemData.storageCondition || 'Room Temp (15-25°C)',
      autoReorder: itemData.autoReorder ?? true,
      quarantined: false,
      isNearExpiryDiscount: itemData.isNearExpiryDiscount ?? false,
      discountPercent: itemData.discountPercent ?? 0
    };

    setInventory(prev => [newItem, ...prev]);
    fetch(`/api/store/${storeId}/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem)
    }).catch(() => {});

    logActivity('New Medicine Stocked', `Added ${newItem.brandName} (${newItem.saltComposition}) - Rack: ${locationShelf}`, 'Inventory');
    addToast({
      type: 'success',
      title: 'Medicine Added to Inventory',
      message: `${newItem.brandName} stored at ${locationShelf} with Qty ${newItem.stockQuantity}.`
    });
    return newItem;
  };

  const addBulkInventoryItems = (itemsData: (Partial<MedicationInventory> & { brandName: string })[]): MedicationInventory[] => {
    let mergedCount = 0;
    let addedCount = 0;
    let lastMergedMedicine: MedicationInventory | null = null;
    let lastMergedPrevStock = 0;
    let lastMergedAddedStock = 0;
    const finalResultItems: MedicationInventory[] = [];

    setInventory(prev => {
      const workingList = [...prev];

      for (const itemData of itemsData) {
        if (!itemData.brandName?.trim()) continue;

        // Check if item matches existing in workingList
        const existingIdx = workingList.findIndex(item => isMatchingMedicine(item, itemData));

        if (existingIdx !== -1) {
          const mergeResult = mergeInventoryItem(workingList[existingIdx], itemData);
          workingList[existingIdx] = mergeResult.mergedItem;
          finalResultItems.push(mergeResult.mergedItem);
          mergedCount++;
          lastMergedMedicine = mergeResult.mergedItem;
          lastMergedPrevStock = mergeResult.previousStock;
          lastMergedAddedStock = mergeResult.addedStock;
        } else {
          const newId = 'inv-' + (Date.now() + Math.floor(Math.random() * 10000));
          const rack = itemData.rackNumber || 'Rack A';
          const shelf = itemData.shelfRow || 'Shelf 1';
          const bin = itemData.boxBin || 'Bin 01';
          const locationShelf = itemData.locationShelf || `${rack}-${shelf.replace(/[^0-9]/g, '') || '1'} • ${bin}`;
          const purchaseRate = itemData.purchaseRate ?? ((itemData.mrp ?? 50) * 0.65);
          const mrp = itemData.mrp ?? 50;

          const created: MedicationInventory = {
            id: newId,
            ndc: itemData.ndc || '00000-000-00',
            brandName: itemData.brandName.trim(),
            genericName: itemData.genericName || itemData.saltComposition || itemData.brandName,
            saltComposition: itemData.saltComposition || itemData.genericName || itemData.brandName,
            strength: itemData.strength || '500 mg',
            dosageForm: itemData.dosageForm || 'Tablet',
            category: itemData.category || 'General Pharmacy',
            scheduleClass: itemData.scheduleClass || 'Rx',
            batchNumber: itemData.batchNumber || ('BT-' + Math.floor(1000 + Math.random() * 9000)),
            mfgDate: itemData.mfgDate || itemData.manufacturingDate || '2025-01-01',
            manufacturingDate: itemData.manufacturingDate || itemData.mfgDate || '2025-01-01',
            expirationDate: itemData.expirationDate || '2027-12-31',
            mrp: mrp,
            purchaseRate: purchaseRate,
            costPrice: purchaseRate,
            sellingPrice: itemData.sellingPrice || mrp,
            stockQuantity: itemData.stockQuantity ?? 50,
            unit: itemData.unit || 'Strips',
            packSize: itemData.packSize ?? 10,
            reorderLevel: itemData.reorderLevel ?? 15,
            minAlertLevel: itemData.minAlertLevel ?? 15,
            gstRate: itemData.gstRate ?? 12,
            hsnCode: itemData.hsnCode || '300490',
            supplierName: itemData.supplierName || 'Distributor Import',
            supplierContact: itemData.supplierContact || '+91 98765 43210',
            rackNumber: rack,
            shelfRow: shelf,
            boxBin: bin,
            locationShelf: locationShelf,
            manufacturer: itemData.manufacturer || 'Pharmaceuticals',
            storageCondition: itemData.storageCondition || 'Room Temp (15-25°C)',
            autoReorder: itemData.autoReorder ?? true,
            quarantined: false,
            isNearExpiryDiscount: itemData.isNearExpiryDiscount ?? false,
            discountPercent: itemData.discountPercent ?? 0
          };

          workingList.unshift(created);
          finalResultItems.push(created);
          addedCount++;
        }
      }

      return workingList;
    });

    logActivity('Bulk Inventory Processed', `Processed ${itemsData.length} items (${mergedCount} merged into existing stock, ${addedCount} new)`, 'Inventory');

    if (mergedCount > 0 && lastMergedMedicine) {
      const med = lastMergedMedicine as MedicationInventory;
      setLastMergeBanner({
        brandName: med.brandName,
        previousStock: lastMergedPrevStock,
        newStock: med.stockQuantity,
        addedStock: lastMergedAddedStock,
        batchNumber: med.batchNumber,
        unit: med.unit,
        timestamp: Date.now()
      });
      addToast({
        type: 'success',
        title: 'Existing Medicine Found',
        message: 'Existing medicine found. Stock quantity updated.'
      });
    } else {
      addToast({
        type: 'success',
        title: 'Bulk Entry Completed',
        message: `Added ${addedCount} items to pharmacy inventory and rack layout.`
      });
    }

    return finalResultItems;
  };

  const updateInventoryItem = (id: string, updates: Partial<MedicationInventory>) => {
    setInventory(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, ...updates };
      if (updates.rackNumber || updates.shelfRow || updates.boxBin) {
        const rack = updates.rackNumber ?? item.rackNumber;
        const shelf = updates.shelfRow ?? item.shelfRow;
        const bin = updates.boxBin ?? item.boxBin;
        updated.locationShelf = `${rack}-${shelf.replace(/[^0-9]/g, '') || '1'} • ${bin}`;
      }
      if (updates.purchaseRate !== undefined) {
        updated.costPrice = updates.purchaseRate;
      }
      if (updates.mrp !== undefined && updates.sellingPrice === undefined) {
        updated.sellingPrice = updates.mrp;
      }

      // Synchronize batches array if not explicitly provided
      if (updates.batches) {
        updated.batches = updates.batches;
      } else if (item.batches && item.batches.length > 0) {
        const oldBatchNumber = item.batchNumber;
        const targetBatchIndex = item.batches.findIndex(b => b.batchNumber === oldBatchNumber);
        const activeIdx = targetBatchIndex !== -1 ? targetBatchIndex : 0;
        
        updated.batches = item.batches.map((b, idx) => {
          if (idx === activeIdx) {
            return {
              ...b,
              batchNumber: updates.batchNumber !== undefined ? updates.batchNumber : b.batchNumber,
              expirationDate: updates.expirationDate !== undefined ? updates.expirationDate : b.expirationDate,
              stockQuantity: updates.stockQuantity !== undefined ? updates.stockQuantity : b.stockQuantity,
              mrp: updates.mrp !== undefined ? updates.mrp : b.mrp,
              purchaseRate: updates.purchaseRate !== undefined ? updates.purchaseRate : b.purchaseRate
            };
          }
          return b;
        });
      }

      // Dynamic Sum Calculation: Ensure stockQuantity is always exactly the sum of all available batches
      if (updated.batches && updated.batches.length > 0) {
        updated.stockQuantity = updated.batches.reduce((sum, b) => sum + (Number(b.stockQuantity) || 0), 0);
      }

      return updated;
    }));

    fetch(`/api/store/${storeId}/inventory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    }).catch(() => {});

    logActivity('Medicine Inventory Updated', `Updated stock/expiry/location for item ID ${id}`, 'Inventory');
  };

  const updateInventoryStock = (id: string, changeQty: number, reason?: string, batchNumber?: string) => {
    setInventory(prev => prev.map(item => {
      if (item.id !== id) return item;
      let updatedBatches = item.batches ? item.batches.map(b => ({ ...b })) : [];
      if (updatedBatches.length > 0) {
        if (batchNumber) {
          const matchIdx = updatedBatches.findIndex(b => b.batchNumber === batchNumber);
          if (matchIdx !== -1) {
            updatedBatches[matchIdx] = {
              ...updatedBatches[matchIdx],
              stockQuantity: Math.max(0, (Number(updatedBatches[matchIdx].stockQuantity) || 0) + changeQty)
            };
          } else {
            updatedBatches[0] = {
              ...updatedBatches[0],
              stockQuantity: Math.max(0, (Number(updatedBatches[0].stockQuantity) || 0) + changeQty)
            };
          }
        } else {
          updatedBatches[0] = {
            ...updatedBatches[0],
            stockQuantity: Math.max(0, (Number(updatedBatches[0].stockQuantity) || 0) + changeQty)
          };
        }
      }
      const newStock = updatedBatches.length > 0
        ? updatedBatches.reduce((sum, b) => sum + (Number(b.stockQuantity) || 0), 0)
        : Math.max(0, item.stockQuantity + changeQty);
      return { ...item, stockQuantity: newStock, batches: updatedBatches };
    }));
    const target = inventory.find(i => i.id === id);
    logActivity('Stock Quantity Adjusted', `Adjusted ${target?.brandName || id} by ${changeQty > 0 ? '+' : ''}${changeQty} (${reason || 'Manual Adjustment'})`, 'Inventory');
  };

  const updateRackPosition = (id: string, rack: string, shelf: string, bin: string) => {
    const formatted = `${rack}-${shelf.replace(/[^0-9]/g, '') || '1'} • ${bin}`;
    setInventory(prev => prev.map(item => {
      if (item.id !== id) return item;
      return {
        ...item,
        rackNumber: rack,
        shelfRow: shelf,
        boxBin: bin,
        locationShelf: formatted
      };
    }));
    const target = inventory.find(i => i.id === id);
    logActivity('Physical Rack Relocated', `Moved ${target?.brandName || id} to ${formatted}`, 'Inventory');
    addToast({
      type: 'success',
      title: 'Rack Coordinates Updated',
      message: `${target?.brandName} now located at ${formatted}.`
    });
  };

  const deleteInventoryItem = (id: string, softArchive: boolean = true) => {
    const target = inventory.find(i => i.id === id);
    if (!target) return;

    if (softArchive) {
      setInventory(prev => prev.map(item => {
        if (item.id !== id) return item;
        return {
          ...item,
          isArchived: true,
          archivedAt: new Date().toISOString()
        };
      }));
      logActivity('Medicine Archived', `Archived ${target.brandName} (Batch: ${target.batchNumber}) from active inventory`, 'Inventory');
      addToast({
        type: 'info',
        title: 'Medicine Archived',
        message: `${target.brandName} has been archived and removed from active inventory.`
      });
    } else {
      setInventory(prev => prev.filter(item => item.id !== id));
      logActivity('Medicine Deleted', `Permanently removed ${target.brandName} (Batch: ${target.batchNumber})`, 'Inventory');
      addToast({
        type: 'info',
        title: 'Medicine Deleted',
        message: `${target.brandName} has been removed from inventory.`
      });
    }

    fetch(`/api/store/${storeId}/inventory/${id}`, {
      method: 'DELETE'
    }).catch(() => {});
  };

  const deleteBatch = (medicineId: string, batchIdOrNumber: string) => {
    const target = inventory.find(i => i.id === medicineId);
    if (!target) return;

    const batches = target.batches || [];
    const updatedBatches = batches.filter(
      b => b.id !== batchIdOrNumber && b.batchNumber !== batchIdOrNumber
    );

    const newStock = updatedBatches.reduce((sum, b) => sum + (Number(b.stockQuantity) || 0), 0);
    const nextDisplayBatch = updatedBatches.find(b => (Number(b.stockQuantity) || 0) > 0) || updatedBatches[0];

    const updates: Partial<MedicationInventory> = {
      batches: updatedBatches,
      stockQuantity: newStock,
      batchNumber: nextDisplayBatch ? nextDisplayBatch.batchNumber : target.batchNumber,
      expirationDate: nextDisplayBatch ? nextDisplayBatch.expirationDate : target.expirationDate
    };

    updateInventoryItem(medicineId, updates);

    addToast({
      type: 'info',
      title: 'Batch Deleted',
      message: `Batch removed. Total stock for ${target.brandName} is now ${newStock} ${target.unit}.`
    });
  };

  const updateBatch = (medicineId: string, batchIdOrNumber: string, batchUpdates: Partial<InventoryBatch>) => {
    const target = inventory.find(i => i.id === medicineId);
    if (!target) return;

    const batches = target.batches || [];
    const updatedBatches = batches.map(b => {
      if (b.id === batchIdOrNumber || b.batchNumber === batchIdOrNumber) {
        return {
          ...b,
          ...batchUpdates,
          stockQuantity: batchUpdates.stockQuantity !== undefined ? Number(batchUpdates.stockQuantity) : b.stockQuantity
        };
      }
      return b;
    });

    const newStock = updatedBatches.reduce((sum, b) => sum + (Number(b.stockQuantity) || 0), 0);
    const nextDisplayBatch = updatedBatches.find(b => (Number(b.stockQuantity) || 0) > 0) || updatedBatches[0];

    const updates: Partial<MedicationInventory> = {
      batches: updatedBatches,
      stockQuantity: newStock,
      batchNumber: nextDisplayBatch ? nextDisplayBatch.batchNumber : target.batchNumber,
      expirationDate: nextDisplayBatch ? nextDisplayBatch.expirationDate : target.expirationDate
    };

    updateInventoryItem(medicineId, updates);

    addToast({
      type: 'success',
      title: 'Batch Updated',
      message: `Batch details saved. Total available stock: ${newStock} ${target.unit}.`
    });
  };

  // Smart Stock Substitute Engine (Bioequivalent Exact Salt Matching)
  const findSubstitutes = (itemOrSalt: MedicationInventory | string, excludeId?: string): MedicationInventory[] => {
    if (!itemOrSalt) return [];

    let targetItem: MedicationInventory | null = null;
    if (typeof itemOrSalt === 'string') {
      targetItem = {
        id: excludeId || 'temp-query-id',
        brandName: itemOrSalt,
        genericName: itemOrSalt,
        saltComposition: itemOrSalt,
        strength: '',
      } as MedicationInventory;
    } else {
      targetItem = itemOrSalt;
    }

    return findExactSaltSubstitutes(targetItem, inventory, { requireInStock: true });
  };

  // 90-Day Expiry Engine Actions
  const applyNearExpiryDiscount = (id: string, discountPercent: number) => {
    setInventory(prev => prev.map(item => {
      if (item.id !== id) return item;
      const discountedPrice = Number((item.mrp * (1 - discountPercent / 100)).toFixed(2));
      return {
        ...item,
        isNearExpiryDiscount: true,
        discountPercent,
        sellingPrice: discountedPrice
      };
    }));
    const target = inventory.find(i => i.id === id);
    logActivity('Near-Expiry Discount Applied', `Applied ${discountPercent}% clearance discount on ${target?.brandName} (Exp: ${target?.expirationDate})`, 'Expiry');
    addToast({
      type: 'warning',
      title: 'Clearance Discount Applied',
      message: `${target?.brandName} marked down by ${discountPercent}%. New counter price updated.`
    });
  };

  const createDebitNoteReturn = (supplierName: string, items: { inventoryId: string; quantity: number; reason: string }[], notes?: string): DebitNote => {
    const debitNoteItems = items.map(it => {
      const inv = inventory.find(i => i.id === it.inventoryId);
      const purchaseRate = inv?.purchaseRate || inv?.costPrice || 0;
      return {
        inventoryId: it.inventoryId,
        brandName: inv?.brandName || 'Medicine',
        saltComposition: inv?.saltComposition || '',
        batchNumber: inv?.batchNumber || '',
        expiryDate: inv?.expirationDate || '',
        rackLocation: inv?.locationShelf || '',
        quantity: it.quantity,
        purchaseRate,
        totalCredit: Number((purchaseRate * it.quantity).toFixed(2)),
        reason: it.reason
      };
    });

    const totalAmount = Number(debitNoteItems.reduce((acc, curr) => acc + curr.totalCredit, 0).toFixed(2));
    const newDebitNote: DebitNote = {
      id: 'dbn-' + Date.now(),
      noteNumber: 'DBN-2026-' + Math.floor(100 + Math.random() * 900),
      supplierName,
      supplierContact: inventory.find(i => i.supplierName === supplierName)?.supplierContact || '+1 (800) 555-0000',
      date: TODAY_DATE,
      items: debitNoteItems,
      totalAmount,
      status: 'Sent to Supplier',
      notes: notes || 'Returned under 90-day distributor near-expiry credit policy.'
    };

    // Deduct inventory stock
    items.forEach(it => {
      updateInventoryStock(it.inventoryId, -it.quantity, `Debit Note ${newDebitNote.noteNumber} return`);
    });

    setDebitNotes(prev => [newDebitNote, ...prev]);
    logActivity('Supplier Debit Note Generated', `Created ${newDebitNote.noteNumber} for ${supplierName} (Total Credit: $${totalAmount})`, 'Expiry');
    addToast({
      type: 'success',
      title: 'Debit Note Generated',
      message: `${newDebitNote.noteNumber} issued for ${supplierName} ($${totalAmount}). Stock adjusted.`
    });
    return newDebitNote;
  };

  const quarantineItem = (id: string, reason: string) => {
    setInventory(prev => prev.map(item => {
      if (item.id !== id) return item;
      return {
        ...item,
        quarantined: true,
        rackNumber: 'Quarantine Bay',
        shelfRow: 'Shelf Q',
        boxBin: 'Biohazard Box 99',
        locationShelf: 'Quarantine Bay • Biohazard Box 99'
      };
    }));
    const target = inventory.find(i => i.id === id);
    logActivity('Medicine Quarantined', `Quarantined ${target?.brandName} (Batch: ${target?.batchNumber}). Reason: ${reason}`, 'Expiry');
    addToast({
      type: 'error',
      title: 'Stock Quarantined',
      message: `${target?.brandName} moved to Quarantine Bay. Blocked from POS billing.`
    });
  };

  // Prescription Actions
  const addPrescription = (rxData: Omit<Prescription, 'id' | 'rxNumber'>): Prescription => {
    const newId = 'rx-' + Math.floor(500 + Math.random() * 500);
    const newRxNumber = 'RX-' + Math.floor(1000000 + Math.random() * 9000000);
    const newRx: Prescription = {
      ...rxData,
      id: newId,
      rxNumber: newRxNumber,
    };
    setPrescriptions(prev => [newRx, ...prev]);
    setPatients(prev => prev.map(p => p.id === rxData.patientId ? {
      ...p,
      activePrescriptionsCount: p.activePrescriptionsCount + 1,
      lastVisitDate: TODAY_DATE
    } : p));
    logActivity('Prescription Logged', `Registered ${newRxNumber} for ${newRx.patientName} (${newRx.medicationName})`, 'Dispense');
    addToast({
      type: 'success',
      title: 'Prescription Added',
      message: `Prescription ${newRxNumber} entered into queue.`
    });
    return newRx;
  };

  const updatePrescriptionStatus = (id: string, newStatus: RxStatus, note?: string) => {
    setPrescriptions(prev => prev.map(rx => {
      if (rx.id !== id) return rx;
      return {
        ...rx,
        status: newStatus,
        pharmacistNotes: note ? `${rx.pharmacistNotes ? rx.pharmacistNotes + ' | ' : ''}${note}` : rx.pharmacistNotes,
        dateDispensed: newStatus === 'dispensed' ? TODAY_DATE : rx.dateDispensed
      };
    }));
    const target = prescriptions.find(r => r.id === id);
    logActivity('Prescription Status Updated', `Updated Rx ${target?.rxNumber} to ${newStatus}`, 'Dispense');
    addToast({
      type: 'info',
      title: 'Rx Status Updated',
      message: `Prescription status changed to ${newStatus.replace('_', ' ')}.`
    });
  };

  const processRefill = (id: string): boolean => {
    const rx = prescriptions.find(r => r.id === id);
    if (!rx || rx.refillsRemaining <= 0) {
      addToast({
        type: 'error',
        title: 'Refill Unavailable',
        message: 'No remaining refills on this prescription authorization.'
      });
      return false;
    }

    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + (rx.daysSupply || 30));

    setPrescriptions(prev => prev.map(r => {
      if (r.id !== id) return r;
      return {
        ...r,
        refillsRemaining: r.refillsRemaining - 1,
        lastRefillDate: TODAY_DATE,
        nextRefillDueDate: nextDueDate.toISOString().split('T')[0],
        status: 'ready_for_pickup'
      };
    }));

    logActivity('Refill Authorized', `Processed refill for ${rx.rxNumber} (${rx.patientName})`, 'Refill');
    addToast({
      type: 'success',
      title: 'Refill Processed',
      message: `Refill confirmed. Prescription is ready in dispensing bay.`
    });
    return true;
  };

  const dispensePrescription = (id: string) => {
    setPrescriptions(prev => prev.map(rx => rx.id === id ? {
      ...rx,
      status: 'dispensed',
      dateDispensed: TODAY_DATE
    } : rx));
    const target = prescriptions.find(r => r.id === id);
    logActivity('Prescription Dispensed', `Dispensed ${target?.rxNumber} to ${target?.patientName}`, 'Dispense');
    addToast({
      type: 'success',
      title: 'Dispense Completed',
      message: `Prescription handed off to patient.`
    });
  };

  const deletePrescription = (id: string) => {
    const target = prescriptions.find(r => r.id === id);
    setPrescriptions(prev => prev.filter(r => r.id !== id));
    logActivity('Prescription Archived', `Archived ${target?.rxNumber || id}`, 'Dispense');
    addToast({
      type: 'warning',
      title: 'Prescription Removed',
      message: 'Prescription record archived.'
    });
  };

  // Prescriber Actions
  const addPrescriber = (data: Omit<Prescriber, 'id'>): Prescriber => {
    const newDoc: Prescriber = {
      ...data,
      id: 'dr-' + Math.floor(200 + Math.random() * 800)
    };
    setPrescribers(prev => [newDoc, ...prev]);
    logActivity('Prescriber Registered', `Registered ${newDoc.name} (${newDoc.clinicName})`, 'Clinical');
    addToast({
      type: 'success',
      title: 'Prescriber Profile Created',
      message: `${newDoc.name} added to provider directory.`
    });
    return newDoc;
  };

  const addPrescriberCommunication = (prescriberId: string, note: string) => {
    setPrescribers(prev => prev.map(doc => {
      if (doc.id !== prescriberId) return doc;
      return {
        ...doc,
        communicationNotes: [
          { date: TODAY_DATE, note, author: currentPharmacist },
          ...doc.communicationNotes
        ]
      };
    }));
    logActivity('Provider Communication Logged', `Logged consult note for Doctor ID ${prescriberId}`, 'Clinical');
    addToast({
      type: 'info',
      title: 'Communication Note Logged',
      message: 'Consultation logged into prescriber chart.'
    });
  };

  // Outreach Campaigns
  const createCampaign = (campaignData: Omit<OutreachCampaign, 'id' | 'deliveredCount' | 'responseRate'>): OutreachCampaign => {
    const newCamp: OutreachCampaign = {
      ...campaignData,
      id: 'camp-' + Math.floor(300 + Math.random() * 700),
      deliveredCount: 0,
      responseRate: 0
    };
    setCampaigns(prev => [newCamp, ...prev]);
    logActivity('Campaign Scheduled', `Created ${newCamp.title} via ${newCamp.channel.toUpperCase()}`, 'Campaign');
    addToast({
      type: 'success',
      title: 'Outreach Campaign Created',
      message: `${newCamp.title} scheduled for delivery.`
    });
    return newCamp;
  };

  const triggerCampaign = (id: string) => {
    const target = campaigns.find(c => c.id === id);
    if (!target) return;
    const delivered = target.totalAudience;
    const responseRate = Math.floor(65 + Math.random() * 25);
    setCampaigns(prev => prev.map(c => c.id === id ? {
      ...c,
      status: 'completed',
      deliveredCount: delivered,
      responseRate,
      lastTriggered: TODAY_DATE
    } : c));
    logActivity('Campaign Broadcast Sent', `Triggered outreach "${target.title}" to ${delivered} recipients`, 'Campaign');
    addToast({
      type: 'success',
      title: 'Campaign Broadcast Sent',
      message: `Dispatched to ${delivered} patients via ${target.channel.toUpperCase()}.`
    });
  };

  const updateCampaignStatus = (id: string, status: OutreachCampaign['status']) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };

  // POS / Counter Checkout Action
  const completePosTransaction = (transactionData: Omit<PointOfSaleTransaction, 'id' | 'invoiceNumber' | 'timestamp'>): PointOfSaleTransaction => {
    const newInvoiceNo = 'INV-2026-' + Math.floor(8000 + Math.random() * 2000);
    const newTx: PointOfSaleTransaction = {
      ...transactionData,
      id: 'pos-' + Date.now(),
      invoiceNumber: newInvoiceNo,
      receiptNumber: 'REC-' + newInvoiceNo.split('-')[2],
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      cashierName: currentPharmacist.split(',')[0],
      pharmacistStaff: currentPharmacist
    };

    // Deduct stock for all items
    transactionData.items.forEach(item => {
      if (item.inventoryId) {
        updateInventoryStock(item.inventoryId, -item.quantity, `POS Sale ${newInvoiceNo}`, item.batchNumber);
      }
    });

    // Update patient loyalty points & balance if customer is identified
    if (transactionData.patientId && transactionData.patientId !== 'walk-in') {
      const points = Math.floor(transactionData.grandTotal / 10);
      setPatients(prev => prev.map(p => {
        if (p.id !== transactionData.patientId) return p;
        let newBalance = p.creditBalanceDue || 0;
        if (transactionData.paymentMethod?.includes('Udhaar') || transactionData.paymentMethod?.includes('Credit')) {
          newBalance += transactionData.grandTotal;
        }
        return {
          ...p,
          loyaltyPoints: (p.loyaltyPoints || 0) + points,
          creditBalanceDue: newBalance,
          creditBalance: newBalance,
          lastVisitDate: TODAY_DATE
        };
      }));

      // If billed on Udhaar / Credit, record in Khata Ledger
      if (transactionData.paymentMethod?.includes('Udhaar') || transactionData.paymentMethod?.includes('Credit')) {
        const patient = patients.find(p => p.id === transactionData.patientId);
        const currentBal = (patient?.creditBalanceDue || 0) + transactionData.grandTotal;
        const newKhataEntry: KhataLedgerEntry = {
          id: 'kht-' + Date.now(),
          patientId: transactionData.patientId,
          customerName: transactionData.patientName || `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim() || 'Customer',
          customerPhone: transactionData.customerPhone || patient?.phone || '',
          type: 'debit',
          amount: transactionData.grandTotal,
          balanceAfter: currentBal,
          invoiceNumber: newInvoiceNo,
          paymentMethod: transactionData.paymentMethod,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          notes: `Counter Sale #${newInvoiceNo} on Udhaar / Credit`,
          recordedBy: currentPharmacist.split(',')[0]
        };
        setKhataLedger(prev => [newKhataEntry, ...prev]);
      }
    }

    setTransactions(prev => [newTx, ...prev]);
    
    // Live POS to Admin Sync:
    // Append bill to store's salesHistory, update dailySalesTotal and totalSalesCount in real-time in persistent state / localStorage (pharmpulse_stores)
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      recordStoreSaleInRegistry(storeId, {
        billId: newInvoiceNo,
        amount: newTx.grandTotal,
        items: newTx.items ? newTx.items.length : 1,
        timestamp: newTx.timestamp,
        date: todayStr,
        customerName: newTx.patientName || 'Walk-in Customer',
        paymentMethod: newTx.paymentMethod || 'Cash'
      });
    } catch (err) {
      console.warn('Failed to sync bill to store registry', err);
    }

    // Sync POS bill to backend for multi-device sync
    fetch(`/api/store/${storeId}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTx)
    }).catch(() => {});

    logActivity('POS Invoice Generated', `Billed Invoice ${newInvoiceNo} for ${newTx.patientName} (₹${newTx.grandTotal.toFixed(2)} via ${newTx.paymentMethod})`, 'POS');
    
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.85 }
      });
    } catch (e) {
      // fallback
    }

    addToast({
      type: 'success',
      title: 'Counter Sale Billed',
      message: `Invoice ${newInvoiceNo} generated (₹${newTx.grandTotal.toFixed(2)}). Inventory stock updated.`
    });
    return newTx;
  };

  // WhatsApp Bill / Receipt Dispatcher
  const formatWhatsAppInvoice = (tx: PointOfSaleTransaction, patientPhone?: string) => {
    const rawPhone = (patientPhone || tx?.customerPhone || tx?.contactNumber || tx?.patientPhone || '').replace(/[^0-9]/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

    // Calculate 30-day chronic refill date
    const refillDate = new Date();
    refillDate.setDate(refillDate.getDate() + 30);
    const refillDateStr = refillDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const items = tx?.items || [];
    const totalSavingsVal = Number(tx?.totalSavings ?? (items.reduce((s, it) => s + (it.totalSavings || 0), 0) + (tx?.discountAmount || 0)));

    const itemsFormatted = items.map((item, idx) => {
      const name = item?.brandName || item?.medicationName || item?.genericName || 'Medicine Item';
      const batchStr = item?.batchNumber ? ` [Batch: ${item.batchNumber}]` : '';
      const rackStr = item?.rackLocation ? ` [Rack: ${item.rackLocation}]` : '';
      const qty = Number(item?.quantity || 1);
      const price = Number(item?.unitPrice || item?.sellingPrice || item?.mrp || 0);
      const total = Number(item?.totalPrice || item?.totalAmount || (price * qty));
      const mrp = Number(item?.mrp || item?.originalPrice || price);
      const gst = item?.gstRate ?? 12;
      
      let offerNote = '';
      if (item.offerType === 'percentage' && item.offerValue) {
        offerNote = ` (🏷️ ${item.offerValue}% OFF)`;
      } else if (item.offerType === 'flat' && item.offerValue) {
        offerNote = ` (🏷️ ₹${item.offerValue} OFF)`;
      } else if (item.offerType === 'scheme' && item.freeQuantity && item.freeQuantity > 0) {
        offerNote = ` (🎁 +${item.freeQuantity} FREE)`;
      } else if (item.offerLabel) {
        offerNote = ` (✨ ${item.offerLabel})`;
      }

      return `${idx + 1}. *${name}* × ${qty}${offerNote}${batchStr}${rackStr}\n   ₹${total.toFixed(2)} (MRP ₹${mrp.toFixed(2)} • GST ${gst}%)`;
    }).join('\n');

    const storeTitle = (shopSettings?.shopName || shopSettings?.storeName || 'PHARMPULSE HEALTHCARE').toUpperCase();
    const invNo = tx?.invoiceNumber || tx?.receiptNumber || '#INV-1001';
    const txTime = tx?.timestamp || new Date().toLocaleString();
    const custName = tx?.customerName || tx?.patientName || 'Walk-in Customer';
    const subtotalVal = Number(tx?.subtotal ?? (tx?.grandTotal || 0));
    const gstVal = Number(tx?.gstTotal ?? tx?.taxTotal ?? tx?.tax ?? 0);
    const discVal = Number(tx?.discountTotal ?? tx?.discountAmount ?? 0);
    const grandVal = Number(tx?.grandTotal ?? 0);
    const payMode = tx?.paymentMode || tx?.paymentMethod || 'Cash';

    const lines = [
      `🏥 *${storeTitle}*`,
      `${shopSettings?.address || 'Medical Store'}`,
      `DL No: *${shopSettings?.dlNumber || shopSettings?.drugLicense || 'DL-VALID'}* | GSTIN: *${shopSettings?.gstin || 'GST-REGISTERED'}*`,
      `📞 Helplines: ${shopSettings?.phone || ''}`,
      `───────────────────────────────`,
      `🧾 *TAX INVOICE / CASH MEMO*`,
      `*Invoice No:* ${invNo}`,
      `*Date & Time:* ${txTime}`,
      `*Customer Name:* ${custName}`,
      rawPhone ? `*Mobile:* ${rawPhone}` : null,
      (tx?.prescriberName || tx?.doctorName) ? `*Doctor Reference:* ${tx?.prescriberName || tx?.doctorName}` : null,
      `───────────────────────────────`,
      `*PURCHASED MEDICINES:*`,
      itemsFormatted || 'No items listed',
      `───────────────────────────────`,
      `*Subtotal (Taxable + MRP):* ₹${subtotalVal.toFixed(2)}`,
      gstVal > 0 ? `*GST (CGST+SGST):* ₹${gstVal.toFixed(2)}` : null,
      discVal > 0 ? `*Discount Savings:* -₹${discVal.toFixed(2)}` : null,
      totalSavingsVal > 0 ? `*🎉 Total Scheme / Offer Savings:* *₹${totalSavingsVal.toFixed(2)}*` : null,
      (tx?.roundOff && tx.roundOff !== 0) ? `*Round-off:* ${tx.roundOff > 0 ? '+' : ''}₹${Number(tx.roundOff).toFixed(2)}` : null,
      `*TOTAL AMOUNT PAID:* *₹${grandVal.toFixed(2)}*`,
      `*Payment Status:* ${payMode} (PAID / CONFIRMED)`,
      shopSettings?.upiId ? `*UPI ID:* ${shopSettings.upiId}` : null,
      `───────────────────────────────`,
      `📅 *Next Refill Date Reminder:* *${refillDateStr}*`,
      `💡 _Please bring this invoice / WhatsApp memo for easy repeat refill dispatch._`,
      `_${shopSettings?.footerNote || 'Get well soon!'}_`
    ].filter(Boolean).join('\n');

    const encoded = encodeURIComponent(lines);
    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    return {
      text: lines,
      waUrl
    };
  };

  // Digital Khata / Udhaar Settlement
  const recordKhataPayment = (patientId: string, amount: number, paymentMethod: string = 'Cash', notes?: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const currentDue = patient.creditBalanceDue || patient.creditBalance || 0;
    const newDue = Math.max(0, currentDue - amount);

    setPatients(prev => prev.map(p => {
      if (p.id !== patientId) return p;
      return {
        ...p,
        creditBalanceDue: newDue,
        creditBalance: newDue,
        lastVisitDate: TODAY_DATE
      };
    }));

    const ledgerEntry: KhataLedgerEntry = {
      id: 'kht-' + Date.now(),
      patientId,
      customerName: `${patient.firstName} ${patient.lastName}`.trim(),
      customerPhone: patient.phone,
      type: 'credit',
      amount,
      balanceAfter: newDue,
      paymentMethod,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      notes: notes || `Khata payment received via ${paymentMethod}`,
      recordedBy: currentPharmacist.split(',')[0]
    };

    setKhataLedger(prev => [ledgerEntry, ...prev]);
    logActivity('Khata Payment Settled', `Received ₹${amount.toFixed(2)} from ${patient.firstName} ${patient.lastName} via ${paymentMethod}. New Due: ₹${newDue.toFixed(2)}`, 'CRM');
    
    addToast({
      type: 'success',
      title: 'Khata Payment Settled',
      message: `Received ₹${amount.toFixed(2)} from ${patient.firstName} ${patient.lastName}. Remaining Balance: ₹${newDue.toFixed(2)}.`
    });
  };

  // WhatsApp Khata Payment Reminder with UPI Link
  const sendWhatsAppKhataReminder = (patientId: string, customMsg?: string): string => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return '';

    const cleanPhone = (patient.phone || '').replace(/[^0-9]/g, '');
    const amountDue = (patient.creditBalanceDue || patient.creditBalance || 0).toFixed(2);
    const upiId = shopSettings.upiId || 'apexmedicos@okhdfcbank';
    const storeName = shopSettings.shopName || shopSettings.storeName || 'PharmPulse Pharmacy';

    const message = [
      `Namaste ${patient.firstName} 🙏,`,
      ``,
      `This is a gentle payment reminder from *${storeName.toUpperCase()}*.`,
      `Your outstanding Khata / Udhaar balance is: *₹${amountDue}*.`,
      ``,
      `💳 *Quick UPI Payment Details:*`,
      `• Store UPI ID: *${upiId}*`,
      `• Google Pay / PhonePe / Paytm / BHIM UPI`,
      ``,
      `🔗 *1-Click UPI Payment Link:*`,
      `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(storeName)}&am=${amountDue}&cu=INR`,
      ``,
      customMsg ? `*Note:* ${customMsg}\n` : null,
      `Thank you for your prompt clearance & ongoing patronage!`,
      `📞 *Pharmacy Helpline:* ${shopSettings.phone}`,
      `_${shopSettings.address}_`
    ].filter(Boolean).join('\n');

    const encoded = encodeURIComponent(message);
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const waUrl = targetPhone ? `https://wa.me/${targetPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;

    logActivity('Khata WhatsApp Reminder Sent', `Sent WhatsApp payment reminder to ${patient.firstName} ${patient.lastName} (Due: ₹${amountDue})`, 'CRM');
    addToast({
      type: 'success',
      title: 'WhatsApp Reminder Ready',
      message: `Dispatched payment request for ₹${amountDue} to ${patient.firstName}.`
    });

    window.open(waUrl, '_blank');
    return waUrl;
  };

  // Chronic Patient 30-Day Auto Cycle Enrollment
  const enrollChronicPatient = (
    patientName: string,
    patientPhone: string,
    items: PosBillItem[],
    doctorName?: string,
    cycleDays: number = 30
  ): Patient => {
    const cleanPhone = (patientPhone || '').replace(/[^0-9]/g, '');
    const existingPatient = patients.find(p => p.phone.replace(/[^0-9]/g, '') === cleanPhone);

    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + cycleDays);
    const nextDueDateStr = nextDueDate.toISOString().split('T')[0];

    const newChronicMeds: ChronicMedicationEntry[] = items.map((it, idx) => ({
      id: 'cm-' + Date.now() + '-' + idx,
      medicineName: it.medicationName || it.brandName,
      brandName: it.brandName,
      genericSalt: it.saltComposition || it.genericName || it.medicationName,
      dosage: '1 unit daily',
      dosageInstructions: 'As prescribed by doctor (30-day refill cycle)',
      packQuantity: it.quantity * (it.packSize || 10),
      daysSupply: cycleDays,
      lastRefillDate: TODAY_DATE,
      nextRefillDueDate: nextDueDateStr,
      nextDueDate: nextDueDateStr,
      reminderStatus: 'pending',
      notes: `Enrolled via POS Checkout (${cycleDays}-Day Cycle) [Batch: ${it.batchNumber || 'N/A'}]`
    }));

    if (existingPatient) {
      const updatedMeds = [...existingPatient.chronicMedications, ...newChronicMeds];
      const updatedTags = existingPatient.tags.includes('Chronic Care')
        ? existingPatient.tags
        : [...existingPatient.tags, 'Chronic Care' as const];
      
      const updatedPat = {
        ...existingPatient,
        chronicMedications: updatedMeds,
        tags: updatedTags,
        lastVisitDate: TODAY_DATE
      };

      setPatients(prev => prev.map(p => p.id === existingPatient.id ? updatedPat : p));
      logActivity('Chronic Patient Cycle Updated', `Added ${newChronicMeds.length} 30-day chronic medicines for ${existingPatient.firstName} ${existingPatient.lastName}`, 'CRM');
      addToast({
        type: 'success',
        title: '30-Day Chronic Refill Enrolled',
        message: `${existingPatient.firstName} ${existingPatient.lastName} scheduled for next refill on ${nextDueDateStr}.`
      });
      return updatedPat;
    } else {
      const nameParts = patientName.trim().split(' ');
      const firstName = nameParts[0] || 'Patient';
      const lastName = nameParts.slice(1).join(' ') || 'Customer';

      const newPat: Patient = {
        id: 'pat-' + Date.now(),
        mrn: 'MRN-' + Math.floor(100000 + Math.random() * 900000),
        firstName,
        lastName,
        dob: '1980-01-01',
        gender: 'Other',
        phone: patientPhone || '+919876543210',
        email: `${firstName.toLowerCase()}@customer.mail`,
        address: 'Counter Customer',
        doctorReference: doctorName || 'Dr. Self / Direct Counter',
        insuranceProvider: 'Self-Pay / Commercial',
        copayTier: 'Standard',
        adherenceScore: 95,
        chronicConditions: ['Monthly Chronic Care'],
        allergies: [],
        tags: ['Chronic Care', 'VIP'],
        loyaltyPoints: 50,
        creditBalanceDue: 0,
        chronicMedications: newChronicMeds,
        preferredContact: 'WhatsApp',
        notes: `Enrolled in 30-day chronic refill cycle via POS on ${TODAY_DATE}`,
        lastVisitDate: TODAY_DATE,
        createdAt: TODAY_DATE
      };

      setPatients(prev => [newPat, ...prev]);
      logActivity('New Chronic Patient Enrolled', `Created profile & scheduled 30-day refill cycle for ${newPat.firstName} ${newPat.lastName}`, 'CRM');
      addToast({
        type: 'success',
        title: 'Chronic Patient Enrolled',
        message: `Enrolled ${newPat.firstName} in 30-day refill cycle (Due: ${nextDueDateStr}).`
      });
      return newPat;
    }
  };

  // Daily Shortage Book WhatsApp Purchase Order Generator
  const formatDistributorWhatsAppOrder = (supplierName: string, items: ShortageOrderItem[]) => {
    const storeName = shopSettings.shopName || shopSettings.storeName || 'PharmPulse Pharmacy';
    const rawContact = items[0]?.supplierContact?.replace(/[^0-9]/g, '') || '';
    const cleanPhone = rawContact.length === 10 ? `91${rawContact}` : rawContact;

    const totalEstimated = items.reduce((sum, it) => sum + (it.purchaseRate * it.orderQty), 0);

    const itemsList = items.map((it, idx) => {
      return `${idx + 1}. *${it.brandName}* (${it.saltComposition || 'Standard'})\n   • Order Qty: *${it.orderQty} ${it.unit || 'Strips'}* | Current Shelf: ${it.currentStock}\n   • Est. PTR: ₹${it.purchaseRate.toFixed(2)} (MRP ₹${it.mrp.toFixed(2)})`;
    }).join('\n\n');

    const message = [
      `📦 *PURCHASE ORDER - DAILY SHORTAGE BOOK*`,
      `*To:* ${supplierName}`,
      `*From:* ${storeName.toUpperCase()}`,
      `*Drug License No:* ${shopSettings.dlNumber}`,
      `*GSTIN:* ${shopSettings.gstin}`,
      `*Store Address:* ${shopSettings.address}`,
      `*Contact Phone:* ${shopSettings.phone}`,
      `*Date:* ${TODAY_DATE}`,
      `───────────────────────────────`,
      `Dear *${supplierName}*,`,
      `Please arrange urgent dispatch for the following shortage medicines to our dispensary:`,
      ``,
      itemsList,
      ``,
      `───────────────────────────────`,
      `*Total Line Items:* ${items.length}`,
      `*Estimated Total Order Value:* *₹${totalEstimated.toFixed(2)}*`,
      `📍 *Delivery Instructions:* Urgent delivery to counter dispensary.`,
      `───────────────────────────────`,
      `_Generated via ${storeName} Daily Shortage Book_`
    ].join('\n');

    const encoded = encodeURIComponent(message);
    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    return { text: message, waUrl };
  };

  // Save Distributor Purchase Order Record
  const savePurchaseOrder = (supplierName: string, items: ShortageOrderItem[], notes?: string): DistributorPurchaseOrder => {
    const totalAmount = items.reduce((sum, it) => sum + (it.purchaseRate * it.orderQty), 0);
    const newPO: DistributorPurchaseOrder = {
      id: 'po-' + Date.now(),
      poNumber: 'PO-2026-' + Math.floor(1000 + Math.random() * 9000),
      supplierName,
      supplierContact: items[0]?.supplierContact || '+91 98765 43210',
      date: TODAY_DATE,
      items,
      totalItems: items.length,
      totalEstimatedAmount: totalAmount,
      status: 'Sent via WhatsApp',
      notes: notes || `Purchase order created from daily shortage book.`
    };

    setPurchaseOrders(prev => [newPO, ...prev]);
    logActivity('Purchase Order Created', `Created PO ${newPO.poNumber} for ${supplierName} (${items.length} items, ₹${totalAmount.toFixed(2)})`, 'Inventory');
    addToast({
      type: 'success',
      title: 'Purchase Order Saved',
      message: `PO ${newPO.poNumber} generated for ${supplierName} (₹${totalAmount.toFixed(2)}).`
    });
    return newPO;
  };

  // Sales Returns & Refunds (Credit Note System)
  const processSalesReturn = (params: {
    originalInvoiceId: string;
    itemsToReturn: {
      inventoryId: string;
      brandName: string;
      batchNumber: string;
      originalQuantity: number;
      returnQuantity: number;
      unitPrice: number;
      gstRate: number;
      refundAmount: number;
      reason: string;
      restocked?: boolean;
    }[];
    refundMethod: 'Cash' | 'Khata Credit' | 'Store Credit Note' | 'UPI Transfer';
    notes?: string;
  }): SalesReturnRecord => {
    const origInvoice = transactions.find(t => t.id === params.originalInvoiceId || t.invoiceNumber === params.originalInvoiceId);
    const creditNoteNo = 'CN-2026-' + Math.floor(7000 + Math.random() * 3000);
    const totalRefund = Number(params.itemsToReturn.reduce((sum, it) => sum + (it.refundAmount || 0), 0).toFixed(2));

    // 1. Restore Inventory stock for restocked items
    params.itemsToReturn.forEach(item => {
      if (item.inventoryId && item.returnQuantity > 0) {
        updateInventoryStock(item.inventoryId, item.returnQuantity, `Sales Return refund from #${origInvoice?.invoiceNumber || params.originalInvoiceId}`);
      }
    });

    // 2. If refund method is Khata Credit and patient exists, adjust patient balance
    if (params.refundMethod === 'Khata Credit' && origInvoice?.patientId && origInvoice.patientId !== 'walk-in') {
      const patient = patients.find(p => p.id === origInvoice.patientId);
      if (patient) {
        const currentBal = patient.creditBalanceDue || 0;
        const newBal = Math.max(0, currentBal - totalRefund);
        setPatients(prev => prev.map(p => p.id === origInvoice.patientId ? {
          ...p,
          creditBalanceDue: newBal,
          creditBalance: newBal
        } : p));

        const khataEntry: KhataLedgerEntry = {
          id: 'kht-' + Date.now(),
          patientId: origInvoice.patientId,
          customerName: origInvoice.customerName || `${patient.firstName} ${patient.lastName}`.trim(),
          customerPhone: origInvoice.customerPhone || patient.phone || '',
          type: 'credit',
          amount: totalRefund,
          balanceAfter: newBal,
          invoiceNumber: creditNoteNo,
          paymentMethod: 'Credit Note / Sales Return',
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          notes: `Sales return refund for #${origInvoice.invoiceNumber || 'INV'} credited to Khata`,
          recordedBy: currentPharmacist.split(',')[0]
        };
        setKhataLedger(prev => [khataEntry, ...prev]);
      }
    }

    const returnRecord: SalesReturnRecord = {
      id: 'ret-' + Date.now(),
      creditNoteNumber: creditNoteNo,
      originalInvoiceId: origInvoice?.id || params.originalInvoiceId,
      originalInvoiceNumber: origInvoice?.invoiceNumber || params.originalInvoiceId,
      customerName: origInvoice?.customerName || origInvoice?.patientName || 'Customer',
      customerPhone: origInvoice?.customerPhone || origInvoice?.patientPhone || '',
      patientId: origInvoice?.patientId,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      items: params.itemsToReturn.map(it => ({
        ...it,
        restocked: true
      })),
      totalRefundAmount: totalRefund,
      refundMethod: params.refundMethod,
      handledBy: currentPharmacist.split(',')[0],
      notes: params.notes
    };

    setSalesReturns(prev => [returnRecord, ...prev]);

    logActivity('Sales Return Processed', `Credit Note ${creditNoteNo} issued for ${returnRecord.customerName} (Refund: ₹${totalRefund.toFixed(2)} via ${params.refundMethod})`, 'POS');
    
    addToast({
      type: 'success',
      title: 'Sales Return Completed',
      message: `Credit Note ${creditNoteNo} issued. ₹${totalRefund.toFixed(2)} refunded via ${params.refundMethod}. Inventory restored.`
    });

    return returnRecord;
  };

  const formatWhatsAppCreditNote = (returnRecord: SalesReturnRecord) => {
    const rawPhone = (returnRecord.customerPhone || '').replace(/[^0-9]/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const storeTitle = (shopSettings?.shopName || shopSettings?.storeName || 'Apex Medicos').toUpperCase();

    const itemsSummary = returnRecord.items.map((it, idx) => 
      `${idx + 1}. *${it.brandName}* (Qty: ${it.returnQuantity})\n   Refund: ₹${it.refundAmount.toFixed(2)} [Reason: ${it.reason}]`
    ).join('\n');

    const lines = [
      `🏥 *${storeTitle}*`,
      `📄 *SALES RETURN / CREDIT NOTE*`,
      `───────────────────────────────`,
      `*Credit Note No:* *${returnRecord.creditNoteNumber}*`,
      `*Original Invoice:* #${returnRecord.originalInvoiceNumber}`,
      `*Date & Time:* ${returnRecord.timestamp}`,
      `*Customer:* ${returnRecord.customerName}`,
      `───────────────────────────────`,
      `*RETURNED MEDICINES:*`,
      itemsSummary,
      `───────────────────────────────`,
      `*TOTAL REFUND AMOUNT:* *₹${returnRecord.totalRefundAmount.toFixed(2)}*`,
      `*Refund Mode:* ${returnRecord.refundMethod}`,
      `*Handled By:* ${returnRecord.handledBy}`,
      returnRecord.notes ? `*Notes:* ${returnRecord.notes}` : null,
      `───────────────────────────────`,
      `_Inventory stock has been restored. Thank you for your cooperation!_`,
      `📞 *Helpline:* ${shopSettings?.phone || '+91 98765 43210'}`
    ].filter(Boolean).join('\n');

    const encoded = encodeURIComponent(lines);
    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    return { text: lines, waUrl };
  };

  // MTM & Clinical Actions
  const addMTMReview = (reviewData: Omit<MTMReview, 'id' | 'date'>): MTMReview => {
    const newReview: MTMReview = {
      ...reviewData,
      id: 'mtm-' + Date.now(),
      date: TODAY_DATE
    };
    setMtmReviews(prev => [newReview, ...prev]);
    logActivity('MTM Care Review Logged', `Completed comprehensive Medication Therapy Review for ${newReview.patientName}`, 'Clinical');
    addToast({
      type: 'success',
      title: 'MTM Review Logged',
      message: 'Comprehensive clinical evaluation and care plan saved.'
    });
    return newReview;
  };

  // AI Helpers
  const screenInteractions = async (meds: string[], allergies: string[], conditions: string[], newRx?: string): Promise<ClinicalScreeningResult | null> => {
    try {
      const response = await fetch('/api/clinical/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medications: meds, allergies, conditions, newMedication: newRx })
      });
      if (!response.ok) throw new Error('Clinical screening request failed');
      const data = await response.json();
      return data.result;
    } catch (e) {
      console.warn('Using client-side fallback screening logic:', e);
      // Realistic Fallback Screening
      const allMedsStr = [...meds, newRx || ''].join(' ').toLowerCase();
      const hasWarfarin = allMedsStr.includes('warfarin') || allMedsStr.includes('coumadin');
      const hasNsaid = allMedsStr.includes('aspirin') || allMedsStr.includes('ibuprofen') || allMedsStr.includes('naproxen');
      const hasAce = allMedsStr.includes('lisinopril') || allMedsStr.includes('enalapril') || allMedsStr.includes('ramipril');

      const interactions: any[] = [];
      if (hasWarfarin && hasNsaid) {
        interactions.push({
          severity: 'CRITICAL',
          drugsInvolved: ['Warfarin', 'NSAID / Aspirin'],
          mechanism: 'Synergistic inhibition of platelet aggregation and gastric mucosal erosion.',
          clinicalEffect: 'Severely elevated gastrointestinal bleed risk and INR destabilization.',
          actionRecommendation: 'Avoid concurrent NSAID use. Consider Acetaminophen (Paracetamol ≤ 2g/day) or topical analgesic.'
        });
      }
      if (hasAce && allMedsStr.includes('potassium')) {
        interactions.push({
          severity: 'MAJOR',
          drugsInvolved: ['ACE Inhibitor', 'Potassium Supplement'],
          mechanism: 'Reduced aldosterone synthesis leading to potassium retention.',
          clinicalEffect: 'Severe hyperkalemia, cardiac arrhythmias.',
          actionRecommendation: 'Monitor serum potassium within 1-2 weeks of initiation.'
        });
      }

      return {
        overallRiskLevel: interactions.length > 0 ? (interactions.some(i => i.severity === 'CRITICAL') ? 'CRITICAL' : 'HIGH') : 'LOW',
        summary: interactions.length > 0 ? 'Potential clinical drug interactions detected requiring pharmacist counseling.' : 'No major contraindicated drug-drug interactions detected.',
        interactions,
        allergyAlerts: allergies.filter(a => allMedsStr.includes(a.toLowerCase())).map(a => ({
          allergen: a,
          crossReactivityRisk: 'High Cross-Reactivity Risk',
          notes: `Patient is flagged as allergic to ${a}. Confirm tolerance before dispensing.`
        })),
        diseasePrecautions: conditions.map(c => ({
          condition: c,
          risk: `Standard monitoring advised for ${c}.`
        })),
        pharmacistCounselingPoints: [
          'Verify patient understanding of dosing schedule and food intake.',
          'Instruct patient on expected onset and symptoms that warrant physician notification.'
        ]
      };
    }
  };

  const generatePatientGuide = async (medName: string, dosage: string, sig: string, patientName: string, lang: string, condition?: string) => {
    try {
      const res = await fetch('/api/clinical/patient-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicationName: medName, dosage, sig, patientName, targetLanguage: lang, condition })
      });
      if (res.ok) {
        const data = await res.json();
        return data.guide;
      }
    } catch (e) {
      console.error(e);
    }
    return {
      title: `Medication Information: ${medName}`,
      overview: `${medName} is prescribed for ${condition || 'your health condition'}. Follow instructions carefully.`,
      howToTake: sig,
      keyBenefits: ['Helps stabilize chronic symptoms', 'Prevents disease progression with daily compliance'],
      commonSideEffects: ['Mild nausea or upset stomach', 'Dizziness when standing up fast'],
      whenToContactDoctor: ['Sudden rash or swelling', 'Severe breathing difficulty'],
      storageAdvice: 'Store at room temperature away from excessive moisture.'
    };
  };

  const parseSigInstructions = async (rawSig: string, medName?: string) => {
    try {
      const res = await fetch('/api/clinical/parse-sig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawSigText: rawSig, medicationName: medName })
      });
      if (res.ok) {
        const data = await res.json();
        return data.parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return {
      structuredSig: rawSig,
      frequency: 'Once Daily',
      route: 'Oral',
      dailyDoseCount: 1,
      warnings: ['Take with water']
    };
  };

  const generateMtmCarePlan = async (patient: Patient, activeRxs: Prescription[]) => {
    try {
      const res = await fetch('/api/clinical/mtm-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient, activePrescriptions: activeRxs })
      });
      if (res.ok) {
        const data = await res.json();
        return data.plan;
      }
    } catch (e) {
      console.error(e);
    }
    return {
      summary: `Comprehensive MTM Care Plan for ${patient.firstName} ${patient.lastName}`,
      adherenceRiskLevel: patient.adherenceScore < 70 ? 'HIGH' : 'LOW',
      issues: [
        {
          category: 'Refill Adherence',
          description: 'Establish automated WhatsApp chronic refill sync to prevent therapy gaps.',
          action: 'Enroll in 30-day auto-refill program.'
        }
      ],
      recommendations: ['Maintain regular BP and glucose logs', 'Schedule quarterly follow-up.'],
      actionSteps: ['Send WhatsApp refill reminder', 'Dispense 90-day maintenance supply.'],
      targetGoal: 'Improve chronic adherence to >90%.'
    };
  };

  const generateCampaignCopy = async (campaignType: string, tone?: string, medName?: string) => {
    try {
      const res = await fetch('/api/campaigns/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignType, tone, medicationName: medName })
      });
      if (res.ok) {
        const data = await res.json();
        return data.copy;
      }
    } catch (e) {
      console.error(e);
    }
    return {
      smsText: `PharmPulse Alert: Your chronic refill for ${medName || 'medication'} is ready. Reply YES to confirm pickup.`,
      whatsappTemplate: `Hello {PatientName}, Your monthly refill for ${medName || 'medication'} is prepared at Rack {RackLocation}. Reply to order free home delivery!`,
      callScript: `Hello, this is PharmPulse Pharmacy with a reminder for your upcoming medication refill.`
    };
  };

  const resetToDefaults = () => {
    setPatients(INITIAL_PATIENTS);
    setPrescriptions(INITIAL_PRESCRIPTIONS);
    setInventory(INITIAL_INVENTORY);
    setPrescribers(INITIAL_PRESCRIBERS);
    setCampaigns(INITIAL_CAMPAIGNS);
    setTransactions(INITIAL_TRANSACTIONS);
    setActivityLogs(INITIAL_LOGS);
    setMtmReviews(INITIAL_MTM_REVIEWS);
    setDebitNotes(INITIAL_DEBIT_NOTES);
    localStorage.clear();
    addToast({
      type: 'info',
      title: 'Demo Data Restored',
      message: 'Clean medical store sample dataset reset successfully.'
    });
  };

  return (
    <PharmacyContext.Provider
      value={{
        patients,
        prescriptions,
        inventory,
        prescribers,
        campaigns,
        transactions,
        invoices: transactions,
        activityLogs,
        mtmReviews,
        debitNotes,
        shopSettings,
        toasts,
        currentPharmacist,
        activeTab,
        searchQuery,
        darkMode,
        mobileSearchActive,
        isStoreLoading,

        // Cart & POS Modal State
        isCartOpen,
        setIsCartOpen,
        isAddMedicineModalOpen,
        setIsAddMedicineModalOpen,
        isStaffModalOpen,
        setIsStaffModalOpen,
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
        addItemToCart,
        updateCartQuantity,
        removeCartItem,
        clearCart,

        setActiveTab,
        setSearchQuery,
        setMobileSearchActive,
        setCurrentPharmacist,
        updateShopSettings,
        toggleDarkMode,
        addToast,
        removeToast,

        addPatient,
        updatePatient,
        deletePatient,
        getPatientById,
        addChronicMedication,
        sendWhatsAppRefillReminder,
        sendAllCustomersMedicineReminders,
        isBulkReminderModalOpen,
        setIsBulkReminderModalOpen,
        lastBulkReminderResult,
        setLastBulkReminderResult,
        markChronicRefilled,

        addPrescription,
        updatePrescriptionStatus,
        processRefill,
        dispensePrescription,
        deletePrescription,

        addInventoryItem,
        addBulkInventoryItems,
        updateInventoryItem,
        updateInventoryStock,
        deleteInventoryItem,
        deleteBatch,
        updateBatch,
        updateRackPosition,
        findSubstitutes,
        lastMergeBanner,
        setLastMergeBanner,

        getExpiryTier,
        getDaysUntilExpiry,
        applyNearExpiryDiscount,
        createDebitNoteReturn,
        quarantineItem,

        addPrescriber,
        addPrescriberCommunication,

        createCampaign,
        triggerCampaign,
        updateCampaignStatus,

        completePosTransaction,
        formatWhatsAppInvoice,

        // Digital Khata & Udhaar
        khataLedger,
        recordKhataPayment,
        sendWhatsAppKhataReminder,

        // Chronic Patient Auto Cycle
        enrollChronicPatient,

        // Daily Shortage Book & Purchase Orders
        purchaseOrders,
        formatDistributorWhatsAppOrder,
        savePurchaseOrder,

        // Sales Returns & Refunds (Credit Notes)
        salesReturns,
        processSalesReturn,
        formatWhatsAppCreditNote,

        addMTMReview,
        screenInteractions,
        generatePatientGuide,
        parseSigInstructions,
        generateMtmCarePlan,
        generateCampaignCopy,

        resetToDefaults
      }}
    >
      {children}
    </PharmacyContext.Provider>
  );
};

export const usePharmacy = () => {
  const context = useContext(PharmacyContext);
  if (!context) {
    throw new Error('usePharmacy must be used within a PharmacyProvider');
  }
  return context;
};
