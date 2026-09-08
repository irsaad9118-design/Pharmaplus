import React, { useState } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  HeartPulse, 
  AlertTriangle, 
  Sparkles, 
  FileText, 
  RefreshCw, 
  PlusCircle, 
  ShoppingBag, 
  Award, 
  Send, 
  Calendar,
  CheckCircle2,
  Trash2,
  Edit3
} from 'lucide-react';
import { Patient, Prescription } from '../../types/pharmacy';

interface PatientDetailModalProps {
  patient: Patient | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenNewRxForPatient: (patient: Patient) => void;
  onLaunchClinicalScreener: (patient: Patient) => void;
  onLaunchMtmCarePlan: (patient: Patient) => void;
  onLaunchPatientGuide: (patient: Patient, rx?: Prescription) => void;
}

export const PatientDetailModal: React.FC<PatientDetailModalProps> = ({
  patient,
  isOpen,
  onClose,
  onOpenNewRxForPatient,
  onLaunchClinicalScreener,
  onLaunchMtmCarePlan,
  onLaunchPatientGuide
}) => {
  const { 
    prescriptions, 
    processRefill, 
    dispensePrescription, 
    updatePatient,
    deletePatient, 
    addToast,
    setActiveTab 
  } = usePharmacy();

  const [activeSubTab, setActiveSubTab] = useState<'prescriptions' | 'clinical' | 'communication' | 'insurance'>('prescriptions');
  const [quickSmsText, setQuickSmsText] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editableNotes, setEditableNotes] = useState('');

  if (!isOpen || !patient) return null;

  const patientRxs = prescriptions.filter(p => p.patientId === patient.id);
  const readyRxs = patientRxs.filter(p => p.status === 'ready_for_pickup');

  const handleSendQuickSms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSmsText.trim()) return;

    addToast({
      type: 'success',
      title: 'SMS Sent to Patient',
      message: `Message dispatched to ${patient.phone}: "${quickSmsText}"`
    });
    setQuickSmsText('');
  };

  const handleSaveNotes = () => {
    updatePatient(patient.id, { notes: editableNotes });
    setIsEditingNotes(false);
  };

  return (
    <div id="patient-detail-modal-overlay" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 my-6 max-h-[92vh] flex flex-col">
        
        {/* Modal Top Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-teal-600/20 shrink-0">
              {patient.firstName[0]}{patient.lastName[0]}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold text-slate-900">{patient.firstName} {patient.lastName}</h3>
                <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{patient.mrn}</span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  patient.adherenceScore >= 80 ? 'bg-emerald-100 text-emerald-800' :
                  patient.adherenceScore >= 65 ? 'bg-amber-100 text-amber-800' :
                  'bg-rose-100 text-rose-800'
                }`}>
                  {patient.adherenceScore}% Adherence PDC
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                <span>DOB: {patient.dob} ({new Date().getFullYear() - new Date(patient.dob).getFullYear()} yrs)</span>
                <span>•</span>
                <span>Gender: {patient.gender}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-700 font-medium">
                  <Phone className="w-3 h-3 text-teal-600" />
                  {patient.phone}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-700 font-medium">
                  <Award className="w-3 h-3 text-amber-600" />
                  {patient.loyaltyPoints} pts
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (confirm(`Are you sure you want to delete or archive patient ${patient.firstName} ${patient.lastName}?`)) {
                  deletePatient(patient.id);
                  onClose();
                }
              }}
              className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-colors"
              title="Delete Patient"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Action Clinical Toolbar */}
        <div className="py-3 flex items-center gap-2 overflow-x-auto border-b border-slate-100 shrink-0 scrollbar-none">
          <button
            onClick={() => onOpenNewRxForPatient(patient)}
            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Prescribe New Rx</span>
          </button>

          <button
            onClick={() => onLaunchClinicalScreener(patient)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-teal-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shrink-0 border border-teal-500/30"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Drug-Drug Screener</span>
          </button>

          <button
            onClick={() => onLaunchMtmCarePlan(patient)}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-indigo-200 shrink-0"
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Start MTM Care Plan</span>
          </button>

          <button
            onClick={() => onLaunchPatientGuide(patient)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 shrink-0"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>AI Plain-Language Guide</span>
          </button>

          {readyRxs.length > 0 && (
            <button
              onClick={() => {
                onClose();
                setActiveTab('pos');
              }}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-emerald-200 shrink-0"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Checkout {readyRxs.length} Ready Rx in POS</span>
            </button>
          )}
        </div>

        {/* Subtab Navigation */}
        <div className="flex items-center gap-2 pt-3 pb-2 border-b border-slate-100 text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveSubTab('prescriptions')}
            className={`pb-2 px-3 border-b-2 transition-all ${
              activeSubTab === 'prescriptions'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Active & Past Prescriptions ({patientRxs.length})
          </button>
          <button
            onClick={() => setActiveSubTab('clinical')}
            className={`pb-2 px-3 border-b-2 transition-all ${
              activeSubTab === 'clinical'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Clinical Chart & Allergies
          </button>
          <button
            onClick={() => setActiveSubTab('insurance')}
            className={`pb-2 px-3 border-b-2 transition-all ${
              activeSubTab === 'insurance'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Insurance & Copay Tiers
          </button>
          <button
            onClick={() => setActiveSubTab('communication')}
            className={`pb-2 px-3 border-b-2 transition-all ${
              activeSubTab === 'communication'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Outreach & Direct Messaging
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs pr-1">
          
          {/* TAB 1: Prescriptions */}
          {activeSubTab === 'prescriptions' && (
            <div className="space-y-3">
              {patientRxs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-600">No Prescriptions On File</p>
                  <p className="text-xs text-slate-400 mt-1">Click "+ Prescribe New Rx" to add their first medication.</p>
                </div>
              ) : (
                patientRxs.map(rx => (
                  <div 
                    key={rx.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-teal-500/40 transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">{rx.medicationName}</span>
                          <span className="text-xs font-semibold px-2 py-0.5 bg-slate-200/80 text-slate-700 rounded-md">
                            {rx.strength} • {rx.form}
                          </span>
                          <span className="font-mono text-slate-400 text-[11px]">{rx.rxNumber}</span>
                        </div>
                        <p className="text-xs text-slate-700 mt-1 font-medium italic">
                          "Sig: {rx.sig}"
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] uppercase tracking-wider ${
                          rx.status === 'ready_for_pickup' ? 'bg-teal-100 text-teal-800' :
                          rx.status === 'pending_review' ? 'bg-amber-100 text-amber-800' :
                          rx.status === 'clinical_check' ? 'bg-rose-100 text-rose-800' :
                          rx.status === 'refill_requested' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {rx.status.replace('_', ' ')}
                        </span>
                        <p className="text-[11px] text-teal-700 font-bold mt-1">Copay: ${rx.copayAmount.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                      <div>
                        <span className="text-slate-400 block">Refills Left</span>
                        <span className="font-bold text-slate-800">{rx.refillsRemaining} of {rx.refillsTotal}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Prescriber</span>
                        <span className="font-medium text-slate-800">{rx.prescriberName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Next Refill Due</span>
                        <span className="font-medium text-slate-800">{rx.nextRefillDueDate || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Insurance Claim</span>
                        <span className="font-bold text-emerald-700 uppercase">{rx.insuranceStatus.replace('_', ' ')}</span>
                      </div>
                    </div>

                    {/* Rx Actions Toolbar */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                        <span>NDC: {rx.ndc}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onLaunchPatientGuide(patient, rx)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Counsel Guide</span>
                        </button>

                        {rx.refillsRemaining > 0 && rx.status !== 'ready_for_pickup' && (
                          <button
                            onClick={() => processRefill(rx.id)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-indigo-200"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Prepare Refill</span>
                          </button>
                        )}

                        {rx.status === 'ready_for_pickup' && (
                          <button
                            onClick={() => dispensePrescription(rx.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Dispense Now</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: Clinical Chart & Allergies */}
          {activeSubTab === 'clinical' && (
            <div className="space-y-4">
              {/* Allergies */}
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
                <h4 className="font-bold text-rose-900 text-xs flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Documented Drug & Environmental Allergies</span>
                </h4>
                {patient.allergies.length === 0 ? (
                  <p className="text-slate-500 italic">No known drug allergies (NKDA) recorded in chart.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {patient.allergies.map(a => (
                      <span key={a} className="px-3 py-1 bg-rose-600 text-white font-bold rounded-lg text-xs shadow-sm">
                        ⚠️ {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Chronic Conditions */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 mb-2 text-teal-700">
                  <HeartPulse className="w-4 h-4" />
                  <span>Chronic Medical Conditions & Comorbidities</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {patient.chronicConditions.map(c => (
                    <span key={c} className="px-3 py-1 bg-teal-50 text-teal-800 border border-teal-200 font-semibold rounded-lg text-xs">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Patient Cohort Tags */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <h4 className="font-bold text-slate-800 text-xs mb-2">Pharmacy Tags & Special Cohorts</h4>
                <div className="flex flex-wrap gap-1.5">
                  {patient.tags.map(t => (
                    <span key={t} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-semibold rounded-md border border-indigo-200">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Pharmacist Notes */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs">Pharmacist Chart Notes</h4>
                  {!isEditingNotes ? (
                    <button
                      onClick={() => {
                        setEditableNotes(patient.notes);
                        setIsEditingNotes(true);
                      }}
                      className="text-teal-600 hover:text-teal-800 flex items-center gap-1 font-semibold"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Note</span>
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsEditingNotes(false)}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveNotes}
                        className="px-2.5 py-0.5 bg-teal-600 text-white rounded-lg font-semibold"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>

                {!isEditingNotes ? (
                  <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap">
                    {patient.notes || 'No chart notes added.'}
                  </p>
                ) : (
                  <textarea
                    rows={3}
                    value={editableNotes}
                    onChange={e => setEditableNotes(e.target.value)}
                    className="w-full p-2.5 border border-teal-500 rounded-xl focus:outline-none"
                  />
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Insurance */}
          {activeSubTab === 'insurance' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="font-bold text-slate-800 text-sm">{patient.insuranceProvider}</h4>
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-xs">
                    Active Verified
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[11px]">Policy / Member ID</span>
                    <span className="font-bold font-mono text-slate-800 text-sm">{patient.policyNumber}</span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[11px]">Rx Group Number</span>
                    <span className="font-bold font-mono text-slate-800 text-sm">{patient.groupNumber}</span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[11px]">Assigned Copay Tier</span>
                    <span className="font-bold text-teal-700 text-sm">{patient.copayTier}</span>
                  </div>
                </div>

                <div className="pt-2 text-xs text-slate-500">
                  <p>Billing BIN: <span className="font-mono text-slate-700">004336</span> • PCN: <span className="font-mono text-slate-700">ADV</span> • Relationship: <span className="font-medium text-slate-700">Cardholder (01)</span></p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Outreach & Direct SMS */}
          {activeSubTab === 'communication' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-teal-600" />
                  <span>Send Direct HIPAA-Compliant Outreach to {patient.firstName}</span>
                </h4>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Channel: <strong className="text-slate-800">{patient.preferredContact}</strong></span>
                  <span>•</span>
                  <span>Recipient: <strong className="text-slate-800">{patient.phone}</strong></span>
                </div>

                {/* Pre-canned quick templates */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setQuickSmsText(`Hi ${patient.firstName}, your prescription is ready for pickup at PharmPulse! Store hours: 8am-8pm.`)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px]"
                  >
                    "Ready for Pickup"
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickSmsText(`Hi ${patient.firstName}, you are due for a refill on your maintenance medications. Would you like us to prepare them today? Reply YES.`)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px]"
                  >
                    "Refill Due Reminder"
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickSmsText(`Hello ${patient.firstName}, your annual senior flu shot is available at PharmPulse with zero wait. Walk in anytime!`)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px]"
                  >
                    "Vaccine Invite"
                  </button>
                </div>

                <form onSubmit={handleSendQuickSms} className="space-y-2">
                  <textarea
                    rows={3}
                    value={quickSmsText}
                    onChange={e => setQuickSmsText(e.target.value)}
                    placeholder="Type customized clinical message or select quick template above..."
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-xs"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!quickSmsText.trim()}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch {patient.preferredContact} Message</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
