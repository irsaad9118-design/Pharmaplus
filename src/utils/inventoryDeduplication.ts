import { MedicationInventory, InventoryBatch } from '../types/pharmacy';

/**
 * Normalizes medicine names for clean comparison (lowercased, punctuation-tolerant, condensed whitespace).
 */
export function normalizeMedName(str: string = ''): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[-_.,/()+\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts alphanumeric core of a medicine name (ignoring spaces and symbols).
 */
export function getAlphaNumericCore(str: string = ''): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Checks whether an incoming medicine record matches an existing inventory item.
 * Evaluates brand name, strength, dosage form, and salt composition.
 */
export function isMatchingMedicine(
  existing: MedicationInventory,
  incoming: {
    brandName: string;
    genericName?: string;
    saltComposition?: string;
    strength?: string;
    dosageForm?: string;
    ndc?: string;
  }
): boolean {
  if (!incoming.brandName?.trim()) return false;

  const existingBrandNorm = normalizeMedName(existing.brandName);
  const incomingBrandNorm = normalizeMedName(incoming.brandName);

  // 1. Exact normalized brand match
  if (existingBrandNorm === incomingBrandNorm) {
    // If incoming specified dosage form and it differs, check strength
    if (incoming.dosageForm && existing.dosageForm) {
      if (incoming.dosageForm.toLowerCase() !== existing.dosageForm.toLowerCase()) {
        return false;
      }
    }
    return true;
  }

  // 2. Alphanumeric core match (e.g. "Dolo-650" vs "Dolo 650" vs "DOLO650")
  const existingCore = getAlphaNumericCore(existing.brandName);
  const incomingCore = getAlphaNumericCore(incoming.brandName);
  if (existingCore.length >= 3 && existingCore === incomingCore) {
    return true;
  }

  // 3. Brand match when strength is omitted from one name but provided in strength field
  // e.g., existing: "Dolo 650" (strength: "650mg"), incoming: "Dolo" with strength: "650mg"
  const incomingStrength = normalizeMedName(incoming.strength || '');
  const existingStrength = normalizeMedName(existing.strength || '');
  
  if (incomingStrength && (existingStrength === incomingStrength || existingBrandNorm.includes(incomingStrength))) {
    const existingBase = existingBrandNorm.replace(incomingStrength, '').replace(/[0-9mg\s]/g, '').trim();
    const incomingBase = incomingBrandNorm.replace(incomingStrength, '').replace(/[0-9mg\s]/g, '').trim();
    if (existingBase.length >= 3 && existingBase === incomingBase) {
      return true;
    }
  }

  // 4. Identical Salt Composition AND Strength AND Dosage Form
  const incomingSalt = normalizeMedName(incoming.saltComposition || incoming.genericName || '');
  const existingSalt = normalizeMedName(existing.saltComposition || existing.genericName || '');

  if (incomingSalt && existingSalt && incomingSalt.length >= 4 && incomingSalt === existingSalt) {
    if (incomingStrength && existingStrength && incomingStrength === existingStrength) {
      if (!incoming.dosageForm || !existing.dosageForm || incoming.dosageForm.toLowerCase() === existing.dosageForm.toLowerCase()) {
        return true;
      }
    }
  }

  // 5. Valid matching NDC if present
  if (incoming.ndc && existing.ndc && incoming.ndc !== '00000-000-00' && incoming.ndc === existing.ndc) {
    return true;
  }

  return false;
}

/**
 * Finds an existing inventory match for an incoming item.
 */
export function findExistingInventoryMatch(
  inventory: MedicationInventory[],
  incoming: {
    brandName: string;
    genericName?: string;
    saltComposition?: string;
    strength?: string;
    dosageForm?: string;
    ndc?: string;
  },
  excludeId?: string
): MedicationInventory | undefined {
  return inventory.find(item => {
    if (excludeId && item.id === excludeId) return false;
    return isMatchingMedicine(item, incoming);
  });
}

export interface MergeResult {
  mergedItem: MedicationInventory;
  addedStock: number;
  previousStock: number;
  newStock: number;
  isNewBatchAdded: boolean;
  batchNumber: string;
  batchCount: number;
}

/**
 * Merges an incoming medicine entry into an existing inventory record.
 * Supports smart multi-batch logic:
 * - If incoming batch number matches an existing batch, automatically increments that batch's stock.
 * - If incoming batch number is different (e.g. new stock with later expiry), attaches it as a secondary batch
 *   under the same parent medicine record rather than creating a duplicate table row.
 */
export function mergeInventoryItem(
  existing: MedicationInventory,
  incoming: Partial<MedicationInventory> & { brandName: string }
): MergeResult {
  const previousStock = Number(existing.stockQuantity) || 0;
  const addedStock = incoming.stockQuantity !== undefined ? Math.max(0, Number(incoming.stockQuantity)) : 0;
  const newStock = previousStock + addedStock;

  const rack = incoming.rackNumber || existing.rackNumber || 'Rack A';
  const shelf = incoming.shelfRow || existing.shelfRow || 'Shelf 1';
  const bin = incoming.boxBin || existing.boxBin || 'Bin 01';
  const locationShelf = incoming.locationShelf || `${rack}-${shelf.replace(/[^0-9]/g, '') || '1'} • ${bin}`;

  // Initialize or clone batches array
  let batches: InventoryBatch[] = existing.batches && existing.batches.length > 0
    ? existing.batches.map(b => ({ ...b }))
    : [
        {
          id: `batch-${existing.id}-primary`,
          batchNumber: existing.batchNumber?.trim() || 'BT-101',
          expirationDate: existing.expirationDate?.trim() || '2027-12-31',
          mfgDate: existing.mfgDate?.trim() || existing.manufacturingDate?.trim() || '2025-01-01',
          stockQuantity: previousStock,
          mrp: existing.mrp,
          purchaseRate: existing.purchaseRate,
          addedAt: existing.mfgDate || new Date().toISOString(),
          isSecondary: false
        }
      ];

  const incomingBatchNo = incoming.batchNumber?.trim();
  let isNewBatchAdded = false;
  let activeBatchNo = existing.batchNumber;

  if (incomingBatchNo) {
    // Check if batch number matches an existing batch (case-insensitive normalized)
    const existingBatchIndex = batches.findIndex(
      b => normalizeMedName(b.batchNumber) === normalizeMedName(incomingBatchNo)
    );

    if (existingBatchIndex >= 0) {
      // 1. Same Batch Number matched: automatically increment stock quantity of this batch
      const targetBatch = batches[existingBatchIndex];
      batches[existingBatchIndex] = {
        ...targetBatch,
        stockQuantity: (Number(targetBatch.stockQuantity) || 0) + addedStock,
        expirationDate: incoming.expirationDate?.trim() || targetBatch.expirationDate,
        mrp: incoming.mrp !== undefined && incoming.mrp > 0 ? Number(incoming.mrp) : targetBatch.mrp,
        purchaseRate: incoming.purchaseRate !== undefined && incoming.purchaseRate > 0 ? Number(incoming.purchaseRate) : targetBatch.purchaseRate
      };
      activeBatchNo = batches[existingBatchIndex].batchNumber;
      isNewBatchAdded = false;
    } else {
      // 2. Different Batch Number: attach as a secondary batch under the parent record
      const newBatch: InventoryBatch = {
        id: `batch-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        batchNumber: incomingBatchNo,
        expirationDate: incoming.expirationDate?.trim() || existing.expirationDate,
        mfgDate: incoming.mfgDate?.trim() || incoming.manufacturingDate?.trim() || existing.mfgDate,
        stockQuantity: addedStock,
        mrp: incoming.mrp !== undefined && incoming.mrp > 0 ? Number(incoming.mrp) : existing.mrp,
        purchaseRate: incoming.purchaseRate !== undefined && incoming.purchaseRate > 0 ? Number(incoming.purchaseRate) : existing.purchaseRate,
        addedAt: new Date().toISOString(),
        isSecondary: true
      };
      batches.push(newBatch);
      activeBatchNo = newBatch.batchNumber;
      isNewBatchAdded = true;
    }
  } else {
    // No explicit batch number on incoming: increment the first/primary batch
    if (batches.length > 0) {
      batches[0] = {
        ...batches[0],
        stockQuantity: (Number(batches[0].stockQuantity) || 0) + addedStock
      };
      activeBatchNo = batches[0].batchNumber;
    }
  }

  // Calculate authoritative total stock across all batches
  const computedTotalStock = batches.reduce((sum, b) => sum + (Number(b.stockQuantity) || 0), 0);
  const finalStock = Math.max(newStock, computedTotalStock);

  // Determine active display batch: prefer earliest expiring batch that still has stock > 0 (FEFO)
  const activeBatchesWithStock = batches.filter(b => (Number(b.stockQuantity) || 0) > 0);
  const sortedBatches = (activeBatchesWithStock.length > 0 ? activeBatchesWithStock : batches).slice().sort((a, b) => {
    return new Date(a.expirationDate || '2099-12-31').getTime() - new Date(b.expirationDate || '2099-12-31').getTime();
  });
  const primaryDisplayBatch = sortedBatches[0] || batches[0];

  const mergedItem: MedicationInventory = {
    ...existing,
    // Add new quantity to current stock
    stockQuantity: finalStock,
    // Update active display batch number and expiry
    batchNumber: primaryDisplayBatch ? primaryDisplayBatch.batchNumber : (incomingBatchNo || existing.batchNumber),
    expirationDate: primaryDisplayBatch ? primaryDisplayBatch.expirationDate : (incoming.expirationDate?.trim() || existing.expirationDate),
    mfgDate: incoming.mfgDate?.trim() || existing.mfgDate,
    manufacturingDate: incoming.manufacturingDate?.trim() || existing.manufacturingDate,
    // Multi-batch inventory array
    batches: batches,
    // Update rates if specified and positive
    purchaseRate: incoming.purchaseRate !== undefined && incoming.purchaseRate > 0 ? Number(incoming.purchaseRate) : existing.purchaseRate,
    costPrice: incoming.costPrice !== undefined && incoming.costPrice > 0 ? Number(incoming.costPrice) : (incoming.purchaseRate !== undefined && incoming.purchaseRate > 0 ? Number(incoming.purchaseRate) : existing.costPrice),
    mrp: incoming.mrp !== undefined && incoming.mrp > 0 ? Number(incoming.mrp) : existing.mrp,
    sellingPrice: incoming.sellingPrice !== undefined && incoming.sellingPrice > 0 ? Number(incoming.sellingPrice) : (incoming.mrp !== undefined && incoming.mrp > 0 ? Number(incoming.mrp) : existing.sellingPrice),
    // Update physical location
    rackNumber: rack,
    shelfRow: shelf,
    boxBin: bin,
    locationShelf: locationShelf,
    // Update supplier/manufacturer if incoming provided
    supplierName: incoming.supplierName?.trim() ? incoming.supplierName.trim() : existing.supplierName,
    supplierContact: incoming.supplierContact?.trim() ? incoming.supplierContact.trim() : existing.supplierContact,
    manufacturer: incoming.manufacturer?.trim() ? incoming.manufacturer.trim() : existing.manufacturer,
    storageCondition: incoming.storageCondition || existing.storageCondition,
    // Update gst/hsn if provided
    gstRate: incoming.gstRate !== undefined ? Number(incoming.gstRate) : existing.gstRate,
    hsnCode: incoming.hsnCode?.trim() ? incoming.hsnCode.trim() : existing.hsnCode,
    unit: incoming.unit?.trim() ? incoming.unit.trim() : existing.unit,
    packSize: incoming.packSize !== undefined ? Number(incoming.packSize) : existing.packSize,
    reorderLevel: incoming.reorderLevel !== undefined ? Number(incoming.reorderLevel) : existing.reorderLevel,
    minAlertLevel: incoming.minAlertLevel !== undefined ? Number(incoming.minAlertLevel) : existing.minAlertLevel
  };

  return {
    mergedItem,
    addedStock,
    previousStock,
    newStock: finalStock,
    isNewBatchAdded,
    batchNumber: activeBatchNo,
    batchCount: batches.length
  };
}

/**
 * Deduplicates an entire inventory list into unified master records.
 * If multiple items have matching identity, merges their stocks and retains the latest batch & pricing.
 */
export function deduplicateMasterInventory(items: MedicationInventory[]): MedicationInventory[] {
  const unifiedMap = new Map<string, MedicationInventory>();

  for (const item of items) {
    if (!item || !item.brandName) continue;

    // Find if already present in unified map
    let foundKey: string | null = null;
    for (const [key, existing] of unifiedMap.entries()) {
      if (item.id === existing.id || isMatchingMedicine(existing, item)) {
        foundKey = key;
        break;
      }
    }

    if (foundKey) {
      const existing = unifiedMap.get(foundKey)!;
      // Merge into existing
      const { mergedItem } = mergeInventoryItem(existing, item);
      unifiedMap.set(foundKey, mergedItem);
    } else {
      unifiedMap.set(item.id, { ...item });
    }
  }

  return Array.from(unifiedMap.values());
}
