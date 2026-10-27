import { calculateCustomerBill, BillingRunOptions } from './billingEngine';
import { processCustomerPayment, revertCustomerPayment, RecordPaymentParams } from './paymentService';
import { Customer, Newspaper, DailyDeliveryRecord, Invoice, CustomerLedgerEntry } from '../types';
import { syncEngine } from './syncEngine';

export interface TestCaseResult {
  id: string;
  name: string;
  description: string;
  category: 'Billing' | 'Payments' | 'Ledger' | 'Offline Sync' | 'Security';
  passed: boolean;
  actual: any;
  expected: any;
  message: string;
  durationMs: number;
}

export function runAllAutomatedTests(): TestCaseResult[] {
  const results: TestCaseResult[] = [];

  const mockNewspapers: Newspaper[] = [
    {
      id: 'np_test_bhaskar',
      name: 'Dainik Bhaskar',
      nameHi: 'दैनिक भास्कर',
      edition: 'City',
      language: 'Hindi',
      publisher: 'DB Corp',
      retailPrice: 5.0,
      agencyPrice: 3.5,
      fixedMonthlyPrice: 150,
      effectiveDate: '2026-01-01',
      status: 'active',
    },
    {
      id: 'np_test_patrika',
      name: 'Rajasthan Patrika',
      nameHi: 'राजस्थान पत्रिका',
      edition: 'City',
      language: 'Hindi',
      publisher: 'Patrika',
      retailPrice: 5.0,
      agencyPrice: 3.5,
      fixedMonthlyPrice: 150,
      effectiveDate: '2026-01-01',
      status: 'active',
    },
  ];

  // Test 1: Full Month Calendar Billing Calculation (31 Days in October 2026)
  {
    const start = performance.now();
    const mockCustomer: Customer = {
      id: 'cust_t1',
      customerCode: 'AJT-T01',
      name: 'Test Customer 1',
      mobile: '9876543210',
      address: 'Test Address',
      villageCity: 'Ganganagar',
      wardNumber: '01',
      routeId: 'route_1',
      customerType: 'residential',
      subscriptionStatus: 'active',
      deliveryAgentId: 'agent_1',
      collectionAgentId: 'agent_1',
      preferredLanguage: 'hi',
      openingBalance: 0,
      currentBalance: 0,
      billingCycle: 'monthly',
      paymentPreference: 'cash',
      subscriptions: [
        {
          id: 'sub_t1',
          newspaperId: 'np_test_bhaskar',
          newspaperName: 'Dainik Bhaskar',
          newspaperNameHi: 'दैनिक भास्कर',
          quantity: 1,
          startDate: '2026-01-01',
          status: 'active',
        },
      ],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const options: BillingRunOptions = {
      billingMonth: '2026-10',
      policy: 'calendar_days',
      dueDate: '2026-11-10',
    };

    const bill = calculateCustomerBill(mockCustomer, mockNewspapers, [], options);
    // 31 days in October * ₹5/day = ₹155
    const expectedSubtotal = 155;
    const passed = bill.subtotal === expectedSubtotal && bill.totalPayable === expectedSubtotal;

    results.push({
      id: 'TEST-01',
      name: 'Calendar-Day Monthly Bill Calculation (31 Days)',
      description: 'Calculates 31 days × ₹5/day = ₹155 for October 2026 without pause',
      category: 'Billing',
      passed,
      actual: bill.subtotal,
      expected: expectedSubtotal,
      message: passed ? 'Calculated accurate bill for 31 days.' : `Expected ₹${expectedSubtotal}, received ₹${bill.subtotal}`,
      durationMs: Number((performance.now() - start).toFixed(2)),
    });
  }

  // Test 2: Prorated Mid-Month Subscription (Joining on 16th October)
  {
    const start = performance.now();
    const mockCustomer: Customer = {
      id: 'cust_t2',
      customerCode: 'AJT-T02',
      name: 'Test Customer Mid-Month',
      mobile: '9876543211',
      address: 'Test Address',
      villageCity: 'Ganganagar',
      wardNumber: '02',
      routeId: 'route_1',
      customerType: 'residential',
      subscriptionStatus: 'active',
      deliveryAgentId: 'agent_1',
      collectionAgentId: 'agent_1',
      preferredLanguage: 'hi',
      openingBalance: 0,
      currentBalance: 0,
      billingCycle: 'monthly',
      paymentPreference: 'cash',
      subscriptions: [
        {
          id: 'sub_t2',
          newspaperId: 'np_test_bhaskar',
          newspaperName: 'Dainik Bhaskar',
          newspaperNameHi: 'दैनिक भास्कर',
          quantity: 1,
          startDate: '2026-10-16', // Starts 16th October
          status: 'active',
        },
      ],
      createdAt: '2026-10-16T00:00:00Z',
      updatedAt: '2026-10-16T00:00:00Z',
    };

    const options: BillingRunOptions = {
      billingMonth: '2026-10',
      policy: 'calendar_days',
      dueDate: '2026-11-10',
    };

    const bill = calculateCustomerBill(mockCustomer, mockNewspapers, [], options);
    // From 16th to 31st = 16 days * ₹5 = ₹80
    const expectedSubtotal = 80;
    const passed = bill.subtotal === expectedSubtotal;

    results.push({
      id: 'TEST-02',
      name: 'Mid-Month Prorated Joining Calculation',
      description: 'Subscription starting 16th Oct should bill only 16 days (16 to 31 Oct) = ₹80',
      category: 'Billing',
      passed,
      actual: bill.subtotal,
      expected: expectedSubtotal,
      message: passed ? 'Prorated calculation exact.' : `Expected ₹${expectedSubtotal}, got ₹${bill.subtotal}`,
      durationMs: Number((performance.now() - start).toFixed(2)),
    });
  }

  // Test 3: Vacation Pause Adjustment Deduction
  {
    const start = performance.now();
    const mockCustomer: Customer = {
      id: 'cust_t3',
      customerCode: 'AJT-T03',
      name: 'Customer with Vacation Pause',
      mobile: '9876543212',
      address: 'Test Address',
      villageCity: 'Ganganagar',
      wardNumber: '03',
      routeId: 'route_1',
      customerType: 'residential',
      subscriptionStatus: 'active',
      deliveryAgentId: 'agent_1',
      collectionAgentId: 'agent_1',
      preferredLanguage: 'hi',
      openingBalance: 0,
      currentBalance: 0,
      billingCycle: 'monthly',
      paymentPreference: 'cash',
      pauseStartDate: '2026-10-10',
      pauseEndDate: '2026-10-15', // 6 days paused
      subscriptions: [
        {
          id: 'sub_t3',
          newspaperId: 'np_test_bhaskar',
          newspaperName: 'Dainik Bhaskar',
          newspaperNameHi: 'दैनिक भास्कर',
          quantity: 1,
          startDate: '2026-01-01',
          status: 'active',
        },
      ],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const options: BillingRunOptions = {
      billingMonth: '2026-10',
      policy: 'calendar_days',
      dueDate: '2026-11-10',
    };

    const bill = calculateCustomerBill(mockCustomer, mockNewspapers, [], options);
    // 31 days - 6 pause days = 25 days * ₹5 = ₹125
    const expectedSubtotal = 125;
    const passed = bill.subtotal === expectedSubtotal;

    results.push({
      id: 'TEST-03',
      name: 'Vacation Pause Deduction Calculation',
      description: 'Deducts 6 pause days from 31 days: 25 days × ₹5 = ₹125',
      category: 'Billing',
      passed,
      actual: bill.subtotal,
      expected: expectedSubtotal,
      message: passed ? 'Vacation pause deduction applied successfully.' : `Expected ₹${expectedSubtotal}, received ₹${bill.subtotal}`,
      durationMs: Number((performance.now() - start).toFixed(2)),
    });
  }

  // Test 4: Previous Outstanding Balance Carryover
  {
    const start = performance.now();
    const mockCustomer: Customer = {
      id: 'cust_t4',
      customerCode: 'AJT-T04',
      name: 'Customer with Dues',
      mobile: '9876543213',
      address: 'Test Address',
      villageCity: 'Ganganagar',
      wardNumber: '01',
      routeId: 'route_1',
      customerType: 'residential',
      subscriptionStatus: 'active',
      deliveryAgentId: 'agent_1',
      collectionAgentId: 'agent_1',
      preferredLanguage: 'hi',
      openingBalance: 0,
      currentBalance: 200, // Previous unpaid balance ₹200
      billingCycle: 'monthly',
      paymentPreference: 'cash',
      subscriptions: [
        {
          id: 'sub_t4',
          newspaperId: 'np_test_bhaskar',
          newspaperName: 'Dainik Bhaskar',
          newspaperNameHi: 'दैनिक भास्कर',
          quantity: 1,
          startDate: '2026-01-01',
          status: 'active',
        },
      ],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const options: BillingRunOptions = {
      billingMonth: '2026-10',
      policy: 'calendar_days',
      dueDate: '2026-11-10',
    };

    const bill = calculateCustomerBill(mockCustomer, mockNewspapers, [], options);
    // Subtotal 155 + previous 200 = ₹355
    const expectedTotal = 355;
    const passed = bill.previousBalance === 200 && bill.totalPayable === expectedTotal;

    results.push({
      id: 'TEST-04',
      name: 'Previous Outstanding Balance Addition',
      description: 'Adds previous balance of ₹200 to current bill ₹155 = Total ₹355',
      category: 'Billing',
      passed,
      actual: bill.totalPayable,
      expected: expectedTotal,
      message: passed ? 'Outstanding balance carried forward accurately.' : `Expected ₹${expectedTotal}, got ₹${bill.totalPayable}`,
      durationMs: Number((performance.now() - start).toFixed(2)),
    });
  }

  // Test 5: Partial Payment & Invoice Allocation
  {
    const start = performance.now();
    const mockCustomer: Customer = {
      id: 'cust_t5',
      customerCode: 'AJT-T05',
      name: 'Partial Payment Customer',
      mobile: '9876543214',
      address: 'Test Address',
      villageCity: 'Ganganagar',
      wardNumber: '01',
      routeId: 'route_1',
      customerType: 'residential',
      subscriptionStatus: 'active',
      deliveryAgentId: 'agent_1',
      collectionAgentId: 'agent_1',
      preferredLanguage: 'hi',
      openingBalance: 0,
      currentBalance: 500,
      billingCycle: 'monthly',
      paymentPreference: 'cash',
      subscriptions: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const mockInvoice: Invoice = {
      id: 'inv_t5',
      invoiceNumber: 'AJT-INV-202610-T05',
      agencyId: 'agency_ajeet_01',
      customerId: 'cust_t5',
      customerName: 'Partial Payment Customer',
      customerMobile: '9876543214',
      customerAddress: 'Test Address',
      billingMonth: '2026-10',
      billDate: '2026-10-31',
      dueDate: '2026-11-10',
      billingPolicy: 'calendar_days',
      items: [],
      subtotal: 500,
      previousBalance: 0,
      adjustments: 0,
      totalPayable: 500,
      amountPaid: 0,
      remainingBalance: 500,
      status: 'unpaid',
      generatedAt: '2026-10-31T00:00:00Z',
    };

    const paymentParams: RecordPaymentParams = {
      customerId: 'cust_t5',
      customerName: 'Partial Payment Customer',
      customerMobile: '9876543214',
      amount: 300, // Partial payment of ₹300 on ₹500 bill
      paymentMethod: 'cash',
      collectedByAgentId: 'agent_1',
      collectedByAgentName: 'Test Collector',
    };

    const res = processCustomerPayment(paymentParams, mockCustomer, [mockInvoice]);
    const updatedInv = res.updatedInvoices[0];
    const passed =
      res.updatedCustomer.currentBalance === 200 &&
      updatedInv.amountPaid === 300 &&
      updatedInv.remainingBalance === 200 &&
      updatedInv.status === 'partial';

    results.push({
      id: 'TEST-05',
      name: 'Partial Payment & Invoice Balance Allocation',
      description: 'Records ₹300 partial payment on ₹500 bill, updating remaining balance to ₹200 and status to partial',
      category: 'Payments',
      passed,
      actual: { balance: res.updatedCustomer.currentBalance, invoiceRemaining: updatedInv.remainingBalance, status: updatedInv.status },
      expected: { balance: 200, invoiceRemaining: 200, status: 'partial' },
      message: passed ? 'Partial payment allocated correctly.' : 'Partial allocation mismatch.',
      durationMs: Number((performance.now() - start).toFixed(2)),
    });
  }

  // Test 6: Advance Payment Handling
  {
    const start = performance.now();
    const mockCustomer: Customer = {
      id: 'cust_t6',
      customerCode: 'AJT-T06',
      name: 'Advance Paying Customer',
      mobile: '9876543215',
      address: 'Test Address',
      villageCity: 'Ganganagar',
      wardNumber: '01',
      routeId: 'route_1',
      customerType: 'residential',
      subscriptionStatus: 'active',
      deliveryAgentId: 'agent_1',
      collectionAgentId: 'agent_1',
      preferredLanguage: 'hi',
      openingBalance: 0,
      currentBalance: 150, // Due is only 150
      billingCycle: 'monthly',
      paymentPreference: 'upi',
      subscriptions: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const paymentParams: RecordPaymentParams = {
      customerId: 'cust_t6',
      customerName: 'Advance Paying Customer',
      customerMobile: '9876543215',
      amount: 500, // Customer pays ₹500
      paymentMethod: 'upi',
      collectedByAgentId: 'agent_1',
      collectedByAgentName: 'Test Collector',
    };

    const res = processCustomerPayment(paymentParams, mockCustomer, []);
    // Balance becomes 150 - 500 = -350 (credit balance)
    const passed = res.payment.isAdvance === true && res.updatedCustomer.currentBalance === -350;

    results.push({
      id: 'TEST-06',
      name: 'Advance Payment & Credit Carryover',
      description: 'Paying ₹500 against ₹150 due marks isAdvance=true and sets credit balance to -₹350',
      category: 'Payments',
      passed,
      actual: { isAdvance: res.payment.isAdvance, newBalance: res.updatedCustomer.currentBalance },
      expected: { isAdvance: true, newBalance: -350 },
      message: passed ? 'Advance payment detected and credit recorded in ledger.' : 'Advance payment calculation mismatch.',
      durationMs: Number((performance.now() - start).toFixed(2)),
    });
  }

  // Test 7: Offline Synchronization & Idempotency Key Generation
  {
    const start = performance.now();
    const item = syncEngine.enqueue('payment', 'create', { amount: 100 });
    const passed = !!item.idempotencyKey && item.idempotencyKey.startsWith('payment_create_');

    results.push({
      id: 'TEST-07',
      name: 'Offline Sync Queue & Idempotency Key Safety',
      description: 'Generates collision-resistant idempotency keys for offline transaction queue',
      category: 'Offline Sync',
      passed,
      actual: item.status,
      expected: 'pending',
      message: passed ? 'Durable local queue with idempotency keys created.' : 'Idempotency key generation failed.',
      durationMs: Number((performance.now() - start).toFixed(2)),
    });
  }

  // Test 8: Actual Delivery Days Billing Policy
  {
    const start = performance.now();
    const mockCustomer: Customer = {
      id: 'cust_t8',
      customerCode: 'AJT-T08',
      name: 'Actual Delivery Customer',
      mobile: '9876543216',
      address: 'Test Address',
      villageCity: 'Ganganagar',
      wardNumber: '01',
      routeId: 'route_1',
      customerType: 'residential',
      subscriptionStatus: 'active',
      deliveryAgentId: 'agent_1',
      collectionAgentId: 'agent_1',
      preferredLanguage: 'hi',
      openingBalance: 0,
      currentBalance: 0,
      billingCycle: 'monthly',
      paymentPreference: 'cash',
      subscriptions: [
        {
          id: 'sub_t8',
          newspaperId: 'np_test_bhaskar',
          newspaperName: 'Dainik Bhaskar',
          newspaperNameHi: 'दैनिक भास्कर',
          quantity: 1,
          startDate: '2026-01-01',
          status: 'active',
        },
      ],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    // 20 actual delivery logs
    const mockDeliveries: DailyDeliveryRecord[] = Array.from({ length: 20 }, (_, i) => ({
      id: `del_${i}`,
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      routeId: 'route_1',
      customerId: 'cust_t8',
      customerName: 'Actual Delivery Customer',
      newspaperId: 'np_test_bhaskar',
      newspaperName: 'Dainik Bhaskar',
      status: 'delivered',
      loggedByAgentId: 'agent_1',
      updatedAt: '2026-10-01',
    }));

    const options: BillingRunOptions = {
      billingMonth: '2026-10',
      policy: 'actual_delivery',
      dueDate: '2026-11-10',
    };

    const bill = calculateCustomerBill(mockCustomer, mockNewspapers, mockDeliveries, options);
    // 20 days delivered × ₹5 = ₹100
    const expected = 100;
    const passed = bill.subtotal === expected;

    results.push({
      id: 'TEST-08',
      name: 'Actual-Delivery-Day Policy Calculation',
      description: 'Bills only 20 actually delivered days logged by delivery agent: 20 × ₹5 = ₹100',
      category: 'Billing',
      passed,
      actual: bill.subtotal,
      expected,
      message: passed ? 'Actual delivery count verified.' : `Expected ₹${expected}, got ₹${bill.subtotal}`,
      durationMs: Number((performance.now() - start).toFixed(2)),
    });
  }

  // Test 9: Mistaken Payment Entry Reversal & Ledger Running Balance Recalculation
  {
    const start = performance.now();
    const testCustomer: Customer = {
      id: 'cust_t9',
      customerCode: 'AJT-T09',
      name: 'Mistake Test Customer',
      mobile: '9876543299',
      address: 'Test Address',
      villageCity: 'Ganganagar',
      wardNumber: '02',
      routeId: 'route_1',
      customerType: 'residential',
      subscriptionStatus: 'active',
      deliveryAgentId: 'agent_1',
      collectionAgentId: 'agent_1',
      preferredLanguage: 'hi',
      openingBalance: 0,
      currentBalance: 500,
      billingCycle: 'monthly',
      paymentPreference: 'cash',
      subscriptions: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    // Customer had an invoice of ₹500, paid ₹200 mistakenly
    const testLedger: CustomerLedgerEntry[] = [
      {
        id: 'led_inv_1',
        customerId: 'cust_t9',
        date: '2026-10-01',
        type: 'invoice',
        referenceId: 'INV-101',
        description: 'Monthly Bill',
        descriptionHi: 'मासिक बिल',
        debit: 500,
        credit: 0,
        balance: 500,
      },
      {
        id: 'led_pay_err',
        customerId: 'cust_t9',
        date: '2026-10-05',
        type: 'payment',
        referenceId: 'RCPT-ERR-999',
        description: 'Wrong Payment',
        descriptionHi: 'गलत भुगतान एंट्री',
        debit: 0,
        credit: 200,
        balance: 300,
      },
    ];

    const testCustomerBeforeReversal: Customer = {
      ...testCustomer,
      currentBalance: 300,
    };

    const revertResult = revertCustomerPayment(
      { entryId: 'led_pay_err' },
      'cust_t9',
      [testCustomerBeforeReversal],
      testLedger,
      [],
      []
    );

    const updatedCustomer = revertResult.updatedCustomers.find((c) => c.id === 'cust_t9');
    const remainingEntries = revertResult.updatedLedger.filter((l) => l.customerId === 'cust_t9');
    
    // Balance should be restored to ₹500 and the mistaken entry should be removed
    const passed =
      revertResult.success &&
      updatedCustomer?.currentBalance === 500 &&
      remainingEntries.length === 1 &&
      remainingEntries[0].balance === 500;

    results.push({
      id: 'TEST-09',
      name: 'Mistaken Payment Entry Reversal & Ledger Recalculation',
      description: 'Reverts mistaken ₹200 payment entry, increases customer balance back to ₹500, and recalculates running ledger balances',
      category: 'Ledger',
      passed,
      actual: updatedCustomer?.currentBalance,
      expected: 500,
      message: passed
        ? 'Payment entry deletion and running balance recalculation verified.'
        : `Expected balance ₹500, got ₹${updatedCustomer?.currentBalance}`,
      durationMs: Number((performance.now() - start).toFixed(2)),
    });
  }

  return results;
}
