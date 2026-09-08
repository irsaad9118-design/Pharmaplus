import React, { useState, useEffect } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  X, 
  HeartPulse, 
  Sparkles, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  FileText, 
  DollarSign, 
  TrendingUp,
  Clock
} from 'lucide-react';
import { Patient, MtmCarePlan } from '../../types/pharmacy';

interface MtmReviewModalProps {
  patient: Patient | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MtmReviewModal: React.FC<MtmReviewModalProps> = ({
  patient,
  isOpen,
  onClose
}) => {
  const { generateMtmCarePlan, prescriptions, addToast } = usePharmacy();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [carePlan, setCarePlan] = useState<any | null>(null);

  const patientRxs = patient ? prescriptions.filter(p => p.patientId === patient.id) : [];

  const handleGenerateMtm = async () => {
    if (!patient) return;
    setIsLoading(true);
    try {
      const plan = await generateMtmCarePlan(patient, patientRxs);
      setCarePlan(plan);
      addToast({
        type: 'success',
        title: 'MTM Care Plan Generated',
        message: `CMS-compliant CMR review created for ${patient.firstName} ${patient.lastName}.`
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && patient) {
      handleGenerateMtm();
    }
  }, [isOpen, patient]);

  if (!isOpen || !patient) return null;

  return (
    <div id="mtm-review-modal-overlay" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 my-6 max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-slate-900">Medication Therapy Management (MTM) Review</h3>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[10px] font-bold">
                  CMS Star Quality Protocol
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Comprehensive Medication Review (CMR) & Medication Action Plan (MAP) for {patient.firstName} {patient.lastName}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors"
              title="Print CMS Care Plan"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 text-xs pr-1">
          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto animate-spin">
                <Sparkles className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-base text-slate-800">Evaluating Total Medication Regimen...</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Analyzing chronic drug indications, potential therapeutic duplications, adherence barriers, and generic cost savings...
              </p>
            </div>
          ) : !carePlan ? (
            <div className="text-center py-12 text-slate-400">
              No care plan generated. Click retry.
            </div>
          ) : (
            <div className="space-y-5 print:p-0">
              
              {/* Executive Summary Card */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl space-y-2 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                    Clinical Pharmacist MTM Summary
                  </span>
                  <span className="text-xs text-slate-400">Reviewed by {carePlan.pharmacistName}</span>
                </div>
                <p className="text-sm leading-relaxed text-slate-200 font-medium">
                  {carePlan.summary}
                </p>
              </div>

              {/* Drug Therapy Problems Identified */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 text-indigo-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Drug Therapy Problems (DTPs) & Clinical Opportunities ({carePlan.drugTherapyProblems.length})</span>
                </h4>

                {carePlan.drugTherapyProblems.length === 0 ? (
                  <p className="text-slate-500 italic p-3 bg-slate-50 rounded-xl">No adverse drug therapy problems detected.</p>
                ) : (
                  <div className="space-y-2.5">
                    {carePlan.drugTherapyProblems.map((dtp, idx) => (
                      <div key={idx} className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-950 text-xs">{dtp.issue}</span>
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            dtp.priority === 'high' ? 'bg-rose-600 text-white' :
                            dtp.priority === 'moderate' ? 'bg-amber-600 text-white' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {dtp.priority} priority
                          </span>
                        </div>
                        <p className="text-slate-700 text-xs">
                          <strong>Recommended Pharmacist Action:</strong> {dtp.action}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Medication Action Plan (MAP) for the Patient */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 text-teal-800">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  <span>Medication Action Plan (MAP) - Patient Action Items</span>
                </h4>

                <div className="space-y-2">
                  {carePlan.actionPlanForPatient.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                      <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <p className="text-slate-800 font-medium leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Adherence Strategy & Cost Savings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 text-teal-700">
                    <TrendingUp className="w-4 h-4" />
                    <span>Adherence Optimization Plan</span>
                  </h5>
                  <p className="text-slate-600 leading-relaxed">
                    {carePlan.adherenceStrategy}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 text-emerald-700">
                    <DollarSign className="w-4 h-4" />
                    <span>Cost-Saving & Generic Opportunities</span>
                  </h5>
                  <p className="text-slate-600 leading-relaxed">
                    {carePlan.costSavingOpportunities}
                  </p>
                </div>
              </div>

              {/* Follow-up schedule */}
              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-xs text-indigo-900">
                <span className="font-semibold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Scheduled Follow-Up CMR Encounter: <strong>{carePlan.followUpSchedule}</strong></span>
                </span>
                <span className="font-bold">Pharmacist: {carePlan.pharmacistName}</span>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
          >
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print MTM Document</span>
          </button>
        </div>

      </div>
    </div>
  );
};
