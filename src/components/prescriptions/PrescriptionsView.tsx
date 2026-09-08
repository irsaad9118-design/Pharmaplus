import React, { useState } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  FileText, 
  Search, 
  PlusCircle, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  Printer, 
  ShieldCheck, 
  Sparkles,
  Filter,
  Trash2,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { Prescription, RxStatus, Patient } from '../../types/pharmacy';
import { RxLabelPrintModal } from './RxLabelPrintModal';

interface PrescriptionsViewProps {
  onOpenNewRx: () => void;
  onSelectPatient: (patient: Patient) => void;
  onLaunchPatientGuide: (patient: Patient, rx: Prescription) => void;
  onLaunchClinicalScreener: (patient: Patient) => void;
}

export const PrescriptionsView: React.FC<PrescriptionsViewProps> = ({
  onOpenNewRx,
  onSelectPatient,
  onLaunchPatientGuide,
  onLaunchClinicalScreener
}) => {
  const { 
    prescriptions, 
    patients, 
    searchQuery, 
    updatePrescriptionStatus, 
    processRefill, 
    dispensePrescription,
    deletePrescription
  } = usePharmacy();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRxForLabel, setSelectedRxForLabel] = useState<Prescription | null>(null);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState<boolean>(false);

  const STATUS_TABS: { id: string; label: string; count?: number }[] = [
    { id: 'all', label: 'All Prescriptions', count: prescriptions.length },
    { id: 'pending_review', label: 'Pending Review', count: prescriptions.filter(p => p.status === 'pending_review').length },
    { id: 'clinical_check', label: 'Clinical Check', count: prescriptions.filter(p => p.status === 'clinical_check').length },
    { id: 'ready_for_pickup', label: 'Ready for Pickup', count: prescriptions.filter(p => p.status === 'ready_for_pickup').length },
    { id: 'refill_requested', label: 'Refill Requests', count: prescriptions.filter(p => p.status === 'refill_requested').length },
    { id: 'dispensed', label: 'Dispensed', count: prescriptions.filter(p => p.status === 'dispensed').length }
  ];

  const filteredRxs = prescriptions.filter(rx => {
    // Status filter
    const matchesStatus = statusFilter === 'all' || rx.status === statusFilter;

    // Search query
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      rx.rxNumber.toLowerCase().includes(q) ||
      rx.medicationName.toLowerCase().includes(q) ||
      rx.genericName.toLowerCase().includes(q) ||
      rx.patientName.toLowerCase().includes(q) ||
      rx.prescriberName.toLowerCase().includes(q) ||
      rx.ndc.includes(q);

    return matchesStatus && matchesSearch;
  });

  const handleOpenLabel = (rx: Prescription) => {
    setSelectedRxForLabel(rx);
    setIsLabelModalOpen(true);
  };

  const getPatientForRx = (rx: Prescription) => {
    return patients.find(p => p.id === rx.patientId);
  };

  return (
    <div id="prescriptions-view" className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              <span>Prescription & Dispensing Queue</span>
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-full">
              {filteredRxs.length} Prescriptions
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage intake verification, clinical pharmacist reviews, refill authorizations, and medication packaging.
          </p>
        </div>

        <button
          onClick={onOpenNewRx}
          id="intake-rx-btn"
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-teal-600/20 transition-all self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Intake New Prescription</span>
        </button>
      </div>

      {/* Pipeline Status Filter Tabs */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 min-w-max text-xs">
          {STATUS_TABS.map(tab => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    isActive ? 'bg-teal-800 text-teal-100' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Prescription Queue List */}
      <div className="space-y-3">
        {filteredRxs.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
            <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">No Prescriptions in this View</p>
            <p className="text-xs text-slate-400 mt-1">Try switching tabs or clear your search query.</p>
          </div>
        ) : (
          filteredRxs.map(rx => {
            const patient = getPatientForRx(rx);
            const isPending = rx.status === 'pending_review';
            const isClinicalCheck = rx.status === 'clinical_check';
            const isReady = rx.status === 'ready_for_pickup';
            const isRefillReq = rx.status === 'refill_requested';
            const isDispensed = rx.status === 'dispensed';

            return (
              <div
                key={rx.id}
                id={`rx-card-${rx.id}`}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-teal-500/40 transition-all space-y-3"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 font-bold ${
                      isPending ? 'bg-amber-100 text-amber-800' :
                      isClinicalCheck ? 'bg-rose-100 text-rose-800' :
                      isReady ? 'bg-teal-100 text-teal-800' :
                      isRefillReq ? 'bg-indigo-100 text-indigo-800' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {isPending && <Clock className="w-5 h-5" />}
                      {isClinicalCheck && <ShieldCheck className="w-5 h-5" />}
                      {isReady && <CheckCircle2 className="w-5 h-5" />}
                      {isRefillReq && <RefreshCw className="w-5 h-5" />}
                      {isDispensed && <FileText className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-base text-slate-900">{rx.medicationName}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                          {rx.strength} • {rx.form}
                        </span>
                        <span className="font-mono text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          {rx.rxNumber}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <span className="text-slate-400">Patient:</span>
                        <button
                          onClick={() => patient && onSelectPatient(patient)}
                          className="font-bold text-slate-800 hover:text-teal-600 flex items-center gap-1 transition-colors"
                        >
                          <span>{rx.patientName}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </button>
                        <span className="text-slate-300">|</span>
                        <span className="text-slate-500">Prescriber: <strong className="text-slate-700">{rx.prescriberName}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Status & Copay */}
                  <div className="text-left sm:text-right shrink-0">
                    <span className={`inline-block px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wider ${
                      isReady ? 'bg-emerald-100 text-emerald-800' :
                      isPending ? 'bg-amber-100 text-amber-800' :
                      isClinicalCheck ? 'bg-rose-100 text-rose-800' :
                      isRefillReq ? 'bg-indigo-100 text-indigo-800' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {rx.status.replace('_', ' ')}
                    </span>
                    <div className="mt-1 text-xs">
                      <span className="font-bold text-teal-800 text-sm">Copay: ₹{rx.copayAmount.toFixed(2)}</span>
                      <span className="text-slate-400 text-[11px] ml-1.5">(Retail: ₹{rx.retailPrice.toFixed(2)})</span>
                    </div>
                  </div>
                </div>

                {/* Sig Banner */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Instructions (Sig):</span>
                  <p className="font-semibold text-slate-800 text-xs leading-relaxed">
                    {rx.sig}
                  </p>
                </div>

                {/* Quantitative Details */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] text-slate-600 pt-1">
                  <div>
                    <span className="text-slate-400 block">Quantity / Days</span>
                    <span className="font-bold text-slate-800">{rx.quantity} units ({rx.daysSupply} days)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Refills Remaining</span>
                    <span className="font-bold text-teal-700">{rx.refillsRemaining} of {rx.refillsTotal}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Date Prescribed</span>
                    <span className="font-medium text-slate-800">{rx.dateWritten}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Next Refill Due</span>
                    <span className="font-medium text-slate-800">{rx.nextRefillDueDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Insurance Adjudication</span>
                    <span className="font-bold text-emerald-700 uppercase">{rx.insuranceStatus.replace('_', ' ')}</span>
                  </div>
                </div>

                {/* Warnings / Alerts if any */}
                {rx.warnings?.length > 0 && (
                  <div className="flex items-center gap-2 text-xs bg-amber-50 text-amber-800 p-2.5 rounded-xl border border-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-[11px] font-medium">{rx.warnings.join(' • ')}</span>
                  </div>
                )}

                {/* Actions Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                    <span>NDC: {rx.ndc}</span>
                    <span>•</span>
                    <span>Bin: A-12</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleOpenLabel(rx)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Preview and print container label"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      <span>Print Label</span>
                    </button>

                    <button
                      onClick={() => patient && onLaunchPatientGuide(patient, rx)}
                      className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-teal-200 transition-colors"
                      title="Generate patient consultation sheet with AI"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>Counsel Guide</span>
                    </button>

                    {/* Status Action Buttons */}
                    {(isPending || isClinicalCheck) && (
                      <button
                        onClick={() => updatePrescriptionStatus(rx.id, 'ready_for_pickup', 'Passed clinical check.')}
                        className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                      >
                        Verify & Stage for Pickup
                      </button>
                    )}

                    {isReady && (
                      <button
                        onClick={() => dispensePrescription(rx.id)}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Dispense to Patient</span>
                      </button>
                    )}

                    {isRefillReq && (
                      <button
                        onClick={() => processRefill(rx.id)}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Authorize Refill</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (confirm(`Remove prescription ${rx.rxNumber}?`)) {
                          deletePrescription(rx.id);
                        }
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Archive prescription"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Label Print Modal */}
      <RxLabelPrintModal
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        rx={selectedRxForLabel}
        patient={selectedRxForLabel ? getPatientForRx(selectedRxForLabel) : null}
      />

    </div>
  );
};
