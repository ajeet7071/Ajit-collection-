import React, { useState, useMemo } from 'react';
import { 
  IndianRupee, 
  Plus, 
  Search, 
  Printer, 
  Share2, 
  CheckCircle2, 
  Briefcase, 
  X,
  CreditCard,
  Eye,
  AlertTriangle,
  Send,
  Phone,
  Copy,
  Check,
  MapPin,
  Clock,
  Sparkles,
  ArrowUpDown,
  Filter,
  MessageSquare,
  Trash2
} from 'lucide-react';
import { 
  PaymentRecord, 
  Customer, 
  Invoice, 
  PaymentMethod, 
  UserProfile, 
  Agency, 
  Language, 
  CashHandover,
  DeliveryRoute
} from '../../types';
import { translations } from '../../i18n/translations';
import { processCustomerPayment } from '../../services/paymentService';
import { triggerDirectPrintReceipt } from '../../services/printService';
import { 
  formatOverdueReminderMessage, 
  getWhatsAppClickUrl 
} from '../../services/whatsappService';
import { DynamicUpiQrCard } from '../common/DynamicUpiQrCard';
import { shareReceiptPdfOnWhatsApp } from '../../services/pdfReceiptService';
import { triggerSms, formatPaymentReceiptSms, formatDueBalanceReminderSms } from '../../services/smsService';

interface CollectionsViewProps {
  payments: PaymentRecord[];
  customers: Customer[];
  invoices: Invoice[];
  handovers: CashHandover[];
  currentUser: UserProfile;
  agency: Agency;
  lang: Language;
  routes?: DeliveryRoute[];
  onRecordPaymentSuccess: (res: ReturnType<typeof processCustomerPayment>) => void;
  onOpenReceiptModal: (payment: PaymentRecord) => void;
  onShareReceiptWhatsApp: (payment: PaymentRecord) => void;
  onSaveHandover: (handover: CashHandover) => void;
  onSendReminderWhatsApp?: (customer: Customer, message: string) => void;
  onDeletePayment?: (paymentId: string) => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  payments,
  customers,
  invoices,
  handovers,
  currentUser,
  agency,
  lang,
  routes = [],
  onRecordPaymentSuccess,
  onOpenReceiptModal,
  onShareReceiptWhatsApp,
  onSaveHandover,
  onSendReminderWhatsApp,
  onDeletePayment,
}) => {
  const t = translations[lang];

  // Active Main Tab: 'overdue' for overdue payment reminders, 'receipts' for collection history
  const [activeTab, setActiveTab] = useState<'overdue' | 'receipts'>('overdue');

  // Overdue Filter State
  const [overdueSearch, setOverdueSearch] = useState('');
  const [selectedRouteFilter, setSelectedRouteFilter] = useState('all');
  const [balanceSeverityFilter, setBalanceSeverityFilter] = useState<'all' | 'moderate' | 'high'>('all');
  const [overdueSortBy, setOverdueSortBy] = useState<'balance_desc' | 'balance_asc' | 'name'>('balance_desc');

  // WhatsApp Reminder Modal Preview State
  const [previewCustomer, setPreviewCustomer] = useState<Customer | null>(null);
  const [previewMessage, setPreviewMessage] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Receipts View State
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
  const [receiptMethodFilter, setReceiptMethodFilter] = useState('all');
  const [isNewReceiptOpen, setIsNewReceiptOpen] = useState(false);
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<PaymentRecord | null>(null);

  // New Payment Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [amountInput, setAmountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [txRef, setTxRef] = useState('');

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  // 1. Identify Overdue Customers (currentBalance > 0)
  const allOverdueCustomers = useMemo(() => {
    return customers.filter((c) => c.currentBalance > 0);
  }, [customers]);

  const totalOverdueAmount = useMemo(() => {
    return allOverdueCustomers.reduce((sum, c) => sum + c.currentBalance, 0);
  }, [allOverdueCustomers]);

  // Filtered Overdue Customers
  const filteredOverdueCustomers = useMemo(() => {
    return allOverdueCustomers
      .filter((c) => {
        const matchesSearch =
          c.name.toLowerCase().includes(overdueSearch.toLowerCase()) ||
          c.customerCode.toLowerCase().includes(overdueSearch.toLowerCase()) ||
          c.mobile.includes(overdueSearch) ||
          (c.address && c.address.toLowerCase().includes(overdueSearch.toLowerCase()));

        const matchesRoute =
          selectedRouteFilter === 'all' || c.routeId === selectedRouteFilter;

        let matchesSeverity = true;
        if (balanceSeverityFilter === 'moderate') {
          matchesSeverity = c.currentBalance >= 200;
        } else if (balanceSeverityFilter === 'high') {
          matchesSeverity = c.currentBalance >= 500;
        }

        return matchesSearch && matchesRoute && matchesSeverity;
      })
      .sort((a, b) => {
        if (overdueSortBy === 'balance_desc') {
          return b.currentBalance - a.currentBalance;
        }
        if (overdueSortBy === 'balance_asc') {
          return a.currentBalance - b.currentBalance;
        }
        return a.name.localeCompare(b.name);
      });
  }, [allOverdueCustomers, overdueSearch, selectedRouteFilter, balanceSeverityFilter, overdueSortBy]);

  // Receipts Filtering
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchesSearch =
        p.customerName.toLowerCase().includes(receiptSearchQuery.toLowerCase()) ||
        p.receiptNumber.toLowerCase().includes(receiptSearchQuery.toLowerCase()) ||
        p.collectedByAgentName.toLowerCase().includes(receiptSearchQuery.toLowerCase());
      const matchesMethod = receiptMethodFilter === 'all' || p.paymentMethod === receiptMethodFilter;

      return matchesSearch && matchesMethod;
    });
  }, [payments, receiptSearchQuery, receiptMethodFilter]);

  // Cash and Digital Summaries
  const totalCashCollected = useMemo(() => {
    return payments
      .filter((p) => p.paymentMethod === 'cash')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const totalDigitalCollected = useMemo(() => {
    return payments
      .filter((p) => p.paymentMethod !== 'cash')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  // Trigger New Payment Form (Optionally pre-filled for a specific customer)
  const handleOpenNewPayment = (cust?: Customer) => {
    const target = cust || customers[0];
    if (target) {
      setSelectedCustomerId(target.id);
      setAmountInput(Math.max(0, target.currentBalance).toString());
    } else {
      setSelectedCustomerId('');
      setAmountInput('300');
    }
    setPaymentMethod('cash');
    setNotes(cust ? `बकाया तकादा भुगतान (Code: ${cust.customerCode})` : '');
    setTxRef('');
    setIsNewReceiptOpen(true);
  };

  const handleCustomerChange = (custId: string) => {
    setSelectedCustomerId(custId);
    const cust = customers.find((c) => c.id === custId);
    if (cust && cust.currentBalance > 0) {
      setAmountInput(cust.currentBalance.toString());
    }
  };

  const handleSubmitPayment = () => {
    const amt = parseFloat(amountInput);
    if (!amt || amt <= 0 || !selectedCustomer) return;

    const result = processCustomerPayment(
      {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerMobile: selectedCustomer.mobile,
        amount: amt,
        paymentMethod,
        collectedByAgentId: currentUser.id,
        collectedByAgentName: currentUser.name,
        transactionRef: txRef || undefined,
        notes: notes || undefined,
        agencyUpiId: agency.upiId,
      },
      selectedCustomer,
      invoices
    );

    onRecordPaymentSuccess(result);
    setIsNewReceiptOpen(false);
    // Direct mobile printer trigger
    triggerDirectPrintReceipt(result.payment, agency, 'thermal');
    onOpenReceiptModal(result.payment);
  };

  // Open WhatsApp Reminder Preview with exact balance
  const handleOpenWhatsAppReminder = (cust: Customer) => {
    const unpaidInv = invoices.find((i) => i.customerId === cust.id && i.status !== 'paid');
    const msg = formatOverdueReminderMessage(cust, agency, unpaidInv, lang);

    if (onSendReminderWhatsApp) {
      onSendReminderWhatsApp(cust, msg);
    } else {
      setPreviewCustomer(cust);
      setPreviewMessage(msg);
      setIsCopied(false);
    }
  };

  const handleCopyMessage = () => {
    if (!previewMessage) return;
    navigator.clipboard.writeText(previewMessage);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleLaunchWhatsApp = () => {
    if (!previewCustomer || !previewMessage) return;
    const url = getWhatsAppClickUrl(previewCustomer.mobile, previewMessage);
    window.open(url, '_blank', 'noopener,noreferrer');
    setPreviewCustomer(null);
  };

  const handleRecordHandover = () => {
    const newHandover: CashHandover = {
      id: `hnd_${Date.now()}`,
      agentId: currentUser.id,
      agentName: currentUser.name,
      date: new Date().toISOString().split('T')[0],
      cashAmount: totalCashCollected,
      digitalAmount: totalDigitalCollected,
      totalCollected: totalCashCollected + totalDigitalCollected,
      receivedByManagerId: 'usr_manager_01',
      receivedByManagerName: agency.ownerName || 'Ajeet Kumar (Owner)',
      status: 'verified',
      notes: 'दैनिक कैश वसूली सुपुर्दगी एवं सत्यापन संपन्न',
      timestamp: new Date().toISOString(),
    };
    onSaveHandover(newHandover);
    setIsHandoverOpen(false);
  };

  return (
    <div className="space-y-5">
      
      {/* Top Banner & Mode Switcher */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900">{t.collections.title}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
              {allOverdueCustomers.length} बकायादार
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            बकायादार ग्राहकों की पहचान, सटीक बकाया राशि सहित WhatsApp तकादा एवं रसीद निर्गमन।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsHandoverOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition shadow-xs"
          >
            <Briefcase className="w-3.5 h-3.5 text-blue-900" />
            <span>{t.collections.cashHandover}</span>
          </button>

          <button
            onClick={() => handleOpenNewPayment()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-xl transition shadow-xs whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.collections.newReceiptBtn}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-rose-50 to-white p-4 rounded-xl border border-rose-200 shadow-xs">
          <div className="text-[11px] font-semibold text-rose-700 flex items-center justify-between">
            <span>कुल बकाया राशि (Total Outstanding)</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-800 mt-1">
            ₹{totalOverdueAmount.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-rose-600/80 mt-0.5">
            {allOverdueCustomers.length} ग्राहकों से वसूली बाकी
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500">नकद वसूली (Cash in Hand)</div>
          <div className="text-2xl font-bold font-mono text-emerald-800 mt-1">
            ₹{totalCashCollected.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">कलेक्टर के पास भौतिक कैश</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500">डिजिटल वसूली (UPI / Bank)</div>
          <div className="text-2xl font-bold font-mono text-blue-900 mt-1">
            ₹{totalDigitalCollected.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">सीधे बैंक खाते में जमा</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500">कुल कटी रसीदें</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {payments.length}
          </div>
          <div className="text-[11px] text-emerald-600 mt-0.5 font-medium">खाता बही में दर्ज</div>
        </div>
      </div>

      {/* Main Feature Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-2 pt-2 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('overdue')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition ${
            activeTab === 'overdue'
              ? 'border-rose-600 text-rose-700 bg-rose-50/50 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>बकायादार ग्राहक एवं WhatsApp तकादा (Overdue & Reminders)</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-rose-600 text-white font-mono font-bold">
            {allOverdueCustomers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('receipts')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition ${
            activeTab === 'receipts'
              ? 'border-blue-900 text-blue-900 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4 text-blue-900" />
          <span>प्राप्त रसीदें एवं इतिहास (Payment Receipts)</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-800 font-mono font-bold">
            {payments.length}
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: OVERDUE CUSTOMERS & PRE-FILLED WHATSAPP REMINDERS  */}
      {/* ========================================================= */}
      {activeTab === 'overdue' && (
        <div className="bg-white rounded-b-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-4">
          
          {/* Header & Filter Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 text-xs">
            
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={overdueSearch}
                onChange={(e) => setOverdueSearch(e.target.value)}
                placeholder="ग्राहक नाम, कोड (AJT-101), फोन नंबर या पते से खोजें..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Route Filter */}
              <select
                value={selectedRouteFilter}
                onChange={(e) => setSelectedRouteFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-700 text-xs focus:bg-white focus:outline-none font-medium"
              >
                <option value="all">सभी वितरण रूट (All Routes)</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nameHi || r.name} ({r.code})
                  </option>
                ))}
              </select>

              {/* Severity Filter */}
              <select
                value={balanceSeverityFilter}
                onChange={(e) => setBalanceSeverityFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-700 text-xs focus:bg-white focus:outline-none font-medium"
              >
                <option value="all">सभी बकाया राशि (&gt; ₹0)</option>
                <option value="moderate">₹200 से अधिक बकाया</option>
                <option value="high">₹500 से अधिक (गंभीर बकाया)</option>
              </select>

              {/* Sort By */}
              <select
                value={overdueSortBy}
                onChange={(e) => setOverdueSortBy(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-700 text-xs focus:bg-white focus:outline-none font-medium"
              >
                <option value="balance_desc">अधिकतम बकाया पहले (Highest First)</option>
                <option value="balance_asc">न्यूनतम बकाया पहले (Lowest First)</option>
                <option value="name">ग्राहक नाम (A to Z)</option>
              </select>

            </div>
          </div>

          {/* Quick Notice Info */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-900 font-medium">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>{filteredOverdueCustomers.length} बकायादार ग्राहक मिले।</strong> "WhatsApp तकादा" बटन दबाने पर ग्राहक का नाम, कोड, <strong>सटीक बकाया राशि</strong> और एजेंसी UPI QR विवरण स्वतः भर जाएगा।
              </span>
            </div>
            <div className="text-[11px] font-mono font-bold text-amber-950 bg-white px-2.5 py-1 rounded-lg border border-amber-300 shrink-0">
              चयनित बकाया: ₹{filteredOverdueCustomers.reduce((acc, c) => acc + c.currentBalance, 0).toLocaleString('en-IN')}
            </div>
          </div>

          {/* Overdue Customers List / Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="py-3 px-3 font-semibold">ग्राहक विवरण</th>
                  <th className="py-3 px-3 font-semibold">वितरण रूट एवं पता</th>
                  <th className="py-3 px-3 font-semibold">अंतिम बिल / स्थिति</th>
                  <th className="py-3 px-3 text-right font-semibold">सटीक बकाया राशि</th>
                  <th className="py-3 px-3 text-center font-semibold">तकादा एवं वसूली कार्य</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOverdueCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-bold text-slate-700">कोई बकायादार ग्राहक नहीं मिला!</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {allOverdueCustomers.length === 0 
                          ? 'बधाई! सभी ग्राहकों का बिल पूर्ण रूप से चुकता है।' 
                          : 'लागू किए गए फ़िल्टर के अनुसार कोई ग्राहक नहीं है। फ़िल्टर बदल कर देखें।'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOverdueCustomers.map((cust) => {
                    const custRoute = routes.find((r) => r.id === cust.routeId);
                    const unpaidInv = invoices.find((i) => i.customerId === cust.id && i.status !== 'paid');

                    return (
                      <tr key={cust.id} className="hover:bg-rose-50/30 transition">
                        
                        {/* Customer Info */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-300">
                              {cust.customerCode}
                            </span>
                            <div className="font-bold text-slate-900 text-sm">
                              {cust.name}
                            </div>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>+91 {cust.mobile}</span>
                          </div>
                        </td>

                        {/* Route & Locality */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-blue-900 shrink-0" />
                            <span>{custRoute ? custRoute.nameHi || custRoute.name : 'डिफ़ॉल्ट रूट'}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                            {cust.address || cust.villageCity || 'स्थानीय पता'}
                          </div>
                        </td>

                        {/* Bill Status */}
                        <td className="py-3 px-3">
                          {unpaidInv ? (
                            <div>
                              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                {unpaidInv.billingMonth} बिल
                              </span>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                देय तिथि: {unpaidInv.dueDate}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              गत माह बकाया शेष
                            </span>
                          )}
                        </td>

                        {/* EXACT OUTSTANDING BALANCE */}
                        <td className="py-3 px-3 text-right">
                          <div className="text-base font-bold font-mono text-rose-700">
                            ₹{cust.currentBalance.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            सटीक देय राशि
                          </div>
                        </td>

                        {/* Actions: Pre-filled WhatsApp, Collect Payment, Call */}
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center gap-2">
                            
                            {/* Pre-filled WhatsApp Reminder Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsAppReminder(cust)}
                              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                              title="सटीक बकाया राशि सहित WhatsApp संदेश भेजें"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp तकादा</span>
                            </button>

                            {/* SMS Reminder Button (Default Device Messaging App) */}
                            <button
                              type="button"
                              onClick={() => {
                                const msg = formatDueBalanceReminderSms(cust, agency, lang);
                                triggerSms(cust.mobile, msg);
                              }}
                              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                              title="डिफ़ॉल्ट मैसेज ऐप से SMS तकादा भेजें"
                            >
                              <Send className="w-3.5 h-3.5 text-indigo-700" />
                              <span>SMS तकादा</span>
                            </button>

                            {/* Collect Payment Now (Pre-filled receipt) */}
                            <button
                              type="button"
                              onClick={() => handleOpenNewPayment(cust)}
                              className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                              title="इस ग्राहक की रसीद काटें"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>रसीद काटें</span>
                            </button>

                            {/* Direct Phone Call */}
                            <a
                              href={`tel:+91${cust.mobile}`}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                              title="सीधा कॉल करें"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>

                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: PAYMENT RECEIPTS HISTORY & PRINT                   */}
      {/* ========================================================= */}
      {activeTab === 'receipts' && (
        <div className="bg-white rounded-b-2xl border border-slate-200 shadow-xs overflow-hidden">
          
          {/* Search & filter */}
          <div className="p-3 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={receiptSearchQuery}
                onChange={(e) => setReceiptSearchQuery(e.target.value)}
                placeholder="रसीद संख्या, ग्राहक या कलेक्टर नाम से खोजें..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={receiptMethodFilter}
                onChange={(e) => setReceiptMethodFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-700 focus:bg-white focus:outline-none font-medium"
              >
                <option value="all">सभी माध्यम (All)</option>
                <option value="cash">नकद (Cash)</option>
                <option value="upi">UPI डिजिटल</option>
                <option value="bank_transfer">बैंक ट्रांसफर</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                  <th className="py-2.5 px-3 font-semibold">{t.collections.receiptNumber}</th>
                  <th className="py-2.5 px-3 font-semibold">ग्राहक का नाम</th>
                  <th className="py-2.5 px-3 font-semibold">दिनांक</th>
                  <th className="py-2.5 px-3 font-semibold">माध्यम</th>
                  <th className="py-2.5 px-3 font-semibold">{t.collections.agentCollection}</th>
                  <th className="py-2.5 px-3 text-right font-semibold">राशि (₹)</th>
                  <th className="py-2.5 px-3 text-center font-semibold">रसीद कार्य</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                      कोई भुगतान रिकॉर्ड नहीं मिला। नई रसीद काटने के लिए ऊपर दिए बटन पर क्लिक करें।
                    </td>
                  </tr>
                ) : (
                  filteredPayments.slice().reverse().map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-900">
                        {pay.receiptNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{pay.customerName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">+91 {pay.customerMobile}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono">
                        {pay.paymentDate}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800 uppercase">
                          {pay.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {pay.collectedByAgentName}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800 text-sm">
                        ₹{pay.amount}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => triggerDirectPrintReceipt(pay, agency, 'thermal')}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition shadow-xs"
                            title="सीधा प्रिंट करें (Direct Thermal Print)"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>प्रिंट</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenReceiptModal(pay)}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                            title="रसीद देखें (View Receipt)"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>देखें</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onShareReceiptWhatsApp(pay)}
                            className="p-1 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                            title="WhatsApp संदेश भेजें"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => shareReceiptPdfOnWhatsApp(pay, agency)}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-2xs"
                            title="WhatsApp पर PDF रसीद फाइल भेजें"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>PDF</span>
                          </button>

                          {onDeletePayment && (
                            <button
                              type="button"
                              onClick={() => setPaymentToDelete(pay)}
                              className="p-1 text-rose-600 hover:text-white hover:bg-rose-600 rounded-lg transition border border-transparent hover:border-rose-600"
                              title="मानवीय भूल से दर्ज गलत रसीद हटाएं"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* WHATSAPP MESSAGE PREVIEW & DISPATCH MODAL                */}
      {/* ========================================================= */}
      {previewCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Header */}
            <div className="bg-emerald-800 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">WhatsApp बकाया तकादा संदेश</h3>
                  <p className="text-[11px] text-emerald-200">
                    {previewCustomer.name} ({previewCustomer.customerCode}) • +91 {previewCustomer.mobile}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewCustomer(null)}
                className="p-1 text-emerald-200 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-4 text-xs">
              
              {/* Highlight exact balance */}
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-rose-900 font-semibold">ग्राहक की सटीक बकाया राशि:</span>
                  <div className="text-xs text-rose-700">यह राशि संदेश में स्वतः जोड़ी गई है</div>
                </div>
                <div className="font-mono text-xl font-bold text-rose-800">
                  ₹{previewCustomer.currentBalance}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  संदेश पूर्वावलोकन एवं संपादन (Message Content):
                </label>
                <textarea
                  rows={8}
                  value={previewMessage}
                  onChange={(e) => setPreviewMessage(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-sans text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 leading-relaxed font-mono"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="flex-1 h-11 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                  <span>{isCopied ? 'कॉपी हो गया' : 'संदेश कॉपी करें'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleLaunchWhatsApp}
                  className="flex-1 h-11 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Send className="w-4 h-4" />
                  <span>WhatsApp पर भेजें (Open WhatsApp)</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* NEW PAYMENT RECEIPT MODAL                                 */}
      {/* ========================================================= */}
      {isNewReceiptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            
            <div className="bg-emerald-800 p-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">{t.collections.recordTitle}</h3>
                <p className="text-xs text-emerald-200">रसीद काटें एवं खाता बही में तुरंत जमा करें</p>
              </div>
              <button
                onClick={() => setIsNewReceiptOpen(false)}
                className="p-1 text-emerald-200 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t.collections.selectCustomer} *</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.customerCode}) - बकाया: ₹{c.currentBalance}
                    </option>
                  ))}
                </select>
                {selectedCustomer && (
                  <div className="text-[11px] text-slate-500 mt-1">
                    वर्तमान बकाया राशि: <span className="font-bold text-rose-700">₹{selectedCustomer.currentBalance}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t.collections.amountLabel} *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-bold text-slate-400 text-sm">₹</span>
                  <input
                    type="number"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder="300"
                    className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t.collections.methodLabel}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      paymentMethod === 'cash'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div>{t.collections.cash}</div>
                    <div className="text-[10px] text-slate-500 font-normal">कलेक्टर को भौतिक नकद</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      paymentMethod === 'upi'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div>{t.collections.upi}</div>
                    <div className="text-[10px] text-slate-500 font-normal">GPay / PhonePe / QR</div>
                  </button>
                </div>
              </div>

              {paymentMethod === 'upi' && (
                <div className="space-y-3 pt-1">
                  <DynamicUpiQrCard
                    upiId={agency.upiId}
                    payeeName={agency.nameHi || agency.name}
                    amount={parseFloat(amountInput) || 0}
                    customerName={selectedCustomer?.name}
                    customerCode={selectedCustomer?.customerCode}
                    note={`Newspaper Bill ${selectedCustomer?.customerCode || ''}`}
                  />

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">UPI संदर्भ संख्या (Txn UTR)</label>
                    <input
                      type="text"
                      value={txRef}
                      onChange={(e) => setTxRef(e.target.value)}
                      placeholder="उदा. 42890123990"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">टिप्पणी / विवरण</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="उदा. बकाया भुगतान"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewReceiptOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-medium text-slate-700 hover:bg-slate-50"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  onClick={handleSubmitPayment}
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xs"
                >
                  {t.collections.saveAndPrintReceipt}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CASH HANDOVER MODAL                                       */}
      {/* ========================================================= */}
      {isHandoverOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            
            <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">{t.collections.cashHandover}</h3>
                <p className="text-xs text-slate-400">दैनिक वसूली रोकड़ सत्यापन एवं सुपुर्दगी</p>
              </div>
              <button
                onClick={() => setIsHandoverOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">कलेक्शन एजेंट:</span>
                  <span className="font-bold text-slate-900">{currentUser.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">नकद राशि (Cash):</span>
                  <span className="font-mono font-bold text-emerald-800 text-sm">₹{totalCashCollected}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">डिजिटल राशि (UPI):</span>
                  <span className="font-mono font-bold text-blue-900 text-sm">₹{totalDigitalCollected}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                  <span>कुल वसूली योग:</span>
                  <span className="font-mono text-base">₹{totalCashCollected + totalDigitalCollected}</span>
                </div>
              </div>

              <p className="text-slate-600 leading-relaxed">
                मैनेजर / एजेंसी मालिक को रोकड़ सुपुर्द करते हुए भौतिक कैश एवं डिजिटल प्रविष्टियों का सत्यापन करें।
              </p>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsHandoverOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-medium text-slate-700"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  onClick={handleRecordHandover}
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-xl"
                >
                  {t.collections.handoverToManager}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* DELETE PAYMENT CONFIRMATION MODAL */}
      {paymentToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 max-w-md w-full overflow-hidden animate-in fade-in duration-150">
            <div className="bg-rose-700 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-200" />
                <h4 className="font-bold text-sm">भुगतान रसीद हटाएं (मानवीय भूल सुधार)</h4>
              </div>
              <button
                type="button"
                onClick={() => setPaymentToDelete(null)}
                className="text-rose-200 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-700 leading-relaxed">
                क्या आप मानवीय भूल से कटी इस रसीद को सिस्टम एवं खाता बही से हटाना चाहते हैं?
              </p>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">रसीद संख्या:</span>
                  <span className="font-mono font-bold text-blue-900">{paymentToDelete.receiptNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">ग्राहक का नाम:</span>
                  <span className="font-bold text-slate-800">{paymentToDelete.customerName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">दिनांक व माध्यम:</span>
                  <span className="text-slate-700 font-mono">{paymentToDelete.paymentDate} ({paymentToDelete.paymentMethod.toUpperCase()})</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-bold">
                  <span className="text-rose-800">रद्द होने वाली राशि:</span>
                  <span className="font-mono text-base text-rose-700">₹{paymentToDelete.amount}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                <p className="font-semibold mb-0.5">वित्तीय प्रभाव:</p>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  रसीद डिलीट होते ही ग्राहक का बकाया <strong>₹{paymentToDelete.amount} वापस जुड़ जाएगा</strong> और लेजर में रनिंग बैलेंस स्वतः री-कैलकुलेट हो जाएगा।
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentToDelete(null)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl font-medium text-slate-700 transition"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDeletePayment && paymentToDelete) {
                      onDeletePayment(paymentToDelete.id);
                      setPaymentToDelete(null);
                    }
                  }}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>हाँ, रसीद डिलीट करें</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
