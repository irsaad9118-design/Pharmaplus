import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  IndianRupee, 
  Calendar, 
  Layers, 
  BarChart2, 
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { MonthlySalesData } from '../../utils/reportsAnalytics';

interface MonthlySalesChartProps {
  data: MonthlySalesData[];
}

export const MonthlySalesChart: React.FC<MonthlySalesChartProps> = ({ data }) => {
  const [chartView, setChartView] = useState<'financial' | 'volume' | 'growth'>('financial');

  // Format currency for axis
  const formatCurrencyAxis = (value: number) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
    return `₹${value}`;
  };

  // Custom rich tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const itemData: MonthlySalesData = payload[0]?.payload;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-xl border border-slate-700 text-xs backdrop-blur-md min-w-[210px] space-y-2">
          <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
            <span className="font-bold text-teal-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {itemData?.monthLabel || label}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-800">
              {itemData?.profitMarginPercent}% Margin
            </span>
          </div>

          <div className="space-y-1 font-mono">
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5 text-sky-400">
                <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                Net Sales:
              </span>
              <span className="font-bold text-white">₹{itemData?.netSales?.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Gross Profit:
              </span>
              <span className="font-bold text-emerald-400">₹{itemData?.grossProfit?.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                Purchase Cost (COGS):
              </span>
              <span className="font-semibold text-slate-400">₹{itemData?.cogs?.toLocaleString()}</span>
            </div>

            <div className="pt-1.5 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
              <span>Transactions:</span>
              <span className="text-slate-200">{itemData?.transactionCount} bills</span>
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span>Avg Basket Value:</span>
              <span className="text-slate-200">₹{itemData?.averageOrderValue}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-700/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <BarChart2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Monthly Sales & Gross Revenue Trends
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Historical trajectory of net sales, cost of goods, and pharmacy gross margin
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setChartView('financial')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              chartView === 'financial'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Sales vs Profit
          </button>
          <button
            type="button"
            onClick={() => setChartView('volume')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              chartView === 'volume'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Volume & Invoices
          </button>
          <button
            type="button"
            onClick={() => setChartView('growth')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              chartView === 'growth'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            MoM Growth %
          </button>
        </div>
      </div>

      {/* Recharts Canvas */}
      <div className="h-72 sm:h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {chartView === 'financial' ? (
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
              <XAxis 
                dataKey="monthLabel" 
                tickLine={false} 
                axisLine={{ stroke: '#cbd5e1' }}
                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
              />
              <YAxis 
                tickLine={false} 
                axisLine={false}
                tickFormatter={formatCurrencyAxis}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
              />
              <Area 
                type="monotone" 
                name="Net Sales Revenue (₹)" 
                dataKey="netSales" 
                stroke="#0284c7" 
                strokeWidth={2.5} 
                fillOpacity={1} 
                fill="url(#salesGrad)" 
              />
              <Area 
                type="monotone" 
                name="Gross Profit (₹)" 
                dataKey="grossProfit" 
                stroke="#10b981" 
                strokeWidth={2.5} 
                fillOpacity={1} 
                fill="url(#profitGrad)" 
              />
              <Bar 
                name="Cost of Goods Sold (COGS)" 
                dataKey="cogs" 
                barSize={18} 
                fill="#f43f5e" 
                opacity={0.35} 
                radius={[4, 4, 0, 0]} 
              />
            </ComposedChart>
          ) : chartView === 'volume' ? (
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
              <XAxis 
                dataKey="monthLabel" 
                tickLine={false} 
                axisLine={{ stroke: '#cbd5e1' }}
                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
              />
              <YAxis 
                yAxisId="left"
                tickLine={false} 
                axisLine={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tickLine={false} 
                axisLine={false}
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
                yAxisId="left"
                name="Units / Strips Dispensed" 
                dataKey="unitsSold" 
                barSize={20} 
                fill="#0d9488" 
                radius={[6, 6, 0, 0]} 
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                name="Invoice Transactions Count" 
                dataKey="transactionCount" 
                stroke="#f59e0b" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#f59e0b', strokeWidth: 1.5, stroke: '#fff' }} 
              />
            </ComposedChart>
          ) : (
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
              <XAxis 
                dataKey="monthLabel" 
                tickLine={false} 
                axisLine={{ stroke: '#cbd5e1' }}
                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
              />
              <YAxis 
                tickLine={false} 
                axisLine={false}
                unit="%"
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
                name="Month-over-Month Growth (%)" 
                dataKey="momGrowthPercent" 
                barSize={24} 
                fill="#8b5cf6" 
                radius={[6, 6, 0, 0]} 
              />
              <Line 
                type="monotone" 
                name="Profit Margin (%)" 
                dataKey="profitMarginPercent" 
                stroke="#10b981" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#10b981' }} 
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Mini Performance Highlights Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Peak Sales Month</span>
          <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
            {data[data.length - 1]?.monthLabel || 'Aug 2026'}
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold">
            ₹{data[data.length - 1]?.netSales?.toLocaleString()}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Avg Daily Run Rate</span>
          <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
            ₹{Math.round((data[data.length - 1]?.netSales || 220000) / 30).toLocaleString()}/day
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
            ~{Math.round((data[data.length - 1]?.transactionCount || 600) / 30)} bills/day
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Catalog Gross Margin</span>
          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
            {data[data.length - 1]?.profitMarginPercent || 35.0}%
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" /> +5.0% vs Mar
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Average Basket Size</span>
          <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
            ₹{data[data.length - 1]?.averageOrderValue || 382.27}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
            2.7 items/invoice
          </span>
        </div>
      </div>
    </div>
  );
};
