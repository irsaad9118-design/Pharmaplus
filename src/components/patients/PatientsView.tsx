import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  Users, 
  Search, 
  PlusCircle, 
  Phone, 
  Mail, 
  HeartPulse, 
  AlertTriangle, 
  Filter, 
  Sparkles, 
  ArrowUpDown,
  ShoppingBag,
  Award,
  ChevronRight,
  ShieldAlert,
  MessageSquare,
  Clock,
  CheckCircle2,
  Calendar,
  CreditCard,
  UserCheck,
  Send,
  ExternalLink,
  Plus,
  X,
  Edit2,
  Zap
} from 'lucide-react';
import { Patient, ChronicMedicationEntry } from '../../types/pharmacy';

interface PatientsViewProps {
  onSelectPatient: (patient: Patient) => void;
  onOpenNewPatient: () => void;
  onLaunchClinicalScreener: (patient: Patient) => void;
  onLaunchMtmCarePlan: (patient: Patient) => void;
}

export const PatientsView: React.FC<PatientsViewProps> = ({
  onSelectPatient,
  onOpenNewPatient,
  onLaunchClinicalScreener,
  onLaunchMtmCarePlan
}) => {
  const { 
    patients, 
    searchQuery, 
    sendWhatsAppRefillReminder, 
    markChronicRefilled, 
    addChronicMedication,
    recordKhataPayment,
    updatePatient,
    setIsBulkReminderModalOpen,
    setActiveTab
  } = usePharmacy();

  const [activeSubTab, setActiveSubTab] = useState<'roster' | 'chronic_refills'>('roster');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [chronicFilter, setChronicFilter] = useState<'all' | 'overdue' | 'due_soon' | 'upcoming'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'adherence' | 'recent' | 'khata'>('recent');

  // WhatsApp Message Modal State
  const [whatsAppModalData, setWhatsAppModalData] = useState<{
    patient: Patient;
    medication: ChronicMedicationEntry;
    url: string;
    messageText: string;
  } | null>(null);

  const [selectedTemplate, setSelectedTemplate] = useState<'standard' | 'urgent' | 'discount' | 'sync'>('standard');

  // Add Chronic Med Modal State
  const [addMedForPatient, setAddMedForPatient] = useState<Patient | null>(null);
  const [newMedBrand, setNewMedBrand] = useState('Glucophage (Metformin 500mg)');
  const [newMedSalt, setNewMedSalt] = useState('Metformin HCl 500mg');
  const [newMedDosage, setNewMedDosage] = useState('1 Tablet twice daily with meals');
  const [newMedPackSize, setNewMedPackSize] = useState(60);
  const [newMedLastRefill, setNewMedLastRefill] = useState('2026-07-25');
  const [newMedDoctor, setNewMedDoctor] = useState('Dr. Robert Vance, MD (Endocrinology)');

  // Khata Balance Modal State
  const [khataModalPatient, setKhataModalPatient] = useState<Patient | null>(null);
  const [khataAmount, setKhataAmount] = useState<number>(0);
  const [khataAction, setKhataAction] = useState<'settle' | 'add'>('settle');

  const ALL_TAGS = ['Diabetic', 'Hypertension', 'Dyslipidemia', 'Senior', 'Asthma', 'Cardio', 'MedSync Enrolled', 'VIP'];

  // Flatten all chronic medication entries across all patients for the Refill Hub
  const allChronicEntries = useMemo(() => {
    const list: { patient: Patient; med: ChronicMedicationEntry; daysRemaining: number; isOverdue: boolean; isDueSoon: boolean }[] = [];
    const today = new Date('2026-08-23').getTime();

    patients.forEach(patient => {
      if (patient.chronicMedications && patient.chronicMedications.length > 0) {
        patient.chronicMedications.forEach(med => {
          const dueDate = new Date(med.nextDueDate).getTime();
          const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
          list.push({
            patient,
            med,
            daysRemaining: diffDays,
            isOverdue: diffDays < 0,
            isDueSoon: diffDays >= 0 && diffDays <= 5
          });
        });
      }
    });

    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [patients]);

  // Filter chronic entries
  const filteredChronicEntries = useMemo(() => {
    return allChronicEntries.filter(entry => {
      if (chronicFilter === 'overdue' && !entry.isOverdue) return false;
      if (chronicFilter === 'due_soon' && !entry.isDueSoon) return false;
      if (chronicFilter === 'upcoming' && (entry.isOverdue || entry.isDueSoon)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = `${entry.patient.firstName} ${entry.patient.lastName}`.toLowerCase().includes(q);
        const matchPhone = entry.patient.phone.includes(q);
        const matchMed = (entry.med.brandName || entry.med.medicineName || '').toLowerCase().includes(q) || (entry.med.genericSalt || '').toLowerCase().includes(q);
        return matchName || matchPhone || matchMed;
      }
      return true;
    });
  }, [allChronicEntries, chronicFilter, searchQuery]);

  // Filtered Patients List
  const filteredPatients = useMemo(() => {
    return patients.filter(patient => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || 
        patient.firstName.toLowerCase().includes(q) ||
        patient.lastName.toLowerCase().includes(q) ||
        patient.mrn.toLowerCase().includes(q) ||
        patient.phone.includes(q) ||
        (patient.doctorReference || '').toLowerCase().includes(q) ||
        patient.chronicConditions.some(c => c.toLowerCase().includes(q)) ||
        patient.allergies.some(a => a.toLowerCase().includes(q));

      const matchesTag = selectedTagFilter === 'all' || patient.tags.includes(selectedTagFilter as any);

      return matchesSearch && matchesTag;
    }).sort((a, b) => {
      if (sortBy === 'name') return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
      if (sortBy === 'adherence') return a.adherenceScore - b.adherenceScore;
      if (sortBy === 'khata') return (b.creditBalance || 0) - (a.creditBalance || 0);
      return new Date(b.lastVisitDate).getTime() - new Date(a.lastVisitDate).getTime();
    });
  }, [patients, searchQuery, selectedTagFilter, sortBy]);

  // Open WhatsApp Modal
  const handleOpenWhatsAppModal = (patient: Patient, med: ChronicMedicationEntry) => {
    const dueDate = med.nextDueDate || med.nextRefillDueDate;
    const brand = med.brandName || med.medicineName;
    const dosage = med.dosage || med.dosageInstructions || 'As prescribed';
    const daysLeft = Math.ceil((new Date(dueDate).getTime() - new Date('2026-08-23').getTime()) / (1000 * 60 * 60 * 24));
    
    let text = `Hello ${patient.firstName},\nThis is a friendly reminder from PharmPulse Pharmacy. Your 30-day refill for *${brand}* (${dosage}) is due on *${dueDate}* (${daysLeft <= 0 ? 'OVERDUE' : `in ${daysLeft} days`}).\n\nReply YES to confirm your order for quick counter pickup or free doorstep delivery.\nThank you!`;
    
    const cleanPhone = patient.phone.replace(/[^0-9]/g, '') || '15550192834';
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;

    setWhatsAppModalData({
      patient,
      medication: med,
      url: waUrl,
      messageText: text
    });
  };

  // Change WhatsApp template
  const handleSelectTemplate = (type: 'standard' | 'urgent' | 'discount' | 'sync') => {
    if (!whatsAppModalData) return;
    setSelectedTemplate(type);
    const { patient, medication } = whatsAppModalData;
    const dueDate = medication.nextDueDate || medication.nextRefillDueDate;
    const brand = medication.brandName || medication.medicineName;
    const salt = (medication as any).saltComposition || medication.genericSalt || brand;
    const daysLeft = Math.ceil((new Date(dueDate).getTime() - new Date('2026-08-23').getTime()) / (1000 * 60 * 60 * 24));

    let text = '';
    if (type === 'standard') {
      text = `Hello ${patient.firstName},\nThis is a friendly refill reminder from PharmPulse Pharmacy. Your prescription for *${brand}* is scheduled for refill on *${dueDate}*.\nReply YES to prepare your packet for instant pickup.\nHave a healthy day!`;
    } else if (type === 'urgent') {
      text = `⚠️ URGENT ADHERENCE ALERT: Hello ${patient.firstName}, your daily chronic medication *${brand}* (${salt}) is *${Math.abs(daysLeft)} DAYS OVERDUE*.\nMissing doses increases cardiovascular and glycemic risks. Please visit PharmPulse today or reply REFILL for express dispatch!`;
    } else if (type === 'discount') {
      text = `🎉 Special Chronic Care Offer for ${patient.firstName}!\nRefill your 30-day course of *${brand}* this week and enjoy *10% Chronic Care Loyalty Discount* + free blood pressure check at PharmPulse.\nReply YES to claim your medicine bundle.`;
    } else if (type === 'sync') {
      text = `Hello ${patient.firstName},\nPharmPulse MedSync program has bundled all your chronic prescriptions (*${brand}* and related care) into a single convenient monthly pickup.\nCall us at (555) 789-0100 to align all your refill dates!`;
    }

    const cleanPhone = patient.phone.replace(/[^0-9]/g, '') || '15550192834';
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;

    setWhatsAppModalData({
      ...whatsAppModalData,
      url: waUrl,
      messageText: text
    });
  };

  // Submit Add Chronic Med
  const handleSaveChronicMed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addMedForPatient || !newMedBrand) return;

    const nextDueDate = new Date(newMedLastRefill);
    nextDueDate.setDate(nextDueDate.getDate() + 30);
    const nextDueDateStr = nextDueDate.toISOString().split('T')[0];

    addChronicMedication(addMedForPatient.id, {
      medicineName: newMedBrand,
      brandName: newMedBrand,
      genericSalt: newMedSalt || newMedBrand,
      dosage: newMedDosage,
      dosageInstructions: newMedDosage,
      packQuantity: Number(newMedPackSize),
      daysSupply: 30,
      lastRefillDate: newMedLastRefill,
      nextRefillDueDate: nextDueDateStr,
      nextDueDate: nextDueDateStr,
      notes: `Prescribed by: ${newMedDoctor || addMedForPatient.doctorReference || 'Dr. Self'}`
    });

    setAddMedForPatient(null);
  };

  // Submit Khata Balance update
  const handleSaveKhata = () => {
    if (!khataModalPatient) return;
    const current = khataModalPatient.creditBalance || khataModalPatient.creditBalanceDue || 0;
    if (khataAction === 'settle') {
      recordKhataPayment(khataModalPatient.id, khataAmount, 'Cash');
    } else {
      const newBal = current + khataAmount;
      updatePatient(khataModalPatient.id, {
        creditBalance: newBal,
        creditBalanceDue: newBal
      });
    }
    setKhataModalPatient(null);
  };

  return (
    <div id="patients-crm-container" className="space-y-6">
      
      {/* Top Banner with Navigation Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Users className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Customer CRM & 30-Day Chronic Refill Engine
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Longitudinal patient profiles, Khata credit ledgers, automated 30-day refill schedules, and 1-click WhatsApp outreach.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Switcher Tabs */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setActiveSubTab('roster')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeSubTab === 'roster'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Customer Profiles ({patients.length})
              </button>
              <button
                onClick={() => setActiveSubTab('chronic_refills')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeSubTab === 'chronic_refills'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>30-Day Chronic Refills ({allChronicEntries.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBulkReminderModalOpen(true)}
                id="crm-1click-remind-all-btn"
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-98 cursor-pointer"
                title="1-Click Send All Customers Medicine Reminder"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>1-Click Remind All</span>
              </button>

              <button
                onClick={onOpenNewPatient}
                id="crm-register-new-btn"
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-teal-600/20 active:scale-98 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ New Customer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sub-header Filter controls */}
        {activeSubTab === 'roster' ? (
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 text-xs">
            {/* Tag Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Disease Tags:
              </span>
              <button
                onClick={() => setSelectedTagFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 ${
                  selectedTagFilter === 'all'
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              {ALL_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTagFilter(tag)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 ${
                    selectedTagFilter === tag
                      ? 'bg-teal-600 text-white font-semibold shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Sort By:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-semibold focus:outline-none"
              >
                <option value="recent">Recent Activity</option>
                <option value="khata">Highest Khata Balance</option>
                <option value="adherence">Adherence Risk (Lowest first)</option>
                <option value="name">Customer Name (A-Z)</option>
              </select>
            </div>
          </div>
        ) : (
          /* Chronic Refill Filter Tabs */
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter Refill Status:
            </span>
            <button
              onClick={() => setChronicFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                chronicFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
              }`}
            >
              All Due ({allChronicEntries.length})
            </button>
            <button
              onClick={() => setChronicFilter('overdue')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                chronicFilter === 'overdue' ? 'bg-rose-600 text-white' : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400'
              }`}
            >
              🔴 Overdue ({allChronicEntries.filter(e => e.isOverdue).length})
            </button>
            <button
              onClick={() => setChronicFilter('due_soon')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                chronicFilter === 'due_soon' ? 'bg-amber-500 text-white' : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
              }`}
            >
              🟠 Due in ≤ 5 Days ({allChronicEntries.filter(e => e.isDueSoon).length})
            </button>
            <button
              onClick={() => setChronicFilter('upcoming')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                chronicFilter === 'upcoming' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
              }`}
            >
              🟢 Upcoming &gt; 5 Days
            </button>
          </div>
        )}
      </div>

      {/* Main SubTab Content */}
      {activeSubTab === 'roster' ? (
        /* CUSTOMER PROFILE ROSTER */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPatients.map(patient => {
            const hasChronic = patient.chronicMedications && patient.chronicMedications.length > 0;
            const hasDueKhata = (patient.creditBalance || 0) > 0;

            return (
              <div
                key={patient.id}
                id={`patient-crm-card-${patient.id}`}
                className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-teal-500/50 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  
                  {/* Top Customer Info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                        {patient.firstName[0]}{patient.lastName[0]}
                      </div>
                      <div>
                        <h3 
                          onClick={() => onSelectPatient(patient)}
                          className="font-bold text-base text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors cursor-pointer"
                        >
                          {patient.firstName} {patient.lastName}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{patient.phone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Khata Balance Badge */}
                    {hasDueKhata ? (
                      <button
                        onClick={() => {
                          setKhataModalPatient(patient);
                          setKhataAmount(patient.creditBalance || 0);
                        }}
                        className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100"
                        title="Click to settle Khata balance"
                      >
                        Khata: ${patient.creditBalance?.toFixed(2)}
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        Clear Khata
                      </span>
                    )}
                  </div>

                  {/* Doctor Reference & Chronic Tags */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span className="text-slate-400">Ref Doctor:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[170px]" title={patient.doctorReference}>
                        {patient.doctorReference || 'Dr. Vance, MD'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span className="text-slate-400">Loyalty Points:</span>
                      <span className="font-bold text-amber-600 font-mono flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-amber-500" />
                        {patient.loyaltyPoints || 120} pts
                      </span>
                    </div>

                    {/* Chronic Disease Badges */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {patient.chronicConditions.map(c => (
                        <span key={c} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-md text-[11px] font-medium border border-slate-200 dark:border-slate-700">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Chronic Refill Summary Section */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-teal-600" />
                        <span>Chronic Medications ({patient.chronicMedications?.length || 0})</span>
                      </span>
                      <button
                        onClick={() => setAddMedForPatient(patient)}
                        className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" /> Add Med
                      </button>
                    </div>

                    {hasChronic ? (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {patient.chronicMedications.map(med => {
                          const today = new Date('2026-08-23').getTime();
                          const diffDays = Math.ceil((new Date(med.nextDueDate).getTime() - today) / (1000 * 60 * 60 * 24));
                          const isOver = diffDays < 0;

                          return (
                            <div key={med.id} className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between gap-2">
                              <div className="truncate">
                                <div className="font-bold text-slate-900 dark:text-white truncate">{med.brandName}</div>
                                <div className="text-[10px] text-slate-500 truncate">{med.dosage}</div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                                  isOver ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                                  diffDays <= 5 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                                  'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                }`}>
                                  {isOver ? `${Math.abs(diffDays)}d Overdue` : `${diffDays}d left`}
                                </span>

                                {/* 1-Click WhatsApp Trigger */}
                                <button
                                  onClick={() => handleOpenWhatsAppModal(patient, med)}
                                  className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs"
                                  title="Send 1-Click WhatsApp Refill Reminder"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </button>

                                {/* Mark Refilled Today */}
                                <button
                                  onClick={() => markChronicRefilled(patient.id, med.id)}
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-teal-600"
                                  title="Mark Refilled Today (+30 Days)"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 py-1 text-center">No recurring schedule registered.</p>
                    )}
                  </div>

                </div>

                {/* Card Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                  <button
                    onClick={() => onSelectPatient(patient)}
                    className="font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                  >
                    <span>Full Medical Profile</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setActiveTab('pos');
                      }}
                      className="px-2.5 py-1 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 rounded-lg text-xs font-semibold hover:bg-teal-100 border border-teal-200 dark:border-teal-800 flex items-center gap-1"
                    >
                      <ShoppingBag className="w-3 h-3" />
                      <span>Bill POS</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* CHRONIC REFILL ENGINE MASTER VIEW */
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                30-Day Automated Refill Queue & WhatsApp Outreach
              </h3>
              <p className="text-xs text-slate-500">
                Patients nearing exhaustion of maintenance medicine courses. Send 1-click reminders to prevent treatment disruption.
              </p>
            </div>

            <button
              onClick={() => setActiveTab('refills')}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Launch Full Refill Automation Service →</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Patient / Mobile</th>
                  <th className="py-3 px-4">Chronic Medicine & Salt</th>
                  <th className="py-3 px-4">Dosage / Schedule</th>
                  <th className="py-3 px-4">Last Refill</th>
                  <th className="py-3 px-4">Next Due Date</th>
                  <th className="py-3 px-4">Refill Status</th>
                  <th className="py-3 px-4 text-right">1-Click Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredChronicEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                      <p className="font-semibold text-slate-700 text-sm">No Pending Refills Under Filter</p>
                      <p className="text-xs text-slate-400">All patients have active refill supplies.</p>
                    </td>
                  </tr>
                ) : (
                  filteredChronicEntries.map(({ patient, med, daysRemaining, isOverdue, isDueSoon }, idx) => (
                    <tr key={`${patient.id}-${med.id}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-750 transition-colors">
                      
                      {/* Patient */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          {patient.firstName} {patient.lastName}
                        </div>
                        <div className="text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{patient.phone}</span>
                        </div>
                        {patient.creditBalance && patient.creditBalance > 0 ? (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                            Khata: ${patient.creditBalance.toFixed(2)}
                          </span>
                        ) : null}
                      </td>

                      {/* Medicine */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{med.brandName || med.medicineName}</div>
                        <div className="text-slate-500 font-mono text-[11px] truncate max-w-xs">{med.genericSalt}</div>
                      </td>

                      {/* Dosage */}
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {med.dosage || med.dosageInstructions}
                        <div className="text-[10px] text-slate-400">Pack: {med.packQuantity || 30} Tabs (30-day course)</div>
                      </td>

                      {/* Last Refill */}
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {med.lastRefillDate}
                      </td>

                      {/* Next Due */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {med.nextDueDate}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                          isOverdue ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                          isDueSoon ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                          'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {isOverdue ? `🔴 OVERDUE (${Math.abs(daysRemaining)}d)` :
                           isDueSoon ? `🟠 Due in ${daysRemaining} days` :
                           `🟢 In ${daysRemaining} days`}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* 1-CLICK WHATSAPP BUTTON */}
                          <button
                            onClick={() => handleOpenWhatsAppModal(patient, med)}
                            id={`send-whatsapp-refill-${med.id}`}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs shadow-emerald-600/30 transition-all"
                            title="Open WhatsApp Refill Composer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>

                          {/* Refill Today Button */}
                          <button
                            onClick={() => markChronicRefilled(patient.id, med.id)}
                            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1"
                            title="Mark Dispensed (+30 Days Refill Cycle)"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                            <span>Refilled</span>
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
      )}

      {/* MODAL: 1-Click WhatsApp Refill Messenger */}
      {whatsAppModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-emerald-600 font-bold">
                <MessageSquare className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Send WhatsApp 30-Day Refill Reminder
                </h3>
              </div>
              <button onClick={() => setWhatsAppModalData(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Recipient info */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs flex justify-between items-center">
              <div>
                <span className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                  {whatsAppModalData.patient.firstName} {whatsAppModalData.patient.lastName}
                </span>
                <div className="text-slate-600 dark:text-slate-300 font-mono">{whatsAppModalData.patient.phone}</div>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-900 dark:text-white">{whatsAppModalData.medication.brandName}</span>
                <div className="text-[11px] text-teal-700 font-medium">Due: {whatsAppModalData.medication.nextDueDate}</div>
              </div>
            </div>

            {/* Template Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Select Message Template:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectTemplate('standard')}
                  className={`p-2 rounded-xl text-xs font-semibold text-left border transition-all ${
                    selectedTemplate === 'standard'
                      ? 'bg-emerald-500 text-white border-emerald-600'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Standard 30-Day Refill Notice
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTemplate('urgent')}
                  className={`p-2 rounded-xl text-xs font-semibold text-left border transition-all ${
                    selectedTemplate === 'urgent'
                      ? 'bg-rose-500 text-white border-rose-600'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  ⚠️ Urgent Overdue Warning
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTemplate('discount')}
                  className={`p-2 rounded-xl text-xs font-semibold text-left border transition-all ${
                    selectedTemplate === 'discount'
                      ? 'bg-amber-500 text-white border-amber-600'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  🎁 10% Chronic Care Promo
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTemplate('sync')}
                  className={`p-2 rounded-xl text-xs font-semibold text-left border transition-all ${
                    selectedTemplate === 'sync'
                      ? 'bg-teal-600 text-white border-teal-700'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  🔄 MedSync Bundle Align
                </button>
              </div>
            </div>

            {/* Message Body Preview */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                WhatsApp Message Preview:
              </label>
              <textarea
                rows={4}
                value={whatsAppModalData.messageText}
                onChange={(e) => {
                  const text = e.target.value;
                  const cleanPhone = whatsAppModalData.patient.phone.replace(/[^0-9]/g, '') || '15550192834';
                  setWhatsAppModalData({
                    ...whatsAppModalData,
                    messageText: text,
                    url: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
                  });
                }}
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-sans leading-relaxed text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-[11px] text-slate-400">Directly triggers official WhatsApp Web or App.</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWhatsAppModalData(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <a
                  href={whatsAppModalData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    setTimeout(() => setWhatsAppModalData(null), 800);
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send via WhatsApp</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: Add Chronic Medication Schedule */}
      {addMedForPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-teal-600 font-bold">
                <Clock className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Schedule 30-Day Chronic Medication
                </h3>
              </div>
              <button onClick={() => setAddMedForPatient(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Enrolling <strong className="text-slate-900 dark:text-white">{addMedForPatient.firstName} {addMedForPatient.lastName}</strong> into automatic refill reminders.
            </p>

            <form onSubmit={handleSaveChronicMed} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Brand Name *:</label>
                <input
                  type="text"
                  required
                  value={newMedBrand}
                  onChange={(e) => setNewMedBrand(e.target.value)}
                  placeholder="e.g. Lipitor 40mg"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Generic Salt Composition:</label>
                <input
                  type="text"
                  value={newMedSalt}
                  onChange={(e) => setNewMedSalt(e.target.value)}
                  placeholder="e.g. Atorvastatin 40mg"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Dosage Instructions:</label>
                <input
                  type="text"
                  value={newMedDosage}
                  onChange={(e) => setNewMedDosage(e.target.value)}
                  placeholder="e.g. 1 Tablet once daily at bedtime"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Pack Size (Tabs):</label>
                  <input
                    type="number"
                    value={newMedPackSize}
                    onChange={(e) => setNewMedPackSize(parseInt(e.target.value) || 30)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Last Refill Date:</label>
                  <input
                    type="date"
                    value={newMedLastRefill}
                    onChange={(e) => setNewMedLastRefill(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Prescribing Doctor:</label>
                <input
                  type="text"
                  value={newMedDoctor}
                  onChange={(e) => setNewMedDoctor(e.target.value)}
                  placeholder="Dr. Robert Vance, MD"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setAddMedForPatient(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm"
                >
                  Save Chronic Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Customer Khata Balance Settle */}
      {khataModalPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
                <CreditCard className="w-5 h-5 text-teal-600" />
                <h3>Customer Khata Ledger</h3>
              </div>
              <button onClick={() => setKhataModalPatient(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs space-y-1">
              <div className="font-bold text-slate-900 dark:text-white">{khataModalPatient.firstName} {khataModalPatient.lastName}</div>
              <div className="text-slate-500">{khataModalPatient.phone}</div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Current Due Balance:</span>
                <span className="font-black text-rose-600 font-mono text-base">${khataModalPatient.creditBalance?.toFixed(2) || '0.00'}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setKhataAction('settle')}
                  className={`flex-1 py-1.5 rounded-lg font-bold border ${
                    khataAction === 'settle' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Settle / Receive Payment
                </button>
                <button
                  type="button"
                  onClick={() => setKhataAction('add')}
                  className={`flex-1 py-1.5 rounded-lg font-bold border ${
                    khataAction === 'add' ? 'bg-rose-600 text-white border-rose-700' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Add Credit Due
                </button>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Amount ($):
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={khataAmount}
                  onChange={(e) => setKhataAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setKhataModalPatient(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveKhata}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm"
              >
                Confirm Ledger Entry
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
