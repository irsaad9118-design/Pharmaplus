import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  Package, 
  AlertTriangle, 
  Send, 
  Printer, 
  Copy, 
  Check, 
  Download, 
  Plus, 
  Minus, 
  Search, 
  Building2, 
  MapPin, 
  DollarSign, 
  RefreshCw,
  CheckCircle2,
  FileText,
  Phone,
  Clock,
  ArrowRight,
  Filter,
  Layers,
  Sparkles
} from 'lucide-react';
import { MedicationInventory, ShortageOrderItem, DistributorPurchaseOrder } from '../../types/pharmacy';

export const ShortageBookView: React.FC = () => {
  const { 
    inventory, 
    shopSettings, 
    formatDistributorWhatsAppOrder, 
    savePurchaseOrder, 
    purchaseOrders,
    addToast 
  } = usePharmacy();

  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedSupplier, setCopiedSupplier] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'shortages' | 'purchase_orders'>('shortages');
  const [selectedPo, setSelectedPo] = useState<DistributorPurchaseOrder | null>(null);

  // Custom order quantity adjustments stored per inventoryId
  const [customQuantities, setCustomQuantities] = useState<Record<string, number>>({});

  // 1. Calculate shortage items from live inventory
  const shortageItems: ShortageOrderItem[] = useMemo(() => {
    return inventory
      .filter(item => !item.quarantined && item.stockQuantity <= (item.minAlertLevel || item.reorderLevel || 15))
      .map(item => {
        const threshold = item.minAlertLevel || item.reorderLevel || 20;
        // Suggested reorder = (threshold * 2) - currentStock (minimum 10)
        const defaultSuggested = Math.max(10, (threshold * 2) - item.stockQuantity);
        const orderQty = customQuantities[item.id] !== undefined ? customQuantities[item.id] : defaultSuggested;

        return {
          inventoryId: item.id,
          brandName: item.brandName,
          saltComposition: item.saltComposition || item.genericName || item.brandName,
          supplierName: item.supplierName || 'Primary Distributor',
          supplierContact: item.supplierContact || '+91 98765 43210',
          currentStock: item.stockQuantity,
          minAlertLevel: threshold,
          reorderLevel: item.reorderLevel || threshold,
          suggestedQty: defaultSuggested,
          orderQty,
          unit: item.unit || 'Strips',
          purchaseRate: item.purchaseRate || item.costPrice || (item.mrp * 0.7),
          mrp: item.mrp,
          rackLocation: item.locationShelf || `${item.rackNumber} / ${item.shelfRow}`,
          status: 'shortage' as const
        };
      });
  }, [inventory, customQuantities]);

  // Unique list of suppliers with shortages
  const suppliers = useMemo(() => {
    const map = new Map<string, { name: string; contact: string; count: number; totalCost: number }>();
    shortageItems.forEach(it => {
      const existing = map.get(it.supplierName);
      const lineCost = it.purchaseRate * it.orderQty;
      if (existing) {
        existing.count += 1;
        existing.totalCost += lineCost;
      } else {
        map.set(it.supplierName, {
          name: it.supplierName,
          contact: it.supplierContact,
          count: 1,
          totalCost: lineCost
        });
      }
    });
    return Array.from(map.values());
  }, [shortageItems]);

  // Filtered shortages list
  const filteredShortages = useMemo(() => {
    return shortageItems.filter(item => {
      const matchesSupplier = selectedSupplier === 'all' || item.supplierName === selectedSupplier;
      if (!matchesSupplier) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          item.brandName.toLowerCase().includes(q) ||
          item.saltComposition.toLowerCase().includes(q) ||
          item.supplierName.toLowerCase().includes(q) ||
          item.rackLocation.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [shortageItems, selectedSupplier, searchTerm]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalSKUs = shortageItems.length;
    const outOfStock = shortageItems.filter(i => i.currentStock === 0).length;
    const totalOrderCost = filteredShortages.reduce((sum, i) => sum + (i.purchaseRate * i.orderQty), 0);
    const totalOrderUnits = filteredShortages.reduce((sum, i) => sum + i.orderQty, 0);

    return {
      totalSKUs,
      outOfStock,
      totalOrderCost,
      totalOrderUnits,
      supplierCount: suppliers.length
    };
  }, [shortageItems, filteredShortages, suppliers]);

  // Update order quantity for an item
  const handleUpdateQty = (inventoryId: string, delta: number) => {
    const current = customQuantities[inventoryId] !== undefined 
      ? customQuantities[inventoryId] 
      : (shortageItems.find(i => i.inventoryId === inventoryId)?.suggestedQty || 10);
    const next = Math.max(1, current + delta);
    setCustomQuantities(prev => ({ ...prev, [inventoryId]: next }));
  };

  const handleSetQty = (inventoryId: string, val: number) => {
    setCustomQuantities(prev => ({ ...prev, [inventoryId]: Math.max(1, val) }));
  };

  // 1-Click WhatsApp Purchase Order Dispatch
  const handleShareSupplierWhatsApp = (supplierName: string) => {
    const itemsForSupplier = filteredShortages.filter(
      i => supplierName === 'ALL_SUPPLIERS' || i.supplierName === supplierName
    );

    if (itemsForSupplier.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Shortages',
        message: 'No shortage items found for the selected supplier.'
      });
      return;
    }

    const { text, waUrl } = formatDistributorWhatsAppOrder(
      supplierName === 'ALL_SUPPLIERS' ? 'All Registered Distributors' : supplierName,
      itemsForSupplier
    );

    // Save purchase order record
    savePurchaseOrder(
      supplierName === 'ALL_SUPPLIERS' ? 'Consolidated Distributors' : supplierName,
      itemsForSupplier,
      `WhatsApp order dispatched on ${new Date().toLocaleDateString()}`
    );

    window.open(waUrl, '_blank');
  };

  // Copy PO Text
  const handleCopyPoText = (supplierName: string) => {
    const itemsForSupplier = filteredShortages.filter(
      i => supplierName === 'ALL_SUPPLIERS' || i.supplierName === supplierName
    );
    const { text } = formatDistributorWhatsAppOrder(
      supplierName === 'ALL_SUPPLIERS' ? 'Consolidated Distributors' : supplierName,
      itemsForSupplier
    );

    navigator.clipboard.writeText(text);
    setCopiedSupplier(supplierName);
    addToast({
      type: 'success',
      title: 'Order Copied',
      message: 'Purchase order manifest copied to clipboard.'
    });
    setTimeout(() => setCopiedSupplier(null), 2500);
  };

  // Print PO Slip
  const handlePrintPo = (supplierName: string) => {
    const itemsForSupplier = filteredShortages.filter(
      i => supplierName === 'ALL_SUPPLIERS' || i.supplierName === supplierName
    );
    const total = itemsForSupplier.reduce((sum, i) => sum + (i.purchaseRate * i.orderQty), 0);

    const printWin = window.open('', '_blank', 'width=750,height=800');
    if (!printWin) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Order - ${shopSettings.shopName}</title>
        <style>
          body { font-family: monospace, sans-serif; padding: 20px; color: #111; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
          .title { font-size: 18px; font-weight: bold; }
          .sub { font-size: 12px; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
          th { background: #f2f2f2; font-weight: bold; }
          .total-box { margin-top: 15px; text-align: right; font-size: 14px; font-weight: bold; }
          .footer { margin-top: 30px; font-size: 11px; text-align: center; color: #777; border-top: 1px dashed #aaa; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${shopSettings.shopName.toUpperCase()}</div>
          <div class="sub">${shopSettings.address} | Phone: ${shopSettings.phone}</div>
          <div class="sub">DL No: <strong>${shopSettings.dlNumber}</strong> | GSTIN: <strong>${shopSettings.gstin}</strong></div>
          <div style="margin-top: 8px; font-weight: bold; font-size: 14px;">DAILY SHORTAGE BOOK - PURCHASE ORDER</div>
          <div class="sub">Distributor: <strong>${supplierName}</strong> | Date: ${new Date().toLocaleDateString('en-IN')}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Medicine / Salt</th>
              <th>Rack Location</th>
              <th>Current Stock</th>
              <th>Order Qty</th>
              <th>Est PTR (₹)</th>
              <th>Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsForSupplier.map((it, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${it.brandName}</strong><br><small>${it.saltComposition}</small></td>
                <td>${it.rackLocation}</td>
                <td>${it.currentStock}</td>
                <td><strong>${it.orderQty} ${it.unit}</strong></td>
                <td>₹${it.purchaseRate.toFixed(2)}</td>
                <td>₹${(it.purchaseRate * it.orderQty).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-box">
          Total Items: ${itemsForSupplier.length} | Total Estimated Order Value: ₹${total.toFixed(2)}
        </div>

        <div class="footer">
          Please acknowledge receipt and confirm expected delivery schedule.<br>
          Generated via PharmPulse Medical Cloud CRM & Shortage Book
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWin.document.write(html);
    printWin.document.close();
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['Medicine Name', 'Salt Composition', 'Supplier', 'Current Stock', 'Min Alert Level', 'Order Quantity', 'Unit', 'Purchase PTR (INR)', 'MRP (INR)', 'Total Estimated Cost (INR)', 'Rack Location'];
    const rows = filteredShortages.map(it => [
      `"${it.brandName}"`,
      `"${it.saltComposition}"`,
      `"${it.supplierName}"`,
      it.currentStock,
      it.minAlertLevel,
      it.orderQty,
      `"${it.unit}"`,
      it.purchaseRate.toFixed(2),
      it.mrp.toFixed(2),
      (it.purchaseRate * it.orderQty).toFixed(2),
      `"${it.rackLocation}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Daily_Shortage_Book_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast({
      type: 'success',
      title: 'CSV Exported',
      message: 'Daily shortage book exported successfully.'
    });
  };

  return (
    <div id="shortage-book-view" className="space-y-6 animate-in fade-in">
      
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                Daily Distributor Shortage Book
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-bold font-mono">
                  {metrics.totalSKUs} SKUs Below Threshold
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automated shortage aggregation with 1-click WhatsApp Purchase Order generation for medical distributors.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={() => handlePrintPo(selectedSupplier === 'all' ? 'Consolidated Distributors' : selectedSupplier)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print PO Slip
          </button>

          <button
            type="button"
            onClick={() => handleShareSupplierWhatsApp(selectedSupplier === 'all' ? 'ALL_SUPPLIERS' : selectedSupplier)}
            disabled={filteredShortages.length === 0}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            Share Order on WhatsApp
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-bold">Total Shortage SKUs</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {metrics.totalSKUs}
          </div>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
            {metrics.outOfStock} completely out of stock
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-bold">Active Distributors</span>
            <Building2 className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {metrics.supplierCount}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Pending PO dispatches
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-bold">Total Order Units</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {metrics.totalOrderUnits}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Strips & Bottles requested
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-bold">Est. Replenishment Cost</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            ₹{metrics.totalOrderCost.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Calculated at Purchase PTR
          </span>
        </div>

      </div>

      {/* Sub Tabs: Shortages vs PO History */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setActiveTab('shortages')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors border-b-2 cursor-pointer ${
            activeTab === 'shortages'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Package className="w-4 h-4" />
          Live Shortage Inventory ({shortageItems.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('purchase_orders')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors border-b-2 cursor-pointer ${
            activeTab === 'purchase_orders'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          Dispatched PO History ({purchaseOrders.length})
        </button>
      </div>

      {activeTab === 'shortages' && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search shortage medicine, salt formula, or distributor..."
                className="w-full pl-10 pr-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Supplier Filter Dropdown / Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-bold text-slate-500 shrink-0 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter Distributor:
              </span>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Distributors ({shortageItems.length} items)</option>
                {suppliers.map(s => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({s.count} items • ₹{s.totalCost.toFixed(0)})
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Grouped by Distributor Cards or Clean Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Medicine & Salt Composition</th>
                    <th className="py-3.5 px-3">Rack Location</th>
                    <th className="py-3.5 px-3">Current Stock</th>
                    <th className="py-3.5 px-3">Min Alert Level</th>
                    <th className="py-3.5 px-3">Order Quantity</th>
                    <th className="py-3.5 px-3">Purchase PTR (₹)</th>
                    <th className="py-3.5 px-3">Line Total (₹)</th>
                    <th className="py-3.5 px-3">Distributor</th>
                    <th className="py-3.5 px-4 text-right">Quick Dispatch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredShortages.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Package className="w-10 h-10 mx-auto mb-2 text-slate-300 opacity-60" />
                        <p className="font-bold text-sm">No shortage items match the current filters.</p>
                        <p className="text-xs text-slate-500 mt-1">All medications are stocked above their minimum thresholds.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredShortages.map(item => {
                      const lineTotal = item.purchaseRate * item.orderQty;
                      const isZeroStock = item.currentStock === 0;

                      return (
                        <tr key={item.inventoryId} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors">
                          
                          {/* Medicine Name */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                              {item.brandName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                              {item.saltComposition}
                            </div>
                          </td>

                          {/* Rack Location */}
                          <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                            <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {item.rackLocation}
                            </span>
                          </td>

                          {/* Current Stock */}
                          <td className="py-3.5 px-3">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono inline-block ${
                              isZeroStock
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            }`}>
                              {item.currentStock} {item.unit}
                            </span>
                          </td>

                          {/* Min Alert Level */}
                          <td className="py-3.5 px-3 font-mono font-bold text-slate-500">
                            {item.minAlertLevel} units
                          </td>

                          {/* Order Quantity Stepper */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-700 w-fit">
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(item.inventoryId, -5)}
                                className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              
                              <input
                                type="number"
                                value={item.orderQty}
                                onChange={(e) => handleSetQty(item.inventoryId, Number(e.target.value) || 1)}
                                className="w-12 text-center bg-transparent text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                              />

                              <button
                                type="button"
                                onClick={() => handleUpdateQty(item.inventoryId, 5)}
                                className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* Purchase PTR */}
                          <td className="py-3.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                            ₹{item.purchaseRate.toFixed(2)}
                          </td>

                          {/* Line Total */}
                          <td className="py-3.5 px-3 font-mono font-black text-emerald-600 dark:text-emerald-400">
                            ₹{lineTotal.toFixed(2)}
                          </td>

                          {/* Distributor */}
                          <td className="py-3.5 px-3">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {item.supplierName}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                              <Phone className="w-2.5 h-2.5" />
                              {item.supplierContact}
                            </div>
                          </td>

                          {/* Quick WhatsApp Action */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleShareSupplierWhatsApp(item.supplierName)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                              title={`Send PO for ${item.supplierName} via WhatsApp`}
                            >
                              <Send className="w-3 h-3" />
                              WhatsApp PO
                            </button>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Supplier-Wise Purchase Order Quick Dispatch Strip */}
          <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              1-Click Distributor PO Manifests ({suppliers.length} Distributors)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {suppliers.map(s => (
                <div key={s.name} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {s.name}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-[10px] font-mono font-bold">
                        {s.count} Items
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {s.contact}
                    </p>
                    <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                      Est. Total: ₹{s.totalCost.toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => handleCopyPoText(s.name)}
                      className="flex-1 py-1.5 px-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedSupplier === s.name ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePrintPo(s.name)}
                      className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                      title="Print Purchase Order"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShareSupplierWhatsApp(s.name)}
                      className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-xs shadow-emerald-600/20 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Tab 2: Dispatched Purchase Orders History */}
      {activeTab === 'purchase_orders' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" />
              Historical Purchase Order Logs ({purchaseOrders.length})
            </h3>
            <span className="text-xs text-slate-500">
              Synced with medical store supply records
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {purchaseOrders.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="font-bold">No purchase orders dispatched yet.</p>
                <p className="text-xs text-slate-500 mt-1">Use the shortage book to generate and dispatch your first purchase order.</p>
              </div>
            ) : (
              purchaseOrders.map(po => (
                <div key={po.id} className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-teal-700 dark:text-teal-300">
                        {po.poNumber}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {po.supplierName}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                        {po.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Date: {po.date} • Items: {po.totalItems} • Est. Value: <strong className="text-emerald-600 font-mono">₹{po.totalEstimatedAmount.toFixed(2)}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePrintPo(po.supplierName)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShareSupplierWhatsApp(po.supplierName)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Resend WhatsApp
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};
