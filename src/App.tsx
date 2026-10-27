/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/common/Navbar';
import { BottomNav } from './components/common/BottomNav';
import { AuthModal } from './components/common/AuthModal';
import { InvoiceModal } from './components/common/InvoiceModal';
import { ReceiptModal } from './components/common/ReceiptModal';
import { WhatsAppModal } from './components/common/WhatsAppModal';
import { UPIPaymentModal } from './components/common/UPIPaymentModal';
import { LedgerModal } from './components/common/LedgerModal';
import { MoreMenuModal } from './components/common/MoreMenuModal';
import { DirectCollectModal } from './components/common/DirectCollectModal';
import { RouteManagementModal } from './components/common/RouteManagementModal';
import { AgencyProfileModal } from './components/common/AgencyProfileModal';
import { CloudBackupModal } from './components/common/CloudBackupModal';
import { firebaseService, FullBackupPayload, auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

import { DashboardView } from './components/views/DashboardView';
import { CustomersView } from './components/views/CustomersView';
import { BillingView } from './components/views/BillingView';
import { CollectionsView } from './components/views/CollectionsView';
import { NewspapersView } from './components/views/NewspapersView';
import { ExpensesView } from './components/views/ExpensesView';
import { CustomerPortalView } from './components/views/CustomerPortalView';
import { ReportsView } from './components/views/ReportsView';
import { QATestRunnerView } from './components/views/QATestRunnerView';
import { SystemDocsView } from './components/views/SystemDocsView';

import { storageService } from './services/storage';
import { syncEngine } from './services/syncEngine';
import { 
  Customer, 
  Invoice, 
  PaymentRecord, 
  DailyDeliveryRecord, 
  CustomerLedgerEntry, 
  ExpenseRecord, 
  UserProfile, 
  Language, 
  CashHandover,
  DeliveryStatus,
  Newspaper,
  PaymentMethod,
  Agency,
  DeliveryRoute
} from './types';
import { 
  formatBillNotificationMessage, 
  formatPaymentReceiptMessage, 
  formatReminderMessage,
  formatOverdueReminderMessage
} from './services/whatsappService';
import { processCustomerPayment, revertCustomerPayment } from './services/paymentService';
import { autoRunMonthEndBilling } from './services/billingEngine';

export default function App() {
  // Localization: Hindi default
  const [lang, setLang] = useState<Language>('hi');
  const [activeTab, setActiveTab] = useState<string>('customers');

  // Application State
  const [agency, setAgency] = useState<Agency>(storageService.getAgency());
  const [customers, setCustomers] = useState<Customer[]>(storageService.getCustomers());
  const [newspapers, setNewspapers] = useState<Newspaper[]>(storageService.getNewspapers());
  const [routes, setRoutes] = useState(storageService.getRoutes());
  const [deliveries, setDeliveries] = useState(storageService.getDeliveries());
  const [invoices, setInvoices] = useState(storageService.getInvoices());
  const [payments, setPayments] = useState(storageService.getPayments());
  const [ledger, setLedger] = useState(storageService.getLedger());
  const [expenses, setExpenses] = useState(storageService.getExpenses());
  const [handovers, setHandovers] = useState(storageService.getHandovers());
  const [currentUser, setCurrentUser] = useState(storageService.getCurrentUser());

  // Connectivity & Sync
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(syncEngine.getPendingCount());

  // Modal visibility states
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentRecord | null>(null);
  const [ledgerCustomer, setLedgerCustomer] = useState<Customer | null>(null);

  // Direct Customer Collection modal
  const [directCollectCustomer, setDirectCollectCustomer] = useState<Customer | null>(null);

  // Route Management Modal state
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);

  // Agency & Agent Profile Modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Google Cloud Backup & Recovery Modal state
  const [isCloudBackupOpen, setIsCloudBackupOpen] = useState(false);

  // WhatsApp Modal state
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [waCustomerMobile, setWaCustomerMobile] = useState('');
  const [waCustomerName, setWaCustomerName] = useState('');
  const [waMessage, setWaMessage] = useState('');

  // Online UPI Pay modal state
  const [isUpiPayOpen, setIsUpiPayOpen] = useState(false);
  const [upiPayCustomer, setUpiPayCustomer] = useState<Customer | null>(null);
  const [upiPayAmount, setUpiPayAmount] = useState(0);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      handleSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Automatic Month-End Billing & Customer Ledger Synchronization
    const currentMonth = '2026-10';
    const deletedInvoiceKeys = storageService.getDeletedInvoiceKeys();
    const autoResult = autoRunMonthEndBilling(
      customers,
      newspapers,
      deliveries,
      invoices,
      ledger,
      currentMonth,
      agency.billingPolicy || 'calendar_days',
      deletedInvoiceKeys
    );

    if (
      autoResult.generatedCount > 0 || 
      autoResult.invoices.length !== invoices.length ||
      autoResult.ledger.length !== ledger.length
    ) {
      setInvoices(autoResult.invoices);
      storageService.saveInvoices(autoResult.invoices);

      setLedger(autoResult.ledger);
      storageService.saveLedger(autoResult.ledger);

      setCustomers(autoResult.customers);
      storageService.saveCustomers(autoResult.customers);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSync = async () => {
    await syncEngine.runSync();
    setPendingSyncCount(syncEngine.getPendingCount());
  };

  // Auto-Sync on App Launch if enabled in Cloud Sync Settings
  useEffect(() => {
    const isAutoSyncEnabled = storageService.getAutoSyncOnLaunch();
    if (!isAutoSyncEnabled) return;

    let hasSynced = false;

    const unsubscribe = onAuthStateChanged(
      auth, 
      async (user) => {
        if (user && !hasSynced && navigator.onLine) {
          hasSynced = true;
          try {
            const cloudBackup = await firebaseService.getCloudBackup();
            if (cloudBackup) {
              handleRestoreCloudData(cloudBackup);
              console.info('Auto-Sync on Launch: local data synchronized with Firebase.');
            } else {
              // Initial cloud save for this account
              const payload: FullBackupPayload = {
                agency: storageService.getAgency(),
                customers: storageService.getCustomers(),
                newspapers: storageService.getNewspapers(),
                routes: storageService.getRoutes(),
                invoices: storageService.getInvoices(),
                payments: storageService.getPayments(),
                expenses: storageService.getExpenses(),
                ledger: storageService.getLedger(),
              };
              await firebaseService.saveCloudBackup(user.uid, user.email || '', payload);
              console.info('Auto-Sync on Launch: local data backed up to Firebase.');
            }
          } catch (err) {
            console.warn('Auto-sync on app launch notice:', err);
          }
        }
      },
      (authError) => {
        console.warn('Firebase Auth State listener notice:', authError?.message || authError);
      }
    );

    return () => unsubscribe();
  }, []);

  // 1. Save customer
  const handleSaveCustomer = (cust: Customer) => {
    const exists = customers.some((c) => c.id === cust.id);
    let updated: Customer[];
    if (exists) {
      updated = customers.map((c) => (c.id === cust.id ? cust : c));
    } else {
      updated = [cust, ...customers];
    }
    setCustomers(updated);
    storageService.saveCustomers(updated);

    // Automatically calculate month-end bill & ledger entry for customer
    const currentMonth = '2026-10';
    const deletedInvoiceKeys = storageService.getDeletedInvoiceKeys();
    const autoResult = autoRunMonthEndBilling(
      updated,
      newspapers,
      deliveries,
      invoices,
      ledger,
      currentMonth,
      agency.billingPolicy || 'calendar_days',
      deletedInvoiceKeys
    );
    setInvoices(autoResult.invoices);
    storageService.saveInvoices(autoResult.invoices);
    setLedger(autoResult.ledger);
    storageService.saveLedger(autoResult.ledger);

    if (!isOnline) {
      syncEngine.enqueue('customer', exists ? 'update' : 'create', cust);
      setPendingSyncCount(syncEngine.getPendingCount());
    }
  };

  // 1b. Delete customer
  const handleDeleteCustomer = (customerId: string) => {
    const updated = customers.filter((c) => c.id !== customerId);
    setCustomers(updated);
    storageService.saveCustomers(updated);

    if (!isOnline) {
      syncEngine.enqueue('customer', 'delete', { id: customerId });
      setPendingSyncCount(syncEngine.getPendingCount());
    }
  };

  // 2. Daily delivery status toggle
  const handleUpdateDeliveryStatus = (
    customerId: string,
    newspaperId: string,
    status: DeliveryStatus,
    date: string
  ) => {
    const existingIdx = deliveries.findIndex(
      (d) => d.customerId === customerId && d.newspaperId === newspaperId && d.date === date
    );

    const cust = customers.find((c) => c.id === customerId);
    const np = newspapers.find((n) => n.id === newspaperId);

    const record: DailyDeliveryRecord = {
      id: existingIdx >= 0 ? deliveries[existingIdx].id : `del_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      date,
      routeId: cust?.routeId || 'route_1',
      customerId,
      customerName: cust?.name || '',
      newspaperId,
      newspaperName: np?.nameHi || '',
      status,
      loggedByAgentId: currentUser.id,
      updatedAt: new Date().toISOString(),
    };

    let updatedDeliveries: DailyDeliveryRecord[];
    if (existingIdx >= 0) {
      updatedDeliveries = [...deliveries];
      updatedDeliveries[existingIdx] = record;
    } else {
      updatedDeliveries = [...deliveries, record];
    }

    setDeliveries(updatedDeliveries);
    storageService.saveDeliveries(updatedDeliveries);

    if (!isOnline) {
      syncEngine.enqueue('delivery', 'create', record);
      setPendingSyncCount(syncEngine.getPendingCount());
    }
  };

  // 3. Bulk mark route delivered
  const handleBulkMarkRouteDelivered = (routeId: string, date: string) => {
    const routeCustomers = customers.filter(
      (c) => c.routeId === routeId && c.subscriptionStatus !== 'discontinued'
    );
    const newRecords: DailyDeliveryRecord[] = [];

    routeCustomers.forEach((cust) => {
      const isPaused = cust.subscriptionStatus === 'paused';
      cust.subscriptions.forEach((sub) => {
        newRecords.push({
          id: `del_bulk_${cust.id}_${sub.newspaperId}_${date}`,
          date,
          routeId,
          customerId: cust.id,
          customerName: cust.name,
          newspaperId: sub.newspaperId,
          newspaperName: sub.newspaperNameHi,
          status: isPaused ? 'suspended' : 'delivered',
          loggedByAgentId: currentUser.id,
          updatedAt: new Date().toISOString(),
        });
      });
    });

    const filteredOld = deliveries.filter((d) => !(d.routeId === routeId && d.date === date));
    const merged = [...filteredOld, ...newRecords];
    setDeliveries(merged);
    storageService.saveDeliveries(merged);

    if (!isOnline) {
      syncEngine.enqueue('delivery', 'update', { routeId, date });
      setPendingSyncCount(syncEngine.getPendingCount());
    }
  };

  // 4. Bulk generated invoices
  const handleBulkGenerateBills = (newInvoices: Invoice[]) => {
    const billingMonth = newInvoices[0]?.billingMonth;
    const remainingInvoices = invoices.filter((i) => i.billingMonth !== billingMonth);
    const merged = [...remainingInvoices, ...newInvoices];
    setInvoices(merged);
    storageService.saveInvoices(merged);

    const updatedCustomers = customers.map((c) => {
      const inv = newInvoices.find((i) => i.customerId === c.id);
      return inv ? { ...c, currentBalance: inv.totalPayable } : c;
    });
    setCustomers(updatedCustomers);
    storageService.saveCustomers(updatedCustomers);
  };

  // 4b. Delete Invoice Handler
  const handleDeleteInvoice = (invoiceId: string) => {
    const invoiceToDelete = invoices.find((inv) => inv.id === invoiceId);
    if (!invoiceToDelete) return;

    // 1. Remove from invoices state & storage
    const updatedInvoices = invoices.filter((inv) => inv.id !== invoiceId);
    setInvoices(updatedInvoices);
    storageService.saveInvoices(updatedInvoices);

    // 2. Mark this customer & month so auto-billing doesn't immediately resurrect it
    const deletedKey = `${invoiceToDelete.customerId}_${invoiceToDelete.billingMonth}`;
    storageService.addDeletedInvoiceKey(deletedKey);

    // 3. Remove corresponding invoice debit entry from customer ledger
    const updatedLedger = ledger.filter(
      (entry) =>
        entry.referenceId !== invoiceToDelete.invoiceNumber &&
        entry.id !== `led_inv_${invoiceToDelete.id}`
    );
    setLedger(updatedLedger);
    storageService.saveLedger(updatedLedger);

    // 4. Revert customer current balance
    const updatedCustomers = customers.map((c) => {
      if (c.id === invoiceToDelete.customerId) {
        // Revert balance by subtracting the invoice's subtotal
        const revertedBalance = Math.max(0, (c.currentBalance || 0) - invoiceToDelete.subtotal);
        return {
          ...c,
          currentBalance: revertedBalance,
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });
    setCustomers(updatedCustomers);
    storageService.saveCustomers(updatedCustomers);

    // 5. Close invoice modal if open for this invoice
    if (selectedInvoice && selectedInvoice.id === invoiceId) {
      setSelectedInvoice(null);
    }

    // 6. Enqueue customer update sync if offline
    if (!isOnline) {
      const updatedCust = updatedCustomers.find((c) => c.id === invoiceToDelete.customerId);
      if (updatedCust) {
        syncEngine.enqueue('customer', 'update', updatedCust);
      }
      setPendingSyncCount(syncEngine.getPendingCount());
    }
  };

  // 5. Payment Recorded
  const handleRecordPaymentSuccess = (res: ReturnType<typeof processCustomerPayment>) => {
    const updatedPayments = [...payments, res.payment];
    setPayments(updatedPayments);
    storageService.savePayments(updatedPayments);

    const updatedCustomers = customers.map((c) => (c.id === res.updatedCustomer.id ? res.updatedCustomer : c));
    setCustomers(updatedCustomers);
    storageService.saveCustomers(updatedCustomers);

    setInvoices(res.updatedInvoices);
    storageService.saveInvoices(res.updatedInvoices);

    const updatedLedger = [...ledger, res.ledgerEntry];
    setLedger(updatedLedger);
    storageService.saveLedger(updatedLedger);

    if (!isOnline) {
      syncEngine.enqueue('payment', 'create', res.payment);
      setPendingSyncCount(syncEngine.getPendingCount());
    }
  };

  // 5b. Delete / Revert mistaken payment entry from Customer Ledger
  const handleDeleteLedgerPaymentEntry = (entryId: string, customerId: string) => {
    const res = revertCustomerPayment(
      { entryId },
      customerId,
      customers,
      ledger,
      payments,
      invoices
    );

    if (res.success) {
      setCustomers(res.updatedCustomers);
      storageService.saveCustomers(res.updatedCustomers);

      setLedger(res.updatedLedger);
      storageService.saveLedger(res.updatedLedger);

      setPayments(res.updatedPayments);
      storageService.savePayments(res.updatedPayments);

      setInvoices(res.updatedInvoices);
      storageService.saveInvoices(res.updatedInvoices);

      const updatedCust = res.updatedCustomers.find((c) => c.id === customerId);
      if (updatedCust) {
        setLedgerCustomer(updatedCust);
      }
    }
  };

  // 5c. Delete / Revert mistaken payment record from Collections View
  const handleDeletePaymentRecord = (paymentId: string) => {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return;

    const res = revertCustomerPayment(
      { paymentId },
      payment.customerId,
      customers,
      ledger,
      payments,
      invoices
    );

    if (res.success) {
      setCustomers(res.updatedCustomers);
      storageService.saveCustomers(res.updatedCustomers);

      setLedger(res.updatedLedger);
      storageService.saveLedger(res.updatedLedger);

      setPayments(res.updatedPayments);
      storageService.savePayments(res.updatedPayments);

      setInvoices(res.updatedInvoices);
      storageService.saveInvoices(res.updatedInvoices);

      if (ledgerCustomer && ledgerCustomer.id === payment.customerId) {
        const updatedCust = res.updatedCustomers.find((c) => c.id === payment.customerId);
        if (updatedCust) {
          setLedgerCustomer(updatedCust);
        }
      }
    }
  };

  // 6. Direct Collection from Customers List
  const handleDirectCollectSubmit = (
    cust: Customer,
    amount: number,
    method: PaymentMethod,
    notes?: string,
    txRef?: string
  ) => {
    const res = processCustomerPayment(
      {
        customerId: cust.id,
        customerName: cust.name,
        customerMobile: cust.mobile,
        amount,
        paymentMethod: method,
        collectedByAgentId: currentUser.id,
        collectedByAgentName: currentUser.name,
        transactionRef: txRef,
        notes: notes || 'ग्राहक सूची से सीधा कलेक्शन',
        agencyUpiId: agency.upiId,
      },
      cust,
      invoices
    );

    handleRecordPaymentSuccess(res);
    setSelectedReceipt(res.payment);
  };

  // 7. Online Payment Success from Modal or Customer Portal
  const handleOnlinePaymentSuccess = (amount: number, method: 'upi' | 'online_gateway', txId: string) => {
    if (!upiPayCustomer) return;
    const res = processCustomerPayment(
      {
        customerId: upiPayCustomer.id,
        customerName: upiPayCustomer.name,
        customerMobile: upiPayCustomer.mobile,
        amount,
        paymentMethod: method,
        collectedByAgentId: 'agent_gateway_system',
        collectedByAgentName: method === 'upi' ? 'UPI PhonePe/GPay Auto' : 'Razorpay Gateway',
        transactionRef: txId,
        notes: 'ग्राहक द्वारा ऑनलाइन डिजिटल भुगतान',
        agencyUpiId: agency.upiId,
      },
      upiPayCustomer,
      invoices
    );

    handleRecordPaymentSuccess(res);
    setSelectedReceipt(res.payment);
  };

  // 8. Save & Edit Newspaper
  const handleSaveNewspaper = (np: Newspaper) => {
    const exists = newspapers.some((n) => n.id === np.id);
    const updated = exists ? newspapers.map((n) => (n.id === np.id ? np : n)) : [...newspapers, np];
    setNewspapers(updated);
    storageService.saveNewspapers(updated);
  };

  const handleDeleteNewspaper = (id: string) => {
    const updated = newspapers.filter((n) => n.id !== id);
    setNewspapers(updated);
    storageService.saveNewspapers(updated);
  };

  // Route Management Handlers
  const handleSaveRoute = (newRoute: DeliveryRoute) => {
    const exists = routes.some((r) => r.id === newRoute.id);
    const updated = exists
      ? routes.map((r) => (r.id === newRoute.id ? newRoute : r))
      : [...routes, newRoute];
    setRoutes(updated);
    storageService.saveRoutes(updated);
  };

  const handleDeleteRoute = (routeId: string) => {
    const updated = routes.filter((r) => r.id !== routeId);
    setRoutes(updated);
    storageService.saveRoutes(updated);
  };

  // 9. Update Agency UPI ID
  const handleUpdateAgencyUpiId = (newUpiId: string) => {
    const updatedAgency: Agency = {
      ...agency,
      upiId: newUpiId,
    };
    setAgency(updatedAgency);
    storageService.saveAgency(updatedAgency);
  };

  // 9b. Update Full Agency & Agent Profile
  const handleSaveProfile = (updatedAgency: Agency, updatedUser: UserProfile) => {
    setAgency(updatedAgency);
    storageService.saveAgency(updatedAgency);
    setCurrentUser(updatedUser);
    storageService.saveCurrentUser(updatedUser);
  };

  // 9c. Google Cloud Backup to Firestore
  const handlePerformCloudBackup = async (): Promise<boolean> => {
    try {
      const payload: FullBackupPayload = {
        agency,
        customers,
        newspapers,
        routes,
        invoices,
        payments,
        expenses,
        ledger,
        deliveries,
        handovers,
        exportedAt: new Date().toISOString(),
        version: '2.0',
      };
      const userId = currentUser.id || 'usr_owner_01';
      const userEmail = currentUser.email || agency.email || '';
      return await firebaseService.saveCloudBackup(userId, userEmail, payload);
    } catch (err: any) {
      console.warn('Cloud backup status notice:', err?.message || err);
      return false;
    }
  };

  // 9d. Google Cloud Restore from Firestore / Offline File
  const handleRestoreCloudData = (data: FullBackupPayload) => {
    if (data.agency) {
      setAgency(data.agency);
      storageService.saveAgency(data.agency);
    }
    if (data.customers && data.customers.length > 0) {
      setCustomers(data.customers);
      storageService.saveCustomers(data.customers);
    }
    if (data.newspapers && data.newspapers.length > 0) {
      setNewspapers(data.newspapers);
      storageService.saveNewspapers(data.newspapers);
    }
    if (data.routes && data.routes.length > 0) {
      setRoutes(data.routes);
      storageService.saveRoutes(data.routes);
    }
    if (data.invoices && data.invoices.length > 0) {
      setInvoices(data.invoices);
      storageService.saveInvoices(data.invoices);
    }
    if (data.payments && data.payments.length > 0) {
      setPayments(data.payments);
      storageService.savePayments(data.payments);
    }
    if (data.expenses && data.expenses.length > 0) {
      setExpenses(data.expenses);
      storageService.saveExpenses(data.expenses);
    }
    if (data.ledger && data.ledger.length > 0) {
      setLedger(data.ledger);
      storageService.saveLedger(data.ledger);
    }
    if (data.deliveries && data.deliveries.length > 0) {
      setDeliveries(data.deliveries);
      storageService.saveDeliveries(data.deliveries);
    }
    if (data.handovers && data.handovers.length > 0) {
      setHandovers(data.handovers);
      storageService.saveHandovers(data.handovers);
    }
  };

  // 10. Save Expense
  const handleSaveExpense = (exp: ExpenseRecord) => {
    const updated = [exp, ...expenses];
    setExpenses(updated);
    storageService.saveExpenses(updated);
  };

  // 11. Save Handover
  const handleSaveHandover = (h: CashHandover) => {
    const updated = [h, ...handovers];
    setHandovers(updated);
    storageService.saveHandovers(updated);
  };

  // 12. WhatsApp sharing triggers
  const handleShareInvoiceWhatsApp = (inv: Invoice) => {
    const cust = customers.find((c) => c.id === inv.customerId);
    if (!cust) return;
    const msg = formatBillNotificationMessage(cust, inv, agency.nameHi, lang);
    setWaCustomerMobile(cust.mobile);
    setWaCustomerName(cust.name);
    setWaMessage(msg);
    setIsWhatsAppOpen(true);
  };

  const handleShareReceiptWhatsApp = (p: PaymentRecord) => {
    const msg = formatPaymentReceiptMessage(p, agency.nameHi, lang);
    setWaCustomerMobile(p.customerMobile);
    setWaCustomerName(p.customerName);
    setWaMessage(msg);
    setIsWhatsAppOpen(true);
  };

  const handleSendReminderWhatsApp = (cust: Customer, customMessage?: string) => {
    const unpaidInv = invoices.find((i) => i.customerId === cust.id && i.status !== 'paid');
    const msg = customMessage || formatOverdueReminderMessage(cust, agency, unpaidInv, lang);
    setWaCustomerMobile(cust.mobile);
    setWaCustomerName(cust.name);
    setWaMessage(msg);
    setIsWhatsAppOpen(true);
  };

  // 13. Customer portal pause update
  const handleUpdateCustomerPause = (cust: Customer, start: string, end: string) => {
    const updated: Customer = {
      ...cust,
      subscriptionStatus: 'paused',
      pauseStartDate: start,
      pauseEndDate: end,
      updatedAt: new Date().toISOString(),
    };
    handleSaveCustomer(updated);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        lang={lang}
        onLanguageChange={setLang}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenCloudBackup={() => setIsCloudBackupOpen(true)}
        onOpenMore={() => setIsMoreMenuOpen(true)}
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
        onSync={handleSync}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-12">
        {activeTab === 'dashboard' && (
          <DashboardView
            customers={customers}
            invoices={invoices}
            payments={payments}
            newspapers={newspapers}
            routes={routes}
            deliveries={deliveries}
            expenses={expenses}
            agency={agency}
            lang={lang}
            onNavigate={setActiveTab}
            onOpenNewPayment={() => {
              setActiveTab('collections');
            }}
            onOpenNewCustomer={() => {
              setActiveTab('customers');
            }}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersView
            customers={customers}
            routes={routes}
            newspapers={newspapers}
            ledger={ledger}
            lang={lang}
            onSaveCustomer={handleSaveCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onViewLedger={(cust) => setLedgerCustomer(cust)}
            onDirectCollectPayment={(cust) => setDirectCollectCustomer(cust)}
          />
        )}

        {activeTab === 'billing' && (
          <BillingView
            customers={customers}
            newspapers={newspapers}
            deliveries={deliveries}
            invoices={invoices}
            agency={agency}
            currentUser={currentUser}
            lang={lang}
            onOpenInvoiceModal={(inv) => setSelectedInvoice(inv)}
            onShareWhatsAppBill={handleShareInvoiceWhatsApp}
            onDeleteInvoice={handleDeleteInvoice}
          />
        )}

        {activeTab === 'collections' && (
          <CollectionsView
            payments={payments}
            customers={customers}
            invoices={invoices}
            handovers={handovers}
            currentUser={currentUser}
            agency={agency}
            lang={lang}
            routes={routes}
            onRecordPaymentSuccess={handleRecordPaymentSuccess}
            onOpenReceiptModal={(p) => setSelectedReceipt(p)}
            onShareReceiptWhatsApp={handleShareReceiptWhatsApp}
            onSaveHandover={handleSaveHandover}
            onSendReminderWhatsApp={handleSendReminderWhatsApp}
            onDeletePayment={handleDeletePaymentRecord}
          />
        )}

        {activeTab === 'newspapers' && (
          <NewspapersView
            newspapers={newspapers}
            lang={lang}
            onSaveNewspaper={handleSaveNewspaper}
            onDeleteNewspaper={handleDeleteNewspaper}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesView
            expenses={expenses}
            currentUser={currentUser}
            lang={lang}
            onSaveExpense={handleSaveExpense}
          />
        )}

        {activeTab === 'customerPortal' && (
          <CustomerPortalView
            currentUser={currentUser}
            customer={customers[0] || ({} as any)}
            invoices={invoices}
            payments={payments}
            ledger={ledger}
            agency={agency}
            lang={lang}
            onOpenInvoiceModal={(inv) => setSelectedInvoice(inv)}
            onOpenReceiptModal={(p) => setSelectedReceipt(p)}
            onPayOnline={(cust, amt) => {
              setUpiPayCustomer(cust);
              setUpiPayAmount(amt);
              setIsUpiPayOpen(true);
            }}
            onUpdatePause={handleUpdateCustomerPause}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            customers={customers}
            payments={payments}
            invoices={invoices}
            routes={routes}
            agency={agency}
            lang={lang}
          />
        )}

        {activeTab === 'qaTests' && (
          <QATestRunnerView lang={lang} />
        )}

        {activeTab === 'systemDocs' && (
          <SystemDocsView lang={lang} />
        )}
      </main>

      {/* Mobile Bottom Thumb Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        lang={lang}
        onOpenMore={() => setIsMoreMenuOpen(true)}
      />

      {/* Modals & Dialogs */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        agency={agency}
        onLoginSuccess={(user, updatedAgency, restoredCloudData) => {
          setCurrentUser(user);
          storageService.saveCurrentUser(user);
          if (updatedAgency) {
            setAgency(updatedAgency);
            storageService.saveAgency(updatedAgency);
          }
          if (restoredCloudData) {
            handleRestoreCloudData(restoredCloudData);
          }
          if (user.role === 'customer') {
            setActiveTab('customerPortal');
          } else if (user.role === 'collection_agent') {
            setActiveTab('collections');
          } else {
            setActiveTab('customers');
          }
        }}
        onCloudRestore={handleRestoreCloudData}
        lang={lang}
      />

      <InvoiceModal
        invoice={selectedInvoice}
        agency={agency}
        onClose={() => setSelectedInvoice(null)}
        lang={lang}
        onShareWhatsApp={handleShareInvoiceWhatsApp}
        onDeleteInvoice={handleDeleteInvoice}
      />

      <ReceiptModal
        payment={selectedReceipt}
        agency={agency}
        onClose={() => setSelectedReceipt(null)}
        lang={lang}
        onShareWhatsApp={handleShareReceiptWhatsApp}
      />

      <WhatsAppModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        customerMobile={waCustomerMobile}
        customerName={waCustomerName}
        defaultMessage={waMessage}
        lang={lang}
      />

      <UPIPaymentModal
        isOpen={isUpiPayOpen}
        onClose={() => setIsUpiPayOpen(false)}
        customer={upiPayCustomer || customers[0]}
        amount={upiPayAmount}
        agency={agency}
        onPaymentSuccess={handleOnlinePaymentSuccess}
        onUpdateAgencyUpiId={handleUpdateAgencyUpiId}
        lang={lang}
      />

      <DirectCollectModal
        isOpen={!!directCollectCustomer}
        customer={directCollectCustomer}
        currentUser={currentUser}
        agency={agency}
        onClose={() => setDirectCollectCustomer(null)}
        onRecordPayment={handleDirectCollectSubmit}
        lang={lang}
      />

      <LedgerModal
        customer={ledgerCustomer}
        ledger={ledger}
        onClose={() => setLedgerCustomer(null)}
        lang={lang}
        onDeletePaymentEntry={handleDeleteLedgerPaymentEntry}
      />

      <MoreMenuModal
        isOpen={isMoreMenuOpen}
        onClose={() => setIsMoreMenuOpen(false)}
        onSelectTab={setActiveTab}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenRouteManagement={() => setIsRouteModalOpen(true)}
        onOpenAgencyProfile={() => setIsProfileModalOpen(true)}
        onOpenCloudBackup={() => setIsCloudBackupOpen(true)}
        currentUser={currentUser}
        lang={lang}
        onLanguageChange={setLang}
      />

      <RouteManagementModal
        isOpen={isRouteModalOpen}
        onClose={() => setIsRouteModalOpen(false)}
        routes={routes}
        customers={customers}
        onSaveRoute={handleSaveRoute}
        onDeleteRoute={handleDeleteRoute}
        lang={lang}
      />

      <AgencyProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        agency={agency}
        currentUser={currentUser}
        onSaveProfile={handleSaveProfile}
        lang={lang}
      />

      <CloudBackupModal
        isOpen={isCloudBackupOpen}
        onClose={() => setIsCloudBackupOpen(false)}
        currentUser={currentUser}
        agency={agency}
        onOpenAuth={() => setIsAuthOpen(true)}
        onPerformBackup={handlePerformCloudBackup}
        onRestoreBackup={handleRestoreCloudData}
        lang={lang}
      />

    </div>
  );
}
