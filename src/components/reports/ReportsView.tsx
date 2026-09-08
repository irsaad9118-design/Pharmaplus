import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Percent, 
  Trophy, 
  Package, 
  Download, 
  Printer, 
  Calendar, 
  Filter, 
  RefreshCw, 
  Sparkles,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileSpreadsheet,
  Building2,
  X,
  CreditCard,
  FileText
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  generateReportsAnalysis, 
  exportReportsToCsv, 
  exportDailyRevenueToAccountingCsv,
  CATEGORY_COLORS 
} from '../../utils/reportsAnalytics';
import { generateReportsPdf } from '../../utils/reportsPdfGenerator';
import { ReportsKpiCards } from './ReportsKpiCards';
import { MonthlySalesChart } from './MonthlySalesChart';
import { ProfitMarginChart } from './ProfitMarginChart';
import { TopSellingProductsChart } from './TopSellingProductsChart';
import { StockDecisionIntelligence } from './StockDecisionIntelligence';
import { DailyRevenuePeakHoursChart } from './DailyRevenuePeakHoursChart';
import { Top5BestSellingVelocityChart } from './Top5BestSellingVelocityChart';
import { ReportsLowStockWidget } from './ReportsLowStockWidget';
import { ReportsExpirySummaryCard } from './ReportsExpirySummaryCard';
import { ReportsDateRangePicker } from './ReportsDateRangePicker';
import { DateRangeState, calculateDateRange } from '../../utils/dateRangeUtils';

export const ReportsView: React.FC = () => {
  const { transactions, inventory, shopSettings, addToast, setActiveTab, getDaysUntilExpiry } = usePharmacy();

  // Active sub-tab inside Reports
  const [activeReportTab, setActiveReportTab] = useState<'overview' | 'daily_trends' | 'margins' | 'top_products' | 'stock_decisions'>('overview');
  
  // Filters
  const [dateRangeState, setDateRangeState] = useState<DateRangeState>(() => calculateDateRange('6m'));
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Accounting Export Modal State
  const [isAccountingModalOpen, setIsAccountingModalOpen] = useState<boolean>(false);
  const [accountingTimeframe, setAccountingTimeframe] = useState<'7d' | '14d' | '30d' | 'all'>('30d');
  const [includeHourlyBreakdown, setIncludeHourlyBreakdown] = useState<boolean>(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Compute analysis with memoization
  const analysis = useMemo(() => {
    return generateReportsAnalysis(
      transactions, 
      inventory, 
      dateRangeState.preset, 
      selectedCategory,
      { startDate: dateRangeState.startDate, endDate: dateRangeState.endDate }
    );
  }, [transactions, inventory, dateRangeState, selectedCategory]);

  // Total count and sorted list of low stock items across catalog
  const lowStockMedicines = useMemo(() => {
    return (inventory || [])
      .filter(item => {
        const qty = Number(item.stockQuantity ?? 0);
        const minThreshold = Number(item.minAlertLevel ?? item.reorderLevel ?? 15);
        return qty <= minThreshold;
      })
      .sort((a, b) => Number(a.stockQuantity ?? 0) - Number(b.stockQuantity ?? 0));
  }, [inventory]);

  // Selected daily records slice for accounting export
  const selectedAccountingData = useMemo(() => {
    if (!analysis.dailyTrends || analysis.dailyTrends.length === 0) return [];
    if (accountingTimeframe === '7d') return analysis.dailyTrends.slice(-7);
    if (accountingTimeframe === '14d') return analysis.dailyTrends.slice(-14);
    if (accountingTimeframe === '30d') return analysis.dailyTrends.slice(-30);
    return analysis.dailyTrends;
  }, [analysis.dailyTrends, accountingTimeframe]);

  // Summary statistics for accounting preview
  const accountingTotals = useMemo(() => {
    const net = selectedAccountingData.reduce((s, d) => s + d.netRevenue, 0);
    const profit = selectedAccountingData.reduce((s, d) => s + d.grossProfit, 0);
    const cogs = selectedAccountingData.reduce((s, d) => s + d.cogs, 0);
    const invoices = selectedAccountingData.reduce((s, d) => s + d.orderCount, 0);
    const cash = selectedAccountingData.reduce((s, d) => s + d.cashRevenue, 0);
    const upi = selectedAccountingData.reduce((s, d) => s + d.upiRevenue, 0);
    const credit = selectedAccountingData.reduce((s, d) => s + d.creditRevenue, 0);
    const estGst = Math.round((net * 0.12) / 1.12);
    const taxable = net - estGst;
    const margin = net > 0 ? ((profit / net) * 100).toFixed(1) : '0.0';

    return { net, profit, cogs, invoices, cash, upi, credit, estGst, taxable, margin };
  }, [selectedAccountingData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      addToast({
        type: 'info',
        title: 'Reports Data Refreshed',
        message: 'Sales ledger & stock analytics recalculated successfully.'
      });
    }, 400);
  };

  const handleExportCsv = () => {
    const storeName = shopSettings?.shopName || shopSettings?.storeName || 'PharmPulse Pharmacy';
    exportReportsToCsv(analysis, storeName);
    addToast({
      type: 'success',
      title: 'Report Exported (CSV)',
      message: 'Monthly sales, margin analysis, and stock velocity downloaded.'
    });
  };

  const handleDownloadPdfReport = () => {
    setIsGeneratingPdf(true);
    try {
      generateReportsPdf({
        analysis,
        shopSettings,
        dateRange: dateRangeState.preset,
        dateRangeFormattedLabel: `${dateRangeState.label} (${dateRangeState.startDate} to ${dateRangeState.endDate})`,
        selectedCategory,
        activeReportTab,
        inventory,
        getDaysUntilExpiry
      });
      addToast({
        type: 'success',
        title: 'PDF Report Downloaded',
        message: 'Executive performance report and inventory audit generated successfully.'
      });
    } catch (error) {
      console.error('Error generating PDF report:', error);
      addToast({
        type: 'error',
        title: 'PDF Export Failed',
        message: 'An error occurred while compiling the PDF document. Please try again.'
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleExecuteAccountingExport = (overrideDays?: number) => {
    const storeName = shopSettings?.shopName || shopSettings?.storeName || 'PharmPulse Pharmacy';
    const gstin = shopSettings?.gstin || 'N/A';
    const dlNumber = shopSettings?.dlNumber || (shopSettings as any)?.drugLicense || 'N/A';
    const phone = shopSettings?.phone;
    const address = shopSettings?.address;

    let targetData = selectedAccountingData;
    let label = `Last ${accountingTimeframe === 'all' ? 'All' : accountingTimeframe.replace('d', ' Days')} Daily Sales Register`;

    if (overrideDays) {
      targetData = analysis.dailyTrends.slice(-overrideDays);
      label = `Last ${overrideDays} Days Daily Sales Register`;
    }

    exportDailyRevenueToAccountingCsv(targetData, {
      shopName: storeName,
      gstin,
      dlNumber,
      phone,
      address,
      timeframeLabel: label,
      includeHourlyBreakdown: includeHourlyBreakdown,
      hourlyData: analysis.hourlyTrends
    });

    setIsAccountingModalOpen(false);

    addToast({
      type: 'success',
      title: 'Daily Accounting Ledger Downloaded',
      message: `${targetData.length} days of daily sales, Cash/UPI reconciliations, and GST liabilities saved to CSV.`
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="pharmpulse-reports-view" className="space-y-4 sm:space-y-5 pb-12">
      {/* 1. Header & Controls Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                Sales, Profit Margins & Stock Decision Intelligence
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Recharts analytical dashboard for monthly performance, product profitability, and data-driven restocking decisions
            </p>
          </div>

          {/* Action Buttons: Refresh, CSV Export, Print */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleRefresh}
              className="px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              title="Recalculate analytics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {/* Dedicated External Accounting CSV Export Button */}
            <button
              type="button"
              onClick={() => setIsAccountingModalOpen(true)}
              id="export-daily-accounting-csv-btn"
              className="px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800/80 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Export daily revenue & sales journal for external accounting (Tally / Zoho / CA Audit)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Export for Accounting (CSV)</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              id="export-reports-csv-btn"
              className="px-3 py-2 text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800/80 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Export comprehensive report including monthly trends and category margins"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Full CSV</span>
            </button>

            {/* Download PDF Report for Offline Review */}
            <button
              type="button"
              onClick={handleDownloadPdfReport}
              disabled={isGeneratingPdf}
              id="download-reports-pdf-btn"
              className="px-3 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
              title="Download comprehensive PDF audit report capturing current dashboard metrics, category margins, and batch expiry for offline review"
            >
              {isGeneratingPdf ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 text-teal-400 dark:text-teal-600" />
                  <span>Download PDF Report</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>

        {/* Filters Row: Time Range Selector & Category Filter */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
          {/* Enhanced Date Range Picker */}
          <ReportsDateRangePicker
            value={dateRangeState}
            onChange={setDateRangeState}
          />

          {/* Category Dropdown */}
          <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Category:
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Therapeutic Classes</option>
              {Object.keys(CATEGORY_COLORS).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 dark:border-slate-700/60 scrollbar-none">
          {[
            { id: 'overview', label: 'Overview & Velocity', icon: BarChart3 },
            { id: 'daily_trends', label: 'Daily Revenue & Peak Hours', icon: Clock },
            { id: 'margins', label: 'Profit Margins Analysis', icon: Percent },
            { id: 'top_products', label: 'Top Products & Molecules', icon: Trophy },
            { id: 'stock_decisions', label: 'Stock Decisions & Restock Radar', icon: Package }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeReportTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                id={`reports-tab-${tab.id}`}
                onClick={() => setActiveReportTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Top Metric KPI Summary Cards */}
      <ReportsKpiCards 
        analysis={analysis} 
        onFilterRestock={() => setActiveReportTab('stock_decisions')}
        onFilterDeadStock={() => setActiveReportTab('stock_decisions')}
      />

      {/* 2.5 Low-Stock Inventory Alert & Quick Restock Widget */}
      <ReportsLowStockWidget 
        lowStockItems={lowStockMedicines}
        onNavigateToInventory={() => {
          setActiveTab('inventory');
          addToast({
            type: 'info',
            title: 'Opening Inventory Management',
            message: `Loaded inventory catalog with ${lowStockMedicines.length} low-stock medicines for restocking.`
          });
        }}
        dateRangeLabel={dateRangeState.shortLabel}
      />

      {/* 2.6 Proactive Medicine Batch Expiry Horizon Summary Card (Next 30, 60, 90 Days) */}
      <ReportsExpirySummaryCard 
        inventory={inventory}
        getDaysUntilExpiry={getDaysUntilExpiry}
        dateRangeFilter={dateRangeState}
        onNavigateToExpiryCenter={(categoryFilter) => {
          setActiveTab('expiry');
          addToast({
            type: 'info',
            title: 'Opening Expiry Alert Center',
            message: categoryFilter && categoryFilter !== 'all' 
              ? `Filtered for batches expiring within ${categoryFilter.replace('days', ' days')}.` 
              : 'Opened Expiry Alert Center with near-expiry batch management.'
          });
        }}
      />

      {/* 3. Sub-Tab Dynamic Views */}
      {activeReportTab === 'overview' && (
        <div className="space-y-4">
          {/* Top 5 Best-Selling Medicines by Revenue & Inventory Velocity Horizontal Bar Chart */}
          <Top5BestSellingVelocityChart 
            products={analysis.topProducts}
            onNavigateToStock={() => setActiveReportTab('stock_decisions')}
          />

          {/* Daily Revenue Velocity & Peak Sales Hours Area Chart */}
          <DailyRevenuePeakHoursChart 
            dailyData={analysis.dailyTrends}
            hourlyData={analysis.hourlyTrends}
            dayOfWeekData={analysis.dayOfWeekTrends}
            insights={analysis.dailyHourlyInsights}
            shopDetails={{
              shopName: shopSettings?.shopName || shopSettings?.storeName || 'PharmPulse Pharmacy',
              gstin: shopSettings?.gstin,
              dlNumber: shopSettings?.dlNumber || (shopSettings as any)?.drugLicense,
              phone: shopSettings?.phone,
              address: shopSettings?.address
            }}
            onExportDailyAccountingCsv={(days) => {
              setAccountingTimeframe(days === 7 ? '7d' : days === 14 ? '14d' : '30d');
              setIsAccountingModalOpen(true);
            }}
          />

          {/* Monthly Sales & Profit Area Chart */}
          <MonthlySalesChart data={analysis.monthlyTrends} />

          {/* Two-Column Side-by-Side: Profit Margins & Top Movers Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ProfitMarginChart categories={analysis.categoryBreakdown} />
            <StockDecisionIntelligence 
              products={analysis.topProducts} 
              insights={analysis.insights} 
            />
          </div>
        </div>
      )}

      {activeReportTab === 'daily_trends' && (
        <div className="space-y-4">
          {/* External Accounting & CA Reconciliation Banner */}
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-emerald-700/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <FileSpreadsheet className="w-4 h-4" />
                </span>
                <h4 className="font-black text-sm sm:text-base text-white">
                  External Accounting & CA Reconciliation Export
                </h4>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-200 rounded-full border border-emerald-400/30">
                  Tally / Zoho / GST Ready
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 max-w-2xl leading-relaxed">
                Export clean, audit-compliant day-by-day revenue journals with separate Cash in Hand, UPI clearing, Khata credit accounts, and estimated GST output liability columns for your external accountant or tax auditor.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                id="banner-export-daily-accounting-btn"
                onClick={() => setIsAccountingModalOpen(true)}
                className="px-4 py-2.5 text-xs font-black text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Daily Ledger (CSV)</span>
              </button>
            </div>
          </div>

          {/* Detailed Full-Width Daily Revenue & Peak Sales Hours View */}
          <DailyRevenuePeakHoursChart 
            dailyData={analysis.dailyTrends}
            hourlyData={analysis.hourlyTrends}
            dayOfWeekData={analysis.dayOfWeekTrends}
            insights={analysis.dailyHourlyInsights}
            shopDetails={{
              shopName: shopSettings?.shopName || shopSettings?.storeName || 'PharmPulse Pharmacy',
              gstin: shopSettings?.gstin,
              dlNumber: shopSettings?.dlNumber || (shopSettings as any)?.drugLicense,
              phone: shopSettings?.phone,
              address: shopSettings?.address
            }}
            onExportDailyAccountingCsv={(days) => {
              setAccountingTimeframe(days === 7 ? '7d' : days === 14 ? '14d' : '30d');
              setIsAccountingModalOpen(true);
            }}
          />

          {/* Macro Context & Therapeutic Class Margins */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MonthlySalesChart data={analysis.monthlyTrends} />
            <ProfitMarginChart categories={analysis.categoryBreakdown} />
          </div>
        </div>
      )}

      {activeReportTab === 'margins' && (
        <div className="space-y-4">
          <ProfitMarginChart categories={analysis.categoryBreakdown} />
          
          {/* Category Deep-Dive Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Detailed Category Profitability Breakdown
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gross revenue contribution and margin realization per medical therapy class
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">Therapeutic Class</th>
                    <th className="py-3 px-3 text-right">Gross Sales (INR)</th>
                    <th className="py-3 px-3 text-right">Gross Profit (INR)</th>
                    <th className="py-3 px-3 text-right">Margin %</th>
                    <th className="py-3 px-3 text-center">Units Sold</th>
                    <th className="py-3 px-3 text-center">Catalog SKUs</th>
                    <th className="py-3 px-4 text-center">Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                  {analysis.categoryBreakdown.map((cat, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: cat.color }} />
                        <span>{cat.category}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ₹{cat.grossSales.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{cat.grossProfit.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className={`px-2 py-0.5 rounded-md font-mono font-extrabold text-[11px] ${
                          cat.profitMarginPercent >= 35 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          cat.profitMarginPercent >= 28 ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {cat.profitMarginPercent}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-700 dark:text-slate-300">
                        {cat.unitsSold}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-500">
                        {cat.productCount}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[11px] text-slate-600 dark:text-slate-300">
                          {cat.profitMarginPercent >= 35 ? '🌟 Prime Profit Driver' :
                           cat.grossSales > 50000 ? '⚡ High Volume Pillar' :
                           'Maintain Buffer'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeReportTab === 'top_products' && (
        <div className="space-y-4">
          <Top5BestSellingVelocityChart 
            products={analysis.topProducts}
            onNavigateToStock={() => setActiveReportTab('stock_decisions')}
          />
          <TopSellingProductsChart 
            products={analysis.topProducts}
            salts={analysis.topSalts}
          />
        </div>
      )}

      {activeReportTab === 'stock_decisions' && (
        <StockDecisionIntelligence 
          products={analysis.topProducts}
          insights={analysis.insights}
        />
      )}

      {/* 4. Store Owner Accounting & CA CSV Export Modal */}
      {isAccountingModalOpen && (
        <div 
          id="accounting-export-modal" 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-4 sm:p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Export Daily Sales for External Accounting
                  </h3>
                  <p className="text-xs text-emerald-200/90 font-medium">
                    Ledger journal formatted for CA tax audits, Tally, Zoho Books, & Excel reconciliation
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="close-accounting-export-modal-btn"
                onClick={() => setIsAccountingModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 flex items-center justify-center transition-colors cursor-pointer"
                title="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Store & Tax Identity Stamp */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-bold text-slate-900 dark:text-white">
                    {shopSettings?.shopName || shopSettings?.storeName || 'PharmPulse Pharmacy'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                  <span>GSTIN: <strong className="text-slate-700 dark:text-slate-200">{shopSettings?.gstin || '27AABCP1234K1Z5'}</strong></span>
                  <span>DL: <strong className="text-slate-700 dark:text-slate-200">{shopSettings?.dlNumber || 'DL-20B/4819'}</strong></span>
                </div>
              </div>

              {/* Timeframe Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Select Accounting Period:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: '7d', label: 'Last 7 Days', sub: 'Weekly Audit' },
                    { id: '14d', label: 'Last 14 Days', sub: 'Fortnightly' },
                    { id: '30d', label: 'Last 30 Days', sub: 'Monthly MTD' },
                    { id: 'all', label: 'All History', sub: 'Full Database' }
                  ].map(tf => (
                    <button
                      key={tf.id}
                      id={`select-accounting-period-${tf.id}-btn`}
                      type="button"
                      onClick={() => setAccountingTimeframe(tf.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        accountingTimeframe === tf.id
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 dark:border-emerald-500/80 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div className={`text-xs font-black ${accountingTimeframe === tf.id ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'}`}>
                        {tf.label}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {tf.sub}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Metrics to be exported */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Ledger Preview Summary ({selectedAccountingData.length} Days)</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{accountingTotals.invoices} Bills Recorded</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Net Sales Turnover</span>
                    <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                      ₹{accountingTotals.net.toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Gross Margin ({accountingTotals.margin}%)</span>
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ₹{accountingTotals.profit.toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Est. GST Output (12%)</span>
                    <p className="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5">
                      ₹{accountingTotals.estGst.toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Cash Counter Receipts</span>
                    <p className="text-sm font-black text-blue-600 dark:text-blue-400 mt-0.5">
                      ₹{accountingTotals.cash.toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">UPI Bank Clearing</span>
                    <p className="text-sm font-black text-teal-600 dark:text-teal-400 mt-0.5">
                      ₹{accountingTotals.upi.toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Khata Debtors (Due)</span>
                    <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                      ₹{accountingTotals.credit.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Options: Include Hourly Distribution */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="include-hourly-accounting-checkbox"
                    checked={includeHourlyBreakdown}
                    onChange={(e) => setIncludeHourlyBreakdown(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 dark:bg-slate-900"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Include Peak Operating Hours & Store Traffic Table
                    </span>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Appends hourly transaction volume and rush status to the bottom of the CSV for staffing analysis.
                    </p>
                  </div>
                </label>
              </div>

              {/* Accountant Compatibility Note */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-emerald-900 dark:text-emerald-200 leading-relaxed">
                  <strong>Double-Entry Ready:</strong> The CSV contains explicit debit/credit allocation mappings (Cash in Hand, Bank Clearing, Sundry Debtors, Pharmacy Sales Turnover, and Output GST Liability) so your accountant or auditor can import directly without reformatting.
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsAccountingModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                id="confirm-accounting-export-btn"
                onClick={() => handleExecuteAccountingExport()}
                className="px-5 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Accounting CSV ({selectedAccountingData.length} Days)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
