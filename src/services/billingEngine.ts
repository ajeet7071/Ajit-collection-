import { Customer, Invoice, InvoiceLineItem, CustomerLedgerEntry, DailyDeliveryRecord, Newspaper } from '../types';

export interface BillingRunOptions {
  billingMonth: string; // e.g. "2026-10"
  policy: 'calendar_days' | 'actual_delivery' | 'fixed_monthly';
  dueDate: string;      // e.g. "2026-11-10"
  approvedBy?: string;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Calculates itemized invoice for a single customer for a given month
 */
export function calculateCustomerBill(
  customer: Customer,
  newspapers: Newspaper[],
  deliveries: DailyDeliveryRecord[],
  options: BillingRunOptions
): Invoice {
  const [yearStr, monthStr] = options.billingMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const totalDaysInMonth = getDaysInMonth(year, month);
  const monthStart = `${options.billingMonth}-01`;
  const monthEnd = `${options.billingMonth}-${String(totalDaysInMonth).padStart(2, '0')}`;

  const lineItems: InvoiceLineItem[] = [];
  let subtotal = 0;

  customer.subscriptions.forEach((sub, idx) => {
    if (sub.status === 'suspended') return;

    const newspaper = newspapers.find((n) => n.id === sub.newspaperId);
    const ratePerDay = sub.customPricePerDay ?? newspaper?.retailPrice ?? 5.0;

    let daysToBill = totalDaysInMonth;

    // 1. Check if subscription started after month start (Proration)
    if (sub.startDate && sub.startDate > monthStart && sub.startDate <= monthEnd) {
      const startDay = parseInt(sub.startDate.split('-')[2], 10);
      daysToBill = totalDaysInMonth - startDay + 1;
    } else if (sub.startDate && sub.startDate > monthEnd) {
      daysToBill = 0; // Not started yet this month
    }

    // 2. Check if subscription ended before month end
    if (sub.endDate && sub.endDate >= monthStart && sub.endDate < monthEnd) {
      const endDay = parseInt(sub.endDate.split('-')[2], 10);
      daysToBill = Math.min(daysToBill, endDay);
    }

    // 3. Deduct temporary vacation/pause days if within this month
    if (customer.pauseStartDate && customer.pauseEndDate) {
      const pStart = customer.pauseStartDate > monthStart ? customer.pauseStartDate : monthStart;
      const pEnd = customer.pauseEndDate < monthEnd ? customer.pauseEndDate : monthEnd;
      if (pStart <= pEnd && pStart <= monthEnd && pEnd >= monthStart) {
        const pauseStartDay = parseInt(pStart.split('-')[2], 10);
        const pauseEndDay = parseInt(pEnd.split('-')[2], 10);
        const pausedDaysCount = Math.max(0, pauseEndDay - pauseStartDay + 1);
        daysToBill = Math.max(0, daysToBill - pausedDaysCount);
      }
    }

    // 4. Policy specific adjustment
    if (options.policy === 'actual_delivery') {
      // Count actual delivered status in daily logs
      const deliveredCount = deliveries.filter(
        (d) =>
          d.customerId === customer.id &&
          d.newspaperId === sub.newspaperId &&
          d.date.startsWith(options.billingMonth) &&
          d.status === 'delivered'
      ).length;
      // If delivery records exist, bill actual, else fallback to calendar
      if (deliveredCount > 0) {
        daysToBill = deliveredCount;
      }
    }

    let lineAmount = 0;
    if (options.policy === 'fixed_monthly' && newspaper?.fixedMonthlyPrice) {
      // Fixed monthly price prorated if partial month
      const ratio = daysToBill / totalDaysInMonth;
      lineAmount = Math.round(newspaper.fixedMonthlyPrice * sub.quantity * ratio);
    } else {
      lineAmount = Math.round(ratePerDay * daysToBill * sub.quantity);
    }

    if (daysToBill > 0 && lineAmount > 0) {
      lineItems.push({
        id: `item_${customer.id}_${idx}_${options.billingMonth}`,
        newspaperId: sub.newspaperId,
        newspaperName: sub.newspaperName,
        ratePerDay,
        daysBilled: daysToBill,
        quantity: sub.quantity,
        amount: lineAmount,
      });
      subtotal += lineAmount;
    }
  });

  const previousBalance = Math.max(0, customer.currentBalance || 0);
  const adjustments = 0; // Can be negative for discount or credit
  const totalPayable = subtotal + previousBalance - adjustments;

  const invoiceNumber = `AJT-INV-${year}${String(month).padStart(2, '0')}-${customer.customerCode.replace('AJT-', '')}`;

  return {
    id: `inv_${customer.id}_${options.billingMonth}`,
    invoiceNumber,
    agencyId: 'agency_ajeet_01',
    customerId: customer.id,
    customerName: customer.name,
    customerMobile: customer.mobile,
    customerAddress: customer.address,
    billingMonth: options.billingMonth,
    billDate: new Date().toISOString().split('T')[0],
    dueDate: options.dueDate,
    billingPolicy: options.policy,
    items: lineItems,
    subtotal,
    previousBalance,
    adjustments,
    totalPayable,
    amountPaid: 0,
    remainingBalance: totalPayable,
    status: totalPayable === 0 ? 'paid' : 'unpaid',
    generatedAt: new Date().toISOString(),
    approvedBy: options.approvedBy,
  };
}

/**
 * Runs bulk monthly billing for all active customers
 */
export function generateBulkMonthlyBills(
  customers: Customer[],
  newspapers: Newspaper[],
  deliveries: DailyDeliveryRecord[],
  options: BillingRunOptions
): { invoices: Invoice[]; ledgerEntries: CustomerLedgerEntry[]; updatedCustomers: Customer[] } {
  const generatedInvoices: Invoice[] = [];
  const newLedgerEntries: CustomerLedgerEntry[] = [];
  const updatedCustomers: Customer[] = [...customers];

  updatedCustomers.forEach((cust, index) => {
    if (cust.subscriptionStatus === 'discontinued') return;

    const invoice = calculateCustomerBill(cust, newspapers, deliveries, options);
    generatedInvoices.push(invoice);

    // Update customer's current balance
    const newBalance = invoice.totalPayable;
    updatedCustomers[index] = {
      ...cust,
      currentBalance: newBalance,
      updatedAt: new Date().toISOString(),
    };

    // Add invoice charge to ledger
    newLedgerEntries.push({
      id: `led_inv_${invoice.id}`,
      customerId: cust.id,
      date: invoice.billDate,
      type: 'invoice',
      referenceId: invoice.invoiceNumber,
      description: `Monthly Newspaper Bill for ${options.billingMonth}`,
      descriptionHi: `माह ${options.billingMonth} का अखबार मासिक बिल`,
      debit: invoice.subtotal,
      credit: 0,
      balance: newBalance,
    });
  });

  return {
    invoices: generatedInvoices,
    ledgerEntries: newLedgerEntries,
    updatedCustomers,
  };
}

/**
 * Synchronizes customer ledger entries with generated invoices
 * Ensures every customer has a corresponding debit entry for their bill.
 */
export function syncLedgerWithInvoices(
  invoices: Invoice[],
  existingLedger: CustomerLedgerEntry[]
): CustomerLedgerEntry[] {
  const updatedLedger = [...existingLedger];

  invoices.forEach((inv) => {
    const exists = updatedLedger.some(
      (l) => l.referenceId === inv.invoiceNumber || l.id === `led_inv_${inv.id}`
    );
    if (!exists) {
      const lineItemDesc = inv.items?.map((it) => it.newspaperName).join(', ') || 'अखबार';
      updatedLedger.push({
        id: `led_inv_${inv.id}`,
        customerId: inv.customerId,
        date: inv.billDate || `${inv.billingMonth}-01`,
        type: 'invoice',
        referenceId: inv.invoiceNumber,
        description: `Monthly Newspaper Bill for ${inv.billingMonth} (${lineItemDesc})`,
        descriptionHi: `माह ${inv.billingMonth} का अखबार मासिक बिल (${lineItemDesc})`,
        debit: inv.subtotal,
        credit: 0,
        balance: inv.totalPayable,
      });
    }
  });

  return updatedLedger;
}

/**
 * Automatically calculates and synchronizes all active customer bills
 * at the end of the billing month without needing any manual button press.
 * Also generates ledger entries for each bill.
 */
export function autoRunMonthEndBilling(
  customers: Customer[],
  newspapers: Newspaper[],
  deliveries: DailyDeliveryRecord[],
  existingInvoices: Invoice[],
  existingLedger: CustomerLedgerEntry[],
  billingMonth: string,
  policy: 'calendar_days' | 'actual_delivery' | 'fixed_monthly' = 'calendar_days',
  ignoredCustomerMonthKeys: string[] = []
): {
  invoices: Invoice[];
  ledger: CustomerLedgerEntry[];
  customers: Customer[];
  generatedCount: number;
} {
  const [yearStr, monthStr] = billingMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const dueDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-10`;

  let updatedInvoices = [...existingInvoices];
  let updatedLedger = [...existingLedger];
  let updatedCustomers = [...customers];
  let generatedCount = 0;

  updatedCustomers = updatedCustomers.map((cust) => {
    if (cust.subscriptionStatus === 'discontinued') return cust;

    // Check if user explicitly deleted bill for this customer and month
    const customerMonthKey = `${cust.id}_${billingMonth}`;
    if (ignoredCustomerMonthKeys.includes(customerMonthKey)) {
      return cust;
    }

    // Check if an invoice already exists for this customer in this month
    const existingInvIndex = updatedInvoices.findIndex(
      (inv) => inv.customerId === cust.id && inv.billingMonth === billingMonth
    );

    if (existingInvIndex === -1) {
      // Automatically calculate bill
      const newInv = calculateCustomerBill(cust, newspapers, deliveries, {
        billingMonth,
        policy,
        dueDate,
        approvedBy: 'स्वचालित बिलिंग सिस्टम (Auto Month-End)',
      });

      updatedInvoices.push(newInv);
      generatedCount++;

      // Create ledger debit entry for this customer's bill
      const lineItemDesc = newInv.items.map((it) => it.newspaperName).join(', ') || 'अखबार';
      updatedLedger.push({
        id: `led_inv_${newInv.id}`,
        customerId: cust.id,
        date: newInv.billDate,
        type: 'invoice',
        referenceId: newInv.invoiceNumber,
        description: `Monthly Newspaper Bill for ${billingMonth} (${lineItemDesc})`,
        descriptionHi: `माह ${billingMonth} का अखबार मासिक बिल (${lineItemDesc})`,
        debit: newInv.subtotal,
        credit: 0,
        balance: newInv.totalPayable,
      });

      return {
        ...cust,
        currentBalance: newInv.totalPayable,
        updatedAt: new Date().toISOString(),
      };
    } else {
      // Invoice exists; ensure it exists in ledger
      const existingInv = updatedInvoices[existingInvIndex];
      const hasLedger = updatedLedger.some(
        (l) => l.referenceId === existingInv.invoiceNumber || l.id === `led_inv_${existingInv.id}`
      );
      if (!hasLedger) {
        const lineItemDesc = existingInv.items.map((it) => it.newspaperName).join(', ') || 'अखबार';
        updatedLedger.push({
          id: `led_inv_${existingInv.id}`,
          customerId: cust.id,
          date: existingInv.billDate || `${billingMonth}-01`,
          type: 'invoice',
          referenceId: existingInv.invoiceNumber,
          description: `Monthly Newspaper Bill for ${billingMonth} (${lineItemDesc})`,
          descriptionHi: `माह ${billingMonth} का अखबार मासिक बिल (${lineItemDesc})`,
          debit: existingInv.subtotal,
          credit: 0,
          balance: existingInv.totalPayable,
        });
      }
      return cust;
    }
  });

  return {
    invoices: updatedInvoices,
    ledger: updatedLedger,
    customers: updatedCustomers,
    generatedCount,
  };
}
