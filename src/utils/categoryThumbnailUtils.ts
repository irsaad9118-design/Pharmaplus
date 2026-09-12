// Lightweight static category visual utility
// 100% static, local, free-tier with zero external API calls or paid model dependencies

export interface CategoryArchetype {
  key: string;
  label: string;
  shortCode: string;
  description: string;
  defaultDosage: string;
  iconName: 'Heart' | 'Activity' | 'Shield' | 'Pill' | 'Wind' | 'Eye' | 'Syringe' | 'Droplet' | 'Stethoscope';
  bgClass: string;
  textClass: string;
  borderClass: string;
  accentColor: string;
}

export const CATEGORY_ARCHETYPES: Record<string, CategoryArchetype> = {
  cardiovascular: {
    key: 'cardiovascular',
    label: 'Cardio & Vascular',
    shortCode: 'CARDIO',
    description: 'Statins, antihypertensives, and cardiovascular regulators',
    defaultDosage: 'Tablet',
    iconName: 'Heart',
    bgClass: 'bg-rose-50 dark:bg-rose-950/50',
    textClass: 'text-rose-600 dark:text-rose-400',
    borderClass: 'border-rose-200 dark:border-rose-800/60',
    accentColor: '#e11d48',
  },
  antidiabetic: {
    key: 'antidiabetic',
    label: 'Diabetic Care',
    shortCode: 'DIAB',
    description: 'Metformin, GLP-1, insulins, and glucose regulators',
    defaultDosage: 'Tablet',
    iconName: 'Activity',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/50',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    borderClass: 'border-emerald-200 dark:border-emerald-800/60',
    accentColor: '#059669',
  },
  antibiotic: {
    key: 'antibiotic',
    label: 'Antibiotics',
    shortCode: 'ABX',
    description: 'Penicillins, cephalosporins, and broad-spectrum antimicrobials',
    defaultDosage: 'Capsule',
    iconName: 'Shield',
    bgClass: 'bg-blue-50 dark:bg-blue-950/50',
    textClass: 'text-blue-600 dark:text-blue-400',
    borderClass: 'border-blue-200 dark:border-blue-800/60',
    accentColor: '#2563eb',
  },
  gastrointestinal: {
    key: 'gastrointestinal',
    label: 'Gastro & Antacid',
    shortCode: 'GASTRO',
    description: 'Proton pump inhibitors, antacids, and digestive aids',
    defaultDosage: 'Capsule',
    iconName: 'Pill',
    bgClass: 'bg-amber-50 dark:bg-amber-950/50',
    textClass: 'text-amber-600 dark:text-amber-400',
    borderClass: 'border-amber-200 dark:border-amber-800/60',
    accentColor: '#d97706',
  },
  analgesic: {
    key: 'analgesic',
    label: 'Pain & Fever',
    shortCode: 'PAIN',
    description: 'Paracetamol, NSAIDs, and pain relief',
    defaultDosage: 'Tablet',
    iconName: 'Pill',
    bgClass: 'bg-purple-50 dark:bg-purple-950/50',
    textClass: 'text-purple-600 dark:text-purple-400',
    borderClass: 'border-purple-200 dark:border-purple-800/60',
    accentColor: '#9333ea',
  },
  respiratory: {
    key: 'respiratory',
    label: 'Respiratory & ENT',
    shortCode: 'RESP',
    description: 'Inhalers, bronchodilators, and allergy relief',
    defaultDosage: 'Inhaler',
    iconName: 'Wind',
    bgClass: 'bg-cyan-50 dark:bg-cyan-950/50',
    textClass: 'text-cyan-600 dark:text-cyan-400',
    borderClass: 'border-cyan-200 dark:border-cyan-800/60',
    accentColor: '#0891b2',
  },
  dermatology: {
    key: 'dermatology',
    label: 'Dermatology & Skin',
    shortCode: 'DERMA',
    description: 'Topical creams, ointments, and antifungal agents',
    defaultDosage: 'Ointment',
    iconName: 'Droplet',
    bgClass: 'bg-pink-50 dark:bg-pink-950/50',
    textClass: 'text-pink-600 dark:text-pink-400',
    borderClass: 'border-pink-200 dark:border-pink-800/60',
    accentColor: '#db2777',
  },
  ophthalmic: {
    key: 'ophthalmic',
    label: 'Eye & Ear Drops',
    shortCode: 'EYE',
    description: 'Ophthalmic lubricants, antibiotic eye drops, and otic solutions',
    defaultDosage: 'Eye Drops',
    iconName: 'Eye',
    bgClass: 'bg-teal-50 dark:bg-teal-950/50',
    textClass: 'text-teal-600 dark:text-teal-400',
    borderClass: 'border-teal-200 dark:border-teal-800/60',
    accentColor: '#0d9488',
  },
  injectable: {
    key: 'injectable',
    label: 'Injectables & Vials',
    shortCode: 'INJ',
    description: 'Sterile injections, infusion vials, and vaccines',
    defaultDosage: 'Injection',
    iconName: 'Syringe',
    bgClass: 'bg-indigo-50 dark:bg-indigo-950/50',
    textClass: 'text-indigo-600 dark:text-indigo-400',
    borderClass: 'border-indigo-200 dark:border-indigo-800/60',
    accentColor: '#4f46e5',
  },
  general: {
    key: 'general',
    label: 'General Healthcare',
    shortCode: 'RX',
    description: 'Standard OTC, multi-vitamins, and prescription medicines',
    defaultDosage: 'Tablet',
    iconName: 'Stethoscope',
    bgClass: 'bg-slate-100 dark:bg-slate-800',
    textClass: 'text-slate-700 dark:text-slate-300',
    borderClass: 'border-slate-200 dark:border-slate-700',
    accentColor: '#475569',
  }
};

/**
 * Normalizes a medication category & dosage form to an archetype
 */
export function getNormalizedCategory(categoryStr?: string, dosageForm?: string): CategoryArchetype {
  const cat = (categoryStr || '').toLowerCase();
  const dosage = (dosageForm || '').toLowerCase();

  if (cat.includes('cardio') || cat.includes('heart') || cat.includes('blood pressure') || cat.includes('hyper')) {
    return CATEGORY_ARCHETYPES.cardiovascular;
  }
  if (cat.includes('diab') || cat.includes('insulin') || cat.includes('glycem') || cat.includes('sugar')) {
    return CATEGORY_ARCHETYPES.antidiabetic;
  }
  if (cat.includes('bio') || cat.includes('infect') || cat.includes('fungal') || cat.includes('viral') || cat.includes('microb')) {
    return CATEGORY_ARCHETYPES.antibiotic;
  }
  if (cat.includes('gastro') || cat.includes('acid') || cat.includes('stomach') || cat.includes('ulcer') || cat.includes('reflux')) {
    return CATEGORY_ARCHETYPES.gastrointestinal;
  }
  if (cat.includes('pain') || cat.includes('analges') || cat.includes('anti-inflam') || cat.includes('fever') || cat.includes('ortho')) {
    return CATEGORY_ARCHETYPES.analgesic;
  }
  if (cat.includes('resp') || cat.includes('lung') || cat.includes('asthma') || cat.includes('cough') || cat.includes('cold') || dosage.includes('inhal')) {
    return CATEGORY_ARCHETYPES.respiratory;
  }
  if (cat.includes('derma') || cat.includes('skin') || dosage.includes('cream') || dosage.includes('ointment')) {
    return CATEGORY_ARCHETYPES.dermatology;
  }
  if (cat.includes('eye') || cat.includes('ophthal') || cat.includes('ear') || dosage.includes('drop')) {
    return CATEGORY_ARCHETYPES.ophthalmic;
  }
  if (cat.includes('inject') || dosage.includes('inject') || dosage.includes('vial') || dosage.includes('ampoul')) {
    return CATEGORY_ARCHETYPES.injectable;
  }

  return CATEGORY_ARCHETYPES.general;
}
