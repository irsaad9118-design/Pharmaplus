import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { 
  TrendingUp, 
  Clock, 
  Calendar, 
  Zap, 
  Flame, 
  Users, 
  ShoppingBag, 
  ArrowUpRight, 
  Sun, 
  Sunset, 
  Moon, 
  Info,
  CheckCircle2,
  Layers,
  CreditCard,
  IndianRupee,
  FileSpreadsheet
} from 'lucide-react';
import { 
  DailyRevenueData, 
  HourlySalesData, 
  DayOfWeekPerformance, 
  DailyHourlyInsights,
  exportDailyRevenueToAccountingCsv 
} from '../../utils/reportsAnalytics';

interface DailyRevenuePeakHoursChartProps {
  dailyData: DailyRevenueData[];
  hourlyData: HourlySalesData[];
  dayOfWeekData: DayOfWeekPerformance[];
  insights: DailyHourlyInsights;
  shopDetails?: {
    shopName?: string;
    gstin?: string;
    dlNumber?: string;
    phone?: string;
    address?: string;
  };
  onExportDailyAccountingCsv?: (days: number) => void;
}

export const DailyRevenuePeakHoursChart: React.FC<DailyRevenuePeakHoursChartProps> = ({
  dailyData = [],
  hourlyData = [],
  dayOfWeekData = [],
  insights,
  shopDetails,
  onExportDailyAccountingCsv
}) => {
  // Primary Mode: 'daily' (Daily Revenue Trends) vs 'hourly' (Peak Sales Hours) vs 'dow' (Day-of-Week)
  const [activeTab, setActiveTab] = useState<'daily' | 'hourly' | 'dow'>('daily');

  // Daily View Options
  const [timeframeDays, setTimeframeDays] = useState<7 | 14 | 30>(14);
  const [dailyMetricMode, setDailyMetricMode] = useState<'rev_profit' | 'rev_orders' | 'payment_split'>('rev_profit');

  // Hourly View Options
  const [hourlyMetric, setHourlyMetric] = useState<'revenue' | 'orders'>('revenue');

  // Filter daily data based on selected timeframe
  const filteredDailyData = useMemo(() => {
    if (!dailyData || dailyData.length === 0) return [];
    return dailyData.slice(-timeframeDays);
  }, [dailyData, timeframeDays]);

  // Daily statistical metrics for current window
  const dailyStats = useMemo(() => {
    if (filteredDailyData.length === 0) {
      return { totalRev: 0, totalProfit: 0, avgDaily: 0, peakDay: null, totalOrders: 0, avgBasket: 0 };
    }
    const totalRev = filteredDailyData.reduce((sum, d) => sum + d.netRevenue, 0);
    const totalProfit = filteredDailyData.reduce((sum, d) => sum + d.grossProfit, 0);
    const totalOrders = filteredDailyData.reduce((sum, d) => sum + d.orderCount, 0);
    const avgDaily = Math.round(totalRev / filteredDailyData.length);
    const avgBasket = totalOrders > 0 ? Math.round(totalRev / totalOrders) : 0;
    
    let peakDay = filteredDailyData[0];
    filteredDailyData.forEach(d => {
      if (d.netRevenue > peakDay.netRevenue) peakDay = d;
    });

    return { totalRev, totalProfit, avgDaily, peakDay, totalOrders, avgBasket };
  }, [filteredDailyData]);

  // Hourly metrics calculation
  const hourlyStats = useMemo(() => {
    if (hourlyData.length === 0) return { peakHour: null, totalRev: 0, totalOrders: 0 };
    let peakHour = hourlyData[0];
    let totalRev = 0;
    let totalOrders = 0;
    hourlyData.forEach(h => {
      totalRev += h.revenue;
      totalOrders += h.transactionCount;
      if (h.revenue > peakHour.revenue) peakHour = h;
    });
    return { peakHour, totalRev, totalOrders };
  }, [hourlyData]);

  // Axis currency formatter
  const formatCurrency = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
    return `₹${val}`;
  };

  // Custom Tooltip for Daily Revenue Area Chart
  const DailyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint: DailyRevenueData = payload[0]?.payload;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700 text-xs backdrop-blur-md min-w-[230px] space-y-2">
          <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
            <span className="font-bold text-teal-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-400" />
              {dataPoint?.fullDateLabel || label}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-teal-950 text-teal-300 border border-teal-800">
              {dataPoint?.dayOfWeek}
            </span>
          </div>

          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between items-center text-slate-200">
              <span className="flex items-center gap-1.5 text-teal-400">
                <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                Net Revenue:
              </span>
              <span className="font-bold text-white text-xs">₹{dataPoint?.netRevenue?.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center text-slate-200">
              <span className="flex items-center gap-1.5 text-sky-400">
                <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                Gross Profit:
              </span>
              <span className="font-bold text-sky-400">₹{dataPoint?.grossProfit?.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center text-slate-400">
              <span>Gross Margin %:</span>
              <span className="text-emerald-400 font-bold">{dataPoint?.profitMarginPercent}%</span>
            </div>

            <div className="flex justify-between items-center text-slate-400">
              <span>Invoices Billed:</span>
              <span className="text-slate-200 font-bold">{dataPoint?.orderCount} bills</span>
            </div>

            <div className="flex justify-between items-center text-slate-400">
              <span>Avg Basket:</span>
              <span className="text-slate-200 font-bold">₹{dataPoint?.averageBillValue}</span>
            </div>

            <div className="pt-1.5 border-t border-slate-800 space-y-1 text-[10px] text-slate-400">
              <div className="flex justify-between items-center">
                <span className="text-indigo-300">UPI / QR:</span>
                <span className="text-slate-300">₹{dataPoint?.upiRevenue?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-amber-300">Cash:</span>
                <span className="text-slate-300">₹{dataPoint?.cashRevenue?.toLocaleString()}</span>
              </div>
              {dataPoint?.creditRevenue > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-rose-300">Khata / Credit:</span>
                  <span className="text-slate-300">₹{dataPoint?.creditRevenue?.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Hourly Sales Area Chart
  const HourlyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint: HourlySalesData = payload[0]?.payload;
      const isHighRush = dataPoint?.rushLevel === 'high';
      const isMedRush = dataPoint?.rushLevel === 'medium';

      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700 text-xs backdrop-blur-md min-w-[220px] space-y-2">
          <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
            <span className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              {dataPoint?.timeRange || label}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${
              isHighRush 
                ? 'bg-rose-950 text-rose-300 border-rose-800' 
                : isMedRush 
                ? 'bg-amber-950 text-amber-300 border-amber-800' 
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              {isHighRush ? '🔥 Peak Rush' : isMedRush ? '⚡ Moderate Rush' : '☕ Normal Flow'}
            </span>
          </div>

          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between items-center text-slate-200">
              <span className="flex items-center gap-1.5 text-indigo-400">
                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                Hourly Revenue:
              </span>
              <span className="font-bold text-white text-xs">₹{dataPoint?.revenue?.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center text-slate-200">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Est. Gross Profit:
              </span>
              <span className="font-bold text-emerald-400">₹{dataPoint?.grossProfit?.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                Footfall / Invoices:
              </span>
              <span className="font-bold text-slate-200">{dataPoint?.transactionCount} customer bills</span>
            </div>

            <div className="flex justify-between items-center text-slate-400">
              <span>Avg Basket:</span>
              <span className="text-slate-200 font-bold">₹{dataPoint?.averageBillValue}</span>
            </div>

            <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400">
              <span className="text-slate-300">
                {isHighRush 
                  ? '⚡ Queue Advisory: Keep 2 billing counters staffed to minimize customer wait times.' 
                  : 'Counter flow within single-pharmacist operational capacity.'}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="daily-revenue-peakhours-chart" className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-4">
      {/* 1. Header & Navigation Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-2xs">
              {activeTab === 'daily' ? (
                <TrendingUp className="w-4 h-4" />
              ) : activeTab === 'hourly' ? (
                <Clock className="w-4 h-4" />
              ) : (
                <Calendar className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>
                  {activeTab === 'daily' 
                    ? 'Daily Revenue Velocity & Margin Trends' 
                    : activeTab === 'hourly' 
                    ? 'Peak Sales Hours & Footfall Rush Analysis' 
                    : 'Day-of-Week Sales Performance Pattern'}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-700">
                  Recharts Area
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeTab === 'daily'
                  ? 'Continuous rolling area curves of daily receipts, net cash/UPI flows, and pharmacy margins'
                  : activeTab === 'hourly'
                  ? 'Identify morning doctor clinic rushes and evening peak footfall to optimize counter staffing'
                  : 'Historical revenue distribution by day of week to anticipate inventory replenishment cycles'}
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Switcher Tabs */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800">
            <button
              id="chart-view-daily-tab"
              type="button"
              onClick={() => setActiveTab('daily')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'daily'
                  ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Daily Trends</span>
            </button>

            <button
              id="chart-view-hourly-tab"
              type="button"
              onClick={() => setActiveTab('hourly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'hourly'
                  ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Peak Hours</span>
            </button>

            <button
              id="chart-view-dow-tab"
              type="button"
              onClick={() => setActiveTab('dow')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'dow'
                  ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Mon-Sun Cadence</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Metric KPI Summary Highlights */}
      {activeTab === 'daily' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Avg Daily Revenue
            </span>
            <div className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5">
              ₹{dailyStats.avgDaily.toLocaleString()}
            </div>
            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-1 mt-0.5">
              <ArrowUpRight className="w-3 h-3" />
              {timeframeDays}-day rolling average
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Peak Day Record
            </span>
            <div className="text-base sm:text-lg font-black font-mono text-teal-600 dark:text-teal-400 mt-0.5">
              ₹{dailyStats.peakDay?.netRevenue.toLocaleString() || '0'}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block truncate mt-0.5">
              {dailyStats.peakDay?.fullDateLabel || 'N/A'}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Total Invoices Processed
            </span>
            <div className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {dailyStats.totalOrders.toLocaleString()} <span className="text-xs font-normal text-slate-400">bills</span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block mt-0.5">
              Avg ₹{dailyStats.avgBasket} per transaction
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Gross Margin Realized
            </span>
            <div className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              ₹{dailyStats.totalProfit.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
              {dailyStats.totalRev > 0 ? ((dailyStats.totalProfit / dailyStats.totalRev) * 100).toFixed(1) : 32}% overall margin
            </span>
          </div>
        </div>
      )}

      {activeTab === 'hourly' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <div className="bg-indigo-50/70 dark:bg-indigo-950/30 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/50 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                All-Time Peak Hour
              </span>
              <div className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white mt-1">
                {hourlyStats.peakHour?.timeRange}
              </div>
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                ₹{hourlyStats.peakHour?.revenue.toLocaleString()} · {hourlyStats.peakHour?.transactionCount} customer bills
              </p>
            </div>
            <span className="px-2 py-1 text-[10px] font-extrabold uppercase rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
              🔥 Highest Rush
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              Morning Clinic Window (8 AM - 1 PM)
            </span>
            <div className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white mt-1">
              ₹{insights.morningRushRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Accounts for <strong className="text-slate-800 dark:text-slate-200">{insights.morningRushShare}%</strong> of total daily chemist revenue
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Sunset className="w-3.5 h-3.5 text-purple-500" />
              Evening Super Peak (5 PM - 10 PM)
            </span>
            <div className="text-base sm:text-lg font-black font-mono text-teal-600 dark:text-teal-400 mt-1">
              ₹{insights.eveningPeakRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Generates <strong className="text-teal-600 dark:text-teal-400">{insights.eveningPeakShare}%</strong> of pharmacy sales — prime billing window
            </p>
          </div>
        </div>
      )}

      {/* 3. Sub-filter Controls (Timeframe for Daily, Metric for Hourly) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        {activeTab === 'daily' && (
          <>
            {/* Timeframe selector: 7d, 14d, 30d */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">
                Timeframe:
              </span>
              {[
                { days: 7, label: 'Past 7 Days' },
                { days: 14, label: 'Past 14 Days' },
                { days: 30, label: 'Past 30 Days' }
              ].map(tf => (
                <button
                  key={tf.days}
                  id={`timeframe-${tf.days}d-btn`}
                  type="button"
                  onClick={() => setTimeframeDays(tf.days as any)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    timeframeDays === tf.days
                      ? 'bg-teal-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Layer Mode: Revenue & Profit, Revenue & Invoices, Payment Split */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {[
                { id: 'rev_profit', label: 'Revenue & Profit (INR)', icon: TrendingUp },
                { id: 'rev_orders', label: 'Revenue & Invoices Count', icon: Users },
                { id: 'payment_split', label: 'Payment Channels (UPI/Cash)', icon: CreditCard }
              ].map(m => (
                <button
                  key={m.id}
                  id={`metric-${m.id}-btn`}
                  type="button"
                  onClick={() => setDailyMetricMode(m.id as any)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    dailyMetricMode === m.id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Accounting CSV Export Button */}
            <div className="flex items-center gap-1.5 sm:ml-auto">
              <button
                id="chart-export-daily-accounting-btn"
                type="button"
                onClick={() => {
                  if (onExportDailyAccountingCsv) {
                    onExportDailyAccountingCsv(timeframeDays);
                  } else {
                    exportDailyRevenueToAccountingCsv(filteredDailyData, {
                      shopName: shopDetails?.shopName,
                      gstin: shopDetails?.gstin,
                      dlNumber: shopDetails?.dlNumber,
                      phone: shopDetails?.phone,
                      address: shopDetails?.address,
                      timeframeLabel: `Last ${timeframeDays} Days Daily Sales Register`,
                      includeHourlyBreakdown: true,
                      hourlyData
                    });
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 rounded-lg transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                title={`Export ${timeframeDays}-day daily revenue journal with Cash/UPI split and estimated GST for external accounting`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Export {timeframeDays}D CSV (Accounting)</span>
              </button>
            </div>
          </>
        )}

        {activeTab === 'hourly' && (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">
                Display Metric:
              </span>
              <button
                type="button"
                onClick={() => setHourlyMetric('revenue')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  hourlyMetric === 'revenue'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Hourly Revenue (₹)
              </button>
              <button
                type="button"
                onClick={() => setHourlyMetric('orders')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  hourlyMetric === 'orders'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Invoices / Customer Traffic
              </button>
            </div>

            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:inline-flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-indigo-500" />
              Doctor clinic rush peaks: 11 AM & 7-9 PM
            </span>
          </div>
        )}
      </div>

      {/* 4. Chart Canvas Stage */}
      <div className="w-full pt-2">
        {/* VIEW 1: DAILY REVENUE AREA CHART */}
        {activeTab === 'daily' && (
          <div className="h-[320px] sm:h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={filteredDailyData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  {/* Teal Gradient for Net Revenue */}
                  <linearGradient id="dailyRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                  </linearGradient>

                  {/* Sky/Indigo Gradient for Gross Profit */}
                  <linearGradient id="dailyProfitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                  </linearGradient>

                  {/* Amber Gradient for Invoices */}
                  <linearGradient id="dailyOrdersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>

                  {/* UPI Gradient */}
                  <linearGradient id="upiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>

                  {/* Cash Gradient */}
                  <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>

                  {/* Credit Gradient */}
                  <linearGradient id="creditGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} vertical={false} />
                
                <XAxis
                  dataKey="dateLabel"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.3 }}
                />
                
                <YAxis
                  yAxisId="left"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.3 }}
                  tickFormatter={formatCurrency}
                />

                {dailyMetricMode === 'rev_orders' && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#f59e0b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#f59e0b', strokeOpacity: 0.3 }}
                    tickFormatter={(v) => `${v} bills`}
                  />
                )}

                <Tooltip content={<DailyTooltip />} />

                {/* Average Daily Reference Line */}
                <ReferenceLine
                  yAxisId="left"
                  y={dailyStats.avgDaily}
                  stroke="#0d9488"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Avg ₹${dailyStats.avgDaily.toLocaleString()}`,
                    position: 'insideTopLeft',
                    fill: '#0d9488',
                    fontSize: 10,
                    fontWeight: 700
                  }}
                />

                {/* Layer Mode 1: Revenue vs Profit */}
                {dailyMetricMode === 'rev_profit' && (
                  <>
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="netRevenue"
                      name="Net Revenue"
                      stroke="#0d9488"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#dailyRevenueGrad)"
                      activeDot={{ r: 6, fill: '#0d9488', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="grossProfit"
                      name="Gross Profit"
                      stroke="#0284c7"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#dailyProfitGrad)"
                      activeDot={{ r: 5, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  </>
                )}

                {/* Layer Mode 2: Revenue vs Invoices Count */}
                {dailyMetricMode === 'rev_orders' && (
                  <>
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="netRevenue"
                      name="Net Revenue (₹)"
                      stroke="#0d9488"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#dailyRevenueGrad)"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="orderCount"
                      name="Invoices Count"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#dailyOrdersGrad)"
                    />
                  </>
                )}

                {/* Layer Mode 3: Payment Split */}
                {dailyMetricMode === 'payment_split' && (
                  <>
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="upiRevenue"
                      name="UPI / Digital"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#upiGrad)"
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="cashRevenue"
                      name="Cash Sales"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#cashGrad)"
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="creditRevenue"
                      name="Khata / Due"
                      stroke="#f43f5e"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#creditGrad)"
                    />
                  </>
                )}

                <Legend
                  verticalAlign="top"
                  height={32}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingBottom: '8px' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* VIEW 2: HOURLY PEAK SALES AREA CHART */}
        {activeTab === 'hourly' && (
          <div className="h-[320px] sm:h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={hourlyData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  {/* Indigo Gradient for Hourly Sales */}
                  <linearGradient id="hourlyRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>

                  {/* Cyan Gradient for Invoices */}
                  <linearGradient id="hourlyOrdersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} vertical={false} />

                <XAxis
                  dataKey="hourLabel"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.3 }}
                />

                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.3 }}
                  tickFormatter={hourlyMetric === 'revenue' ? formatCurrency : (v) => `${v}`}
                />

                <Tooltip content={<HourlyTooltip />} />

                {/* Peak Rush Threshold Reference Line */}
                <ReferenceLine
                  y={hourlyMetric === 'revenue' ? 8500 : 25}
                  stroke="#f43f5e"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: hourlyMetric === 'revenue' ? '🔥 Rush Threshold: ₹8,500/hr' : '🔥 Rush: 25+ Bills/hr',
                    position: 'insideTopRight',
                    fill: '#f43f5e',
                    fontSize: 10,
                    fontWeight: 700
                  }}
                />

                {hourlyMetric === 'revenue' ? (
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Hourly Turnover (₹)"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#hourlyRevenueGrad)"
                    activeDot={{ r: 6, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                ) : (
                  <Area
                    type="monotone"
                    dataKey="transactionCount"
                    name="Customer Invoices Count"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#hourlyOrdersGrad)"
                    activeDot={{ r: 6, fill: '#06b6d4', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                )}

                <Legend
                  verticalAlign="top"
                  height={32}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingBottom: '8px' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* VIEW 3: DAY OF WEEK CADENCE (MON - SUN) */}
        {activeTab === 'dow' && (
          <div className="space-y-4">
            <div className="h-[280px] sm:h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={dayOfWeekData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="dowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} vertical={false} />
                  <XAxis dataKey="dayShort" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={formatCurrency} />
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Avg Daily Turnover']}
                    labelFormatter={(label) => `Day: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="averageRevenue"
                    name="Average Daily Sales (₹)"
                    stroke="#0d9488"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#dowGrad)"
                    activeDot={{ r: 6, fill: '#0d9488', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                  <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* DOW Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
              {dayOfWeekData.map((d, i) => (
                <div 
                  key={i} 
                  className={`p-2.5 rounded-xl border text-xs ${
                    d.isPeakDay 
                      ? 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800' 
                      : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">{d.dayName}</span>
                    {d.isPeakDay && (
                      <span className="text-[10px] font-extrabold text-teal-700 dark:text-teal-300">★ Peak Day</span>
                    )}
                  </div>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm mt-1">
                    ₹{d.averageRevenue.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-500">{d.averageOrders} bills / day avg</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. Pharmacist Operational Footfall Strategy Banner */}
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700/60 flex items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div className="text-slate-700 dark:text-slate-300">
            <strong className="text-slate-900 dark:text-white font-bold">Counter Queue Optimization: </strong>
            <span>
              Peak transactions occur between <span className="font-semibold text-teal-600 dark:text-teal-400">10:30 AM – 1:00 PM</span> and <span className="font-semibold text-teal-600 dark:text-teal-400">6:30 PM – 9:30 PM</span>. Deploy dual staff on active billing terminals to eliminate patient queue times.
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1.5 shrink-0 font-mono text-[11px] font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <span>{insights.busiestDay} Rush:</span>
          <span className="text-teal-600 dark:text-teal-400">₹{insights.peakDayRevenue.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
