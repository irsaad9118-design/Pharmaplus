import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { MedicationInventory, ScheduleClass, InventoryBatch } from '../../types/pharmacy';
import { 
  Package, 
  Search, 
  Plus, 
  MapPin, 
  ArrowRightLeft, 
  AlertCircle, 
  Edit3, 
  Pencil,
  Trash2,
  Archive,
  ChevronDown,
  ChevronUp,
  CheckCircle2, 
  Layers, 
  Percent, 
  Building2, 
  Calendar, 
  Filter, 
  Zap, 
  ShieldAlert, 
  X, 
  Maximize2,
  Boxes,
  ArrowUpDown,
  Tag,
  Gift,
  Sparkles,
  Mic,
  MicOff,
  TrendingUp,
  Clock,
  Image as ImageIcon,
  Pill
} from 'lucide-react';
import { useVoiceSearch } from '../../hooks/useVoiceSearch';
import { 
  calculateAllInventoryReorderForecasts, 
  getReorderRadarMetrics, 
  ItemReorderForecast 
} from '../../utils/reorderForecastUtils';
import { ItemReorderForecastModal } from './ItemReorderForecastModal';
import { InventoryReorderRadar } from './InventoryReorderRadar';
import { AutomaticReorderAlertBanner, ReorderAlertItem } from './AutomaticReorderAlertBanner';
import { MedicineThumbnail } from './MedicineThumbnail';
import { DeleteMedicineConfirmModal } from './DeleteMedicineConfirmModal';
import { EditBatchModal } from './EditBatchModal';
import { DeleteBatchConfirmModal } from './DeleteBatchConfirmModal';
import { findExistingInventoryMatch, deduplicateMasterInventory } from '../../utils/inventoryDeduplication';
import { ShortageOrderItem } from '../../types/pharmacy';

export const InventoryView: React.FC = () => {
  const { 
    inventory, 
    transactions,
    addToast,
    addInventoryItem, 
    addBulkInventoryItems,
    updateInventoryItem, 
    updateInventoryStock, 
    deleteInventoryItem,
    deleteBatch,
    updateBatch,
    updateRackPosition, 
    findSubstitutes,
    getExpiryTier,
    getDaysUntilExpiry,
    setActiveTab,
    lastMergeBanner,
    setLastMergeBanner,
    savePurchaseOrder,
    formatDistributorWhatsAppOrder
  } = usePharmacy();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRack, setSelectedRack] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'near_expiry' | 'needs_reorder_7d' | 'needs_reorder_30d' | 'reorder_point_alert'>('all');
  const [forecastModalItem, setForecastModalItem] = useState<MedicationInventory | null>(null);
  const [sortByUrgency, setSortByUrgency] = useState<boolean>(false);

  // Voice Search for Medicine Inventory
  const {
    isListening: isVoiceListening,
    transcript: voiceTranscript,
    error: voiceError,
    isSupported: isVoiceSupported,
    toggleListening: toggleVoiceSearch,
    stopListening: stopVoiceSearch,
    clearError: clearVoiceError
  } = useVoiceSearch({
    onTranscript: (spokenText) => {
      setSearchTerm(spokenText);
    }
  });

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState<boolean>(false);
  const [showBulkPasteModal, setShowBulkPasteModal] = useState<boolean>(false);
  const [bulkCsvText, setBulkCsvText] = useState<string>('');
  const [bulkImportSuccess, setBulkImportSuccess] = useState<string | null>(null);

  // Medicine & Batch Edit/Delete Modal States
  const [deletingMedicine, setDeletingMedicine] = useState<MedicationInventory | null>(null);
  const [editingBatch, setEditingBatch] = useState<{ medicine: MedicationInventory; batch: InventoryBatch } | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<{ medicine: MedicationInventory; batch: InventoryBatch } | null>(null);

  // Quick Add Keyboard Form
  const [qaBrand, setQaBrand] = useState('');
  const [qaSalt, setQaSalt] = useState('');
  const [qaStrength, setQaStrength] = useState('500mg');
  const [qaBatch, setQaBatch] = useState('BT-' + Math.floor(1000 + Math.random() * 9000));
  const [qaExp, setQaExp] = useState('2027-12-31');
  const [qaMrp, setQaMrp] = useState<number>(45);
  const [qaPtr, setQaPtr] = useState<number>(22);
  const [qaPack, setQaPack] = useState<number>(10);
  const [qaGst, setQaGst] = useState<number>(12);
  const [qaStock, setQaStock] = useState<number>(100);
  const [qaRack, setQaRack] = useState('Rack A');
  const [qaShelf, setQaShelf] = useState('Shelf 1');
  const [qaCountAdded, setQaCountAdded] = useState(0);

  const [editingItem, setEditingItem] = useState<MedicationInventory | null>(null);
  const [substituteModalItem, setSubstituteModalItem] = useState<MedicationInventory | null>(null);
  const [rackEditItem, setRackEditItem] = useState<MedicationInventory | null>(null);

  // Form states for Add / Edit
  const [formBrand, setFormBrand] = useState('');
  const [formGeneric, setFormGeneric] = useState('');
  const [formSalt, setFormSalt] = useState('');
  const [formStrength, setFormStrength] = useState('');
  const [formDosageForm, setFormDosageForm] = useState<'Tablet' | 'Capsule' | 'Syrup' | 'Injection' | 'Ointment' | 'Eye Drops' | 'Inhaler' | 'Suspension' | 'Powder' | 'Cream'>('Tablet');
  const [formCategory, setFormCategory] = useState('Cardiovascular');
  const [formSchedule, setFormSchedule] = useState<ScheduleClass>('Rx');
  const [formBatch, setFormBatch] = useState('');
  const [formMfg, setFormMfg] = useState('2025-01-01');
  const [formExp, setFormExp] = useState('2027-12-31');
  const [formMrp, setFormMrp] = useState<number>(30);
  const [formPurchaseRate, setFormPurchaseRate] = useState<number>(15);
  const [formStock, setFormStock] = useState<number>(100);
  const [formUnit, setFormUnit] = useState('Strips (10 tabs)');
  const [formPackSize, setFormPackSize] = useState<number>(10);
  const [formMinAlert, setFormMinAlert] = useState<number>(50);
  const [formGst, setFormGst] = useState<number>(12);
  const [formHsn, setFormHsn] = useState('30049099');
  const [formSupplier, setFormSupplier] = useState('Sun Pharma Dist');
  const [formSupplierContact, setFormSupplierContact] = useState('+1 (800) 555-7860');
  const [formRack, setFormRack] = useState('Rack A');
  const [formShelf, setFormShelf] = useState('Shelf 2');
  const [formBin, setFormBin] = useState('Bin 04');
  const [formManufacturer, setFormManufacturer] = useState('');
  const [formStorage, setFormStorage] = useState<'Room Temp (15-25°C)' | 'Refrigerated (2-8°C)' | 'Controlled Deep Freeze (-20°C)' | 'Dark & Dry Place'>('Room Temp (15-25°C)');
  const [restockQty, setRestockQty] = useState<number>(0);

  // Archive / Soft Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Multi-batch management states for Edit Modal
  const [formBatches, setFormBatches] = useState<InventoryBatch[]>([]);
  const [newBatchNumber, setNewBatchNumber] = useState<string>('');
  const [newBatchExp, setNewBatchExp] = useState<string>('2028-06-30');
  const [newBatchStock, setNewBatchStock] = useState<number>(50);
  const [showNewBatchInputs, setShowNewBatchInputs] = useState<boolean>(false);
  const [expandedBatchesItemId, setExpandedBatchesItemId] = useState<string | null>(null);

  // Real-time existing medicine detection for entry forms
  const qaExistingMatch = useMemo(() => {
    if (!qaBrand.trim()) return null;
    return findExistingInventoryMatch(inventory, { brandName: qaBrand, saltComposition: qaSalt });
  }, [inventory, qaBrand, qaSalt]);

  const formExistingMatch = useMemo(() => {
    if (editingItem || !formBrand.trim()) return null;
    return findExistingInventoryMatch(inventory, { brandName: formBrand, saltComposition: formSalt });
  }, [inventory, formBrand, formSalt, editingItem]);

  // Extract distinct categories & racks
  const categories = useMemo(() => {
    const set = new Set<string>();
    (inventory || []).forEach(i => { if (i?.category) set.add(i.category); });
    return Array.from(set);
  }, [inventory]);

  const racksList = useMemo(() => {
    const set = new Set<string>();
    (inventory || []).forEach(i => { if (i?.rackNumber) set.add(i.rackNumber); });
    return Array.from(set);
  }, [inventory]);

  // Analyze historical consumption rates and compute Suggested Reorder Date for all items
  const reorderForecastMap = useMemo(() => {
    return calculateAllInventoryReorderForecasts(inventory, transactions);
  }, [inventory, transactions]);

  const reorderRadarSummary = useMemo(() => {
    return getReorderRadarMetrics(reorderForecastMap);
  }, [reorderForecastMap]);

  // Items reaching their reorder point based on historical consumption
  const reorderAlertItems = useMemo<ReorderAlertItem[]>(() => {
    const deduplicatedMaster = deduplicateMasterInventory(inventory || []);
    return deduplicatedMaster
      .map(item => ({ item, forecast: reorderForecastMap.get(item.id)! }))
      .filter(({ item, forecast }) => {
        if (!forecast || item.isArchived) return false;
        // Criteria for reaching or breaching reorder point based on historical consumption:
        // 1. Current stock is at or below reorder level / min alert level
        // 2. OR days until reorder <= 3 (supplier lead time threshold reached based on consumption velocity)
        // 3. OR urgency status is out of stock or urgent
        const isStockAtOrBelow = (item.stockQuantity ?? 0) <= (item.reorderLevel || item.minAlertLevel || 10);
        const isRunwayCritical = forecast.daysUntilReorder <= 3;
        const isUrgentStatus = forecast.urgencyStatus === 'out_of_stock' || forecast.urgencyStatus === 'urgent';
        return isStockAtOrBelow || isRunwayCritical || isUrgentStatus;
      })
      .sort((a, b) => (a.forecast.daysUntilReorder ?? 999) - (b.forecast.daysUntilReorder ?? 999));
  }, [inventory, reorderForecastMap]);

  // Filtered and Sorted List - strictly deduplicated into unified master inventory
  const filteredInventory = useMemo(() => {
    const deduplicatedMaster = deduplicateMasterInventory(inventory || []);
    const list = deduplicatedMaster.filter(item => {
      if (!item) return false;
      if (item.isArchived) return false;
      if (selectedCategory !== 'all' && item?.category !== selectedCategory) return false;
      if (selectedRack !== 'all' && item?.rackNumber !== selectedRack) return false;

      if (stockFilter === 'reorder_point_alert') {
        const forecast = reorderForecastMap.get(item.id);
        const isStockAtOrBelow = (item?.stockQuantity ?? 0) <= (item?.reorderLevel || item?.minAlertLevel || 10);
        const isRunwayCritical = forecast ? forecast.daysUntilReorder <= 3 : false;
        const isUrgentStatus = forecast ? (forecast.urgencyStatus === 'out_of_stock' || forecast.urgencyStatus === 'urgent') : false;
        if (!isStockAtOrBelow && !isRunwayCritical && !isUrgentStatus) return false;
      }
      if (stockFilter === 'low' && (item?.stockQuantity || 0) > (item?.minAlertLevel || 15)) return false;
      if (stockFilter === 'out' && (item?.stockQuantity || 0) > 0) return false;
      if (stockFilter === 'near_expiry') {
        const days = getDaysUntilExpiry(item?.expirationDate || '');
        if (days > 90) return false;
      }
      if (stockFilter === 'needs_reorder_7d') {
        const forecast = reorderForecastMap.get(item.id);
        if (!forecast || forecast.daysUntilReorder > 7) return false;
      }
      if (stockFilter === 'needs_reorder_30d') {
        const forecast = reorderForecastMap.get(item.id);
        if (!forecast || forecast.daysUntilReorder > 30) return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = (item?.brandName || '').toLowerCase().includes(q);
        const matchSalt = (item?.saltComposition || item?.genericName || '').toLowerCase().includes(q);
        const matchBatch = (item?.batchNumber || '').toLowerCase().includes(q);
        const matchRack = (item?.locationShelf || item?.rackNumber || '').toLowerCase().includes(q);
        const matchSupplier = (item?.supplierName || '').toLowerCase().includes(q);
        return matchName || matchSalt || matchBatch || matchRack || matchSupplier;
      }
      return true;
    });

    if (sortByUrgency) {
      return [...list].sort((a, b) => {
        const fA = reorderForecastMap.get(a.id);
        const fB = reorderForecastMap.get(b.id);
        return (fA?.daysUntilReorder ?? 999) - (fB?.daysUntilReorder ?? 999);
      });
    }

    return list;
  }, [inventory, selectedCategory, selectedRack, stockFilter, searchTerm, getDaysUntilExpiry, reorderForecastMap, sortByUrgency]);

  // Create consolidated purchase order from reorder alert items
  const handleCreateConsolidatedPOFromAlert = (itemsToOrder: ReorderAlertItem[]) => {
    if (itemsToOrder.length === 0) return;
    const poItems: ShortageOrderItem[] = itemsToOrder.map(({ item, forecast }) => ({
      inventoryId: item.id,
      brandName: item.brandName,
      saltComposition: item.saltComposition || item.genericName || 'Standard',
      supplierName: forecast.supplierName || item.supplierName || 'Primary Distributor',
      supplierContact: forecast.supplierContact || item.supplierContact || '+91 (800) 555-0199',
      currentStock: item.stockQuantity ?? 0,
      minAlertLevel: item.minAlertLevel || item.reorderLevel || 10,
      reorderLevel: item.reorderLevel || item.minAlertLevel || 10,
      suggestedQty: forecast.suggestedOrderQty,
      orderQty: forecast.suggestedOrderQty,
      unit: item.unit || 'Strips',
      purchaseRate: forecast.purchaseRate || item.purchaseRate || item.costPrice || 0,
      mrp: item.mrp || 0,
      rackLocation: item.locationShelf || `${item.rackNumber || 'Rack A'} / ${item.shelfRow || 'Shelf 1'}`,
      status: 'ordered'
    }));

    const supplier = poItems.length === 1 ? poItems[0].supplierName : 'Consolidated Distributors';
    const newPO = savePurchaseOrder(
      supplier,
      poItems,
      `Auto-created from Consumption Reorder Point Alert for ${poItems.length} medicines.`
    );

    const { waUrl } = formatDistributorWhatsAppOrder(supplier, poItems);

    addToast({
      type: 'success',
      title: 'Consolidated PO Saved',
      message: `Created PO ${newPO.poNumber} for ${poItems.length} medicines (₹${newPO.totalEstimatedAmount.toFixed(2)}).`
    });

    if (waUrl) {
      window.open(waUrl, '_blank');
    }
  };

  // Open Edit modal populated
  const handleStartEdit = (item: MedicationInventory) => {
    setEditingItem(item);
    setRestockQty(0);
    setFormBrand(item.brandName);
    setFormGeneric(item.genericName);
    setFormSalt(item.saltComposition || item.genericName);
    setFormStrength(item.strength);
    setFormDosageForm(item.dosageForm as any);
    setFormCategory(item.category);
    setFormSchedule(item.scheduleClass);
    setFormBatch(item.batchNumber);
    setFormMfg(item.mfgDate);
    setFormExp(item.expirationDate);
    setFormMrp(item.mrp);
    setFormPurchaseRate(item.purchaseRate || item.costPrice);
    setFormStock(item.stockQuantity);
    setFormUnit(item.unit);
    setFormPackSize(item.packSize || 10);
    setFormMinAlert(item.minAlertLevel || item.reorderLevel);
    setFormGst(item.gstRate || 12);
    setFormHsn(item.hsnCode || '30049099');
    setFormSupplier(item.supplierName || '');
    setFormSupplierContact(item.supplierContact || '');
    setFormRack(item.rackNumber || 'Rack A');
    setFormShelf(item.shelfRow || 'Shelf 1');
    setFormBin(item.boxBin || 'Bin 01');
    setFormManufacturer(item.manufacturer || '');
    setFormStorage(item.storageCondition || 'Room Temp (15-25°C)');

    // Initialize multi-batch records for in-place editing
    const existingBatches: InventoryBatch[] = item.batches && item.batches.length > 0
      ? item.batches.map(b => ({ ...b }))
      : [{
          id: `batch-${item.id}-0`,
          batchNumber: item.batchNumber || 'BT-101',
          expirationDate: item.expirationDate || '2027-12-31',
          mfgDate: item.mfgDate,
          stockQuantity: item.stockQuantity,
          mrp: item.mrp,
          purchaseRate: item.purchaseRate,
          addedAt: item.mfgDate || new Date().toISOString(),
          isSecondary: false
        }];
    setFormBatches(existingBatches);
    setShowDeleteConfirm(false);
    setShowNewBatchInputs(false);
    setNewBatchNumber('');
    setNewBatchExp('2028-06-30');
    setNewBatchStock(50);
    setShowAddModal(true);
  };

  const handleAddSecondaryBatch = () => {
    if (!newBatchNumber.trim() || Number(newBatchStock) <= 0) return;
    const batchObj: InventoryBatch = {
      id: `batch-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      batchNumber: newBatchNumber.trim(),
      expirationDate: newBatchExp || '2028-12-31',
      stockQuantity: Number(newBatchStock),
      mrp: Number(formMrp),
      purchaseRate: Number(formPurchaseRate),
      addedAt: new Date().toISOString(),
      isSecondary: true
    };
    const updatedBatches = [...formBatches, batchObj];
    setFormBatches(updatedBatches);
    const totalStock = updatedBatches.reduce((s, b) => s + (Number(b.stockQuantity) || 0), 0);
    setFormStock(totalStock);
    setNewBatchNumber('');
    setNewBatchStock(50);
    setShowNewBatchInputs(false);
    addToast({
      type: 'success',
      title: 'Secondary Batch Attached',
      message: `Batch ${batchObj.batchNumber} (+${batchObj.stockQuantity} ${formUnit}) attached to ${formBrand}.`
    });
  };

  const handleOpenNewMedicine = () => {
    setEditingItem(null);
    setRestockQty(0);
    setFormBatches([]);
    setShowDeleteConfirm(false);
    setShowNewBatchInputs(false);
    setFormBrand('');
    setFormGeneric('');
    setFormSalt('');
    setFormStrength('500 mg');
    setFormDosageForm('Tablet');
    setFormCategory('Cardiovascular');
    setFormSchedule('Rx');
    setFormBatch('LT-' + Math.floor(10000 + Math.random() * 90000));
    setFormMfg('2025-01-01');
    setFormExp('2027-12-31');
    setFormMrp(45);
    setFormPurchaseRate(22);
    setFormStock(200);
    setFormUnit('Strips (10 tabs)');
    setFormPackSize(10);
    setFormMinAlert(50);
    setFormGst(12);
    setFormHsn('30049099');
    setFormSupplier('Sun Pharma Dist');
    setFormSupplierContact('+1 (800) 555-7860');
    setFormRack('Rack A');
    setFormShelf('Shelf 1');
    setFormBin('Bin 01');
    setFormManufacturer('Standard Pharma Ltd');
    setFormStorage('Room Temp (15-25°C)');
    setShowAddModal(true);
  };

  const handleSaveMedicineForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBrand || !formBatch) return;

    if (editingItem) {
      let updatedBatches = formBatches.length > 0 ? [...formBatches] : [];
      if (updatedBatches.length > 0) {
        // If restockQty was entered, add to the primary batch
        const addedInward = Number(restockQty) || 0;
        updatedBatches[0] = {
          ...updatedBatches[0],
          batchNumber: formBatch.trim(),
          expirationDate: formExp,
          mfgDate: formMfg,
          mrp: Number(formMrp),
          purchaseRate: Number(formPurchaseRate),
          stockQuantity: (Number(updatedBatches[0].stockQuantity) || 0) + addedInward
        };
      }
      const totalStockAcrossBatches = updatedBatches.length > 0
        ? updatedBatches.reduce((s, b) => s + (Number(b.stockQuantity) || 0), 0)
        : Number(formStock) + (Number(restockQty) || 0);

      // Determine display batch (earliest expiring with stock > 0)
      const activeBatches = updatedBatches.filter(b => (Number(b.stockQuantity) || 0) > 0);
      const sorted = (activeBatches.length > 0 ? activeBatches : updatedBatches).slice().sort((a, b) => {
        return new Date(a.expirationDate || '2099-12-31').getTime() - new Date(b.expirationDate || '2099-12-31').getTime();
      });
      const displayBatch = sorted[0] || updatedBatches[0];

      updateInventoryItem(editingItem.id, {
        brandName: formBrand.trim(),
        genericName: formGeneric.trim() || formBrand.trim(),
        saltComposition: formSalt.trim() || formGeneric.trim() || formBrand.trim(),
        strength: formStrength.trim(),
        dosageForm: formDosageForm,
        category: formCategory,
        scheduleClass: formSchedule,
        batchNumber: displayBatch ? displayBatch.batchNumber : formBatch.trim(),
        mfgDate: formMfg,
        expirationDate: displayBatch ? displayBatch.expirationDate : formExp,
        mrp: Number(formMrp),
        purchaseRate: Number(formPurchaseRate),
        costPrice: Number(formPurchaseRate),
        sellingPrice: Number(formMrp),
        stockQuantity: totalStockAcrossBatches,
        batches: updatedBatches,
        unit: formUnit,
        packSize: Number(formPackSize),
        reorderLevel: Number(formMinAlert),
        minAlertLevel: Number(formMinAlert),
        gstRate: Number(formGst),
        hsnCode: formHsn,
        supplierName: formSupplier,
        supplierContact: formSupplierContact,
        rackNumber: formRack,
        shelfRow: formShelf,
        boxBin: formBin,
        manufacturer: formManufacturer,
        storageCondition: formStorage
      });

      addToast({
        type: 'success',
        title: 'Master Record Updated',
        message: restockQty > 0
          ? `Restocked ${formBrand} (+${restockQty} units). Total stock is now ${totalStockAcrossBatches} ${formUnit}.`
          : `Updated ${formBrand} master record (Batch: ${formBatch}, Stock: ${totalStockAcrossBatches} across ${updatedBatches.length} batch(es)).`
      });
      setRestockQty(0);
      setEditingItem(null);
    } else {
      addInventoryItem({
        ndc: 'NDC-' + Math.floor(10000 + Math.random() * 90000),
        brandName: formBrand,
        genericName: formGeneric || formBrand,
        saltComposition: formSalt || formGeneric,
        strength: formStrength,
        dosageForm: formDosageForm,
        category: formCategory,
        scheduleClass: formSchedule,
        batchNumber: formBatch,
        mfgDate: formMfg,
        expirationDate: formExp,
        mrp: Number(formMrp),
        purchaseRate: Number(formPurchaseRate),
        sellingPrice: Number(formMrp),
        stockQuantity: Number(formStock),
        unit: formUnit,
        packSize: Number(formPackSize),
        reorderLevel: Number(formMinAlert),
        minAlertLevel: Number(formMinAlert),
        gstRate: Number(formGst),
        hsnCode: formHsn,
        supplierName: formSupplier,
        supplierContact: formSupplierContact,
        rackNumber: formRack,
        shelfRow: formShelf,
        boxBin: formBin,
        manufacturer: formManufacturer || 'Pharma Corp',
        storageCondition: formStorage,
        isNearExpiryDiscount: false,
        discountPercent: 0,
        quarantined: false,
        autoReorder: true
      });
      setRestockQty(0);
      setEditingItem(null);
    }
    setShowAddModal(false);
  };

  return (
    <div id="inventory-view-container" className="space-y-6">
      
      {/* Confirmation Banner: Smart Deduplication & Stock Merged */}
      {lastMergeBanner && (
        <div 
          id="existing-medicine-merged-banner"
          className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500/40 text-emerald-900 dark:text-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-emerald-900 dark:text-emerald-50">
                  Existing medicine found. Stock quantity updated.
                </span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-200/70 dark:bg-emerald-800/60 text-emerald-900 dark:text-emerald-100">
                  Smart Merged
                </span>
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-200 mt-0.5">
                <strong>{lastMergeBanner.brandName}</strong> stock merged: {lastMergeBanner.previousStock} + <strong className="text-emerald-700 dark:text-emerald-300 font-black">+{lastMergeBanner.addedStock} {lastMergeBanner.unit || 'units'}</strong> → <span className="font-extrabold text-emerald-950 dark:text-white underline">{lastMergeBanner.newStock} total in master record</span> (Batch: {lastMergeBanner.batchNumber}). No duplicate rows created.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              onClick={() => setSearchTerm(lastMergeBanner.brandName)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              Locate in Table
            </button>
            <button
              onClick={() => setLastMergeBanner(null)}
              className="p-1.5 text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 cursor-pointer"
              title="Dismiss confirmation banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Banner & Fast Actions */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Package className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Medicine Inventory & Physical Rack Position Manager
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Real-time batch tracking, structured physical shelf coordinates (Rack/Shelf/Bin), and intelligent generic salt substitution.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {reorderAlertItems.length > 0 && (
              <button
                onClick={() => setStockFilter(prev => prev === 'reorder_point_alert' ? 'all' : 'reorder_point_alert')}
                id="reorder-point-alert-badge-btn"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  stockFilter === 'reorder_point_alert'
                    ? 'bg-amber-500 text-white ring-2 ring-amber-400'
                    : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                }`}
                title="Filter table to items reaching reorder point based on historical consumption"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                </span>
                <span>🚨 {reorderAlertItems.length} at Reorder Point</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('expiry')}
              id="goto-expiry-alerts-btn"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold transition-all"
            >
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span>90-Day Expiry Engine</span>
            </button>

            <button
              onClick={() => {
                setBulkImportSuccess(null);
                setShowBulkPasteModal(true);
              }}
              id="bulk-csv-paste-btn"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 text-xs font-semibold transition-all"
            >
              <Boxes className="w-4 h-4 text-indigo-500" />
              <span>📥 Bulk / CSV Paste</span>
            </button>

            <button
              onClick={() => {
                setQaCountAdded(0);
                setShowQuickAddModal(true);
              }}
              id="chemist-quick-add-btn"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-xs font-bold transition-all shadow-xs"
            >
              <Zap className="w-4 h-4 text-amber-600" />
              <span>⚡ Fast Quick-Add (Tab-Key)</span>
            </button>

            <button
              onClick={handleOpenNewMedicine}
              id="add-new-medicine-btn"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-all shadow-md shadow-teal-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Medicine</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
          
          {/* Medicine Search with Browser SpeechRecognition */}
          <div className="relative">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
              isVoiceListening ? 'text-rose-500 animate-pulse' : 'text-slate-400'
            }`} />
            <input
              id="medicine-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isVoiceListening ? "🎙️ Listening... Speak medicine name..." : "Search brand, generic salt, batch, rack..."}
              className={`w-full pl-9 pr-16 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                isVoiceListening
                  ? 'border-rose-500 ring-2 ring-rose-500/25 bg-rose-50/40 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100 placeholder-rose-400'
                  : 'border-slate-200 dark:border-slate-700 focus:ring-teal-500/20 focus:border-teal-500'
              }`}
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer rounded"
                  title="Clear search query"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {/* Microphone Icon Button for Voice-Activated Medicine Search */}
              <button
                type="button"
                id="medicine-search-voice-btn"
                onClick={toggleVoiceSearch}
                className={`p-1.5 rounded-lg transition-all flex items-center justify-center cursor-pointer relative ${
                  isVoiceListening
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/40 ring-2 ring-rose-400 animate-pulse'
                    : 'bg-teal-50 dark:bg-teal-950/80 hover:bg-teal-100 dark:hover:bg-teal-900 text-teal-600 dark:text-teal-400 border border-teal-200/80 dark:border-teal-800/80'
                }`}
                title={isVoiceListening ? "Listening... Click to stop voice search" : "Voice search: Click and speak medicine or salt name"}
              >
                {isVoiceListening ? (
                  <>
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                    <Mic className="w-3.5 h-3.5 text-white" />
                  </>
                ) : (
                  <Mic className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700 text-xs">
            <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All Therapeutic Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Rack Location Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700 text-xs">
            <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <select
              value={selectedRack}
              onChange={(e) => setSelectedRack(e.target.value)}
              className="w-full bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All Physical Racks & Cold Units</option>
              {racksList.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Stock Level Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700 text-xs">
            <Boxes className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={stockFilter}
              onChange={(e: any) => setStockFilter(e.target.value)}
              className="w-full bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All Stock Levels</option>
              <option value="reorder_point_alert">🚨 Reached Reorder Point ({reorderAlertItems.length})</option>
              <option value="needs_reorder_7d">⚡ Needs Reorder Now (≤ 7 Days)</option>
              <option value="needs_reorder_30d">📅 Needs Reorder This Month (≤ 30 Days)</option>
              <option value="low">⚠️ Low Stock (≤ Reorder Level)</option>
              <option value="out">❌ Out of Stock (0 Qty)</option>
              <option value="near_expiry">⏳ Expiring within 90 Days</option>
            </select>
          </div>

        </div>

        {/* Voice Search Active Listening & Feedback Banner */}
        {isVoiceListening && (
          <div className="mt-3 px-3.5 py-2 rounded-xl bg-rose-50/90 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100 flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              <span className="font-bold shrink-0 flex items-center gap-1 text-rose-700 dark:text-rose-300">
                <Mic className="w-3.5 h-3.5" />
                Listening for medicine name:
              </span>
              {voiceTranscript ? (
                <span className="font-semibold bg-white/90 dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800 truncate text-slate-900 dark:text-white">
                  "{voiceTranscript}"
                </span>
              ) : (
                <span className="italic text-rose-600/80 dark:text-rose-400/80 text-[11px] truncate">
                  Speak clearly (e.g., "Paracetamol 650", "Augmentin", "Pantocid")...
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={stopVoiceSearch}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors shadow-2xs cursor-pointer"
            >
              Done Speaking
            </button>
          </div>
        )}

        {/* Voice Error Banner */}
        {voiceError && (
          <div className="mt-3 px-3.5 py-2 rounded-xl bg-amber-50/90 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100 flex items-center justify-between gap-2 text-xs animate-in fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate">{voiceError}</span>
            </div>
            <button
              type="button"
              onClick={clearVoiceError}
              className="p-1 text-amber-600 hover:text-amber-800 dark:hover:text-amber-300 transition-colors cursor-pointer"
              title="Dismiss notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Automatic Reorder Alert Banner: Highlight items reaching reorder point based on historical consumption */}
      <AutomaticReorderAlertBanner
        alertItems={reorderAlertItems}
        allForecastsMap={reorderForecastMap}
        isTableFiltered={stockFilter === 'reorder_point_alert'}
        onToggleFilterTable={() => {
          setStockFilter(prev => prev === 'reorder_point_alert' ? 'all' : 'reorder_point_alert');
        }}
        onOpenForecastModal={(item) => setForecastModalItem(item)}
        onLocateItem={(brandName) => setSearchTerm(brandName)}
        onCreateConsolidatedPO={handleCreateConsolidatedPOFromAlert}
        onToast={addToast}
      />

      {/* Suggested Reorder Radar Banner: Consumption Intelligence & PO Schedule */}
      <InventoryReorderRadar
        summary={reorderRadarSummary}
        isUrgentFilterActive={stockFilter === 'needs_reorder_7d'}
        onToggleUrgentFilter={() => {
          setStockFilter(prev => prev === 'needs_reorder_7d' ? 'all' : 'needs_reorder_7d');
        }}
        isSortByUrgencyActive={sortByUrgency}
        onToggleSortByUrgency={() => {
          setSortByUrgency(prev => !prev);
        }}
      />

      {/* Main Inventory Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4 min-w-[240px]">
                  <div className="flex items-center gap-2">
                    <Pill className="w-3.5 h-3.5 text-teal-600" />
                    <span>Medicine & Form</span>
                  </div>
                </th>
                <th className="py-3 px-4">Batch & Expiry</th>
                <th className="py-3 px-4">📍 Physical Rack Location</th>
                <th className="py-3 px-4">Stock Qty & Unit</th>
                <th className="py-3 px-4 min-w-[175px]">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
                    <span>Suggested Reorder Date</span>
                  </div>
                </th>
                <th className="py-3 px-4">Rates (MRP / Purchase)</th>
                <th className="py-3 px-4">GST / HSN</th>
                <th className="py-3 px-4">Distributor</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">No Medicines Found</p>
                    <p className="text-xs text-slate-400">Try adjusting your search query or filter criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredInventory.map(item => {
                  const daysLeft = getDaysUntilExpiry(item.expirationDate);
                  const isLow = item.stockQuantity <= item.minAlertLevel;
                  const isOut = item.stockQuantity === 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-750 transition-colors">
                      
                      {/* Brand, Icon & Salt */}
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-2.5">
                          <MedicineThumbnail item={item} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-white text-sm">
                                {item.brandName}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {item.dosageForm}
                              </span>
                              {item.isNearExpiryDiscount && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
                                  {item.discountPercent}% OFF
                                </span>
                              )}
                              {item.offerType && item.offerType !== 'none' && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  item.offerType === 'percentage'
                                    ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800'
                                    : item.offerType === 'flat'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800'
                                    : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-400 dark:border-purple-800'
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
                            <div className="text-slate-500 dark:text-slate-400 text-xs font-mono truncate max-w-xs mt-0.5">
                              {item.saltComposition || item.genericName}
                            </div>
                            <div className="text-[11px] text-teal-600 font-medium">
                              {item.category} • {item.storageCondition}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Batch & Expiry */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="font-mono text-slate-700 dark:text-slate-300 font-semibold bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded inline-block border border-slate-200 dark:border-slate-700 text-xs">
                            {item.batchNumber}
                          </div>
                          {item.batches && item.batches.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setExpandedBatchesItemId(prev => prev === item.id ? null : item.id)}
                              className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 hover:bg-teal-200 dark:bg-teal-900/70 dark:hover:bg-teal-900 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-700 transition-colors flex items-center gap-0.5 cursor-pointer"
                              title="Click to view all batches attached under this medicine"
                            >
                              <span>{item.batches.length} Batches</span>
                              {expandedBatchesItemId === item.id ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                            </button>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                          Exp: <span className={daysLeft <= 30 ? 'text-rose-600 font-bold' : daysLeft <= 90 ? 'text-amber-600 font-semibold' : ''}>{item.expirationDate}</span>
                        </div>

                        {/* Expandable secondary batches dropdown */}
                        {item.batches && item.batches.length > 1 && expandedBatchesItemId === item.id && (
                          <div className="mt-2 p-2.5 bg-slate-50 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] space-y-1.5 shadow-sm animate-in fade-in">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">All Batches for this Record:</div>
                            {item.batches.map(b => (
                              <div key={b.id || b.batchNumber} className="flex items-center justify-between gap-2 py-1 border-b last:border-none border-slate-200 dark:border-slate-800 font-mono">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-800 dark:text-slate-200">#{b.batchNumber}</span>
                                  <span className="text-[10px] text-slate-400">Exp: {b.expirationDate}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-700 dark:text-slate-300 font-bold">{b.stockQuantity} {item.unit}</span>
                                  <button
                                    type="button"
                                    onClick={() => setEditingBatch({ medicine: item, batch: b })}
                                    className="p-1 rounded text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    title={`Edit batch ${b.batchNumber}`}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingBatch({ medicine: item, batch: b })}
                                    className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    title={`Delete batch ${b.batchNumber}`}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              className="text-[10px] font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1 pt-1 cursor-pointer"
                            >
                              <Pencil className="w-2.5 h-2.5" />
                              <span>Manage Batches in Edit Modal</span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* PHYSICAL RACK LOCATION - Prominent Badge */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setRackEditItem(item)}
                          className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/80 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 transition-all font-bold text-xs shadow-xs"
                          title="Click to quickly reassign physical rack coordinate"
                        >
                          <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0 group-hover:scale-110 transition-transform" />
                          <span>{item.locationShelf || `${item.rackNumber}-${item.shelfRow}`}</span>
                          <Edit3 className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 ml-1 text-teal-600" />
                        </button>
                      </td>

                      {/* Stock Quantity */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-black font-mono ${
                            isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-900 dark:text-white'
                          }`}>
                            {item.stockQuantity}
                          </span>
                          <span className="text-slate-500 text-[11px]">{item.unit}</span>
                        </div>
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300 px-1.5 py-0.2 rounded border border-rose-200 dark:border-rose-800 mt-0.5">
                            OUT OF STOCK (0)
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 mt-0.5">
                            LOW STOCK (Min: {item.minAlertLevel})
                          </span>
                        ) : null}
                      </td>

                      {/* Suggested Reorder Date & Historical Consumption Velocity */}
                      <td className="py-3 px-4">
                        {(() => {
                          const forecast = reorderForecastMap.get(item.id);
                          const urgency = forecast?.urgencyStatus;
                          const badgeClasses = 
                            urgency === 'out_of_stock' || urgency === 'urgent'
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              : urgency === 'soon'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              : urgency === 'upcoming'
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';

                          return (
                            <button
                              type="button"
                              onClick={() => setForecastModalItem(item)}
                              id={`reorder-date-trigger-${item.id}`}
                              className="text-left group cursor-pointer block hover:opacity-85 transition-opacity"
                              title="Click to view detailed consumption rate analysis and calculate reorder purchase order"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeClasses}`}>
                                  <Calendar className="w-2.5 h-2.5 shrink-0" />
                                  <span>{forecast?.suggestedReorderDateFormatted || 'Calculate'}</span>
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                <span className="font-semibold text-slate-700 dark:text-slate-200 font-mono">
                                  {forecast?.averageDailySales ?? 0} <span className="text-[10px] font-normal text-slate-400">sold/day</span>
                                </span>
                                <span>•</span>
                                <span className={forecast && forecast.daysOfStockRemaining <= 7 ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}>
                                  {forecast?.daysOfStockRemaining ?? 0}d runway
                                </span>
                              </div>
                            </button>
                          );
                        })()}
                      </td>

                      {/* Rates */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          MRP: ₹{item.mrp.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Cost: ₹{item.purchaseRate.toFixed(2)} | Margin: {item.mrp > 0 ? (((item.mrp - item.purchaseRate) / item.mrp) * 100).toFixed(0) : 0}%
                        </div>
                      </td>

                      {/* GST / HSN */}
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                        <div>GST: {item.gstRate}%</div>
                        <div className="text-[10px] text-slate-400">HSN: {item.hsnCode}</div>
                      </td>

                      {/* Distributor */}
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        <div className="font-medium">{item.supplierName || 'Sun Pharma Dist'}</div>
                        <div className="text-[10px] text-slate-400">{item.supplierContact}</div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* REORDER INTEL BUTTON */}
                          <button
                            onClick={() => setForecastModalItem(item)}
                            id={`reorder-forecast-btn-${item.id}`}
                            className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                            title="Analyze daily consumption rate and suggested reorder schedule"
                          >
                            <TrendingUp className="w-3 h-3 text-teal-600" />
                            <span>Reorder</span>
                          </button>

                          {/* SMART SUBSTITUTE BUTTON */}
                          <button
                            onClick={() => setSubstituteModalItem(item)}
                            id={`find-substitutes-btn-${item.id}`}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold transition-colors flex items-center gap-1"
                            title="Find in-stock salt substitutes"
                          >
                            <ArrowRightLeft className="w-3 h-3 text-indigo-600" />
                            <span>Substitutes</span>
                          </button>

                          {/* Inline Edit / Quick Correction Action */}
                          <button
                            onClick={() => handleStartEdit(item)}
                            id={`edit-medicine-btn-${item.id}`}
                            className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/70 dark:hover:bg-teal-900 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                            title="Edit medicine details, correct batch, expiry, unit price, or restock"
                          >
                            <Pencil className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                            <span>Edit</span>
                          </button>

                          {/* Delete Medicine Action */}
                          <button
                            onClick={() => setDeletingMedicine(item)}
                            id={`delete-medicine-btn-${item.id}`}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/70 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 text-xs font-bold transition-all flex items-center justify-center cursor-pointer shadow-xs"
                            title="Delete medicine and all associated batches"
                            aria-label={`Delete ${item.brandName}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Smart Stock Substitute Finder */}
      {substituteModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-indigo-600 font-bold">
                <ArrowRightLeft className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Smart Salt Substitute Recommendations
                </h3>
              </div>
              <button onClick={() => setSubstituteModalItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Medicine Box */}
            <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-900 dark:text-indigo-200 text-sm">
                  {substituteModalItem.brandName} ({substituteModalItem.strength})
                </span>
                <span className="font-mono text-indigo-700 font-semibold">
                  Stock: {substituteModalItem.stockQuantity} {substituteModalItem.unit}
                </span>
              </div>
              <div className="text-slate-600 dark:text-slate-300 font-mono">
                Active Salt: <span className="font-bold text-slate-900 dark:text-white">{substituteModalItem.saltComposition || substituteModalItem.genericName}</span>
              </div>
              <div className="text-teal-700 font-medium">
                Current Location: {substituteModalItem.locationShelf} | MRP: ₹{substituteModalItem.mrp.toFixed(2)}
              </div>
            </div>

            {/* Substitute List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Matching In-Stock Generic / Salt Alternatives:
              </p>

              {findSubstitutes(substituteModalItem).length === 0 ? (
                <div className="py-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <AlertCircle className="w-6 h-6 mx-auto text-amber-500 mb-1" />
                  <p className="font-semibold text-slate-700 text-xs">No direct salt substitutes found in stock.</p>
                  <p className="text-[11px] text-slate-400">Order from distributor or check alternative strengths.</p>
                </div>
              ) : (
                findSubstitutes(substituteModalItem).map(sub => {
                  const priceDiff = sub.mrp - substituteModalItem.mrp;

                  return (
                    <div 
                      key={sub.id} 
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-3 hover:border-indigo-400 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">{sub.brandName}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            IN STOCK: {sub.stockQuantity}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-mono">{sub.saltComposition || sub.genericName}</div>
                        <div className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-300 font-bold text-xs">
                          <MapPin className="w-3 h-3 text-teal-600" />
                          <span>Rack Location: {sub.locationShelf}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-bold text-sm text-slate-900 dark:text-white font-mono">₹{sub.mrp.toFixed(2)}</div>
                        <div className={`text-[11px] font-semibold ${priceDiff <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {priceDiff <= 0 ? `Saves ₹${Math.abs(priceDiff).toFixed(2)}` : `+₹${priceDiff.toFixed(2)}`}
                        </div>
                        <button
                          onClick={() => {
                            setSubstituteModalItem(null);
                            setActiveTab('pos');
                          }}
                          className="mt-1.5 px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                        >
                          Bill in POS
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                onClick={() => setSubstituteModalItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Quick Rack Location Editor */}
      {rackEditItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-teal-600 font-bold">
                <MapPin className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Update Physical Storage Location
                </h3>
              </div>
              <button onClick={() => setRackEditItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Set precise physical coordinates for <strong className="text-slate-900 dark:text-white">{rackEditItem.brandName}</strong> so staff can find the batch instantly on shelf.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Rack / Unit Number:</label>
                <select
                  value={formRack}
                  onChange={(e) => setFormRack(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value="Rack A">Rack A (Cardiovascular & Statins)</option>
                  <option value="Rack B">Rack B (Antidiabetics & Endocrine)</option>
                  <option value="Rack C">Rack C (Antibiotics & Anti-infectives)</option>
                  <option value="Rack D">Rack D (Gastrointestinal & PPIs)</option>
                  <option value="Rack E">Rack E (Analgesics & Fast Moving OTC)</option>
                  <option value="Rack F">Rack F (Respiratory & Inhalers)</option>
                  <option value="Cold Unit 1">Cold Unit 1 (Insulins & Injections 2-8°C)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Shelf / Tier:</label>
                  <input
                    type="text"
                    value={formShelf}
                    onChange={(e) => setFormShelf(e.target.value)}
                    placeholder="Shelf 2 / Tier B"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Box / Bin:</label>
                  <input
                    type="text"
                    value={formBin}
                    onChange={(e) => setFormBin(e.target.value)}
                    placeholder="Bin 04 / Tray 02"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800 flex justify-between items-center font-semibold text-teal-800 dark:text-teal-200">
                <span>Formatted Coordinate:</span>
                <span className="font-mono text-sm">{formRack}-{formShelf.replace(/[^0-9]/g, '') || '1'} • {formBin}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setRackEditItem(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateRackPosition(rackEditItem.id, formRack, formShelf, formBin);
                  setRackEditItem(null);
                }}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm"
              >
                Save Coordinates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Full Add / Edit Medicine */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-teal-600 font-bold">
                <Package className="w-5 h-5" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingItem ? `Edit & Restock: ${editingItem.brandName}` : 'Register New Medicine into Inventory'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-normal">
                    {editingItem 
                      ? 'Modify batch, expiry, unit price, and stock or restock incoming units directly in this master record without leaving the screen.' 
                      : 'Smart inventory will automatically merge stock into the master record if this medicine already exists.'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Smart Merge Warning when Adding New Medicine */}
            {formExistingMatch && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-900 dark:text-emerald-100 text-xs flex items-start gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Existing medicine detected in master inventory!</div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                    <strong>{formExistingMatch.brandName}</strong> already exists with <strong>{formExistingMatch.stockQuantity} {formExistingMatch.unit}</strong> (Batch: {formExistingMatch.batchNumber}). Submitting this form will automatically merge the new quantity (+{formStock}) into the existing master record and update details without creating a duplicate row.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveMedicineForm} className="space-y-4 text-xs">
              
              {/* Row 1: Brand & Salt */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Brand Name *:</label>
                  <input
                    type="text"
                    required
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="e.g. Lipitor, Augmentin 625"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Generic / Salt Composition *:</label>
                  <input
                    type="text"
                    required
                    value={formSalt}
                    onChange={(e) => setFormSalt(e.target.value)}
                    placeholder="e.g. Atorvastatin Calcium 40mg"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              {/* Row 2: Category, Dosage, Strength */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category:</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="Cardiovascular (Statin)">Cardiovascular</option>
                    <option value="Antihypertensive">Antihypertensive</option>
                    <option value="Antidiabetic">Antidiabetic</option>
                    <option value="Antibacterial">Antibacterial</option>
                    <option value="Analgesic & Antipyretic">Analgesic & Antipyretic</option>
                    <option value="Gastrointestinal (PPI)">Gastrointestinal</option>
                    <option value="Respiratory">Respiratory</option>
                    <option value="Vitamins & Supplements">Vitamins & Supplements</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Dosage Form:</label>
                  <select
                    value={formDosageForm}
                    onChange={(e: any) => setFormDosageForm(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Injection">Injection</option>
                    <option value="Ointment">Ointment</option>
                    <option value="Eye Drops">Eye Drops</option>
                    <option value="Inhaler">Inhaler</option>
                    <option value="Suspension">Suspension</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Strength:</label>
                  <input
                    type="text"
                    value={formStrength}
                    onChange={(e) => setFormStrength(e.target.value)}
                    placeholder="e.g. 40 mg, 625 mg"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              {/* Row 3: Physical Rack Positioning System */}
              <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800 space-y-2">
                <span className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  Physical Rack Location Coordinates (Required for Instant Counter Fetch)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Rack Number:</label>
                    <select
                      value={formRack}
                      onChange={(e) => setFormRack(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    >
                      <option value="Rack A">Rack A</option>
                      <option value="Rack B">Rack B</option>
                      <option value="Rack C">Rack C</option>
                      <option value="Rack D">Rack D</option>
                      <option value="Rack E">Rack E</option>
                      <option value="Rack F">Rack F</option>
                      <option value="Cold Unit 1">Cold Unit 1 (Fridge)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Shelf / Row:</label>
                    <input
                      type="text"
                      value={formShelf}
                      onChange={(e) => setFormShelf(e.target.value)}
                      placeholder="Shelf 2"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Box / Bin:</label>
                    <input
                      type="text"
                      value={formBin}
                      onChange={(e) => setFormBin(e.target.value)}
                      placeholder="Bin 04"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Batch, Dates, Stock */}
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Batch Number *:</label>
                  <input
                    type="text"
                    required
                    value={formBatch}
                    onChange={(e) => setFormBatch(e.target.value)}
                    placeholder="LT-88190B"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Mfg Date:</label>
                  <input
                    type="date"
                    value={formMfg}
                    onChange={(e) => setFormMfg(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Expiry Date *:</label>
                  <input
                    type="date"
                    required
                    value={formExp}
                    onChange={(e) => setFormExp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {editingItem ? 'Current Stock Qty:' : 'Initial Stock Qty:'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formStock}
                    onChange={(e) => setFormStock(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              {/* Dedicated Stock Re-entry / Quick Restock Card */}
              {editingItem && (
                <div className="p-3.5 bg-teal-50/80 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5 text-xs">
                      <Boxes className="w-4 h-4 text-teal-600" />
                      📦 Re-entry & Restock Inward Quantity
                    </span>
                    <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                      Current: <strong className="text-teal-900 dark:text-white font-mono">{formStock} {formUnit}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        + Add Inward Stock Units:
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          value={restockQty || ''}
                          onChange={(e) => setRestockQty(Math.max(0, parseInt(e.target.value) || 0))}
                          placeholder="0"
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 rounded-lg text-xs font-mono font-bold text-teal-900 dark:text-teal-100"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          {[10, 25, 50, 100].map(amt => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setRestockQty(prev => prev + amt)}
                              className="px-1.5 py-1 bg-white dark:bg-slate-800 hover:bg-teal-100 dark:hover:bg-teal-900 border border-teal-200 dark:border-teal-700 rounded text-[10px] font-mono font-bold text-teal-700 dark:text-teal-300 transition-colors cursor-pointer"
                            >
                              +{amt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-center bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-lg border border-teal-200/70 dark:border-teal-800/70">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">New Total Stock After Save:</span>
                      <div className="text-sm font-black text-teal-700 dark:text-teal-300 font-mono flex items-center gap-1.5 mt-0.5">
                        <span>{Number(formStock) + (Number(restockQty) || 0)} {formUnit}</span>
                        {restockQty > 0 && (
                          <span className="text-[10px] font-normal px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded">
                            (+{restockQty} arriving)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Multi-Batch & Smart Batch Restock Section */}
              {editingItem && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
                      <Layers className="w-4 h-4 text-teal-600" />
                      <span>Smart Multi-Batch Inventory ({formBatches.length} Batch{formBatches.length === 1 ? '' : 'es'})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewBatchInputs(prev => !prev)}
                      className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Attach New Batch</span>
                    </button>
                  </div>

                  {/* Inline Form to Attach New Batch */}
                  {showNewBatchInputs && (
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-teal-300 dark:border-teal-700 space-y-2 animate-in fade-in">
                      <div className="text-[11px] font-bold text-teal-800 dark:text-teal-200">
                        Attach Secondary Batch (Different batch number, expiry date or inward lot)
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                            Batch Number *:
                          </label>
                          <input
                            type="text"
                            value={newBatchNumber}
                            onChange={(e) => setNewBatchNumber(e.target.value)}
                            placeholder="e.g. BT-9920A"
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                            Expiration Date *:
                          </label>
                          <input
                            type="date"
                            value={newBatchExp}
                            onChange={(e) => setNewBatchExp(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                            Stock Units *:
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={newBatchStock}
                            onChange={(e) => setNewBatchStock(Math.max(1, parseInt(e.target.value) || 0))}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowNewBatchInputs(false)}
                          className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleAddSecondaryBatch}
                          disabled={!newBatchNumber.trim()}
                          className="px-3 py-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded text-xs font-semibold cursor-pointer shadow-xs"
                        >
                          Attach Batch
                        </button>
                      </div>
                    </div>
                  )}

                  {/* List of Batches for this medicine */}
                  {formBatches.length > 0 && (
                    <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
                      {formBatches.map((b, idx) => (
                        <div key={b.id || idx} className="p-2.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-[11px] border border-slate-200 dark:border-slate-700">
                              {b.batchNumber}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${idx === 0 ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                              {idx === 0 ? 'Primary' : 'Secondary'}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">Exp: {b.expirationDate}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono font-bold text-slate-700 dark:text-slate-300">
                            <span>{b.stockQuantity} {formUnit}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = formBatches.filter((_, i) => i !== idx);
                                setFormBatches(updated);
                                const totalStock = updated.reduce((s, x) => s + (Number(x.stockQuantity) || 0), 0);
                                setFormStock(totalStock);
                                if (idx === 0 && updated.length > 0) {
                                  setFormBatch(updated[0].batchNumber);
                                  setFormExp(updated[0].expirationDate);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
                              title="Delete this batch"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Row 5: Pricing, GST, Supplier */}
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">MRP (₹) *:</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formMrp}
                    onChange={(e) => setFormMrp(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Purchase Rate (₹):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formPurchaseRate}
                    onChange={(e) => setFormPurchaseRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Min Alert Level:</label>
                  <input
                    type="number"
                    value={formMinAlert}
                    onChange={(e) => setFormMinAlert(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">GST Rate (%):</label>
                  <select
                    value={formGst}
                    onChange={(e) => setFormGst(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12% (Standard Rx)</option>
                    <option value={18}>18% (Supplements/OTC)</option>
                  </select>
                </div>
              </div>

              {/* Row 6: Supplier Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Distributor / Supplier Name:</label>
                  <input
                    type="text"
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    placeholder="e.g. Sun Pharma Dist, Cipla Direct"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Supplier Contact Phone:</label>
                  <input
                    type="text"
                    value={formSupplierContact}
                    onChange={(e) => setFormSupplierContact(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                {/* Instant Delete / Archive Confirmation Dialog */}
                {showDeleteConfirm && editingItem && (
                  <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-xl space-y-2 animate-in fade-in">
                    <div className="flex items-start gap-2.5 text-rose-900 dark:text-rose-100 text-xs">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-sm text-rose-900 dark:text-rose-50">Archive {editingItem.brandName}?</div>
                        <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                          If this medicine was entered completely by mistake, archiving will safely remove it from active inventory stock counts and billing searches.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        Keep Medicine
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          deleteInventoryItem(editingItem.id, true);
                          setShowDeleteConfirm(false);
                          setShowAddModal(false);
                          setEditingItem(null);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
                      >
                        Confirm Archive & Remove
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  {editingItem ? (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(prev => !prev)}
                      className="px-3 py-2 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-200 dark:border-rose-900/60"
                      title="Soft delete or archive this medicine if entered by mistake"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Archive / Delete Medicine</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-md shadow-teal-600/20 cursor-pointer"
                    >
                      {editingItem 
                        ? (restockQty > 0 ? `Save & Restock (+${restockQty} Units)` : 'Save Changes')
                        : 'Save & Stock Medicine'
                      }
                    </button>
                  </div>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: Fast Chemist Quick-Add (Tab-to-next-field keyboard flow) */}
      {showQuickAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-amber-300 dark:border-amber-700 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
                <Zap className="w-5 h-5" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    ⚡ Rapid Chemist Quick-Add Entry
                  </h3>
                  <p className="text-[11px] text-slate-500 font-normal">
                    Designed for rapid keyboard typing (Press <kbd className="px-1 bg-slate-100 dark:bg-slate-700 border rounded font-mono">Tab</kbd> to move, <kbd className="px-1 bg-slate-100 dark:bg-slate-700 border rounded font-mono">Ctrl+Enter</kbd> or click button to save & enter next)
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowQuickAddModal(false)} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {qaCountAdded > 0 && (
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Added <strong>{qaCountAdded}</strong> medicine(s) in this session. Ready for next item!</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!qaBrand.trim()) return;

                addInventoryItem({
                  brandName: qaBrand.trim(),
                  genericName: qaSalt.trim() || qaBrand.trim(),
                  saltComposition: qaSalt.trim() || qaBrand.trim(),
                  strength: qaStrength.trim() || '500mg',
                  dosageForm: 'Tablet',
                  category: 'General Pharmacy',
                  scheduleClass: 'Rx',
                  batchNumber: qaBatch.trim() || ('BT-' + Math.floor(1000 + Math.random() * 9000)),
                  manufacturingDate: '2025-01-01',
                  expirationDate: qaExp,
                  stockQuantity: qaStock,
                  unit: 'Strips',
                  packSize: qaPack,
                  mrp: qaMrp,
                  purchaseRate: qaPtr,
                  minAlertLevel: 15,
                  locationShelf: `${qaRack} / ${qaShelf}`,
                  gstRate: qaGst,
                  hsnCode: '300490',
                  supplierName: 'Direct Distributor',
                  supplierContact: '+91 98765 43210'
                });

                setQaCountAdded(prev => prev + 1);
                // Clear brand & salt, re-generate batch for rapid next item
                setQaBrand('');
                setQaSalt('');
                setQaBatch('BT-' + Math.floor(1000 + Math.random() * 9000));
                
                // Keep focus on brand name input for immediate next entry
                const brandInput = document.getElementById('qa-brand-input');
                if (brandInput) brandInput.focus();
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    1. Brand Name *
                  </label>
                  <input
                    id="qa-brand-input"
                    type="text"
                    required
                    autoFocus
                    value={qaBrand}
                    onChange={(e) => setQaBrand(e.target.value)}
                    placeholder="e.g. Dolo, Pan-D, Augmentin"
                    className="w-full px-3 py-2 bg-amber-50/50 dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    2. Generic / Salt Composition *
                  </label>
                  <input
                    type="text"
                    required
                    value={qaSalt}
                    onChange={(e) => setQaSalt(e.target.value)}
                    placeholder="e.g. Paracetamol, Pantoprazole + Domperidone"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">3. Strength</label>
                  <input
                    type="text"
                    value={qaStrength}
                    onChange={(e) => setQaStrength(e.target.value)}
                    placeholder="650mg, 40mg"
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">4. Batch No.</label>
                  <input
                    type="text"
                    value={qaBatch}
                    onChange={(e) => setQaBatch(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">5. Expiry (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    required
                    value={qaExp}
                    onChange={(e) => setQaExp(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">6. Pack Size</label>
                  <input
                    type="number"
                    value={qaPack}
                    onChange={(e) => setQaPack(parseInt(e.target.value) || 10)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">7. MRP (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={qaMrp}
                    onChange={(e) => setQaMrp(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">8. PTR / Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={qaPtr}
                    onChange={(e) => setQaPtr(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">9. Stock (Strips)</label>
                  <input
                    type="number"
                    value={qaStock}
                    onChange={(e) => setQaStock(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">10. GST %</label>
                  <select
                    value={qaGst}
                    onChange={(e) => setQaGst(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12% (Rx standard)</option>
                    <option value={18}>18%</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-2.5 bg-teal-50/60 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800">
                <div>
                  <label className="block font-bold text-teal-900 dark:text-teal-200 mb-1">11. Physical Rack</label>
                  <select
                    value={qaRack}
                    onChange={(e) => setQaRack(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 rounded-lg font-bold"
                  >
                    {['Rack A', 'Rack B', 'Rack C', 'Rack D', 'Rack E', 'Cold Storage'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-teal-900 dark:text-teal-200 mb-1">12. Shelf / Box</label>
                  <input
                    type="text"
                    value={qaShelf}
                    onChange={(e) => setQaShelf(e.target.value)}
                    placeholder="Shelf 1, Box 3"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 rounded-lg font-bold"
                  />
                </div>
              </div>

              {/* Smart Merge Warning when Quick-Adding Existing Medicine */}
              {qaExistingMatch && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-900 dark:text-emerald-100 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Existing medicine detected in inventory!</div>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                      <strong>{qaExistingMatch.brandName}</strong> already exists with <strong>{qaExistingMatch.stockQuantity} {qaExistingMatch.unit}</strong> (Location: {qaExistingMatch.locationShelf || qaExistingMatch.rackNumber}). Submitting will merge <strong>+{qaStock} units</strong> into the master stock and update batch/rate details without creating duplicate rows.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-500">
                  Margin: {qaMrp > 0 ? (((qaMrp - qaPtr) / qaMrp) * 100).toFixed(0) : 0}% (₹{(qaMrp - qaPtr).toFixed(2)} / unit)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickAddModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400"
                  >
                    Done & Close
                  </button>
                  <button
                    type="submit"
                    id="save-next-quick-add-btn"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Save & Next Item (Enter)</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Bulk CSV / Distributor Invoice Paste */}
      {showBulkPasteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
                <Boxes className="w-5 h-5" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    📥 Bulk Medicine Import (CSV / Tab-Separated Paste)
                  </h3>
                  <p className="text-[11px] text-slate-500 font-normal">
                    Paste rows directly from your distributor Excel sheet or invoice
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowBulkPasteModal(false)} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bulkImportSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs font-medium">
                {bulkImportSuccess}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Format: Brand, Salt, Strength, Batch, Expiry(YYYY-MM-DD), MRP, PTR, Stock, GST%, Rack
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setBulkCsvText(
`Calpol 650, Paracetamol, 650mg, CAL-902, 2027-11-30, 32.50, 18.00, 150, 12, Rack A / Shelf 1
Azithral 500, Azithromycin, 500mg, AZ-441, 2026-09-30, 125.00, 78.00, 80, 12, Rack B / Shelf 2
Montair LC, Montelukast + Levocetirizine, 10mg+5mg, MLC-109, 2027-08-31, 185.00, 110.00, 60, 12, Rack A / Shelf 3
Pan 40, Pantoprazole, 40mg, PAN-882, 2028-02-28, 140.00, 82.00, 120, 12, Rack C / Shelf 1
Volini Gel, Diclofenac Diethylamine, 30g, VOL-330, 2026-10-31, 110.00, 65.00, 45, 18, Rack D / Shelf 4`
                    );
                  }}
                  className="text-teal-600 hover:text-teal-700 font-semibold"
                >
                  Load Sample Distributor Sheet
                </button>
              </div>

              <textarea
                rows={7}
                value={bulkCsvText}
                onChange={(e) => setBulkCsvText(e.target.value)}
                placeholder="Paste CSV lines here..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-400">
                Supports commas or tabs. Missing fields default safely.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkPasteModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!bulkCsvText.trim()) return;

                    const lines = bulkCsvText.trim().split('\n');
                    const newItems: (Partial<MedicationInventory> & { brandName: string })[] = [];

                    lines.forEach((line, idx) => {
                      if (!line.trim()) return;
                      // Split by comma or tab
                      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
                      const brand = parts[0]?.trim() || `Medicine ${idx + 1}`;
                      const salt = parts[1]?.trim() || brand;
                      const strength = parts[2]?.trim() || '500mg';
                      const batch = parts[3]?.trim() || `BT-${Math.floor(1000 + Math.random() * 9000)}`;
                      const exp = parts[4]?.trim() || '2027-12-31';
                      const mrp = parseFloat(parts[5]?.trim()) || 50;
                      const ptr = parseFloat(parts[6]?.trim()) || (mrp * 0.6);
                      const stock = parseInt(parts[7]?.trim()) || 50;
                      const gst = parseInt(parts[8]?.trim()) || 12;
                      const rack = parts[9]?.trim() || 'Rack A / Shelf 1';

                      newItems.push({
                        brandName: brand,
                        genericName: salt,
                        saltComposition: salt,
                        strength: strength,
                        dosageForm: 'Tablet',
                        category: 'General Medicine',
                        scheduleClass: 'Rx',
                        batchNumber: batch,
                        manufacturingDate: '2025-01-01',
                        expirationDate: exp,
                        stockQuantity: stock,
                        unit: 'Strips',
                        packSize: 10,
                        mrp: mrp,
                        purchaseRate: ptr,
                        minAlertLevel: 15,
                        locationShelf: rack,
                        gstRate: gst,
                        hsnCode: '300490',
                        supplierName: 'Distributor Import',
                        supplierContact: '+91 98765 43210'
                      });
                    });

                    if (newItems.length > 0) {
                      addBulkInventoryItems(newItems);
                      setBulkImportSuccess(`Successfully imported ${newItems.length} medicines into inventory!`);
                      setBulkCsvText('');
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                >
                  <Boxes className="w-4 h-4" />
                  <span>Parse & Import All Items</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Item Reorder Forecast & Replenishment Modal */}
      {forecastModalItem && (
        <ItemReorderForecastModal
          item={forecastModalItem}
          transactions={transactions}
          onClose={() => setForecastModalItem(null)}
          onToast={addToast}
        />
      )}

      {/* DELETE MEDICINE CONFIRM MODAL */}
      <DeleteMedicineConfirmModal
        isOpen={!!deletingMedicine}
        medicine={deletingMedicine}
        onClose={() => setDeletingMedicine(null)}
        onConfirm={async (medicineId) => {
          await deleteInventoryItem(medicineId, false);
        }}
      />

      {/* EDIT BATCH MODAL */}
      <EditBatchModal
        isOpen={!!editingBatch}
        medicine={editingBatch?.medicine || null}
        batch={editingBatch?.batch || null}
        onClose={() => setEditingBatch(null)}
        onSave={(medicineId, batchIdOrNumber, updatedBatch) => {
          updateBatch(medicineId, batchIdOrNumber, updatedBatch);
        }}
      />

      {/* DELETE BATCH CONFIRM MODAL */}
      <DeleteBatchConfirmModal
        isOpen={!!deletingBatch}
        medicine={deletingBatch?.medicine || null}
        batch={deletingBatch?.batch || null}
        onClose={() => setDeletingBatch(null)}
        onConfirm={(medicineId, batchIdOrNumber) => {
          deleteBatch(medicineId, batchIdOrNumber);
        }}
      />

      {/* Mobile Floating + Add Medicine FAB */}
      <div className="fixed bottom-20 right-4 sm:hidden z-30">
        <button
          onClick={handleOpenNewMedicine}
          id="mobile-inventory-add-fab"
          className="w-13 h-13 rounded-full bg-teal-600 hover:bg-teal-700 text-white shadow-xl flex items-center justify-center cursor-pointer active:scale-95 border-2 border-white dark:border-slate-800"
          title="Add New Medicine"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

    </div>
  );
};
