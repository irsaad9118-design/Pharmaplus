import React, { useMemo, useState } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { PointOfSaleTransaction } from '../../types/pharmacy';
import { TrendingUp, Calendar, ArrowUpRight, ArrowDownRight, IndianRupee } from 'lucide-react';

interface DailyRevenueLineChartProps {
  invoices: PointOfSaleTransaction[];
}

export const DailyRevenueLineChart: React.FC<DailyRevenueLineChartProps> = ({ invoices = [] }) => {
  const [rangeDays, setRangeDays] = useState<7 | 14 | 30>(7);

  const chartData = useMemo(() => {
    // Generate dates for the selected range
    const days = rangeDays;
    const result: { dateKey: string; label: string; revenue: number; billsCount: number }[] = [];
    const dateMap = new Map<string, { revenue: number; billsCount: number }>();

    // Process actual invoices
    invoices.forEach(inv => {
      if (!inv) return;
      // Extract YYYY-MM-DD from timestamp
      let dateKey = '';
      if (inv.timestamp) {
        try {
          if (inv.timestamp.includes('T')) {
            dateKey = inv.timestamp.split('T')[0];
          } else if (inv.timestamp.length >= 10) {
            const parsed = new Date(inv.timestamp);
            if (!isNaN(parsed.getTime())) {
              dateKey = parsed.toISOString().substring(0, 10);
            }
          }
        } catch {
          // Ignore parse errors
        }
      }

      if (!dateKey) {
        dateKey = new Date().toISOString().substring(0, 10);
      }

      const total = Number(inv.grandTotal || inv.subtotal || 0);
      const current = dateMap.get(dateKey) || { revenue: 0, billsCount: 0 };
      dateMap.set(dateKey, {
        revenue: current.revenue + (isNaN(total) ? 0 : total),
        billsCount: current.billsCount + 1
      });
    });

    // Populate daily entries ending at today
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const isoKey = d.toISOString().substring(0, 10);
      const formattedLabel = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      
      const stats = dateMap.get(isoKey) || { revenue: 0, billsCount: 0 };
      result.push({
        dateKey: isoKey,
        label: formattedLabel,
        revenue: Math.round(stats.revenue),
        billsCount: stats.billsCount
      });
    }

    return result;
  }, [invoices, rangeDays]);

  const totalPeriodRevenue = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.revenue, 0);
  }, [chartData]);

  const totalPeriodBills = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.billsCount, 0);
  }, [chartData]);

  const avgDailyRevenue = useMemo(() => {
    return chartData.length > 0 ? Math.round(totalPeriodRevenue / chartData.length) : 0;
  }, [totalPeriodRevenue, chartData]);

  const maxDailyRevenue = useMemo(() => {
    return chartData.reduce((max, item) => Math.max(max, item.revenue), 0);
  }, [chartData]);

  return (
    <div 
      id="daily-revenue-line-chart"
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 shadow-xs space-y-4"
    >
      {/* Header with Title and Range Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Revenue &amp; Billing Trends
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daily counter turnover performance over recent billing cycles
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl self-start sm:self-auto">
          {([7, 14, 30] as const).map(days => (
            <button
              key={days}
              type="button"
              onClick={() => setRangeDays(days)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                rangeDays === days
                  ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {days} Days
            </button>
          ))}
        </div>
      </div>

      {/* KPI Mini Strip */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">
            {rangeDays}-Day Total
          </span>
          <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5 block">
            ₹{totalPeriodRevenue.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">
            Daily Average
          </span>
          <span className="text-sm sm:text-base font-black text-teal-600 dark:text-teal-400 mt-0.5 block">
            ₹{avgDailyRevenue.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">
            Peak Day
          </span>
          <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            ₹{maxDailyRevenue.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-52 sm:h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.15} vertical={false} />

            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 11, fill: '#64748b' }} 
              axisLine={false}
              tickLine={false}
            />

            <YAxis 
              tick={{ fontSize: 11, fill: '#64748b' }} 
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`}
            />

            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1">
                      <p className="font-bold text-slate-300">{data.label}</p>
                      <p className="text-teal-400 font-extrabold text-sm">
                        ₹{data.revenue.toLocaleString('en-IN')}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {data.billsCount} bill{data.billsCount === 1 ? '' : 's'} recorded
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#0d9488" 
              strokeWidth={2.5}
              fillOpacity={1} 
              fill="url(#revenueGradient)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
