import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  IndianRupee,
  Smartphone,
  Banknote,
  Check,
  Printer,
  Bluetooth,
  Eye
} from 'lucide-react';
import { Customer, PaymentMethod, PaymentRecord, UserProfile, Agency, Language } from '../../types';
import { translations } from '../../i18n/translations';
import { DynamicUpiQrCard } from './DynamicUpiQrCard';
import {
  buildReceiptThermalSnippet,
  triggerDirectPrintReceipt,
  triggerBluetoothThermalPrint
} from '../../services/printService';

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
  const _t = translations[lang];

  const [amount, setAmount] = useState(
    customer && customer.currentBalance > 0 ? customer.currentBalance.toString() : '150'
  );
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [txRef, setTxRef] = useState('');
  const [isThermalPreviewOpen, setIsThermalPreviewOpen] = useState(false);

  useEffect(() => {
    if (customer) {
      setAmount(customer.currentBalance > 0 ? customer.currentBalance.toString() : '150');
      setIsThermalPreviewOpen(false);
    }
  }, [customer, isOpen]);

  const draftPaymentRecord: PaymentRecord | null = useMemo(() => {
    if (!customer) return null;
    const parsedAmt = Math.max(0, parseFloat(amount) || 0);
    const remainingAfterPay = Math.max(0, (customer.currentBalance || 0) - parsedAmt);
    const summaryNote = [
      notes || 'त्वरित वसूली (Quick Payment)',
      `पूर्व बकाया: ₹${customer.currentBalance || 0} | शेष बकाया: ₹${remainingAfterPay}`,
    ]
      .filter(Boolean)
      .join(' • ');

    return {
      id: `pay_preview_${Date.now()}`,
      agencyId: agency.id,
      receiptNumber: `RCP-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      customerId: customer.id,
      customerName: customer.name,
      customerMobile: customer.mobile,
      amount: parsedAmt,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: method,
      transactionRef: txRef || undefined,
      isAdvance: parsedAmt > (customer.currentBalance || 0),
      collectedByAgentId: currentUser.id,
      collectedByAgentName: currentUser.name,
      handoverStatus: 'in_hand',
      notes: summaryNote,
      createdAt: new Date().toISOString(),
    };
  }, [customer, amount, method, notes, txRef, currentUser, agency.id]);

  if (!isOpen || !customer) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(amount);
    if (!numAmt || numAmt <= 0) return;

    onRecordPayment(customer, numAmt, method, notes, txRef);
    onClose();
  };

  const handleRecordAndThermalPrint = () => {
    const numAmt = parseFloat(amount);
    if (!numAmt || numAmt <= 0 || !draftPaymentRecord) return;

    onRecordPayment(customer, numAmt, method, notes, txRef);
    triggerDirectPrintReceipt(draftPaymentRecord, agency, 'thermal');
    setIsThermalPreviewOpen(false);
    onClose();
  };

  const handleRecordAndBluetoothPrint = () => {
    const numAmt = parseFloat(amount);
    if (!numAmt || numAmt <= 0 || !draftPaymentRecord) return;

    onRecordPayment(customer, numAmt, method, notes, txRef);
    triggerBluetoothThermalPrint(draftPaymentRecord, agency);
    setIsThermalPreviewOpen(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-[96vw] sm:w-full max-w-xl max-h-[92dvh] sm:max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto">
        
        {/* Header */}
        <div className="bg-emerald-800 px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-bold">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">त्वरित वसूली / कलेक्शन (Quick Payment)</h3>
              <p className="text-xs text-emerald-200">
                {customer.name} ({customer.customerCode})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Balance Callout */}
        <div className="bg-emerald-50/70 px-5 py-3.5 border-b border-emerald-100 flex items-center justify-between text-xs shrink-0">
          <div>
            <span className="text-slate-500 block">वर्तमान शेष बकाया राशि:</span>
            <span className={`font-mono font-bold text-lg ${customer.currentBalance > 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
              ₹{customer.currentBalance}
            </span>
          </div>
          <div className="text-right text-xs text-slate-600 space-y-0.5">
            <div className="font-medium">मोबाइल: +91 {customer.mobile}</div>
            <div>पता: {customer.address}</div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm overflow-y-auto flex-1 overscroll-contain">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  प्राप्त वसूली राशि (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-bold text-slate-400 text-base">₹</span>
                  <input
                    type="number"
                    step="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="उदा. 300"
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-lg font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">टिप्पणी / विवरण</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="उदा. अक्टूबर माह पूर्ण चुकता"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                भुगतान माध्यम (Payment Method)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMethod('cash')}
                  className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                    method === 'cash'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/70'
                  }`}
                >
                  <Banknote className="w-5 h-5 text-emerald-700 shrink-0" />
                  <div>
                    <div className="text-xs sm:text-sm">नकद (Cash)</div>
                    <div className="text-[11px] text-slate-500 font-normal">हाथ में भौतिक कैश</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('upi')}
                  className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                    method === 'upi'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/70'
                  }`}
                >
                  <Smartphone className="w-5 h-5 text-emerald-700 shrink-0" />
                  <div>
                    <div className="text-xs sm:text-sm">UPI (PhonePe / GPay)</div>
                    <div className="text-[11px] text-slate-500 font-normal truncate max-w-[160px]">{agency.upiId}</div>
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sticky Footer Action Bar */}
          <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsThermalPreviewOpen(true)}
              disabled={!parseFloat(amount) || parseFloat(amount) <= 0}
              className="h-11 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 border border-slate-800 text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-40 whitespace-nowrap shadow-2xs"
            >
              <Eye className="w-4 h-4 text-teal-400 shrink-0" />
              <span>सारांश शीट देखें (Preview)</span>
            </button>

            <div className="grid grid-cols-[1fr_2fr] sm:flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="h-11 px-4 border border-slate-300 bg-white hover:bg-slate-100 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 inline-flex items-center justify-center transition cursor-pointer whitespace-nowrap"
              >
                रद्द करें
              </button>
              <button
                type="submit"
                className="h-11 px-5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm inline-flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap"
              >
                <Check className="w-4 h-4 shrink-0" />
                <span>रसीद काटें एवं जमा करें</span>
              </button>
            </div>
          </div>
        </form>

      </div>

      {/* Quick Payment Thermal Receipt / Summary Preview Modal */}
      {isThermalPreviewOpen && draftPaymentRecord && (
        <div className="fixed inset-0 z-60 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Printer className="w-4 h-4 text-teal-400" />
                <div>
                  <h3 className="text-sm font-bold">सारांश शीट एवं रसीद पूर्वावलोकन (Preview)</h3>
                  <p className="text-[11px] text-slate-300">
                    त्वरित वसूली (Quick Payment) • 58mm / 80mm थर्मल प्रिंटर
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsThermalPreviewOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thermal Receipt Paper Preview */}
            <div className="p-5 bg-slate-100 overflow-y-auto flex-1 flex justify-center">
              <div
                className="bg-white shadow-md border border-slate-300 p-2.5 rounded-xs"
                dangerouslySetInnerHTML={{
                  __html: buildReceiptThermalSnippet(draftPaymentRecord, agency),
                }}
              />
            </div>

            {/* Modal Footer Actions */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleRecordAndBluetoothPrint}
                className="h-10 sm:h-11 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap"
              >
                <Bluetooth className="w-4 h-4 text-blue-700 shrink-0" />
                <span>Bluetooth POS (RawBT)</span>
              </button>

              <div className="grid grid-cols-[1fr_2fr] sm:flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsThermalPreviewOpen(false)}
                  className="h-10 sm:h-11 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold inline-flex items-center justify-center transition cursor-pointer whitespace-nowrap"
                >
                  बंद करें
                </button>
                <button
                  type="button"
                  onClick={handleRecordAndThermalPrint}
                  className="h-10 sm:h-11 px-5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-bold shadow-sm inline-flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap"
                >
                  <Printer className="w-4 h-4 shrink-0" />
                  <span>थर्मल प्रिंट करें</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

