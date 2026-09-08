import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import { 
  Percent, 
  TrendingUp, 
  Layers, 
  ArrowUpRight, 
  Sparkles,
  PieChart as PieIcon,
  Award
} from 'lucide-react';
import { CategoryPerformance } from '../../utils/reportsAnalytics';

interface ProfitMarginChartProps {
  categories: CategoryPerformance[];
}

export const ProfitMarginChart: React.FC<ProfitMarginChartProps> = ({ categories }) => {
  const [viewMode, setViewMode] = useState<'margins' | 'revenue_profit'>('margins');

  // Custom rich tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const catData: CategoryPerformance = payload[0]?.payload;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-xl border border-slate-700 text-xs backdrop-blur-md min-w-[220px] space-y-2">
          <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
            <span className="font-bold text-slate-100 flex items-center gap-1.5">
              <span 
                className="w-2.5 h-2.5 rounded-full inline-block" 
                style={{ backgroundColor: catData.color }}
              />
              {catData.category}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-800">
              {catData.profitMarginPercent}% Margin
            </span>
          </div>

          <div className="space-y-1 font-mono">
            <div className="flex justify-between items-center text-slate-300">
              <span>Total Revenue:</span>
              <span className="font-bold text-white">₹{catData.grossSales?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Gross Profit:</span>
              <span className="font-bold text-emerald-400">₹{catData.grossProfit?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Units Dispensed:</span>
              <span className="font-semibold text-sky-300">{catData.unitsSold} units</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Catalog SKUs:</span>
              <span className="font-semibold text-slate-400">{catData.productCount} medicines</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const formatCurrency = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
    return `₹${val}`;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-700/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Percent className="w-4 h-4" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Therapeutic Category Profit Margins
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gross profit margin % and total earnings realized across pharmaceutical classes
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('margins')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              viewMode === 'margins'
                ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Margin % by Category
          </button>
          <button
            type="button"
            onClick={() => setViewMode('revenue_profit')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              viewMode === 'revenue_profit'
                ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Revenue vs Profit (₹)
          </button>
        </div>
      </div>

      {/* Recharts Canvas */}
      <div className="h-72 sm:h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'margins' ? (
            <BarChart 
              data={categories} 
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.6} />
              <XAxis 
                type="number" 
                unit="%" 
                domain={[0, 50]}
                tickLine={false} 
                axisLine={{ stroke: '#cbd5e1' }}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <YAxis 
                type="category" 
                dataKey="category" 
                tickLine={false} 
                axisLine={false}
                width={120}
                tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="profitMarginPercent" 
                name="Gross Profit Margin (%)" 
                radius={[0, 6, 6, 0]}
                barSize={18}
              >
                {categories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <BarChart 
              data={categories} 
              margin={{ top: 10, right: 10, left: -10, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
              <XAxis 
                dataKey="category" 
                tickLine={false} 
                axisLine={{ stroke: '#cbd5e1' }}
                angle={-25}
                textAnchor="end"
                interval={0}
                height={50}
                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
              />
              <YAxis 
                tickLine={false} 
                axisLine={false}
                tickFormatter={formatCurrency}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
              />
              <Bar 
                name="Gross Sales (₹)" 
                dataKey="grossSales" 
                fill="#0284c7" 
                radius={[4, 4, 0, 0]} 
                barSize={16} 
              />
              <Bar 
                name="Gross Profit (₹)" 
                dataKey="grossProfit" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]} 
                barSize={16} 
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Margin Optimization Guidance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
        <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold">
            <Award className="w-3.5 h-3.5" />
            <span>Highest Margin Segment</span>
          </div>
          <p className="text-emerald-900 dark:text-emerald-200 text-[11px]">
            <strong>Vitamins & Nutraceuticals (42.5%)</strong> & <strong>Gastro Antacids (38.0%)</strong> yield the highest gross margin. Maintain prominent OTC counter display.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 space-y-1">
          <div className="flex items-center gap-1.5 text-sky-800 dark:text-sky-300 font-bold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>High Volume Anchor</span>
          </div>
          <p className="text-sky-900 dark:text-sky-200 text-[11px]">
            <strong>Cardiovascular & Anti-Diabetic</strong> account for 48% of gross revenue with reliable repeat chronic refill refills.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-1">
          <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generic Salt Substitution</span>
          </div>
          <p className="text-amber-900 dark:text-amber-200 text-[11px]">
            Suggesting quality branded generics for Pantoprazole & Paracetamol increases retail margin from 18% to 45% while saving patients 30%.
          </p>
        </div>
      </div>
    </div>
  );
};
