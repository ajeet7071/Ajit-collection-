import React, { useState, useEffect } from 'react';
import { 
  X, 
  QrCode, 
  Smartphone, 
  CreditCard, 
  ShieldCheck, 
  CheckCircle2, 
  RefreshCw, 
  Edit3, 
  Check, 
  Copy, 
  Save 
} from 'lucide-react';
import { generateUpiPaymentUrl } from '../../services/paymentService';
import { Customer, Agency, Language } from '../../types';
import { translations } from '../../i18n/translations';
import { DynamicUpiQrCard } from './DynamicUpiQrCard';

interface UPIPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  amount: number;
  agency: Agency;
  onPaymentSuccess: (amount: number, method: 'upi' | 'online_gateway', txId: string) => void;
  onUpdateAgencyUpiId?: (newUpiId: string) => void;
  lang: Language;
}

export const UPIPaymentModal: React.FC<UPIPaymentModalProps> = ({
  isOpen,
  onClose,
  customer,
  amount,
  agency,
  onPaymentSuccess,
  onUpdateAgencyUpiId,
  lang,
}) => {
  const t = translations[lang];

  const [paymentTab, setPaymentTab] = useState<'upi_qr' | 'gateway_cards'>('upi_qr');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Editable UPI ID & note states
  const [editableUpiId, setEditableUpiId] = useState(agency.upiId || 'ajeet9660527071@upi');
  const [isEditingUpi, setIsEditingUpi] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [upiSavedToast, setUpiSavedToast] = useState(false);

  useEffect(() => {
    setEditableUpiId(agency.upiId || 'ajeet9660527071@upi');
  }, [agency.upiId]);

  if (!isOpen) return null;

  const upiUrl = generateUpiPaymentUrl(
    editableUpiId,
    agency.name,
    amount,
    `Newspaper Bill - ${customer.customerCode}`
  );

  const handleCopyUpiLink = () => {
    navigator.clipboard.writeText(upiUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSaveUpiId = () => {
    setIsEditingUpi(false);
    if (onUpdateAgencyUpiId) {
      onUpdateAgencyUpiId(editableUpiId.trim());
      setUpiSavedToast(true);
      setTimeout(() => setUpiSavedToast(false), 3000);
    }
  };

  const handleSimulatePayment = (method: 'upi' | 'online_gateway') => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      const txId = `TXN_${Date.now().toString().slice(-8)}`;
      setTimeout(() => {
        onPaymentSuccess(amount, method, txId);
        onClose();
      }, 1000);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-[92vw] sm:w-full max-w-md max-h-[85dvh] sm:max-h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-bold text-white">
              ₹
            </div>
            <div>
              <h3 className="text-base font-bold">डिजिटल ऑनलाइन भुगतान (Pay Online)</h3>
              <p className="text-xs text-blue-200">
                {customer.name} · बकाया राशि: ₹{amount}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-blue-200 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 text-xs font-semibold shrink-0">
          <button
            onClick={() => setPaymentTab('upi_qr')}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              paymentTab === 'upi_qr'
                ? 'border-blue-900 text-blue-900 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            UPI QR कोड (Google Pay / PhonePe / Paytm)
          </button>
          <button
            onClick={() => setPaymentTab('gateway_cards')}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              paymentTab === 'gateway_cards'
                ? 'border-blue-900 text-blue-900 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            कार्ड / नेटबैंकिंग
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 text-center overflow-y-auto flex-1 overscroll-contain">
          {isSuccess ? (
            <div className="py-8 space-y-3">
              <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto animate-bounce" />
              <h4 className="text-lg font-bold text-slate-900">भुगतान सफल! (Payment Successful)</h4>
              <p className="text-xs text-slate-500">
                ₹{amount} की रसीद बनाई जा रही है...
              </p>
            </div>
          ) : isProcessing ? (
            <div className="py-12 space-y-3">
              <RefreshCw className="w-12 h-12 text-blue-900 mx-auto animate-spin" />
              <h4 className="text-sm font-bold text-slate-800">बैंक एवं UPI सत्यापन जारी है...</h4>
              <p className="text-xs text-slate-500">कृपया बैक न करें (Verifying with Payment Gateway)</p>
            </div>
          ) : paymentTab === 'upi_qr' ? (
            <div className="space-y-4">
              
              {/* Editable UPI ID Box */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-left">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700">
                    एजेंसी UPI ID / स्कैनर लिंक (Editable):
                  </label>
                  {!isEditingUpi ? (
                    <button
                      onClick={() => setIsEditingUpi(true)}
                      className="text-[11px] text-blue-900 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>बदलें (Edit)</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleSaveUpiId}
                      className="text-[11px] text-emerald-700 font-bold hover:underline flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      <span>सुरक्षित करें</span>
                    </button>
                  )}
                </div>

                {isEditingUpi ? (
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      value={editableUpiId}
                      onChange={(e) => setEditableUpiId(e.target.value)}
                      placeholder="उदा. 9660527071@upi या name@okaxis"
                      className="flex-1 px-2.5 py-1.5 bg-white border border-blue-400 rounded-lg text-xs font-mono font-bold text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                    <button
                      onClick={handleSaveUpiId}
                      className="px-3 py-1.5 bg-blue-900 text-white text-xs font-semibold rounded-lg hover:bg-blue-800"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                    <span className="font-mono font-bold text-xs text-blue-900 truncate">
                      {editableUpiId}
                    </span>
                    <button
                      onClick={handleCopyUpiLink}
                      className="p-1 text-slate-500 hover:text-slate-800"
                      title="UPI लिंक कॉपी करें"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}

                {upiSavedToast && (
                  <div className="text-[10px] text-emerald-700 font-semibold mt-1">
                    ✓ नई UPI ID सफलतापूर्वक सहेज ली गई!
                  </div>
                )}
              </div>

              {/* Dynamic Live UPI QR Code Component */}
              <DynamicUpiQrCard
                upiId={editableUpiId}
                payeeName={agency.nameHi || agency.name}
                amount={amount}
                customerName={customer.name}
                customerCode={customer.customerCode}
                note={`Newspaper Bill ${customer.customerCode}`}
              />

              <div className="pt-1 flex flex-col gap-2">
                <button
                  onClick={() => handleSimulatePayment('upi')}
                  className="w-full h-11 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-2"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>सिम्युलेट करें: UPI पेमेंट प्राप्त हुआ (Confirm)</span>
                </button>

                <button
                  onClick={handleCopyUpiLink}
                  className="w-full py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copiedLink ? 'UPI लिंक कॉपी हो गया!' : 'सीधा UPI पेमेंट लिंक कॉपी करें'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-left">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">सुरक्षित पेमेंट गेटवे (Sandbox Mode):</span>
                  <div>डेबिट/क्रेडिट कार्ड एवं नेटबैंकिंग का परीक्षण मोड सक्रिय है।</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">कार्ड नंबर (Test Card)</label>
                <input
                  type="text"
                  readOnly
                  value="4111 2222 3333 4444"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">वैधता (MM/YY)</label>
                  <input
                    type="text"
                    readOnly
                    value="12/28"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CVV</label>
                  <input
                    type="text"
                    readOnly
                    value="123"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs text-slate-800"
                  />
                </div>
              </div>

              <button
                onClick={() => handleSimulatePayment('online_gateway')}
                className="w-full h-11 bg-blue-900 hover:bg-blue-800 text-white font-medium text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-2 mt-4"
              >
                <CreditCard className="w-4 h-4" />
                <span>₹{amount} का भुगतान करें (Authorize Gateway)</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
