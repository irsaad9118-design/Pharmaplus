import React from 'react';
import { X, Printer, Pill, AlertTriangle, ShieldCheck, Check } from 'lucide-react';
import { Prescription, Patient } from '../../types/pharmacy';

interface RxLabelPrintModalProps {
  rx: Prescription | null;
  patient?: Patient | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RxLabelPrintModal: React.FC<RxLabelPrintModalProps> = ({
  rx,
  patient,
  isOpen,
  onClose
}) => {
  if (!isOpen || !rx) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="rx-label-modal-overlay" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Pharmacy Medication Label Preview</h3>
              <p className="text-xs text-slate-500">USP & FDA standard container dispensing label</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Physical Label Container Preview */}
        <div className="my-5 p-5 bg-amber-50/50 border-2 border-amber-300/80 rounded-2xl shadow-sm text-slate-900 font-sans space-y-3 print:border-black print:bg-white print:m-0 print:p-2">
          
          {/* Pharmacy Info Banner */}
          <div className="flex items-center justify-between border-b border-slate-300 pb-2">
            <div>
              <h4 className="font-extrabold text-sm tracking-tight text-teal-950 uppercase">PharmPulse Pharmacy #104</h4>
              <p className="text-[10px] text-slate-600">740 Health Boulevard, Springfield, IL • Tel: (555) 019-2834</p>
            </div>
            <div className="text-right text-[10px] font-mono">
              <span className="font-bold text-slate-800 text-xs">{rx.rxNumber}</span>
              <p className="text-slate-500">Date: {rx.dateDispensed || rx.dateWritten}</p>
            </div>
          </div>

          {/* Patient & Doctor */}
          <div className="flex items-start justify-between text-xs pt-1">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Patient Name:</span>
              <span className="font-extrabold text-sm text-slate-950 uppercase">{rx.patientName}</span>
              {patient?.dob && <span className="text-[10px] text-slate-600 block">DOB: {patient.dob}</span>}
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Prescriber:</span>
              <span className="font-bold text-slate-900">{rx.prescriberName}</span>
              <span className="text-[10px] text-slate-500 block">NPI: {rx.prescriberNpi}</span>
            </div>
          </div>

          {/* Sig Directions */}
          <div className="bg-white p-3 rounded-xl border border-amber-200/90 text-xs shadow-inner">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Directions for use:</span>
            <p className="font-bold text-slate-950 text-sm leading-relaxed">
              {rx.sig}
            </p>
          </div>

          {/* Drug Details */}
          <div className="flex items-center justify-between text-xs pt-1">
            <div>
              <span className="font-extrabold text-sm text-slate-900">{rx.medicationName} {rx.strength}</span>
              <span className="text-[11px] text-slate-600 block italic">{rx.genericName}</span>
            </div>
            <div className="text-right font-medium text-xs">
              <span>Qty: <strong className="text-slate-950">{rx.quantity} {rx.form}s</strong></span>
              <p className="text-[10px] text-slate-500">Days Supply: {rx.daysSupply}</p>
            </div>
          </div>

          {/* Refills & Expiry */}
          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200 font-semibold text-slate-700">
            <span>Refills Remaining: <strong className="text-teal-800">{rx.refillsRemaining} of {rx.refillsTotal}</strong></span>
            <span>Discard After: <strong className="text-slate-900">{rx.expirationDate}</strong></span>
          </div>

          {/* Auxiliary Warning Stickers */}
          <div className="space-y-1 pt-1">
            <div className="p-2 bg-amber-200/80 border border-amber-400 rounded-lg text-[10px] font-bold text-amber-950 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>CAUTION: Federal law prohibits the transfer of this drug to any person other than the patient.</span>
            </div>

            {rx.warnings?.map((w, idx) => (
              <div key={idx} className="p-1.5 bg-blue-100 border border-blue-300 rounded-lg text-[10px] font-semibold text-blue-950 flex items-center gap-1.5">
                <Check className="w-3 h-3 text-blue-700 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>

          {/* Mock Barcode */}
          <div className="pt-2 text-center">
            <div className="h-9 w-64 mx-auto bg-slate-900 rounded-sm flex items-center justify-around px-2">
              <div className="h-full w-1 bg-white"></div>
              <div className="h-full w-2 bg-white"></div>
              <div className="h-full w-0.5 bg-white"></div>
              <div className="h-full w-1.5 bg-white"></div>
              <div className="h-full w-3 bg-white"></div>
              <div className="h-full w-1 bg-white"></div>
              <div className="h-full w-0.5 bg-white"></div>
              <div className="h-full w-2 bg-white"></div>
              <div className="h-full w-1.5 bg-white"></div>
            </div>
            <span className="font-mono text-[10px] text-slate-500 tracking-widest block mt-0.5">{rx.barcode || '03681800517019'}</span>
          </div>

        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Label</span>
          </button>
        </div>

      </div>
    </div>
  );
};
