import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MedicationInventory, ShopSettings } from '../types/pharmacy';
import { ComprehensiveReportsAnalysis } from './reportsAnalytics';

export interface GenerateReportsPdfOptions {
  analysis: ComprehensiveReportsAnalysis;
  shopSettings: ShopSettings | null;
  dateRange: 'today' | 'this_week' | 'last_7d' | 'this_month' | '30d' | '90d' | '6m' | '1y' | 'all' | 'custom' | string;
  selectedCategory: string;
  activeReportTab: 'overview' | 'daily_trends' | 'margins' | 'top_products' | 'stock_decisions';
  inventory: MedicationInventory[];
  getDaysUntilExpiry: (dateStr: string) => number;
  dateRangeFormattedLabel?: string;
}

export const generateReportsPdf = ({
  analysis,
  shopSettings,
  dateRange,
  selectedCategory,
  activeReportTab,
  inventory,
  getDaysUntilExpiry,
  dateRangeFormattedLabel
}: GenerateReportsPdfOptions): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const storeName = (shopSettings?.storeName || shopSettings?.shopName || 'PHARMPULSE HEALTHCARE').toUpperCase();
  const address = shopSettings?.address || 'Medical Store, Healthcare Complex';
  const phone = shopSettings?.phone || '+91 (800) 555-0199';
  const email = shopSettings?.email || 'admin@pharmpulse.local';
  const dlNo = shopSettings?.drugLicense || shopSettings?.dlNumber || 'DL-20B/3891 • 21B/3892';
  const gstin = shopSettings?.gstin || '07AAAAA0000A1Z5';

  const rangeLabelMap: Record<string, string> = {
    'today': 'Today',
    'this_week': 'This Week',
    'last_7d': 'Last 7 Days',
    'this_month': 'This Month',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    '6m': 'Last 6 Months',
    '1y': 'Year 2026',
    'all': 'All Historical Data',
    'custom': 'Custom Time Interval'
  };
  const activeRangeLabel = dateRangeFormattedLabel || rangeLabelMap[dateRange] || dateRange;
  const activeCategoryLabel = selectedCategory === 'all' ? 'All Therapeutic Classes' : selectedCategory;

  const tabLabelMap: Record<string, string> = {
    'overview': 'Executive Overview',
    'daily_trends': 'Daily & Peak Hours Revenue',
    'margins': 'Profit Margin Analysis',
    'top_products': 'Fast-Moving Products & Velocity',
    'stock_decisions': 'Stock Intelligence & Restock'
  };
  const activeTabLabel = tabLabelMap[activeReportTab] || 'Executive Overview';

  const generatedDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const generatedTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  const reportRefNo = `REP-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

  // --- Calculate Inventory & Expiry Metrics for Offline Review ---
  const activeInventory = (inventory || []).filter(item => (item.stockQuantity ?? 0) > 0 && !item.quarantined);
  let expiring30DaysCount = 0;
  let expiring60DaysCount = 0;
  let expiring90DaysCount = 0;
  let expiredCount = 0;
  let totalAtRiskCost = 0;

  const criticalBatches: Array<{
    name: string;
    batch: string;
    exp: string;
    days: number;
    stock: number;
    rack: string;
    val: number;
  }> = [];

  activeInventory.forEach(item => {
    const days = getDaysUntilExpiry(item.expirationDate || '');
    const cost = item.purchaseRate ?? item.costPrice ?? ((item.mrp ?? 0) * 0.7);
    const stockVal = Number((cost * (item.stockQuantity ?? 0)).toFixed(2));

    if (days <= 0) {
      expiredCount++;
    } else if (days <= 30) {
      expiring30DaysCount++;
      totalAtRiskCost += stockVal;
      criticalBatches.push({
        name: item.brandName,
        batch: item.batchNumber || 'N/A',
        exp: item.expirationDate || 'N/A',
        days,
        stock: item.stockQuantity ?? 0,
        rack: item.locationShelf || item.rackNumber || 'Rack A',
        val: stockVal
      });
    } else if (days <= 60) {
      expiring60DaysCount++;
      totalAtRiskCost += stockVal;
      criticalBatches.push({
        name: item.brandName,
        batch: item.batchNumber || 'N/A',
        exp: item.expirationDate || 'N/A',
        days,
        stock: item.stockQuantity ?? 0,
        rack: item.locationShelf || item.rackNumber || 'Rack B',
        val: stockVal
      });
    } else if (days <= 90) {
      expiring90DaysCount++;
      totalAtRiskCost += stockVal;
    }
  });

  const lowStockCount = activeInventory.filter(item => {
    const qty = Number(item.stockQuantity ?? 0);
    const threshold = Number(item.minAlertLevel ?? item.reorderLevel ?? 15);
    return qty <= threshold;
  }).length;

  // ==========================================
  // PAGE 1: HEADER & EXECUTIVE SUMMARY
  // ==========================================

  // 1. Header Banner (Deep Slate / Navy)
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, 210, 36, 'F');

  // Accent Line (Teal 600)
  doc.setFillColor(13, 148, 136); // Teal 600
  doc.rect(0, 36, 210, 2.5, 'F');

  // Pharmacy Name & Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(storeName, 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text(`${address} • Ph: ${phone} • Email: ${email}`, 14, 18.5);
  doc.text(`Drug Lic: ${dlNo}  |  GSTIN: ${gstin}`, 14, 23.5);

  // Right Header: Document Title & Metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text('EXECUTIVE AUDIT & PERFORMANCE REPORT', 196, 13, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Report Ref: ${reportRefNo}`, 196, 18.5, { align: 'right' });
  doc.text(`Generated: ${generatedDate}, ${generatedTime}`, 196, 23.5, { align: 'right' });
  doc.text('Status: Verified Offline Audit Copy', 196, 28.5, { align: 'right' });

  // 2. Dashboard State Filter Context Box
  let currentY = 43;
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(14, currentY, 182, 12, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('ACTIVE DASHBOARD FILTER CONTEXT:', 18, currentY + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Date Range: `, 75, currentY + 7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 148, 136); // Teal
  doc.text(activeRangeLabel, 91, currentY + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Therapeutic Scope: `, 122, currentY + 7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(activeCategoryLabel, 149, currentY + 7.5);

  currentY += 16;

  // 3. Executive KPI Metric Cards (2x3 Grid)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. FINANCIAL & OPERATIONAL PERFORMANCE SUMMARY', 14, currentY);
  currentY += 4;

  const kpis = [
    {
      title: 'NET SALES REVENUE',
      value: `Rs. ${analysis.summary.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      sub: `${analysis.summary.totalTransactions} Invoices Billed`,
      color: [13, 148, 136] // Teal
    },
    {
      title: 'GROSS PROFIT',
      value: `Rs. ${analysis.summary.totalGrossProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      sub: `${analysis.summary.overallProfitMargin.toFixed(1)}% Overall Margin`,
      color: [16, 185, 129] // Emerald
    },
    {
      title: 'AVG INVOICE VALUE',
      value: `Rs. ${analysis.summary.averageOrderValue.toFixed(0)}`,
      sub: `${analysis.summary.totalUnitsSold.toLocaleString()} Total Units Sold`,
      color: [2, 132, 199] // Sky
    },
    {
      title: 'FAST-MOVING SKUS',
      value: `${analysis.summary.fastMovingSkuCount} Items`,
      sub: `${analysis.summary.classAShareRevenuePercent}% Revenue in Class A`,
      color: [99, 102, 241] // Indigo
    },
    {
      title: 'DEAD STOCK CAPITAL',
      value: `Rs. ${analysis.summary.deadStockCapital.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      sub: 'Slow / Zero Movement Stock',
      color: [245, 158, 11] // Amber
    },
    {
      title: 'CRITICAL RESTOCKS',
      value: `${analysis.summary.criticalRestockCount} SKUs`,
      sub: `${lowStockCount} Items Below Min Alert`,
      color: [225, 29, 72] // Rose
    }
  ];

  const cardW = 58;
  const cardH = 17;
  const gapX = 4;
  const gapY = 3.5;

  kpis.forEach((kpi, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = 14 + col * (cardW + gapX);
    const y = currentY + row * (cardH + gapY);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, cardW, cardH, 1.5, 1.5, 'FD');

    // Left accent bar
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.rect(x, y, 2.5, cardH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.title, x + 5, y + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, x + 5, y + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.sub, x + 5, y + 14.5);
  });

  currentY += (cardH * 2) + gapY + 6;

  // 4. Shelf-Life & Expiry Horizons Status (30, 60, 90 Days)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. INVENTORY SHELF-LIFE & NEAR-EXPIRY RISK HORIZONS', 14, currentY);
  currentY += 4;

  const expiryHorizons = [
    {
      horizon: 'Next 30 Days (Immediate Risk)',
      batches: `${expiring30DaysCount} Batches`,
      status: 'Action: Clearance Markdown / Return',
      badgeColor: [225, 29, 72]
    },
    {
      horizon: '31–60 Days (Clearance Window)',
      batches: `${expiring60DaysCount} Batches`,
      status: 'Action: Counter Promo / Reorder Pause',
      badgeColor: [245, 158, 11]
    },
    {
      horizon: '61–90 Days (Advance Notice)',
      batches: `${expiring90DaysCount} Batches`,
      status: 'Action: Stockist Credit Note Request',
      badgeColor: [2, 132, 199]
    },
    {
      horizon: 'Total 90-Day At-Risk Value',
      batches: `Rs. ${totalAtRiskCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      status: `${expiring30DaysCount + expiring60DaysCount + expiring90DaysCount} Batches Total At Risk`,
      badgeColor: [15, 23, 42]
    }
  ];

  const expCardW = 43.5;
  const expCardH = 15;
  const expGapX = 2.6;

  expiryHorizons.forEach((h, idx) => {
    const x = 14 + idx * (expCardW + expGapX);
    const y = currentY;

    doc.setFillColor(254, 242, 242); // Soft tint
    doc.setDrawColor(254, 205, 211);
    if (idx === 1) {
      doc.setFillColor(255, 251, 235);
      doc.setDrawColor(253, 230, 138);
    } else if (idx === 2) {
      doc.setFillColor(240, 249, 255);
      doc.setDrawColor(186, 230, 253);
    } else if (idx === 3) {
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(226, 232, 240);
    }

    doc.roundedRect(x, y, expCardW, expCardH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(h.badgeColor[0], h.badgeColor[1], h.badgeColor[2]);
    doc.text(h.horizon, x + 3, y + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(h.batches, x + 3, y + 9.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(71, 85, 105);
    doc.text(h.status, x + 3, y + 13);
  });

  currentY += expCardH + 6;

  // 5. Monthly Sales Trend Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3. MONTHLY SALES & MARGIN TRAJECTORY', 14, currentY);
  currentY += 2;

  const monthlyTableRows = (analysis.monthlyTrends || []).map(m => [
    m.monthLabel,
    m.transactionCount.toString(),
    `Rs. ${m.netSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
    `Rs. ${m.cogs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
    `Rs. ${m.grossProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
    `${m.profitMarginPercent.toFixed(1)}%`,
    `Rs. ${m.averageOrderValue.toFixed(0)}`,
    m.momGrowthPercent !== undefined ? `${m.momGrowthPercent >= 0 ? '+' : ''}${m.momGrowthPercent.toFixed(1)}%` : '—'
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [[
      'Month',
      'Invoices',
      'Net Revenue',
      'COGS',
      'Gross Profit',
      'Margin %',
      'Avg Order',
      'MoM Growth'
    ]],
    body: monthlyTableRows,
    theme: 'grid',
    styles: {
      fontSize: 7.2,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 26, fontStyle: 'bold' },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
      3: { halign: 'right', cellWidth: 26 },
      4: { halign: 'right', cellWidth: 26, fontStyle: 'bold' },
      5: { halign: 'center', cellWidth: 18 },
      6: { halign: 'right', cellWidth: 20 },
      7: { halign: 'center', cellWidth: 20 }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 14, right: 14 }
  });

  // ==========================================
  // PAGE 2: CATEGORY BREAKDOWN & TOP PRODUCTS
  // ==========================================
  doc.addPage();
  currentY = 18;

  // Header Sub-banner on Page 2
  doc.setFillColor(15, 23, 42);
  doc.rect(14, currentY, 182, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('PHARMPULSE ANALYTICS • SECTION II: CATEGORY PROFITABILITY & VELOCITY', 18, currentY + 5.5);
  currentY += 12;

  // 6. Therapeutic Category Breakdown Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('4. THERAPEUTIC CATEGORY MARGIN & REVENUE SHARE', 14, currentY);
  currentY += 2;

  const categoryRows = (analysis.categoryBreakdown || []).map(cat => [
    cat.category,
    cat.productCount.toString(),
    cat.unitsSold.toLocaleString(),
    `Rs. ${cat.grossSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
    `Rs. ${cat.grossProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
    `${cat.profitMarginPercent.toFixed(1)}%`,
    `${((cat.grossSales / (analysis.summary.totalRevenue || 1)) * 100).toFixed(1)}%`
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [[
      'Therapeutic Class',
      'SKU Count',
      'Units Sold',
      'Revenue (Rs.)',
      'Profit (Rs.)',
      'Margin %',
      'Rev Share'
    ]],
    body: categoryRows,
    theme: 'grid',
    styles: {
      fontSize: 7.2,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [13, 148, 136], // Teal
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 54, fontStyle: 'bold' },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 26, fontStyle: 'bold' },
      4: { halign: 'right', cellWidth: 24 },
      5: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      6: { halign: 'center', cellWidth: 20 }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 7. Top Best-Selling Medicines by Velocity & Revenue
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('5. TOP MEDICINES BY REVENUE VELOCITY & STOCK HEALTH', 14, currentY);
  currentY += 2;

  const topProductRows = (analysis.topProducts || []).slice(0, 8).map((prod, index) => [
    `#${index + 1} ${prod.brandName}`,
    prod.saltComposition || prod.genericName,
    prod.unitsSold.toString(),
    `Rs. ${prod.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
    `Rs. ${prod.grossProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
    `${prod.profitMarginPercent.toFixed(0)}%`,
    prod.currentStock.toString(),
    `${prod.daysOfStockLeft}d`,
    prod.stockStatus.toUpperCase(),
    prod.abcClass
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [[
      'Brand Name',
      'Salt / Molecule',
      'Sold',
      'Revenue',
      'Profit',
      'Margin',
      'Stock',
      'Days',
      'Status',
      'Class'
    ]],
    body: topProductRows,
    theme: 'grid',
    styles: {
      fontSize: 6.8,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 32, fontStyle: 'bold' },
      1: { halign: 'left', cellWidth: 40 },
      2: { halign: 'center', cellWidth: 12 },
      3: { halign: 'right', cellWidth: 20, fontStyle: 'bold' },
      4: { halign: 'right', cellWidth: 18 },
      5: { halign: 'center', cellWidth: 12 },
      6: { halign: 'center', cellWidth: 12, fontStyle: 'bold' },
      7: { halign: 'center', cellWidth: 12 },
      8: { halign: 'center', cellWidth: 14, fontStyle: 'bold' },
      9: { halign: 'center', cellWidth: 10, fontStyle: 'bold' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 8. Critical Near-Expiry Batches (Top 5)
  if (criticalBatches.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(225, 29, 72); // Rose
    doc.text('6. ACTIONABLE NEAR-EXPIRY BATCHES (≤ 60 DAYS)', 14, currentY);
    currentY += 2;

    const criticalBatchRows = criticalBatches.slice(0, 5).map(b => [
      b.name,
      b.batch,
      b.exp,
      `${b.days}d`,
      b.stock.toString(),
      `Rs. ${b.val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      b.rack,
      b.days <= 30 ? 'CRITICAL RETURN' : 'CLEARANCE SCHEME'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [[
        'Medicine',
        'Batch No',
        'Expiry Date',
        'Days Left',
        'Shelf Units',
        'At Risk Value',
        'Rack Location',
        'Action Required'
      ]],
      body: criticalBatchRows,
      theme: 'grid',
      styles: {
        fontSize: 6.8,
        cellPadding: 1.8,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2
      },
      headStyles: {
        fillColor: [225, 29, 72], // Rose
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.2,
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 40, fontStyle: 'bold' },
        1: { halign: 'center', cellWidth: 22 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
        4: { halign: 'center', cellWidth: 16 },
        5: { halign: 'right', cellWidth: 20, fontStyle: 'bold' },
        6: { halign: 'center', cellWidth: 22 },
        7: { halign: 'center', cellWidth: 26, fontStyle: 'bold' }
      },
      alternateRowStyles: {
        fillColor: [255, 241, 242]
      },
      margin: { left: 14, right: 14 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 9. Signatures & Audit Certification Block
  if (currentY > 245) {
    doc.addPage();
    currentY = 25;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, 182, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('AUDIT CERTIFICATION & MANAGEMENT REVIEW', 18, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'This report captures the current financial position, sales velocity, and inventory health metrics of the pharmacy for internal offline review, tax verification, and stockist reconciliation.',
    18,
    currentY + 11,
    { maxWidth: 174 }
  );

  const sigLineY = currentY + 22;
  doc.setDrawColor(203, 213, 225);
  doc.line(18, sigLineY, 75, sigLineY);
  doc.line(125, sigLineY, 182, sigLineY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Authorized Pharmacist / Manager', 18, sigLineY + 4);
  doc.text('Store Owner / Internal Auditor', 182, sigLineY + 4, { align: 'right' });

  // ==========================================
  // FOOTERS ON ALL PAGES
  // ==========================================
  const totalPages = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : ((doc as any).internal?.getNumberOfPages?.() || 2);
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 287, 196, 287);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`PharmPulse Pharmacy Management SaaS • Confidential Audit Document • ${reportRefNo}`, 14, 291);
    doc.text(`Page ${i} of ${totalPages}`, 196, 291, { align: 'right' });
  }

  // Save / Trigger Download
  const cleanStore = storeName.replace(/[^a-zA-Z0-9]/g, '_');
  const safeRange = dateRange.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `${cleanStore}_Dashboard_Report_${safeRange}_${reportRefNo}.pdf`;
  doc.save(fileName);
};
