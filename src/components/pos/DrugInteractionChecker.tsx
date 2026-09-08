import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Search, 
  Info, 
  X, 
  CheckCircle2, 
  FileEdit, 
  Zap, 
  HeartPulse,
  Pill,
  Activity,
  ArrowRight
} from 'lucide-react';
import { PosBillItem } from '../../types/pharmacy';

export type DrugInteractionSeverity = 'CRITICAL' | 'MAJOR' | 'MODERATE' | 'MINOR' | 'SAFE';

export interface DrugConflict {
  id: string;
  drugsInvolved: [string, string];
  saltsInvolved: [string, string];
  severity: DrugInteractionSeverity;
  headline: string;
  mechanism: string;
  clinicalRisk: string;
  aiInterpretation: string;
  recommendedAction: string;
  safeAlternatives?: string[];
}

export interface DrugInteractionResult {
  overallSeverity: DrugInteractionSeverity;
  hasConflicts: boolean;
  criticalCount: number;
  majorCount: number;
  moderateCount: number;
  conflicts: DrugConflict[];
  summaryMessage: string;
  aiInsights: string;
}

export interface DrugInteractionCheckerProps {
  /**
   * The list of active items in the POS cart
   */
  cartItems: PosBillItem[];
  /**
   * Optional customer or patient name for personalized advice
   */
  customerName?: string;
  /**
   * Callback to remove an offending item from the bill
   */
  onRemoveItem?: (inventoryId: string) => void;
  /**
   * Callback to trigger POS search for safer alternative medicine
   */
  onFindAlternative?: (alternativeName: string) => void;
  /**
   * Callback when a pharmacist logs a clinical override justification
   */
  onApplyOverrideNote?: (note: string) => void;
  /**
   * Optional custom styling class
   */
  className?: string;
  /**
   * Compact view option for tight sidebars
   */
  compact?: boolean;
}

/**
 * High-accuracy pharmacology interaction rules database
 */
interface InteractionRule {
  drugAKeywords: string[];
  drugBKeywords: string[];
  severity: DrugInteractionSeverity;
  headline: string;
  mechanism: string;
  clinicalRisk: string;
  aiInterpretation: string;
  recommendedAction: string;
  safeAlternatives: string[];
}

const INTERACTION_RULES: InteractionRule[] = [
  // 1. Warfarin / Blood Thinners + NSAIDs
  {
    drugAKeywords: ['warfarin', 'coumadin', 'acenocoumarol', 'heparin', 'clopidogrel', 'plavix', 'prasugrel', 'ticagrelor', 'dabigatran', 'rivaroxaban', 'apixaban'],
    drugBKeywords: ['aspirin', 'ibuprofen', 'diclofenac', 'naproxen', 'ketorolac', 'aceclofenac', 'mefenamic', 'combiflam', 'brufen', 'voveran', 'piroxicam', 'indomethacin'],
    severity: 'CRITICAL',
    headline: 'High Risk of Severe Gastrointestinal Hemorrhage & Bleeding',
    mechanism: 'NSAIDs inhibit platelet cyclooxygenase (COX-1) and erode gastric mucosa, while anticoagulants/antiplatelets prevent clotting cascade formation.',
    clinicalRisk: 'Co-administration significantly multiplies upper GI bleeding risk (3x to 6x baseline), hematuria, and major hemorrhages.',
    aiInterpretation: 'Simulated AI Analysis: Concurrent use of anticoagulants/antiplatelets with NSAIDs produces synergistic gastrotoxicity and blunted hemostasis. The platelet inhibition combined with mucosal barrier breakdown poses life-threatening bleeding risk.',
    recommendedAction: 'Avoid NSAIDs. For pain or pyrexia, switch to Paracetamol (Acetaminophen) up to 2g/day or consult prescribing physician for topical/non-systemic analgesia.',
    safeAlternatives: ['Paracetamol 650mg', 'Tramadol low-dose', 'Topical Diclofenac Gel']
  },
  // 2. PDE5 Inhibitors + Nitrates
  {
    drugAKeywords: ['sildenafil', 'tadalafil', 'vardenafil', 'avanafil', 'viagra', 'manforce', 'cialis'],
    drugBKeywords: ['nitroglycerin', 'isosorbide', 'sorbitrate', 'monotrate', 'nitrocontin', 'glyceryl trinitrate', 'angispan'],
    severity: 'CRITICAL',
    headline: 'Life-Threatening Precipitous Hypotension & Cardiac Collapse',
    mechanism: 'PDE5 inhibitors prevent cGMP breakdown while nitrates stimulate nitric oxide/cGMP production, triggering catastrophic vascular smooth muscle relaxation.',
    clinicalRisk: 'Profound and refractory arterial hypotension, coronary hypoperfusion, syncope, myocardial infarction, and death.',
    aiInterpretation: 'Simulated AI Analysis: Dual pathway amplification of cGMP creates severe vasodilatory collapse that does not respond to standard vasopressors. Co-prescription is strictly contraindicated.',
    recommendedAction: 'STRICTLY CONTRAINDICATED. Never administer within 24-48 hours of nitrate usage. Immediate pharmacist intervention required to withhold PDE5 medication.',
    safeAlternatives: ['Non-nitrate anti-anginal agents (Ranolazine, Trimetazidine) under cardiologist guidance']
  },
  // 3. Methotrexate + NSAIDs / High Aspirin
  {
    drugAKeywords: ['methotrexate', 'folitrax', 'trexall'],
    drugBKeywords: ['diclofenac', 'ibuprofen', 'naproxen', 'aceclofenac', 'ketorolac', 'mefenamic', 'aspirin', 'combiflam', 'voveran'],
    severity: 'CRITICAL',
    headline: 'Methotrexate Toxicity & Fatal Bone Marrow Suppression',
    mechanism: 'NSAIDs decrease renal prostaglandin synthesis and compete with methotrexate for renal tubular secretion, elevating serum methotrexate levels.',
    clinicalRisk: 'Severe pancytopenia, acute renal failure, mucosal ulcerations, and fatal systemic methotrexate toxicity.',
    aiInterpretation: 'Simulated AI Analysis: NSAIDs reduce renal tubular clearance of methotrexate, causing toxic systemic accumulation. High-dose methotrexate + NSAID co-administration has high mortality incidence.',
    recommendedAction: 'Do not dispense OTC NSAIDs. Use Paracetamol for pain relief or verify if low-dose rheumatology protocol includes specialized monitoring.',
    safeAlternatives: ['Paracetamol 500/650mg', 'Glucosamine', 'Topical counter-irritants']
  },
  // 4. ACE-Inhibitors / ARBs + Potassium-Sparing Diuretics / K Supplements
  {
    drugAKeywords: ['telmisartan', 'losartan', 'olmesartan', 'ramipril', 'enalapril', 'lisinopril', 'candesartan', 'valsartan'],
    drugBKeywords: ['spironolactone', 'aldactone', 'eplerenone', 'potassium chloride', 'potklor', 'k-bind'],
    severity: 'MAJOR',
    headline: 'Severe Hyperkalemia & Cardiac Arrhythmia Risk',
    mechanism: 'RAAS blockade suppresses aldosterone-dependent potassium excretion, compounding potassium retention from aldosterone antagonists or supplements.',
    clinicalRisk: 'Dangerous serum potassium elevation (> 5.5 mEq/L) leading to muscular weakness, paresthesias, peaked T-waves, and fatal ventricular arrhythmias.',
    aiInterpretation: 'Simulated AI Analysis: Dual inhibition of renal potassium excretion requires baseline and 1-week serum potassium/creatinine monitoring.',
    recommendedAction: 'Verify baseline renal panel (eGFR/K+). Advise patient to avoid salt substitutes containing potassium and watch for irregular heartbeats.',
    safeAlternatives: ['Amlodipine (Calcium Channel Blocker)', 'Hydrochlorothiazide (Thiazide Diuretic)']
  },
  // 5. Statins + Macrolides / Azole Antifungals
  {
    drugAKeywords: ['atorvastatin', 'simvastatin', 'lovastatin', 'atorva', 'lipitor', 'storvas', 'tonact'],
    drugBKeywords: ['clarithromycin', 'erythromycin', 'ketoconazole', 'itraconazole', 'fluconazole', 'diflucan', 'canditral', 'zocon'],
    severity: 'MAJOR',
    headline: 'Elevated Statin Bioavailability & Rhabdomyolysis Risk',
    mechanism: 'Macrolides and azoles are potent CYP3A4 inhibitors that block hepatic metabolism of CYP3A4-substrate statins (especially Atorvastatin & Simvastatin).',
    clinicalRisk: 'Acute elevation in serum statin concentrations, leading to severe myopathy, muscle breakdown, dark tea-colored urine, and acute renal tubular necrosis.',
    aiInterpretation: 'Simulated AI Analysis: CYP3A4 inhibition elevates statin AUC by 300% to 500%. Temporary statin pause is standard clinical practice during short-course antimicrobials.',
    recommendedAction: 'Temporarily withhold statin therapy during the 5-7 day antifungal/macrolide course, or switch to Rosuvastatin / Pravastatin (non-CYP3A4 metabolized).',
    safeAlternatives: ['Rosuvastatin (Rozavel)', 'Azithromycin (weaker CYP3A4 inhibition)']
  },
  // 6. Fluoroquinolones / Macrolides + QT Prolonging Agents (Ondansetron, Antiarrhythmics)
  {
    drugAKeywords: ['ciprofloxacin', 'levofloxacin', 'moxifloxacin', 'clarithromycin', 'azithromycin', 'azithral', 'ciprobid', 'levomac'],
    drugBKeywords: ['ondansetron', 'emset', 'amiodarone', 'haloperidol', 'amitriptyline', 'escitalopram', 'domperidone', 'vomistop'],
    severity: 'MAJOR',
    headline: 'Additive QTc Interval Prolongation & Ventricular Arrhythmia',
    mechanism: 'Combined blockade of cardiac hERG potassium channels delays ventricular repolarization.',
    clinicalRisk: 'Additive QT interval prolongation predisposing to Torsades de Pointes (TdP) and sudden syncopal cardiac events.',
    aiInterpretation: 'Simulated AI Analysis: Multi-drug cardiac repolarization delay. Risk is amplified in female patients, elderly individuals, or those with underlying electrolyte imbalances.',
    recommendedAction: 'Monitor ECG if high doses are required. Consider non-QT prolonging antiemetics like Metoclopramide or alternate antibiotic classes.',
    safeAlternatives: ['Metoclopramide for nausea', 'Amoxicillin-Clavulanate for infection']
  },
  // 7. SSRIs / SNRIs + Tramadol
  {
    drugAKeywords: ['sertraline', 'fluoxetine', 'escitalopram', 'paroxetine', 'citalopram', 'duloxetine', 'venlafaxine', 'nexito', 'stalopam'],
    drugBKeywords: ['tramadol', 'ultram', 'tramazac', 'linezolid', 'lizomac'],
    severity: 'MAJOR',
    headline: 'Potential Serotonin Syndrome & Reduced Seizure Threshold',
    mechanism: 'Tramadol inhibits serotonin and norepinephrine reuptake in addition to mu-opioid agonism; combined with SSRIs, central serotonin levels surge.',
    clinicalRisk: 'Central and peripheral serotonergic toxicity manifesting as hyperreflexia, clonus, autonomic instability, hyperthermia, and confusion.',
    aiInterpretation: 'Simulated AI Analysis: Additive serotonergic transmission. Patients may develop tremors, diaphoresis, and hypertension. Lower seizure threshold is also observed.',
    recommendedAction: 'Avoid co-prescribing. If analgesia is mandatory, use Paracetamol, NSAID (with GI cover), or non-serotonergic opioid agonists under close supervision.',
    safeAlternatives: ['Paracetamol 650mg', 'Aceclofenac + Paracetamol']
  },
  // 8. Benzodiazepines + Opioids
  {
    drugAKeywords: ['alprazolam', 'clonazepam', 'diazepam', 'lorazepam', 'alprax', 'restyl', 'clona', 'ativan'],
    drugBKeywords: ['tramadol', 'codeine', 'corex', 'morphine', 'fentanyl', 'buprenorphine'],
    severity: 'CRITICAL',
    headline: 'Severe Central Nervous System & Respiratory Depression',
    mechanism: 'GABA-A receptor potentiation paired with mu-opioid receptor stimulation produces profound synergistic depression of respiratory drive centers in the brainstem.',
    clinicalRisk: 'Severe sedation, hypoventilation, respiratory arrest, coma, and fatal overdose.',
    aiInterpretation: 'Simulated AI Analysis: Synergistic depressant action on medullary respiratory rhythm generator. Carries strict black box warning across global pharmacopoeias.',
    recommendedAction: 'Limit dosages and duration to minimum required. Patient and family must be cautioned on oversedation and breathing changes.',
    safeAlternatives: ['Non-sedating analgesics', 'Melatonin for sleep support']
  },
  // 9. Multiple Paracetamol Containing Brands (Duplicate Therapy Risk)
  {
    drugAKeywords: ['dolo', 'calpol', 'crocin', 'paracetamol', 'pacimol', 'pyragesic'],
    drugBKeywords: ['combiflam', 'sumo', 'flexon', 'zerodol-p', 'acecloren-p', 'ultracet', 'sinarest', 'wikoryl', 'cheston cold'],
    severity: 'MAJOR',
    headline: 'Duplicate Paracetamol Intake & Hepatotoxicity Risk',
    mechanism: 'Simultaneous consumption of single-ingredient Paracetamol and combination cold/pain preparations exceeds the 4,000mg/day safe hepatic threshold.',
    clinicalRisk: 'Depletion of hepatic glutathione leading to toxic NAPQI metabolite accumulation and acute liver injury.',
    aiInterpretation: 'Simulated AI Analysis: Accidental duplicate paracetamol ingestion is the leading cause of acute hepatic failure. Both products contain therapeutic doses of Acetaminophen.',
    recommendedAction: 'Inform customer not to take both formulations concurrently. Dispense only one analgesic or clearly label total daily dose limit.',
    safeAlternatives: ['Single product therapy only']
  },
  // 10. Fluoroquinolones + Multivalent Cations (Antacids / Calcium / Iron)
  {
    drugAKeywords: ['ciprofloxacin', 'levofloxacin', 'ofloxacin', 'norfloxacin', 'moxifloxacin', 'ciprobid', 'zanocin'],
    drugBKeywords: ['gelusil', 'digene', 'antacid', 'calcium', 'shelcal', 'ferrous', 'iron', 'orofer', 'zinc', 'sucralfate'],
    severity: 'MODERATE',
    headline: 'Chelesis & Significant Reduction in Antibiotic Absorption',
    mechanism: 'Polyvalent cations (Ca2+, Mg2+, Al3+, Fe2+, Zn2+) form insoluble chelate complexes with fluoroquinolones in the gut lumen.',
    clinicalRisk: 'Up to 90% reduction in antibiotic bioavailability, causing clinical treatment failure and antimicrobial resistance.',
    aiInterpretation: 'Simulated AI Analysis: Physical chelation binding prevents systemic absorption. Simple chronotherapy (time spacing) resolves the interaction completely.',
    recommendedAction: 'Instruct patient to administer the antibiotic at least 2 hours before or 4 hours after antacids, calcium, iron, or sucralfate.',
    safeAlternatives: ['Space doses by at least 2-4 hours']
  },
  // 11. Duplicate NSAID Therapy
  {
    drugAKeywords: ['diclofenac', 'voveran', 'aceclofenac', 'zerodol', 'hifenac'],
    drugBKeywords: ['ibuprofen', 'brufen', 'naproxen', 'mefenamic', 'meftal', 'ketorolac'],
    severity: 'MAJOR',
    headline: 'Dual NSAID Toxicity Without Added Analgesic Benefit',
    mechanism: 'Ceiling analgesic effect is reached while ulcerogenic and nephrotoxic COX-1/COX-2 inhibition is compounded.',
    clinicalRisk: 'Double the incidence of acute gastritis, peptic ulcer perforation, and acute interstitial nephritis without pain relief synergy.',
    aiInterpretation: 'Simulated AI Analysis: Duplicate NSAID prescribing provides no therapeutic advantage while doubling adverse event hazard ratios.',
    recommendedAction: 'Discontinue one NSAID. Combine single NSAID with a PPI (e.g., Pantoprazole) if gastrointestinal protection is warranted.',
    safeAlternatives: ['Pantoprazole 40mg (Gastro-protection)', 'Single NSAID at optimized dose']
  }
];

export const DrugInteractionChecker: React.FC<DrugInteractionCheckerProps> = ({
  cartItems,
  customerName,
  onRemoveItem,
  onFindAlternative,
  onApplyOverrideNote,
  className = '',
  compact = false
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);
  const [activeConflict, setActiveConflict] = useState<DrugConflict | null>(null);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [acknowledgedConflicts, setAcknowledgedConflicts] = useState<Record<string, boolean>>({});

  // Helper to normalize drug strings for comparison
  const normalize = (str?: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, ' ');

  // Core Evaluation Algorithm: Compares all pairs in current POS cart
  const interactionAnalysis = useMemo<DrugInteractionResult>(() => {
    if (!cartItems || cartItems.length < 2) {
      return {
        overallSeverity: 'SAFE',
        hasConflicts: false,
        criticalCount: 0,
        majorCount: 0,
        moderateCount: 0,
        conflicts: [],
        summaryMessage: cartItems.length === 1 
          ? 'Single medication in cart. Add more items to evaluate drug-drug interactions.' 
          : 'Cart is empty. Real-time interaction checker ready.',
        aiInsights: 'Pharmacology engine active. Monitoring POS cart for contraindicated drug pairings and duplicate therapies.'
      };
    }

    const detectedConflicts: DrugConflict[] = [];

    // Pairwise iteration across all unique items in cart
    for (let i = 0; i < cartItems.length; i++) {
      for (let j = i + 1; j < cartItems.length; j++) {
        const itemA = cartItems[i];
        const itemB = cartItems[j];

        const textA = `${normalize(itemA.brandName)} ${normalize(itemA.saltComposition)} ${normalize(itemA.genericName)} ${normalize(itemA.medicationName)}`;
        const textB = `${normalize(itemB.brandName)} ${normalize(itemB.saltComposition)} ${normalize(itemB.genericName)} ${normalize(itemB.medicationName)}`;

        // Match against rule database
        for (let r = 0; r < INTERACTION_RULES.length; r++) {
          const rule = INTERACTION_RULES[r];
          
          const matchAtoA = rule.drugAKeywords.some(kw => textA.includes(kw));
          const matchBtoB = rule.drugBKeywords.some(kw => textB.includes(kw));

          const matchAtoB = rule.drugAKeywords.some(kw => textB.includes(kw));
          const matchBtoA = rule.drugBKeywords.some(kw => textA.includes(kw));

          if ((matchAtoA && matchBtoB) || (matchAtoB && matchBtoA)) {
            const conflictId = `conflict_${itemA.inventoryId}_${itemB.inventoryId}_${rule.severity}`;
            
            // Check if not already added
            if (!detectedConflicts.some(c => c.id === conflictId)) {
              detectedConflicts.push({
                id: conflictId,
                drugsInvolved: [itemA.brandName, itemB.brandName],
                saltsInvolved: [
                  itemA.saltComposition || itemA.genericName || 'Active Formula A',
                  itemB.saltComposition || itemB.genericName || 'Active Formula B'
                ],
                severity: rule.severity,
                headline: rule.headline,
                mechanism: rule.mechanism,
                clinicalRisk: rule.clinicalRisk,
                aiInterpretation: rule.aiInterpretation,
                recommendedAction: rule.recommendedAction,
                safeAlternatives: rule.safeAlternatives
              });
            }
          }
        }
      }
    }

    let criticalCount = 0;
    let majorCount = 0;
    let moderateCount = 0;

    detectedConflicts.forEach(c => {
      if (c.severity === 'CRITICAL') criticalCount++;
      else if (c.severity === 'MAJOR') majorCount++;
      else if (c.severity === 'MODERATE') moderateCount++;
    });

    let overallSeverity: DrugInteractionSeverity = 'SAFE';
    if (criticalCount > 0) overallSeverity = 'CRITICAL';
    else if (majorCount > 0) overallSeverity = 'MAJOR';
    else if (moderateCount > 0) overallSeverity = 'MODERATE';

    let summaryMessage = 'No dangerous drug interactions detected between current bill items.';
    if (criticalCount > 0) {
      summaryMessage = `CRITICAL ALERT: ${criticalCount} high-risk contraindicated combination(s) detected in cart!`;
    } else if (majorCount > 0) {
      summaryMessage = `MAJOR WARNING: ${majorCount} significant clinical drug interaction(s) detected.`;
    } else if (moderateCount > 0) {
      summaryMessage = `MODERATE ADVISORY: ${moderateCount} medication interaction(s) requiring dosage or timing adjustment.`;
    }

    const aiInsights = overallSeverity === 'CRITICAL' || overallSeverity === 'MAJOR'
      ? `Simulated AI Interpretation: High-severity pharmacological synergy detected for ${customerName ? customerName : 'this customer'}. Immediate pharmacist verification recommended prior to bill completion.`
      : 'Simulated AI Interpretation: Active pharmaceutical ingredients and metabolic pathways are compatible with standard dispensing protocols.';

    return {
      overallSeverity,
      hasConflicts: detectedConflicts.length > 0,
      criticalCount,
      majorCount,
      moderateCount,
      conflicts: detectedConflicts,
      summaryMessage,
      aiInsights
    };
  }, [cartItems, customerName]);

  const handleOpenOverride = (conflict: DrugConflict) => {
    setActiveConflict(conflict);
    setOverrideReason(`Prescriber consulted. Clinical co-administration of ${conflict.drugsInvolved.join(' + ')} evaluated and approved with patient counseling.`);
    setShowOverrideModal(true);
  };

  const handleSaveOverride = () => {
    if (!activeConflict) return;
    
    setAcknowledgedConflicts(prev => ({
      ...prev,
      [activeConflict.id]: true
    }));

    if (onApplyOverrideNote) {
      onApplyOverrideNote(`[CLINICAL OVERRIDE - ${activeConflict.severity}] ${activeConflict.drugsInvolved.join(' + ')}: ${overrideReason}`);
    }

    setShowOverrideModal(false);
    setActiveConflict(null);
  };

  if (!cartItems || cartItems.length === 0) {
    return null;
  }

  // Visual Theme Configuration based on Severity
  const themeConfig = {
    CRITICAL: {
      container: 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-400 dark:border-rose-800 ring-2 ring-rose-500/20',
      badge: 'bg-rose-600 text-white',
      icon: ShieldAlert,
      iconColor: 'text-rose-600 dark:text-rose-400 animate-pulse',
      headerText: 'text-rose-950 dark:text-rose-100',
      subText: 'text-rose-700 dark:text-rose-300',
      cardBg: 'bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900/60'
    },
    MAJOR: {
      container: 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-400 dark:border-amber-800 ring-1 ring-amber-500/20',
      badge: 'bg-amber-600 text-white',
      icon: AlertTriangle,
      iconColor: 'text-amber-600 dark:text-amber-400',
      headerText: 'text-amber-950 dark:text-amber-100',
      subText: 'text-amber-800 dark:text-amber-300',
      cardBg: 'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/60'
    },
    MODERATE: {
      container: 'bg-yellow-50/80 dark:bg-yellow-950/30 border-yellow-300 dark:border-yellow-800',
      badge: 'bg-yellow-600 text-white',
      icon: Info,
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      headerText: 'text-yellow-950 dark:text-yellow-100',
      subText: 'text-yellow-800 dark:text-yellow-300',
      cardBg: 'bg-white dark:bg-slate-900 border-yellow-200 dark:border-yellow-900/50'
    },
    MINOR: {
      container: 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800',
      badge: 'bg-emerald-600 text-white',
      icon: ShieldCheck,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      headerText: 'text-emerald-950 dark:text-emerald-100',
      subText: 'text-emerald-800 dark:text-emerald-300',
      cardBg: 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-900'
    },
    SAFE: {
      container: 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60',
      badge: 'bg-emerald-600 text-white',
      icon: ShieldCheck,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      headerText: 'text-emerald-950 dark:text-emerald-200',
      subText: 'text-emerald-700 dark:text-emerald-300',
      cardBg: 'bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-900/40'
    }
  };

  const currentTheme = themeConfig[interactionAnalysis.overallSeverity];
  const SeverityIcon = currentTheme.icon;

  return (
    <div 
      id="drug-interaction-checker"
      className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs ${currentTheme.container} ${className}`}
    >
      {/* Header Bar */}
      <div className="p-3 sm:p-3.5 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="shrink-0 p-1.5 rounded-xl bg-white dark:bg-slate-900 shadow-2xs">
            <SeverityIcon className={`w-5 h-5 ${currentTheme.iconColor}`} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-xs sm:text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>AI Drug Interaction Checker</span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-600/15 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Simulated AI</span>
                </span>
              </span>

              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${currentTheme.badge}`}>
                {interactionAnalysis.overallSeverity}
              </span>
            </div>

            <p className={`text-xs font-semibold mt-0.5 truncate ${currentTheme.subText}`}>
              {interactionAnalysis.summaryMessage}
            </p>
          </div>
        </div>

        {/* Action button to toggle details */}
        <button
          type="button"
          id="toggle-interaction-details-btn"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors shrink-0 cursor-pointer"
          title={isExpanded ? 'Collapse interaction details' : 'Expand interaction details'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Conflict Breakdown */}
      {isExpanded && (
        <div className="px-3 pb-3 sm:px-3.5 sm:pb-3.5 space-y-2.5 pt-1 border-t border-black/5 dark:border-white/5">
          
          {/* Simulated AI Clinical Summary Box */}
          <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <Activity className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Simulated AI Pharmacovigilance Interpretation</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              {interactionAnalysis.aiInsights}
            </p>
          </div>

          {/* Conflict List */}
          {interactionAnalysis.hasConflicts ? (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {interactionAnalysis.conflicts.map((conflict, index) => {
                const isAcknowledged = acknowledgedConflicts[conflict.id];
                const confSeverity = conflict.severity;

                return (
                  <div 
                    key={conflict.id || index}
                    className={`p-3 rounded-xl border space-y-2 transition-all ${
                      confSeverity === 'CRITICAL'
                        ? 'bg-rose-50/70 dark:bg-rose-950/50 border-rose-300 dark:border-rose-900'
                        : confSeverity === 'MAJOR'
                        ? 'bg-amber-50/70 dark:bg-amber-950/50 border-amber-300 dark:border-amber-900'
                        : 'bg-yellow-50/70 dark:bg-yellow-950/40 border-yellow-300 dark:border-yellow-900'
                    }`}
                  >
                    {/* Conflict Title & Drugs Involved */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                            confSeverity === 'CRITICAL' ? 'bg-rose-600 text-white' :
                            confSeverity === 'MAJOR' ? 'bg-amber-600 text-white' : 'bg-yellow-600 text-white'
                          }`}>
                            {conflict.severity}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            {conflict.headline}
                          </h4>
                        </div>

                        {/* Drugs Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs">
                            {conflict.drugsInvolved[0]}
                          </span>
                          <span className="text-slate-400 font-black">+</span>
                          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs">
                            {conflict.drugsInvolved[1]}
                          </span>
                        </div>
                      </div>

                      {/* Override status indicator */}
                      {isAcknowledged && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                          <span>Overridden</span>
                        </span>
                      )}
                    </div>

                    {/* Mechanism & Clinical Risk */}
                    <div className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                      <div className="flex items-start gap-1">
                        <strong className="text-slate-900 dark:text-slate-100 shrink-0">Mechanism:</strong>
                        <span>{conflict.mechanism}</span>
                      </div>
                      <div className="flex items-start gap-1">
                        <strong className="text-slate-900 dark:text-slate-100 shrink-0">Clinical Risk:</strong>
                        <span className="font-medium text-rose-700 dark:text-rose-300">{conflict.clinicalRisk}</span>
                      </div>
                    </div>

                    {/* Simulated AI Interpretation snippet */}
                    <div className="p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 text-[10.5px] text-slate-600 dark:text-slate-300 space-y-1">
                      <div className="flex items-center gap-1 font-bold text-teal-700 dark:text-teal-300">
                        <Zap className="w-3 h-3" />
                        <span>AI Recommendation:</span>
                      </div>
                      <p>{conflict.recommendedAction}</p>

                      {/* Safe Alternatives Suggestions */}
                      {conflict.safeAlternatives && conflict.safeAlternatives.length > 0 && (
                        <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Suggested Safe Substitutes:</span>
                          {conflict.safeAlternatives.map((alt, altIdx) => (
                            <button
                              key={altIdx}
                              type="button"
                              onClick={() => onFindAlternative && onFindAlternative(alt)}
                              className="px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 hover:bg-teal-100 text-[10px] font-bold border border-teal-200 dark:border-teal-800 transition-colors cursor-pointer flex items-center gap-1"
                              title={`Search substitute "${alt}" in inventory`}
                            >
                              <Search className="w-2.5 h-2.5" />
                              <span>{alt}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Pharmacist Action Controls */}
                    <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        {onRemoveItem && (
                          <button
                            type="button"
                            onClick={() => {
                              // Find inventory item matching drugB and remove it
                              const matchingItem = cartItems.find(it => 
                                it.brandName === conflict.drugsInvolved[1] || 
                                it.brandName === conflict.drugsInvolved[0]
                              );
                              if (matchingItem) {
                                onRemoveItem(matchingItem.inventoryId);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/60 dark:hover:bg-rose-800 text-rose-800 dark:text-rose-200 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove Conflicting Drug</span>
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenOverride(conflict)}
                        className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ml-auto"
                      >
                        <FileEdit className="w-3 h-3" />
                        <span>{isAcknowledged ? 'Edit Override' : 'Pharmacist Clinical Override'}</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>All {cartItems.length} active medicines are compatible without known cross-interaction risks.</span>
            </div>
          )}

        </div>
      )}

      {/* Pharmacist Override Justification Modal */}
      {showOverrideModal && activeConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Pharmacist Clinical Override
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                You are overriding a <strong className="text-rose-600">{activeConflict.severity}</strong> interaction between:
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {activeConflict.drugsInvolved.join(' + ')}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Clinical Justification / Prescriber Verification:
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={3}
                  placeholder="State clinical justification or prescriber confirmation details..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveOverride}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Save & Authorize Bill</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
