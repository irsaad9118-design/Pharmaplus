import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MedicationInventory, ShopSettings, DebitNote } from '../types/pharmacy';

interface GenerateStockistReturnPdfOptions {
  inventoryItems: (MedicationInventory & { daysLeft?: number; ptrRate?: number })[];
  shopSettings: ShopSettings | null;
  supplierName?: string;
  categoryFilter?: string; // 'all' | 'expired' | '30days' | '60days' | '90days'
  debitNoteNumber?: string;
  notes?: string;
}

export const generateStockistReturnPdf = ({
  inventoryItems,
  shopSettings,
  supplierName = 'All Distributors / Stockists',
  categoryFilter = 'all',
  debitNoteNumber,
  notes
}: GenerateStockistReturnPdfOptions): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const storeName = (shopSettings?.storeName || shopSettings?.shopName || 'PHARMPULSE HEALTHCARE').toUpperCase();
  const address = shopSettings?.address || 'Medical Store, Main Market, Healthcare Complex';
  const phone = shopSettings?.phone || '+91 98765 43210';
  const email = shopSettings?.email || 'contact@pharmpulse.local';
  const dlNo = shopSettings?.drugLicense || shopSettings?.dlNumber || 'DL-20B/3891 • 21B/3892';
  const gstin = shopSettings?.gstin || '07AAAAA0000A1Z5';

  const returnRefNo = debitNoteNumber || `RET-DN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const returnDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  // Category Title
  let categoryLabel = 'Complete Near-Expiry & Expired Return Manifest';
  if (categoryFilter === 'expired') categoryLabel = 'Expired Stockist Return Manifest (Immediate Credit Claim)';
  else if (categoryFilter === '30days') categoryLabel = 'Critical Near-Expiry (≤ 30 Days) Return Manifest';
  else if (categoryFilter === '60days') categoryLabel = 'Near-Expiry (31–60 Days) Return Manifest';
  else if (categoryFilter === '90days') categoryLabel = 'Standard 60–90 Days Supplier Return Slip';

  // 1. Header Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, 210, 36, 'F');

  // Accent Line
  doc.setFillColor(225, 29, 72); // Rose 600
  doc.rect(0, 36, 210, 2, 'F');

  // Store Info
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(storeName, 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(address, 14, 19);
  doc.text(`Phone: ${phone} | Email: ${email}`, 14, 24);
  doc.text(`DL No: ${dlNo} | GSTIN: ${gstin}`, 14, 29);

  // Right Header: Document Title & Ref
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(253, 164, 175); // Rose 300
  doc.text('STOCKIST RETURN SHEET / DEBIT NOTE', 196, 13, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`Ref: ${returnRefNo}`, 196, 20, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Date: ${returnDate}`, 196, 25, { align: 'right' });
  doc.text(`Target: ${supplierName.length > 25 ? supplierName.substring(0, 25) + '...' : supplierName}`, 196, 30, { align: 'right' });

  // 2. Document Summary Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 42, 182, 16, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Manifest Category: ${categoryLabel}`, 18, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Supplier: ${supplierName} • Generated under Pharmacy Good Distribution Practice (GDP) for credit note reconciliation.`,
    18,
    54
  );

  // 3. Table of Returned Medicines
  let totalUnits = 0;
  let totalPtrValue = 0;
  let totalMrpValue = 0;

  const tableData = inventoryItems.map((item, idx) => {
    const qty = Number(item.stockQuantity || 1);
    const ptr = Number(item.ptrRate || item.purchaseRate || item.costPrice || (item.mrp * 0.7) || 0);
    const mrp = Number(item.mrp || 0);
    const totalPtr = ptr * qty;
    const totalMrp = mrp * qty;

    totalUnits += qty;
    totalPtrValue += totalPtr;
    totalMrpValue += totalMrp;

    const daysLeft = item.daysLeft !== undefined 
      ? item.daysLeft 
      : Math.ceil((new Date(item.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    let statusStr = `${daysLeft}d left`;
    if (daysLeft <= 0) statusStr = 'EXPIRED';
    else if (daysLeft <= 30) statusStr = `≤30d (${daysLeft}d)`;
    else if (daysLeft <= 60) statusStr = `≤60d (${daysLeft}d)`;

    const rackStr = item.locationShelf || (item.rackNumber ? `${item.rackNumber}${item.shelfRow ? `/${item.shelfRow}` : ''}` : 'Rack A-1');

    return [
      String(idx + 1),
      `${item.brandName} ${item.strength || ''}\n${item.saltComposition || item.genericName || ''}`,
      item.batchNumber || 'N/A',
      rackStr,
      item.expirationDate || 'N/A',
      statusStr,
      String(qty),
      `₹${ptr.toFixed(2)}`,
      `₹${mrp.toFixed(2)}`,
      `₹${totalPtr.toFixed(2)}`
    ];
  });

  autoTable(doc, {
    startY: 62,
    head: [[
      '#',
      'Medicine & Chemical Salt',
      'Batch No',
      'Rack Loc',
      'Exp Date',
      'Status',
      'Qty',
      'PTR Rate',
      'MRP',
      'Total PTR (₹)'
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'left', cellWidth: 50 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      6: { halign: 'center', cellWidth: 12, fontStyle: 'bold' },
      7: { halign: 'right', cellWidth: 16 },
      8: { halign: 'right', cellWidth: 16 },
      9: { halign: 'right', cellWidth: 22, fontStyle: 'bold' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 14, right: 14 }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 5;

  // Check page overflow
  if (finalY > 235) {
    doc.addPage();
  }

  const summaryY = finalY > 235 ? 20 : finalY;

  // 4. Financial Reconciliation Summary Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, summaryY, 182, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('RETURN & CREDIT RECONCILIATION SUMMARY', 18, summaryY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Total Return Items: ${inventoryItems.length} Products (${totalUnits} Total Units)`, 18, summaryY + 12);
  doc.text(`Total Retail MRP Value: ₹${totalMrpValue.toFixed(2)}`, 18, summaryY + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(225, 29, 72); // Rose 600
  doc.text(`Net Debit Note Claim (PTR): ₹${totalPtrValue.toFixed(2)}`, 192, summaryY + 15, { align: 'right' });

  // 5. Notes & Declaration
  const declarationY = summaryY + 30;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    notes || 'Declaration: The above listed medicines are being returned due to expiry / near-expiry under distributor policy. Please issue Credit Note / Replacement accordingly.',
    14,
    declarationY,
    { maxWidth: 182 }
  );

  // 6. Signatures
  const sigY = declarationY + 16;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, sigY, 75, sigY);
  doc.line(135, sigY, 196, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('Authorized Pharmacist / Store Manager', 14, sigY + 5);
  doc.text('Stockist / Distributor Receiving Agent', 196, sigY + 5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`PharmPulse SaaS • ${storeName}`, 14, sigY + 9);
  doc.text('Signature & Rubber Stamp with Date', 196, sigY + 9, { align: 'right' });

  // Download PDF
  const cleanStore = storeName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${cleanStore}_Stockist_Return_Sheet_${returnRefNo}.pdf`;
  doc.save(filename);
};
