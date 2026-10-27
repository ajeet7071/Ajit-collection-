export type UserRole = 
  | 'super_admin'
  | 'agency_owner'
  | 'manager'
  | 'supervisor'
  | 'collection_agent'
  | 'delivery_agent'
  | 'accountant'
  | 'customer';

export type Language = 'hi' | 'en';

export interface UserProfile {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  role: UserRole;
  agencyId: string;
  assignedRouteId?: string;
  token?: string;
  verifiedAt?: string;
  isPhoneVerified?: boolean;
  authProvider?: 'google' | 'phone' | 'demo';
}

export interface Agency {
  id: string;
  name: string;
  nameHi: string;
  ownerName: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin?: string;
  upiId: string;
  billingPolicy: 'calendar_days' | 'actual_delivery' | 'fixed_monthly';
  timezone: string;
  currency: string;
}

export type CustomerType = 'residential' | 'commercial' | 'institution';
export type SubscriptionStatus = 'active' | 'paused' | 'discontinued';
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly';
export type PaymentPreference = 'cash' | 'upi' | 'bank_transfer' | 'online';

export interface Customer {
  id: string;
  customerCode: string; // e.g., AJT-101
  name: string;
  mobile: string;
  alternateMobile?: string;
  address: string;
  landmark?: string;
  villageCity: string;
  wardNumber: string;
  routeId: string;
  customerType: CustomerType;
  subscriptionStatus: SubscriptionStatus;
  deliveryAgentId: string;
  collectionAgentId: string;
  preferredLanguage: Language;
  openingBalance: number;
  currentBalance: number;
  billingCycle: BillingCycle;
  paymentPreference: PaymentPreference;
  notes?: string;
  subscriptions: CustomerSubscriptionItem[];
  pauseStartDate?: string;
  pauseEndDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Newspaper {
  id: string;
  name: string;
  nameHi: string;
  edition: string;
  language: string;
  publisher: string;
  retailPrice: number;      // Selling price per day (e.g. ₹5.00)
  agencyPrice: number;      // Purchase cost per day (e.g. ₹3.60)
  fixedMonthlyPrice?: number; // Optional fixed monthly rate (e.g. ₹150)
  effectiveDate: string;
  status: 'active' | 'inactive';
}

export interface CustomerSubscriptionItem {
  id: string;
  newspaperId: string;
  newspaperName: string;
  newspaperNameHi: string;
  quantity: number;
  customPricePerDay?: number;
  startDate: string;
  endDate?: string;
  status: 'active' | 'suspended';
}

export interface DeliveryRoute {
  id: string;
  code: string;
  name: string;
  nameHi: string;
  locality: string;
  wardNumbers: string[];
  assignedDeliveryAgentId: string;
  assignedCollectionAgentId: string;
  customerCount: number;
}

export type DeliveryStatus = 'delivered' | 'missed' | 'suspended';

export interface DailyDeliveryRecord {
  id: string;
  date: string; // YYYY-MM-DD
  routeId: string;
  customerId: string;
  customerName: string;
  newspaperId: string;
  newspaperName: string;
  status: DeliveryStatus;
  loggedByAgentId: string;
  notes?: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  id: string;
  newspaperId: string;
  newspaperName: string;
  ratePerDay: number;
  daysBilled: number;
  quantity: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g., INV-2026-10-001
  agencyId: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  customerAddress: string;
  billingMonth: string; // YYYY-MM
  billDate: string;
  dueDate: string;
  billingPolicy: 'calendar_days' | 'actual_delivery' | 'fixed_monthly';
  items: InvoiceLineItem[];
  subtotal: number;
  previousBalance: number;
  adjustments: number; // e.g. holiday credits or discount
  totalPayable: number;
  amountPaid: number;
  remainingBalance: number;
  status: 'unpaid' | 'partial' | 'paid';
  generatedAt: string;
  approvedBy?: string;
}

export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'online_gateway';

export interface PaymentRecord {
  id: string;
  receiptNumber: string; // e.g. RCPT-2026-0812
  agencyId: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  collectedByAgentId: string;
  collectedByAgentName: string;
  invoiceId?: string;
  transactionRef?: string;
  notes?: string;
  isAdvance: boolean;
  handoverStatus: 'in_hand' | 'handed_over' | 'reconciled';
  createdAt: string;
}

export interface CustomerLedgerEntry {
  id: string;
  customerId: string;
  date: string;
  type: 'invoice' | 'payment' | 'adjustment';
  referenceId: string; // Invoice number or Receipt number
  description: string;
  descriptionHi: string;
  debit: number;   // Charges added
  credit: number;  // Payments made
  balance: number; // Running balance
}

export interface CashHandover {
  id: string;
  agentId: string;
  agentName: string;
  date: string;
  cashAmount: number;
  digitalAmount: number;
  totalCollected: number;
  receivedByManagerId: string;
  receivedByManagerName: string;
  status: 'pending' | 'verified' | 'disputed';
  notes?: string;
  timestamp: string;
}

export interface ExpenseRecord {
  id: string;
  agencyId: string;
  category: 'newspaper_purchase' | 'delivery_salary' | 'collection_commission' | 'fuel_vehicle' | 'rent' | 'electricity' | 'printing' | 'misc';
  title: string;
  titleHi: string;
  amount: number;
  date: string;
  recordedBy: string;
  notes?: string;
}

export interface MessageLog {
  id: string;
  customerId: string;
  customerName: string;
  mobile: string;
  messageType: 'bill_notice' | 'payment_reminder' | 'payment_receipt' | 'suspension_notice';
  channel: 'whatsapp' | 'sms';
  content: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  timestamp: string;
}

export interface SyncQueueItem {
  id: string;
  idempotencyKey: string;
  entityType: 'delivery' | 'payment' | 'customer';
  action: 'create' | 'update' | 'delete';
  payload: any;
  timestamp: string;
  status: 'pending' | 'synced' | 'failed';
  error?: string;
}
