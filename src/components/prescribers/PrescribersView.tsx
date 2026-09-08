import React, { useState } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  Stethoscope, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  PlusCircle, 
  ShieldCheck,
  Building2
} from 'lucide-react';
import { Prescriber, Patient } from '../../types/pharmacy';

interface PrescribersViewProps {
  onOpenNewRxWithPrescriber?: (prescriber: Prescriber) => void;
}

export const PrescribersView: React.FC<PrescribersViewProps> = () => {
  const { prescribers, prescriptions, searchQuery } = usePharmacy();
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');

  const specialties = ['all', 'Family Medicine', 'Cardiology', 'Endocrinology', 'Internal Medicine', 'Pulmonology'];

  const filteredPrescribers = prescribers.filter(doc => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      doc.name.toLowerCase().includes(q) ||
      doc.npi.includes(q) ||
      doc.specialty.toLowerCase().includes(q) ||
      doc.clinicName.toLowerCase().includes(q);

    const matchesSpecialty = selectedSpecialty === 'all' || doc.specialty === selectedSpecialty;

    return matchesSearch && matchesSpecialty;
  });

  return (
    <div id="prescribers-view" className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-teal-600" />
              <span>Prescriber & Physician Directory</span>
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-full">
              {filteredPrescribers.length} Providers
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Verified NPI numbers, DEA registration statuses, clinic contact numbers, and prescription history.
          </p>
        </div>
      </div>

      {/* Specialty Filter */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm flex items-center gap-1.5 overflow-x-auto text-xs scrollbar-none">
        {specialties.map(spec => (
          <button
            key={spec}
            onClick={() => setSelectedSpecialty(spec)}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 ${
              selectedSpecialty === spec
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {spec === 'all' ? 'All Specialties' : spec}
          </button>
        ))}
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredPrescribers.map(doc => {
          const docRxs = prescriptions.filter(p => p.prescriberId === doc.id);

          return (
            <div
              key={doc.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm shrink-0">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900">{doc.name}</h3>
                      <p className="text-xs text-teal-700 font-semibold">{doc.specialty}</p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-full">
                    DEA Active
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-800">{doc.clinicName}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-500">{doc.address}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-700 font-medium">{doc.phone} (Fax: {doc.fax})</span>
                  </div>
                </div>

                {/* Identification */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block font-mono">NPI NUMBER</span>
                    <span className="font-mono font-bold text-slate-800">{doc.npi}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-mono">DEA NUMBER</span>
                    <span className="font-mono font-bold text-slate-800">{doc.deaNumber}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  {docRxs.length} Prescriptions On File
                </span>
                <span className="text-teal-700 font-semibold">
                  Verified In Network
                </span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
