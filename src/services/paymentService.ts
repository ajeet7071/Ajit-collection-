import { PaymentRecord, Customer, Invoice, CustomerLedgerEntry, PaymentMethod } from '../types';

export interface RecordPaymentParams {
  customerId: string;
  customerName: string;
  customerMobile: string;
  amount: number;
  paymentMethod: PaymentMethod;
  collectedByAgentId: string;
  collectedByAgentName: string;
  invoiceId?: string;
  transactionRef?: string;
  notes?: string;
  agencyUpiId?: string;
}

export function generateReceiptNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `AJT-RCPT-${timestamp}${randomSuffix}`;
}

export function generateUpiPaymentUrl(
  upiId: string,
  payeeName: string,
  amount: number,
  transactionNote: string,
  receiptRef?: string
): string {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: transactionNote,
  });
  if (receiptRef) {
    params.set('tr', receiptRef);
  }
  return `upi://pay?${params.toString()}`;
}

/**
 * Records a customer payment, allocates to invoice if provided, and generates ledger credit
 */
export function processCustomerPayment(
  params: RecordPaymentParams,
  customer: Customer,
  invoices: Invoice[]
): {
  payment: PaymentRecord;
  updatedCustomer: Customer;
  updatedInvoices: Invoice[];
  ledgerEntry: CustomerLedgerEntry;
} {
  const receiptNumber = generateReceiptNumber();
  const paymentDate = new Date().toISOString().split('T')[0];

  const payment: PaymentRecord = {
    id: `pay_${receiptNumber}`,
    receiptNumber,
    agencyId: 'agency_ajeet_01',
    customerId: params.customerId,
    customerName: params.customerName,
    customerMobile: params.customerMobile,
    amount: params.amount,
    paymentMethod: params.paymentMethod,
    paymentDate,
    collectedByAgentId: params.collectedByAgentId,
    collectedByAgentName: params.collectedByAgentName,
    invoiceId: params.invoiceId,
    transactionRef: params.transactionRef || (params.paymentMethod === 'upi' ? `UPI-${Date.now().toString().slice(-8)}` : undefined),
    notes: params.notes,
    isAdvance: params.amount > customer.currentBalance,
    handoverStatus: params.paymentMethod === 'cash' ? 'in_hand' : 'reconciled',
    createdAt: new Date().toISOString(),
  };

  // Update Customer balance (decrease balance by payment amount)
  const newBalance = customer.currentBalance - params.amount;
  const updatedCustomer: Customer = {
    ...customer,
    currentBalance: newBalance,
    updatedAt: new Date().toISOString(),
  };

  // Allocate payment to invoice(s)
  let unallocated = params.amount;
  const updatedInvoices = invoices.map((inv) => {
    if (inv.customerId !== customer.id || inv.status === 'paid' || unallocated <= 0) {
      return inv;
    }

    const outstanding = inv.remainingBalance;
    const allocation = Math.min(outstanding, unallocated);
    unallocated -= allocation;

    const newAmountPaid = inv.amountPaid + allocation;
    const newRemaining = inv.remainingBalance - allocation;
    const newStatus = newRemaining <= 0 ? 'paid' : 'partial';

    return {
      ...inv,
      amountPaid: newAmountPaid,
      remainingBalance: Math.max(0, newRemaining),
      status: newStatus as 'paid' | 'partial',
    };
  });

  // Customer Ledger Entry
  const methodText = params.paymentMethod === 'cash' ? 'नकद भुगतान (Cash)' : params.paymentMethod === 'upi' ? 'UPI डिजिटल भुगतान' : 'ऑनलाइन भुगतान';
  const ledgerEntry: CustomerLedgerEntry = {
    id: `led_pay_${payment.id}`,
    customerId: customer.id,
    date: paymentDate,
    type: 'payment',
    referenceId: receiptNumber,
    description: `Payment Received via ${params.paymentMethod.toUpperCase()}`,
    descriptionHi: `प्राप्त भुगतान (${methodText}) - रसीद सं. ${receiptNumber}`,
    debit: 0,
    credit: params.amount,
    balance: newBalance,
  };

  return {
    payment,
    updatedCustomer,
    updatedInvoices,
    ledgerEntry,
  };
}

/**
 * Reverts and deletes an erroneous payment entry from the customer ledger and payments history.
 * Corrects customer outstanding balance, restores invoice status/balances, and mathematically
 * recalculates running balances for all remaining ledger entries.
 */
export function revertCustomerPayment(
  identifier: { entryId?: string; paymentId?: string; receiptNumber?: string },
  customerId: string,
  customers: Customer[],
  ledger: CustomerLedgerEntry[],
  payments: PaymentRecord[],
  invoices: Invoice[]
): {
  updatedCustomers: Customer[];
  updatedLedger: CustomerLedgerEntry[];
  updatedPayments: PaymentRecord[];
  updatedInvoices: Invoice[];
  revertedAmount: number;
  revertedReceiptNumber?: string;
  success: boolean;
  message?: string;
} {
  // 1. Locate the entry and/or payment record
  const targetEntry = ledger.find(
    (l) =>
      (identifier.entryId && l.id === identifier.entryId) ||
      (identifier.receiptNumber && l.referenceId === identifier.receiptNumber)
  );

  const targetPayment = payments.find(
    (p) =>
      (identifier.paymentId && p.id === identifier.paymentId) ||
      (targetEntry && (p.receiptNumber === targetEntry.referenceId || `led_pay_${p.id}` === targetEntry.id)) ||
      (identifier.receiptNumber && p.receiptNumber === identifier.receiptNumber)
  );

  if (!targetEntry && !targetPayment) {
    return {
      updatedCustomers: customers,
      updatedLedger: ledger,
      updatedPayments: payments,
      updatedInvoices: invoices,
      revertedAmount: 0,
      success: false,
      message: 'हटाने के लिए प्रविष्टि या रसीद नहीं मिली।',
    };
  }

  const revertedAmount = targetEntry?.credit || targetPayment?.amount || 0;
  const receiptNumber = targetEntry?.referenceId || targetPayment?.receiptNumber;
  const effectiveCustomerId = customerId || targetEntry?.customerId || targetPayment?.customerId || '';

  // 2. Remove entry from ledger
  const remainingLedger = ledger.filter((l) => {
    if (targetEntry && l.id === targetEntry.id) return false;
    if (targetPayment && l.referenceId === targetPayment.receiptNumber && (l.type === 'payment' || l.credit > 0)) return false;
    return true;
  });

  // 3. Remove payment from payments
  const updatedPayments = payments.filter((p) => {
    if (targetPayment && p.id === targetPayment.id) return false;
    if (targetEntry && p.receiptNumber === targetEntry.referenceId) return false;
    return true;
  });

  // 4. Recalculate running balances for the affected customer
  const cust = customers.find((c) => c.id === effectiveCustomerId);
  const custEntries = remainingLedger.filter((l) => l.customerId === effectiveCustomerId);

  let newCustomerBalance = cust ? cust.currentBalance + revertedAmount : 0;

  let updatedLedger: CustomerLedgerEntry[];
  if (custEntries.length > 0 && cust) {
    let running = cust.openingBalance || 0;
    updatedLedger = remainingLedger.map((l) => {
      if (l.customerId === effectiveCustomerId) {
        running = running + (l.debit || 0) - (l.credit || 0);
        return {
          ...l,
          balance: running,
        };
      }
      return l;
    });
    newCustomerBalance = running;
  } else {
    updatedLedger = remainingLedger;
  }

  // 5. Revert affected customer's invoices
  let amountToRevertFromInvoices = revertedAmount;
  let updatedInvoices: Invoice[];

  if (targetPayment?.invoiceId) {
    updatedInvoices = invoices.map((inv) => {
      if (inv.id === targetPayment.invoiceId) {
        const newPaid = Math.max(0, inv.amountPaid - revertedAmount);
        const newRemaining = Math.min(inv.totalPayable, inv.remainingBalance + revertedAmount);
        const newStatus = newRemaining === 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
        return {
          ...inv,
          amountPaid: newPaid,
          remainingBalance: newRemaining,
          status: newStatus as 'paid' | 'partial' | 'unpaid',
        };
      }
      return inv;
    });
  } else {
    // Revert backwards from latest partially or fully paid invoices
    const reversedInvoices = [...invoices].reverse();
    const adjustedReversed = reversedInvoices.map((inv) => {
      if (inv.customerId === effectiveCustomerId && inv.amountPaid > 0 && amountToRevertFromInvoices > 0) {
        const reclaim = Math.min(inv.amountPaid, amountToRevertFromInvoices);
        amountToRevertFromInvoices -= reclaim;
        const newPaid = inv.amountPaid - reclaim;
        const newRemaining = inv.remainingBalance + reclaim;
        const newStatus = newRemaining === 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
        return {
          ...inv,
          amountPaid: newPaid,
          remainingBalance: newRemaining,
          status: newStatus as 'paid' | 'partial' | 'unpaid',
        };
      }
      return inv;
    });
    updatedInvoices = adjustedReversed.reverse();
  }

  // 6. Update customer balance
  const updatedCustomers = customers.map((c) => {
    if (c.id === effectiveCustomerId) {
      return {
        ...c,
        currentBalance: newCustomerBalance,
        updatedAt: new Date().toISOString(),
      };
    }
    return c;
  });

  return {
    updatedCustomers,
    updatedLedger,
    updatedPayments,
    updatedInvoices,
    revertedAmount,
    revertedReceiptNumber: receiptNumber,
    success: true,
    message: `रसीद सं. ${receiptNumber || ''} (राशि ₹${revertedAmount}) को सफलतापूर्वक डिलीट कर दिया गया।`,
  };
}
