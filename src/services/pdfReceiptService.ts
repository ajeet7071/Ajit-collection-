/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { PaymentRecord, Invoice, Agency } from '../types';

/**
 * Generates an official, high-quality Payment Receipt PDF document
 */
export function generatePaymentReceiptPdf(payment: PaymentRecord, agency: Agency): jsPDF {
  // Slip format: 100mm width x 165mm height (Clean, compact POS receipt slip)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [100, 165],
  });

  // Background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 100, 165, 'F');

  // Top header banner (Navy Blue #1e3a8a)
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, 100, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12.5);
  doc.setFont('helvetica', 'bold');
  doc.text(agency.name || 'AJIT COLLECTION', 50, 8.5, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${agency.city || 'Sri Ganganagar'}, Rajasthan | Mob: +91 ${agency.mobile}`, 50, 14, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL PAYMENT RECEIPT', 50, 18.5, { align: 'center' });

  // Receipt Meta
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Receipt No: ${payment.receiptNumber}`, 8, 28);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${payment.paymentDate}`, 92, 28, { align: 'right' });

  doc.setDrawColor(203, 213, 225);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(8, 31, 92, 31);
  doc.setLineDashPattern([], 0);

  // Customer Details
  doc.setFontSize(8.5);
  doc.text('Customer:', 8, 37);
  doc.setFont('helvetica', 'bold');
  doc.text(payment.customerName, 26, 37);

  doc.setFont('helvetica', 'normal');
  doc.text('Mobile:', 8, 43);
  doc.text(`+91 ${payment.customerMobile}`, 26, 43);

  // Amount Received Highlight Box
  doc.setFillColor(240, 253, 244); // Light Emerald
  doc.setDrawColor(34, 197, 94); // Emerald border
  doc.roundedRect(8, 48, 84, 25, 2.5, 2.5, 'FD');

  doc.setTextColor(22, 101, 52);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('AMOUNT RECEIVED', 50, 54.5, { align: 'center' });

  doc.setFontSize(19);
  doc.text(`Rs. ${payment.amount}.00`, 50, 63.5, { align: 'center' });

  const methodText =
    payment.paymentMethod === 'cash' ? 'CASH PAYMENT (NAGAD)' :
    payment.paymentMethod === 'upi' ? 'UPI DIGITAL (PHONEPE / GPAY)' :
    payment.paymentMethod === 'bank_transfer' ? 'BANK TRANSFER / NEFT' : 'ONLINE GATEWAY';

  doc.setFontSize(7.5);
  doc.text(methodText, 50, 69.5, { align: 'center' });

  // Additional Details
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8);
  let y = 79;

  if (payment.transactionRef) {
    doc.text(`Transaction Ref / UTR: ${payment.transactionRef}`, 8, y);
    y += 5.5;
  }

  if (payment.notes) {
    doc.text(`Notes: ${payment.notes}`, 8, y);
    y += 5.5;
  }

  doc.text(`Collected By Agent: ${payment.collectedByAgentName}`, 8, y);
  y += 5.5;

  doc.setDrawColor(203, 213, 225);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(8, y, 92, y);
  doc.setLineDashPattern([], 0);
  y += 6;

  // Verification & UPI Details
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.text('Payment Authenticated & Recorded in Agency Ledger', 50, y, { align: 'center' });
  y += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.text(`Agency UPI: ${agency.upiId || 'ajeet9660527071@upi'}`, 50, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');

  // Signature Block
  y += 18;
  doc.setDrawColor(148, 163, 184);
  doc.line(60, y, 92, y);
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7.5);
  doc.text('Authorized Signatory', 76, y + 4, { align: 'center' });

  // Footer Blessing
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Thank you for your payment! | Ajeet Newspaper Agency App', 50, 158, { align: 'center' });

  return doc;
}

/**
 * Generates an official Monthly Bill Invoice PDF document (A4 format)
 */
export function generateInvoicePdf(invoice: Invoice, agency: Agency): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Banner
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(agency.name || 'AJIT COLLECTION', 14, 14);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${agency.address}, ${agency.city}, ${agency.state} - ${agency.pincode}`, 14, 21);
  doc.text(`Phone: +91 ${agency.mobile} | UPI: ${agency.upiId}`, 14, 27);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('MONTHLY BILL / INVOICE', 196, 16, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Month: ${invoice.billingMonth}`, 196, 23, { align: 'right' });

  // Invoice & Customer Info Box
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Billed To (Customer):', 14, 42);
  doc.setFontSize(11);
  doc.text(invoice.customerName, 14, 48);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Address: ${invoice.customerAddress}`, 14, 53);
  doc.text(`Mobile: +91 ${invoice.customerMobile}`, 14, 58);

  // Meta Right Column
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, 196, 42, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Bill Date: ${invoice.billDate}`, 196, 48, { align: 'right' });
  doc.setTextColor(225, 29, 72);
  doc.setFont('helvetica', 'bold');
  doc.text(`Due Date: ${invoice.dueDate}`, 196, 54, { align: 'right' });

  // Items Table Header
  let y = 66;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 8, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, y, 182, 8, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Item / Newspaper', 18, y + 5.5);
  doc.text('Qty', 100, y + 5.5, { align: 'center' });
  doc.text('Days Billed', 130, y + 5.5, { align: 'center' });
  doc.text('Rate / Day', 160, y + 5.5, { align: 'right' });
  doc.text('Total (Rs)', 192, y + 5.5, { align: 'right' });
  y += 8;

  // Items Rows
  doc.setFont('helvetica', 'normal');
  invoice.items.forEach((item) => {
    doc.rect(14, y, 182, 8, 'S');
    doc.text(item.newspaperName, 18, y + 5.5);
    doc.text(String(item.quantity), 100, y + 5.5, { align: 'center' });
    doc.text(String(item.daysBilled), 130, y + 5.5, { align: 'center' });
    doc.text(`Rs. ${item.ratePerDay}`, 160, y + 5.5, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs. ${item.amount}`, 192, y + 5.5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 8;
  });

  // Financial Breakdown Box
  y += 6;
  doc.setFontSize(9.5);
  doc.text('Current Month Subtotal:', 120, y);
  doc.text(`Rs. ${invoice.subtotal}.00`, 192, y, { align: 'right' });
  y += 6;

  doc.text('Previous Due Balance:', 120, y);
  doc.text(`Rs. ${invoice.previousBalance}.00`, 192, y, { align: 'right' });
  y += 6;

  if (invoice.adjustments !== 0) {
    doc.setTextColor(22, 101, 52);
    doc.text('Adjustment / Discount:', 120, y);
    doc.text(`-Rs. ${Math.abs(invoice.adjustments)}.00`, 192, y, { align: 'right' });
    doc.setTextColor(30, 41, 59);
    y += 6;
  }

  // Total Payable Highlight
  doc.setFillColor(238, 242, 255);
  doc.setDrawColor(99, 102, 241);
  doc.roundedRect(118, y, 78, 12, 2, 2, 'FD');
  doc.setTextColor(30, 58, 138);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL PAYABLE:', 122, y + 7.5);
  doc.setFontSize(13);
  doc.text(`Rs. ${invoice.totalPayable}.00`, 192, y + 8, { align: 'right' });
  y += 18;

  // UPI QR Code note
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, 182, 22, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Pay Easily via UPI (PhonePe / Google Pay / Paytm):', 18, y + 7);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`UPI VPA: ${agency.upiId || 'ajeet9660527071@upi'} | Payee: ${agency.name}`, 18, y + 13);
  doc.text('Please share a screenshot or transaction reference after completing digital payment.', 18, y + 18);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Generated automatically by Ajeet Collection & Billing Management System', 105, 285, { align: 'center' });

  return doc;
}

/**
 * Downloads Payment Receipt PDF file directly to user device
 */
export function downloadReceiptPdf(payment: PaymentRecord, agency: Agency): void {
  const doc = generatePaymentReceiptPdf(payment, agency);
  const cleanName = payment.customerName.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Receipt_${payment.receiptNumber}_${cleanName}.pdf`;
  doc.save(fileName);
}

/**
 * Downloads Monthly Bill PDF file directly to user device
 */
export function downloadInvoicePdf(invoice: Invoice, agency: Agency): void {
  const doc = generateInvoicePdf(invoice, agency);
  const cleanName = invoice.customerName.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Bill_${invoice.invoiceNumber}_${cleanName}.pdf`;
  doc.save(fileName);
}

/**
 * Shares Payment Receipt as a PDF file on WhatsApp.
 * Uses Web Share API (navigator.share with files) when supported,
 * and automatically downloads the PDF + opens WhatsApp as a guaranteed fallback.
 */
export async function shareReceiptPdfOnWhatsApp(
  payment: PaymentRecord,
  agency: Agency,
  customMobile?: string
): Promise<{ success: boolean; mode: 'native_share' | 'download_and_whatsapp' }> {
  const doc = generatePaymentReceiptPdf(payment, agency);
  const pdfBlob = doc.output('blob');
  const cleanName = payment.customerName.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Receipt_${payment.receiptNumber}_${cleanName}.pdf`;
  const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

  const cleanMobile = (customMobile || payment.customerMobile || '').replace(/\D/g, '');
  const shareText =
    `*🧾 भुगतान रसीद (Payment Receipt)*\n\n` +
    `नमस्ते *${payment.customerName}* ji,\n` +
    `आपकी *₹${payment.amount}.00* की भुगतान राशि सफलतापूर्वक प्राप्त हुई।\n\n` +
    `• *रसीद संख्या*: ${payment.receiptNumber}\n` +
    `• *दिनांक*: ${payment.paymentDate}\n` +
    `• *माध्यम*: ${payment.paymentMethod.toUpperCase()}\n` +
    (payment.transactionRef ? `• *Ref / UTR*: ${payment.transactionRef}\n` : '') +
    `• *एजेंसी*: ${agency.nameHi || agency.name}\n\n` +
    `🙏 *धन्यवाद! आपकी अधिकृत PDF रसीद संलग्न है।*`;

  // Option 1: Native Share API with files (Android Chrome, modern Mobile Safari)
  if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        files: [pdfFile],
        title: `भुगतान रसीद - ${payment.receiptNumber}`,
        text: shareText,
      });
      return { success: true, mode: 'native_share' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, mode: 'native_share' };
      }
      console.warn('Native file share failed, falling back to download + WhatsApp link:', err);
    }
  }

  // Option 2: Fallback - Automatically download PDF file and launch WhatsApp with pre-filled message
  doc.save(fileName);

  const fallbackText =
    `${shareText}\n\n` +
    `📎 *(नोट: रसीद की आधिकारिक PDF फाइल आपके डिवाइस में डाउनलोड हो गई है, कृपया इसे यहाँ अटैच कर भेजें।)*`;

  const waUrl = cleanMobile.length === 10
    ? `https://api.whatsapp.com/send?phone=91${cleanMobile}&text=${encodeURIComponent(fallbackText)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(fallbackText)}`;

  window.open(waUrl, '_blank');
  return { success: true, mode: 'download_and_whatsapp' };
}

/**
 * Shares Monthly Bill Invoice as a PDF file on WhatsApp.
 */
export async function shareInvoicePdfOnWhatsApp(
  invoice: Invoice,
  agency: Agency,
  customMobile?: string
): Promise<{ success: boolean; mode: 'native_share' | 'download_and_whatsapp' }> {
  const doc = generateInvoicePdf(invoice, agency);
  const pdfBlob = doc.output('blob');
  const cleanName = invoice.customerName.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Bill_${invoice.invoiceNumber}_${cleanName}.pdf`;
  const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

  const cleanMobile = (customMobile || invoice.customerMobile || '').replace(/\D/g, '');
  const shareText =
    `*📰 मासिक अखबार बिल (Monthly Newspaper Bill)*\n\n` +
    `नमस्ते *${invoice.customerName}* ji,\n` +
    `माह *${invoice.billingMonth}* का आपका अखबार बिल तैयार है।\n\n` +
    `• *बिल सं.*: ${invoice.invoiceNumber}\n` +
    `• *कुल देय राशि*: ₹${invoice.totalPayable}.00\n` +
    `• *अंतिम तिथि*: ${invoice.dueDate}\n` +
    `• *UPI VPA*: ${agency.upiId}\n\n` +
    `🙏 *कृपया समय पर बिल का भुगतान करें। आपकी विस्तृत PDF बिल कॉपी संलग्न है।*`;

  if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        files: [pdfFile],
        title: `मासिक बिल - ${invoice.invoiceNumber}`,
        text: shareText,
      });
      return { success: true, mode: 'native_share' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, mode: 'native_share' };
      }
      console.warn('Native file share failed:', err);
    }
  }

  doc.save(fileName);

  const fallbackText =
    `${shareText}\n\n` +
    `📎 *(नोट: आधिकारिक PDF बिल फाइल आपके फोन में डाउनलोड हो गई है, कृपया इसे यहाँ अटैच कर भेजें।)*`;

  const waUrl = cleanMobile.length === 10
    ? `https://api.whatsapp.com/send?phone=91${cleanMobile}&text=${encodeURIComponent(fallbackText)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(fallbackText)}`;

  window.open(waUrl, '_blank');
  return { success: true, mode: 'download_and_whatsapp' };
}
