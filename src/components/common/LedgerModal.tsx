import React, { useState } from 'react';
import { X, FileText, Printer, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Customer, CustomerLedgerEntry, Language } from '../../types';
import { translations } from '../../i18n/translations';

interface LedgerModalProps {
  customer: Customer | null;
  ledger: CustomerLedgerEntry[];
  onClose: () => void;
  lang: Language;
  onDeletePaymentEntry?: (entryId: string, customerId: string) => void;
}

export const LedgerModal: React.FC<LedgerModalProps> = ({
  customer,
  ledger,
  onClose,
  lang,
  onDeletePaymentEntry,
}) => {
  const [entryToDelete, setEntryToDelete] = useState<CustomerLedgerEntry | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  if (!customer) return null;
  const t = translations[lang];

  const customerLedgerEntries = ledger.filter((l) => l.customerId === customer.id);

  const handlePrint = () => {
    window.print();
  };

  const handleConfirmDelete = () => {
    if (!entryToDelete || !onDeletePaymentEntry) return;
    const refId = entryToDelete.referenceId;
    const amount = entryToDelete.credit;
    onDeletePaymentEntry(entryToDelete.id, customer.id);
    setEntryToDelete(null);
    setFeedbackMessage(`रसीद सं. ${refId} (₹${amount}) की प्रविष्टि हटा दी गई और बकाया राशि समायोजित कर दी गई।`);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-[94vw] sm:w-full max-w-3xl max-h-[85dvh] sm:max-h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col">
        
        {/* Header */}
        <div className="no-print bg-slate-900 p-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-sm font-bold">ग्राहक खाता बही (Customer Account Ledger)</h3>
              <p className="text-[11px] text-slate-400">
                {customer.name} ({customer.customerCode}) · फोन: +91 {customer.mobile}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-white/10 hover:bg-white/20 rounded-lg transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>प्रिंट</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback message banner */}
        {feedbackMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-3 px-4 flex items-center gap-2 text-xs text-emerald-800 font-medium shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Balance Callout */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs shrink-0">
          <div>
            <span className="text-slate-500 block">पता व वार्ड:</span>
            <span className="font-semibold text-slate-800">{customer.address} (वार्ड {customer.wardNumber})</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 block">वर्तमान शेष देय राशि:</span>
            <span className={`font-mono font-bold text-base ${customer.currentBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              ₹{customer.currentBalance}
            </span>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="p-3 sm:p-4 overflow-auto flex-1 overscroll-contain">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 bg-slate-50/50">
                <th className="py-2.5 px-3 font-semibold">दिनांक</th>
                <th className="py-2.5 px-3 font-semibold">संदर्भ संख्या</th>
                <th className="py-2.5 px-3 font-semibold">विवरण (Description)</th>
                <th className="py-2.5 px-3 text-right font-semibold">नामे (Debit ₹)</th>
                <th className="py-2.5 px-3 text-right font-semibold">जमा (Credit ₹)</th>
                <th className="py-2.5 px-3 text-right font-semibold">बाकी (Balance ₹)</th>
                <th className="py-2.5 px-3 text-center font-semibold no-print">कार्य</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customerLedgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    इस ग्राहक के लिए अभी कोई लेजर प्रविष्टि नहीं है।
                  </td>
                </tr>
              ) : (
                customerLedgerEntries.map((entry) => {
                  const isPaymentEntry = entry.type === 'payment' || entry.credit > 0;
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">{entry.date}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-blue-900">{entry.referenceId}</td>
                      <td className="py-2.5 px-3 text-slate-800">{entry.descriptionHi || entry.description}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-semibold whitespace-nowrap">
                        {entry.debit > 0 ? `+₹${entry.debit}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-800 font-bold whitespace-nowrap">
                        {entry.credit > 0 ? `-₹${entry.credit}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        ₹{entry.balance}
                      </td>
                      <td className="py-2.5 px-3 text-center no-print whitespace-nowrap">
                        {isPaymentEntry && onDeletePaymentEntry ? (
                          <button
                            type="button"
                            onClick={() => setEntryToDelete(entry)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-lg transition border border-rose-200 hover:border-rose-600"
                            title="मानवीय भूल से दर्ज गलत पेमेंट प्रविष्टि हटाएं"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>डिलीट</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 text-[11px] select-none">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Confirmation Modal for Deleting Mistaken Payment Entry */}
      {entryToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 max-w-md w-[92vw] sm:w-full max-h-[85dvh] overflow-hidden my-auto flex flex-col animate-in fade-in duration-150">
            
            {/* Header */}
            <div className="bg-rose-700 p-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-200" />
                <h4 className="font-bold text-sm">गलत पेमेंट एंट्री हटाएं (मानवीय भूल सुधार)</h4>
              </div>
              <button
                type="button"
                onClick={() => setEntryToDelete(null)}
                className="text-rose-200 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1 overscroll-contain">
              <p className="text-slate-700 leading-relaxed">
                क्या आप वाकई इस पेमेंट प्रविष्टि को खाता बही से हटाना चाहते हैं? कई बार मानवीय भूल से गलत एंट्री हो जाती है, जिसे हटाने पर हिसाब स्वतः संतुलित हो जाएगा।
              </p>

              {/* Entry Details Card */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">रसीद / संदर्भ संख्या:</span>
                  <span className="font-mono font-bold text-blue-900">{entryToDelete.referenceId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">प्रविष्टि दिनांक:</span>
                  <span className="font-mono text-slate-700">{entryToDelete.date}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">विवरण:</span>
                  <span className="text-slate-800 text-right max-w-[200px] truncate">{entryToDelete.descriptionHi || entryToDelete.description}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-bold">
                  <span className="text-rose-800">हटाई जाने वाली जमा राशि:</span>
                  <span className="font-mono text-base text-rose-700">₹{entryToDelete.credit}</span>
                </div>
              </div>

              {/* Impact Warning */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                <p className="font-semibold mb-0.5">वित्तीय प्रभाव:</p>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  प्रविष्टि डिलीट होते ही ग्राहक का बकाया <strong>₹{entryToDelete.credit} बढ़ जाएगा</strong> और खाता बही का शेष बैलेंस (Running Balance) नए सिरे से स्वतः पुनः संतुलित हो जाएगा।
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEntryToDelete(null)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl font-medium text-slate-700 transition"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>हाँ, प्रविष्टि डिलीट करें</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
