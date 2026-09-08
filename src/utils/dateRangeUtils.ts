/**
 * Date range calculation and formatting utilities for Pharmacy Reports
 */

export type DateRangePreset = 
  | 'today'
  | 'this_week'
  | 'last_7d'
  | 'this_month'
  | '30d'
  | '90d'
  | '6m'
  | '1y'
  | 'all'
  | 'custom';

export interface DateRangeState {
  preset: DateRangePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  label: string;
  shortLabel: string;
  dayCount: number;
}

export function formatDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const date = new Date(y, m, d);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const date = new Date(y, m, d);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Checks if a target date string (YYYY-MM-DD or ISO timestamp) falls within [startDate, endDate] inclusive
 */
export function isDateInRange(targetDateStr: string, startDate: string, endDate: string): boolean {
  if (!targetDateStr) return false;
  const targetDateOnly = targetDateStr.slice(0, 10);
  if (startDate && targetDateOnly < startDate) return false;
  if (endDate && targetDateOnly > endDate) return false;
  return true;
}

/**
 * Calculates start date, end date, and human-readable label for any preset or custom range
 */
export function calculateDateRange(
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string,
  referenceDate?: Date
): DateRangeState {
  const today = referenceDate ? new Date(referenceDate) : new Date();
  const todayStr = formatDateIso(today);

  let startDate = todayStr;
  let endDate = todayStr;
  let label = 'Today';
  let shortLabel = 'Today';

  switch (preset) {
    case 'today': {
      startDate = todayStr;
      endDate = todayStr;
      label = `Today (${formatDisplayDate(todayStr)})`;
      shortLabel = 'Today';
      break;
    }

    case 'this_week': {
      // Find Monday of the current week (ISO week)
      const day = today.getDay(); // 0 is Sunday, 1 is Monday...
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diffToMonday);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      startDate = formatDateIso(monday);
      endDate = formatDateIso(sunday);
      label = `This Week (${formatShortDate(startDate)} – ${formatShortDate(endDate)})`;
      shortLabel = 'This Week';
      break;
    }

    case 'last_7d': {
      const past7 = new Date(today);
      past7.setDate(today.getDate() - 6);
      startDate = formatDateIso(past7);
      endDate = todayStr;
      label = `Last 7 Days (${formatShortDate(startDate)} – ${formatShortDate(endDate)})`;
      shortLabel = '7 Days';
      break;
    }

    case 'this_month': {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      startDate = formatDateIso(firstDay);
      endDate = formatDateIso(lastDay);
      const monthName = firstDay.toLocaleString('default', { month: 'short', year: 'numeric' });
      label = `This Month (${monthName})`;
      shortLabel = 'This Month';
      break;
    }

    case '30d': {
      const past30 = new Date(today);
      past30.setDate(today.getDate() - 29);
      startDate = formatDateIso(past30);
      endDate = todayStr;
      label = `Last 30 Days (${formatShortDate(startDate)} – ${formatShortDate(endDate)})`;
      shortLabel = '30 Days';
      break;
    }

    case '90d': {
      const past90 = new Date(today);
      past90.setDate(today.getDate() - 89);
      startDate = formatDateIso(past90);
      endDate = todayStr;
      label = `Last 90 Days (${formatShortDate(startDate)} – ${formatShortDate(endDate)})`;
      shortLabel = '90 Days';
      break;
    }

    case '6m': {
      const past6m = new Date(today);
      past6m.setMonth(today.getMonth() - 6);
      startDate = formatDateIso(past6m);
      endDate = todayStr;
      label = `Last 6 Months (${formatShortDate(startDate)} – ${formatShortDate(endDate)})`;
      shortLabel = '6 Months';
      break;
    }

    case '1y': {
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      const endOfYear = new Date(today.getFullYear(), 11, 31);
      startDate = formatDateIso(startOfYear);
      endDate = formatDateIso(endOfYear);
      label = `Year ${today.getFullYear()} (${formatShortDate(startDate)} – ${formatShortDate(endDate)})`;
      shortLabel = `Year ${today.getFullYear()}`;
      break;
    }

    case 'all': {
      startDate = '2025-01-01';
      endDate = '2027-12-31';
      label = 'All Historical Timeline';
      shortLabel = 'All Time';
      break;
    }

    case 'custom': {
      if (customStart && customEnd) {
        // Ensure chronological order
        if (customStart <= customEnd) {
          startDate = customStart;
          endDate = customEnd;
        } else {
          startDate = customEnd;
          endDate = customStart;
        }
      } else if (customStart) {
        startDate = customStart;
        endDate = todayStr;
      } else {
        startDate = todayStr;
        endDate = todayStr;
      }
      label = `Custom Range (${formatShortDate(startDate)} – ${formatShortDate(endDate)})`;
      shortLabel = 'Custom';
      break;
    }
  }

  // Calculate inclusive day count
  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endDate).getTime();
  const diffDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);

  return {
    preset,
    startDate,
    endDate,
    label,
    shortLabel,
    dayCount: diffDays
  };
}
