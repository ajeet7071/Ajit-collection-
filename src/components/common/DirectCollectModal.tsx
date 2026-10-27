import React, { useState, useEffect } from 'react';
import { X, IndianRupee, Smartphone, Banknote, ShieldCheck, Check } from 'lucide-react';
import { Customer, PaymentMethod, UserProfile, Agency, Language } from '../../types';
import { translations } from '../../i18n/translations';
import { DynamicUpiQrCard } from './DynamicUpiQrCard';

interface DirectCollectModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  currentUser: UserProfile;
  agency: Agency;
  lang: Language;
  onRecordPayment: (
    customer: Customer,
    amount: number,
    method: PaymentMethod,
    notes?: string,
    txRef?: string
  ) => void;
}

export const DirectCollectModal: React.FC<DirectCollectModalProps> = ({
  isOpen,
  onClose,
  customer,
  currentUser,
  agency,
  lang,
  onRecordPayment,
}) => {
  const t = translations[lang];

  const [amount, setAmount] = useState(
    customer && customer.currentBalance > 0 ? customer.currentBalance.toString() : '150'
  );
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [txRef, setTxRef] = useState('');

  useEffect(() => {
    if (customer) {
      setAmount(customer.currentBalance > 0 ? customer.currentBalance.toString() : '150');
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(amount);
    if (!numAmt || numAmt <= 0) return;

    onRecordPayment(customer, numAmt, method, notes, txRef);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-[92vw] sm:w-full max-w-md max-h-[85dvh] sm:max-h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto">
        
        {/* Header */}
        <div className="bg-emerald-800 p-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-bold">
              <IndianRupee className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold">त्वरित वसूली / कलेक्शन (Quick Payment)</h3>
              <p className="text-xs text-emerald-200">
                {customer.name} ({customer.customerCode})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-emerald-200 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Balance Callout */}
        <div className="bg-emerald-50/70 p-3.5 border-b border-emerald-100 flex items-center justify-between text-xs shrink-0">
          <div>
            <span className="text-slate-500 block">वर्तमान शेष बकाया राशि:</span>
            <span className={`font-mono font-bold text-base ${customer.currentBalance > 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
              ₹{customer.currentBalance}
            </span>
          </div>
          <div className="text-right text-[11px] text-slate-500">
            <div>मोबाइल: +91 {customer.mobile}</div>
            <div>पता: {customer.address}</div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1 overscroll-contain">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              प्राप्त वसूली राशि (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 font-bold text-slate-400 text-sm">₹</span>
              <input
                type="number"
                step="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="उदा. 300"
                className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-lg font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              भुगतान माध्यम (Payment Method)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod('cash')}
                className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                  method === 'cash'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-700" />
                <div>
                  <div>नकद (Cash)</div>
                  <div className="text-[10px] text-slate-500 font-normal">हाथ में भौतिक कैश</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMethod('upi')}
                className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                  method === 'upi'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <Smartphone className="w-4 h-4 text-emerald-700" />
                <div>
                  <div>UPI (PhonePe / GPay)</div>
                  <div className="text-[10px] text-slate-500 font-normal">{agency.upiId}</div>
                </div>
              </button>
            </div>
          </div>

          {method === 'upi' && (
            <div className="space-y-3 pt-1">
              <DynamicUpiQrCard
                upiId={agency.upiId}
                payeeName={agency.nameHi || agency.name}
                amount={parseFloat(amount) || 0}
                customerName={customer.name}
                customerCode={customer.customerCode}
                note={`Newspaper Bill ${customer.customerCode}`}
              />

              <div>
                <label className="block font-semibold text-slate-700 mb-1">UPI संदर्भ / UTR नंबर (वैकल्पिक)</label>
                <input
                  type="text"
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                  placeholder="उदा. 42981029102"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white focus:outline-none"
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
              placeholder="उदा. अक्टूबर माह पूर्ण चुकता"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl font-medium text-slate-700 hover:bg-slate-50"
            >
              रद्द करें
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>रसीद काटें एवं जमा करें</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
