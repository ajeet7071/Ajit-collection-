import React, { useState } from 'react';
import { 
  FileText, 
  IndianRupee, 
  Calendar, 
  PauseCircle, 
  Download, 
  Printer, 
  CreditCard, 
  Clock, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { 
  Customer, 
  Invoice, 
  PaymentRecord, 
  CustomerLedgerEntry, 
  Agency, 
  Language,
  UserProfile 
} from '../../types';
import { translations } from '../../i18n/translations';
import { triggerDirectPrintReceipt } from '../../services/printService';

interface CustomerPortalViewProps {
  currentUser: UserProfile;
  customer: Customer;
  invoices: Invoice[];
  payments: PaymentRecord[];
  ledger: CustomerLedgerEntry[];
  agency: Agency;
  lang: Language;
  onOpenInvoiceModal: (invoice: Invoice) => void;
  onOpenReceiptModal: (payment: PaymentRecord) => void;
  onPayOnline: (customer: Customer, amount: number) => void;
  onUpdatePause: (customer: Customer, startDate: string, endDate: string) => void;
}

export const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({
  currentUser,
  customer,
  invoices,
  payments,
  ledger,
  agency,
  lang,
  onOpenInvoiceModal,
  onOpenReceiptModal,
  onPayOnline,
  onUpdatePause,
}) => {
  const t = translations[lang];

  // Vacation Pause Request form
  const [pauseStart, setPauseStart] = useState('2026-10-25');
  const [pauseEnd, setPauseEnd] = useState('2026-10-28');
  const [complaintText, setComplaintText] = useState('');
  const [complaintSuccess, setComplaintSuccess] = useState(false);
  const [pauseSuccess, setPauseSuccess] = useState(false);

  if (!customer || !customer.id) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
        ग्राहक खाता लोड नहीं हुआ है। कृपया ग्राहक सूची से ग्राहक चुनें।
      </div>
    );
  }

  const customerInvoices = invoices.filter((i) => i.customerId === customer.id);
  const customerPayments = payments.filter((p) => p.customerId === customer.id);
  const customerLedger = ledger.filter((l) => l.customerId === customer.id);

  const handleSavePause = () => {
    onUpdatePause(customer, pauseStart, pauseEnd);
    setPauseSuccess(true);
    setTimeout(() => setPauseSuccess(false), 4000);
  };

  const handleSendComplaint = () => {
    if (!complaintText.trim()) return;
    setComplaintSuccess(true);
    setComplaintText('');
    setTimeout(() => setComplaintSuccess(false), 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Welcome & Account Summary Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-md">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-xs font-semibold text-blue-200 uppercase tracking-wider block">
              ग्राहक सेल्फ-सर्विस पोर्टल (Customer Portal)
            </span>
            <h1 className="text-2xl font-bold mt-1">{customer.name}</h1>
            <p className="text-xs text-blue-200 mt-0.5">
              ग्राहक कोड: {customer.customerCode} · मोबाइल: +91 {customer.mobile}
            </p>
            <p className="text-xs text-blue-300 mt-1">
              वितरण पता: {customer.address} (वार्ड {customer.wardNumber})
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-4 rounded-xl border border-white/20 text-center sm:text-right shrink-0">
            <span className="text-xs text-blue-200 block">वर्तमान बकाया राशि</span>
            <div className="text-3xl font-black font-mono mt-0.5">
              ₹{customer.currentBalance}
            </div>
            {customer.currentBalance > 0 && (
              <button
                onClick={() => onPayOnline(customer, customer.currentBalance)}
                className="mt-2 w-full px-4 py-1.5 text-xs font-bold text-blue-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition shadow-xs"
              >
                तुरंत ऑनलाइन भुगतान करें (Pay Now)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Subscribed Newspapers */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 mb-3">
          सक्रिय समाचार पत्र (Your Subscriptions)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {customer.subscriptions.map((sub) => (
            <div key={sub.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 text-sm">{sub.newspaperNameHi}</div>
                <div className="text-xs text-slate-500">प्रति दिन मात्रा: {sub.quantity} प्रति</div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                सक्रिय (Active)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Vacation Pause / Suspension Request Box */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <PauseCircle className="w-5 h-5 text-amber-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              छुट्टी पर अखबार रोकना (Vacation Pause Request)
            </h2>
            <p className="text-xs text-slate-500">
              यदि आप शहर से बाहर जा रहे हैं, तो दिनांक चुनकर हॉकर आपूर्ति रोक सकते हैं। रोके गए दिनों का बिल में कोई शुल्क नहीं लगेगा।
            </p>
          </div>
        </div>

        {pauseSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>अखबार रोकने का अनुरोध दर्ज हो गया है!</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">रोकने की प्रारंभ दिनांक:</label>
            <input
              type="date"
              value={pauseStart}
              onChange={(e) => setPauseStart(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">पुनः शुरू होने की दिनांक:</label>
            <input
              type="date"
              value={pauseEnd}
              onChange={(e) => setPauseEnd(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSavePause}
              className="w-full h-10 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs transition"
            >
              छुट्टी दर्ज करें (Confirm Pause)
            </button>
          </div>
        </div>
      </div>

      {/* Recent Invoices & Receipts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Invoices */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-900" />
            <span>आपके मासिक बिल (Invoices)</span>
          </h2>
          {customerInvoices.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">अभी तक कोई बिल जनरेट नहीं हुआ है।</p>
          ) : (
            <div className="divide-y divide-slate-100 space-y-2">
              {customerInvoices.map((inv) => (
                <div key={inv.id} className="pt-2 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{inv.invoiceNumber}</div>
                    <div className="text-slate-500">माह: {inv.billingMonth}</div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">₹{inv.totalPayable}</span>
                    <button
                      onClick={() => onOpenInvoiceModal(inv)}
                      className="p-1.5 text-blue-900 hover:bg-blue-50 rounded-lg transition"
                      title="बिल देखें"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payments & Receipts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-emerald-700" />
            <span>भुगतान इतिहास एवं रसीदें (Receipts)</span>
          </h2>
          {customerPayments.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">कोई भुगतान रिकॉर्ड नहीं मिला।</p>
          ) : (
            <div className="divide-y divide-slate-100 space-y-2">
              {customerPayments.map((p) => (
                <div key={p.id} className="pt-2 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{p.receiptNumber}</div>
                    <div className="text-slate-500">{p.paymentDate} · {p.paymentMethod.toUpperCase()}</div>
                  </div>
                  <div className="text-right flex items-center gap-1.5">
                    <span className="font-mono font-bold text-emerald-800 mr-1">₹{p.amount}</span>
                    <button
                      type="button"
                      onClick={() => triggerDirectPrintReceipt(p, agency, 'thermal')}
                      className="p-1.5 text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                      title="रसीद प्रिंट करें (Print Receipt)"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenReceiptModal(p)}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                      title="रसीद देखें (View)"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Service Complaint Box */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-slate-600" />
          <span>सेवा शिकायत या सुझाव (Feedback / Complaint)</span>
        </h2>
        {complaintSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>आपकी शिकायत एजेंसी प्रबंधक को भेज दी गई है। जल्द संपर्क किया जाएगा।</span>
          </div>
        )}
        <div className="space-y-3 text-xs">
          <textarea
            rows={3}
            value={complaintText}
            onChange={(e) => setComplaintText(e.target.value)}
            placeholder="उदा. आज सुबह अखबार देरी से मिला या कोई पृष्ठ फटा हुआ था..."
            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none"
          />
          <div className="flex justify-end">
            <button
              onClick={handleSendComplaint}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition"
            >
              शिकायत भेजें (Submit)
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
