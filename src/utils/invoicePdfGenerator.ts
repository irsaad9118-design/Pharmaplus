import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PointOfSaleTransaction, ShopSettings, PosBillItem } from '../types/pharmacy';

export interface GenerateInvoicePdfOptions {
  transaction: PointOfSaleTransaction;
  shopSettings?: Partial<ShopSettings> | null;
  cashierName?: string;
}

/**
 * Generates and triggers browser download of a clean, standardized Pharmacy Tax Invoice PDF.
 */
export function generateInvoicePdf({
  transaction,
  shopSettings,
  cashierName = 'Pharmacist On Duty'
}: GenerateInvoicePdfOptions): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const storeName = (shopSettings?.storeName || shopSettings?.shopName || 'PHARMPULSE HEALTHCARE & PHARMACY').toUpperCase();
  const address = shopSettings?.address || 'Medical Store, Central Market, Sector 14, New Delhi - 110001';
  const phone = shopSettings?.phone || '+91 98765 43210';
  const gstin = shopSettings?.gstin || '07AAAAA0000A1Z5';
  const dlNumber = shopSettings?.drugLicense || shopSettings?.dlNumber || 'DL-20B/3891 • 21B/3892';
  const upiId = shopSettings?.upiId || 'irsaad9118@okhdfcbank';

  const invNo = transaction?.invoiceNumber || transaction?.receiptNumber || `#INV-${transaction?.id?.substring(0, 6) || '1001'}`;
  const rawDate = transaction?.timestamp || (transaction as any)?.createdAt || new Date().toISOString();
  
  let formattedDate = 'Today';
  let formattedTime = 'Just now';
  try {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      formattedTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } else {
      formattedDate = String(rawDate).split(' ')[0] || 'Today';
      formattedTime = String(rawDate).split(' ')[1] || '12:00 PM';
    }
  } catch {
    // fallback
  }

  const customerName = transaction?.customerName || transaction?.patientName || 'Walk-in Customer';
  const customerPhone = transaction?.customerPhone || transaction?.contactNumber || transaction?.patientPhone || 'N/A';
  const doctorName = transaction?.doctorName || transaction?.prescriberName || 'Self / Direct Counter';
  const paymentMode = transaction?.paymentMode || transaction?.paymentMethod || 'Cash';

  const subtotal = Number(transaction?.subtotal ?? transaction?.grandTotal ?? 0);
  const gstTotal = Number(transaction?.gstTotal ?? transaction?.taxTotal ?? transaction?.tax ?? 0);
  const discount = Number(transaction?.discountAmount ?? transaction?.discountTotal ?? 0);
  const roundOff = Number(transaction?.roundOff ?? 0);
  const grandTotal = Number(transaction?.grandTotal ?? 0);

  const rawItems: PosBillItem[] = Array.isArray(transaction?.items) ? transaction.items : [];
  const totalItemSavings = rawItems.reduce((sum, it) => sum + (Number(it?.totalSavings) || 0), 0);

  // ==================== PDF STYLING & DRAWING ====================
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Header Background Bar (Teal Accent)
  doc.setFillColor(13, 148, 136); // #0d9488 - Teal 600
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Check and Draw Store Logo (if present)
  let textX = margin;
  const logoUrl = shopSettings?.logoUrl;
  if (logoUrl && typeof logoUrl === 'string') {
    try {
      const logoSize = 22; // 22mm x 22mm
      const logoY = 11;
      // Add white rounded backdrop for logo
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin - 1, logoY - 1, logoSize + 2, logoSize + 2, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin - 1, logoY - 1, logoSize + 2, logoSize + 2, 2, 2, 'D');

      // Attempt to add image
      const format = logoUrl.includes('image/jpeg') || logoUrl.includes('image/jpg') ? 'JPEG' : 'PNG';
      doc.addImage(logoUrl, format, margin, logoY, logoSize, logoSize);
      textX = margin + logoSize + 4;
    } catch (e) {
      console.warn('Could not render logo in PDF:', e);
      textX = margin;
    }
  }

  // Top Title Banner
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(storeName, textX, 17);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // Slate 600
  doc.text(address, textX, 22);
  doc.text(`Contact: ${phone} | UPI: ${upiId}`, textX, 26);
  doc.text(`Drug License No: ${dlNumber} | GSTIN: ${gstin}`, textX, 30);

  // Right-aligned "TAX INVOICE" badge
  doc.setFillColor(240, 253, 250); // Teal 50
  doc.setDrawColor(20, 184, 166); // Teal 500
  doc.roundedRect(pageWidth - margin - 58, 12, 58, 20, 2, 2, 'FD');

  doc.setTextColor(13, 148, 136); // Teal 600
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TAX INVOICE', pageWidth - margin - 29, 18, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Bill #: ${invNo}`, pageWidth - margin - 29, 23, { align: 'center' });
  doc.text(`Date: ${formattedDate} ${formattedTime}`, pageWidth - margin - 29, 28, { align: 'center' });

  // Divider Line
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.5);
  doc.line(margin, 35, pageWidth - margin, 35);

  // Customer & Invoice Details 2-Column Box
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.roundedRect(margin, 38, pageWidth - (margin * 2), 22, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, 38, pageWidth - (margin * 2), 22, 2, 2, 'D');

  // Left column: Billed To
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('BILLED TO (PATIENT / CUSTOMER):', margin + 4, 43);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Name: `, margin + 4, 48);
  doc.setFont('helvetica', 'bold');
  doc.text(customerName, margin + 16, 48);

  doc.setFont('helvetica', 'normal');
  doc.text(`Phone / WhatsApp: `, margin + 4, 53);
  doc.setFont('helvetica', 'bold');
  doc.text(customerPhone, margin + 35, 53);

  doc.setFont('helvetica', 'normal');
  doc.text(`Doctor Reference: `, margin + 4, 58);
  doc.text(doctorName, margin + 31, 58);

  // Right column: Invoice Meta
  const midX = pageWidth / 2 + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('PAYMENT & DISPENSING INFO:', midX, 43);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Payment Mode: `, midX, 48);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 148, 136);
  doc.text(`${paymentMode} (Confirmed / Settled)`, midX + 24, 48);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Dispensed By: `, midX, 53);
  doc.text(cashierName, midX + 23, 53);

  doc.text(`Status: `, midX, 58);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // Emerald 600
  doc.text('PAID & VERIFIED', midX + 12, 58);

  // ==================== TABLE OF ITEMS ====================
  const tableData = rawItems.map((item, idx) => {
    const brand = item?.brandName || item?.medicationName || item?.genericName || 'Medicine Item';
    const salt = item?.saltComposition || item?.genericSalt || item?.genericName || '';
    
    let offerNote = '';
    if (item?.offerType && item.offerType !== 'none') {
      if (item.offerType === 'scheme') {
        offerNote = `\n[Scheme: ${item.offerLabel || `Buy ${item.schemeBuyQty}+${item.schemeFreeQty}`}${item.freeQuantity ? ` | +${item.freeQuantity} Free Included` : ''}]`;
      } else if (item.offerType === 'percentage') {
        offerNote = `\n[Offer: ${item.offerLabel || `${item.offerValue}% OFF`}${item.totalSavings ? ` | Saved ₹${item.totalSavings.toFixed(2)}` : ''}]`;
      } else if (item.offerType === 'flat') {
        offerNote = `\n[Offer: ${item.offerLabel || `₹${item.offerValue} OFF`}${item.totalSavings ? ` | Saved ₹${item.totalSavings.toFixed(2)}` : ''}]`;
      }
    }

    const nameDisplay = salt ? `${brand}\n[${salt}]${offerNote}` : `${brand}${offerNote}`;
    const batch = item?.batchNumber || 'N/A';
    const expiry = item?.expiryDate || 'N/A';
    const qty = Number(item?.quantity || 1);
    const mrp = Number(item?.mrp || item?.originalPrice || item?.unitPrice || 0);
    const rate = Number(item?.unitPrice || item?.sellingPrice || item?.mrp || 0);
    const gstRate = item?.gstRate !== undefined ? `${item.gstRate}%` : '12%';
    const lineTotal = Number(item?.totalPrice || item?.totalAmount || (rate * qty));

    return [
      (idx + 1).toString(),
      nameDisplay,
      batch,
      expiry,
      qty.toString(),
      `₹${mrp.toFixed(2)}`,
      `₹${rate.toFixed(2)}`,
      gstRate,
      `₹${lineTotal.toFixed(2)}`
    ];
  });

  autoTable(doc, {
    startY: 64,
    margin: { left: margin, right: margin },
    head: [[
      '#',
      'Item Description & Salt',
      'Batch No',
      'Exp Date',
      'Qty',
      'MRP (₹)',
      'Rate (₹)',
      'GST',
      'Total (₹)'
    ]],
    body: tableData.length > 0 ? tableData : [[
      '1',
      'General Counter Medicine Item',
      'BATCH-101',
      '2027-12',
      '1',
      `₹${grandTotal.toFixed(2)}`,
      `₹${grandTotal.toFixed(2)}`,
      '12%',
      `₹${grandTotal.toFixed(2)}`
    ]],
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42], // Slate 900
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2.5
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      overflow: 'linebreak'
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 56 },
      2: { cellWidth: 22 },
      3: { cellWidth: 20 },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 18, halign: 'right' },
      6: { cellWidth: 18, halign: 'right' },
      7: { cellWidth: 14, halign: 'center' },
      8: { cellWidth: 22, halign: 'right', fontStyle: 'bold' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  // Calculate position after table
  const finalY = (doc as any).lastAutoTable?.finalY || 140;

  // Check if we need a new page for the summary if table ends too low
  let summaryY = finalY + 4;
  if (summaryY > pageHeight - 65) {
    doc.addPage();
    summaryY = 20;
  }

  // Summary and Tax Calculation Box
  const summaryBoxWidth = 85;
  const summaryBoxX = pageWidth - margin - summaryBoxWidth;

  // Left Note & QR area
  const noteBoxWidth = summaryBoxX - margin - 6;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, summaryY, noteBoxWidth, 42, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, summaryY, noteBoxWidth, 42, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('TERMS & PHARMACY CONDITIONS:', margin + 3, summaryY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('1. Check batch number & expiry date upon purchase.', margin + 3, summaryY + 10);
  doc.text('2. Refrigerated & cut strips cannot be accepted for return.', margin + 3, summaryY + 14);
  doc.text('3. All schedule H/H1 drugs dispensed strictly as per prescription.', margin + 3, summaryY + 18);
  doc.text('4. Store medicines in a cool, dry place away from sunlight.', margin + 3, summaryY + 22);

  // Next refill notice
  const refillDate = new Date();
  refillDate.setDate(refillDate.getDate() + 30);
  const refillStr = refillDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 148, 136);
  doc.text(`Refill Due Date: ${refillStr} (WhatsApp reminders enabled)`, margin + 3, summaryY + 28);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Scan store UPI or message on WhatsApp for direct door delivery & refill dispatch.', margin + 3, summaryY + 33);
  doc.text(`Digital Support: ${phone} | ${upiId}`, margin + 3, summaryY + 38);

  // Right Summary Calculation Box
  const summaryBoxHeight = totalItemSavings > 0 ? 46 : 42;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.roundedRect(summaryBoxX, summaryY, summaryBoxWidth, summaryBoxHeight, 2, 2, 'FD');

  const halfGst = gstTotal / 2;
  const taxableVal = Math.max(0, subtotal - gstTotal);

  let curY = summaryY + 5.5;
  const labelX = summaryBoxX + 4;
  const valX = summaryBoxX + summaryBoxWidth - 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Taxable Subtotal:', labelX, curY);
  doc.text(`₹${taxableVal.toFixed(2)}`, valX, curY, { align: 'right' });

  curY += 4.5;
  doc.text('CGST (Central Tax):', labelX, curY);
  doc.text(`₹${halfGst.toFixed(2)}`, valX, curY, { align: 'right' });

  curY += 4.5;
  doc.text('SGST (State Tax):', labelX, curY);
  doc.text(`₹${halfGst.toFixed(2)}`, valX, curY, { align: 'right' });

  if (totalItemSavings > 0) {
    curY += 4.5;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(13, 148, 136); // Teal 600
    doc.text('Scheme / Offer Savings:', labelX, curY);
    doc.text(`-₹${totalItemSavings.toFixed(2)}`, valX, curY, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
  }

  if (discount > 0) {
    curY += 4.5;
    doc.setTextColor(220, 38, 38); // Red 600
    doc.text('Discount Applied:', labelX, curY);
    doc.text(`-₹${discount.toFixed(2)}`, valX, curY, { align: 'right' });
    doc.setTextColor(71, 85, 105);
  }

  if (roundOff !== 0) {
    curY += 4.5;
    doc.text('Round-off:', labelX, curY);
    doc.text(`${roundOff > 0 ? '+' : ''}₹${roundOff.toFixed(2)}`, valX, curY, { align: 'right' });
  }

  // Grand Total Highlight Banner
  curY += 5;
  doc.setFillColor(13, 148, 136); // Teal 600
  doc.roundedRect(summaryBoxX + 2, curY - 3.5, summaryBoxWidth - 4, 10, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('GRAND TOTAL:', labelX + 2, curY + 3);
  doc.text(`₹${grandTotal.toFixed(2)}`, valX - 2, curY + 3, { align: 'right' });

  // Bottom Footer
  const footerY = pageHeight - 12;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Thank you for visiting! Get well soon. • Computer Generated Invoice', pageWidth / 2, footerY, { align: 'center' });
  doc.text('PharmPulse Multi-Counter Cloud Billing Suite • All taxes computed under Section 31 of CGST Act', pageWidth / 2, footerY + 3.5, { align: 'center' });

  // Safe filename generator
  const cleanInvNo = (invNo.replace(/[^a-zA-Z0-9_-]/g, '_') || '1001').replace(/^_+|_+$/g, '');
  const fileName = `Invoice_${cleanInvNo}.pdf`;

  // Trigger browser download
  doc.save(fileName);
}
