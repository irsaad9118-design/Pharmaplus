import { MedicationInventory, PointOfSaleTransaction } from '../types/pharmacy';

export interface ItemReorderForecast {
  inventoryId: string;
  brandName: string;
  genericName: string;
  saltComposition: string;
  packSize: number;
  unit: string;
  currentStock: number;
  minAlertLevel: number;
  reorderLevel: number;
  purchaseRate: number;
  supplierName: string;
  supplierContact: string;
  locationShelf: string;

  // Consumption analysis metrics
  totalUnitsSold30d: number;
  totalUnitsSoldAllTime: number;
  salesTransactionCount: number;
  averageDailySales: number; // units per day
  monthlyRunRate: number; // units per 30 days
  daysOfStockRemaining: number; // runway in days
  confidence: 'high' | 'medium' | 'baseline';

  // Lead time and reorder schedule
  supplierLeadTimeDays: number;
  safetyStockDays: number;
  daysUntilReorder: number; // daysOfStockRemaining - supplierLeadTimeDays
  suggestedReorderDate: string; // YYYY-MM-DD
  suggestedReorderDateFormatted: string;
  stockoutDate: string; // YYYY-MM-DD

  // Urgency classification
  urgencyStatus: 'out_of_stock' | 'urgent' | 'soon' | 'upcoming' | 'healthy' | 'overstocked';
  urgencyLabel: string;

  // Replenishment recommendation
  suggestedOrderQty: number; // in units
  suggestedOrderPacks: number; // in packs/strips
  estimatedOrderCost: number; // INR ₹
}

export interface ReorderRadarSummary {
  totalItemsTracked: number;
  outOfStockCount: number;
  urgentReorderCount: number; // <= 3 days
  upcomingReorderCount: number; // 4 - 7 days
  reorderThisMonthCount: number; // <= 30 days
  totalCapitalRequired: number; // INR ₹
}

export interface ReorderForecastOptions {
  simulationDate?: string;
  defaultLeadTimeDays?: number;
  defaultSafetyStockDays?: number;
  analysisWindowDays?: number;
}

const DEFAULT_SIMULATION_DATE = '2026-09-06';
const DEFAULT_LEAD_TIME_DAYS = 3;
const DEFAULT_SAFETY_STOCK_DAYS = 5;

/**
 * Format date string (YYYY-MM-DD) into readable format (e.g., "09 Sep 2026")
 */
export function formatReorderDateDisplay(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Add days to a YYYY-MM-DD date string and return YYYY-MM-DD
 */
export function addDaysToDateString(baseDateStr: string, daysToAdd: number): string {
  try {
    const [y, m, d] = baseDateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + Math.round(daysToAdd));
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return baseDateStr;
  }
}

/**
 * Calculates historical consumption rate and suggested reorder date for a single inventory item
 */
export function calculateItemReorderForecast(
  item: MedicationInventory,
  transactions: PointOfSaleTransaction[],
  options: ReorderForecastOptions = {}
): ItemReorderForecast {
  const simulationDate = options.simulationDate || DEFAULT_SIMULATION_DATE;
  const leadTimeDays = options.defaultLeadTimeDays ?? DEFAULT_LEAD_TIME_DAYS;
  const safetyStockDays = options.defaultSafetyStockDays ?? DEFAULT_SAFETY_STOCK_DAYS;
  const windowDays = options.analysisWindowDays ?? 30;

  const currentStock = Math.max(0, item.stockQuantity ?? 0);
  const packSize = Math.max(1, item.packSize || 10);
  const purchaseRate = item.purchaseRate || item.costPrice || 0;
  const minAlertLevel = item.minAlertLevel || item.reorderLevel || 10;
  const reorderLevel = item.reorderLevel || minAlertLevel;

  // Normalize matching keys
  const itemId = item.id;
  const itemBrandLower = (item.brandName || '').trim().toLowerCase();
  const itemSaltLower = (item.saltComposition || item.genericName || '').trim().toLowerCase();

  // Aggregate units sold from historical transactions
  let totalUnitsSold30d = 0;
  let totalUnitsSoldAllTime = 0;
  let salesTransactionCount = 0;

  // Calculate 30-day cutoff date from simulationDate
  const cutoffDate30d = addDaysToDateString(simulationDate, -windowDays);

  transactions.forEach(tx => {
    const txDate = (tx.timestamp || '').slice(0, 10);
    const isWithin30d = txDate >= cutoffDate30d && txDate <= simulationDate;

    let matchedInTx = false;

    (tx.items || []).forEach(billItem => {
      const billItemId = billItem.inventoryId;
      const billItemBrand = (billItem.brandName || billItem.medicationName || '').trim().toLowerCase();

      // Check if this line item matches our medication
      const isMatch = 
        (billItemId && billItemId === itemId) ||
        (billItemBrand && (billItemBrand === itemBrandLower || billItemBrand.includes(itemBrandLower) || itemBrandLower.includes(billItemBrand)));

      if (isMatch) {
        const qty = billItem.quantity || 1;
        totalUnitsSoldAllTime += qty;
        if (isWithin30d) {
          totalUnitsSold30d += qty;
        }
        matchedInTx = true;
      }
    });

    if (matchedInTx) {
      salesTransactionCount += 1;
    }
  });

  // Calculate Average Daily Sales (ADS)
  let averageDailySales = 0;
  let confidence: ItemReorderForecast['confidence'] = 'high';

  if (totalUnitsSold30d > 0) {
    // Measured velocity over 30 days
    averageDailySales = Number((totalUnitsSold30d / windowDays).toFixed(2));
    confidence = totalUnitsSold30d >= 10 ? 'high' : 'medium';
  } else if (totalUnitsSoldAllTime > 0) {
    // If no sales in last 30 days but all-time sales exist
    averageDailySales = Number((totalUnitsSoldAllTime / 60).toFixed(2));
    confidence = 'medium';
  } else {
    // If item has no recorded POS transactions, estimate baseline consumption rate based on safety reorder level
    // A standard pharmacy assumes minimum inventory turns over in 45-60 days
    const estimatedDailyRate = Math.max(0.2, Number(((minAlertLevel || 20) / 45).toFixed(2)));
    averageDailySales = estimatedDailyRate;
    confidence = 'baseline';
  }

  // Ensure reasonable lower bound for non-zero consumption
  averageDailySales = Math.max(0.1, averageDailySales);
  const monthlyRunRate = Math.round(averageDailySales * 30);

  // Runway in days
  const daysOfStockRemaining = currentStock === 0 ? 0 : Math.floor(currentStock / averageDailySales);

  // Stockout Date
  const stockoutDate = addDaysToDateString(simulationDate, daysOfStockRemaining);

  // Reorder Trigger Point: Order before stock hits safety stock or runs out within lead time
  // Reorder must happen (leadTimeDays) before stockout
  const daysUntilReorder = Math.max(0, daysOfStockRemaining - leadTimeDays);

  // Determine suggested reorder date
  let suggestedReorderDate = simulationDate;
  let urgencyStatus: ItemReorderForecast['urgencyStatus'] = 'healthy';
  let urgencyLabel = 'Sufficient Stock';

  if (currentStock === 0) {
    urgencyStatus = 'out_of_stock';
    urgencyLabel = 'Out of Stock • Reorder Now';
    suggestedReorderDate = simulationDate;
  } else if (currentStock <= minAlertLevel || daysUntilReorder <= 0) {
    urgencyStatus = 'urgent';
    urgencyLabel = 'Immediate Action • Today';
    suggestedReorderDate = simulationDate;
  } else if (daysUntilReorder <= 3) {
    urgencyStatus = 'urgent';
    urgencyLabel = `Critical • Reorder in ${daysUntilReorder}d`;
    suggestedReorderDate = addDaysToDateString(simulationDate, daysUntilReorder);
  } else if (daysUntilReorder <= 7) {
    urgencyStatus = 'soon';
    urgencyLabel = `Reorder in ${daysUntilReorder} days`;
    suggestedReorderDate = addDaysToDateString(simulationDate, daysUntilReorder);
  } else if (daysUntilReorder <= 30) {
    urgencyStatus = 'upcoming';
    urgencyLabel = `Reorder in ${daysUntilReorder} days`;
    suggestedReorderDate = addDaysToDateString(simulationDate, daysUntilReorder);
  } else if (daysOfStockRemaining > 90) {
    urgencyStatus = 'overstocked';
    urgencyLabel = `Overstocked • ${daysOfStockRemaining}d runway`;
    suggestedReorderDate = addDaysToDateString(simulationDate, daysUntilReorder);
  } else {
    urgencyStatus = 'healthy';
    urgencyLabel = `Healthy • Reorder in ${daysUntilReorder}d`;
    suggestedReorderDate = addDaysToDateString(simulationDate, daysUntilReorder);
  }

  // Format Reorder Date Display
  let suggestedReorderDateFormatted = formatReorderDateDisplay(suggestedReorderDate);
  if (suggestedReorderDate === simulationDate) {
    suggestedReorderDateFormatted = 'Today (Immediate)';
  } else {
    suggestedReorderDateFormatted = `${formatReorderDateDisplay(suggestedReorderDate)} (in ${daysUntilReorder}d)`;
  }

  // Suggested Reorder Quantity:
  // Target Stock = (30 days cycle stock) + (safetyStockDays buffer)
  const targetStock = Math.ceil(averageDailySales * (30 + safetyStockDays));
  const shortfall = Math.max(0, targetStock - currentStock);
  const minBatch = Math.max(packSize, reorderLevel);
  
  // Calculate recommended units rounded up to packSize multiples
  let suggestedOrderQty = Math.max(minBatch, shortfall);
  const remainder = suggestedOrderQty % packSize;
  if (remainder > 0) {
    suggestedOrderQty += (packSize - remainder);
  }
  const suggestedOrderPacks = Math.ceil(suggestedOrderQty / packSize);
  const estimatedOrderCost = suggestedOrderQty * purchaseRate;

  return {
    inventoryId: item.id,
    brandName: item.brandName,
    genericName: item.genericName,
    saltComposition: item.saltComposition,
    packSize,
    unit: item.unit,
    currentStock,
    minAlertLevel,
    reorderLevel,
    purchaseRate,
    supplierName: item.supplierName || 'Primary Distributor',
    supplierContact: item.supplierContact || '+91 (800) 555-0199',
    locationShelf: item.locationShelf || `${item.rackNumber || 'R-1'}/${item.shelfRow || 'S-1'}`,
    totalUnitsSold30d,
    totalUnitsSoldAllTime,
    salesTransactionCount,
    averageDailySales,
    monthlyRunRate,
    daysOfStockRemaining,
    confidence,
    supplierLeadTimeDays: leadTimeDays,
    safetyStockDays,
    daysUntilReorder,
    suggestedReorderDate,
    suggestedReorderDateFormatted,
    stockoutDate,
    urgencyStatus,
    urgencyLabel,
    suggestedOrderQty,
    suggestedOrderPacks,
    estimatedOrderCost
  };
}

/**
 * Calculates forecasts for all medicines in inventory
 */
export function calculateAllInventoryReorderForecasts(
  inventory: MedicationInventory[],
  transactions: PointOfSaleTransaction[],
  options: ReorderForecastOptions = {}
): Map<string, ItemReorderForecast> {
  const forecastMap = new Map<string, ItemReorderForecast>();

  inventory.forEach(item => {
    const forecast = calculateItemReorderForecast(item, transactions, options);
    forecastMap.set(item.id, forecast);
  });

  return forecastMap;
}

/**
 * Computes high-level radar metrics across all items
 */
export function getReorderRadarMetrics(
  forecastMap: Map<string, ItemReorderForecast>
): ReorderRadarSummary {
  let outOfStockCount = 0;
  let urgentReorderCount = 0;
  let upcomingReorderCount = 0;
  let reorderThisMonthCount = 0;
  let totalCapitalRequired = 0;

  forecastMap.forEach(f => {
    if (f.currentStock === 0) {
      outOfStockCount += 1;
      urgentReorderCount += 1;
      totalCapitalRequired += f.estimatedOrderCost;
    } else if (f.daysUntilReorder <= 3) {
      urgentReorderCount += 1;
      totalCapitalRequired += f.estimatedOrderCost;
    } else if (f.daysUntilReorder <= 7) {
      upcomingReorderCount += 1;
      totalCapitalRequired += f.estimatedOrderCost;
    }

    if (f.daysUntilReorder <= 30) {
      reorderThisMonthCount += 1;
    }
  });

  return {
    totalItemsTracked: forecastMap.size,
    outOfStockCount,
    urgentReorderCount,
    upcomingReorderCount,
    reorderThisMonthCount,
    totalCapitalRequired
  };
}
