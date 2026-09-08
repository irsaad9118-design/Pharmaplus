import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar, 
  ChevronDown, 
  X, 
  Check, 
  Clock, 
  ArrowRight,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { 
  DateRangePreset, 
  DateRangeState, 
  calculateDateRange, 
  formatDisplayDate,
  formatDateIso 
} from '../../utils/dateRangeUtils';

interface ReportsDateRangePickerProps {
  value: DateRangeState;
  onChange: (range: DateRangeState) => void;
}

const PRESET_OPTIONS: Array<{ id: DateRangePreset; label: string; desc: string }> = [
  { id: 'today', label: 'Today', desc: 'Current calendar day' },
  { id: 'this_week', label: 'This Week', desc: 'Current week (Mon – Sun)' },
  { id: 'last_7d', label: 'Last 7 Days', desc: 'Rolling 7-day window' },
  { id: 'this_month', label: 'This Month', desc: '1st to current month end' },
  { id: '30d', label: 'Last 30 Days', desc: 'Rolling 30-day window' },
  { id: '90d', label: 'Last 90 Days', desc: 'Rolling quarter (3 months)' },
  { id: '6m', label: 'Last 6 Months', desc: 'Half-year trajectory' },
  { id: '1y', label: 'Year 2026', desc: 'Current calendar year' },
  { id: 'all', label: 'All Time', desc: 'Full historical audit' }
];

export const ReportsDateRangePicker: React.FC<ReportsDateRangePickerProps> = ({
  value,
  onChange
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [customStart, setCustomStart] = useState<string>(value.startDate);
  const [customEnd, setCustomEnd] = useState<string>(value.endDate);
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>(value.preset === 'custom' ? 'custom' : 'presets');
  const [customError, setCustomError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Keep internal custom dates synced with prop value
  useEffect(() => {
    setCustomStart(value.startDate);
    setCustomEnd(value.endDate);
    if (value.preset === 'custom') {
      setActiveTab('custom');
    }
  }, [value]);

  const handleSelectPreset = (preset: DateRangePreset) => {
    const newRange = calculateDateRange(preset);
    onChange(newRange);
    setIsOpen(false);
    setCustomError(null);
  };

  const handleApplyCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customStart || !customEnd) {
      setCustomError('Please specify both start and end dates.');
      return;
    }
    if (customStart > customEnd) {
      setCustomError('Start date must be on or before end date.');
      return;
    }

    const newRange = calculateDateRange('custom', customStart, customEnd);
    onChange(newRange);
    setIsOpen(false);
    setCustomError(null);
  };

  // Quick helper shortcuts for custom tab
  const handleQuickJump = (daysBack: number) => {
    const today = new Date();
    const end = formatDateIso(today);
    const startObj = new Date(today);
    startObj.setDate(today.getDate() - (daysBack - 1));
    const start = formatDateIso(startObj);
    setCustomStart(start);
    setCustomEnd(end);
    setCustomError(null);
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id="reports-date-range-picker-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all flex items-center gap-2 shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/40"
        title="Change dashboard reporting time interval"
      >
        <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
        <span className="font-extrabold text-slate-900 dark:text-white">
          {value.shortLabel}:
        </span>
        <span className="text-slate-600 dark:text-slate-400 font-medium">
          {formatDisplayDate(value.startDate)} – {formatDisplayDate(value.endDate)}
        </span>
        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
          {value.dayCount}d
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div 
          id="reports-date-range-popover"
          className="absolute left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 p-4 space-y-3.5 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Dashboard Time Interval
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'presets'
                  ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Preset Intervals
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'custom'
                  ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Custom Range
            </button>
          </div>

          {/* TAB 1: PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {PRESET_OPTIONS.map(preset => {
                const isSelected = value.preset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 text-teal-950 dark:text-teal-100'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-transparent text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-extrabold flex items-center gap-1.5">
                        {preset.label}
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {preset.desc}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 2: CUSTOM DATE RANGE */}
          {activeTab === 'custom' && (
            <form onSubmit={handleApplyCustom} className="space-y-3">
              {/* Quick Jump Shortcuts */}
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
                  Quick Period Jumps
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Last 14 Days', days: 14 },
                    { label: 'Last 45 Days', days: 45 },
                    { label: 'Last 60 Days', days: 60 }
                  ].map(chip => (
                    <button
                      key={chip.days}
                      type="button"
                      onClick={() => handleQuickJump(chip.days)}
                      className="px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-100 dark:bg-slate-700/70 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start & End Date Inputs */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="reports-custom-start-date"
                    value={customStart}
                    onChange={(e) => {
                      setCustomStart(e.target.value);
                      setCustomError(null);
                    }}
                    className="w-full text-xs font-semibold px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="reports-custom-end-date"
                    value={customEnd}
                    onChange={(e) => {
                      setCustomEnd(e.target.value);
                      setCustomError(null);
                    }}
                    className="w-full text-xs font-semibold px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Validation error if any */}
              {customError && (
                <div className="p-2 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 rounded-lg border border-rose-200 dark:border-rose-900">
                  {customError}
                </div>
              )}

              {/* Date Preview Info */}
              {customStart && customEnd && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Selected Window</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {Math.max(1, Math.round((new Date(customEnd).getTime() - new Date(customStart).getTime()) / (1000 * 60 * 60 * 24)) + 1)} Days
                    </span>
                  </div>
                  <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-1">
                    {formatDisplayDate(customStart)} – {formatDisplayDate(customEnd)}
                  </div>
                </div>
              )}

              {/* Apply Button */}
              <button
                type="submit"
                id="reports-apply-custom-date-btn"
                className="w-full py-2 px-3 text-xs font-black text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>Apply Custom Range</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* Footer note */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-teal-500 shrink-0" />
            <span>All sales, low stock alerts, and batch shelf-life metrics will filter to this interval.</span>
          </div>
        </div>
      )}
    </div>
  );
};
