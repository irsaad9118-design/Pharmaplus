import React, { useState, useEffect } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  X, 
  Sparkles, 
  Printer, 
  Languages, 
  HeartPulse, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  FileText,
  Pill,
  Volume2
} from 'lucide-react';
import { Patient, Prescription } from '../../types/pharmacy';

interface PatientGuideModalProps {
  patient: Patient | null;
  rx?: Prescription | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PatientGuideModal: React.FC<PatientGuideModalProps> = ({
  patient,
  rx,
  isOpen,
  onClose
}) => {
  const { generatePatientGuide, prescriptions } = usePharmacy();

  const [language, setLanguage] = useState<string>('English');
  const [readingLevel, setReadingLevel] = useState<'6th Grade' | '8th Grade' | 'Plain Language'>('Plain Language');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [guideData, setGuideData] = useState<any | null>(null);

  // Default to first rx for patient if none passed
  const activeRx = rx || (patient ? prescriptions.find(p => p.patientId === patient.id) : null);

  const fetchGuide = async () => {
    if (!patient || !activeRx) return;
    setIsLoading(true);
    try {
      const data = await generatePatientGuide(
        activeRx.medicationName,
        activeRx.strength,
        activeRx.sig,
        `${patient.firstName} ${patient.lastName}`,
        language,
        (patient.chronicConditions || []).join(', ')
      );
      setGuideData(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && patient && activeRx) {
      fetchGuide();
    }
  }, [isOpen, patient, activeRx, language]);

  if (!isOpen || !patient || !activeRx) return null;

  return (
    <div id="patient-guide-modal-overlay" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 my-6 max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-slate-900">AI Patient Medication Consultation Guide</h3>
                <span className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-full text-[10px] font-bold">
                  Gemini 3.7 Flash
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Personalized, health-literacy optimized counseling sheet for {patient.firstName} {patient.lastName}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors"
              title="Print Patient Handout"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Language & Literacy */}
        <div className="py-3 flex items-center justify-between gap-3 border-b border-slate-100 shrink-0 text-xs flex-wrap">
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-teal-600" />
            <span className="font-semibold text-slate-700">Translate Language:</span>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-teal-900"
            >
              <option value="English">English</option>
              <option value="Spanish">Español (Spanish)</option>
              <option value="Mandarin Chinese">中文 (Mandarin Chinese)</option>
              <option value="Vietnamese">Tiếng Việt (Vietnamese)</option>
              <option value="Arabic">العربية (Arabic)</option>
              <option value="Tagalog">Tagalog (Filipino)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-slate-500">
            <span>Medication: <strong className="text-slate-800">{activeRx.medicationName} {activeRx.strength}</strong></span>
          </div>
        </div>

        {/* Scrollable Content Sheet */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs pr-1">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto animate-spin">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800">Generating Personalized Counseling Sheet...</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Translating pharmacology concepts into clear, empathetic plain language for {patient.firstName}...
              </p>
            </div>
          ) : !guideData ? (
            <div className="text-center py-12 text-slate-400">
              No guide generated. Click reload to regenerate.
            </div>
          ) : (
            <div className="p-6 bg-slate-50/70 border border-slate-200 rounded-3xl space-y-5 print:border-none print:p-0 print:bg-white">
              
              {/* Header Box */}
              <div className="bg-teal-900 text-white p-5 rounded-2xl space-y-1 print:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-300">
                    PharmPulse Patient Care Guide
                  </span>
                  <span className="text-xs text-slate-300">{new Date().toLocaleDateString()}</span>
                </div>
                <h2 className="text-xl font-extrabold text-white">
                  {guideData.title || `Understanding Your Medication: ${activeRx.medicationName}`}
                </h2>
                <p className="text-xs text-teal-100">
                  Prepared specially for <strong>{patient.firstName} {patient.lastName}</strong>
                </p>
              </div>

              {/* What is this medication for */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1.5">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 text-teal-800">
                  <Pill className="w-4 h-4" />
                  <span>Why You Are Taking This Medication</span>
                </h4>
                <p className="text-slate-700 leading-relaxed text-xs font-medium">
                  {guideData.purpose}
                </p>
              </div>

              {/* How to take it */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 text-teal-800">
                  <Clock className="w-4 h-4" />
                  <span>How & When to Take Your Doses</span>
                </h4>
                
                {Array.isArray(guideData.howToTake) ? (
                  <ul className="space-y-1.5 list-disc list-inside text-slate-700">
                    {guideData.howToTake.map((step: string, idx: number) => (
                      <li key={idx} className="leading-relaxed font-medium">{step}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-700 font-medium leading-relaxed">{guideData.howToTake}</p>
                )}
              </div>

              {/* Key Do's and Don'ts / What to avoid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 space-y-2">
                  <h4 className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Things to Avoid (Foods & Other Drugs)</span>
                  </h4>
                  {Array.isArray(guideData.whatToAvoid) ? (
                    <ul className="space-y-1 text-amber-900">
                      {guideData.whatToAvoid.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-amber-600 font-bold">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-amber-900">{guideData.whatToAvoid}</p>
                  )}
                </div>

                <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 space-y-2">
                  <h4 className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                    <HeartPulse className="w-4 h-4 text-blue-600" />
                    <span>What to Do if You Miss a Dose</span>
                  </h4>
                  <p className="text-blue-900 leading-relaxed font-medium">
                    {guideData.missedDose || 'Take the missed dose as soon as you remember, unless it is almost time for your next regular dose. Never take two doses at once to make up.'}
                  </p>
                </div>
              </div>

              {/* Potential Side Effects */}
              {guideData.sideEffects && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 text-teal-800">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Possible Side Effects & Normal Sensations</span>
                  </h4>
                  {Array.isArray(guideData.sideEffects) ? (
                    <div className="flex flex-wrap gap-2">
                      {guideData.sideEffects.map((effect: string, idx: number) => (
                        <span key={idx} className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-[11px] font-medium">
                          {effect}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-700">{guideData.sideEffects}</p>
                  )}
                </div>
              )}

              {/* When to Call Pharmacy / Doctor */}
              <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 text-rose-950 space-y-1">
                <h4 className="font-bold text-xs flex items-center gap-1 text-rose-700">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>When to Contact PharmPulse or Your Doctor Immediately</span>
                </h4>
                <p className="text-xs leading-relaxed">
                  {guideData.whenToCallDoctor || 'Call us right away if you experience rash, swelling of lips/tongue, unusual dizziness, or severe shortness of breath.'}
                </p>
              </div>

              {/* Pharmacy Contact Footer */}
              <div className="pt-2 text-center text-[11px] text-slate-500 border-t border-slate-200">
                <p>PharmPulse Clinical Pharmacy • Direct Pharmacist Helpline: (555) 019-2834</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Please keep this sheet with your medication box.</p>
              </div>

            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
          >
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print Patient Handout</span>
          </button>
        </div>

      </div>
    </div>
  );
};
