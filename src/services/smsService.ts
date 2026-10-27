import { Customer, Invoice, PaymentRecord, Agency, Language } from '../types';

/**
 * Triggers the device's native/default messaging (SMS) application
 * with the prefilled recipient phone number and message body.
 */
export function triggerSms(phoneNumber: string, message: string): boolean {
  try {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? '&' : '?';
    const smsUri = `sms:${cleanNumber}${separator}body=${encodeURIComponent(message)}`;
    
    // Trigger native SMS application
    window.location.href = smsUri;
    return true;
  } catch (err) {
    console.error('Failed to launch device SMS app:', err);
    return false;
  }
}

/**
 * Formats a concise, carrier-friendly bill reminder SMS
 */
export function formatBillReminderSms(
  customerName: string,
  invoice: Invoice,
  agency: Agency,
  lang: Language = 'hi'
): string {
  const upiId = agency.upiId || 'ajeet9660527071@upi';
  const agencyName = agency.name || 'Ajit collection';
  const dueAmt = invoice.remainingBalance > 0 ? invoice.remainingBalance : invoice.totalPayable;

  if (lang === 'hi') {
    return `प्रिय ${customerName} जी, ${agencyName} का माह ${invoice.billingMonth} का अखबार बिल सं ${invoice.invoiceNumber} कुल देय राशि रु.${dueAmt} है। अंतिम तिथि: ${invoice.dueDate}। UPI से भुगतान: ${upiId}। धन्यवाद - ${agencyName}`;
  }

  return `Dear ${customerName}, newspaper bill for ${invoice.billingMonth} (Bill No: ${invoice.invoiceNumber}) is Rs.${dueAmt}. Due date: ${invoice.dueDate}. Pay via UPI: ${upiId}. Thank you - ${agencyName}`;
}

/**
 * Formats an official payment acknowledgment receipt SMS
 */
export function formatPaymentReceiptSms(
  payment: PaymentRecord,
  agency: Agency,
  lang: Language = 'hi'
): string {
  const agencyName = agency.name || 'Ajit collection';
  const method = 
    payment.paymentMethod === 'cash' ? 'नकद' : 
    payment.paymentMethod === 'upi' ? 'UPI' : 'ऑनलाइन';

  if (lang === 'hi') {
    return `धन्यवाद ${payment.customerName} जी! ${agencyName} को रसीद सं ${payment.receiptNumber} के तहत रु.${payment.amount} (${method}) प्राप्त हुए। दिनांक: ${payment.paymentDate}। धन्यवाद!`;
  }

  return `Thank you ${payment.customerName}! Payment of Rs.${payment.amount} (${payment.paymentMethod.toUpperCase()}) received against Receipt No: ${payment.receiptNumber} on ${payment.paymentDate}. - ${agencyName}`;
}

/**
 * Formats an outstanding balance reminder SMS
 */
export function formatDueBalanceReminderSms(
  customer: Customer,
  agency: Agency,
  lang: Language = 'hi'
): string {
  const agencyName = agency.name || 'Ajit collection';
  const upiId = agency.upiId || 'ajeet9660527071@upi';

  if (lang === 'hi') {
    return `नमस्ते ${customer.name} जी, ${agencyName} पर आपका कुल बकाया रु.${customer.currentBalance} है। कृपया समय पर भुगतान करें। UPI आईडी: ${upiId}। संपर्क: 📞 ${agency.mobile}`;
  }

  return `Dear ${customer.name}, your outstanding newspaper balance is Rs.${customer.currentBalance}. Kindly clear dues via UPI: ${upiId}. Thank you - ${agencyName} 📞 ${agency.mobile}`;
}
