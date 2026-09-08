import React, { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCw, 
  Store, 
  Receipt, 
  Filter, 
  Calendar, 
  User, 
  Phone, 
  CreditCard, 
  Eye, 
  Printer, 
  FileText,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { PlatformInvoice } from '../../types/pharmacy';
import { InvoiceInspectorModal } from './InvoiceInspectorModal';

export const InvoicesListView: React.FC = () => {
  const [invoices, setInvoices] = useState<PlatformInvoice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<PlatformInvoice | null>(null);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '60' });
      if (storeFilter !== 'all') params.append('storeId', storeFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await fetch(`/api/admin/analytics/invoices?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      }
    } catch (e) {
      console.error('Failed to fetch invoices', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [storeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const totalValue = invoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header & Filter Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800/40">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Cross-Pharmacy Invoice & Thermal Receipt Inspector
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                  DEEP AUDIT
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Inspect full 80mm/58mm GST thermal tax bills, item batches, CGST/SGST splits, and customer details
              </p>
            </div>
          </div>

          <button
            onClick={fetchInvoices}
            disabled={isLoading}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Bills</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          
          <div className="sm:col-span-7 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search invoice number, customer name, phone, medicine name..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>

          <div className="sm:col-span-5 flex items-center space-x-1.5">
            <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-medium"
            >
              <option value="all">All Pharmacies (Cross-Fleet)</option>
              <option value="STORE-APEX01">Apex Medicos & Healthcare</option>
              <option value="STORE-SANJ02">Sanjeevani Medicos & Chemist</option>
              <option value="STORE-CARE03">CarePlus Pharmacy & Wellness</option>
            </select>
          </div>

        </div>

        {/* Total Summary */}
        <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-slate-500">Showing {invoices.length} invoices across active stores</span>
          <span className="text-slate-900 dark:text-white font-bold">
            Total Billed: <strong className="text-blue-600 dark:text-blue-400 font-black">₹{totalValue.toFixed(2)}</strong>
          </span>
        </div>

      </div>

      {/* Invoices List Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Invoice # & Date</th>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Pharmacy Store</th>
                <th className="py-3 px-4">Medicines Included</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Grand Total (₹)</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600 inline mr-2" />
                    Fetching invoice audit data...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No invoices found matching criteria.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr 
                    key={inv.id || inv.invoiceNumber}
                    onClick={() => setSelectedInvoice(inv)}
                    className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors cursor-pointer group"
                  >
                    {/* Invoice & Date */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white font-mono flex items-center space-x-1.5 group-hover:text-blue-600 transition-colors">
                        <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>{inv.invoiceNumber}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        {inv.timestamp}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {inv.customerName || inv.patientName || 'Walk-in Customer'}
                      </div>
                      {(inv.customerPhone || inv.patientPhone) && (
                        <div className="text-[10px] text-slate-500 font-mono flex items-center space-x-1">
                          <Phone className="w-2.5 h-2.5 text-slate-400" />
                          <span>+91 {inv.customerPhone || inv.patientPhone}</span>
                        </div>
                      )}
                    </td>

                    {/* Store */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1">
                        <Building2 className="w-3 h-3 text-purple-500 shrink-0" />
                        <span className="truncate max-w-[140px]">{inv.storeName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                        {inv.storeDl || 'DL-20B/3891'}
                      </div>
                    </td>

                    {/* Medicines Included */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                        {inv.itemNames || (inv.items || []).map(i => i.brandName).join(', ')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {inv.itemCount || (inv.items || []).length} item(s) dispensed
                      </div>
                    </td>

                    {/* Payment Mode */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <CreditCard className="w-3 h-3 text-teal-600" />
                        <span>{inv.paymentMethod || inv.paymentMode || 'Cash'}</span>
                      </span>
                    </td>

                    {/* Grand Total */}
                    <td className="py-3 px-4 text-right">
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm font-mono">
                        ₹{inv.grandTotal.toFixed(2)}
                      </div>
                      {inv.discountTotal > 0 && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                          -₹{inv.discountTotal.toFixed(2)} off
                        </div>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedInvoice(inv);
                        }}
                        className="px-3 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold inline-flex items-center space-x-1 transition-colors border border-blue-200 dark:border-blue-800 shadow-sm"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect Bill</span>
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {selectedInvoice && (
        <InvoiceInspectorModal 
          invoice={selectedInvoice} 
          onClose={() => setSelectedInvoice(null)} 
        />
      )}
    </div>
  );
};
