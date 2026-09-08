import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  BookOpen, 
  Search, 
  Send, 
  DollarSign, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  User, 
  Phone, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  QrCode, 
  Printer, 
  Download, 
  PlusCircle, 
  AlertCircle,
  FileText,
  X,
  History
} from 'lucide-react';
import { Patient, KhataLedgerEntry } from '../../types/pharmacy';

export const KhataLedgerView: React.FC = () => {
  const { 
    patients, 
    khataLedger, 
    shopSettings, 
    recordKhataPayment, 
    sendWhatsAppKhataReminder, 
    addToast 
  } = usePharmacy();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterDueOnly, setFilterDueOnly] = useState<boolean>(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  // Payment settlement modal state
  const [settleModalOpen, setSettleModalOpen] = useState<boolean>(false);
  const [settlePatient, setSettlePatient] = useState<Patient | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [settleMethod, setSettleMethod] = useState<string>('UPI / QR');
  const [settleNotes, setSettleNotes] = useState<string>('');

  // History Drawer modal state
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState<boolean>(false);
  const [historyPatient, setHistoryPatient] = useState<Patient | null>(null);

  // All patients with Khata activity or dues
  const khataCustomers = useMemo(() => {
    return patients.filter(p => {
      const balance = p.creditBalanceDue || p.creditBalance || 0;
      if (filterDueOnly && balance <= 0) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
        const phone = p.phone.toLowerCase();
        const mrn = (p.mrn || '').toLowerCase();
        return fullName.includes(q) || phone.includes(q) || mrn.includes(q);
      }
      return true;
    });
  }, [patients, filterDueOnly, searchTerm]);

  // Overall Khata Metrics
  const metrics = useMemo(() => {
    const totalDue = patients.reduce((sum, p) => sum + (p.creditBalanceDue || p.creditBalance || 0), 0);
    const customersWithDue = patients.filter(p => (p.creditBalanceDue || p.creditBalance || 0) > 0).length;
    
    // Total settled from ledger
    const totalSettled = khataLedger
      .filter(entry => entry.type === 'credit')
      .reduce((sum, entry) => sum + entry.amount, 0);

    const totalDebited = khataLedger
      .filter(entry => entry.type === 'debit')
      .reduce((sum, entry) => sum + entry.amount, 0);

    return {
      totalDue,
      customersWithDue,
      totalSettled,
      totalDebited
    };
  }, [patients, khataLedger]);

  // Open Settle Payment Dialog
  const handleOpenSettle = (patient: Patient) => {
    setSettlePatient(patient);
    setSettleAmount((patient.creditBalanceDue || patient.creditBalance || 0).toString());
    setSettleMethod('UPI / QR');
    setSettleNotes('Khata payment received at counter');
    setSettleModalOpen(true);
  };

  // Submit Settlement
  const handleSubmitSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlePatient) return;
    const amt = parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0) {
      addToast({
        type: 'warning',
        title: 'Invalid Amount',
        message: 'Please enter a valid payment amount.'
      });
      return;
    }

    recordKhataPayment(settlePatient.id, amt, settleMethod, settleNotes);
    setSettleModalOpen(false);
    setSettlePatient(null);
  };

  // Open History Drawer
  const handleOpenHistory = (patient: Patient) => {
    setHistoryPatient(patient);
    setHistoryDrawerOpen(true);
  };

  // Filtered history for selected patient
  const patientHistory = useMemo(() => {
    if (!historyPatient) return [];
    return khataLedger.filter(
      entry => entry.patientId === historyPatient.id || 
      (entry.customerPhone && entry.customerPhone === historyPatient.phone)
    );
  }, [historyPatient, khataLedger]);

  // Export Khata Ledger as CSV
  const handleExportCsv = () => {
    const headers = ['Customer Name', 'Mobile Number', 'Outstanding Balance Due (INR)', 'Loyalty Points', 'Last Visit Date', 'Tags'];
    const rows = khataCustomers.map(p => [
      `"${p.firstName} ${p.lastName}"`,
      `"${p.phone}"`,
      (p.creditBalanceDue || p.creditBalance || 0).toFixed(2),
      p.loyaltyPoints || 0,
      `"${p.lastVisitDate || 'N/A'}"`,
      `"${(p.tags || []).join('; ')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Khata_Udhaar_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast({
      type: 'success',
      title: 'Ledger Exported',
      message: 'Digital Khata customer ledger exported to CSV.'
    });
  };

  return (
    <div id="khata-ledger-view" className="space-y-6 animate-in fade-in">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              Digital Khata & Udhaar Ledger
              <span className="px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800 text-xs font-bold font-mono">
                ₹{metrics.totalDue.toFixed(2)} Total Dues
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage counter credit balances, settle payments, and send 1-click WhatsApp payment reminders with UPI links.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Ledger
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-bold">Total Khata Outstanding</span>
            <DollarSign className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
            ₹{metrics.totalDue.toFixed(2)}
          </div>
          <span className="text-[11px] text-rose-600/80 font-medium">
            Across {metrics.customersWithDue} pending accounts
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-bold">Active Khata Accounts</span>
            <User className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {metrics.customersWithDue}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Customers with active credit balance
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-bold">Store UPI Identifier</span>
            <QrCode className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono truncate">
            {shopSettings.upiId || 'apexmedicos@okhdfcbank'}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Attached in WhatsApp reminders
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-bold">Total Settled via Khata</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            ₹{metrics.totalSettled.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Received collections
          </span>
        </div>

      </div>

      {/* Customer List & Filter Bar */}
      <div className="space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customer name, phone number, or MRN..."
              className="w-full pl-10 pr-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterDueOnly}
              onChange={(e) => setFilterDueOnly(e.target.checked)}
              className="w-4 h-4 rounded-sm accent-teal-600"
            />
            Show Only Outstanding Dues (₹ &gt; 0)
          </label>

        </div>

        {/* Khata Customers Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Customer Name & Phone</th>
                  <th className="py-3.5 px-3">MRN / ID</th>
                  <th className="py-3.5 px-3">Outstanding Balance Due</th>
                  <th className="py-3.5 px-3">Loyalty Points</th>
                  <th className="py-3.5 px-3">Last Visit</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-4 text-right">Khata Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {khataCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <BookOpen className="w-10 h-10 mx-auto mb-2 text-slate-300 opacity-60" />
                      <p className="font-bold text-sm">No Khata customer balances found.</p>
                      <p className="text-xs text-slate-500 mt-1">All customer accounts are settled or no records match your filter.</p>
                    </td>
                  </tr>
                ) : (
                  khataCustomers.map(patient => {
                    const balance = patient.creditBalanceDue || patient.creditBalance || 0;
                    const hasDue = balance > 0;

                    return (
                      <tr key={patient.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors">
                        
                        {/* Name & Phone */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-1.5">
                            {patient.firstName} {patient.lastName}
                            {patient.tags?.includes('VIP') && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[9px] font-bold">
                                VIP
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            {patient.phone}
                          </div>
                        </td>

                        {/* MRN */}
                        <td className="py-3.5 px-3 font-mono text-[11px] text-slate-500">
                          {patient.mrn}
                        </td>

                        {/* Outstanding Balance */}
                        <td className="py-3.5 px-3">
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono inline-block ${
                            hasDue
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          }`}>
                            ₹{balance.toFixed(2)}
                          </span>
                        </td>

                        {/* Loyalty Points */}
                        <td className="py-3.5 px-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                          {patient.loyaltyPoints || 0} pts
                        </td>

                        {/* Last Visit */}
                        <td className="py-3.5 px-3 text-slate-500 font-mono">
                          {patient.lastVisitDate || 'N/A'}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            hasDue
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            {hasDue ? 'Payment Pending' : 'Clear / Settled'}
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            
                            {/* View History */}
                            <button
                              type="button"
                              onClick={() => handleOpenHistory(patient)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                              title="View Ledger History"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>

                            {/* Settle Payment */}
                            {hasDue && (
                              <button
                                type="button"
                                onClick={() => handleOpenSettle(patient)}
                                className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Settle
                              </button>
                            )}

                            {/* WhatsApp Reminder Button */}
                            {hasDue && (
                              <button
                                type="button"
                                onClick={() => sendWhatsAppKhataReminder(patient.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1 transition-all shadow-xs shadow-emerald-600/20 cursor-pointer"
                                title="Send WhatsApp Payment Reminder with UPI Link"
                              >
                                <Send className="w-3 h-3" />
                                WhatsApp
                              </button>
                            )}

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

      {/* Settle Khata Payment Modal */}
      {settleModalOpen && settlePatient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95">
            
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-sm sm:text-base">
                  Settle Khata Payment
                </h3>
              </div>
              <button
                onClick={() => setSettleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSettlement} className="p-5 space-y-4">
              
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-xs text-slate-500">Customer</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {settlePatient.firstName} {settlePatient.lastName} ({settlePatient.phone})
                </div>
                <div className="text-xs text-rose-600 font-bold mt-1 font-mono">
                  Current Due: ₹{(settlePatient.creditBalanceDue || settlePatient.creditBalance || 0).toFixed(2)}
                </div>
              </div>

              {/* Amount to Settle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Settlement Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-black font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Received Via
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Cash', 'UPI / QR', 'Bank Transfer'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSettleMethod(m)}
                      className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        settleMethod === m
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Receipt Remarks / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="e.g. Cleared full month counter balance"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSettleModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-md shadow-teal-600/20 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm & Update Balance
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* History Drawer Modal */}
      {historyDrawerOpen && historyPatient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg max-h-[85vh] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
            
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    Khata Ledger Timeline
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {historyPatient.firstName} {historyPatient.lastName} ({historyPatient.phone})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoryDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {patientHistory.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="font-bold text-xs">No ledger history entries yet.</p>
                </div>
              ) : (
                patientHistory.map(entry => (
                  <div key={entry.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        entry.type === 'debit'
                          ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                          : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                      }`}>
                        {entry.type === 'debit' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {entry.type === 'debit' ? 'Billed on Credit (Udhaar)' : 'Payment Received'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {entry.timestamp} • {entry.paymentMethod}
                        </div>
                        {entry.notes && (
                          <div className="text-[10px] text-slate-400 italic">
                            {entry.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-xs font-black font-mono ${
                        entry.type === 'debit' ? 'text-rose-600' : 'text-emerald-600'
                      }`}>
                        {entry.type === 'debit' ? '+' : '-'}₹{entry.amount.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Bal: ₹{entry.balanceAfter.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Current Due: <strong className="text-rose-600 font-mono">₹{(historyPatient.creditBalanceDue || 0).toFixed(2)}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setHistoryDrawerOpen(false);
                  handleOpenSettle(historyPatient);
                }}
                className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Settle Payment
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
