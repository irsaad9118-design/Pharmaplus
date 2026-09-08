import React, { useState, useMemo, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Phone,
  Search,
  Filter,
  RefreshCw,
  Copy,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Heart,
  Pill,
  ShoppingBag,
  Users,
  Check,
  X,
  Languages,
  Sliders,
  Play,
  Pause,
  ArrowRight,
  FileText,
  Smartphone,
  Download,
  Bell,
  Layers,
  Sparkle,
  Truck,
  DollarSign,
  Share2,
  Zap
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { Patient, ChronicMedicationEntry } from '../../types/pharmacy';
import {
  WHATSAPP_REFILL_TEMPLATES,
  WhatsAppRefillTemplate,
  RefillQueueItem,
  RefillDispatchLog,
  buildRefillQueue,
  interpolateWhatsAppTemplate,
  generateWhatsAppUrl,
  formatPhoneNumber,
  getDaysDifference
} from '../../services/whatsappRefillService';

interface WhatsAppRefillServiceComponentProps {
  onClose?: () => void;
  isModal?: boolean;
}

export const WhatsAppRefillServiceComponent: React.FC<WhatsAppRefillServiceComponentProps> = ({
  onClose,
  isModal = false
}) => {
  const {
    patients,
    shopSettings,
    sendWhatsAppRefillReminder,
    sendAllCustomersMedicineReminders,
    isBulkReminderModalOpen,
    setIsBulkReminderModalOpen,
    markChronicRefilled,
    addItemToCart,
    inventory,
    setCustomerName,
    setContactNumber,
    setIsChronicPatient,
    setActiveTab,
    addToast
  } = usePharmacy();

  // Reference Date for calculations (Aug 23, 2026 in app prototype date)
  const REFERENCE_DATE = '2026-08-23';

  // Master Refill Queue State
  const [filterCohort, setFilterCohort] = useState<'all' | 'overdue' | 'due_today' | 'due_soon' | 'high_risk' | 'sent' | 'refilled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});

  // Active Composer Modal / Drawer State
  const [activeComposerItem, setActiveComposerItem] = useState<RefillQueueItem | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tpl-due-soon-standard');
  const [customNote, setCustomNote] = useState<string>('');
  const [editedMessage, setEditedMessage] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);

  // Batch Automation Runner State
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; currentPatient?: string }>({ current: 0, total: 0 });
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchIntervalSeconds, setBatchIntervalSeconds] = useState(2);

  // Dispatch Logs Audit Trail
  const [dispatchLogs, setDispatchLogs] = useState<RefillDispatchLog[]>([]);
  const [activeTabSub, setActiveTabSub] = useState<'queue' | 'templates' | 'logs'>('queue');

  // Build the full queue
  const fullQueue = useMemo(() => {
    return buildRefillQueue(patients, REFERENCE_DATE);
  }, [patients]);

  // Filtered Queue
  const filteredQueue = useMemo(() => {
    return fullQueue.filter(item => {
      // 1. Cohort Filter
      if (filterCohort === 'overdue' && !item.isOverdue) return false;
      if (filterCohort === 'due_today' && !item.isDueToday) return false;
      if (filterCohort === 'due_soon' && !item.isDueSoon) return false;
      if (filterCohort === 'high_risk') {
        const isRisk = item.patient.tags?.some(t => ['High-Risk', 'Cardio', 'Diabetic', 'Senior'].includes(t));
        if (!isRisk) return false;
      }
      if (filterCohort === 'sent' && item.status !== 'sent') return false;
      if (filterCohort === 'refilled' && item.status !== 'refilled') return false;

      // 2. Tag Filter
      if (selectedTag !== 'all') {
        if (!item.patient.tags?.includes(selectedTag as any)) return false;
      }

      // 3. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const patName = `${item.patient.firstName} ${item.patient.lastName}`.toLowerCase();
        const medName = (item.medication.medicineName || '').toLowerCase();
        const salt = (item.medication.genericSalt || '').toLowerCase();
        const phone = (item.patient.phone || '').toLowerCase();
        const mrn = (item.patient.mrn || '').toLowerCase();
        return patName.includes(q) || medName.includes(q) || salt.includes(q) || phone.includes(q) || mrn.includes(q);
      }

      return true;
    });
  }, [fullQueue, filterCohort, selectedTag, searchQuery]);

  // Statistics Summary
  const stats = useMemo(() => {
    const total = fullQueue.length;
    const overdue = fullQueue.filter(i => i.isOverdue).length;
    const dueToday = fullQueue.filter(i => i.isDueToday).length;
    const dueSoon = fullQueue.filter(i => i.isDueSoon).length;
    const sentToday = fullQueue.filter(i => i.status === 'sent').length;
    const refilled = fullQueue.filter(i => i.status === 'refilled').length;
    const highRisk = fullQueue.filter(i => i.patient.tags?.some(t => ['High-Risk', 'Cardio', 'Diabetic'].includes(t))).length;

    return { total, overdue, dueToday, dueSoon, sentToday, refilled, highRisk };
  }, [fullQueue]);

  // Active Template Object
  const currentTemplate = useMemo(() => {
    return WHATSAPP_REFILL_TEMPLATES.find(t => t.id === selectedTemplateId) || WHATSAPP_REFILL_TEMPLATES[0];
  }, [selectedTemplateId]);

  // Whenever Composer Opens or Template Changes, Recompute Interpolated Message
  useEffect(() => {
    if (activeComposerItem) {
      const compiled = interpolateWhatsAppTemplate(
        currentTemplate.templateBody,
        activeComposerItem.patient,
        activeComposerItem.medication,
        shopSettings,
        customNote
      );
      setEditedMessage(compiled);
    }
  }, [activeComposerItem, currentTemplate, shopSettings, customNote]);

  // Handle Opening Single Composer
  const handleOpenComposer = (item: RefillQueueItem) => {
    setActiveComposerItem(item);
    setSelectedTemplateId(item.recommendedTemplateId || 'tpl-due-soon-standard');
    setCustomNote('');
    setIsCopied(false);
  };

  // 1-Click Send via WhatsApp (Single item)
  const handleTriggerWhatsAppSend = (item: RefillQueueItem, messageOverride?: string) => {
    const finalMsg = messageOverride || interpolateWhatsAppTemplate(
      currentTemplate.templateBody,
      item.patient,
      item.medication,
      shopSettings,
      customNote
    );

    const url = generateWhatsAppUrl(item.patient.phone, finalMsg);

    // Call context dispatch
    sendWhatsAppRefillReminder(item.patient.id, item.medication.id, customNote);

    // Record in Dispatch Log
    const newLog: RefillDispatchLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      patientId: item.patient.id,
      patientName: `${item.patient.firstName} ${item.patient.lastName}`,
      patientPhone: item.patient.phone,
      medicationName: item.medication.medicineName,
      templateId: currentTemplate.id,
      templateName: currentTemplate.name,
      messageText: finalMsg,
      status: 'dispatched',
      channel: 'whatsapp_web'
    };

    setDispatchLogs(prev => [newLog, ...prev]);

    // Close composer if open
    setActiveComposerItem(null);
  };

  // Copy Message Text
  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    addToast({
      type: 'info',
      title: 'Message Copied',
      message: 'WhatsApp template text copied to clipboard.'
    });
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Select / Deselect Items for Batch
  const handleToggleSelect = (id: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSelectAllFiltered = () => {
    const next: Record<string, boolean> = {};
    const allSelected = filteredQueue.every(i => selectedItems[i.id]);
    if (!allSelected) {
      filteredQueue.forEach(i => {
        next[i.id] = true;
      });
    }
    setSelectedItems(next);
  };

  const selectedQueueItems = useMemo(() => {
    return filteredQueue.filter(i => selectedItems[i.id]);
  }, [filteredQueue, selectedItems]);

  // Automated Batch Dispatch Runner
  const handleStartBatchDispatch = async () => {
    if (selectedQueueItems.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Patients Selected',
        message: 'Please select at least 1 patient from the queue to start batch dispatch.'
      });
      return;
    }

    setIsBatchRunning(true);
    setIsBatchModalOpen(true);
    setBatchProgress({ current: 0, total: selectedQueueItems.length });

    for (let idx = 0; idx < selectedQueueItems.length; idx++) {
      const item = selectedQueueItems[idx];
      setBatchProgress({
        current: idx + 1,
        total: selectedQueueItems.length,
        currentPatient: `${item.patient.firstName} ${item.patient.lastName}`
      });

      // Prepare and dispatch reminder
      const msg = interpolateWhatsAppTemplate(
        currentTemplate.templateBody,
        item.patient,
        item.medication,
        shopSettings
      );

      // Trigger reminder in context & record log
      sendWhatsAppRefillReminder(item.patient.id, item.medication.id);

      const logEntry: RefillDispatchLog = {
        id: `batch-${Date.now()}-${idx}`,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        patientId: item.patient.id,
        patientName: `${item.patient.firstName} ${item.patient.lastName}`,
        patientPhone: item.patient.phone,
        medicationName: item.medication.medicineName,
        templateId: currentTemplate.id,
        templateName: currentTemplate.name,
        messageText: msg,
        status: 'dispatched',
        channel: 'whatsapp_web'
      };

      setDispatchLogs(prev => [logEntry, ...prev]);

      // Delay interval between sequential batch triggers
      if (idx < selectedQueueItems.length - 1) {
        await new Promise(res => setTimeout(res, batchIntervalSeconds * 1000));
      }
    }

    setIsBatchRunning(false);
    addToast({
      type: 'success',
      title: 'Batch Dispatch Completed',
      message: `Successfully processed ${selectedQueueItems.length} WhatsApp chronic refill alerts!`
    });
    setSelectedItems({});
  };

  // 1-Click Load into POS Billing Basket
  const handleLoadIntoPosCart = (item: RefillQueueItem) => {
    // Set customer name and phone in POS
    setCustomerName(`${item.patient.firstName} ${item.patient.lastName}`);
    setContactNumber(item.patient.phone);
    setIsChronicPatient(true);

    // Find matching inventory item if available
    const invMatch = (inventory || []).find(inv => 
      inv.brandName?.toLowerCase().includes(item.medication.medicineName.toLowerCase()) ||
      inv.genericName?.toLowerCase().includes(item.medication.genericSalt.toLowerCase()) ||
      inv.saltComposition?.toLowerCase().includes(item.medication.genericSalt.toLowerCase())
    );

    if (invMatch) {
      addItemToCart(invMatch);

      addToast({
        type: 'success',
        title: 'Loaded to POS Cart',
        message: `${item.medication.medicineName} loaded for ${item.patient.firstName}. Switching to POS...`
      });
    } else {
      addToast({
        type: 'info',
        title: 'Customer Assigned to POS',
        message: `${item.patient.firstName}'s profile set in POS counter billing.`
      });
    }

    setActiveTab('pos');
    if (onClose) onClose();
  };

  // Snooze Refill Alert
  const handleSnooze = (item: RefillQueueItem, days = 3) => {
    addToast({
      type: 'info',
      title: 'Reminder Snoozed',
      message: `Snoozed refill notification for ${item.patient.firstName} by ${days} days.`
    });
  };

  return (
    <div 
      id="whatsapp-refill-service-root"
      className={`bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col ${
        isModal ? 'fixed inset-0 z-50 overflow-y-auto p-2 sm:p-4 bg-black/75 backdrop-blur-xs flex items-center justify-center' : 'w-full space-y-5'
      }`}
    >
      <div className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col w-full ${isModal ? 'max-w-6xl max-h-[94vh]' : ''}`}>
        
        {/* TOP SERVICE HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white flex items-center justify-between gap-3 shrink-0 relative overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner text-emerald-100">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-xl font-black tracking-tight leading-tight">
                  WhatsApp Chronic Refill Automation Service
                </h1>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-emerald-100 px-2.5 py-0.5 rounded-full border border-white/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-teal-100 font-medium mt-0.5">
                Automated 1-click &amp; batch WhatsApp adherence alerts for chronic diabetes, cardiac &amp; hypertension maintenance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            {/* View Sub-Tabs */}
            <div className="hidden sm:flex items-center p-1 bg-black/20 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTabSub('queue')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTabSub === 'queue' ? 'bg-white text-teal-900 shadow-xs' : 'text-teal-100 hover:text-white'
                }`}
              >
                Refill Queue ({fullQueue.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTabSub('templates')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTabSub === 'templates' ? 'bg-white text-teal-900 shadow-xs' : 'text-teal-100 hover:text-white'
                }`}
              >
                Template Library ({WHATSAPP_REFILL_TEMPLATES.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTabSub('logs')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTabSub === 'logs' ? 'bg-white text-teal-900 shadow-xs' : 'text-teal-100 hover:text-white'
                }`}
              >
                Dispatch Logs ({dispatchLogs.length})
              </button>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-teal-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close service view"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* METRICS STATS RIBBON */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-slate-200 dark:divide-slate-800 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-xs shrink-0">
          
          <button
            type="button"
            onClick={() => setFilterCohort('all')}
            className={`p-3 text-left transition-all cursor-pointer ${filterCohort === 'all' ? 'bg-white dark:bg-slate-800/90 font-bold' : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/40'}`}
          >
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Chronic Tracked</div>
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5 flex items-center justify-between">
              <span>{stats.total}</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setFilterCohort('overdue')}
            className={`p-3 text-left transition-all cursor-pointer ${filterCohort === 'overdue' ? 'bg-rose-50/80 dark:bg-rose-950/40 font-bold' : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/40'}`}
          >
            <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              <span>Overdue Care Gaps</span>
            </div>
            <div className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5 flex items-center justify-between">
              <span>{stats.overdue}</span>
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setFilterCohort('due_today')}
            className={`p-3 text-left transition-all cursor-pointer ${filterCohort === 'due_today' ? 'bg-amber-50/80 dark:bg-amber-950/40 font-bold' : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/40'}`}
          >
            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">Due Today</div>
            <div className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5 flex items-center justify-between">
              <span>{stats.dueToday}</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setFilterCohort('due_soon')}
            className={`p-3 text-left transition-all cursor-pointer ${filterCohort === 'due_soon' ? 'bg-teal-50/80 dark:bg-teal-950/40 font-bold' : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/40'}`}
          >
            <div className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase tracking-wider">Due Next 7 Days</div>
            <div className="text-base sm:text-lg font-black text-teal-600 dark:text-teal-400 mt-0.5 flex items-center justify-between">
              <span>{stats.dueSoon}</span>
              <Calendar className="w-4 h-4 text-teal-500" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setFilterCohort('sent')}
            className={`p-3 text-left transition-all cursor-pointer ${filterCohort === 'sent' ? 'bg-emerald-50/80 dark:bg-emerald-950/40 font-bold' : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/40'}`}
          >
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Alerts Sent Today</div>
            <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center justify-between">
              <span>{stats.sentToday}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setFilterCohort('high_risk')}
            className={`p-3 text-left transition-all cursor-pointer ${filterCohort === 'high_risk' ? 'bg-indigo-50/80 dark:bg-indigo-950/40 font-bold' : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/40'}`}
          >
            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">High Risk Cohort</div>
            <div className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5 flex items-center justify-between">
              <span>{stats.highRisk}</span>
              <Heart className="w-4 h-4 text-indigo-500" />
            </div>
          </button>

        </div>

        {/* MAIN BODY VIEW */}
        <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto min-h-0">
          
          {/* TAB 1: REFILL QUEUE VIEW */}
          {activeTabSub === 'queue' && (
            <div className="space-y-4">
              
              {/* 1-CLICK SEND ALL CUSTOMERS MEDICINE REMINDER HERO ACTION BANNER */}
              <div 
                id="hero-1click-refill-banner"
                className="bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 rounded-2xl p-4 sm:p-5 text-white shadow-md border border-teal-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400 text-teal-950 flex items-center justify-center shrink-0 font-bold shadow-md shadow-amber-400/20">
                    <Zap className="w-5 h-5 fill-teal-950 text-teal-950" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
                        1-Click Send All Customers Medicine Reminder
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-400 text-teal-950 uppercase tracking-wider">
                        One-Touch WhatsApp
                      </span>
                    </div>
                    <p className="text-xs text-teal-100/90 mt-1 max-w-xl">
                      Instantly dispatch personalized WhatsApp medicine refill reminders to all <b>{fullQueue.length} customers</b> with due or overdue chronic care prescriptions.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsBulkReminderModalOpen(true)}
                    id="hero-1click-send-all-reminders-btn"
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-black text-xs text-teal-950 bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-500 active:scale-98 shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <Zap className="w-4 h-4 fill-teal-950 text-teal-950" />
                    <span>⚡ 1-Click Send All Customers ({fullQueue.length})</span>
                  </button>
                </div>
              </div>

              {/* Search, Tag Filtering & Batch Automation Bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                
                {/* Search & Tags */}
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <div className="relative min-w-[220px] sm:min-w-[280px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search patient, mobile, medicine or salt..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Condition Tag Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                    {['all', 'Diabetic', 'Hypertension', 'Cardio', 'Asthma', 'Senior'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTag(t)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                          selectedTag === t
                            ? 'bg-teal-600 text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {t === 'all' ? 'All Tags' : t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Batch Action Toolbar */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                  <button
                    type="button"
                    onClick={() => setIsBulkReminderModalOpen(true)}
                    id="toolbar-1click-all-btn"
                    className="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-98 whitespace-nowrap"
                    title="1-Click Send All Customers Medicine Reminder"
                  >
                    <Zap className="w-3.5 h-3.5 fill-white text-white" />
                    <span>⚡ 1-Click Remind All ({filteredQueue.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{filteredQueue.length > 0 && filteredQueue.every(i => selectedItems[i.id]) ? 'Deselect All' : 'Select All'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStartBatchDispatch}
                    disabled={selectedQueueItems.length === 0}
                    className="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-98 whitespace-nowrap"
                  >
                    <Send className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Auto-Dispatch ({selectedQueueItems.length}) Selected</span>
                  </button>
                </div>

              </div>

              {/* Refill Queue Cards List */}
              {filteredQueue.length === 0 ? (
                <div className="p-8 sm:p-12 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                  <Pill className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">No Patient Refills Match Current Filter</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    Try switching filters above or clearing the search box to view all chronic patients tracked in PharmPulse.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredQueue.map((item) => {
                    const isSelected = !!selectedItems[item.id];
                    const days = item.daysRemaining;

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-150 flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-teal-50/50 dark:bg-teal-950/30 border-teal-500 ring-1 ring-teal-500'
                            : item.isOverdue
                            ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60 hover:border-rose-400'
                            : item.isDueToday
                            ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 hover:border-amber-400'
                            : 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        {/* Left Info: Checkbox + Patient & Medication Details */}
                        <div className="flex items-start gap-3 min-w-0">
                          
                          {/* Selection Checkbox */}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(item.id)}
                            className="mt-1 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                          />

                          {/* Patient Avatar & Details */}
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                                {item.patient.firstName} {item.patient.lastName}
                              </h4>
                              
                              <span className="text-slate-400 text-xs">•</span>
                              <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                                {formatPhoneNumber(item.patient.phone)}
                              </span>

                              {/* Adherence Score Badge */}
                              <span 
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                  (item.patient.adherenceScore || 85) >= 80 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300' 
                                    : (item.patient.adherenceScore || 85) >= 60
                                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300'
                                    : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300'
                                }`}
                                title={`Medication Adherence Score: ${item.patient.adherenceScore || 85}%`}
                              >
                                {item.patient.adherenceScore || 85}% Adherent
                              </span>

                              {/* Patient Tags */}
                              {(item.patient.tags || []).slice(0, 2).map(tag => (
                                <span 
                                  key={tag} 
                                  className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>

                            {/* Chronic Medicine Info */}
                            <div className="flex items-center gap-2 text-xs flex-wrap">
                              <span className="font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                                💊 {item.medication.medicineName}
                              </span>
                              <span className="text-slate-500 text-[11px] truncate max-w-[200px] sm:max-w-none">
                                {item.medication.dosageInstructions || '1 tablet daily'} • {item.medication.daysSupply || 30}-day supply
                              </span>
                            </div>

                            {/* Status and Last Sent Notes */}
                            <div className="flex items-center gap-2 text-[10.5px] text-slate-500 dark:text-slate-400 font-mono">
                              <span>Last Refill: {item.medication.lastRefillDate || '2026-07-25'}</span>
                              <span>•</span>
                              <span>Due Date: <strong className="text-slate-900 dark:text-white font-bold">{item.medication.nextRefillDueDate || item.medication.nextDueDate}</strong></span>
                              {item.medication.lastReminderSent && (
                                <>
                                  <span>•</span>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-sans font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Sent: {item.medication.lastReminderSent.slice(0, 10)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Days Countdown & Action Buttons */}
                        <div className="flex items-center justify-between lg:justify-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                          
                          {/* Urgency Badge */}
                          <div className="text-right shrink-0 mr-1">
                            {item.isOverdue ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-xl bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                <span>{Math.abs(days)} Days Overdue</span>
                              </span>
                            ) : item.isDueToday ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Due Today</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                                <span>Due in {days}d</span>
                              </span>
                            )}
                          </div>

                          {/* Quick 1-Click Load into POS Button */}
                          <button
                            type="button"
                            onClick={() => handleLoadIntoPosCart(item)}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-2xs"
                            title="Load customer and medication directly into POS Billing Cart"
                          >
                            <ShoppingBag className="w-3.5 h-3.5 text-teal-600" />
                          </button>

                          {/* Mark Refilled 30-Day Cycle */}
                          <button
                            type="button"
                            onClick={() => markChronicRefilled(item.patient.id, item.medication.id)}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                            title="Mark as refilled and advance next due date by 30 days"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-600 inline mr-1" />
                            <span>Refilled</span>
                          </button>

                          {/* Trigger WhatsApp Composer Modal */}
                          <button
                            type="button"
                            onClick={() => handleOpenComposer(item)}
                            id={`trigger-whatsapp-${item.id}`}
                            className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-98"
                            title="Open WhatsApp Template Composer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>

                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* TAB 2: TEMPLATE LIBRARY */}
          {activeTabSub === 'templates' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    Pre-Configured Pharmaceutical WhatsApp Templates
                  </h3>
                  <p className="text-xs text-slate-500">
                    Compliant clinical &amp; commercial messaging templates optimized for patient adherence in India and worldwide.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {WHATSAPP_REFILL_TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 space-y-3 flex flex-col justify-between shadow-2xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${tmpl.badgeColor}`}>
                          {tmpl.badge}
                        </span>
                        <span className="text-[10.5px] font-mono text-slate-400">
                          {tmpl.language} • {tmpl.tone}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {tmpl.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">
                        {tmpl.description}
                      </p>

                      {/* Code preview block */}
                      <div className="p-2.5 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto border border-slate-800">
                        {tmpl.templateBody}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
                      <div className="flex gap-1 flex-wrap">
                        {tmpl.tags.map(t => (
                          <span key={t} className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {t}
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTemplateId(tmpl.id);
                          if (filteredQueue.length > 0) {
                            handleOpenComposer(filteredQueue[0]);
                          } else {
                            setActiveTabSub('queue');
                          }
                        }}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 transition-colors cursor-pointer"
                      >
                        Use Template →
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: DISPATCH LOGS & AUDIT TRAIL */}
          {activeTabSub === 'logs' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    Refill Reminder Dispatch Audit Trail
                  </h3>
                  <p className="text-xs text-slate-500">
                    Real-time timestamped audit log of all automated and manual WhatsApp alerts triggered during this session.
                  </p>
                </div>
              </div>

              {dispatchLogs.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                  <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Dispatches Sent in Current Session</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Send a WhatsApp reminder from the queue above to see live delivery records here.</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="p-3">Time</th>
                          <th className="p-3">Patient</th>
                          <th className="p-3">Phone</th>
                          <th className="p-3">Medication</th>
                          <th className="p-3">Template Used</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {dispatchLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <td className="p-3 font-mono text-[11px] text-slate-500">{log.timestamp}</td>
                            <td className="p-3 font-bold text-slate-900 dark:text-white">{log.patientName}</td>
                            <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">{log.patientPhone}</td>
                            <td className="p-3 text-teal-700 dark:text-teal-400 font-semibold">{log.medicationName}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">{log.templateName}</td>
                            <td className="p-3">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* WHATSAPP MESSAGE COMPOSER MODAL */}
      {activeComposerItem && (
        <div 
          id="whatsapp-composer-modal"
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
            
            {/* Composer Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-emerald-100" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg leading-tight">
                    WhatsApp Refill Reminder Composer
                  </h3>
                  <p className="text-xs text-emerald-100 font-medium mt-0.5">
                    Recipent: <strong>{activeComposerItem.patient.firstName} {activeComposerItem.patient.lastName}</strong> ({formatPhoneNumber(activeComposerItem.patient.phone)})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveComposerItem(null)}
                className="p-1.5 rounded-xl text-emerald-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Composer Grid: Left Controls (7 cols) + Right WhatsApp Live Chat Preview (5 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
              
              {/* Left Column: Template Selection & Variables */}
              <div className="lg:col-span-7 p-4 sm:p-5 space-y-4 flex flex-col">
                
                {/* Template Selector Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Choose WhatsApp Refill Template</span>
                    <span className="text-[10px] text-teal-600 font-semibold">{currentTemplate.tone} Tone</span>
                  </label>
                  
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold focus:ring-2 focus:ring-teal-500"
                  >
                    {WHATSAPP_REFILL_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.badge})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Patient / Medication Context Pills */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Chronic Medicine:</span>
                    <span className="font-bold text-teal-700 dark:text-teal-400">{activeComposerItem.medication.medicineName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Refill Due Date:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {activeComposerItem.medication.nextRefillDueDate || activeComposerItem.medication.nextDueDate}
                      {activeComposerItem.isOverdue && <span className="text-rose-600 ml-1">({Math.abs(activeComposerItem.daysRemaining)}d Overdue)</span>}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Delivery Address:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[220px]">
                      {activeComposerItem.patient.address || 'Standard Store Pickup'}
                    </span>
                  </div>
                </div>

                {/* Optional Pharmacist Custom Note Injection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Special Instructions / Pharmacist Note (Optional)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Appended at bottom</span>
                  </label>
                  <input
                    type="text"
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="e.g. Free home delivery available between 4 PM - 7 PM..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Editable Compiled Message Box */}
                <div className="space-y-1.5 flex-1 flex flex-col">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Final WhatsApp Message Preview (Editable)</span>
                    <span className="text-[10px] text-slate-400 font-mono">Supports *bold* and emojis</span>
                  </label>
                  <textarea
                    rows={6}
                    value={editedMessage}
                    onChange={(e) => setEditedMessage(e.target.value)}
                    className="w-full p-3 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 flex-1 leading-relaxed"
                  />
                </div>

              </div>

              {/* Right Column: Realistic WhatsApp Chat Bubble Screen Preview */}
              <div className="lg:col-span-5 p-4 sm:p-5 bg-[#ECE5DD] dark:bg-slate-950 flex flex-col justify-between space-y-4">
                
                <div className="space-y-3">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                    <span>Live Patient Phone Chat Screen</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">WhatsApp 256-Bit SSL</span>
                  </div>

                  {/* Simulated Phone Screen Container */}
                  <div className="rounded-2xl bg-[#0b141a] text-white p-3 shadow-md border border-slate-700 space-y-2 max-w-[320px] mx-auto w-full">
                    {/* Simulated WhatsApp Header */}
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                      <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-black text-xs">
                        ℞
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate text-white">
                          {shopSettings?.shopName || 'PharmPulse Pharmacy'}
                        </div>
                        <div className="text-[9px] text-emerald-400">Official Dispensary Account</div>
                      </div>
                    </div>

                    {/* WhatsApp Outgoing Message Bubble */}
                    <div className="p-3 rounded-2xl rounded-tr-none bg-[#005c4b] text-white text-[11px] space-y-1.5 shadow-xs font-sans leading-relaxed whitespace-pre-wrap">
                      <div>{editedMessage}</div>
                      <div className="flex items-center justify-end gap-1 text-[9px] text-teal-200 font-mono mt-1">
                        <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-cyan-300 font-bold">✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="space-y-2 pt-2 border-t border-slate-300 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleTriggerWhatsAppSend(activeComposerItem, editedMessage)}
                    id="confirm-send-whatsapp-btn"
                    className="w-full py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Send className="w-4 h-4 text-emerald-200" />
                    <span>Send Message on WhatsApp</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(editedMessage)}
                      className="flex-1 py-1.5 px-2.5 rounded-xl font-bold text-xs bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Copied!' : 'Copy Text'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        markChronicRefilled(activeComposerItem.patient.id, activeComposerItem.medication.id);
                        setActiveComposerItem(null);
                      }}
                      className="flex-1 py-1.5 px-2.5 rounded-xl font-bold text-xs bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Mark Refilled</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* BATCH DISPATCH EXECUTION MODAL */}
      {isBatchModalOpen && (
        <div 
          id="batch-dispatch-modal"
          className="fixed inset-0 z-70 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-4 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <Send className={`w-7 h-7 ${isBatchRunning ? 'animate-bounce' : ''}`} />
            </div>

            <div>
              <h3 className="font-black text-lg text-slate-900 dark:text-white">
                {isBatchRunning ? 'Dispatched Batch Reminders...' : 'Batch Dispatch Complete'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {isBatchRunning
                  ? `Sending reminder to ${batchProgress.currentPatient || 'patient'} (${batchProgress.current} of ${batchProgress.total})`
                  : `Successfully queued and dispatched ${batchProgress.total} WhatsApp refill notifications.`}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${(batchProgress.current / Math.max(1, batchProgress.total)) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>Processed: {batchProgress.current}</span>
                <span>Total: {batchProgress.total}</span>
              </div>
            </div>

            {!isBatchRunning && (
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="w-full py-2.5 px-4 rounded-xl font-extrabold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer"
              >
                Close &amp; View Updated Queue
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
