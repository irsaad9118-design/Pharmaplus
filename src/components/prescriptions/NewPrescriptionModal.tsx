import React, { useState } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { X, PlusCircle, Sparkles, FileText, Stethoscope, User, AlertCircle, Check } from 'lucide-react';
import { Patient, Prescriber, Prescription, RxStatus } from '../../types/pharmacy';

interface NewPrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedPatient?: Patient | null;
}

export const NewPrescriptionModal: React.FC<NewPrescriptionModalProps> = ({
  isOpen,
  onClose,
  preselectedPatient
}) => {
  const { 
    patients, 
    prescribers, 
    inventory, 
    addPrescription, 
    parseSigInstructions,
    addToast 
  } = usePharmacy();

  const [selectedPatientId, setSelectedPatientId] = useState<string>(preselectedPatient?.id || patients[0]?.id || '');
  const [selectedPrescriberId, setSelectedPrescriberId] = useState<string>(prescribers[0]?.id || '');
  const [medicationName, setMedicationName] = useState<string>('Lisinopril');
  const [genericName, setGenericName] = useState<string>('Lisinopril USP');
  const [strength, setStrength] = useState<string>('20 mg');
  const [form, setForm] = useState<Prescription['form']>('Tablet');
  const [ndc, setNdc] = useState<string>('68180-0517-01');
  const [quantity, setQuantity] = useState<number>(30);
  const [daysSupply, setDaysSupply] = useState<number>(30);
  const [refillsTotal, setRefillsTotal] = useState<number>(3);
  const [sig, setSig] = useState<string>('Take 1 tablet by mouth once daily in the morning');
  const [copayAmount, setCopayAmount] = useState<number>(5.00);
  const [retailPrice, setRetailPrice] = useState<number>(35.00);
  const [status, setStatus] = useState<RxStatus>('pending_review');
  const [pharmacistNotes, setPharmacistNotes] = useState<string>('New e-Prescription received for verification.');

  // AI Sig Parser helper state
  const [rawSigInput, setRawSigInput] = useState<string>('');
  const [isParsingSig, setIsParsingSig] = useState<boolean>(false);
  const [aiSigSuggestions, setAiSigSuggestions] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleSelectMedication = (brandName: string) => {
    const matched = inventory.find(i => i.brandName === brandName);
    if (matched) {
      setMedicationName(matched.brandName);
      setGenericName(matched.genericName);
      setStrength(matched.strength);
      setNdc(matched.ndc);
      setForm((matched.dosageForm.includes('Inhaler') ? 'Inhaler' : matched.dosageForm.includes('Injection') ? 'Injection' : 'Tablet') as any);
      setRetailPrice(matched.sellingPrice * 30);
    } else {
      setMedicationName(brandName);
    }
  };

  const handleParseSigWithAi = async () => {
    if (!rawSigInput.trim()) return;
    setIsParsingSig(true);
    try {
      const parsed = await parseSigInstructions(rawSigInput, medicationName);
      if (parsed) {
        setAiSigSuggestions(parsed);
        if (parsed.standardSig) setSig(parsed.standardSig);
        if (parsed.recommendedQuantity) setQuantity(parsed.recommendedQuantity);
        if (parsed.durationDays) setDaysSupply(parsed.durationDays);
        addToast({
          type: 'success',
          title: 'AI Sig Decoded',
          message: `Standardized instructions applied: "${parsed.standardSig}"`
        });
      }
    } finally {
      setIsParsingSig(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.id === selectedPatientId);
    const prescriber = prescribers.find(d => d.id === selectedPrescriberId);

    if (!patient || !prescriber) {
      alert('Please select both a patient and prescriber.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const expDate = new Date();
    expDate.setFullYear(expDate.getFullYear() + 1);

    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + Number(daysSupply));

    addPrescription({
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientDob: patient.dob,
      prescriberId: prescriber.id,
      prescriberName: prescriber.name,
      prescriberNpi: prescriber.npi,
      prescriberClinic: prescriber.clinicName,
      medicationName,
      genericName: genericName || medicationName,
      ndc: ndc || '00000-0000-00',
      strength,
      form,
      quantity: Number(quantity),
      daysSupply: Number(daysSupply),
      refillsTotal: Number(refillsTotal),
      refillsRemaining: Number(refillsTotal),
      sig,
      dateWritten: today,
      expirationDate: expDate.toISOString().split('T')[0],
      status,
      insuranceStatus: 'approved',
      copayAmount: Number(copayAmount),
      retailPrice: Number(retailPrice),
      barcode: '03' + Math.floor(10000000000 + Math.random() * 90000000000),
      pharmacistNotes,
      warnings: aiSigSuggestions?.clinicalPrecautions || ['Take consistently with water'],
      nextRefillDueDate: nextDueDate.toISOString().split('T')[0]
    });

    onClose();
  };

  return (
    <div id="new-prescription-modal-overlay" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 my-6 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">Intake New Prescription (e-Rx / Order)</h3>
              <p className="text-xs text-slate-500">Enter prescription specifications, Sig directions, and insurance co-pay details.</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 text-xs pr-1">
          
          {/* Patient & Prescriber Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-teal-600" />
                <span>Patient Record *</span>
              </label>
              <select
                required
                value={selectedPatientId}
                onChange={e => setSelectedPatientId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} ({p.mrn}) - DOB: {p.dob}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                <span>Prescribing Physician *</span>
              </label>
              <select
                required
                value={selectedPrescriberId}
                onChange={e => setSelectedPrescriberId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                {prescribers.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.specialty}) - NPI: {d.npi}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Medication Selection */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 text-teal-700">
              Medication & Dosage Parameters
            </h4>

            {/* Quick formulary selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 text-[11px] scrollbar-none">
              <span className="text-slate-400 font-medium shrink-0">Quick Formulary:</span>
              {inventory.slice(0, 6).map(inv => (
                <button
                  key={inv.id}
                  type="button"
                  onClick={() => handleSelectMedication(inv.brandName)}
                  className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-colors ${
                    medicationName === inv.brandName ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {inv.brandName} {inv.strength}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Medication Brand Name *</label>
                <input
                  type="text"
                  required
                  value={medicationName}
                  onChange={e => setMedicationName(e.target.value)}
                  placeholder="e.g. Lipitor"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Generic Name</label>
                <input
                  type="text"
                  value={genericName}
                  onChange={e => setGenericName(e.target.value)}
                  placeholder="e.g. Atorvastatin Calcium"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Strength</label>
                <input
                  type="text"
                  value={strength}
                  onChange={e => setStrength(e.target.value)}
                  placeholder="e.g. 20 mg"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Dosage Form</label>
                <select
                  value={form}
                  onChange={e => setForm(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Oral Solution">Oral Solution</option>
                  <option value="Inhaler">Inhaler</option>
                  <option value="Injection">Injection</option>
                  <option value="Topical Cream">Topical Cream</option>
                  <option value="Ophthalmic Drops">Ophthalmic Drops</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">NDC Code</label>
                <input
                  type="text"
                  value={ndc}
                  onChange={e => setNdc(e.target.value)}
                  placeholder="68180-0517-01"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Initial Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="pending_review">Pending Pharmacist Verification</option>
                  <option value="clinical_check">Clinical Safety Hold</option>
                  <option value="ready_for_pickup">Ready for Pickup</option>
                </select>
              </div>
            </div>
          </div>

          {/* AI Sig Assistant */}
          <div className="pt-2 border-t border-slate-100 bg-teal-50/60 p-3.5 rounded-2xl border border-teal-200/60 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-teal-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>AI Sig Parser & Latin Abbreviation Translator</span>
              </label>
              <span className="text-[10px] text-teal-700 font-medium">Gemini 3.7 Flash</span>
            </div>

            <p className="text-[11px] text-teal-800">
              Type physician shorthand (e.g. <code className="bg-white px-1.5 py-0.5 rounded font-mono text-teal-950 font-bold">1 tab PO BID pc x30d</code>) to automatically generate standard English label directions and calculate days supply.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={rawSigInput}
                onChange={e => setRawSigInput(e.target.value)}
                placeholder="e.g. 1 tab PO QHS x90d or 2 puffs Q4-6H PRN wheezing"
                className="flex-1 px-3 py-1.5 bg-white border border-teal-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
              <button
                type="button"
                onClick={handleParseSigWithAi}
                disabled={isParsingSig || !rawSigInput.trim()}
                className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center gap-1 transition-colors shrink-0"
              >
                {isParsingSig ? 'Parsing...' : 'Decode Sig'}
              </button>
            </div>
          </div>

          {/* Sig & Dispensing Quantities */}
          <div className="space-y-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Standardized Label Instructions (Sig) *</label>
              <textarea
                rows={2}
                required
                value={sig}
                onChange={e => setSig(e.target.value)}
                placeholder="Take 1 tablet by mouth once daily with meals..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Quantity Dispensed</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Days Supply</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={daysSupply}
                  onChange={e => setDaysSupply(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Refills Authorized</label>
                <input
                  type="number"
                  min="0"
                  max="11"
                  required
                  value={refillsTotal}
                  onChange={e => setRefillsTotal(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Patient Copay (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={copayAmount}
                  onChange={e => setCopayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold text-teal-800"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Pharmacist Verification Note</label>
            <input
              type="text"
              value={pharmacistNotes}
              onChange={e => setPharmacistNotes(e.target.value)}
              placeholder="e.g. Clarified dosage with Dr. Jenkins via telephone."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold shadow-md shadow-teal-600/20 transition-all flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit & Place in Dispensing Queue</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
