import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  TrendingUp, 
  Medal, 
  Flame, 
  Building2, 
  IndianRupee, 
  Filter, 
  RefreshCw, 
  Layers, 
  Sparkles, 
  Activity,
  Package,
  Pill,
  BarChart3,
  Calendar
} from 'lucide-react';
import { SalesLeaderboardData } from '../../types/pharmacy';

interface SalesLeaderboardProps {
  onSelectMedicine?: (name: string) => void;
}

export const SalesLeaderboard: React.FC<SalesLeaderboardProps> = ({ onSelectMedicine }) => {
  const [leaderboard, setLeaderboard] = useState<SalesLeaderboardData | null>(null);
  const [daysFilter, setDaysFilter] = useState<number>(30);
  const [activeTab, setActiveTab] = useState<'medicines' | 'salts'>('medicines');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics/leaderboard?days=${daysFilter}`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data);
      }
    } catch (e) {
      console.error('Failed to load sales leaderboard', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [daysFilter]);

  // Rank badge styling helper
  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-extrabold flex items-center justify-center text-xs border border-amber-300">
          🥇 1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold flex items-center justify-center text-xs border border-slate-300">
          🥈 2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="w-6 h-6 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 font-extrabold flex items-center justify-center text-xs border border-amber-600/40">
          🥉 3
        </span>
      );
    }
    return (
      <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold flex items-center justify-center text-xs">
        #{rank}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Leaderboard Summary & Timeframe Selector */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800/40">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Top Selling Products & Salt Leaderboard
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                  MARKET DEMAND
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ranked product velocities and high-demand chemical salts across all registered medical stores
              </p>
            </div>
          </div>

          {/* Timeframe Filter Pills */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setDaysFilter(1)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  daysFilter === 1 
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold' 
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setDaysFilter(7)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  daysFilter === 7 
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold' 
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setDaysFilter(30)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  daysFilter === 30 
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold' 
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                30 Days
              </button>
            </div>

            <button
              onClick={fetchLeaderboard}
              disabled={isLoading}
              className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors"
              title="Refresh Leaderboard"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* High-Level Fleet Performance Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Platform Sales (GMV)</span>
            <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              ₹{(leaderboard?.summary?.totalPlatformGMV ?? 2639).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold mt-0.5">
              Filtered ({daysFilter} days)
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Strips/Units Dispensed</span>
            <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              {leaderboard?.summary?.totalPlatformUnits ?? 22} units
            </div>
            <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
              Across all categories
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Invoices Processed</span>
            <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              {leaderboard?.summary?.totalInvoicesCount ?? 8} bills
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Avg ticket ₹{Math.round((leaderboard?.summary?.totalPlatformGMV || 2639) / (leaderboard?.summary?.totalInvoicesCount || 1))}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Active Pharmacies Selling</span>
            <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              {leaderboard?.summary?.activePharmaciesCount ?? 3} Stores
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
              100% active billing
            </div>
          </div>

        </div>

      </div>

      {/* Leaderboard View Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('medicines')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
            activeTab === 'medicines'
              ? 'bg-teal-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          <Pill className="w-3.5 h-3.5" />
          <span>Top 10 Most-Sold Medicines</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
            {leaderboard?.topMedicines?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('salts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
            activeTab === 'salts'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Top 5 Most-Demanded Salt Compositions</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
            {leaderboard?.topSalts?.length || 0}
          </span>
        </button>
      </div>

      {/* TAB 1: TOP MEDICINES LEADERBOARD */}
      {activeTab === 'medicines' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>Top 10 Product Leaderboard ({daysFilter === 1 ? 'Today' : `${daysFilter} Days`})</span>
            </h3>
            <span className="text-xs text-slate-500">Sorted by units dispensed & revenue</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">Rank</th>
                  <th className="py-3 px-4">Medicine Brand Name</th>
                  <th className="py-3 px-4">Generic Salt Composition</th>
                  <th className="py-3 px-4 text-center">Units Dispensed</th>
                  <th className="py-3 px-4 text-right">Avg Rate (₹)</th>
                  <th className="py-3 px-4 text-right">Total Revenue (₹)</th>
                  <th className="py-3 px-4 text-center">Stores Selling</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-4 h-4 animate-spin text-teal-600 inline mr-2" />
                      Loading sales leaderboard rankings...
                    </td>
                  </tr>
                ) : (leaderboard?.topMedicines || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No medicine transactions found in this time period.
                    </td>
                  </tr>
                ) : (
                  (leaderboard?.topMedicines || []).map((med) => (
                    <tr key={med.brandName} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center">
                          {renderRankBadge(med.rank)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          {med.brandName}
                        </div>
                        {med.strength && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            Strength: {med.strength}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-700 dark:text-slate-300 font-medium">
                          {med.saltComposition}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold">
                        <span className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                          {med.totalUnitsSold} {med.unit?.includes('Strip') ? 'Strips' : 'Units'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                        ₹{med.avgPrice.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 dark:text-white text-sm">
                        ₹{med.totalRevenue.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <Building2 className="w-3 h-3 text-purple-600" />
                          <span>{med.storeCount} Pharmacy</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TOP SALT COMPOSITIONS LEADERBOARD */}
      {activeTab === 'salts' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>Top 5 High-Demand Generic Salt Formulations</span>
            </h3>
            <span className="text-xs text-slate-500">Aggregated across all pharmaceutical brands</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">Rank</th>
                  <th className="py-3 px-4">Chemical / Salt Composition</th>
                  <th className="py-3 px-4">Top Brands Dispensed</th>
                  <th className="py-3 px-4 text-center">Total Volume Sold</th>
                  <th className="py-3 px-4 text-right">Aggregate Sales (₹)</th>
                  <th className="py-3 px-4 text-center">Active Stores</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-4 h-4 animate-spin text-purple-600 inline mr-2" />
                      Loading salt formulation demand...
                    </td>
                  </tr>
                ) : (leaderboard?.topSalts || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No salt demand records found in this time period.
                    </td>
                  </tr>
                ) : (
                  (leaderboard?.topSalts || []).map((salt) => (
                    <tr key={salt.saltComposition} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center">
                          {renderRankBadge(salt.rank)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          {salt.saltComposition}
                        </div>
                        <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
                          {salt.brandsCount} distinct commercial brand(s) active
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {salt.topBrands.map((b, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              {b}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold">
                        <span className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          {salt.totalUnitsSold} Units
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 dark:text-white text-sm">
                        ₹{salt.totalRevenue.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <Building2 className="w-3 h-3 text-teal-600" />
                          <span>{salt.storeCount} Stores</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
