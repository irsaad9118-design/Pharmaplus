import { CategoryThumbnailInfo } from '../types/pharmacy';

export interface CategoryArchetype {
  key: string;
  label: string;
  shortCode: string;
  description: string;
  defaultDosage: string;
  bgGradient: [string, string];
  accentColor: string;
  textColor: string;
  iconType: 'heart_ecg' | 'glucose_drop' | 'shield_pill' | 'stomach_capsule' | 'lightning_tablet' | 'lungs_breath' | 'tube_cream' | 'eyedropper' | 'syringe_vial' | 'bottle_rx';
  imagenPrompt: string;
}

export const CATEGORY_ARCHETYPES: Record<string, CategoryArchetype> = {
  cardiovascular: {
    key: 'cardiovascular',
    label: 'Cardio & Vascular',
    shortCode: 'CARDIO',
    description: 'Statins, antihypertensives, beta-blockers, and cardiovascular regulators',
    defaultDosage: 'Tablet',
    bgGradient: ['#FFF1F2', '#FFE4E6'],
    accentColor: '#E11D48',
    textColor: '#9F1239',
    iconType: 'heart_ecg',
    imagenPrompt: 'Professional commercial studio product photography of cardiovascular heart medication, crisp red and white blister pack with silver foil backing and clinical white statin tablets, soft studio lighting on clean sterile white background, macro lens focus, 1:1 square'
  },
  antidiabetic: {
    key: 'antidiabetic',
    label: 'Diabetic & Glycemic Care',
    shortCode: 'DIAB',
    description: 'Metformin, GLP-1, DPP-4 inhibitors, insulins, and glucose regulators',
    defaultDosage: 'Tablet',
    bgGradient: ['#F0FDF4', '#DCFCE7'],
    accentColor: '#16A34A',
    textColor: '#166534',
    iconType: 'glucose_drop',
    imagenPrompt: 'Commercial pharmaceutical catalog photo of diabetes care medicine, sleek metformin tablets and blister strip alongside subtle modern insulin pen on pristine clinical surface, soft diffused shadows, high detail commercial lighting, 1:1 square'
  },
  antibiotic: {
    key: 'antibiotic',
    label: 'Antibiotics & Antimicrobials',
    shortCode: 'ABX',
    description: 'Penicillins, cephalosporins, macrolides, and broad-spectrum agents',
    defaultDosage: 'Capsule',
    bgGradient: ['#EFF6FF', '#DBEAFE'],
    accentColor: '#2563EB',
    textColor: '#1E40AF',
    iconType: 'shield_pill',
    imagenPrompt: 'Studio macro photograph of pharmaceutical antibiotic medicine, dual-tone blue and white capsule pills resting on modern metallic blister foil packaging, sterile laboratory background, sharp focus, clean commercial aesthetic, 1:1 square'
  },
  gastrointestinal: {
    key: 'gastrointestinal',
    label: 'Gastro & Acid Reflux',
    shortCode: 'GASTRO',
    description: 'Proton pump inhibitors, antacids, antiemetics, and digestive aids',
    defaultDosage: 'Capsule',
    bgGradient: ['#FFFBEB', '#FEF3C7'],
    accentColor: '#D97706',
    textColor: '#92400E',
    iconType: 'stomach_capsule',
    imagenPrompt: 'Clean commercial product photograph of gastrointestinal PPI stomach medication, golden yellow and white delayed-release capsules with aluminium blister pack on smooth white table, premium pharmaceutical photography, 1:1 square'
  },
  analgesic: {
    key: 'analgesic',
    label: 'Pain Relief & Antipyretic',
    shortCode: 'PAIN',
    description: 'Paracetamol, NSAIDs, analgesics, muscle relaxants, and antipyretics',
    defaultDosage: 'Tablet',
    bgGradient: ['#FAF5FF', '#F3E8FF'],
    accentColor: '#9333EA',
    textColor: '#6B21A8',
    iconType: 'lightning_tablet',
    imagenPrompt: 'High quality studio photograph of pharmaceutical pain relief analgesic tablets, circular scored white medical pills beside a clean holographic blister strip on sterile reflective white surface, bright modern clinical lighting, 1:1 square'
  },
  respiratory: {
    key: 'respiratory',
    label: 'Respiratory & Pulmo',
    shortCode: 'RESP',
    description: 'Bronchodilators, inhalers, antiallergics, cough syrups, and decongestants',
    defaultDosage: 'Inhaler / Syrup',
    bgGradient: ['#F0FDFA', '#CCFBF1'],
    accentColor: '#0D9488',
    textColor: '#115E59',
    iconType: 'lungs_breath',
    imagenPrompt: 'Commercial medical product photograph of respiratory asthma medication, sleek modern clinical inhaler canister alongside blister pack of bronchodilator tablets, clean airy studio lighting on white surface, 1:1 square'
  },
  topical: {
    key: 'topical',
    label: 'Dermatology & Ointments',
    shortCode: 'DERMA',
    description: 'Antifungal creams, steroid ointments, antibacterial gels, and lotions',
    defaultDosage: 'Tube / Cream',
    bgGradient: ['#FDF2F8', '#FCE7F3'],
    accentColor: '#DB2777',
    textColor: '#9D174D',
    iconType: 'tube_cream',
    imagenPrompt: 'Professional studio product photograph of pharmaceutical dermatological ointment tube, clean white aluminium pharmaceutical squeeze tube with soft shadow on minimalist white clinical background, premium medical packaging, 1:1 square'
  },
  ophthalmic: {
    key: 'ophthalmic',
    label: 'Eye & ENT Drops',
    shortCode: 'ENT',
    description: 'Ophthalmic drops, ear drops, nasal sprays, and saline solutions',
    defaultDosage: 'Drops / Solution',
    bgGradient: ['#ECFEFF', '#CFFAFE'],
    accentColor: '#0891B2',
    textColor: '#155E75',
    iconType: 'eyedropper',
    imagenPrompt: 'Studio commercial photography of pharmaceutical eye drops and nasal solution, sterile plastic dropper bottle with clear medicine droplet on clean clinical surface, bright softbox lighting, 1:1 square'
  },
  injectable: {
    key: 'injectable',
    label: 'Injections & Critical Care',
    shortCode: 'INJ',
    description: 'Ampoules, prefilled syringes, sterile vials, and IV solutions',
    defaultDosage: 'Vial / Ampoule',
    bgGradient: ['#F8FAFC', '#F1F5F9'],
    accentColor: '#475569',
    textColor: '#334155',
    iconType: 'syringe_vial',
    imagenPrompt: 'Studio macro product photography of sterile pharmaceutical glass medicine vial with flip-off aluminium seal and ampoule, pristine clinical setting, clean reflections, crystal clear medical glass, 1:1 square'
  },
  general: {
    key: 'general',
    label: 'General Medicine & Rx',
    shortCode: 'GEN',
    description: 'Vitamins, supplements, nutraceuticals, and multi-specialty therapeutics',
    defaultDosage: 'Tablet',
    bgGradient: ['#F0FDF4', '#E0F2FE'],
    accentColor: '#059669',
    textColor: '#065F46',
    iconType: 'bottle_rx',
    imagenPrompt: 'Professional commercial photography of prescription pharmaceutical medicine, clean white medicine dispenser bottle and foil blister strip on smooth white surface, pristine hospital pharmacy lighting, 1:1 square'
  }
};

/**
 * Normalizes any pharmacy category or dosage form into a standardized CategoryArchetype
 */
export function getNormalizedCategory(categoryStr: string = '', dosageForm: string = ''): CategoryArchetype {
  const norm = (categoryStr + ' ' + dosageForm).toLowerCase();

  if (
    norm.includes('cardio') || 
    norm.includes('statin') || 
    norm.includes('hypertens') || 
    norm.includes('ace inhibitor') || 
    norm.includes('beta-blocker') || 
    norm.includes('calcium channel') ||
    norm.includes('blood pressure') ||
    norm.includes('bp')
  ) {
    return CATEGORY_ARCHETYPES.cardiovascular;
  }

  if (
    norm.includes('diabet') || 
    norm.includes('insulin') || 
    norm.includes('metformin') || 
    norm.includes('glp') || 
    norm.includes('biguanide') || 
    norm.includes('dpp-4') || 
    norm.includes('sglt') || 
    norm.includes('glucose')
  ) {
    return CATEGORY_ARCHETYPES.antidiabetic;
  }

  if (
    norm.includes('antibiotic') || 
    norm.includes('antibacterial') || 
    norm.includes('penicillin') || 
    norm.includes('amoxicillin') || 
    norm.includes('azithromycin') || 
    norm.includes('cephalosporin') || 
    norm.includes('antimicrobial') || 
    norm.includes('clavulanate') ||
    norm.includes('bacterial')
  ) {
    return CATEGORY_ARCHETYPES.antibiotic;
  }

  if (
    norm.includes('gastro') || 
    norm.includes('proton pump') || 
    norm.includes('ppi') || 
    norm.includes('antacid') || 
    norm.includes('omeprazole') || 
    norm.includes('pantoprazole') || 
    norm.includes('rabeprazole') || 
    norm.includes('digestive') || 
    norm.includes('ulcer')
  ) {
    return CATEGORY_ARCHETYPES.gastrointestinal;
  }

  if (
    norm.includes('analgesic') || 
    norm.includes('pain') || 
    norm.includes('antipyretic') || 
    norm.includes('paracetamol') || 
    norm.includes('nsaid') || 
    norm.includes('ibuprofen') || 
    norm.includes('aceclofenac') || 
    norm.includes('diclofenac')
  ) {
    return CATEGORY_ARCHETYPES.analgesic;
  }

  if (
    norm.includes('respirat') || 
    norm.includes('bronchodilator') || 
    norm.includes('inhaler') || 
    norm.includes('asthma') || 
    norm.includes('salbutamol') || 
    norm.includes('cough') || 
    norm.includes('pulmo') ||
    norm.includes('allergy') ||
    norm.includes('cetirizine')
  ) {
    return CATEGORY_ARCHETYPES.respiratory;
  }

  if (
    norm.includes('ointment') || 
    norm.includes('cream') || 
    norm.includes('topical') || 
    norm.includes('gel') || 
    norm.includes('derma') || 
    norm.includes('skin') || 
    norm.includes('lotion')
  ) {
    return CATEGORY_ARCHETYPES.topical;
  }

  if (
    norm.includes('eye') || 
    norm.includes('drop') || 
    norm.includes('ear') || 
    norm.includes('nasal') || 
    norm.includes('ophthalmic') || 
    norm.includes('ent')
  ) {
    return CATEGORY_ARCHETYPES.ophthalmic;
  }

  if (
    norm.includes('injection') || 
    norm.includes('vial') || 
    norm.includes('ampoule') || 
    norm.includes('infusion') || 
    norm.includes('iv ')
  ) {
    return CATEGORY_ARCHETYPES.injectable;
  }

  return CATEGORY_ARCHETYPES.general;
}

/**
 * Builds the Imagen API prompt for a category and optional dosage form
 */
export function buildImagenPromptForCategory(categoryStr: string, dosageForm?: string): string {
  const archetype = getNormalizedCategory(categoryStr, dosageForm);
  const dosage = dosageForm || archetype.defaultDosage;
  return `Professional commercial studio product photography of pharmaceutical ${archetype.label} medication (${dosage} form), pristine white clinical background, clean aluminium foil blister pack with medicinal pills, soft studio shadows, 4k sharp commercial pharmacy catalog image, 1:1 square aspect ratio`;
}

/**
 * Generates an SVG Data URI for clinical vector category placeholders
 */
export function generateClinicalCategorySvg(categoryStr: string, dosageForm?: string): string {
  const arch = getNormalizedCategory(categoryStr, dosageForm);
  const [bgStart, bgEnd] = arch.bgGradient;
  const accent = arch.accentColor;
  const textCol = arch.textColor;

  let iconSvg = '';

  switch (arch.iconType) {
    case 'heart_ecg':
      iconSvg = `
        <path d="M40 58 C25 40 10 60 25 80 L50 105 L75 80 C90 60 75 40 60 58 L50 70 Z" fill="${accent}" opacity="0.18" />
        <path d="M15 75 L32 75 L38 60 L46 90 L54 65 L60 80 L66 75 L85 75" fill="none" stroke="${accent}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
        <rect x="42" y="24" width="16" height="24" rx="8" fill="${accent}" transform="rotate(35 50 36)" opacity="0.9"/>
      `;
      break;
    case 'glucose_drop':
      iconSvg = `
        <path d="M50 20 C50 20 28 50 28 72 C28 86 38 96 50 96 C62 96 72 86 72 72 C72 50 50 20 50 20 Z" fill="${accent}" opacity="0.22" />
        <circle cx="50" cy="74" r="14" fill="${accent}" />
        <path d="M45 74 L55 74 M50 69 L50 79" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
        <rect x="22" y="32" width="22" height="10" rx="5" fill="${accent}" transform="rotate(-25 33 37)" opacity="0.85"/>
      `;
      break;
    case 'shield_pill':
      iconSvg = `
        <path d="M50 18 L76 28 C76 56 65 82 50 94 C35 82 24 56 24 28 Z" fill="${accent}" opacity="0.18" stroke="${accent}" stroke-width="2.5" />
        <g transform="translate(32, 40) rotate(-40 18 18)">
          <rect x="0" y="4" width="36" height="18" rx="9" fill="#ffffff" stroke="${accent}" stroke-width="2.5" />
          <path d="M0 13 A9 9 0 0 0 18 22 L18 4 A9 9 0 0 0 0 13 Z" fill="${accent}" />
        </g>
      `;
      break;
    case 'stomach_capsule':
      iconSvg = `
        <circle cx="50" cy="58" r="34" fill="${accent}" opacity="0.14" />
        <path d="M34 38 C42 30 62 32 68 46 C74 60 62 76 52 82 C44 76 38 68 40 58 C42 48 30 46 34 38 Z" fill="none" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" />
        <rect x="40" y="48" width="24" height="12" rx="6" fill="${accent}" transform="rotate(20 52 54)" />
      `;
      break;
    case 'lightning_tablet':
      iconSvg = `
        <circle cx="50" cy="58" r="32" fill="#ffffff" stroke="${accent}" stroke-width="3.5" />
        <line x1="24" y1="58" x2="76" y2="58" stroke="${accent}" stroke-width="2.5" stroke-dasharray="3 3" opacity="0.7" />
        <path d="M52 34 L40 58 L52 58 L46 80 L62 52 L50 52 Z" fill="${accent}" />
      `;
      break;
    case 'lungs_breath':
      iconSvg = `
        <path d="M50 25 L50 60 M50 48 C42 42 30 45 26 62 C22 78 35 90 44 86 C48 84 50 78 50 72" fill="none" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" />
        <path d="M50 48 C58 42 70 45 74 62 C78 78 65 90 56 86 C52 84 50 78 50 72" fill="none" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" />
        <circle cx="50" cy="22" r="4" fill="${accent}" />
      `;
      break;
    case 'tube_cream':
      iconSvg = `
        <path d="M32 86 L40 38 L60 38 L68 86 Z" fill="${accent}" opacity="0.2" stroke="${accent}" stroke-width="3" stroke-linejoin="round" />
        <rect x="42" y="24" width="16" height="14" rx="2" fill="${accent}" />
        <line x1="34" y1="74" x2="66" y2="74" stroke="${accent}" stroke-width="2.5" opacity="0.6" />
        <path d="M46 54 Q50 48 54 54 Q58 60 50 62 Z" fill="${accent}" />
      `;
      break;
    case 'eyedropper':
      iconSvg = `
        <rect x="44" y="16" width="12" height="18" rx="6" fill="${accent}" />
        <path d="M42 34 L58 34 L54 78 L48 86 L46 78 Z" fill="none" stroke="${accent}" stroke-width="3" stroke-linejoin="round" />
        <line x1="46" y1="52" x2="54" y2="52" stroke="${accent}" stroke-width="2" opacity="0.7" />
        <circle cx="48" cy="94" r="3" fill="${accent}" />
      `;
      break;
    case 'syringe_vial':
      iconSvg = `
        <rect x="36" y="38" width="28" height="46" rx="4" fill="#ffffff" stroke="${accent}" stroke-width="3" />
        <rect x="42" y="28" width="16" height="10" rx="2" fill="${accent}" />
        <line x1="38" y1="54" x2="62" y2="54" stroke="${accent}" stroke-width="2" stroke-dasharray="2 2" opacity="0.6" />
        <line x1="38" y1="66" x2="62" y2="66" stroke="${accent}" stroke-width="2" stroke-dasharray="2 2" opacity="0.6" />
      `;
      break;
    case 'bottle_rx':
    default:
      iconSvg = `
        <rect x="34" y="36" width="32" height="50" rx="6" fill="#ffffff" stroke="${accent}" stroke-width="3" />
        <rect x="40" y="24" width="20" height="12" rx="3" fill="${accent}" />
        <rect x="38" y="48" width="24" height="24" rx="3" fill="${accent}" opacity="0.16" />
        <path d="M44 58 L56 58 M50 52 L50 64" stroke="${accent}" stroke-width="3" stroke-linecap="round" />
      `;
      break;
  }

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="g_${arch.key}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgStart}" />
        <stop offset="100%" stop-color="${bgEnd}" />
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.08"/>
      </filter>
    </defs>
    <rect width="100" height="100" rx="18" fill="url(#g_${arch.key})" />
    <rect x="4" y="4" width="92" height="92" rx="15" fill="none" stroke="${accent}" stroke-width="1.2" stroke-opacity="0.25" />
    
    <!-- Background subtle pattern dots -->
    <circle cx="15" cy="15" r="1.5" fill="${accent}" opacity="0.2" />
    <circle cx="85" cy="15" r="1.5" fill="${accent}" opacity="0.2" />
    <circle cx="15" cy="85" r="1.5" fill="${accent}" opacity="0.2" />
    <circle cx="85" cy="85" r="1.5" fill="${accent}" opacity="0.2" />

    <!-- Center Icon -->
    <g filter="url(#shadow)">
      ${iconSvg}
    </g>

    <!-- Category Pill Tag -->
    <g transform="translate(50, 89)">
      <rect x="-30" y="-8" width="60" height="13" rx="6.5" fill="${accent}" />
      <text x="0" y="1" font-family="system-ui, -apple-system, sans-serif" font-size="6.5" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="0.4">
        ${arch.shortCode}
      </text>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
}

// Local Storage Key for Client Caching
const STORAGE_KEY = 'pharmpulse_category_thumbnails_v2';

/**
 * Loads all locally cached category thumbnails
 */
export function getLocalThumbnailCache(): Record<string, CategoryThumbnailInfo> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Saves a thumbnail to the local cache
 */
export function setLocalThumbnail(info: CategoryThumbnailInfo): void {
  try {
    const cache = getLocalThumbnailCache();
    cache[info.normalizedCategory] = info;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.warn('Failed to cache category thumbnail to localStorage:', err);
  }
}

/**
 * Resolves the active thumbnail for a category:
 * 1. Checks client local storage cache (for previously AI-generated or custom thumbnails)
 * 2. If not found, immediately provides the crisp clinical SVG fallback
 */
export function getResolvedCategoryThumbnail(categoryStr: string, dosageForm?: string): CategoryThumbnailInfo {
  const archetype = getNormalizedCategory(categoryStr, dosageForm);
  const cache = getLocalThumbnailCache();

  if (cache[archetype.key]) {
    return cache[archetype.key];
  }

  // Instant fallback
  return {
    category: categoryStr,
    normalizedCategory: archetype.key,
    imageUrl: generateClinicalCategorySvg(categoryStr, dosageForm),
    isAiGenerated: false,
    provider: 'fallback_svg',
    prompt: archetype.imagenPrompt,
    generatedAt: new Date().toISOString(),
    statusMessage: 'Clinical vector archetype'
  };
}

/**
 * Calls the server-side Imagen API to generate a fresh AI thumbnail for this category
 */
export async function requestImagenCategoryThumbnail(
  categoryStr: string, 
  dosageForm?: string,
  customPrompt?: string,
  forceRegenerate: boolean = false
): Promise<CategoryThumbnailInfo> {
  const archetype = getNormalizedCategory(categoryStr, dosageForm);
  const prompt = customPrompt || buildImagenPromptForCategory(categoryStr, dosageForm);

  try {
    const res = await fetch('/api/inventory/category-thumbnail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: categoryStr,
        dosageForm,
        customPrompt: prompt,
        forceRegenerate
      })
    });

    const data = await res.json();

    if (data.success && data.imageUrl) {
      const info: CategoryThumbnailInfo = {
        category: categoryStr,
        normalizedCategory: archetype.key,
        imageUrl: data.imageUrl,
        isAiGenerated: true,
        provider: 'imagen',
        prompt,
        generatedAt: data.generatedAt || new Date().toISOString(),
        statusMessage: 'AI Generated via Imagen API'
      };
      setLocalThumbnail(info);
      return info;
    }

    // Handled quota or fallback
    const fallbackSvg = data.fallbackUrl || generateClinicalCategorySvg(categoryStr, dosageForm);
    const info: CategoryThumbnailInfo = {
      category: categoryStr,
      normalizedCategory: archetype.key,
      imageUrl: fallbackSvg,
      isAiGenerated: false,
      provider: 'fallback_svg',
      prompt,
      generatedAt: new Date().toISOString(),
      statusMessage: data.message || 'Free tier quota exhausted (requires paid API key). Showing vector placeholder.'
    };
    return info;
  } catch (err: any) {
    console.error('Error fetching category thumbnail from Imagen API:', err);
    return {
      category: categoryStr,
      normalizedCategory: archetype.key,
      imageUrl: generateClinicalCategorySvg(categoryStr, dosageForm),
      isAiGenerated: false,
      provider: 'fallback_svg',
      prompt,
      generatedAt: new Date().toISOString(),
      statusMessage: `Network error: ${err.message}. Using clinical vector placeholder.`
    };
  }
}
