import React, { useState } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { X, UserPlus, Shield, HeartPulse, AlertTriangle, Phone, Mail, MapPin } from 'lucide-react';
import { Patient, PatientTag } from '../../types/pharmacy';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddPatientModal: React.FC<AddPatientModalProps> = ({ isOpen, onClose }) => {
  const { addPatient } = usePharmacy();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('1980-01-01');
  const [gender, setGender] = useState<Patient['gender']>('Female');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('BlueCross BlueShield Premier');
  const [policyNumber, setPolicyNumber] = useState('');
  const [groupNumber, setGroupNumber] = useState('GRP-1001');
  const [copayTier, setCopayTier] = useState<Patient['copayTier']>('Tier 1 ($5)');
  const [preferredContact, setPreferredContact] = useState<Patient['preferredContact']>('SMS');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRel, setEmergencyRel] = useState('Spouse');
  const [notes, setNotes] = useState('');
  
  // Dynamic tags, conditions, allergies
  const [selectedConditions, setSelectedConditions] = useState<string[]>(['Hypertension']);
  const [customCondition, setCustomCondition] = useState('');
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState('');
  const [selectedTags, setSelectedTags] = useState<PatientTag[]>(['VIP']);

  if (!isOpen) return null;

  const ALL_TAGS: PatientTag[] = ['Diabetic', 'Hypertension', 'Senior', 'High-Risk', 'Pediatric', 'Asthma', 'Cardio', 'MedSync Enrolled', 'VIP'];
  const COMMON_CONDITIONS = ['Type 2 Diabetes', 'Hypertension', 'Hyperlipidemia', 'Asthma', 'Atrial Fibrillation', 'Osteoarthritis', 'Depression / Anxiety', 'Heart Failure'];
  const COMMON_ALLERGIES = ['Penicillin', 'Sulfa Drugs', 'Aspirin / NSAIDs', 'Codeine', 'Latex', 'Morphine', 'Erythromycin'];

  const toggleTag = (tag: PatientTag) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const toggleCondition = (cond: string) => {
    setSelectedConditions(prev => prev.includes(cond) ? prev.filter(c => c !== cond) : [...prev, cond]);
  };

  const toggleAllergy = (allg: string) => {
    setSelectedAllergies(prev => prev.includes(allg) ? prev.filter(a => a !== allg) : [...prev, allg]);
  };

  const handleAddCustomCondition = () => {
    if (customCondition.trim() && !selectedConditions.includes(customCondition.trim())) {
      setSelectedConditions(prev => [...prev, customCondition.trim()]);
      setCustomCondition('');
    }
  };

  const handleAddCustomAllergy = () => {
    if (customAllergy.trim() && !selectedAllergies.includes(customAllergy.trim())) {
      setSelectedAllergies(prev => [...prev, customAllergy.trim()]);
      setCustomAllergy('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      alert('Please fill in First Name, Last Name, and Phone Number.');
      return;
    }

    addPatient({
      firstName,
      lastName,
      dob,
      gender,
      phone,
      email: email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@patientmail.com`,
      address: address || '123 Main St, Springfield, IL',
      insuranceProvider,
      policyNumber: policyNumber || `POL-${Math.floor(100000 + Math.random() * 900000)}`,
      groupNumber,
      copayTier,
      adherenceScore: 92,
      chronicConditions: selectedConditions,
      allergies: selectedAllergies,
      tags: selectedTags,
      loyaltyPoints: 100,
      preferredContact,
      emergencyContact: {
        name: emergencyName || 'Family Member',
        relationship: emergencyRel,
        phone: emergencyPhone || phone
      },
      doctorReference: 'Self / Direct Counter',
      chronicMedications: [],
      notes: notes || 'New patient intake completed. Consented to SMS notifications.',
      activePrescriptionsCount: 0,
      lastVisitDate: new Date().toISOString().split('T')[0]
    });

    onClose();
  };

  return (
    <div id="add-patient-modal-overlay" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">Register New Patient Profile</h3>
              <p className="text-xs text-slate-500">Create comprehensive clinical CRM record, insurance eligibility, and tags.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-5 mt-4 text-xs">
          
          {/* Demographics */}
          <div>
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 text-teal-700 flex items-center gap-1.5">
              <span>1. Demographics & Contact</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="e.g. Clara"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="e.g. Oswald"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Date of Birth *</label>
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="(555) 000-0000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Preferred Contact</label>
                <select
                  value={preferredContact}
                  onChange={e => setPreferredContact(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="SMS">SMS Text</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Phone Call">Phone Call</option>
                  <option value="Email">Email</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="patient@example.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Street Address & City</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="123 Maple Ave, Springfield, IL"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Insurance & Copay Tier */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 text-teal-700 flex items-center gap-1.5">
              <span>2. Insurance & Billing Coverage</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Insurance Provider</label>
                <select
                  value={insuranceProvider}
                  onChange={e => setInsuranceProvider(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="BlueCross BlueShield Premier">BlueCross BlueShield Premier</option>
                  <option value="Aetna Choice POS II">Aetna Choice POS II</option>
                  <option value="Medicare Part D (SilverScript)">Medicare Part D (SilverScript)</option>
                  <option value="UnitedHealthcare Choice Plus">UnitedHealthcare Choice Plus</option>
                  <option value="Cigna HealthSpring">Cigna HealthSpring</option>
                  <option value="Humana Gold Plus">Humana Gold Plus</option>
                  <option value="Cash / Self-Pay">Cash / Self-Pay</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Policy / Member ID</label>
                <input
                  type="text"
                  value={policyNumber}
                  onChange={e => setPolicyNumber(e.target.value)}
                  placeholder="e.g. BC-8829103"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Copay Tier</label>
                <select
                  value={copayTier}
                  onChange={e => setCopayTier(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="Tier 1 ($5)">Tier 1 ($5 Co-pay)</option>
                  <option value="Tier 2 ($15)">Tier 2 ($15 Co-pay)</option>
                  <option value="Tier 3 ($35)">Tier 3 ($35 Co-pay)</option>
                  <option value="Specialty ($75)">Specialty ($75 Co-pay)</option>
                  <option value="Commercial Standard">Commercial Standard (20% coinsurance)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Clinical Profile: Allergies & Chronic Conditions */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 text-teal-700 flex items-center gap-1.5">
              <span>3. Clinical Profile & Safety Checks</span>
            </h4>

            {/* Allergies */}
            <div className="mb-3">
              <label className="block text-slate-700 font-semibold mb-1.5 flex items-center gap-1 text-rose-700">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Known Drug Allergies (Critical for Dispense Screener)</span>
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {COMMON_ALLERGIES.map(allg => (
                  <button
                    key={allg}
                    type="button"
                    onClick={() => toggleAllergy(allg)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                      selectedAllergies.includes(allg)
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {selectedAllergies.includes(allg) ? `✕ ${allg}` : `+ ${allg}`}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customAllergy}
                  onChange={e => setCustomAllergy(e.target.value)}
                  placeholder="Add other allergen..."
                  className="px-3 py-1.5 border border-slate-200 rounded-lg flex-1"
                />
                <button
                  type="button"
                  onClick={handleAddCustomAllergy}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Chronic Conditions */}
            <div className="mb-3">
              <label className="block text-slate-700 font-semibold mb-1.5 flex items-center gap-1">
                <HeartPulse className="w-3.5 h-3.5 text-teal-600" />
                <span>Chronic Health Conditions</span>
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {COMMON_CONDITIONS.map(cond => (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => toggleCondition(cond)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                      selectedConditions.includes(cond)
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {selectedConditions.includes(cond) ? `✓ ${cond}` : `+ ${cond}`}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customCondition}
                  onChange={e => setCustomCondition(e.target.value)}
                  placeholder="Add other medical condition..."
                  className="px-3 py-1.5 border border-slate-200 rounded-lg flex-1"
                />
                <button
                  type="button"
                  onClick={handleAddCustomCondition}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Patient Cohort Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Pharmacist Clinical Notes & Preferences</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Prefers non-childproof caps, enrolled in MedSync on 1st of month."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          {/* Footer Submit Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
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
              <UserPlus className="w-4 h-4" />
              <span>Create Patient Chart</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
