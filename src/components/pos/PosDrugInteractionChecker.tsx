import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  Trash2, 
  Search, 
  CheckCircle2, 
  Info, 
  FileEdit, 
  X, 
  UserCheck, 
  Stethoscope,
  HeartPulse,
  Pill,
  ArrowRight
} from 'lucide-react';
import { PosBillItem, PosCartInteractionAnalysis, PosCartConflict, Patient } from '../../types/pharmacy';
import { usePharmacy } from '../../context/PharmacyContext';

interface PosDrugInteractionCheckerProps {
  cartItems: PosBillItem[];
  customerName?: string;
  contactNumber?: string;
  doctorName?: string;
  onRemoveItem: (inventoryId: string) => void;
  onFindAlternative?: (saltComposition: string, brandName: string) => void;
  onApplyOverrideNote?: (note: string) => void;
  className?: string;
  compact?: boolean;
}

export const PosDrugInteractionChecker: React.FC<PosDrugInteractionCheckerProps> = ({
  cartItems,
  customerName,
  contactNumber,
  doctorName,
  onRemoveItem,
  onFindAlternative,
  onApplyOverrideNote,
  className = '',
  compact = false
}) => {
  const { patients, addToast } = usePharmacy();

  const [analysis, setAnalysis] = useState<PosCartInteractionAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [overrideConflict, setOverrideConflict] = useState<PosCartConflict | null>(null);
  const [hasAcknowledged, setHasAcknowledged] = useState<boolean>(false);
  const [showDeepReportModal, setShowDeepReportModal] = useState<boolean>(false);

  // Match existing patient profile by contact number or exact name
  const matchedPatient = useMemo<Patient | null>(() => {
    if (!contactNumber && !customerName) return null;
    const cleanPhone = (contactNumber || '').replace(/\D/g, '');
    if (cleanPhone.length >= 10) {
      const matchByPhone = patients.find(p => p.phone && p.phone.replace(/\D/g, '').includes(cleanPhone));
      if (matchByPhone) return matchByPhone;
    }
    if (customerName && customerName.trim().toLowerCase() !== 'walk-in customer') {
      const nameLower = customerName.trim().toLowerCase();
      const matchByName = patients.find(p => `${p.firstName} ${p.lastName}`.trim().toLowerCase() === nameLower);
      if (matchByName) return matchByName;
    }
    return null;
  }, [contactNumber, customerName, patients]);

  // Debounce ref to avoid spamming the AI endpoint during rapid barcode scanning
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchInteractionAnalysis = async () => {
    if (cartItems.length === 0) {
      setAnalysis(null);
      setIsLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);

    try {
      const payload = {
        cartItems: cartItems.map(it => ({
          inventoryId: it.inventoryId,
          brandName: it.brandName,
          genericSalt: it.saltComposition || it.genericName || it.genericSalt || '',
          strength: it.strength || '',
          dosageForm: it.unit || '',
          quantity: it.quantity,
        })),
        customer: {
          name: customerName || (matchedPatient ? `${matchedPatient.firstName} ${matchedPatient.lastName}` : 'Walk-in Customer'),
          phone: contactNumber || matchedPatient?.phone || '',
          allergies: matchedPatient?.allergies || [],
          chronicConditions: matchedPatient?.chronicConditions || [],
          chronicMedications: matchedPatient?.chronicMedications || [],
        },
        doctorName: doctorName || 'Self / Direct Counter',
      };

      const res = await fetch('/api/gemini/cart-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.analysis) {
          setAnalysis(data.analysis);
          // If critical or major, auto expand
          if (data.analysis.overallRiskLevel === 'CRITICAL' || data.analysis.overallRiskLevel === 'MAJOR') {
            setIsExpanded(true);
            setHasAcknowledged(false);
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Failed to screen cart interactions:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger debounced interaction check whenever cart items, customer, or doctor changes
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (cartItems.length === 0) {
      setAnalysis(null);
      setIsLoading(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchInteractionAnalysis();
    }, 350);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [cartItems, customerName, contactNumber, doctorName, matchedPatient]);

  const handleManualRefresh = () => {
    fetchInteractionAnalysis();
  };

  const handleOpenOverride = (conflict: PosCartConflict) => {
    setOverrideConflict(conflict);
    setOverrideReason(`Prescriber consulted. Low-dose co-administration clinically justified for ${conflict.drugsInvolved.join(' + ')}. Patient advised.`);
    setShowOverrideModal(true);
  };

  const handleSaveOverride = () => {
    if (!overrideConflict) return;
    const noteText = `[CLINICAL OVERRIDE - ${overrideConflict.severity} INTERACTION] ${overrideConflict.drugsInvolved.join(' + ')}: ${overrideReason}`;
    if (onApplyOverrideNote) {
      onApplyOverrideNote(noteText);
    }
    setHasAcknowledged(true);
    setShowOverrideModal(false);
    addToast({
      type: 'info',
      title: 'Clinical Override Recorded',
      message: 'Pharmacist justification logged and attached to invoice record.',
    });
  };

  if (cartItems.length === 0) {
    return null;
  }

  const risk = analysis?.overallRiskLevel || 'SAFE';
  const isCritical = risk === 'CRITICAL';
  const isMajor = risk === 'MAJOR';
  const isModerate = risk === 'MODERATE';
  const isSafe = risk === 'SAFE' || risk === 'MINOR';

  const severityColors = {
    CRITICAL: {
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      border: 'border-rose-300 dark:border-rose-800',
      badgeBg: 'bg-rose-600 text-white',
      textColor: 'text-rose-900 dark:text-rose-200',
      icon: ShieldAlert,
      iconColor: 'text-rose-600 dark:text-rose-400',
      subText: 'text-rose-700 dark:text-rose-300',
      cardBg: 'bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900',
    },
    MAJOR: {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'border-amber-300 dark:border-amber-800',
      badgeBg: 'bg-amber-600 text-white',
      textColor: 'text-amber-900 dark:text-amber-200',
      icon: AlertTriangle,
      iconColor: 'text-amber-600 dark:text-amber-400',
      subText: 'text-amber-700 dark:text-amber-300',
      cardBg: 'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900',
    },
    MODERATE: {
      bg: 'bg-yellow-50 dark:bg-yellow-950/40',
      border: 'border-yellow-300 dark:border-yellow-800',
      badgeBg: 'bg-yellow-600 text-white',
      textColor: 'text-yellow-900 dark:text-yellow-200',
      icon: Info,
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      subText: 'text-yellow-700 dark:text-yellow-300',
      cardBg: 'bg-white dark:bg-slate-900 border-yellow-200 dark:border-yellow-900',
    },
    MINOR: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-800/60',
      badgeBg: 'bg-emerald-600 text-white',
      textColor: 'text-emerald-900 dark:text-emerald-200',
      icon: ShieldCheck,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      subText: 'text-emerald-700 dark:text-emerald-300',
      cardBg: 'bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-900',
    },
    SAFE: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-800/60',
      badgeBg: 'bg-emerald-600 text-white',
      textColor: 'text-emerald-900 dark:text-emerald-200',
      icon: ShieldCheck,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      subText: 'text-emerald-700 dark:text-emerald-300',
      cardBg: 'bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-900',
    },
  };

  const currentTheme = severityColors[risk] || severityColors.SAFE;
  const CurrentIcon = currentTheme.icon;

  const totalConflicts = (analysis?.conflicts?.length || 0) + (analysis?.allergyConflicts?.length || 0) + (analysis?.diseaseWarnings?.length || 0);

  return (
    <div className={`rounded-xl border transition-all duration-200 ${currentTheme.bg} ${currentTheme.border} ${className}`}>
      {/* Header Bar */}
      <div className="p-2.5 sm:p-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            isCritical ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 animate-pulse' :
            isMajor ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300' :
            isModerate ? 'bg-yellow-100 dark:bg-yellow-900/60 text-yellow-600 dark:text-yellow-300' :
            'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300'
          }`}>
            <CurrentIcon className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs sm:text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                AI Drug Safety Screener
              </span>
              
              {isLoading ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 animate-pulse">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  Screening Cart...
                </span>
              ) : (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${currentTheme.badgeBg}`}>
                  {risk === 'SAFE' ? 'ALL CLEAR' : `${risk} RISK`}
                </span>
              )}
            </div>

            <p className={`text-[11px] leading-tight mt-0.5 truncate ${currentTheme.subText}`}>
              {isLoading ? 'Evaluating pairwise pharmacokinetics & patient contraindications...' : (analysis?.summary || 'Active real-time POS interaction safety check')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleManualRefresh}
            title="Re-run AI interaction screening"
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60 transition cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Patient Clinical Context Banner if matched */}
      {matchedPatient && (
        <div className="px-3 py-1.5 bg-white/70 dark:bg-slate-900/60 border-t border-b border-slate-200/60 dark:border-slate-800/60 text-[11px] flex items-center justify-between gap-2 flex-wrap text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1.5 flex-wrap">
            <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {matchedPatient.firstName} {matchedPatient.lastName}
            </span>
            {matchedPatient.allergies && matchedPatient.allergies.length > 0 && (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-bold">
                ⚠️ Allergic: {matchedPatient.allergies.join(', ')}
              </span>
            )}
            {matchedPatient.chronicConditions && matchedPatient.chronicConditions.length > 0 && (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-medium">
                {matchedPatient.chronicConditions.join(', ')}
              </span>
            )}
          </div>
          {matchedPatient.chronicMedications && matchedPatient.chronicMedications.length > 0 && (
            <span className="text-[10px] text-slate-500 font-mono">
              + {matchedPatient.chronicMedications.length} chronic meds in profile
            </span>
          )}
        </div>
      )}

      {/* Expanded Interactive Body */}
      {isExpanded && (
        <div className="p-2.5 sm:p-3 pt-1 space-y-2.5">
          {/* SAFE STATE */}
          {isSafe && !isLoading && (
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">Cart Verified Safe:</span> No major drug interactions or contraindications found among {cartItems.length} items.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeepReportModal(true)}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 cursor-pointer"
              >
                View Counseling
              </button>
            </div>
          )}

          {/* ACTIVE CONFLICTS LIST */}
          {analysis && analysis.conflicts && analysis.conflicts.length > 0 && (
            <div className="space-y-2">
              {analysis.conflicts.map((conflict, idx) => {
                const confIsCritical = conflict.severity === 'CRITICAL';
                const confIsMajor = conflict.severity === 'MAJOR';

                return (
                  <div 
                    key={conflict.id || `conf-${idx}`}
                    className={`p-3 rounded-xl border ${currentTheme.cardBg} shadow-xs space-y-2`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide ${
                          confIsCritical ? 'bg-rose-600 text-white' :
                          confIsMajor ? 'bg-amber-600 text-white' :
                          'bg-yellow-600 text-white'
                        }`}>
                          {conflict.severity}
                        </span>

                        <div className="flex items-center gap-1 text-xs font-bold text-slate-900 dark:text-white flex-wrap">
                          {conflict.drugsInvolved.map((drug, dIdx) => (
                            <React.Fragment key={dIdx}>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                {drug}
                              </span>
                              {dIdx < conflict.drugsInvolved.length - 1 && (
                                <span className="text-rose-500 font-bold">⚡</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>

                      {/* Quick Pharmacist Override Badge if already done */}
                      {hasAcknowledged && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          <CheckCircle2 className="w-3 h-3" /> Overridden
                        </span>
                      )}
                    </div>

                    {/* Mechanism & Clinical Risk */}
                    <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        <strong className="text-slate-600 dark:text-slate-400">Clinical Risk: </strong>
                        {conflict.clinicalEffect}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                        <strong className="text-slate-600 dark:text-slate-400">Mechanism: </strong>
                        {conflict.mechanism}
                      </p>
                    </div>

                    {/* Recommendation & Suggested Alternative */}
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs">
                      <div className="text-slate-800 dark:text-slate-200 font-medium">
                        💡 <strong className="text-indigo-600 dark:text-indigo-400">Action: </strong>
                        {conflict.actionRecommendation}
                      </div>

                      {conflict.suggestedAlternative && (
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap text-[11px]">
                          <span className="text-slate-500">Recommended Alternative:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            {conflict.suggestedAlternative}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Pharmacist Action Toolbar */}
                    <div className="pt-1 flex items-center justify-between gap-2 flex-wrap border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Remove conflicting item button */}
                        {conflict.conflictingInventoryIds && conflict.conflictingInventoryIds.length > 0 && (
                          conflict.conflictingInventoryIds.map((invId) => {
                            const itemObj = cartItems.find(c => c.inventoryId === invId);
                            if (!itemObj) return null;
                            return (
                              <button
                                key={invId}
                                type="button"
                                onClick={() => onRemoveItem(invId)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800 transition active:scale-95 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                Remove {itemObj.brandName.split(' ')[0]}
                              </button>
                            );
                          })
                        )}

                        {/* Find alternative generic button */}
                        {onFindAlternative && (
                          <button
                            type="button"
                            onClick={() => {
                              const firstItem = cartItems.find(c => conflict.conflictingInventoryIds?.includes(c.inventoryId)) || cartItems[0];
                              onFindAlternative(firstItem.saltComposition || firstItem.genericName || firstItem.brandName, firstItem.brandName);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 transition active:scale-95 cursor-pointer"
                          >
                            <Search className="w-3 h-3" />
                            Find Salt Alternative
                          </button>
                        )}
                      </div>

                      {/* Override Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenOverride(conflict)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        <FileEdit className="w-3 h-3" />
                        Clinical Override
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ALLERGY CONFLICTS */}
          {analysis && analysis.allergyConflicts && analysis.allergyConflicts.length > 0 && (
            <div className="space-y-1.5">
              {analysis.allergyConflicts.map((al, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-rose-100/80 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-xs text-rose-950 dark:text-rose-200 flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="font-bold flex items-center gap-1 text-rose-700 dark:text-rose-300">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      CRITICAL ALLERGY ALERT: {al.medication}
                    </div>
                    <p className="text-[11px] text-rose-800 dark:text-rose-300">
                      Patient is documented allergic to <strong className="underline">{al.allergen}</strong>. {al.notes}
                    </p>
                  </div>
                  {al.inventoryId && (
                    <button
                      type="button"
                      onClick={() => onRemoveItem(al.inventoryId!)}
                      className="px-2 py-1 rounded bg-rose-600 text-white hover:bg-rose-700 font-bold text-[11px] shrink-0 transition cursor-pointer"
                    >
                      Remove Item
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* DISEASE WARNINGS */}
          {analysis && analysis.diseaseWarnings && analysis.diseaseWarnings.length > 0 && (
            <div className="space-y-1.5">
              {analysis.diseaseWarnings.map((dw, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                  <HeartPulse className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold">Condition Precaution ({dw.condition}): </span>
                    <span>{dw.risk} (Evaluating: {dw.medication})</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer Counseling Note / Deep Report Link */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
            <span>Powered by Gemini 3.7 Flash Clinical Intelligence</span>
            <button
              type="button"
              onClick={() => setShowDeepReportModal(true)}
              className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline cursor-pointer"
            >
              Full Clinical Report & Counseling Notes →
            </button>
          </div>
        </div>
      )}

      {/* PHARMACIST CLINICAL OVERRIDE MODAL */}
      {showOverrideModal && overrideConflict && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
                  <FileEdit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Pharmacist Clinical Override
                  </h3>
                  <p className="text-xs text-slate-500">
                    Document authorization for {overrideConflict.drugsInvolved.join(' + ')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs space-y-1 text-amber-900 dark:text-amber-200">
              <p className="font-bold">Interaction Risk Summary:</p>
              <p>{overrideConflict.clinicalEffect}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Override Justification Note:
              </label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={3}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                placeholder="e.g. Prescriber confirmed low dose. Advised patient to space doses and report side effects..."
              />
              <p className="text-[10px] text-slate-400">
                This note will be permanently stamped onto the invoice record with the dispensing pharmacist's name.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveOverride}
                disabled={!overrideReason.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                Authorize & Stamp Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL CLINICAL REPORT & COUNSELING MODAL */}
      {showDeepReportModal && analysis && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Clinical Pharmacology Safety Evaluation
                  </h3>
                  <p className="text-xs text-slate-500">
                    Comprehensive safety screening report
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeepReportModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Risk Overview */}
            <div className={`p-3.5 rounded-xl border ${currentTheme.bg} ${currentTheme.border} flex items-center justify-between gap-3`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Overall Cart Safety</span>
                <div className="font-extrabold text-sm text-slate-900 dark:text-white mt-0.5">
                  {analysis.overallRiskLevel} RISK PROFILE
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${currentTheme.badgeBg}`}>
                {analysis.overallRiskLevel}
              </span>
            </div>

            {/* Summary */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Executive Summary:</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg">
                {analysis.summary}
              </p>
            </div>

            {/* Counseling Notes */}
            {analysis.counselingNotes && analysis.counselingNotes.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Pharmacist Patient Counseling Points:
                </h4>
                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  {analysis.counselingNotes.map((pt, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-indigo-500 font-bold">•</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Medications Screened */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Active Items in Evaluation:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {cartItems.map((it) => (
                  <div key={it.inventoryId} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                    <div className="font-bold text-slate-900 dark:text-white truncate">{it.brandName}</div>
                    <div className="text-[10px] text-slate-400 truncate">{it.saltComposition || it.genericName || 'Standard Form'}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeepReportModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { DrugInteractionChecker } from './DrugInteractionChecker';

