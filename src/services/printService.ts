/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PaymentRecord, Agency, Invoice } from '../types';

/**
 * Builds HTML snippet for thermal POS receipt slip (80mm / 58mm mobile thermal printers)
 */
export function buildReceiptThermalSnippet(payment: PaymentRecord, agency: Agency): string {
  const methodLabel =
    payment.paymentMethod === 'cash' ? 'नकद (CASH)' :
    payment.paymentMethod === 'upi' ? 'UPI डिजिटल (ONLINE)' :
    payment.paymentMethod === 'bank_transfer' ? 'बैंक ट्रांसफर' : 'डिजिटल';

  return `
<div class="thermal-receipt-slip" style="width: 74mm; max-width: 74mm; margin: 0 auto; padding: 2mm 1mm; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Devanagari', monospace; font-size: 11px; line-height: 1.3; color: #000000; background: #ffffff;">
  
  <div style="text-align: center;">
    <div style="font-size: 15px; font-weight: 900; margin-bottom: 2px; text-transform: uppercase;">
      ${agency.nameHi || 'अजीत न्यूजपेपर एजेंसी'}
    </div>
    <div style="font-size: 11px; font-weight: 700; color: #222222; margin-bottom: 2px;">
      ${agency.name || 'Ajeet Newspaper Agency'}
    </div>
    <div style="font-size: 10px; color: #444444;">
      ${agency.address}, ${agency.city}
    </div>
    <div style="font-size: 10px; font-weight: bold; margin-top: 2px;">
      📞 संपर्क: +91 ${agency.mobile}
    </div>
  </div>

  <div style="border-top: 2px solid #000000; margin: 6px 0;"></div>
  <div style="text-align: center; font-weight: 900; font-size: 12px; letter-spacing: 0.5px;">
    भुगतान रसीद (PAYMENT RECEIPT)
  </div>
  <div style="border-top: 1px dashed #000000; margin: 5px 0;"></div>

  <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
    <span style="color: #333333;">रसीद सं. (Receipt):</span>
    <span style="font-weight: bold; font-family: monospace; font-size: 12px;">${payment.receiptNumber}</span>
  </div>
  <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
    <span style="color: #333333;">दिनांक (Date):</span>
    <span style="font-weight: 600;">${payment.paymentDate}</span>
  </div>
  ${payment.transactionRef ? `
  <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
    <span style="color: #333333;">Ref / UTR:</span>
    <span style="font-weight: bold; font-family: monospace;">${payment.transactionRef}</span>
  </div>` : ''}

  <div style="border-top: 1px dashed #000000; margin: 5px 0;"></div>

  <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
    <span style="color: #333333;">ग्राहक नाम:</span>
    <span style="font-weight: bold; font-size: 12px;">${payment.customerName}</span>
  </div>
  <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
    <span style="color: #333333;">मोबाइल:</span>
    <span style="font-family: monospace;">+91 ${payment.customerMobile}</span>
  </div>

  <!-- Large Amount Received Box for Thermal Printer -->
  <div style="border: 2px solid #000000; padding: 6px 4px; margin: 8px 0; text-align: center; background-color: #fafafa;">
    <div style="font-size: 10px; font-weight: 700;">प्राप्त राशि (AMOUNT RECEIVED)</div>
    <div style="font-size: 24px; font-weight: 900; font-family: monospace; margin: 2px 0;">
      ₹${payment.amount}.00
    </div>
    <div style="display: inline-block; border: 1px solid #000000; padding: 2px 6px; font-size: 10px; font-weight: bold; margin-top: 2px; text-transform: uppercase;">
      ${methodLabel}
    </div>
  </div>

  ${payment.notes ? `
  <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10px;">
    <span style="color: #333333;">विवरण:</span>
    <span>${payment.notes}</span>
  </div>` : ''}

  <div style="border-top: 1px dashed #000000; margin: 6px 0;"></div>

  <div style="display: flex; justify-content: space-between; margin-top: 6px;">
    <span style="color: #333333;">वसूलीकर्ता (Agent):</span>
    <span style="font-weight: bold;">${payment.collectedByAgentName}</span>
  </div>

  <div style="text-align: right; margin-top: 18px; font-size: 10px;">
    <div style="color: #444444;">....................................</div>
    <div style="font-weight: 600; margin-top: 2px;">अधिकृत हस्ताक्षर / मोहर</div>
  </div>

  <div style="border-top: 1px dashed #000000; margin: 6px 0;"></div>
  <div style="font-size: 9px; text-align: center; margin-top: 6px; color: #444444; line-height: 1.4;">
    🙏 भुगतान करने हेतु आपका हार्दिक धन्यवाद!<br>
    अजीत कलेक्शन ऐप द्वारा जनरेटेड डिजिटल रसीद
  </div>
</div>
  `.trim();
}

/**
 * Builds HTML snippet for Standard A4 / full-page receipt
 */
export function buildReceiptStandardSnippet(payment: PaymentRecord, agency: Agency): string {
  const methodLabel =
    payment.paymentMethod === 'cash' ? 'नकद (Cash)' :
    payment.paymentMethod === 'upi' ? 'UPI डिजिटल (Online)' :
    payment.paymentMethod === 'bank_transfer' ? 'बैंक ट्रांसफर' : 'डिजिटल';

  return `
<div style="border: 2px solid #0f172a; border-radius: 12px; padding: 24px; max-width: 650px; margin: 15px auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Devanagari', sans-serif; font-size: 13px; color: #1e293b; background: #ffffff;">
  
  <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; text-align: center;">
    <div style="font-size: 24px; font-weight: 800; color: #1e3a8a; margin-bottom: 4px;">
      ${agency.nameHi}
    </div>
    <div style="font-size: 14px; color: #475569;">
      ${agency.name}
    </div>
    <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
      ${agency.address}, ${agency.city} · फोन: +91 ${agency.mobile}
    </div>
  </div>

  <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 12px 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #e2e8f0;">
    <div>
      <span style="color: #64748b; font-size: 11px; display: block;">रसीद संख्या (Receipt No):</span>
      <span style="font-family: monospace; font-weight: 800; font-size: 15px; color: #0f172a;">${payment.receiptNumber}</span>
    </div>
    <div style="text-align: right;">
      <span style="color: #64748b; font-size: 11px; display: block;">दिनांक (Date):</span>
      <span style="font-weight: 700; font-size: 13px;">${payment.paymentDate}</span>
    </div>
  </div>

  <div style="background: #ecfdf5; border: 1.5px solid #10b981; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">
    <div style="font-size: 12px; font-weight: 600; color: #065f46;">प्राप्त राशि (AMOUNT RECEIVED)</div>
    <div style="font-size: 32px; font-weight: 900; color: #065f46; font-family: monospace; margin: 4px 0;">₹${payment.amount}.00</div>
    <div style="display: inline-block; background: #a7f3d0; color: #064e3b; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;">
      ${methodLabel}
    </div>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 8px 12px; color: #64748b; width: 35%; font-weight: 500;">ग्राहक का नाम:</td>
      <td style="padding: 8px 12px; font-weight: 700; color: #0f172a;">${payment.customerName}</td>
    </tr>
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 8px 12px; color: #64748b; font-weight: 500;">मोबाइल नंबर:</td>
      <td style="padding: 8px 12px; font-weight: 600; color: #0f172a; font-family: monospace;">+91 ${payment.customerMobile}</td>
    </tr>
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 8px 12px; color: #64748b; font-weight: 500;">वसूलीकर्ता (Agent):</td>
      <td style="padding: 8px 12px; font-weight: 600; color: #0f172a;">${payment.collectedByAgentName}</td>
    </tr>
    ${payment.transactionRef ? `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 8px 12px; color: #64748b; font-weight: 500;">ट्रांजैक्शन Ref:</td>
      <td style="padding: 8px 12px; font-weight: 600; color: #0f172a; font-family: monospace;">${payment.transactionRef}</td>
    </tr>` : ''}
    ${payment.notes ? `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 8px 12px; color: #64748b; font-weight: 500;">विवरण / टिप्पणी:</td>
      <td style="padding: 8px 12px; font-weight: 500; color: #0f172a;">${payment.notes}</td>
    </tr>` : ''}
  </table>

  <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 28px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
    <div style="font-size: 11px; color: #64748b;">
      <p style="margin: 0;">धन्यवाद! आपका दिन शुभ हो।</p>
      <p style="margin: 2px 0 0 0; font-size: 10px; color: #94a3b8;">Ajeet Collection App · Digital Payment Record</p>
    </div>
    <div style="text-align: right;">
      <div style="font-weight: 700; color: #0f172a;">${payment.collectedByAgentName}</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">अधिकृत हस्ताक्षर / रसीद जारीकर्ता</div>
    </div>
  </div>
</div>
  `.trim();
}

/**
 * Builds Plain Text for Bluetooth ESC/POS thermal printers
 */
export function buildReceiptPlainText(payment: PaymentRecord, agency: Agency): string {
  const methodLabel =
    payment.paymentMethod === 'cash' ? 'CASH' :
    payment.paymentMethod === 'upi' ? 'UPI' : 'ONLINE';

  return `
================================
  ${agency.nameHi || 'अजीत न्यूज एजेंसी'}
  ${agency.name || 'Ajeet News Agency'}
  ${agency.address}, ${agency.city}
  Phone: +91 ${agency.mobile}
================================
     भुगतान रसीद (RECEIPT)
--------------------------------
रसीद सं. : ${payment.receiptNumber}
दिनांक   : ${payment.paymentDate}
${payment.transactionRef ? `Ref      : ${payment.transactionRef}\n` : ''}--------------------------------
ग्राहक   : ${payment.customerName}
फोन     : +91 ${payment.customerMobile}
--------------------------------
प्राप्त राशि: ₹${payment.amount}.00
माध्यम     : ${methodLabel}
${payment.notes ? `विवरण     : ${payment.notes}\n` : ''}--------------------------------
वसूलीकर्ता : ${payment.collectedByAgentName}

हस्ताक्षर : .....................
--------------------------------
    धन्यवाद! आपका दिन शुभ हो!
================================
`.trim();
}

/**
 * Directly prints the receipt to mobile printer (Android Print Spooler / Bluetooth / AirPrint / POS)
 * Directly injects into a dedicated in-DOM print container and triggers window.print().
 * This is 100% compatible with mobile browsers where iframes are blocked from printing.
 */
export function triggerDirectPrintReceipt(
  payment: PaymentRecord,
  agency: Agency,
  format: 'thermal' | 'standard' = 'thermal'
): void {
  // 1. Get or create the dedicated mobile receipt print container
  let container = document.getElementById('direct-mobile-receipt-print-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'direct-mobile-receipt-print-container';
    document.body.appendChild(container);
  }

  // 2. Generate and mount the exact printable snippet
  const snippet = format === 'thermal'
    ? buildReceiptThermalSnippet(payment, agency)
    : buildReceiptStandardSnippet(payment, agency);

  container.innerHTML = snippet;

  // 3. Mark the body as actively printing direct receipt
  document.body.classList.add('direct-receipt-printing');
  if (format === 'thermal') {
    document.body.classList.add('thermal-print-active');
  } else {
    document.body.classList.remove('thermal-print-active');
  }

  // 4. Trigger print synchronously within the user gesture context
  // This directly brings up the Mobile Print dialog (Android Print Spooler / iOS Print Sheet)
  try {
    window.focus();
    window.print();
  } catch (err) {
    console.warn('Direct print execution caught notice:', err);
  } finally {
    // 5. Cleanup after print dialog interaction closes
    const handleAfterPrint = () => {
      document.body.classList.remove('direct-receipt-printing');
      document.body.classList.remove('thermal-print-active');
      if (container) {
        container.innerHTML = '';
      }
      window.removeEventListener('afterprint', handleAfterPrint);
    };

    window.addEventListener('afterprint', handleAfterPrint);

    // Fallback safety timeout in case mobile browser doesn't dispatch afterprint event
    setTimeout(handleAfterPrint, 2500);
  }
}

/**
 * Triggers RawBT Bluetooth thermal printing on Android devices if RawBT is installed.
 * Falls back to standard direct mobile print.
 */
export function triggerBluetoothThermalPrint(payment: PaymentRecord, agency: Agency): void {
  const plainText = buildReceiptPlainText(payment, agency);

  // Try RawBT Android intent
  try {
    const encoded = encodeURIComponent(plainText);
    const rawBtUrl = `rawbt:data:text/plain;charset=utf-8,${encoded}`;
    
    // Check if on mobile device
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = rawBtUrl;
      return;
    }
  } catch (e) {
    console.warn('RawBT Bluetooth trigger notice:', e);
  }

  // Universal Fallback: System mobile print spooler
  triggerDirectPrintReceipt(payment, agency, 'thermal');
}

/**
 * Builds HTML snippet for customer monthly bill formatted for thermal POS slip (58mm / 80mm)
 * Uses .thermal-sheet styling defined in index.css
 */
export function buildCustomerBillThermalSnippet(invoice: Invoice, agency: Agency): string {
  const upiPayable = Math.max(0, invoice.remainingBalance > 0 ? invoice.remainingBalance : invoice.totalPayable);
  const upiId = agency.upiId || 'ajeet9660527071@upi';
  const payeeName = agency.name || 'Ajit collection';
  const note = `Bill-${invoice.invoiceNumber}-${invoice.customerName.slice(0, 10)}`;
  const upiPaymentUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${upiPayable.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=2&ecc=M&data=${encodeURIComponent(upiPaymentUri)}`;

  const itemsHtml = invoice.items.map((item) => `
    <tr style="border-bottom: 1px dotted #cccccc;">
      <td style="padding: 2px 0; text-align: left; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${item.newspaperName} (x${item.quantity})</td>
      <td style="padding: 2px 0; text-align: center;">${item.daysBilled}</td>
      <td style="padding: 2px 0; text-align: right;">₹${item.ratePerDay}</td>
      <td style="padding: 2px 0; text-align: right; font-weight: bold;">₹${item.amount}</td>
    </tr>
  `).join('');

  return `
<div class="thermal-sheet" style="width: 76mm; max-width: 76mm; margin: 0 auto; padding: 2mm 1.5mm; font-family: 'JetBrains Mono', 'Noto Sans Devanagari', monospace; font-size: 8.5pt; line-height: 1.25; color: #000000; background: #ffffff;">
  
  <!-- Header Branding -->
  <div style="text-align: center; margin-bottom: 4px;">
    <div style="margin-bottom: 4px;">
      <img 
        src="/assets/aistudio/file_0000000043f482118d45f9a7391eadfe_4733c263.png" 
        alt="Ajit collection" 
        style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; display: inline-block; border: 1px solid #d97706;" 
      />
    </div>
    <div style="font-size: 15px; font-weight: 900; margin-bottom: 1px; text-transform: uppercase;">
      ${agency.nameHi || 'अजीत कलेक्शन'}
    </div>
    <div style="font-size: 11px; font-weight: 700; color: #1e293b; margin-bottom: 2px;">
      ${agency.name || 'Ajit collection'}
    </div>
    <div style="font-size: 9.5px; color: #475569;">
      ${agency.address}, ${agency.city}
    </div>
    <div style="font-size: 10px; font-weight: bold; margin-top: 2px;">
      📞 संपर्क: +91 ${agency.mobile}
    </div>
  </div>

  <div style="border-top: 2px solid #000000; margin: 5px 0 4px 0;"></div>
  <div style="text-align: center; font-weight: 900; font-size: 11.5px; letter-spacing: 0.5px;">
    मासिक बिल (MONTHLY BILL)
  </div>
  <div style="border-top: 1px dashed #000000; margin: 4px 0;"></div>

  <!-- Bill Metadata -->
  <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
    <span style="color: #333333;">बिल सं. (Bill No):</span>
    <span style="font-weight: bold; font-family: monospace;">${invoice.invoiceNumber}</span>
  </div>
  <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
    <span style="color: #333333;">बिल माह (Month):</span>
    <span style="font-weight: bold;">${invoice.billingMonth}</span>
  </div>
  <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
    <span style="color: #333333;">बिल दिनांक (Date):</span>
    <span>${invoice.billDate}</span>
  </div>
  <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
    <span style="color: #333333;">अंतिम तिथि (Due):</span>
    <span style="font-weight: bold;">${invoice.dueDate}</span>
  </div>

  <div style="border-top: 1px dashed #000000; margin: 4px 0;"></div>

  <!-- Customer Details -->
  <div style="margin-bottom: 2px;">
    <span style="color: #333333;">ग्राहक नाम: </span>
    <strong style="font-size: 11px;">${invoice.customerName}</strong>
  </div>
  <div style="margin-bottom: 2px;">
    <span style="color: #333333;">मोबाइल: </span>
    <span style="font-family: monospace; font-weight: 600;">+91 ${invoice.customerMobile}</span>
  </div>
  <div style="margin-bottom: 2px; font-size: 9.5px; color: #333333;">
    <span>पता: </span>
    <span>${invoice.customerAddress || 'स्थानीय वितरण'}</span>
  </div>

  <div style="border-top: 1px dashed #000000; margin: 4px 0;"></div>

  <!-- Subscribed Newspapers Table -->
  <table style="width: 100%; border-collapse: collapse; font-size: 9.5px; margin: 4px 0;">
    <thead>
      <tr style="border-bottom: 1px solid #000000;">
        <th style="text-align: left; padding-bottom: 2px;">अखबार</th>
        <th style="text-align: center; padding-bottom: 2px;">दिन</th>
        <th style="text-align: right; padding-bottom: 2px;">दर</th>
        <th style="text-align: right; padding-bottom: 2px;">योग</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div style="border-top: 1px dashed #000000; margin: 4px 0;"></div>

  <!-- Accounting Breakdown -->
  <div style="font-size: 9.5px; line-height: 1.35;">
    <div style="display: flex; justify-content: space-between;">
      <span>चालू बिल राशि (Current):</span>
      <span>₹${invoice.subtotal}.00</span>
    </div>
    <div style="display: flex; justify-content: space-between;">
      <span>पिछला बकाया (Prev Due):</span>
      <span>₹${invoice.previousBalance}.00</span>
    </div>
    ${invoice.adjustments !== 0 ? `
    <div style="display: flex; justify-content: space-between;">
      <span>छूट / समायोजन:</span>
      <span>-₹${Math.abs(invoice.adjustments)}.00</span>
    </div>` : ''}
  </div>

  <!-- Big Total Due Box for Thermal Printer -->
  <div style="border: 2px solid #000000; padding: 5px 4px; margin: 6px 0; text-align: center; background-color: #fafafa;">
    <div style="font-size: 9.5px; font-weight: 700; text-transform: uppercase;">कुल देय राशि (TOTAL PAYABLE)</div>
    <div style="font-size: 20px; font-weight: 900; font-family: monospace; margin: 2px 0;">
      ₹${invoice.totalPayable}.00
    </div>
    ${invoice.amountPaid > 0 ? `
    <div style="font-size: 9.5px; color: #166534; font-weight: bold;">
      जमा राशि: ₹${invoice.amountPaid}.00 | शेष बकाया: ₹${invoice.remainingBalance}.00
    </div>` : ''}
  </div>

  <!-- Thermal Slip Dynamic Payment QR Code -->
  <div style="text-align: center; border: 1px dashed #000000; padding: 5px; margin: 6px 0; background: #ffffff;">
    <div style="font-size: 9px; font-weight: 900; margin-bottom: 3px; text-transform: uppercase;">
      PhonePe / Google Pay / Paytm QR
    </div>
    <div style="width: 100px; height: 100px; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
      <img
        src="${qrCodeImageUrl}"
        alt="UPI QR Code"
        style="width: 96px; height: 96px; object-fit: contain;"
      />
    </div>
    <div style="font-size: 9.5px; font-weight: 900; margin-top: 3px; font-family: monospace;">
      देय राशि: ₹${upiPayable}.00
    </div>
    <div style="font-size: 8.5px; color: #333333; margin-top: 1px;">
      UPI ID: ${upiId}
    </div>
    <div style="font-size: 8px; color: #555555; margin-top: 1px;">
      स्कैन करके तुरंत ऑनलाइन भुगतान करें
    </div>
  </div>

  <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 12px; font-size: 9px;">
    <div>
      <div style="color: #555555;">अजीत कलेक्शन</div>
    </div>
    <div style="text-align: right;">
      <div style="color: #333333;">....................................</div>
      <div style="font-weight: 600; margin-top: 2px;">वसूलीकर्ता / अधिकृत हस्ताक्षर</div>
    </div>
  </div>

  <div style="border-top: 1px dashed #000000; margin: 6px 0 4px 0;"></div>
  <div style="font-size: 8.5px; text-align: center; color: #444444; line-height: 1.3;">
    🙏 अजीत कलेक्शन - आपका दिन शुभ हो!<br>
    डिजिटल मासिक बिल · Ajit Collection App
  </div>
</div>
  `.trim();
}

/**
 * Builds Plain Text for Bluetooth ESC/POS thermal printers for customer monthly bill
 */
export function buildCustomerBillPlainText(invoice: Invoice, agency: Agency): string {
  const upiPayable = Math.max(0, invoice.remainingBalance > 0 ? invoice.remainingBalance : invoice.totalPayable);
  const upiId = agency.upiId || 'ajeet9660527071@upi';

  const itemsText = invoice.items
    .map((item) => `${item.newspaperName.padEnd(16, ' ').slice(0, 16)} ${String(item.daysBilled).padStart(3)}d  ₹${item.amount}`)
    .join('\n');

  return `
================================
  ${agency.nameHi || 'अजीत कलेक्शन'}
  ${agency.name || 'Ajit collection'}
  ${agency.address}, ${agency.city}
  Phone: +91 ${agency.mobile}
================================
     मासिक बिल (MONTHLY BILL)
--------------------------------
बिल सं.   : ${invoice.invoiceNumber}
बिल माह   : ${invoice.billingMonth}
दिनांक    : ${invoice.billDate}
अंतिम तिथि : ${invoice.dueDate}
--------------------------------
ग्राहक     : ${invoice.customerName}
फोन       : +91 ${invoice.customerMobile}
पता       : ${invoice.customerAddress || 'स्थानीय'}
--------------------------------
अखबार               दिन   योग
${itemsText}
--------------------------------
चालू माह शुल्क : ₹${invoice.subtotal}.00
पिछला बकाया    : ₹${invoice.previousBalance}.00
${invoice.adjustments !== 0 ? `छूट/समायोजन   : -₹${Math.abs(invoice.adjustments)}.00\n` : ''}--------------------------------
कुल देय राशि   : ₹${invoice.totalPayable}.00
${invoice.amountPaid > 0 ? `जमा राशि      : ₹${invoice.amountPaid}.00\n` : ''}${invoice.remainingBalance > 0 ? `शेष बकाया     : ₹${invoice.remainingBalance}.00\n` : ''}--------------------------------
UPI ID: ${upiId}
देय राशि: ₹${upiPayable}.00
हस्ताक्षर : .....................
--------------------------------
  🙏 अजीत कलेक्शन - शुभ दिन!
================================
`.trim();
}

/**
 * Directly prints the customer's monthly bill using the thermal printer CSS styles
 * currently defined in index.css (body.thermal-print-active, .thermal-sheet, body.direct-receipt-printing).
 * 
 * Injects into #direct-mobile-receipt-print-container and triggers window.print()
 * with automatic cleanup. Compatible with mobile thermal printers (58mm/80mm),
 * Android Print Spooler, Bluetooth print services, and desktop printers.
 */
export function triggerPrintCustomerThermalBill(invoice: Invoice, agency: Agency): void {
  // 1. Get or create the dedicated mobile receipt print container
  let container = document.getElementById('direct-mobile-receipt-print-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'direct-mobile-receipt-print-container';
    document.body.appendChild(container);
  }

  // 2. Generate and mount the exact printable snippet using thermal sheet styles
  const snippet = buildCustomerBillThermalSnippet(invoice, agency);
  container.innerHTML = snippet;

  // 3. Mark the body with thermal and direct receipt print classes defined in index.css
  document.body.classList.add('direct-receipt-printing');
  document.body.classList.add('thermal-print-active');

  // 4. Trigger print synchronously within the user gesture context
  try {
    window.focus();
    window.print();
  } catch (err) {
    console.warn('Thermal bill print execution notice:', err);
  } finally {
    // 5. Cleanup after print dialog interaction closes
    const handleAfterPrint = () => {
      document.body.classList.remove('direct-receipt-printing');
      document.body.classList.remove('thermal-print-active');
      if (container) {
        container.innerHTML = '';
      }
      window.removeEventListener('afterprint', handleAfterPrint);
    };

    window.addEventListener('afterprint', handleAfterPrint);

    // Fallback safety timeout in case mobile browser doesn't dispatch afterprint event
    setTimeout(handleAfterPrint, 2500);
  }
}

/**
 * Exported helper alias matching the user's requested specification:
 * Helper function to trigger a printable version of a customer's monthly bill
 * using the thermal printer CSS styles currently defined in index.css.
 */
export const printCustomerThermalBill = triggerPrintCustomerThermalBill;

/**
 * Triggers RawBT Bluetooth thermal printing on Android devices if RawBT is installed for customer bills.
 * Falls back to standard direct thermal mobile print.
 */
export function triggerBluetoothCustomerThermalBill(invoice: Invoice, agency: Agency): void {
  const plainText = buildCustomerBillPlainText(invoice, agency);

  // Try RawBT Android intent
  try {
    const encoded = encodeURIComponent(plainText);
    const rawBtUrl = `rawbt:data:text/plain;charset=utf-8,${encoded}`;
    
    // Check if on mobile device
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = rawBtUrl;
      return;
    }
  } catch (e) {
    console.warn('RawBT Bluetooth bill print trigger notice:', e);
  }

  // Universal Fallback: System mobile print spooler with thermal styles
  triggerPrintCustomerThermalBill(invoice, agency);
}

