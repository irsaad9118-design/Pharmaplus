import React, { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCw, 
  Store, 
  Receipt, 
  Filter, 
  TrendingUp, 
  Clock, 
  IndianRupee, 
  MapPin, 
  Eye, 
  Sparkles,
  CreditCard,
  Building2,
  PackageCheck
} from 'lucide-react';
import { SoldItemAudit, PlatformInvoice } from '../../types/pharmacy';
import { InvoiceInspectorModal } from './InvoiceInspectorModal';

interface LiveSoldFeedProps {
  onInspectInvoice?: (invoiceNumber: string) => void;
}

export const LiveSoldFeed: React.FC<LiveSoldFeedProps> = () => {
  const [soldItems, setSoldItems] = useState<SoldItemAudit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [daysFilter, setDaysFilter] = useState<number>(30);
  const [selectedInvoice, setSelectedInvoice] = useState<PlatformInvoice | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState<boolean>(false);

  // Fetch sold items feed
  const fetchSoldFeed = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        days: daysFilter.toString(),
        limit: '60'
      });
      if (storeFilter !== 'all') params.append('storeId', storeFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await fetch(`/api/admin/analytics/recent-sales?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSoldItems(data.items || []);
      }
    } catch (e) {
      console.error('Failed to load sold items feed', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSoldFeed();
  }, [storeFilter, daysFilter]);

  // Handle live search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSoldFeed();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Inspect invoice by number
  const handleOpenInvoice = async (invoiceNumber: string) => {
    setLoadingInvoice(true);
    try {
      const res = await fetch(`/api/admin/analytics/invoices/${encodeURIComponent(invoiceNumber)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedInvoice(data.invoice);
      }
    } catch (e) {
      console.error('Failed to fetch invoice details', e);
    } finally {
      setLoadingInvoice(false);
    }
  };

  // Metrics
  const totalGMV = soldItems.reduce((acc, item) => acc + (item.itemTotal || 0), 0);
  const totalUnits = soldItems.reduce((acc, item) => acc + (item.quantity || 0), 0);

  // Relative time helper
  const formatTimestamp = (ts: string) => {
    if (!ts) return 'Just now';
    try {
      const date = new Date(ts.replace(' ', 'T'));
      const now = new Date('2026-08-23T23:59:59');
      const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffMinutes < 60 && diffMinutes >= 0) {
        return `${diffMinutes} mins ago`;
      }
      return ts;
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-4">
      {/* Live Feed Header & Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-200/50 dark:border-teal-800/40">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Platform-Wide Live Sold Medicines Audit
                </h2>
                <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>LIVE FEED</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time itemized sale logs across all connected pharmacies • Batch, rack, and pricing audit
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={fetchSoldFeed}
              disabled={isLoading}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Feed</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          
          {/* Search Box */}
          <div className="sm:col-span-5 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search medicine, salt, batch, store, invoice..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 dark:text-white"
            />
          </div>

          {/* Store Filter */}
          <div className="sm:col-span-4 flex items-center space-x-1.5">
            <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 dark:text-white font-medium"
            >
              <option value="all">All Pharmacies (Cross-Fleet)</option>
              <option value="STORE-APEX01">Apex Medicos & Healthcare</option>
              <option value="STORE-SANJ02">Sanjeevani Medicos & Chemist</option>
              <option value="STORE-CARE03">CarePlus Pharmacy & Wellness</option>
            </select>
          </div>

          {/* Timeframe Filter */}
          <div className="sm:col-span-3 flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setDaysFilter(1)}
              className={`flex-1 py-1 rounded-lg text-center transition-all ${
                daysFilter === 1 
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDaysFilter(7)}
              className={`flex-1 py-1 rounded-lg text-center transition-all ${
                daysFilter === 7 
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              7D
            </button>
            <button
              onClick={() => setDaysFilter(30)}
              className={`flex-1 py-1 rounded-lg text-center transition-all ${
                daysFilter === 30 
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              30D
            </button>
          </div>

        </div>

        {/* Live Feed Summary Stats Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-4">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Total Items Audited: </span>
              <strong className="text-slate-900 dark:text-white font-bold">{soldItems.length} items</strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Units Dispensed: </span>
              <strong className="text-slate-900 dark:text-white font-bold">{totalUnits} units</strong>
            </div>
          </div>

          <div>
            <span className="text-slate-500 dark:text-slate-400">Sales Volume (INR): </span>
            <strong className="text-teal-700 dark:text-teal-400 font-extrabold text-sm">
              ₹{totalGMV.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>

      </div>

      {/* Sold Items Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Medicine & Salt Composition</th>
                <th className="py-3 px-4">Batch & Rack Location</th>
                <th className="py-3 px-4 text-center">Qty Sold</th>
                <th className="py-3 px-4">Pricing (MRP / Rate)</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Sold At Pharmacy</th>
                <th className="py-3 px-4 text-right">Invoice & Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                      <span>Auditing real-time sales transactions...</span>
                    </div>
                  </td>
                </tr>
              ) : soldItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No sold medicines found for the selected store or search criteria.
                  </td>
                </tr>
              ) : (
                soldItems.map((item) => (
                  <tr 
                    key={item.id} 
                    onClick={() => handleOpenInvoice(item.invoiceNumber)}
                    className="hover:bg-teal-50/40 dark:hover:bg-teal-950/20 transition-colors cursor-pointer group"
                    title="Click to inspect full thermal bill invoice"
                  >
                    {/* Medicine & Salt */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                        <span className="group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                          {item.brandName}
                        </span>
                        {item.isRx && (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-mono">
                            Rx
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-xs mt-0.5">
                        {item.saltComposition}
                      </div>
                    </td>

                    {/* Batch & Rack */}
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        Batch: {item.batchNumber}
                      </div>
                      <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                        📍 {item.rackLocation}
                      </div>
                    </td>

                    {/* Qty Sold */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white font-mono">
                        {item.quantity} {item.unit?.includes('Strip') ? 'Strips' : item.unit}
                      </div>
                    </td>

                    {/* Pricing */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        ₹{item.sellingPrice.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        MRP: ₹{item.mrp.toFixed(2)} (GST {item.gstRate}%)
                      </div>
                    </td>

                    {/* Total Amount */}
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-teal-700 dark:text-teal-400 text-sm">
                        ₹{item.itemTotal.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center space-x-1">
                        <CreditCard className="w-2.5 h-2.5" />
                        <span>{item.paymentMethod}</span>
                      </div>
                    </td>

                    {/* Store Name & Time */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center space-x-1">
                        <Building2 className="w-3 h-3 text-purple-600 shrink-0" />
                        <span className="truncate max-w-[160px]">{item.storeName}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center space-x-1 mt-0.5">
                        <Clock className="w-2.5 h-2.5 text-slate-400" />
                        <span>{formatTimestamp(item.timestamp)}</span>
                      </div>
                    </td>

                    {/* Invoice & Action */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <span className="text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {item.invoiceNumber}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenInvoice(item.invoiceNumber);
                          }}
                          className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-colors border border-teal-200 dark:border-teal-800"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Invoice Inspector Modal */}
      {selectedInvoice && (
        <InvoiceInspectorModal 
          invoice={selectedInvoice} 
          onClose={() => setSelectedInvoice(null)} 
        />
      )}
    </div>
  );
};
