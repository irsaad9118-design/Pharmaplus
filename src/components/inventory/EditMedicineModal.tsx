import React, { useState } from 'react';
import { MedicationInventory } from '../../types/pharmacy';
import { X, Pencil, MapPin, Check, DollarSign, Package } from 'lucide-react';

interface EditMedicineModalProps {
  isOpen: boolean;
  medicine: MedicationInventory | null;
  onClose: () => void;
  onSave: (medicineId: string, updates: Partial<MedicationInventory>) => void;
}

export const EditMedicineModal: React.FC<EditMedicineModalProps> = ({
  isOpen,
  medicine,
  onClose,
  onSave
}) => {
  if (!isOpen || !medicine) return null;

  const [brandName, setBrandName] = useState(medicine.brandName || '');
  const [saltComposition, setSaltComposition] = useState(medicine.saltComposition || medicine.genericName || '');
  const [rackNumber, setRackNumber] = useState(medicine.rackNumber || 'Rack A');
  const [shelfRow, setShelfRow] = useState(medicine.shelfRow || 'Shelf 1');
  const [boxBin, setBoxBin] = useState(medicine.boxBin || 'Bin 01');
  const [mrp, setMrp] = useState<number | string>(medicine.mrp ?? 0);
  const [unit, setUnit] = useState(medicine.unit || 'Strips (10 tabs)');
  const [customUnit, setCustomUnit] = useState('');

  const isCustomUnit = ![
    'Strips (10 tabs)',
    'Strips (15 tabs)',
    'Bottle (100ml)',
    'Bottle (200ml)',
    'Tube (30g)',
    'Vial (10ml)',
    'Capsules',
    'Units'
  ].includes(unit);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) return;

    const shelfClean = shelfRow.replace(/[^0-9]/g, '') || '1';
    const formattedLocation = `${rackNumber}-${shelfClean} • ${boxBin}`;
    const finalUnit = (isCustomUnit && customUnit.trim()) ? customUnit.trim() : unit;
    const finalMrp = Math.max(0, Number(mrp) || 0);

    onSave(medicine.id, {
      brandName: brandName.trim(),
      saltComposition: saltComposition.trim() || brandName.trim(),
      genericName: saltComposition.trim() || brandName.trim(),
      rackNumber: rackNumber.trim(),
      shelfRow: shelfRow.trim(),
      boxBin: boxBin.trim(),
      locationShelf: formattedLocation,
      mrp: finalMrp,
      sellingPrice: finalMrp,
      unit: finalUnit
    });

    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-medicine-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 id="edit-medicine-title" className="text-base font-bold text-slate-900 dark:text-white">
                Edit Medicine Details
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update name, salt, rack location, MRP, and unit packaging.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Medicine Name */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Medicine Name (Brand) *
            </label>
            <input
              type="text"
              required
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. Lipitor, Augmentin 625"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-semibold"
            />
          </div>

          {/* Generic / Salt */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Generic / Salt Composition *
            </label>
            <input
              type="text"
              required
              value={saltComposition}
              onChange={(e) => setSaltComposition(e.target.value)}
              placeholder="e.g. Atorvastatin Calcium 40mg, Amoxicillin + Clavulanic Acid"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-mono"
            />
          </div>

          {/* Rack & Bin Location */}
          <div className="p-3.5 bg-teal-50/70 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800/80 space-y-2.5">
            <span className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5 text-xs">
              <MapPin className="w-3.5 h-3.5 text-teal-600" />
              Physical Rack & Bin Location Coordinates
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                  Rack:
                </label>
                <select
                  value={rackNumber}
                  onChange={(e) => setRackNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value="Rack A">Rack A</option>
                  <option value="Rack B">Rack B</option>
                  <option value="Rack C">Rack C</option>
                  <option value="Rack D">Rack D</option>
                  <option value="Rack E">Rack E</option>
                  <option value="Rack F">Rack F</option>
                  <option value="Cold Unit 1">Cold Unit 1 (Fridge)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                  Shelf:
                </label>
                <input
                  type="text"
                  value={shelfRow}
                  onChange={(e) => setShelfRow(e.target.value)}
                  placeholder="Shelf 1"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                  Bin:
                </label>
                <input
                  type="text"
                  value={boxBin}
                  onChange={(e) => setBoxBin(e.target.value)}
                  placeholder="Bin 01"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>
            </div>
            <div className="text-[11px] text-teal-800 dark:text-teal-300 font-mono flex items-center justify-between">
              <span>Shelf Label:</span>
              <strong className="font-bold">
                {rackNumber}-{shelfRow.replace(/[^0-9]/g, '') || '1'} • {boxBin}
              </strong>
            </div>
          </div>

          {/* Pricing & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                MRP (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-mono font-bold">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  required
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unit / Packaging *
              </label>
              <select
                value={isCustomUnit ? 'custom' : unit}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setUnit('custom');
                  } else {
                    setUnit(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
              >
                <option value="Strips (10 tabs)">Strips (10 tabs)</option>
                <option value="Strips (15 tabs)">Strips (15 tabs)</option>
                <option value="Bottle (100ml)">Bottle (100ml)</option>
                <option value="Bottle (200ml)">Bottle (200ml)</option>
                <option value="Tube (30g)">Tube (30g)</option>
                <option value="Vial (10ml)">Vial (10ml)</option>
                <option value="Capsules">Capsules</option>
                <option value="Units">Units</option>
                <option value="custom">Custom Packaging...</option>
              </select>
            </div>
          </div>

          {isCustomUnit && (
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Specify Custom Unit
              </label>
              <input
                type="text"
                value={customUnit || (unit !== 'custom' ? unit : '')}
                onChange={(e) => setCustomUnit(e.target.value)}
                placeholder="e.g. Sachet (5g), Blister (6 tabs)"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          )}

          {/* Current Stock Preview */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-slate-500" />
              <span>Current In-Stock Quantity:</span>
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {medicine.stockQuantity} {medicine.unit} ({medicine.batches?.length || 1} Batch{medicine.batches?.length === 1 ? '' : 'es'})
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
