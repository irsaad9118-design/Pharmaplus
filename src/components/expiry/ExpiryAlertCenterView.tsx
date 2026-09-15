import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { MedicationInventory, ExpiryAlertTier, DebitNote } from '../../types/pharmacy';
import { DistributorReturnSlipModal } from './DistributorReturnSlipModal';
import { EditExpiringMedicineModal } from './EditExpiringMedicineModal';
import { ExpiryMonthlyBarChart } from './ExpiryMonthlyBarChart';
import { generateStockistReturnPdf } from '../../utils/stockistReturnPdfGenerator';
import { 
  AlertTriangle, 
  Clock, 
  RotateCcw, 
  Tag, 
  ShieldAlert, 
  CheckCircle2, 
  Filter, 
  Search, 
  FileSpreadsheet, 
  Printer, 
  MapPin, 
  Building2, 
  Calendar, 
  Package, 
  Layers, 
  Percent, 
  ArrowRight, 
  FileText,
  FileDown,
  Download,
  Sparkles,
  X,
  Plus,
  Mic,
  Pencil
} from 'lucide-react';
import { useVoiceSearch } from '../../hooks/useVoiceSearch';

export const ExpiryAlertCenterView: React.FC = () => {
  const { 
    inventory, 
    debitNotes, 
    shopSettings,
    addToast,
    getExpiryTier, 
    getDaysUntilExpiry, 
    applyNearExpiryDiscount, 
    createDebitNoteReturn, 
    quarantineItem,
    updateInventoryItem,
    deleteInventoryItem,
    setActiveTab
  } = usePharmacy();

  const [selectedCategory, setSelectedCategory] = useState<'all' | 'expired' | '30days' | '60days' | '90days'>('all');
  const [selectedTier, setSelectedTier] = useState<'all' | ExpiryAlertTier>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'alerts' | 'debit_notes'>('alerts');

  // Voice Search for Expiry Alert Center
  const {
    isListening: isVoiceListening,
    transcript: voiceTranscript,
    error: voiceError,
    toggleListening: toggleVoiceSearch,
    stopListening: stopVoiceSearch,
    clearError: clearVoiceError
  } = useVoiceSearch({
    onTranscript: (spokenText) => {
      setSearchTerm(spokenText);
    }
  });

  // Modals state
  const [showReturnSlipModal, setShowReturnSlipModal] = useState<boolean>(false);
  const [discountModalItem, setDiscountModalItem] = useState<MedicationInventory | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(30);

  const [debitNoteModalItem, setDebitNoteModalItem] = useState<MedicationInventory | null>(null);
  const [returnQty, setReturnQty] = useState<number>(1);
  const [returnReason, setReturnReason] = useState<string>('Near Expiry Return (≤ 90-day Distributor Policy)');

  const [viewDebitNote, setViewDebitNote] = useState<DebitNote | null>(null);

  // In-Place Edit Expiring Medicine Modal State
  const [editingMedicineItem, setEditingMedicineItem] = useState<MedicationInventory | null>(null);

  const handleOpenEditModal = (item: MedicationInventory) => {
    setEditingMedicineItem(item);
  };

  const handleSaveEditedMedicine = (updates: Partial<MedicationInventory>) => {
    if (!editingMedicineItem) return;
    updateInventoryItem(editingMedicineItem.id, updates);

    const newExpDate = updates.expirationDate || editingMedicineItem.expirationDate;
    const days = getDaysUntilExpiry(newExpDate);
    const medName = updates.brandName || editingMedicineItem.brandName;

    if (days > 90) {
      addToast({
        type: 'success',
        title: 'Expiry Extended & Alert Cleared',
        message: `${medName} shelf-life extended to ${newExpDate}. Moved to Safe Inventory (>90d).`
      });
    } else if (days <= 0) {
      addToast({
        type: 'warning',
        title: 'Expired Medicine Saved',
        message: `${medName} details and stock updated. Item remains listed in Expired tab.`
      });
    } else {
      addToast({
        type: 'success',
        title: 'Medicine Record Saved',
        message: `${medName} updated successfully (${days} days shelf-life remaining).`
      });
    }

    setEditingMedicineItem(null);
  };

  // Group inventory by expiry tier & days
  const tieredInventory = useMemo(() => {
    return (inventory || []).map(item => {
      if (!item) return null;
      const daysLeft = getDaysUntilExpiry(item?.expirationDate || '');
      const tier = getExpiryTier(item?.expirationDate || '');
      const ptrRate = item.purchaseRate || item.costPrice || (item.mrp * 0.7);
      return {
        ...item,
        daysLeft,
        tier,
        ptrRate
      };
    }).filter(Boolean) as (MedicationInventory & { daysLeft: number; tier: ExpiryAlertTier; ptrRate: number })[];
  }, [inventory, getDaysUntilExpiry, getExpiryTier]);

  // Specific Category Counts (matches filtered items)
  const categoryCounts = useMemo(() => {
    const list = (tieredInventory || []).filter(i => !i.quarantined);
    const expired = list.filter(i => i.daysLeft <= 0);
    const in30Days = list.filter(i => i.daysLeft > 0 && i.daysLeft <= 30);
    const in60Days = list.filter(i => i.daysLeft > 30 && i.daysLeft <= 60);
    const in90Days = list.filter(i => i.daysLeft > 60 && i.daysLeft <= 90);
    const atRisk = list.filter(i => i.daysLeft <= 90);

    return {
      all: atRisk.length,
      expired: expired.length,
      in30Days: in30Days.length,
      in60Days: in60Days.length,
      in90Days: in90Days.length
    };
  }, [tieredInventory]);

  // Counts & At-Risk Value
  const metrics = useMemo(() => {
    const list = tieredInventory || [];
    const redItems = list.filter(i => i?.tier === 'red' && !i?.quarantined);
    const amberItems = list.filter(i => i?.tier === 'amber' && !i?.quarantined);
    const yellowItems = list.filter(i => i?.tier === 'yellow' && !i?.quarantined);
    const greenItems = list.filter(i => i?.tier === 'green' && !i?.quarantined);

    const totalAtRiskValue = [...redItems, ...amberItems, ...yellowItems].reduce(
      (sum, item) => sum + ((item?.purchaseRate || 0) * (item?.stockQuantity || 0)),
      0
    );

    return {
      redCount: redItems.length,
      amberCount: amberItems.length,
      yellowCount: yellowItems.length,
      greenCount: greenItems.length,
      totalAtRiskValue: Number(totalAtRiskValue.toFixed(2))
    };
  }, [tieredInventory]);

  // Distinct suppliers list for filtering
  const suppliers = useMemo(() => {
    const set = new Set<string>();
    (inventory || []).forEach(i => {
      if (i?.supplierName) set.add(i.supplierName);
    });
    return Array.from(set);
  }, [inventory]);

  // Filtered items based on Category, Tier, Supplier, Month, Search
  const filteredItems = useMemo(() => {
    return (tieredInventory || []).filter(item => {
      if (!item || item.quarantined) return false;
      
      // Category Filter
      if (selectedCategory === 'expired' && item.daysLeft > 0) return false;
      if (selectedCategory === '30days' && (item.daysLeft <= 0 || item.daysLeft > 30)) return false;
      if (selectedCategory === '60days' && (item.daysLeft <= 30 || item.daysLeft > 60)) return false;
      if (selectedCategory === '90days' && (item.daysLeft <= 60 || item.daysLeft > 90)) return false;
      // When 'All At-Risk' and no specific tier selected, show only items with expiry <= 90 days
      if (selectedCategory === 'all' && selectedTier === 'all' && item.daysLeft > 90) return false;

      // Tier Filter
      if (selectedTier !== 'all' && item.tier !== selectedTier) return false;

      // Supplier Filter
      if (selectedSupplier !== 'all' && item.supplierName !== selectedSupplier) return false;
      
      // Filter by selected month bucket (e.g., "2026-09")
      if (selectedMonthFilter) {
        if (!item.expirationDate) return false;
        const itemDate = new Date(item.expirationDate);
        if (isNaN(itemDate.getTime())) return false;
        const itemMonthKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`;
        if (itemMonthKey !== selectedMonthFilter) return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = (item.brandName || '').toLowerCase().includes(q);
        const matchSalt = (item.saltComposition || item.genericName || '').toLowerCase().includes(q);
        const matchBatch = (item.batchNumber || '').toLowerCase().includes(q);
        const matchRack = (item.locationShelf || '').toLowerCase().includes(q);
        const matchSupplier = (item.supplierName || '').toLowerCase().includes(q);
        return matchName || matchSalt || matchBatch || matchRack || matchSupplier;
      }
      return true;
    }).sort((a, b) => a.daysLeft - b.daysLeft);
  }, [tieredInventory, selectedCategory, selectedTier, selectedSupplier, selectedMonthFilter, searchTerm]);

  // Generate Stockist Return Sheet PDF
  const handleGenerateStockistPdf = () => {
    const itemsToExport = filteredItems.length > 0 ? filteredItems : (tieredInventory.filter(i => !i.quarantined && (i.daysLeft <= 90 || i.tier !== 'green')));
    if (itemsToExport.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Return Items',
        message: 'There are no near-expiry or expired medicines to generate a return sheet for.'
      });
      return;
    }

    try {
      generateStockistReturnPdf({
        inventoryItems: itemsToExport,
        shopSettings: shopSettings || null,
        supplierName: selectedSupplier !== 'all' ? selectedSupplier : 'All Distributors / Stockists',
        categoryFilter: selectedCategory
      });
      addToast({
        type: 'success',
        title: 'Stockist Return Sheet (PDF) Generated',
        message: `Successfully downloaded return manifest for ${itemsToExport.length} medicine batch(es).`
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'PDF Generation Failed',
        message: err.message || 'Unable to generate Stockist Return Sheet PDF.'
      });
    }
  };

  // Handle Apply Discount
  const handleConfirmDiscount = () => {
    if (discountModalItem) {
      applyNearExpiryDiscount(discountModalItem.id, discountPercent);
      setDiscountModalItem(null);
    }
  };

  // Handle Debit Note Submit
  const handleConfirmDebitNote = () => {
    if (debitNoteModalItem) {
      const newNote = createDebitNoteReturn(
        debitNoteModalItem.supplierName || 'Standard Supplier',
        [
          {
            inventoryId: debitNoteModalItem.id,
            quantity: Math.min(returnQty, debitNoteModalItem.stockQuantity),
            reason: returnReason
          }
        ],
        `Returned via Expiry Alert Center (Exp: ${debitNoteModalItem.expirationDate})`
      );
      setDebitNoteModalItem(null);
      setViewDebitNote(newNote);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Brand Name', 'Generic Salt', 'Batch Number', 'Rack Location', 'Quantity', 'Expiry Date', 'Days Left', 'MRP', 'Purchase Rate', 'Supplier'];
    const rows = filteredItems.map(i => [
      `"${i.brandName}"`,
      `"${i.saltComposition || i.genericName}"`,
      `"${i.batchNumber}"`,
      `"${i.locationShelf}"`,
      i.stockQuantity,
      i.expirationDate,
      i.daysLeft,
      i.mrp,
      i.purchaseRate,
      `"${i.supplierName}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PharmPulse_Expiry_Alert_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="expiry-alert-center" className="space-y-6">
      
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950 text-white rounded-2xl p-6 shadow-md border border-slate-700/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <Clock className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold tracking-tight">Automated Expiry Return Shield &amp; Alert Engine</h2>
            </div>
            <p className="text-sm text-slate-300">
              Proactive multi-tier batch lifecycle monitoring, automated supplier debit note returns, and instant Stockist Return Sheet PDF generation.
            </p>
          </div>

          {/* Top Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Primary Stockist Return Sheet (PDF) Button */}
            <button
              onClick={handleGenerateStockistPdf}
              id="generate-stockist-return-pdf-top-btn"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-black transition-all shadow-lg shadow-rose-900/40 cursor-pointer active:scale-95 border border-rose-400/30"
              title="Generate and download official PDF Return Sheet for stockists"
            >
              <FileDown className="w-4 h-4 text-white" />
              <span>Generate Stockist Return Sheet (PDF)</span>
            </button>

            <button
              onClick={() => setShowReturnSlipModal(true)}
              id="open-return-slip-modal-btn"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all border border-slate-600 shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-rose-400" />
              <span>Distributor Return Modal</span>
            </button>

            <button
              onClick={handleExportCSV}
              id="export-expiry-csv-btn"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-semibold transition-all shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>CSV Manifest</span>
            </button>

            <button
              onClick={() => setActiveSubTab(activeSubTab === 'alerts' ? 'debit_notes' : 'alerts')}
              id="toggle-debit-notes-view-btn"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-all shadow-sm shadow-teal-600/30 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>{activeSubTab === 'alerts' ? `Debit Notes (${debitNotes.length})` : 'Back to Expiry Alerts'}</span>
            </button>
          </div>
        </div>

        {/* 4 Alert Tier Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-700/80">
          
          {/* Red Alert Card */}
          <button
            onClick={() => {
              setSelectedTier(selectedTier === 'red' ? 'all' : 'red');
              setSelectedCategory(selectedCategory === '30days' ? 'all' : '30days');
            }}
            className={`text-left p-3.5 rounded-xl transition-all border cursor-pointer ${
              selectedTier === 'red' || selectedCategory === '30days'
                ? 'bg-rose-950/80 border-rose-500 ring-2 ring-rose-500/30'
                : 'bg-slate-800/80 border-rose-900/60 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-rose-400 mb-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                RED ALERT
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                ≤ 30 Days
              </span>
            </div>
            <div className="text-2xl font-black text-white">{metrics.redCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Critical: Return or Discount</p>
          </button>

          {/* Amber Alert Card */}
          <button
            onClick={() => {
              setSelectedTier(selectedTier === 'amber' ? 'all' : 'amber');
              setSelectedCategory(selectedCategory === '60days' ? 'all' : '60days');
            }}
            className={`text-left p-3.5 rounded-xl transition-all border cursor-pointer ${
              selectedTier === 'amber' || selectedCategory === '60days'
                ? 'bg-amber-950/80 border-amber-500 ring-2 ring-amber-500/30'
                : 'bg-slate-800/80 border-amber-900/60 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-amber-400 mb-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                AMBER ALERT
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                31–60 Days
              </span>
            </div>
            <div className="text-2xl font-black text-white">{metrics.amberCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Review stock turnover</p>
          </button>

          {/* Yellow Alert Card */}
          <button
            onClick={() => {
              setSelectedTier(selectedTier === 'yellow' ? 'all' : 'yellow');
              setSelectedCategory(selectedCategory === '90days' ? 'all' : '90days');
            }}
            className={`text-left p-3.5 rounded-xl transition-all border cursor-pointer ${
              selectedTier === 'yellow' || selectedCategory === '90days'
                ? 'bg-yellow-950/80 border-yellow-500 ring-2 ring-yellow-500/30'
                : 'bg-slate-800/80 border-yellow-900/60 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-yellow-400 mb-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                YELLOW ALERT
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300">
                61–90 Days
              </span>
            </div>
            <div className="text-2xl font-black text-white">{metrics.yellowCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Supplier return eligible</p>
          </button>

          {/* Safe Green Card */}
          <button
            onClick={() => {
              setSelectedTier(selectedTier === 'green' ? 'all' : 'green');
              setSelectedCategory('all');
            }}
            className={`text-left p-3.5 rounded-xl transition-all border cursor-pointer ${
              selectedTier === 'green'
                ? 'bg-emerald-950/80 border-emerald-500 ring-2 ring-emerald-500/30'
                : 'bg-slate-800/80 border-emerald-900/60 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-emerald-400 mb-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                SAFE STOCK
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                &gt; 90 Days
              </span>
            </div>
            <div className="text-2xl font-black text-white">{metrics.greenCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Adequate shelf stability</p>
          </button>

        </div>
      </div>

      {/* Main Content Area */}
      {activeSubTab === 'alerts' ? (
        <div className="space-y-4">
          
          {/* Monthly Expiry Recharts Bar Chart Visualization */}
          <ExpiryMonthlyBarChart
            inventory={inventory}
            getDaysUntilExpiry={getDaysUntilExpiry}
            getExpiryTier={getExpiryTier}
            selectedMonthFilter={selectedMonthFilter}
            onSelectMonthFilter={setSelectedMonthFilter}
          />

          {/* DEDICATED CATEGORIZATION TABS: [Expiring in 30 Days], [Expiring in 60 Days], [Expired] */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Category:
              </span>
              
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                All At-Risk ({categoryCounts.all})
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('expired')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === 'expired'
                    ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/30'
                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                <span>Expired ({categoryCounts.expired})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('30days')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === '30days'
                    ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-500/30'
                    : 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-red-500" />
                <span>Expiring in 30 Days ({categoryCounts.in30Days})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('60days')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === '60days'
                    ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/30'
                    : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Expiring in 60 Days ({categoryCounts.in60Days})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('90days')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === '90days'
                    ? 'bg-yellow-600 text-white shadow-sm ring-2 ring-yellow-500/30'
                    : 'bg-yellow-50 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100'
                }`}
              >
                <span>Expiring in 90 Days ({categoryCounts.in90Days})</span>
              </button>
            </div>

            {/* Quick Action: Generate Stockist Return Sheet PDF */}
            <button
              onClick={handleGenerateStockistPdf}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold transition-all shadow-sm shadow-rose-600/20 cursor-pointer shrink-0"
              title="Download official PDF Return Sheet for Stockist credit note reconciliation"
            >
              <FileDown className="w-4 h-4" />
              <span>Generate Stockist Return Sheet (PDF)</span>
            </button>
          </div>

          {/* Controls & Search */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors pointer-events-none ${
                isVoiceListening ? 'text-rose-500 animate-pulse' : 'text-slate-400'
              }`} />
              <input
                id="expiry-search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isVoiceListening ? "🎙️ Listening... Speak medicine or batch..." : "Search by brand, salt composition, batch #, rack location..."}
                className={`w-full pl-9 pr-16 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-xl focus:outline-none focus:ring-2 transition-all placeholder:text-slate-400 ${
                  isVoiceListening
                    ? 'border-rose-500 ring-2 ring-rose-500/25 bg-rose-50/40 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100 placeholder-rose-400'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-rose-500/20 focus:border-rose-500'
                }`}
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  id="expiry-voice-search-btn"
                  onClick={toggleVoiceSearch}
                  className={`p-1.5 rounded-lg transition-all flex items-center justify-center cursor-pointer relative ${
                    isVoiceListening
                      ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/40 ring-2 ring-rose-400 animate-pulse'
                      : 'bg-rose-50 dark:bg-rose-950/80 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/80'
                  }`}
                  title={isVoiceListening ? "Listening... Click to stop voice search" : "Voice search: Click and speak medicine name"}
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

            {/* Supplier Filter */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 rounded-xl px-2.5 py-1.5 border border-slate-200 dark:border-slate-700">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <select
                  id="supplier-expiry-filter"
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="text-xs font-semibold bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Suppliers / Distributors</option>
                  {suppliers.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {/* Actionable Expiry Table & Tap-to-Edit Rows */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            
            {/* Quick Tap-To-Edit Hint Banner */}
            <div className="px-4 py-2 bg-teal-50/70 dark:bg-teal-950/40 border-b border-teal-100 dark:border-teal-900/60 flex items-center justify-between text-xs text-teal-800 dark:text-teal-300">
              <span className="flex items-center gap-1.5 font-medium">
                <Pencil className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span><strong>Direct Tap-To-Edit Enabled:</strong> Click any medicine row or card below to open the comprehensive editor and adjust expiry dates, batch, rack or stock in-place.</span>
              </span>
              <span className="text-[11px] font-mono text-teal-600 dark:text-teal-400 font-bold shrink-0 hidden sm:inline">
                {filteredItems.length} Batches Listed
              </span>
            </div>

            {/* Mobile Touch-Friendly Card View (< md screens) */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-700/80">
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center text-slate-400 px-4">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                  <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">No Batches Found Under Selected Filter</p>
                  <p className="text-xs text-slate-400 mt-0.5">All stock items are within healthy shelf lifecycles.</p>
                </div>
              ) : (
                filteredItems.map(item => {
                  const daysBadge = 
                    item.daysLeft <= 0 ? 'bg-rose-600 text-white font-black' :
                    item.daysLeft <= 30 ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 font-bold' :
                    item.daysLeft <= 60 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 font-semibold' :
                    item.daysLeft <= 90 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-200' :
                    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200';

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleOpenEditModal(item)}
                      className="p-4 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 active:bg-teal-50/80 transition-colors cursor-pointer space-y-2.5"
                      title="Tap to edit medicine details & expiry date"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight flex items-center gap-1.5 flex-wrap">
                            <span>{item.brandName}</span>
                            <span className="font-mono text-[11px] font-semibold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              {item.batchNumber}
                            </span>
                          </h4>
                          <p className="text-xs text-slate-500 truncate max-w-xs font-mono mt-0.5">
                            {item.saltComposition || item.genericName}
                          </p>
                        </div>

                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs shrink-0 ${daysBadge}`}>
                          {item.daysLeft <= 0 ? 'EXPIRED' : `${item.daysLeft}d left`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 gap-2 flex-wrap pt-1">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[11px] font-semibold">
                          <MapPin className="w-3 h-3 text-teal-600" />
                          <span>{item.locationShelf || `${item.rackNumber}-${item.shelfRow}`}</span>
                        </div>

                        <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                          Stock: <span className="font-black">{item.stockQuantity} {item.unit}</span>
                        </div>

                        <div className="font-mono text-slate-500 text-[11px]">
                          Exp: <strong className="text-slate-700 dark:text-slate-300">{item.expirationDate}</strong>
                        </div>
                      </div>

                      {/* Card Action Buttons (Clicking inside stops row modal) */}
                      <div 
                        className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit Details</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setDebitNoteModalItem(item);
                              setReturnQty(item.stockQuantity);
                            }}
                            className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200"
                          >
                            Return
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDiscountModalItem(item);
                              setDiscountPercent(item.discountPercent || 30);
                            }}
                            className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold border border-amber-200"
                          >
                            Discount
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop / Tablet Table View (hidden on mobile, visible md+) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Medicine &amp; Salt</th>
                    <th className="py-3.5 px-4">Batch #</th>
                    <th className="py-3.5 px-4">Physical Rack Location</th>
                    <th className="py-3.5 px-4">Stock Qty</th>
                    <th className="py-3.5 px-4">Expiry Date</th>
                    <th className="py-3.5 px-4">Days Left</th>
                    <th className="py-3.5 px-4">Supplier</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                        <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">No Batches Found Under Selected Filter</p>
                        <p className="text-xs text-slate-400 mt-0.5">All stock items are within healthy shelf lifecycles.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map(item => {
                      const daysBadge = 
                        item.daysLeft <= 0 ? 'bg-rose-600 text-white font-black' :
                        item.daysLeft <= 30 ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 font-bold' :
                        item.daysLeft <= 60 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 font-semibold' :
                        item.daysLeft <= 90 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-200' :
                        'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200';

                      return (
                        <tr 
                          key={item.id} 
                          onClick={() => handleOpenEditModal(item)}
                          className="hover:bg-teal-50/50 dark:hover:bg-teal-950/20 active:bg-teal-50/70 transition-colors cursor-pointer group"
                          title="Click row to edit medicine details, batch, rack location & expiry date"
                        >
                          
                          {/* Medicine & Salt */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5 flex-wrap">
                              <span>{item.brandName}</span>
                              {item.isNearExpiryDiscount && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
                                  <Percent className="w-3 h-3" /> {item.discountPercent}% OFF
                                </span>
                              )}
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-teal-600 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800 flex items-center gap-0.5">
                                <Pencil className="w-2.5 h-2.5" /> Tap to Edit
                              </span>
                            </div>
                            <div className="text-slate-500 dark:text-slate-400 text-xs truncate max-w-xs font-mono">
                              {item.saltComposition || item.genericName}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              MRP: ₹{item.mrp.toFixed(2)} | PTR: ₹{item.ptrRate.toFixed(2)}
                            </div>
                          </td>

                          {/* Batch # */}
                          <td className="py-3 px-4">
                            <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              {item.batchNumber}
                            </span>
                          </td>

                          {/* Physical Rack Location */}
                          <td className="py-3 px-4">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-semibold text-xs">
                              <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span>{item.locationShelf || `${item.rackNumber}-${item.shelfRow}`}</span>
                            </div>
                          </td>

                          {/* Stock Qty */}
                          <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                            {item.stockQuantity} {item.unit}
                          </td>

                          {/* Expiry Date */}
                          <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                            {item.expirationDate}
                          </td>

                          {/* Days Left */}
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${daysBadge}`}>
                              {item.daysLeft <= 0 ? 'EXPIRED' : `${item.daysLeft} days`}
                            </span>
                          </td>

                          {/* Supplier */}
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-xs">
                            <div className="font-medium">{item.supplierName || 'Sun Pharma Dist'}</div>
                            <div className="text-[10px] text-slate-400">{item.supplierContact}</div>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              
                              {/* Direct In-Place Edit Action Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(item)}
                                id={`edit-medicine-btn-${item.id}`}
                                className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                title="Edit Medicine Details, Expiry Date & Rack Location"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Edit</span>
                              </button>

                              {/* Return to Distributor Button */}
                              <button
                                onClick={() => {
                                  setDebitNoteModalItem(item);
                                  setReturnQty(item.stockQuantity);
                                }}
                                id={`return-distributor-btn-${item.id}`}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                title="Issue Supplier Return / Debit Note"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Debit Note</span>
                              </button>

                              {/* Apply Clearance Discount */}
                              <button
                                onClick={() => {
                                  setDiscountModalItem(item);
                                  setDiscountPercent(item.discountPercent || 30);
                                }}
                                id={`apply-discount-btn-${item.id}`}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                title="Apply Clearance Discount"
                              >
                                <Tag className="w-3 h-3" />
                                <span>Discount</span>
                              </button>

                              {/* Quarantine */}
                              <button
                                onClick={() => quarantineItem(item.id, 'Near-Expiry Disposed')}
                                id={`quarantine-btn-${item.id}`}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                title="Quarantine / Mark Disposed"
                              >
                                <ShieldAlert className="w-3.5 h-3.5" />
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

        </div>
      ) : (
        /* Debit Notes Archive Subtab */
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Supplier Expiry Debit Notes & Returns</h3>
                <p className="text-xs text-slate-500">Official credit claims generated for near-expiry and damaged medicine batches.</p>
              </div>
            </div>

            {debitNotes.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-700 text-sm">No Debit Notes Issued Yet</p>
                <p className="text-xs text-slate-400">Click "Debit Note" next to any near-expiry batch to create a return claim.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {debitNotes.map(note => (
                  <div key={note.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                          {note.noteNumber}
                        </span>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-1">{note.supplierName}</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 text-base">₹{note.totalAmount.toFixed(2)}</span>
                        <div className="text-[10px] text-slate-400">{note.date}</div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-700">
                      {note.items.map((it, idx) => (
                        <div key={idx} className="py-1.5 flex items-center justify-between">
                          <div>
                            <span className="font-semibold">{it.brandName}</span>
                            <span className="text-slate-400 ml-1">({it.batchNumber})</span>
                            <div className="text-[10px] text-slate-400">Rack: {it.rackLocation} | Exp: {it.expiryDate}</div>
                          </div>
                          <div className="text-right font-medium">
                            {it.quantity} units (₹{it.totalCredit.toFixed(2)})
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {note.status}
                      </span>
                      <button
                        onClick={() => setViewDebitNote(note)}
                        className="text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Voucher</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Near-Expiry Discount */}
      {discountModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600 font-bold">
                <Tag className="w-5 h-5" />
                <h3>Apply Near-Expiry Markdown</h3>
              </div>
              <button onClick={() => setDiscountModalItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-1 text-xs">
              <div className="font-bold text-slate-900 dark:text-white text-sm">{discountModalItem.brandName}</div>
              <div className="text-slate-500">{discountModalItem.saltComposition}</div>
              <div className="text-slate-500 font-mono">Batch: {discountModalItem.batchNumber} | Expiry: {discountModalItem.expirationDate}</div>
              <div className="text-teal-700 font-semibold">Rack Location: {discountModalItem.locationShelf}</div>
              <div className="text-slate-700 font-semibold pt-1">Original MRP: ₹{discountModalItem.mrp.toFixed(2)}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Select Discount Percentage:
              </label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[15, 25, 40, 50].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDiscountPercent(pct)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      discountPercent === pct
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    {pct}% OFF
                  </button>
                ))}
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs flex justify-between items-center">
                <span className="text-amber-800 dark:text-amber-200 font-medium">New POS Counter Selling Price:</span>
                <span className="text-base font-bold text-amber-700 dark:text-amber-300 font-mono">
                  ₹{(discountModalItem.mrp * (1 - discountPercent / 100)).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setDiscountModalItem(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDiscount}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm"
              >
                Apply Markdown to POS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Return to Distributor / Debit Note */}
      {debitNoteModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600 font-bold">
                <RotateCcw className="w-5 h-5" />
                <h3>Distributor Return (Debit Note)</h3>
              </div>
              <button onClick={() => setDebitNoteModalItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-1 text-xs">
              <div className="font-bold text-slate-900 dark:text-white text-sm">{debitNoteModalItem.brandName}</div>
              <div className="text-slate-500">{debitNoteModalItem.saltComposition}</div>
              <div className="text-slate-500 font-mono">Batch: {debitNoteModalItem.batchNumber} | Expiry: {debitNoteModalItem.expirationDate}</div>
              <div className="text-teal-700 font-semibold">Rack Location: {debitNoteModalItem.locationShelf}</div>
              <div className="text-slate-700 font-medium">Distributor: {debitNoteModalItem.supplierName}</div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Quantity to Return (Max {debitNoteModalItem.stockQuantity}):
                </label>
                <input
                  type="number"
                  min={1}
                  max={debitNoteModalItem.stockQuantity}
                  value={returnQty}
                  onChange={(e) => setReturnQty(Math.max(1, Math.min(debitNoteModalItem.stockQuantity, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Return Reason:
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                >
                  <option value="Near Expiry Return (≤ 90-day Distributor Policy)">Near Expiry Return (≤ 90-day Policy)</option>
                  <option value="Expired Stock Credit Adjustment">Expired Stock Credit Adjustment</option>
                  <option value="Damaged Packaging / Recall">Damaged Packaging / Recall</option>
                  <option value="Slow Moving Stock Exchange">Slow Moving Stock Exchange</option>
                </select>
              </div>

              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 text-xs flex justify-between items-center">
                <span className="text-rose-800 dark:text-rose-200 font-medium">Estimated Debit Credit Value:</span>
                <span className="text-base font-bold text-rose-700 dark:text-rose-300 font-mono">
                  ₹{(debitNoteModalItem.purchaseRate * returnQty).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setDebitNoteModalItem(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDebitNote}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm"
              >
                Issue Debit Note & Deduct Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Printable Debit Note Voucher View */}
      {viewDebitNote && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-slate-900 font-sans">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Debit Note Voucher</span>
                <h3 className="text-lg font-bold">{viewDebitNote.noteNumber}</h3>
              </div>
              <button onClick={() => setViewDebitNote(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl">
              <div>
                <p className="text-slate-500 font-medium">Issued To (Supplier):</p>
                <p className="font-bold text-slate-900">{viewDebitNote.supplierName}</p>
                <p className="text-slate-500">{viewDebitNote.supplierContact}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 font-medium">Date Issued:</p>
                <p className="font-bold text-slate-900">{viewDebitNote.date}</p>
                <p className="text-emerald-600 font-semibold">{viewDebitNote.status}</p>
              </div>
            </div>

            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b bg-slate-100 text-slate-600">
                  <th className="py-2 px-3">Item Description</th>
                  <th className="py-2 px-3">Batch & Rack</th>
                  <th className="py-2 px-3">Qty</th>
                  <th className="py-2 px-3">Rate</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {viewDebitNote.items.map((it, i) => (
                  <tr key={i}>
                    <td className="py-2 px-3">
                      <div className="font-bold">{it.brandName}</div>
                      <div className="text-[10px] text-slate-500">{it.saltComposition}</div>
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px]">
                      <div>{it.batchNumber}</div>
                      <div className="text-teal-600">{it.rackLocation}</div>
                    </td>
                    <td className="py-2 px-3 font-semibold">{it.quantity}</td>
                    <td className="py-2 px-3">₹{it.purchaseRate.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right font-bold">₹{it.totalCredit.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-center bg-teal-50 p-3 rounded-xl border border-teal-200">
              <span className="font-bold text-teal-900 text-xs">Total Credit Note Claim:</span>
              <span className="font-black text-teal-700 text-base font-mono">₹{viewDebitNote.totalAmount.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Item 60-90 Day Distributor Return Slip Modal */}
      <DistributorReturnSlipModal
        isOpen={showReturnSlipModal}
        onClose={() => setShowReturnSlipModal(false)}
        inventory={inventory}
        onReturnGenerated={(note) => {
          setViewDebitNote(note);
          setActiveSubTab('debit_notes');
        }}
      />

      {/* Comprehensive In-Place Edit Expiring Medicine Modal */}
      <EditExpiringMedicineModal
        isOpen={!!editingMedicineItem}
        onClose={() => setEditingMedicineItem(null)}
        item={editingMedicineItem}
        onSave={handleSaveEditedMedicine}
        onInitiateReturn={(item) => {
          setDebitNoteModalItem(item);
          setReturnQty(item.stockQuantity);
        }}
        onQuarantine={(id, reason) => {
          quarantineItem(id, reason);
        }}
        onArchive={(id) => {
          deleteInventoryItem(id, true);
        }}
      />

    </div>
  );
};
