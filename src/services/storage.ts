import {
  Agency,
  Customer,
  Newspaper,
  DeliveryRoute,
  DailyDeliveryRecord,
  Invoice,
  PaymentRecord,
  CustomerLedgerEntry,
  ExpenseRecord,
  UserProfile,
  CashHandover,
  SyncQueueItem,
  MessageLog,
} from '../types';

const STORAGE_KEYS = {
  AGENCY: 'ajeet_agency',
  CUSTOMERS: 'ajeet_customers',
  NEWSPAPERS: 'ajeet_newspapers',
  ROUTES: 'ajeet_routes',
  DELIVERIES: 'ajeet_deliveries',
  INVOICES: 'ajeet_invoices',
  PAYMENTS: 'ajeet_payments',
  LEDGER: 'ajeet_ledger',
  EXPENSES: 'ajeet_expenses',
  CURRENT_USER: 'ajeet_current_user',
  HANDOVERS: 'ajeet_handovers',
  SYNC_QUEUE: 'ajeet_sync_queue',
  MESSAGE_LOGS: 'ajeet_message_logs',
  AUTO_SYNC_ON_LAUNCH: 'ajeet_auto_sync_on_launch',
  DELETED_INVOICES: 'ajeet_deleted_invoices',
  OTP_SESSION_VERIFIED: 'ajeet_otp_session_verified_v2',
};

export const defaultAgency: Agency = {
  id: 'agency_ajeet_01',
  name: 'Ajit collection',
  nameHi: 'अजीत कलेक्शन',
  ownerName: 'Ajeet Kumar Sharma',
  mobile: '9660527071',
  email: '',
  address: 'Main Market Road, Near Clock Tower',
  city: 'Sri Ganganagar',
  state: 'Rajasthan',
  pincode: '335001',
  gstin: '08AAAAA0000A1Z5',
  upiId: 'ajeet9660527071@upi',
  billingPolicy: 'calendar_days',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
};

export const defaultNewspapers: Newspaper[] = [
  {
    id: 'np_bhaskar',
    name: 'Dainik Bhaskar',
    nameHi: 'दैनिक भास्कर',
    edition: 'Sri Ganganagar City',
    language: 'Hindi',
    publisher: 'DB Corp Ltd',
    retailPrice: 5.0,
    agencyPrice: 3.6,
    fixedMonthlyPrice: 150,
    effectiveDate: '2026-01-01',
    status: 'active',
  },
  {
    id: 'np_patrika',
    name: 'Rajasthan Patrika',
    nameHi: 'राजस्थान पत्रिका',
    edition: 'Bikaner / Ganganagar',
    language: 'Hindi',
    publisher: 'Patrika Group',
    retailPrice: 5.0,
    agencyPrice: 3.65,
    fixedMonthlyPrice: 150,
    effectiveDate: '2026-01-01',
    status: 'active',
  },
  {
    id: 'np_sandesh',
    name: 'Seema Sandesh',
    nameHi: 'सीमा संदेश',
    edition: 'Border Regional',
    language: 'Hindi',
    publisher: 'Sandesh Media',
    retailPrice: 3.5,
    agencyPrice: 2.3,
    fixedMonthlyPrice: 100,
    effectiveDate: '2026-01-01',
    status: 'active',
  },
  {
    id: 'np_toi',
    name: 'The Times of India',
    nameHi: 'द टाइम्स ऑफ इंडिया',
    edition: 'North Rajasthan',
    language: 'English',
    publisher: 'Bennett, Coleman & Co.',
    retailPrice: 7.0,
    agencyPrice: 5.2,
    fixedMonthlyPrice: 210,
    effectiveDate: '2026-01-01',
    status: 'active',
  },
  {
    id: 'np_punjabkesari',
    name: 'Punjab Kesari',
    nameHi: 'पंजाब केसरी',
    edition: 'Rajasthan Edition',
    language: 'Hindi',
    publisher: 'The Hind Samachar Ltd',
    retailPrice: 4.5,
    agencyPrice: 3.2,
    fixedMonthlyPrice: 135,
    effectiveDate: '2026-01-01',
    status: 'active',
  },
];

export const defaultRoutes: DeliveryRoute[] = [
  {
    id: 'route_1',
    code: 'RT-01',
    name: 'Station Road & Civil Lines',
    nameHi: 'स्टेशन रोड एवं सिविल लाइन्स',
    locality: 'Civil Lines, Station Area',
    wardNumbers: ['01', '02', '03'],
    assignedDeliveryAgentId: 'agent_hawker_1',
    assignedCollectionAgentId: 'agent_collector_1',
    customerCount: 42,
  },
  {
    id: 'route_2',
    code: 'RT-02',
    name: 'Shastri Nagar & Ward 4-8',
    nameHi: 'शास्त्री नगर एवं वार्ड 4-8',
    locality: 'Shastri Nagar',
    wardNumbers: ['04', '05', '06', '07', '08'],
    assignedDeliveryAgentId: 'agent_hawker_2',
    assignedCollectionAgentId: 'agent_collector_1',
    customerCount: 38,
  },
  {
    id: 'route_3',
    code: 'RT-03',
    name: 'Purani Aabadi & Main Bazar',
    nameHi: 'पुरानी आबादी एवं मुख्य बाजार',
    locality: 'Purani Aabadi, Sadar Bazar',
    wardNumbers: ['09', '10', '11', '12'],
    assignedDeliveryAgentId: 'agent_hawker_1',
    assignedCollectionAgentId: 'agent_collector_2',
    customerCount: 55,
  },
];

export const defaultCustomers: Customer[] = [
  {
    id: 'cust_101',
    customerCode: 'AJT-101',
    name: 'Vikram Sharma',
    mobile: '9660527071',
    alternateMobile: '9414012345',
    address: 'House No. 42, Ward 2, Civil Lines',
    landmark: 'Opposite State Bank',
    villageCity: 'Sri Ganganagar',
    wardNumber: '02',
    routeId: 'route_1',
    customerType: 'residential',
    subscriptionStatus: 'active',
    deliveryAgentId: 'agent_hawker_1',
    collectionAgentId: 'agent_collector_1',
    preferredLanguage: 'hi',
    openingBalance: 0,
    currentBalance: 300,
    billingCycle: 'monthly',
    paymentPreference: 'upi',
    notes: 'Morning delivery by 6:30 AM at front gate',
    subscriptions: [
      {
        id: 'sub_101_1',
        newspaperId: 'np_bhaskar',
        newspaperName: 'Dainik Bhaskar',
        newspaperNameHi: 'दैनिक भास्कर',
        quantity: 1,
        startDate: '2026-01-01',
        status: 'active',
      },
      {
        id: 'sub_101_2',
        newspaperId: 'np_toi',
        newspaperName: 'The Times of India',
        newspaperNameHi: 'द टाइम्स ऑफ इंडिया',
        quantity: 1,
        startDate: '2026-02-01',
        status: 'active',
      },
    ],
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'cust_102',
    customerCode: 'AJT-102',
    name: 'Radhe Shyam Agarwal',
    mobile: '9829011223',
    alternateMobile: '9829099887',
    address: 'Shop 14, Main Cloth Market',
    landmark: 'Near Ghantaghar',
    villageCity: 'Sri Ganganagar',
    wardNumber: '10',
    routeId: 'route_3',
    customerType: 'commercial',
    subscriptionStatus: 'active',
    deliveryAgentId: 'agent_hawker_1',
    collectionAgentId: 'agent_collector_2',
    preferredLanguage: 'hi',
    openingBalance: 150,
    currentBalance: 450,
    billingCycle: 'monthly',
    paymentPreference: 'cash',
    notes: 'Deliver at shop counter after 9:00 AM',
    subscriptions: [
      {
        id: 'sub_102_1',
        newspaperId: 'np_patrika',
        newspaperName: 'Rajasthan Patrika',
        newspaperNameHi: 'राजस्थान पत्रिका',
        quantity: 1,
        startDate: '2026-01-01',
        status: 'active',
      },
      {
        id: 'sub_102_2',
        newspaperId: 'np_sandesh',
        newspaperName: 'Seema Sandesh',
        newspaperNameHi: 'सीमा संदेश',
        quantity: 1,
        startDate: '2026-03-01',
        status: 'active',
      },
    ],
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'cust_103',
    customerCode: 'AJT-103',
    name: 'Dr. Sunita Verma',
    mobile: '9414234567',
    address: 'B-18, Doctors Colony, Shastri Nagar',
    landmark: 'Verma Hospital Lane',
    villageCity: 'Sri Ganganagar',
    wardNumber: '05',
    routeId: 'route_2',
    customerType: 'residential',
    subscriptionStatus: 'active',
    deliveryAgentId: 'agent_hawker_2',
    collectionAgentId: 'agent_collector_1',
    preferredLanguage: 'hi',
    openingBalance: 0,
    currentBalance: 150,
    billingCycle: 'monthly',
    paymentPreference: 'upi',
    subscriptions: [
      {
        id: 'sub_103_1',
        newspaperId: 'np_bhaskar',
        newspaperName: 'Dainik Bhaskar',
        newspaperNameHi: 'दैनिक भास्कर',
        quantity: 1,
        startDate: '2026-01-01',
        status: 'active',
      },
    ],
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'cust_104',
    customerCode: 'AJT-104',
    name: 'Sardar Manjit Singh',
    mobile: '9828765432',
    address: 'Plot 78, Ward 1, Civil Lines',
    landmark: 'Near Gurudwara Sahib',
    villageCity: 'Sri Ganganagar',
    wardNumber: '01',
    routeId: 'route_1',
    customerType: 'residential',
    subscriptionStatus: 'active',
    deliveryAgentId: 'agent_hawker_1',
    collectionAgentId: 'agent_collector_1',
    preferredLanguage: 'hi',
    openingBalance: 0,
    currentBalance: 285,
    billingCycle: 'monthly',
    paymentPreference: 'cash',
    subscriptions: [
      {
        id: 'sub_104_1',
        newspaperId: 'np_punjabkesari',
        newspaperName: 'Punjab Kesari',
        newspaperNameHi: 'पंजाब केसरी',
        quantity: 1,
        startDate: '2026-01-01',
        status: 'active',
      },
      {
        id: 'sub_104_2',
        newspaperId: 'np_bhaskar',
        newspaperName: 'Dainik Bhaskar',
        newspaperNameHi: 'दैनिक भास्कर',
        quantity: 1,
        startDate: '2026-01-01',
        status: 'active',
      },
    ],
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'cust_105',
    customerCode: 'AJT-105',
    name: 'Balaji Sweet & Snacks',
    mobile: '9784561234',
    address: 'Shop 3, Station Circular Road',
    landmark: 'Near Railway Station Exit',
    villageCity: 'Sri Ganganagar',
    wardNumber: '03',
    routeId: 'route_1',
    customerType: 'commercial',
    subscriptionStatus: 'active',
    deliveryAgentId: 'agent_hawker_1',
    collectionAgentId: 'agent_collector_1',
    preferredLanguage: 'hi',
    openingBalance: 0,
    currentBalance: 0,
    billingCycle: 'monthly',
    paymentPreference: 'cash',
    subscriptions: [
      {
        id: 'sub_105_1',
        newspaperId: 'np_bhaskar',
        newspaperName: 'Dainik Bhaskar',
        newspaperNameHi: 'दैनिक भास्कर',
        quantity: 2,
        startDate: '2026-01-01',
        status: 'active',
      },
    ],
    createdAt: '2026-02-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
];

export const defaultExpenses: ExpenseRecord[] = [
  {
    id: 'exp_01',
    agencyId: 'agency_ajeet_01',
    category: 'newspaper_purchase',
    title: 'Daily Newspaper Bulk Purchase (DB Corp & Patrika)',
    titleHi: 'थोक अखबार खरीद (भास्कर व पत्रिका प्रेस)',
    amount: 14200,
    date: '2026-10-05',
    recordedBy: 'Ajeet Kumar',
  },
  {
    id: 'exp_02',
    agencyId: 'agency_ajeet_01',
    category: 'delivery_salary',
    title: 'Hawker Delivery Wages (Ramesh & Suresh)',
    titleHi: 'वितरण हॉकर वेतन (रमेश एवं मुकेश)',
    amount: 9000,
    date: '2026-10-01',
    recordedBy: 'Ajeet Kumar',
  },
  {
    id: 'exp_03',
    agencyId: 'agency_ajeet_01',
    category: 'fuel_vehicle',
    title: 'Delivery Bike Petrol & Maintenance',
    titleHi: 'वितरण बाइक पेट्रोल खर्च',
    amount: 1650,
    date: '2026-10-12',
    recordedBy: 'Ajeet Kumar',
  },
  {
    id: 'exp_04',
    agencyId: 'agency_ajeet_01',
    category: 'rent',
    title: 'Agency Distribution Depot Rent',
    titleHi: 'एजेंसी वितरण डिपो किराया',
    amount: 4500,
    date: '2026-10-02',
    recordedBy: 'Ajeet Kumar',
  },
];

// Helper to safely read and write JSON in browser storage
export const storageService = {
  getAgency(): Agency {
    const data = localStorage.getItem(STORAGE_KEYS.AGENCY);
    if (!data) return defaultAgency;
    try {
      const parsed = JSON.parse(data);
      if (!parsed.name || parsed.name === 'Ajeet Newspaper Agency') {
        parsed.name = 'Ajit collection';
        parsed.nameHi = 'अजीत कलेक्शन';
      }
      const userRaw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      const userParsed = userRaw ? JSON.parse(userRaw) : null;
      if (
        (!userParsed || userParsed.authProvider !== 'google') &&
        (parsed.email === 'lakshaycorporation@gmail.com' || parsed.email === 'ajeet9660527071@gmail.com') &&
        !localStorage.getItem('ajeet_user_explicit_email_linked')
      ) {
        parsed.email = '';
        localStorage.setItem(STORAGE_KEYS.AGENCY, JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return defaultAgency;
    }
  },
  saveAgency(agency: Agency) {
    localStorage.setItem(STORAGE_KEYS.AGENCY, JSON.stringify(agency));
  },

  getCustomers(): Customer[] {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return data ? JSON.parse(data) : defaultCustomers;
  },
  saveCustomers(customers: Customer[]) {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  },

  getNewspapers(): Newspaper[] {
    const data = localStorage.getItem(STORAGE_KEYS.NEWSPAPERS);
    return data ? JSON.parse(data) : defaultNewspapers;
  },
  saveNewspapers(newspapers: Newspaper[]) {
    localStorage.setItem(STORAGE_KEYS.NEWSPAPERS, JSON.stringify(newspapers));
  },

  getRoutes(): DeliveryRoute[] {
    const data = localStorage.getItem(STORAGE_KEYS.ROUTES);
    return data ? JSON.parse(data) : defaultRoutes;
  },
  saveRoutes(routes: DeliveryRoute[]) {
    localStorage.setItem(STORAGE_KEYS.ROUTES, JSON.stringify(routes));
  },

  getDeliveries(): DailyDeliveryRecord[] {
    const data = localStorage.getItem(STORAGE_KEYS.DELIVERIES);
    return data ? JSON.parse(data) : [];
  },
  saveDeliveries(deliveries: DailyDeliveryRecord[]) {
    localStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(deliveries));
  },

  getInvoices(): Invoice[] {
    const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
    return data ? JSON.parse(data) : [];
  },
  saveInvoices(invoices: Invoice[]) {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  },

  getPayments(): PaymentRecord[] {
    const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    return data ? JSON.parse(data) : [];
  },
  savePayments(payments: PaymentRecord[]) {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  },

  getLedger(): CustomerLedgerEntry[] {
    const data = localStorage.getItem(STORAGE_KEYS.LEDGER);
    return data ? JSON.parse(data) : [];
  },
  saveLedger(ledger: CustomerLedgerEntry[]) {
    localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(ledger));
  },

  getExpenses(): ExpenseRecord[] {
    const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    return data ? JSON.parse(data) : defaultExpenses;
  },
  saveExpenses(expenses: ExpenseRecord[]) {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  },

  getCurrentUser(): UserProfile {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (
          parsed.authProvider !== 'google' &&
          (parsed.email === 'lakshaycorporation@gmail.com' || parsed.email === 'ajeet9660527071@gmail.com') &&
          !localStorage.getItem('ajeet_user_explicit_email_linked')
        ) {
          parsed.email = '';
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(parsed));
        }
        return parsed;
      } catch {
        // fallback below
      }
    }
    return {
      id: 'usr_owner_01',
      name: 'Ajeet Kumar (Agency Owner)',
      mobile: '9660527071',
      email: '',
      role: 'agency_owner',
      agencyId: 'agency_ajeet_01',
      verifiedAt: new Date().toISOString(),
      authProvider: 'phone',
    };
  },
  saveCurrentUser(user: UserProfile) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  },

  getHandovers(): CashHandover[] {
    const data = localStorage.getItem(STORAGE_KEYS.HANDOVERS);
    return data ? JSON.parse(data) : [];
  },
  saveHandovers(handovers: CashHandover[]) {
    localStorage.setItem(STORAGE_KEYS.HANDOVERS, JSON.stringify(handovers));
  },

  getSyncQueue(): SyncQueueItem[] {
    const data = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
    return data ? JSON.parse(data) : [];
  },
  saveSyncQueue(queue: SyncQueueItem[]) {
    localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
  },

  getMessageLogs(): MessageLog[] {
    const data = localStorage.getItem(STORAGE_KEYS.MESSAGE_LOGS);
    return data ? JSON.parse(data) : [];
  },
  saveMessageLogs(logs: MessageLog[]) {
    localStorage.setItem(STORAGE_KEYS.MESSAGE_LOGS, JSON.stringify(logs));
  },

  getAutoSyncOnLaunch(): boolean {
    const data = localStorage.getItem(STORAGE_KEYS.AUTO_SYNC_ON_LAUNCH);
    return data !== null ? data === 'true' : true;
  },
  saveAutoSyncOnLaunch(enabled: boolean) {
    localStorage.setItem(STORAGE_KEYS.AUTO_SYNC_ON_LAUNCH, enabled ? 'true' : 'false');
  },

  getDeletedInvoiceKeys(): string[] {
    const data = localStorage.getItem(STORAGE_KEYS.DELETED_INVOICES);
    return data ? JSON.parse(data) : [];
  },
  saveDeletedInvoiceKeys(keys: string[]) {
    localStorage.setItem(STORAGE_KEYS.DELETED_INVOICES, JSON.stringify(keys));
  },
  addDeletedInvoiceKey(key: string) {
    const existing = this.getDeletedInvoiceKeys();
    if (!existing.includes(key)) {
      this.saveDeletedInvoiceKeys([...existing, key]);
    }
  },

  isOtpSessionVerified(): boolean {
    return localStorage.getItem(STORAGE_KEYS.OTP_SESSION_VERIFIED) === 'true';
  },
  setOtpSessionVerified(verified: boolean) {
    if (verified) {
      localStorage.setItem(STORAGE_KEYS.OTP_SESSION_VERIFIED, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEYS.OTP_SESSION_VERIFIED);
    }
  },

  resetAllToDefault() {
    localStorage.clear();
    this.saveAgency(defaultAgency);
    this.saveCustomers(defaultCustomers);
    this.saveNewspapers(defaultNewspapers);
    this.saveRoutes(defaultRoutes);
    this.saveExpenses(defaultExpenses);
  },
};
