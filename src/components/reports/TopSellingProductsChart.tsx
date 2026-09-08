import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { 
  Trophy, 
  Flame, 
  Layers, 
  Pill, 
  Activity, 
  Sparkles,
  Search,
  PackageCheck
} from 'lucide-react';
import { TopProductPerformance, TopSaltPerformance } from '../../utils/reportsAnalytics';

interface TopSellingProductsChartProps {
  products: TopProductPerformance[];
  salts: TopSaltPerformance[];
  onSelectProduct?: (product: TopProductPerformance) => void;
}

const PIE_COLORS = ['#0d9488', '#0284c7', '#8b5cf6', '#f59e0b', '#ec4899', '#10b981', '#64748b', '#f43f5e'];

export const TopSellingProductsChart: React.FC<TopSellingProductsChartProps> = ({
  products,
  salts,
  onSelectProduct
}) => {
  const [metric, setMetric] = useState<'revenue' | 'volume' | 'profit'>('revenue');
  const [searchFilter, setSearchFilter] = useState('');

  // Top 10 products for the chart
  const chartProducts = products.slice(0, 10).map(p => ({
    name: p.brandName,
    fullName: `${p.brandName} (${p.saltComposition})`,
    category: p.category,
    revenue: p.totalRevenue,
    units: p.unitsSold,
    profit: p.grossProfit,
    margin: p.profitMarginPercent,
    currentStock: p.currentStock,
    stockStatus: p.stockStatus,
    raw: p
  }));

  // Salt data for pie chart
  const saltPieData = salts.slice(0, 6).map(s => ({
    name: s.saltName,
    value: s.totalRevenue,
    units: s.unitsSold,
    brands: s.associatedBrands.join(', ')
  }));

  // Filtered table products
  const filteredProducts = products.filter(p => 
    p.brandName.toLowerCase().includes(searchFilter.toLowerCase()) ||
    p.saltComposition.toLowerCase().includes(searchFilter.toLowerCase()) ||
    p.category.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Custom rich tooltip for Top Products Bar Chart
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs backdrop-blur-md min-w-[210px] space-y-1.5 font-mono">
          <div className="font-sans font-bold text-teal-300 border-b border-slate-700 pb-1 flex items-center justify-between">
            <span>{data.name}</span>
            <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-950 px-1 rounded">
              {data.margin}% Margin
            </span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Total Revenue:</span>
            <span className="font-bold text-white">₹{data.revenue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Gross Profit:</span>
            <span className="font-bold text-emerald-400">₹{data.profit.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Units Sold:</span>
            <span className="font-semibold text-sky-300">{data.units} units</span>
          </div>
          <div className="flex justify-between text-slate-300 text-[11px] pt-1 border-t border-slate-800">
            <span>Current Stock:</span>
            <span className={`font-bold ${data.currentStock < 15 ? 'text-rose-400' : 'text-slate-200'}`}>
              {data.currentStock} units in stock
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for Salt Pie Chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-slate-900/95 text-white p-2.5 rounded-xl shadow-xl border border-slate-700 text-xs backdrop-blur-md space-y-1">
          <p className="font-bold text-teal-300">{data.name}</p>
          <p className="text-slate-300 font-mono">Sales: ₹{data.value?.toLocaleString()}</p>
          <p className="text-slate-300 font-mono">Dispensed: {data.units} units</p>
          {data.brands && (
            <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
              Brands: {data.brands}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const formatCurrency = (val: number) => {
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
    return `₹${val}`;
  };

  return (
    <div className="space-y-4">
      {/* Top 10 Products Chart & Salt Share Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Top 10 Best Selling Medicines BarChart (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-700/80">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Trophy className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Top 10 Fast-Selling Medicines
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Highest volume and revenue contributing pharmaceutical products
              </p>
            </div>

            {/* Metric Selector */}
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setMetric('revenue')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  metric === 'revenue'
                    ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                By Revenue
              </button>
              <button
                type="button"
                onClick={() => setMetric('volume')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  metric === 'volume'
                    ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                By Units Sold
              </button>
              <button
                type="button"
                onClick={() => setMetric('profit')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  metric === 'profit'
                    ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                By Gross Profit
              </button>
            </div>
          </div>

          <div className="h-72 sm:h-80 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartProducts} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.6} />
                <XAxis 
                  type="number" 
                  tickFormatter={metric === 'volume' ? undefined : formatCurrency}
                  tickLine={false} 
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tickLine={false} 
                  axisLine={false}
                  width={110}
                  tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar 
                  dataKey={metric === 'revenue' ? 'revenue' : metric === 'volume' ? 'units' : 'profit'} 
                  name={metric === 'revenue' ? 'Total Revenue (₹)' : metric === 'volume' ? 'Units Sold' : 'Gross Profit (₹)'}
                  fill={metric === 'revenue' ? '#0d9488' : metric === 'volume' ? '#0284c7' : '#10b981'}
                  radius={[0, 6, 6, 0]}
                  barSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Salt Molecule Demand Share (Donut Chart) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700/80">
              <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 flex items-center justify-center text-teal-600 dark:text-teal-400">
                <Pill className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Active Molecule Demand
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Top demanded generic salt APIs
                </p>
              </div>
            </div>

            <div className="h-52 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={saltPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {saltPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Molecule Legend with pill chips */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Leading Generic Molecules
            </span>
            <div className="flex flex-wrap gap-1.5">
              {saltPieData.slice(0, 5).map((s, idx) => (
                <span 
                  key={s.name}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5"
                  style={{ 
                    borderColor: `${PIE_COLORS[idx % PIE_COLORS.length]}40`,
                    backgroundColor: `${PIE_COLORS[idx % PIE_COLORS.length]}15`,
                    color: PIE_COLORS[idx % PIE_COLORS.length]
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Ranked Table with Live Stock Status & Quick Click */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Full Product Sales Velocity & Inventory Health Table</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing revenue, units sold, gross profit margins, and current stock run-out forecast
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search product, salt, category..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4"># Rank & Medicine</th>
                <th className="py-3 px-3">Therapeutic Class</th>
                <th className="py-3 px-3 text-right">Units Sold</th>
                <th className="py-3 px-3 text-right">Total Revenue</th>
                <th className="py-3 px-3 text-right">Gross Profit (Margin)</th>
                <th className="py-3 px-3 text-center">Stock on Hand</th>
                <th className="py-3 px-3 text-center">Burn Velocity</th>
                <th className="py-3 px-3 text-center">ABC Class</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
              {filteredProducts.slice(0, 15).map((prod, idx) => {
                const isCritical = prod.stockStatus === 'critical' || prod.stockStatus === 'stockout';
                const isLow = prod.stockStatus === 'low';

                return (
                  <tr 
                    key={prod.id}
                    onClick={() => onSelectProduct && onSelectProduct(prod)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors cursor-pointer"
                  >
                    {/* Rank & Brand */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          idx === 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300' :
                          idx === 1 ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200' :
                          idx === 2 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' :
                          'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {prod.brandName}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {prod.saltComposition}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-[11px] whitespace-nowrap">
                        {prod.category}
                      </span>
                    </td>

                    {/* Units Sold */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {prod.unitsSold}
                    </td>

                    {/* Total Revenue */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      ₹{prod.totalRevenue.toLocaleString()}
                    </td>

                    {/* Gross Profit & Margin */}
                    <td className="py-3 px-3 text-right">
                      <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{prod.grossProfit.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {prod.profitMarginPercent}% margin
                      </div>
                    </td>

                    {/* Stock on Hand & Status */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span className={`font-mono font-bold ${
                          isCritical ? 'text-rose-600 dark:text-rose-400' :
                          isLow ? 'text-amber-600 dark:text-amber-400' :
                          'text-slate-700 dark:text-slate-300'
                        }`}>
                          {prod.currentStock} units
                        </span>
                        {isCritical && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 animate-pulse">
                            {prod.daysOfStockLeft}d left
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Velocity */}
                    <td className="py-3 px-3 text-center font-mono text-slate-600 dark:text-slate-400">
                      {prod.dailyVelocity}/day
                    </td>

                    {/* ABC Class */}
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        prod.abcClass === 'A' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300' :
                        prod.abcClass === 'B' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                      }`}>
                        Class {prod.abcClass}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
