import { Customer, Invoice, PaymentRecord, MessageLog, Agency } from '../types';

export interface WhatsAppMessageOptions {
  customer: Customer;
  agencyName: string;
  agencyMobile: string;
  lang?: 'hi' | 'en';
}

export function formatBillNotificationMessage(
  customer: Customer,
  invoice: Invoice,
  agencyName: string,
  lang: 'hi' | 'en' = 'hi'
): string {
  if (lang === 'hi') {
    return `नमस्कार ${customer.name} जी,
आपका ${invoice.billingMonth} माह का अखबार बिल ₹${invoice.subtotal} तैयार है।
पिछला बकाया: ₹${invoice.previousBalance}
कुल देय राशि: ₹${invoice.totalPayable}
अंतिम तिथि: ${invoice.dueDate}

कृपया समय पर भुगतान करें।
ऑनलाइन भुगतान के लिए UPI: ajeet9660527071@upi
धन्यवाद,
${agencyName}
📞 संपर्क: 9660527071`;
  }

  return `Dear ${customer.name},
Your newspaper bill for ${invoice.billingMonth} is ₹${invoice.subtotal}.
Previous Balance: ₹${invoice.previousBalance}
Total Amount Payable: ₹${invoice.totalPayable}
Due Date: ${invoice.dueDate}

Please pay before the due date.
UPI ID for online payment: ajeet9660527071@upi
Thank you,
${agencyName}
📞 Contact: 9660527071`;
}

export function formatPaymentReceiptMessage(
  payment: PaymentRecord,
  agencyName: string,
  lang: 'hi' | 'en' = 'hi'
): string {
  if (lang === 'hi') {
    return `प्रिय ग्राहक ${payment.customerName} जी,
आपका भुगतान सफलतापूर्वक प्राप्त हुआ।
रसीद संख्या: ${payment.receiptNumber}
जमा राशि: ₹${payment.amount}
भुगतान माध्यम: ${payment.paymentMethod.toUpperCase()}
दिनांक: ${payment.paymentDate}

डिजिटल रसीद जारी की गई।
धन्यवाद!
${agencyName}
अजीत कलेक्शन ऐप द्वारा संचालित`;
  }

  return `Dear ${payment.customerName},
Your payment has been successfully recorded.
Receipt No: ${payment.receiptNumber}
Amount Paid: ₹${payment.amount}
Payment Mode: ${payment.paymentMethod.toUpperCase()}
Date: ${payment.paymentDate}

Digital payment receipt generated.
Thank you!
${agencyName}`;
}

export function formatReminderMessage(
  customer: Customer,
  agencyName: string,
  lang: 'hi' | 'en' = 'hi'
): string {
  if (lang === 'hi') {
    return `नमस्ते ${customer.name} जी,
अजीत न्यूज एजेंसी से विनम्र अनुस्मारक:
आपकी कुल बकाया राशि ₹${customer.currentBalance} है।
असुविधा से बचने के लिए कृपया आज ही भुगतान करें।
UPI: ajeet9660527071@upi
धन्यवाद, ${agencyName}`;
  }

  return `Dear ${customer.name},
Gentle reminder from ${agencyName}:
Your outstanding balance is ₹${customer.currentBalance}.
Kindly clear the dues at your earliest convenience.
UPI: ajeet9660527071@upi
Thank you!`;
}

export function formatOverdueReminderMessage(
  customer: Customer,
  agency: Agency,
  unpaidInvoice?: Invoice,
  lang: 'hi' | 'en' = 'hi'
): string {
  const upiId = agency.upiId || 'ajeet9660527071@upi';
  const agencyName = agency.nameHi || agency.name || 'अजीत कलेक्शन एवं न्यूज एजेंसी';
  const agencyMobile = agency.mobile || '9660527071';
  const billInfo = unpaidInvoice 
    ? `\n📅 बिल माह: ${unpaidInvoice.billingMonth} (अंतिम देय तिथि: ${unpaidInvoice.dueDate})`
    : '';

  if (lang === 'hi') {
    return `नमस्ते ${customer.name} जी,

${agencyName} से आपके मासिक समाचार पत्र वितरण बिल का सादर अनुस्मारक:

👤 ग्राहक कोड: ${customer.customerCode}
💰 कुल बकाया राशि: ₹${customer.currentBalance}${billInfo}

कृपया निरंतर एवं सुचारू समाचार पत्र सेवा हेतु अपनी बकाया राशि ₹${customer.currentBalance} का शीघ्र भुगतान करने की कृपा करें।

📲 ऑनलाइन भुगतान हेतु UPI ID:
👉 ${upiId}
(Google Pay, PhonePe, Paytm, BHIM द्वारा मान्य)

धन्यवाद,
${agencyName}
📞 संपर्क: ${agencyMobile}`;
  }

  const billInfoEn = unpaidInvoice 
    ? `\n📅 Billing Month: ${unpaidInvoice.billingMonth} (Due Date: ${unpaidInvoice.dueDate})`
    : '';

  return `Dear ${customer.name},

Payment reminder from ${agency.name}:

👤 Customer Code: ${customer.customerCode}
💰 Total Outstanding Balance: ₹${customer.currentBalance}${billInfoEn}

Kindly clear your outstanding balance of ₹${customer.currentBalance} to ensure uninterrupted newspaper delivery service.

📲 Pay via UPI:
👉 ${upiId}
(Supports Google Pay, PhonePe, Paytm, BHIM)

Thank you,
${agency.name}
📞 Contact: ${agencyMobile}`;
}

export function getWhatsAppClickUrl(phone: string, text: string): string {
  // Clean phone number to ensure 10 digits or with 91
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
}

export function createMessageLog(
  customer: Customer,
  messageType: MessageLog['messageType'],
  channel: 'whatsapp' | 'sms',
  content: string
): MessageLog {
  return {
    id: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    customerId: customer.id,
    customerName: customer.name,
    mobile: customer.mobile,
    messageType,
    channel,
    content,
    status: 'sent',
    timestamp: new Date().toISOString(),
  };
}
