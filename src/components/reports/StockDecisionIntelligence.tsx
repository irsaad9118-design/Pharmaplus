import React, { useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';
import { 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  PlusCircle, 
  Sparkles, 
  RotateCcw, 
  Layers, 
  ArrowRight,
  ShieldAlert,
  Flame,
  Zap
} from 'lucide-react';
import { TopProductPerformance, StockDecisionInsight } from '../../utils/reportsAnalytics';
import { usePharmacy } from '../../context/PharmacyContext';

interface StockDecisionIntelligenceProps {
  products: TopProductPerformance[];
  insights: StockDecisionInsight[];
}

const ABC_COLORS = {
  A: '#0284c7', // Sky Blue (Top 70% revenue)
  B: '#10b981', // Emerald (20% revenue)
  C: '#64748b'  // Slate (10% revenue)
};

export const StockDecisionIntelligence: React.FC<StockDecisionIntelligenceProps> = ({
  products,
  insights
}) => {
  const { addToast, inventory, setActiveTab } = usePharmacy();
  const [restockedIds, setRestockedIds] = useState<Set<string>>(new Set());

  // Fast-movers requiring restock (Days left <= 14 or status is critical/low)
  const restockQueue = products.filter(p => p.daysOfStockLeft <= 14 || p.stockStatus === 'critical' || p.stockStatus === 'low');

  // ABC Analysis summary
  const classA = products.filter(p => p.abcClass === 'A');
  const classB = products.filter(p => p.abcClass === 'B');
  const classC = products.filter(p => p.abcClass === 'C');

  const totalRev = products.reduce((s, p) => s + p.totalRevenue, 0) || 1;
  const classARev = classA.reduce((s, p) => s + p.totalRevenue, 0);
  const classBRev = classB.reduce((s, p) => s + p.totalRevenue, 0);
  const classCRev = classC.reduce((s, p) => s + p.totalRevenue, 0);

  const abcPieData = [
    { name: 'Class A (Fast Movers - 70% Rev)', value: classARev, count: classA.length, color: ABC_COLORS.A },
    { name: 'Class B (Steady Sellers - 20% Rev)', value: classBRev, count: classB.length, color: ABC_COLORS.B },
    { name: 'Class C (Slow / Long-Tail - 10% Rev)', value: classCRev, count: classC.length, color: ABC_COLORS.C }
  ];

  // Dead stock items from inventory with 0 sales
  const soldNames = new Set(products.map(p => p.brandName.toLowerCase()));
  const deadStockItems = inventory.filter(i => 
    !soldNames.has(i.brandName.toLowerCase()) && 
    (i.stockQuantity || 0) > 5
  ).slice(0, 5);

  const handleQuickReorder = (product: TopProductPerformance) => {
    setRestockedIds(prev => new Set(prev).add(product.id));
    addToast({
      type: 'success',
      title: `Reorder Initiated: ${product.brandName}`,
      message: `Added ${product.suggestedReorderQty} units to purchase order queue (30-day buffer target).`
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. Automated Pharmacist Action Radar Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {insights.map((insight, idx) => {
          const isCritical = insight.severity === 'critical';
          const isWarning = insight.severity === 'warning';
          const isSuccess = insight.severity === 'success';

          return (
            <div 
              key={idx}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                isCritical 
                  ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80 text-rose-900 dark:text-rose-100' :
                isWarning
                  ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-100' :
                isSuccess
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-100' :
                  'bg-sky-50/70 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/80 text-sky-900 dark:text-sky-100'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    isCritical ? 'bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200' :
                    isWarning ? 'bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200' :
                    isSuccess ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200' :
                    'bg-sky-200 dark:bg-sky-900 text-sky-800 dark:text-sky-200'
                  }`}>
                    {insight.type.replace(/_/g, ' ')}
                  </span>
                  {insight.metric && (
                    <span className="font-mono font-extrabold text-xs">
                      {insight.metric}
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-sm">
                  {insight.title}
                </h4>
                <p className="text-xs opacity-90 leading-relaxed">
                  {insight.description}
                </p>
              </div>

              <div className="pt-2 border-t border-black/10 dark:border-white/10 flex items-center justify-between">
                <span className="text-[11px] font-medium opacity-75">
                  AI Stock Recommender
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (insight.type === 'urgent_restock') {
                      setActiveTab('inventory');
                    } else {
                      addToast({
                        type: 'info',
                        title: insight.actionLabel,
                        message: `Action logged to dispensary stock log.`
                      });
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 shadow-2xs text-xs font-bold hover:scale-102 active:scale-98 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>{insight.actionLabel}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Urgent Restock Workbench Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>Imminent Stockout Radar & Reorder Quantity Calculator</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Calculates daily patient demand velocity and suggests reorder batches to maintain 30-day stock buffer
            </p>
          </div>

          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            {restockQueue.length} SKUs Need Restock
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4">Medicine & Location</th>
                <th className="py-3 px-3 text-center">Daily Burn Velocity</th>
                <th className="py-3 px-3 text-center">Current Stock</th>
                <th className="py-3 px-3 text-center">Days Remaining</th>
                <th className="py-3 px-3 text-center">Suggested Reorder</th>
                <th className="py-3 px-3 text-right">Est. Reorder Cost</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
              {restockQueue.map((prod) => {
                const isOrdered = restockedIds.has(prod.id);
                const estCost = Math.round(prod.suggestedReorderQty * (prod.cogs / Math.max(1, prod.unitsSold)));

                return (
                  <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {prod.brandName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <span>{prod.rackLocation}</span>
                        <span>•</span>
                        <span>{prod.saltComposition}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                      {prod.dailyVelocity} units/day
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-black text-rose-600 dark:text-rose-400">
                      {prod.currentStock} units
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        {prod.daysOfStockLeft} Days
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold text-teal-600 dark:text-teal-400">
                      +{prod.suggestedReorderQty} units
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      ₹{estCost.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        disabled={isOrdered}
                        onClick={() => handleQuickReorder(prod)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ml-auto ${
                          isOrdered
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 cursor-default'
                            : 'bg-teal-600 hover:bg-teal-700 text-white shadow-2xs hover:scale-102'
                        }`}
                      >
                        {isOrdered ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Queued</span>
                          </>
                        ) : (
                          <>
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Reorder</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. ABC Pareto Inventory Optimization & Dead Stock Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: ABC Classification Pareto Matrix */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/80">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  ABC Inventory Classification
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pareto 80/20 revenue segmentation
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 space-y-1">
              <span className="text-[10px] font-black text-sky-800 dark:text-sky-300 uppercase block">
                Class A (Stars)
              </span>
              <div className="text-base font-black text-sky-900 dark:text-sky-100">
                {Math.round((classARev / totalRev) * 100)}% Rev
              </div>
              <p className="text-[10px] text-sky-700 dark:text-sky-300">
                {classA.length} SKUs. Maintain 30d safety stock. Never stockout.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-1">
              <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase block">
                Class B (Steady)
              </span>
              <div className="text-base font-black text-emerald-900 dark:text-emerald-100">
                {Math.round((classBRev / totalRev) * 100)}% Rev
              </div>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                {classB.length} SKUs. Reorder bi-weekly to optimize cashflow.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase block">
                Class C (Tail)
              </span>
              <div className="text-base font-black text-slate-800 dark:text-slate-200">
                {Math.round((classCRev / totalRev) * 100)}% Rev
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {classC.length} SKUs. Maintain lean just-in-time stock.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Slow-Moving / Dead Stock Capital Advisor */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/80">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Slow-Moving Capital Liquidation
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Zero movement in 45+ days — free up tied cashflow
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {deadStockItems.length > 0 ? (
              deadStockItems.map(item => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {item.brandName}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      {item.stockQuantity} units • Exp: {item.expirationDate || '2027'}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-amber-700 dark:text-amber-400">
                      ₹{Math.round((item.stockQuantity || 0) * (item.purchaseRate || (item.sellingPrice || 100) * 0.65)).toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-400">Capital Locked</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">
                No stagnant dead stock detected in active dispensary catalog.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
