import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import { 
  Trophy, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Package, 
  ArrowUpRight, 
  ShieldAlert, 
  Sparkles, 
  Clock, 
  Pill,
  Activity,
  Layers,
  ChevronRight
} from 'lucide-react';
import { TopProductPerformance } from '../../utils/reportsAnalytics';

interface Top5BestSellingVelocityChartProps {
  products: TopProductPerformance[];
  onNavigateToStock?: (product: TopProductPerformance) => void;
}

// Color palette for the top 5 ranking bars
const RANK_COLORS = [
  '#0d9488', // #1 Teal
  '#0284c7', // #2 Sky Blue
  '#10b981', // #3 Emerald
  '#6366f1', // #4 Indigo
  '#f59e0b'  // #5 Amber
];

export const Top5BestSellingVelocityChart: React.FC<Top5BestSellingVelocityChartProps> = ({
  products = [],
  onNavigateToStock
}) => {
  // Chart metric: primarily Revenue as requested, with velocity comparison option
  const [activeMetric, setActiveMetric] = useState<'revenue' | 'velocity'>('revenue');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Extract top 5 products sorted by revenue
  const top5Products = products.slice(0, 5);

  const totalTop5Revenue = top5Products.reduce((acc, p) => acc + p.totalRevenue, 0);
  const totalTop5Units = top5Products.reduce((acc, p) => acc + p.unitsSold, 0);
  const totalTop5Velocity = top5Products.reduce((acc, p) => acc + p.dailyVelocity, 0);

  // Critical restock risk check in top 5
  const atRiskCount = top5Products.filter(p => p.daysOfStockLeft <= 10).length;

  // Format data specifically for Horizontal BarChart (Recharts layout="vertical")
  // Recharts vertical layout displays the first item at the top if we pass top5 or reversed
  const chartData = top5Products.map((p, index) => {
    const revenueShare = totalTop5Revenue > 0 ? ((p.totalRevenue / totalTop5Revenue) * 100).toFixed(1) : '0';
    return {
      id: p.id,
      rank: index + 1,
      rankLabel: `#${index + 1} ${p.brandName}`,
      brandName: p.brandName,
      saltComposition: p.saltComposition,
      category: p.category,
      revenue: p.totalRevenue,
      revenueShare: Number(revenueShare),
      unitsSold: p.unitsSold,
      dailyVelocity: p.dailyVelocity,
      daysOfStockLeft: p.daysOfStockLeft,
      currentStock: p.currentStock,
      stockStatus: p.stockStatus,
      suggestedReorderQty: p.suggestedReorderQty,
      profitMargin: p.profitMarginPercent,
      rackLocation: p.rackLocation,
      color: RANK_COLORS[index % RANK_COLORS.length],
      raw: p
    };
  });

  const formatCurrency = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
    return `₹${val}`;
  };

  // Custom Rich Tooltip for the Horizontal Bar Chart
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      if (!data) return null;

      const isStockCritical = data.daysOfStockLeft <= 7;
      const isStockLow = data.daysOfStockLeft <= 14;

      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-xl border border-slate-700 text-xs backdrop-blur-md min-w-[240px] space-y-2 font-mono">
          <div className="font-sans border-b border-slate-700 pb-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-black text-sm text-teal-300 flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-teal-950 text-teal-300 border border-teal-800">
                  #{data.rank}
                </span>
                {data.brandName}
              </span>
              <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">
                {data.category}
              </span>
            </div>
            {data.saltComposition && (
              <p className="text-[11px] text-slate-400 mt-0.5 font-normal truncate max-w-[220px]">
                {data.saltComposition}
              </p>
            )}
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between text-slate-300">
              <span>Total Revenue:</span>
              <span className="font-bold text-white font-mono">₹{data.revenue.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Top 5 Revenue Share:</span>
              <span className="font-bold text-teal-300">{data.revenueShare}%</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Units Dispensed:</span>
              <span className="font-semibold text-sky-300">{data.unitsSold} units</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Daily Run-Rate:</span>
              <span className="font-bold text-amber-300 flex items-center gap-1">
                <Zap className="w-3 h-3 fill-amber-300" />
                {data.dailyVelocity} units/day
              </span>
            </div>
          </div>

          {/* Inventory Runway Section */}
          <div className="pt-2 border-t border-slate-800 space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-300">
              <span>Current Shelf Stock:</span>
              <span className="font-bold text-white">{data.currentStock} units ({data.rackLocation})</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Inventory Runway:</span>
              <span className={`font-black ${
                isStockCritical ? 'text-rose-400' : isStockLow ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {data.daysOfStockLeft} Days Left
              </span>
            </div>
            {data.suggestedReorderQty > 0 && (
              <div className="mt-1 p-1 rounded bg-amber-950/60 border border-amber-800 text-[10px] text-amber-200 text-center font-sans font-semibold">
                Suggested Reorder: +{data.suggestedReorderQty} units
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div 
      id="top5-best-selling-velocity-section"
      className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-5"
    >
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/80">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-2xs">
              <Trophy className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Top 5 Best-Selling Medicines by Revenue
            </h3>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 rounded-full border border-teal-300 dark:border-teal-800">
              Inventory Velocity Radar
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Leading sales drivers ranked by billed revenue alongside daily stock consumption velocity and remaining inventory runway to prevent out-of-stock leakages.
          </p>
        </div>

        {/* View Controls & KPI Badges */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          {atRiskCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>{atRiskCount} Fast Mover{atRiskCount > 1 ? 's' : ''} Need Restock</span>
            </div>
          )}

          {/* Metric Selector */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              id="top5-metric-revenue-btn"
              onClick={() => setActiveMetric('revenue')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeMetric === 'revenue'
                  ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Revenue (INR ₹)
            </button>
            <button
              type="button"
              id="top5-metric-velocity-btn"
              onClick={() => setActiveMetric('velocity')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                activeMetric === 'velocity'
                  ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Zap className="w-3 h-3 text-amber-500" />
              <span>Velocity (Units/Day)</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Top 5 Total Revenue</span>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
            ₹{totalTop5Revenue.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
            Primary turnover engine
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Dispensed Volume</span>
          <div className="text-base sm:text-lg font-black text-sky-600 dark:text-sky-400 mt-0.5">
            {totalTop5Units.toLocaleString('en-IN')} <span className="text-xs font-normal">units</span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            Across {top5Products.length} medicine SKUs
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Combined Velocity</span>
          <div className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
            <Zap className="w-4 h-4 fill-amber-500" />
            {totalTop5Velocity.toFixed(1)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">units/day</span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            Avg {(totalTop5Velocity / (top5Products.length || 1)).toFixed(1)} units/day per SKU
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Runway Health</span>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
            {atRiskCount === 0 ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Healthy Buffer</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <span className="text-rose-600 dark:text-rose-400">{atRiskCount} at Risk</span>
              </>
            )}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            Target 30-day stock cover
          </span>
        </div>
      </div>

      {/* Main Horizontal Bar Chart */}
      <div className="bg-slate-50/70 dark:bg-slate-900/50 rounded-xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-700/60">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">
              {activeMetric === 'revenue' 
                ? 'Horizontal Revenue Distribution (Rank #1 to #5)' 
                : 'Horizontal Daily Velocity Distribution (Units Sold per Day)'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Hover over bars for inventory runway breakdown
          </span>
        </div>

        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 35, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#cbd5e1" opacity={0.5} />
              <XAxis
                type="number"
                tickFormatter={activeMetric === 'revenue' ? formatCurrency : (val) => `${val}/day`}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <YAxis
                type="category"
                dataKey="rankLabel"
                tickLine={false}
                axisLine={false}
                width={130}
                tick={{ fontSize: 11, fill: '#1e293b', fontWeight: 700 }}
              />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(15, 23, 42, 0.05)' }} />
              <Bar
                dataKey={activeMetric === 'revenue' ? 'revenue' : 'dailyVelocity'}
                name={activeMetric === 'revenue' ? 'Total Revenue (₹)' : 'Daily Velocity (Units/Day)'}
                radius={[0, 8, 8, 0]}
                barSize={20}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${entry.id || index}`} 
                    fill={entry.color} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Inventory Velocity & Stock Runway Deep-Dive Cards for the Top 5 */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Top 5 Velocity & Stock Runway Intelligence</span>
          </h4>
          <span className="text-[11px] text-slate-400">
            Click any medicine to inspect restock advice
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {chartData.map((item, idx) => {
            const isSelected = selectedProductId === item.id;
            const isCritical = item.daysOfStockLeft <= 7;
            const isLow = item.daysOfStockLeft > 7 && item.daysOfStockLeft <= 14;
            const isAdequate = item.daysOfStockLeft > 14;

            // Runway bar percentage capped at 100% (based on 30 day target buffer)
            const runwayPct = Math.min(100, Math.round((item.daysOfStockLeft / 30) * 100));

            return (
              <div
                key={item.id || idx}
                id={`top5-medicine-card-${idx + 1}`}
                onClick={() => {
                  setSelectedProductId(isSelected ? null : item.id);
                  if (onNavigateToStock) {
                    onNavigateToStock(item.raw);
                  }
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 relative group ${
                  isSelected
                    ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 shadow-xs ring-1 ring-teal-500'
                    : isCritical
                    ? 'border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-800 hover:border-rose-400'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-2xs'
                }`}
              >
                {/* Card Top: Rank + Brand + Category */}
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span 
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0 shadow-2xs"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.rank}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate max-w-[100px]">
                      {item.category}
                    </span>
                  </div>

                  <h5 className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors" title={item.brandName}>
                    {item.brandName}
                  </h5>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate" title={item.saltComposition}>
                    {item.saltComposition || 'Generic Formulation'}
                  </p>
                </div>

                {/* Revenue & Volume Metrics */}
                <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-700/60 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 text-[10px]">Revenue:</span>
                    <span className="font-black text-slate-900 dark:text-white font-mono">
                      ₹{item.revenue.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 text-[10px]">Dispensed:</span>
                    <span className="font-semibold text-sky-600 dark:text-sky-400">
                      {item.unitsSold} units
                    </span>
                  </div>
                </div>

                {/* Inventory Velocity & Runway Bar */}
                <div className="space-y-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                      Velocity:
                    </span>
                    <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                      {item.dailyVelocity} / day
                    </span>
                  </div>

                  {/* Stock Runway Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-slate-400">Runway:</span>
                      <span className={`font-black font-mono ${
                        isCritical ? 'text-rose-600 dark:text-rose-400' :
                        isLow ? 'text-amber-600 dark:text-amber-400' :
                        'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {item.daysOfStockLeft} Days
                      </span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCritical ? 'bg-rose-500' :
                          isLow ? 'bg-amber-500' :
                          'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.max(8, runwayPct)}%` }}
                      />
                    </div>
                  </div>

                  {/* Shelf Stock & Reorder Advice */}
                  <div className="flex items-center justify-between pt-1 text-[10px]">
                    <span className="text-slate-500 dark:text-slate-400">Stock: <strong className="text-slate-700 dark:text-slate-200">{item.currentStock}</strong></span>
                    {item.suggestedReorderQty > 0 ? (
                      <span className="font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded text-[9px]">
                        Order +{item.suggestedReorderQty}
                      </span>
                    ) : (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded text-[9px]">
                        Covered
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
