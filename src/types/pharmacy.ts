export type SubscriptionPlanKey = 
  | 'trial_7d' 
  | 'monthly_399' 
  | 'quarterly_999' 
  | 'yearly_3999' 
  | 'starter_299_mo' 
  | 'pro_1999_yr' 
  | 'enterprise_2999_yr';

export interface SubscriptionPlanConfig {
  key: SubscriptionPlanKey;
  name: string;
  price: number;
  displayPrice: string;
  interval: 'trial' | 'mo' | 'quarter' | 'yr';
  durationDays: number;
  badge?: string;
  subtitle?: string;
  features: string;
  maxDevices: number;
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionPlanKey, SubscriptionPlanConfig> = {
  trial_7d: {
    key: 'trial_7d',
    name: '7-Day Free Trial',
    price: 0,
    displayPrice: '₹0 (Free Trial)',
    interval: 'trial',
    durationDays: 7,
    badge: 'TRIAL',
    subtitle: '7 Days Full Access',
    features: '1 Counter • Full Strip Scan & Inventory • WhatsApp Invoices',
    maxDevices: 1
  },
  monthly_399: {
    key: 'monthly_399',
    name: 'Monthly SaaS',
    price: 399,
    displayPrice: '₹399 / mo',
    interval: 'mo',
    durationDays: 30,
    features: '2 Devices Synced • Fast POS Billing • WhatsApp Bills',
    maxDevices: 2
  },
  quarterly_999: {
    key: 'quarterly_999',
    name: 'Quarterly Plan',
    price: 999,
    displayPrice: '₹999 / 3 mos',
    interval: 'quarter',
    durationDays: 90,
    badge: 'VALUE',
    subtitle: 'Save ₹198 over monthly',
    features: '3 Devices Synced • Full Inventory & Expiry • WhatsApp Bills',
    maxDevices: 3
  },
  yearly_3999: {
    key: 'yearly_3999',
    name: 'Yearly Plan',
    price: 3999,
    displayPrice: '₹3,999 / yr',
    interval: 'yr',
    durationDays: 365,
    badge: 'BEST VALUE',
    subtitle: 'Save 17% • Full Year Peace of Mind',
    features: 'Up to 10 Devices • Multi-Counter Sync • Priority Support',
    maxDevices: 10
  },
  starter_299_mo: {
    key: 'starter_299_mo',
    name: 'Starter Monthly',
    price: 299,
    displayPrice: '₹299 / mo',
    interval: 'mo',
    durationDays: 30,
    features: '2 Devices Synced • Fast POS Billing • WhatsApp Bills',
    maxDevices: 2
  },
  pro_1999_yr: {
    key: 'pro_1999_yr',
    name: 'Pro Annual',
    price: 1999,
    displayPrice: '₹1,999 / yr',
    interval: 'yr',
    durationDays: 365,
    badge: 'POPULAR',
    subtitle: 'Save over 44%',
    features: '2 Devices Synced • Full Inventory & Expiry • WhatsApp Bills',
    maxDevices: 2
  },
  enterprise_2999_yr: {
    key: 'enterprise_2999_yr',
    name: 'Enterprise Growth',
    price: 2999,
    displayPrice: '₹2,999 / yr',
    interval: 'yr',
    durationDays: 365,
    subtitle: 'Multi-Counter Master',
    features: 'Up to 10 Devices Synced • Multi-Counter Live Sync • Full SaaS Suite',
    maxDevices: 10
  }
};

export interface CompletedBillRecord {
  billId: string;
  date: string;
  amount: number;
  items: number;
  timestamp: string;
  customerName?: string;
  paymentMethod?: string;
}

export interface StoreWorkspace {
  storeId: string;
  storeName: string;
  id?: string;
  name?: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  phone?: string;
  dlNumber: string;
  gstin?: string;
  address?: string;
  password?: string;
  status: 'active' | 'deactivated' | 'trial' | 'expired' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'SUSPENDED';
  subscriptionPlan: SubscriptionPlanKey | 'Starter (Monthly)' | 'Pro Pharmacy (Annual)' | 'Enterprise Multi-Counter' | string;
  subscriptionPrice: number;
  subscriptionExpiryDate: string;
  createdAt: string;
  connectedDevicesCount: number;
  totalRevenueCollected: number; // Platform subscription revenue in INR
  allowedUserLimit?: number; // Super Admin assigned maximum staff/counter users (0 or undefined = Unlimited)
  upiId?: string;
  logoUrl?: string;
  dailySalesTotal?: number; // Sum of all bills generated today (₹)
  totalSalesCount?: number; // Number of invoices processed today
  salesHistory?: CompletedBillRecord[]; // Array of completed bill objects [{ billId, date, amount, items, timestamp }]
}

export interface StoreDeviceSession {
  deviceId: string;
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  storeId: string;
  userRole: 'owner' | 'staff' | 'cashier';
  userName: string;
  lastActive: string;
  loginTimestamp?: string;
  ipAddress?: string;
  location?: string;
  browser?: string;
  os?: string;
  fingerprintHash?: string;
  status: 'active' | 'revoked';
}

export type SecurityAlertType = 
  | 'MULTI_IP_COLLISION' 
  | 'THIRD_DEVICE_BLOCKED' 
  | 'BILLING_VELOCITY_EXCEEDED' 
  | 'SIMULTANEOUS_GEO_LOGIN'
  | 'FORCED_SESSION_REVOKE';

export interface SecurityAnomalyAlert {
  id: string;
  storeId: string;
  storeName: string;
  dlNumber: string;
  type: SecurityAlertType;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  title: string;
  description: string;
  ipAddresses: string[];
  locations: string[];
  deviceDetails?: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface StoreStaffMember {
  id: string;
  storeId: string;
  name: string;
  phone?: string;
  pin: string; // 4-digit POS PIN
  role: 'staff' | 'cashier' | 'pharmacist';
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface AuthSession {
  user: {
    id: string;
    name: string;
    role: 'owner' | 'staff' | 'cashier' | 'super_admin';
    phone?: string;
    email?: string;
  };
  storeId: string;
  store: StoreWorkspace;
  token: string;
  deviceId: string;
  deviceName: string;
}

export interface SuperAdminOverview {
  totalStores: number;
  activeSubscriptions: number;
  deactivatedStores: number;
  trialStores: number;
  totalPlatformRevenue: number;
  totalRevenueINR?: number;
  expiringSoonCount?: number;
  totalActiveDevicesCount?: number;
  multiIpAnomalyStoresCount?: number;
  blockedAttemptsCount?: number;
  stores: StoreWorkspace[];
  securityAlerts?: SecurityAnomalyAlert[];
}

export type PatientTag = 
  | 'Diabetic' 
  | 'Hypertension' 
  | 'Senior' 
  | 'High-Risk' 
  | 'Pediatric' 
  | 'Asthma' 
  | 'Cardio' 
  | 'MedSync Enrolled' 
  | 'VIP'
  | 'Chronic Care'
  | 'Khata / Udhaar Customer';

export interface ChronicMedicationEntry {
  id: string;
  medicineName: string;
  brandName?: string;
  genericSalt: string;
  dosage?: string;
  dosagePerDay?: number;
  dosageInstructions?: string;
  packQuantity?: number;
  daysSupply?: number;
  lastRefillDate: string;
  nextRefillDueDate: string;
  nextDueDate?: string;
  lastReminderSent?: string;
  reminderStatus: 'pending' | 'sent' | 'refilled' | 'overdue';
  notes?: string;
}

export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: 'Female' | 'Male' | 'Other';
  phone: string;
  email: string;
  address: string;
  doctorReference: string;
  insuranceProvider: string;
  policyNumber?: string;
  insurancePolicyNumber?: string;
  groupNumber?: string;
  insuranceGroupNumber?: string;
  copayTier: 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Commercial Standard' | string;
  adherenceScore: number; // 0 to 100
  chronicConditions: string[];
  allergies: string[];
  tags: PatientTag[];
  loyaltyPoints: number;
  creditBalanceDue?: number;
  creditBalance?: number; // For Khata / Due billing
  creditLimit?: number; // Khata credit limit in INR
  preferredContact?: 'WhatsApp' | 'SMS' | 'Phone Call' | 'Email' | string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  chronicMedications: ChronicMedicationEntry[];
  notes?: string;
  activePrescriptionsCount?: number;
  lastVisitDate: string;
  createdAt?: string;
}

export type RxStatus = 
  | 'pending_review' 
  | 'clinical_check' 
  | 'ready_for_pickup' 
  | 'dispensed' 
  | 'on_hold' 
  | 'refill_requested';

export type InsuranceClaimStatus = 
  | 'approved' 
  | 'prior_auth_req' 
  | 'copay_due' 
  | 'cash_only' 
  | 'rejected';

export interface Prescription {
  id: string;
  rxNumber: string;
  patientId: string;
  patientName: string;
  patientDob: string;
  prescriberId: string;
  prescriberName: string;
  prescriberNpi: string;
  prescriberClinic: string;
  medicationName: string;
  genericName: string;
  saltComposition?: string;
  ndc: string;
  strength: string;
  form: 'Tablet' | 'Capsule' | 'Oral Solution' | 'Inhaler' | 'Injection' | 'Ophthalmic Drops' | 'Topical Cream' | 'Syrup' | 'Ointment' | 'Suspension';
  quantity: number;
  daysSupply: number;
  refillsTotal: number;
  refillsRemaining: number;
  sig: string;
  dateWritten: string;
  dateDispensed?: string;
  expirationDate: string;
  status: RxStatus;
  insuranceStatus: InsuranceClaimStatus;
  copayAmount: number;
  retailPrice: number;
  barcode: string;
  rackLocation?: string;
  pharmacistNotes: string;
  warnings: string[];
  lastRefillDate?: string;
  nextRefillDueDate: string;
}

export type MedicineOfferType = 'none' | 'percentage' | 'flat' | 'scheme';

export interface MedicineOffer {
  type: MedicineOfferType;
  label?: string; // e.g. "Special 10% Off", "Buy 10 Get 1 Free", "Seasonal Offer"
  value?: number; // percentage (e.g. 10) or flat discount (e.g. 5)
  schemeBuyQty?: number; // e.g. 10
  schemeFreeQty?: number; // e.g. 1
  isActive?: boolean;
}

export type ScheduleClass = 'OTC' | 'Rx' | 'Schedule-H' | 'Schedule-H1' | 'Schedule-X' | 'Schedule-II' | 'Schedule-IV';

export type DosageForm = 'Tablet' | 'Capsule' | 'Syrup' | 'Injection' | 'Ointment' | 'Eye Drops' | 'Inhaler' | 'Suspension' | 'Powder' | 'Cream';

export interface MedicationInventory {
  id: string;
  ndc: string;
  brandName: string;
  genericName: string;
  saltComposition: string;
  strength: string;
  dosageForm: DosageForm;
  category: string;
  scheduleClass: ScheduleClass;
  batchNumber: string;
  mfgDate: string;
  manufacturingDate?: string;
  expirationDate: string;
  mrp: number; // Maximum Retail Price (INR ₹)
  purchaseRate: number; // Cost Price / PTR (INR ₹)
  costPrice: number; // alias
  sellingPrice: number; // Retail selling price / discounted
  stockQuantity: number;
  unit: string; // e.g. Strips (10 tabs), Strips (15 tabs), Bottle (100ml), Tube (30g)
  packSize: number; // e.g. 10 or 15 tablets per strip
  reorderLevel: number;
  minAlertLevel: number; // Minimum alert level
  gstRate: number; // 0%, 5%, 12%, 18%
  hsnCode: string;
  barcode?: string;
  supplierName: string;
  supplierContact: string;
  
  // Physical Structured Coordinates
  rackNumber: string; // e.g. "R-1", "Rack A", "R-02", "Cold Unit 1"
  shelfRow: string;   // e.g. "S-2", "Shelf 1", "Row 3"
  boxBin: string;     // e.g. "B-04", "Box 12", "Tray A"
  locationShelf: string; // formatted e.g. "R-1/S-2 • B-04" or "Rack A-2 • Bin 04"

  manufacturer: string;
  storageCondition: 'Room Temp (15-25°C)' | 'Refrigerated (2-8°C)' | 'Controlled Deep Freeze (-20°C)' | 'Dark & Dry Place';
  isNearExpiryDiscount: boolean;
  discountPercent: number;
  quarantined: boolean;
  autoReorder: boolean;

  // Medicine Offers & Schemes
  offerType?: MedicineOfferType;
  offerLabel?: string;
  offerValue?: number;
  schemeBuyQty?: number;
  schemeFreeQty?: number;
  offer?: MedicineOffer;

  // Medicine Images & AI Category Thumbnails
  imageUrl?: string;
  thumbnailUrl?: string;
}

export interface CategoryThumbnailInfo {
  category: string;
  normalizedCategory: string;
  imageUrl: string;
  isAiGenerated: boolean;
  provider: 'imagen' | 'fallback_svg' | 'custom';
  prompt?: string;
  generatedAt?: string;
  statusMessage?: string;
}

export type ExpiryAlertTier = 'red' | 'amber' | 'yellow' | 'green';

export interface DebitNoteItem {
  inventoryId: string;
  brandName: string;
  saltComposition: string;
  batchNumber: string;
  expiryDate: string;
  rackLocation: string;
  quantity: number;
  purchaseRate: number;
  totalCredit: number;
  reason: string;
}

export interface DebitNote {
  id: string;
  noteNumber: string;
  supplierName: string;
  supplierContact: string;
  date: string;
  items: DebitNoteItem[];
  totalAmount: number;
  status: 'Draft' | 'Sent to Supplier' | 'Credit Note Received' | 'Adjusted';
  notes?: string;
}

export interface Prescriber {
  id: string;
  name: string;
  specialty: string;
  clinicName: string;
  npi: string;
  deaNumber: string;
  phone: string;
  fax: string;
  email: string;
  address: string;
  activeRxCount: number;
  communicationNotes: { date: string; note: string; author: string }[];
}

export type CampaignType = 'refill_due' | 'adherence_check' | 'immunization' | 'sync_my_meds' | 'recall_notice' | 'wellness' | 'chronic_care_gap' | 'vaccine_drive' | 'medsync_enrollment' | 'educational';
export type CampaignChannel = 'sms' | 'email' | 'whatsapp' | 'automated_call';

export interface OutreachCampaign {
  id: string;
  name?: string;
  title: string;
  type: CampaignType;
  targetGroup: string;
  targetCohort?: string;
  channel: CampaignChannel;
  status: 'active' | 'scheduled' | 'completed' | 'draft';
  totalAudience: number;
  patientCount?: number;
  deliveredCount: number;
  responseCount?: number;
  responseRate: number; // percentage
  scheduledDate: string;
  messageTemplate: string;
  lastTriggered?: string;
}

export interface PosBillItem {
  id?: string;
  inventoryId: string;
  brandName: string;
  medicationName?: string;
  genericName?: string;
  genericSalt?: string;
  saltComposition?: string;
  strength?: string;
  batchNumber: string;
  expirationDate?: string;
  expiryDate?: string;
  rackLocation: string;
  unit?: string;
  packSize?: number;
  quantity: number;
  mrp?: number;
  originalPrice?: number;
  unitPrice?: number;
  purchaseRate?: number;
  costPrice?: number;
  sellingPrice?: number;
  totalPrice?: number;
  discountPercent?: number;
  gstRate: number;
  gstAmount: number;
  totalAmount?: number;
  isRx?: boolean;

  // Medicine Offer & Scheme Details
  offerType?: MedicineOfferType;
  offerLabel?: string;
  offerValue?: number;
  schemeBuyQty?: number;
  schemeFreeQty?: number;
  offerDiscountAmount?: number;
  freeQuantity?: number;
  totalSavings?: number;
}

export type PaymentMode = 
  | 'Cash' 
  | 'Dynamic UPI QR' 
  | 'UPI / QR' 
  | 'Udhaar (Khata Ledger)' 
  | 'Credit/Debit Card' 
  | 'Due Khata' 
  | 'Credit Khata (Due)';

export interface PointOfSaleTransaction {
  id: string;
  invoiceNumber?: string;
  receiptNumber?: string;
  patientId: string;
  patientName?: string;
  customerName?: string;
  patientPhone?: string;
  customerPhone?: string;
  contactNumber?: string;
  prescriberName?: string;
  doctorName?: string;
  prescriptionIds?: string[];
  items: PosBillItem[];
  itemsSummary?: string[];
  subtotal: number;
  discountTotal?: number;
  discountAmount?: number;
  discountPercent?: number;
  offerSavingsTotal?: number;
  totalSavings?: number;
  tax?: number;
  taxTotal?: number;
  totalGst?: number;
  gstTotal?: number;
  cgst?: number;
  sgst?: number;
  roundOff?: number;
  totalPaid?: number;
  grandTotal: number;
  paymentMethod?: string;
  paymentMode?: PaymentMode | string;
  copayCoveredByInsurance?: number;
  amountReceived?: number;
  cashTendered?: number;
  changeReturned?: number;
  upiRefNumber?: string;
  timestamp: string;
  cashierName?: string;
  pharmacistStaff?: string;
  pharmacistName?: string;
  loyaltyPointsEarned?: number;
  loyaltyDiscountApplied?: number;
  notes?: string;
  chronicRefillDate?: string;
}

export interface ShopSettings {
  shopName: string;
  storeName?: string;
  tagline: string;
  dlNumber: string; // Drug License No. e.g. "DL-20B/3891 & DL-21B/3892"
  drugLicense?: string;
  gstin: string; // GSTIN e.g. "07AABCP1389K1Z4"
  upiId: string; // e.g. "apexmedicos@okhdfcbank"
  upiName: string; // e.g. "Apex Medicos and Healthcare"
  phone: string; // e.g. "+91 98765 43210"
  whatsappPhone: string;
  email: string;
  address: string;
  receiptWidth: '80mm' | '58mm';
  footerNote: string;
  logoUrl?: string;
}

export interface MTMReview {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  pharmacistName: string;
  adherenceScore: number;
  adherenceRiskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  issues: {
    category: string;
    description: string;
    action: string;
  }[];
  recommendations: string[];
  actionSteps: string[];
  targetGoal: string;
  summary?: string;
  drugTherapyProblems?: { issue: string; priority: 'high' | 'moderate' | 'low'; action: string }[];
  actionPlanForPatient?: string[];
  adherenceStrategy?: string;
  costSavingOpportunities?: string;
  followUpSchedule?: string;
}

export interface ClinicalInteractionAlert {
  severity: 'CRITICAL' | 'MAJOR' | 'MODERATE' | 'MINOR';
  drugsInvolved: string[];
  mechanism: string;
  clinicalEffect: string;
  actionRecommendation: string;
}

export interface PosCartConflict {
  id: string;
  drugsInvolved: string[];
  conflictingInventoryIds?: string[];
  severity: 'CRITICAL' | 'MAJOR' | 'MODERATE' | 'MINOR';
  mechanism: string;
  clinicalEffect: string;
  actionRecommendation: string;
  suggestedAlternative?: string;
  requiresOverride?: boolean;
}

export interface PosCartInteractionAnalysis {
  overallRiskLevel: 'CRITICAL' | 'MAJOR' | 'MODERATE' | 'MINOR' | 'SAFE';
  severity: 'CRITICAL' | 'MAJOR' | 'MODERATE' | 'MINOR' | 'SAFE';
  hasInteractions: boolean;
  summary: string;
  conflicts: PosCartConflict[];
  allergyConflicts?: {
    allergen: string;
    medication: string;
    inventoryId?: string;
    severity: 'CRITICAL' | 'MAJOR';
    notes: string;
  }[];
  diseaseWarnings?: {
    condition: string;
    medication: string;
    inventoryId?: string;
    risk: string;
  }[];
  counselingNotes?: string[];
}

export interface ClinicalScreeningResult {
  overallRiskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  summary: string;
  interactions: ClinicalInteractionAlert[];
  allergyAlerts: { allergen: string; crossReactivityRisk: string; notes: string }[];
  diseasePrecautions: { condition: string; risk: string }[];
  pharmacistCounselingPoints: string[];
}

export interface SalesReturnItem {
  inventoryId: string;
  brandName: string;
  batchNumber: string;
  originalQuantity: number;
  returnQuantity: number;
  unitPrice: number;
  gstRate: number;
  refundAmount: number;
  reason: 'Unopened / Sealed' | 'Doctor Changed Medicine' | 'Expired / Defective' | 'Wrong Item Dispensed' | 'Customer Reaction' | 'Excess Strips Returned' | string;
  restocked: boolean;
}

export interface SalesReturnRecord {
  id: string;
  creditNoteNumber: string;
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  customerName: string;
  customerPhone: string;
  patientId?: string;
  timestamp: string;
  items: SalesReturnItem[];
  totalRefundAmount: number;
  refundMethod: 'Cash' | 'Khata Credit' | 'Store Credit Note' | 'UPI Transfer';
  handledBy: string;
  notes?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  details: string;
  category: 'Dispense' | 'Refill' | 'Clinical' | 'Inventory' | 'CRM' | 'POS' | 'Campaign' | 'Expiry';
}

export interface SoldItemAudit {
  id: string;
  transactionId: string;
  invoiceNumber: string;
  receiptNumber: string;
  timestamp: string;
  storeId: string;
  storeName: string;
  storeDl?: string;
  brandName: string;
  genericName?: string;
  saltComposition: string;
  strength?: string;
  batchNumber: string;
  expirationDate?: string;
  rackLocation: string;
  quantity: number;
  unit: string;
  packSize: number;
  mrp: number;
  sellingPrice: number;
  discountPercent: number;
  gstRate: number;
  itemTotal: number;
  paymentMethod: string;
  customerName: string;
  customerPhone?: string;
  cashierName?: string;
  isRx?: boolean;
}

export interface TopMedicineRank {
  rank: number;
  brandName: string;
  saltComposition: string;
  genericName: string;
  strength?: string;
  totalUnitsSold: number;
  totalRevenue: number;
  storeCount: number;
  unit: string;
  avgPrice: number;
}

export interface TopSaltRank {
  rank: number;
  saltComposition: string;
  totalUnitsSold: number;
  totalRevenue: number;
  storeCount: number;
  brandsCount: number;
  topBrands: string[];
}

export interface SalesLeaderboardData {
  days: number;
  summary: {
    totalPlatformGMV: number;
    totalPlatformUnits: number;
    totalInvoicesCount: number;
    activePharmaciesCount: number;
  };
  topMedicines: TopMedicineRank[];
  topSalts: TopSaltRank[];
}

export interface PlatformInvoice {
  id: string;
  invoiceNumber: string;
  receiptNumber?: string;
  storeId: string;
  storeName: string;
  storeDl?: string;
  storeGstin?: string;
  storeAddress?: string;
  storePhone?: string;
  storeUpi?: string;
  patientId?: string;
  customerName: string;
  patientName?: string;
  customerPhone?: string;
  patientPhone?: string;
  doctorName?: string;
  paymentMethod: string;
  paymentMode?: string;
  upiRefNumber?: string;
  amountReceived?: number;
  changeReturned?: number;
  subtotal: number;
  discountTotal: number;
  tax: number;
  totalGst: number;
  cgst?: number;
  sgst?: number;
  roundOff?: number;
  grandTotal: number;
  totalPaid: number;
  timestamp: string;
  cashierName?: string;
  pharmacistStaff?: string;
  notes?: string;
  footerNote?: string;
  itemCount?: number;
  itemNames?: string;
  items: PosBillItem[];
}

export interface KhataLedgerEntry {
  id: string;
  patientId: string;
  customerName: string;
  customerPhone: string;
  type: 'debit' | 'credit'; // 'debit' = Udhaar purchase (balance increases), 'credit' = Payment settlement (balance decreases)
  amount: number;
  balanceAfter: number;
  invoiceNumber?: string;
  paymentMethod?: string;
  timestamp: string;
  notes?: string;
  recordedBy?: string;
}

export interface ShortageOrderItem {
  inventoryId: string;
  brandName: string;
  saltComposition: string;
  supplierName: string;
  supplierContact: string;
  currentStock: number;
  minAlertLevel: number;
  reorderLevel: number;
  suggestedQty: number;
  orderQty: number;
  unit: string;
  purchaseRate: number;
  mrp: number;
  rackLocation: string;
  status: 'shortage' | 'ordered' | 'received';
}

export interface DistributorPurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  supplierContact: string;
  date: string;
  items: ShortageOrderItem[];
  totalItems: number;
  totalEstimatedAmount: number;
  status: 'Draft' | 'Sent via WhatsApp' | 'Delivered' | 'Partially Received';
  notes?: string;
}

// Aliases for compatibility
export type InventoryItem = MedicationInventory;
export type ClinicalScreenResult = ClinicalScreeningResult;
export type MtmCarePlan = MTMReview;
export type PosTransaction = PointOfSaleTransaction;
export type PosItem = PosBillItem;

export interface BulkReminderItem {
  patientId: string;
  patientName: string;
  phone: string;
  medicationId: string;
  medicineName: string;
  dosage: string;
  dueDate: string;
  daysRemaining: number;
  isOverdue: boolean;
  messageText: string;
  whatsappUrl: string;
  status: 'sent' | 'queued';
}

export interface BulkReminderResult {
  totalSent: number;
  customerCount: number;
  items: BulkReminderItem[];
  timestamp: string;
  cohort: 'all' | 'due_and_overdue' | 'overdue_only';
}
