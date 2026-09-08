import { MedicationInventory } from '../types/pharmacy';

export interface ParsedSaltProfile {
  raw: string;
  molecules: string[];
  strengths: string[];
  signature: string;
}

/**
 * Normalizes and extracts active chemical molecules and strength dosages
 * from complex pharmaceutical salt strings (e.g., "Paracetamol IP 650mg", "Paracetamol (Acetaminophen) 650mg").
 */
export function parseSaltProfile(saltRaw: string, strengthFallback?: string): ParsedSaltProfile {
  const raw = (saltRaw || strengthFallback || '').trim();
  if (!raw) {
    return { raw: '', molecules: [], strengths: [], signature: '' };
  }

  let text = raw.toLowerCase();

  // Normalize pharmacological synonyms
  text = text.replace(/\bacetaminophen\b/gi, 'paracetamol');

  // Strip pharmacopoeia standards
  text = text.replace(/\b(ip|bp|usp|ep|jp)\b/gi, ' ');

  // Strip dosage form words
  text = text.replace(/\b(tablets?|capsules?|syrups?|injections?|suspensions?|solutions?|drops?|oral|fast\s+release|extended\s+release|prolonged\s+release|sustained\s+release|film\s+coated|er|sr|cr|xr|dr|ir)\b/gi, ' ');

  // Strip standard pharmaceutical carrier salts that don't alter bioequivalent clinical substitution
  text = text.replace(/\b(sodium|calcium|potassium|hydrochloride|hcl|maleate|tartrate|succinate|phosphate|hydrate|trihydrate|dihydrate|monohydrate|fumarate|mesylate)\b/gi, ' ');

  // Extract all dosage strengths (e.g., 650mg, 500mg, 125mg, 40mg, 20mcg, 100iu)
  const strengthMatches = text.match(/\d+(\.\d+)?\s*(mg|mcg|g|iu|ml|units?|%)/gi) || [];
  const strengths = strengthMatches
    .map(s => s.replace(/\s+/g, '').toLowerCase())
    .sort();

  // If no strengths found in the salt string, inspect fallback strength (e.g. "650 mg")
  if (strengths.length === 0 && strengthFallback) {
    const fbMatches = strengthFallback.toLowerCase().match(/\d+(\.\d+)?\s*(mg|mcg|g|iu|ml|units?|%)/gi) || [];
    strengths.push(...fbMatches.map(s => s.replace(/\s+/g, '').toLowerCase()));
    strengths.sort();
  }

  // Extract core active ingredient chemical tokens (words >= 3 chars, ignoring numbers and units)
  const textWithoutStrengths = text
    .replace(/\d+(\.\d+)?\s*(mg|mcg|g|iu|ml|units?|%)/gi, ' ')
    .replace(/[^a-z\s]/g, ' ');

  const molecules = textWithoutStrengths
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length >= 3 && !['and', 'with', 'plus', 'for', 'tabs', 'caps'].includes(w));

  const uniqueMolecules = Array.from(new Set(molecules)).sort();
  const uniqueStrengths = Array.from(new Set(strengths)).sort();

  const signature = `${uniqueMolecules.join('+')}@${uniqueStrengths.join('+')}`;

  return {
    raw,
    molecules: uniqueMolecules,
    strengths: uniqueStrengths,
    signature
  };
}

/**
 * Checks if two salt profiles share the EXACT same generic active salt and strength.
 */
export function areSaltsBioequivalent(profileA: ParsedSaltProfile, profileB: ParsedSaltProfile): boolean {
  if (!profileA.molecules.length || !profileB.molecules.length) {
    return false;
  }

  // Exact signature match
  if (profileA.signature && profileA.signature === profileB.signature) {
    return true;
  }

  // Active chemical molecules must match exactly
  if (profileA.molecules.length !== profileB.molecules.length) {
    return false;
  }

  const moleculesMatch = profileA.molecules.every((m, idx) => m === profileB.molecules[idx]);
  if (!moleculesMatch) {
    return false;
  }

  // If strengths are declared, they must match exactly to guarantee safe clinical dosage substitution
  if (profileA.strengths.length > 0 && profileB.strengths.length > 0) {
    if (profileA.strengths.length !== profileB.strengths.length) {
      return false;
    }
    return profileA.strengths.every((s, idx) => s === profileB.strengths[idx]);
  }

  // If neither or only one has strength explicitly parsed, molecule match applies
  return true;
}

/**
 * Finds all in-stock medicines in the store inventory that share the EXACT same generic salt/strength,
 * excluding the currently selected medicine.
 */
export function findExactSaltSubstitutes(
  targetItem: MedicationInventory | null | undefined,
  inventory: MedicationInventory[],
  options: { requireInStock?: boolean } = { requireInStock: true }
): MedicationInventory[] {
  if (!targetItem) return [];

  const targetSalt = targetItem.saltComposition || targetItem.genericName || '';
  const targetProfile = parseSaltProfile(targetSalt, targetItem.strength);

  if (!targetProfile.molecules.length && !targetSalt.trim()) {
    return [];
  }

  const requireInStock = options.requireInStock ?? true;

  const matches = inventory.filter(item => {
    // Exclude the currently selected medicine
    if (item.id === targetItem.id) return false;
    if (item.quarantined) return false;

    // Filter in-stock alternatives
    if (requireInStock && (item.stockQuantity || 0) <= 0) {
      return false;
    }

    const candidateSalt = item.saltComposition || item.genericName || '';
    const candidateProfile = parseSaltProfile(candidateSalt, item.strength);

    return areSaltsBioequivalent(targetProfile, candidateProfile);
  });

  // Sort matched alternatives:
  // 1. In-stock highest stock quantity first
  // 2. Lowest MRP first (cost savings for patient)
  return matches.sort((a, b) => {
    if (b.stockQuantity !== a.stockQuantity) {
      return b.stockQuantity - a.stockQuantity;
    }
    return a.mrp - b.mrp;
  });
}

/**
 * Returns a standardized location badge display string for a medicine (e.g., "Rack B-2 • Bin 04").
 */
export function getStandardLocationDisplay(item: MedicationInventory): string {
  if (item.locationShelf && item.locationShelf.trim()) {
    return item.locationShelf.trim();
  }

  const rack = item.rackNumber || 'Rack A';
  const row = item.shelfRow || '1';
  const bin = item.boxBin || 'Bin 01';

  return `${rack}-${row} • ${bin}`;
}
