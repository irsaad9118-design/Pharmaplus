import React, { useState, useEffect } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  ShieldCheck, 
  Sparkles, 
  AlertTriangle, 
  Plus, 
  X, 
  User, 
  FileText, 
  Printer, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  HelpCircle,
  Pill,
  HeartPulse
} from 'lucide-react';
import { Patient, ClinicalScreenResult } from '../../types/pharmacy';

interface ClinicalScreenerViewProps {
  initialPatient?: Patient | null;
}

export const ClinicalScreenerView: React.FC<ClinicalScreenerViewProps> = ({ initialPatient }) => {
  const { 
    patients, 
    inventory, 
    prescriptions, 
    screenInteractions, 
    addToast 
  } = usePharmacy();

  const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatient?.id || '');
  const [medicationsList, setMedicationsList] = useState<string[]>(['Warfarin 5mg', 'Aspirin 81mg', 'Lisinopril 20mg']);
  const [newMedInput, setNewMedInput] = useState<string>('');
  const [patientAge, setPatientAge] = useState<number>(68);
  const [patientConditions, setPatientConditions] = useState<string[]>(['Atrial Fibrillation', 'Hypertension']);
  const [newCondInput, setNewCondInput] = useState<string>('');
  const [patientAllergies, setPatientAllergies] = useState<string[]>(['Penicillin']);
  const [newAllergyInput, setNewAllergyInput] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [screenResult, setScreenResult] = useState<ClinicalScreenResult | null>(null);

  // When selected patient changes, auto-populate their active medications and health history
  useEffect(() => {
    if (selectedPatientId) {
      const patient = patients.find(p => p.id === selectedPatientId);
      if (patient) {
        // Find their active prescriptions
        const activeRxs = prescriptions.filter(p => p.patientId === patient.id);
        const medNames = activeRxs.map(r => `${r.medicationName} ${r.strength}`);
        
        if (medNames.length > 0) {
          setMedicationsList(medNames);
        }
        
        // Calculate age
        const birthYear = new Date(patient.dob).getFullYear();
        const age = new Date().getFullYear() - birthYear;
        setPatientAge(age || 65);

        setPatientConditions(patient.chronicConditions || []);
        setPatientAllergies(patient.allergies || []);
      }
    }
  }, [selectedPatientId, patients, prescriptions]);

  const handleAddMedication = (name?: string) => {
    const medToAdd = name || newMedInput.trim();
    if (medToAdd && !medicationsList.includes(medToAdd)) {
      setMedicationsList(prev => [...prev, medToAdd]);
      setNewMedInput('');
    }
  };

  const handleRemoveMedication = (med: string) => {
    setMedicationsList(prev => prev.filter(m => m !== med));
  };

  const handleAddCondition = () => {
    if (newCondInput.trim() && !patientConditions.includes(newCondInput.trim())) {
      setPatientConditions(prev => [...prev, newCondInput.trim()]);
      setNewCondInput('');
    }
  };

  const handleRemoveCondition = (c: string) => {
    setPatientConditions(prev => prev.filter(item => item !== c));
  };

  const handleAddAllergy = () => {
    if (newAllergyInput.trim() && !patientAllergies.includes(newAllergyInput.trim())) {
      setPatientAllergies(prev => [...prev, newAllergyInput.trim()]);
      setNewAllergyInput('');
    }
  };

  const handleRemoveAllergy = (a: string) => {
    setPatientAllergies(prev => prev.filter(item => item !== a));
  };

  const handleRunScreen = async () => {
    if (medicationsList.length < 1) {
      alert('Please include at least 1 medication to screen.');
      return;
    }

    setIsLoading(true);
    setScreenResult(null);

    try {
      const result = await screenInteractions(
        medicationsList,
        patientAllergies,
        patientConditions,
        newMedInput || undefined
      );
      setScreenResult(result);
      if (result) {
        const isHigh = result.overallRiskLevel === 'CRITICAL' || result.overallRiskLevel === 'HIGH';
        const isMod = result.overallRiskLevel === 'MODERATE';
        addToast({
          type: isHigh ? 'error' : isMod ? 'warning' : 'success',
          title: 'Clinical Safety Analysis Complete',
          message: `Evaluation completed with risk level: ${result.overallRiskLevel}`
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="clinical-screener-view" className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-teal-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-teal-500/30 text-teal-300 border border-teal-400/30 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Gemini 3.7 Clinical Safety Engine
            </span>
            <span className="text-xs text-slate-400">Pharmacist Verification Suite</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">AI Drug-Drug & Contraindication Screener</h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Perform exhaustive multi-agent pharmacology screening for drug interactions, hepatic/renal clearance flags, allergy cross-reactivities, and geriatric beers criteria.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setMedicationsList(['Warfarin 5mg', 'Aspirin 81mg', 'Metformin 1000mg', 'Lisinopril 20mg']);
              setPatientConditions(['Atrial Fibrillation', 'CKD Stage 3', 'Type 2 Diabetes']);
              setPatientAllergies(['Penicillin']);
              setPatientAge(72);
            }}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-xl text-xs font-semibold border border-teal-500/30 flex items-center gap-1.5 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Load Polypharmacy Demo Regimen</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (5 Cols): Clinical Input Workbench */}
        <div className="lg:col-span-5 space-y-5">
          
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
            
            {/* Step 1: Link Patient or Manual */}
            <div>
              <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5 text-teal-800">
                <User className="w-3.5 h-3.5" />
                <span>1. Select Patient Chart (Optional)</span>
              </label>
              <select
                value={selectedPatientId}
                onChange={e => setSelectedPatientId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
              >
                <option value="">-- Ad-hoc Regimen (No Patient Linked) --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} ({p.mrn}) - {p.chronicConditions.join(', ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Medication List */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5" />
                  <span>2. Medications to Screen ({medicationsList.length})</span>
                </label>
              </div>

              {/* Active list chips */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {medicationsList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No medications added yet.</p>
                ) : (
                  medicationsList.map(med => (
                    <div 
                      key={med}
                      className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs"
                    >
                      <span className="font-bold text-slate-800">{med}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMedication(med)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add medication input */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newMedInput}
                  onChange={e => setNewMedInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddMedication()}
                  placeholder="e.g. Clopidogrel 75mg or Ibuprofen 400mg"
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddMedication()}
                  className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {/* Quick formulary suggestions */}
              <div className="pt-2">
                <span className="text-[11px] text-slate-400 font-medium block mb-1">Quick Add from Stock:</span>
                <div className="flex flex-wrap gap-1">
                  {inventory.slice(0, 5).map(inv => (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => handleAddMedication(`${inv.brandName} ${inv.strength}`)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold transition-colors"
                    >
                      + {inv.brandName}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 3: Patient Conditions & Age */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold text-xs mb-1">Patient Age</label>
                  <input
                    type="number"
                    value={patientAge}
                    onChange={e => setPatientAge(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold text-xs mb-1">Geriatric / Pediatric</label>
                  <span className={`inline-block w-full px-3 py-1.5 text-xs rounded-xl font-bold text-center ${
                    patientAge >= 65 ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                    patientAge < 18 ? 'bg-purple-50 text-purple-800 border border-purple-200' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {patientAge >= 65 ? 'Geriatric (Beers Criteria)' : patientAge < 18 ? 'Pediatric' : 'Adult'}
                  </span>
                </div>
              </div>

              {/* Chronic Conditions */}
              <div>
                <label className="block text-slate-700 font-semibold text-xs mb-1 flex items-center gap-1">
                  <HeartPulse className="w-3.5 h-3.5 text-teal-600" />
                  <span>Chronic Comorbidities</span>
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {patientConditions.map(cond => (
                    <span key={cond} className="px-2 py-0.5 bg-teal-50 text-teal-800 rounded-md text-[11px] font-semibold border border-teal-200 flex items-center gap-1">
                      <span>{cond}</span>
                      <button onClick={() => handleRemoveCondition(cond)} className="hover:text-rose-600"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCondInput}
                    onChange={e => setNewCondInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddCondition()}
                    placeholder="Add condition (e.g. CKD, Heart Failure)..."
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleAddCondition}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Allergies */}
              <div>
                <label className="block text-rose-800 font-semibold text-xs mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Documented Drug Allergies</span>
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {patientAllergies.map(allg => (
                    <span key={allg} className="px-2 py-0.5 bg-rose-50 text-rose-800 rounded-md text-[11px] font-semibold border border-rose-200 flex items-center gap-1">
                      <span>{allg}</span>
                      <button onClick={() => handleRemoveAllergy(allg)} className="hover:text-rose-900"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAllergyInput}
                    onChange={e => setNewAllergyInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddAllergy()}
                    placeholder="Add allergen (e.g. Sulfa, NSAIDs)..."
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleAddAllergy}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Big Action Button */}
            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleRunScreen}
                disabled={isLoading || medicationsList.length === 0}
                className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2 transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{isLoading ? 'Screening Pharmacology Data...' : 'Run AI Safety & Interaction Screen'}</span>
              </button>
            </div>

          </div>

        </div>

        {/* Right Column (7 Cols): Clinical Evaluation Results */}
        <div className="lg:col-span-7 space-y-5">
          
          {isLoading ? (
            <div className="bg-white rounded-2xl p-12 border border-slate-200/80 shadow-sm text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto animate-spin">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Analyzing Pharmacology Matrices</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Gemini is cross-referencing CYP450 enzyme pathways, renal excretion clearance, QT prolongation risk, and known allergen epitopes...
                </p>
              </div>
            </div>
          ) : !screenResult ? (
            <div className="bg-white rounded-2xl p-10 border border-slate-200/80 shadow-sm text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-800">Ready for Clinical Evaluation</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Configure patient drugs and conditions on the left, then click <strong>"Run AI Safety & Interaction Screen"</strong> to view structured severity assessments, mechanism breakdowns, and counseling precautions.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              
              {/* Overall Risk Scorecard */}
              <div className={`rounded-2xl p-5 border shadow-sm ${
                (screenResult.overallRiskLevel === 'CRITICAL' || screenResult.overallRiskLevel === 'HIGH') ? 'bg-rose-50 border-rose-200 text-rose-950' :
                screenResult.overallRiskLevel === 'MODERATE' ? 'bg-amber-50 border-amber-200 text-amber-950' :
                'bg-emerald-50 border-emerald-200 text-emerald-950'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                        (screenResult.overallRiskLevel === 'CRITICAL' || screenResult.overallRiskLevel === 'HIGH') ? 'bg-rose-600 text-white' :
                        screenResult.overallRiskLevel === 'MODERATE' ? 'bg-amber-600 text-white' :
                        'bg-emerald-600 text-white'
                      }`}>
                        {screenResult.overallRiskLevel} Clinical Risk
                      </span>
                    </div>

                    <h3 className="text-lg font-extrabold mt-2">Clinical Executive Summary</h3>
                    <p className="text-xs leading-relaxed mt-1">{screenResult.summary}</p>
                  </div>

                  <button
                    onClick={() => window.print()}
                    className="p-2 bg-white/80 hover:bg-white rounded-xl shadow-sm transition-colors text-slate-700"
                    title="Print report"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Specific Interactions Detected */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Interactions & Contraindications ({(screenResult.interactions || []).length})</span>
                </h4>

                {(!screenResult.interactions || screenResult.interactions.length === 0) ? (
                  <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>No significant drug-drug or drug-disease interactions detected in this combination.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {screenResult.interactions.map((interaction, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border text-xs space-y-2 ${
                          (interaction.severity === 'CRITICAL' || interaction.severity === 'MAJOR') ? 'bg-rose-50/50 border-rose-200' :
                          interaction.severity === 'MODERATE' ? 'bg-amber-50/50 border-amber-200' :
                          'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900">
                              {(interaction.drugsInvolved || []).join(' ↔ ')}
                            </span>
                          </div>

                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            (interaction.severity === 'CRITICAL' || interaction.severity === 'MAJOR') ? 'bg-rose-600 text-white' :
                            interaction.severity === 'MODERATE' ? 'bg-amber-500 text-white' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {interaction.severity} severity
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Mechanism & Clinical Effect:</span>
                          <p className="text-slate-800 font-medium mt-0.5">{interaction.clinicalEffect || interaction.mechanism}</p>
                        </div>

                        <div className="p-2.5 bg-white rounded-lg border border-slate-200/80">
                          <span className="text-teal-800 font-bold block text-[10px] uppercase tracking-wider">Pharmacist Action & Recommendation:</span>
                          <p className="text-slate-700 mt-0.5">{interaction.actionRecommendation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Special Considerations: Geriatric, Renal, Counseling */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Disease / Allergy Precautions */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-2 text-xs">
                  <h5 className="font-bold text-slate-900 flex items-center gap-1.5 text-teal-800">
                    <HeartPulse className="w-3.5 h-3.5" />
                    <span>Precautions & Allergy Alerts</span>
                  </h5>
                  <div className="text-slate-600 leading-relaxed space-y-1">
                    {screenResult.allergyAlerts?.map((a, i) => (
                      <div key={i} className="text-rose-700 font-medium">• {a.allergen}: {a.notes}</div>
                    ))}
                    {screenResult.diseasePrecautions?.map((d, i) => (
                      <div key={i}>• {d.condition}: {d.risk}</div>
                    ))}
                    {(!screenResult.allergyAlerts?.length && !screenResult.diseasePrecautions?.length) && (
                      <p>No specific disease or allergy contraindications detected.</p>
                    )}
                  </div>
                </div>

                {/* Patient Consultation Points */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-2 text-xs">
                  <h5 className="font-bold text-slate-900 flex items-center gap-1.5 text-teal-800">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Pharmacist Counseling Points</span>
                  </h5>
                  <div className="text-slate-600 leading-relaxed space-y-1">
                    {screenResult.pharmacistCounselingPoints?.map((pt, i) => (
                      <div key={i}>• {pt}</div>
                    )) || <p>Advise patient to take doses at consistent daily intervals.</p>}
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
