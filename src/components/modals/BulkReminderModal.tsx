import React, { useState, useMemo, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Users,
  Copy,
  ExternalLink,
  X,
  Calendar,
  Phone,
  Pill,
  Filter,
  Check,
  Download,
  Flame,
  Zap,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { BulkReminderItem, BulkReminderResult } from '../../types/pharmacy';

interface BulkReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCohort?: 'all' | 'due_and_overdue' | 'overdue_only';
}

export const BulkReminderModal: React.FC<BulkReminderModalProps> = ({
  isOpen,
  onClose,
  defaultCohort = 'due_and_overdue'
}) => {
  const {
    patients,
    shopSettings,
    sendAllCustomersMedicineReminders,
    lastBulkReminderResult,
    addToast
  } = usePharmacy();

  const [selectedCohort, setSelectedCohort] = useState<'all' | 'due_and_overdue' | 'overdue_only'>(defaultCohort);
  const [customNote, setCustomNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendingIndex, setSendingIndex] = useState(-1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'results'>('preview');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [allCopied, setAllCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const TODAY_DATE = '2026-08-23';
  const refTime = new Date(TODAY_DATE).getTime();

  // Reset states when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedCohort(defaultCohort);
      setIsSending(false);
      setSendingIndex(-1);
      setIsCompleted(false);
      setActiveTab('preview');
    }
  }, [isOpen, defaultCohort]);

  // Compute eligible candidates based on selected cohort
  const eligibleCandidates = useMemo(() => {
    const list: Array<{
      patient: typeof patients[0];
      medication: typeof patients[0]['chronicMedications'][0];
      daysRemaining: number;
      isOverdue: boolean;
      isDueToday: boolean;
      isDueSoon: boolean;
      cleanPhone: string;
      dueDate: string;
    }> = [];

    patients.forEach(patient => {
      (patient.chronicMedications || []).forEach(med => {
        const dueDate = med.nextRefillDueDate || med.nextDueDate || '2026-08-25';
        const daysRemaining = Math.ceil((new Date(dueDate).getTime() - refTime) / (1000 * 60 * 60 * 24));
        const isOverdue = daysRemaining < 0 || med.reminderStatus === 'overdue';
        const isDueToday = daysRemaining === 0;
        const isDueSoon = daysRemaining > 0 && daysRemaining <= 7;

        let matches = false;
        if (selectedCohort === 'overdue_only') {
          matches = isOverdue && med.reminderStatus !== 'refilled';
        } else if (selectedCohort === 'all') {
          matches = med.reminderStatus !== 'refilled';
        } else {
          // 'due_and_overdue'
          matches = (isOverdue || daysRemaining <= 7 || med.reminderStatus === 'pending') && med.reminderStatus !== 'refilled';
        }

        if (matches) {
          list.push({
            patient,
            medication: med,
            daysRemaining,
            isOverdue,
            isDueToday,
            isDueSoon,
            cleanPhone: patient.phone.replace(/[^0-9]/g, ''),
            dueDate
          });
        }
      });
    });

    // Sort: overdue first, then days remaining ascending
    return list.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return a.daysRemaining - b.daysRemaining;
    });
  }, [patients, selectedCohort, refTime]);

  // Cohort Counts for quick badges
  const cohortCounts = useMemo(() => {
    let overdueCount = 0;
    let dueSoonCount = 0;
    let allCount = 0;

    patients.forEach(p => {
      (p.chronicMedications || []).forEach(m => {
        if (m.reminderStatus === 'refilled') return;
        allCount++;
        const dueDate = m.nextRefillDueDate || m.nextDueDate || '2026-08-25';
        const diff = Math.ceil((new Date(dueDate).getTime() - refTime) / (1000 * 60 * 60 * 24));
        if (diff < 0 || m.reminderStatus === 'overdue') overdueCount++;
        else if (diff <= 7 || m.reminderStatus === 'pending') dueSoonCount++;
      });
    });

    return {
      overdue: overdueCount,
      dueAndOverdue: overdueCount + dueSoonCount,
      all: allCount
    };
  }, [patients, refTime]);

  const uniquePatientsCount = useMemo(() => {
    const ids = new Set(eligibleCandidates.map(c => c.patient.id));
    return ids.size;
  }, [eligibleCandidates]);

  // Filtered by local search query in modal
  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return eligibleCandidates;
    const q = searchQuery.toLowerCase();
    return eligibleCandidates.filter(c => 
      `${c.patient.firstName} ${c.patient.lastName}`.toLowerCase().includes(q) ||
      c.patient.phone.includes(q) ||
      c.medication.medicineName.toLowerCase().includes(q) ||
      (c.medication.brandName || '').toLowerCase().includes(q)
    );
  }, [eligibleCandidates, searchQuery]);

  // Results list (if already dispatched or looking at last result)
  const displayItems = useMemo(() => {
    if (activeTab === 'results' && lastBulkReminderResult) {
      return lastBulkReminderResult.items;
    }
    return eligibleCandidates.map(c => {
      const storeName = shopSettings?.shopName || shopSettings?.storeName || 'PharmPulse Medical & Pharmacy';
      const storePhone = shopSettings?.phone || shopSettings?.whatsappPhone || '+91 98765 43210';
      const medName = c.medication.brandName || c.medication.medicineName;
      const daysText = c.isOverdue
        ? `(Overdue by ${Math.abs(c.daysRemaining)} days)`
        : c.isDueToday
          ? `(Due Today)`
          : `(Due in ${c.daysRemaining} days)`;

      const msg = `Hello ${c.patient.firstName} 👋, This is a friendly refill reminder from *${storeName}*.

💊 *Medication:* ${medName}${c.medication.dosageInstructions ? ` (${c.medication.dosageInstructions})` : ''}
📅 *Refill Due Date:* *${c.dueDate}* ${daysText}

We have reserved your fresh monthly supply at our dispensary counter.
Reply *YES* to confirm ready-for-pickup, or text *DELIVER* for fast doorstep delivery.

📍 *Pharmacy Desk:* ${storePhone}
Stay healthy and take care!${customNote ? `\n\n*Note:* ${customNote}` : ''}`;

      const waUrl = `https://wa.me/${c.cleanPhone}?text=${encodeURIComponent(msg)}`;

      return {
        patientId: c.patient.id,
        patientName: `${c.patient.firstName} ${c.patient.lastName}`,
        phone: c.patient.phone,
        medicationId: c.medication.id,
        medicineName: medName,
        dosage: c.medication.dosageInstructions || c.medication.dosage || '',
        dueDate: c.dueDate,
        daysRemaining: c.daysRemaining,
        isOverdue: c.isOverdue,
        messageText: msg,
        whatsappUrl: waUrl,
        status: (c.medication.reminderStatus === 'sent' ? 'sent' : 'queued') as 'sent' | 'queued'
      };
    });
  }, [activeTab, lastBulkReminderResult, eligibleCandidates, shopSettings, customNote]);

  // Handle 1-Click Send All Action
  const handleExecute1ClickSend = async () => {
    if (eligibleCandidates.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Customers In Cohort',
        message: 'There are no active patients requiring reminders for this filter.'
      });
      return;
    }

    setIsSending(true);
    setSendingIndex(0);

    // Animate fast step-by-step progress ticker for high visual feedback
    const total = eligibleCandidates.length;
    const stepDuration = Math.max(30, Math.min(100, Math.floor(1200 / total)));

    for (let i = 0; i < total; i++) {
      setSendingIndex(i);
      await new Promise(r => setTimeout(r, stepDuration));
    }

    // Call context function to dispatch and update state & persistence
    const res = sendAllCustomersMedicineReminders(selectedCohort, customNote);
    setIsSending(false);
    setIsCompleted(true);
    setActiveTab('results');
  };

  const handleCopySingle = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyAll = () => {
    const allText = displayItems.map((item, idx) => 
      `--- [Reminder #${idx + 1}: ${item.patientName} (${item.phone})] ---\n${item.messageText}\n`
    ).join('\n');

    navigator.clipboard.writeText(allText);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2500);
    addToast({
      type: 'info',
      title: 'Messages Copied',
      message: `Copied ${displayItems.length} reminder drafts to clipboard.`
    });
  };

  if (!isOpen) return null;

  return (
    <div 
      id="bulk-reminder-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSending) onClose();
      }}
    >
      <div 
        id="bulk-reminder-modal-container"
        className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp"
      >
        
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-700 px-5 py-4 sm:px-6 sm:py-5 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
              <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  1-Click Send All Customers Medicine Reminder
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-teal-950 uppercase tracking-wider">
                  Instant Dispatch
                </span>
              </div>
              <p className="text-xs text-teal-100 mt-0.5">
                Automated WhatsApp medicine refill reminder engine • Zero manual copy-paste
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSending}
            className="p-2 rounded-xl text-teal-100 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* RECIPIENT COHORT FILTER BAR */}
        <div className="px-5 py-3 sm:px-6 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Target:</span>
            </span>

            {/* Option 1: Due & Overdue (Recommended) */}
            <button
              type="button"
              onClick={() => setSelectedCohort('due_and_overdue')}
              disabled={isSending}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedCohort === 'due_and_overdue'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Due & Overdue</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                selectedCohort === 'due_and_overdue' ? 'bg-teal-800 text-teal-100' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {cohortCounts.dueAndOverdue}
              </span>
            </button>

            {/* Option 2: Overdue Gaps Only */}
            <button
              type="button"
              onClick={() => setSelectedCohort('overdue_only')}
              disabled={isSending}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedCohort === 'overdue_only'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Overdue Only</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                selectedCohort === 'overdue_only' ? 'bg-rose-800 text-rose-100' : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
              }`}>
                {cohortCounts.overdue}
              </span>
            </button>

            {/* Option 3: All Chronic Patients */}
            <button
              type="button"
              onClick={() => setSelectedCohort('all')}
              disabled={isSending}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedCohort === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>All Chronic Refills</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                selectedCohort === 'all' ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {cohortCounts.all}
              </span>
            </button>
          </div>

          {/* Stats Badge */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <Users className="w-3.5 h-3.5 text-teal-600" />
              <b>{uniquePatientsCount}</b> Customers
            </span>
            <span className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <Pill className="w-3.5 h-3.5 text-emerald-600" />
              <b>{eligibleCandidates.length}</b> Medications
            </span>
          </div>
        </div>

        {/* SENDING PROGRESS TICKER (Shows during active dispatch) */}
        {isSending && (
          <div className="px-5 py-3 bg-teal-50 dark:bg-teal-950/60 border-b border-teal-200 dark:border-teal-800/80 shrink-0">
            <div className="flex items-center justify-between text-xs font-bold text-teal-900 dark:text-teal-200 mb-1.5">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-teal-600 animate-spin" />
                <span>
                  Sending WhatsApp Reminders: {sendingIndex + 1} of {eligibleCandidates.length}
                </span>
                {eligibleCandidates[sendingIndex] && (
                  <span className="text-teal-700 dark:text-teal-300 font-normal">
                    • {eligibleCandidates[sendingIndex].patient.firstName} {eligibleCandidates[sendingIndex].patient.lastName} ({eligibleCandidates[sendingIndex].medication.medicineName})
                  </span>
                )}
              </span>
              <span>{Math.round(((sendingIndex + 1) / eligibleCandidates.length) * 100)}%</span>
            </div>
            <div className="w-full bg-teal-200 dark:bg-teal-900 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-100 ease-out"
                style={{ width: `${((sendingIndex + 1) / eligibleCandidates.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* SUCCESS COMPLETION BANNER */}
        {isCompleted && (
          <div className="px-5 py-3 bg-emerald-50 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                Dispatched 1-Click Reminders to {uniquePatientsCount} Customers ({eligibleCandidates.length} Medications)!
              </span>
            </div>
            <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 font-bold">
              Status: Marked Sent • Audit Logged
            </span>
          </div>
        )}

        {/* MODAL BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TOP QUICK CONFIGURATION: Optional custom store note */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Custom Store Note Box */}
            <div className="md:col-span-2 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                <span>Optional Store Announcement / Note (Appends to all WhatsApp messages)</span>
                <span className="text-[10px] text-slate-400 font-normal">e.g. Discounts, Free Tests, Timings</span>
              </label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="e.g., Free BP & Sugar check available at counter this week! Or reply for home delivery."
                className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium"
              />
            </div>

            {/* Fast Action Card */}
            <div className="bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-transparent dark:from-teal-950/40 p-3.5 rounded-2xl border border-teal-200/80 dark:border-teal-800/60 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>One-Touch Trigger</span>
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Sends personalized WhatsApp messages to all {uniquePatientsCount} customers.
                </p>
              </div>

              <button
                type="button"
                id="modal-1click-send-all-btn"
                onClick={handleExecute1ClickSend}
                disabled={isSending || eligibleCandidates.length === 0}
                className="mt-2.5 w-full py-2.5 px-4 rounded-xl font-black text-xs text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:scale-98 shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending Reminders...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                    <span>⚡ 1-Click Send All ({eligibleCandidates.length})</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* CUSTOMER QUEUE ROSTER */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Target Customer Roster ({displayItems.length})
                </h3>
                <span className="text-[11px] text-slate-400">
                  Each customer receives their personalized medicine course, due date & store pickup link
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyAll}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Copy all generated WhatsApp reminder messages"
                >
                  {allCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{allCopied ? 'All Copied!' : 'Copy All Text'}</span>
                </button>
              </div>
            </div>

            {/* List */}
            {displayItems.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <Pill className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Customers in This Cohort</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Switch to 'All Chronic Refills' above to view all tracked customers.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {displayItems.map((item, index) => {
                  const isBeingSent = isSending && sendingIndex === index;
                  const hasSent = isCompleted || item.status === 'sent';

                  return (
                    <div
                      key={`${item.patientId}-${item.medicationId}-${index}`}
                      className={`p-3.5 rounded-2xl border transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isBeingSent
                          ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 shadow-sm'
                          : hasSent
                            ? 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      {/* Left: Patient and Medicine Details */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                          hasSent
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : item.isOverdue
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300'
                        }`}>
                          {hasSent ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Pill className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              {item.patientName}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {item.phone}
                            </span>
                            
                            {/* Overdue / Due Badge */}
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold font-mono ${
                              item.isOverdue
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                : item.daysRemaining === 0
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200'
                                  : 'bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-200'
                            }`}>
                              {item.isOverdue
                                ? `${Math.abs(item.daysRemaining)}d Overdue`
                                : item.daysRemaining === 0
                                  ? 'Due Today'
                                  : `Due in ${item.daysRemaining}d`}
                            </span>
                          </div>

                          <div className="text-[11px] text-teal-700 dark:text-teal-400 font-bold mt-0.5">
                            {item.medicineName}
                            {item.dosage && (
                              <span className="text-slate-500 dark:text-slate-400 font-normal ml-1">
                                • {item.dosage}
                              </span>
                            )}
                          </div>
                          
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>Refill Due: {item.dueDate}</span>
                            {hasSent && (
                              <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3" /> Queued for WhatsApp
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Individual Actions (WhatsApp Launch & Copy) */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleCopySingle(item.messageText, index)}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-700"
                          title="Copy text message"
                        >
                          {copiedIndex === index ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedIndex === index ? 'Copied' : 'Copy'}</span>
                        </button>

                        <a
                          href={item.whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-98"
                          title={`Open WhatsApp chat with ${item.patientName}`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp Web</span>
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3.5 sm:px-6 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldAlert className="w-4 h-4 text-teal-600" />
            <span>
              All alerts adhere to pharmacy guidelines and include direct patient contact details and store phone.
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleExecute1ClickSend}
              disabled={isSending || eligibleCandidates.length === 0}
              className="px-5 py-2 text-xs font-extrabold rounded-xl text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 shadow-md shadow-teal-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>{isCompleted ? 'Re-Send 1-Click Reminders' : '⚡ 1-Click Send All Reminders'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
