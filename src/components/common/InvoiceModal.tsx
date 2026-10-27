import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Share2, 
  CheckCircle2, 
  Smartphone, 
  FileText, 
  Download, 
  RefreshCw,
  MessageSquare,
  Trash2
} from 'lucide-react';
import { Invoice, Agency, Language } from '../../types';
import { translations } from '../../i18n/translations';
import { shareInvoicePdfOnWhatsApp, downloadInvoicePdf } from '../../services/pdfReceiptService';
import { triggerSms, formatBillReminderSms } from '../../services/smsService';

interface InvoiceModalProps {
  invoice: Invoice | null;
  agency: Agency;
  onClose: () => void;
  lang: Language;
  onShareWhatsApp: (invoice: Invoice) => void;
  onDeleteInvoice?: (invoiceId: string) => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  invoice,
  agency,
  onClose,
  lang,
  onShareWhatsApp,
  onDeleteInvoice,
}) => {
  const t = translations[lang];

  // Print Format Mode: Default to 'thermal' as requested by user
  const [printFormat, setPrintFormat] = useState<'thermal' | 'a4'>('thermal');
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [pdfSuccessToast, setPdfSuccessToast] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  if (!invoice) return null;

  // Dynamic NPCI UPI URI for PhonePe / Google Pay / Paytm / BHIM
  const upiPayable = Math.max(0, invoice.remainingBalance > 0 ? invoice.remainingBalance : invoice.totalPayable);
  const upiId = agency.upiId || 'ajeet9660527071@upi';
  const payeeName = agency.name || 'Ajeet Newspaper Agency';
  const note = `Bill-${invoice.invoiceNumber}-${invoice.customerName.slice(0, 10)}`;
  const upiPaymentUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${upiPayable.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=2&ecc=M&data=${encodeURIComponent(upiPaymentUri)}`;

  const handlePrint = () => {
    if (printFormat === 'thermal') {
      document.body.classList.add('thermal-print-active');
    } else {
      document.body.classList.remove('thermal-print-active');
    }
    document.body.classList.add('printing-modal-active');

    window.focus();
    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.error('Print error:', err);
      } finally {
        setTimeout(() => {
          document.body.classList.remove('thermal-print-active');
          document.body.classList.remove('printing-modal-active');
        }, 1000);
      }
    }, 100);
  };

  const handleSharePdfWhatsApp = async () => {
    setIsSharingPdf(true);
    try {
      const res = await shareInvoicePdfOnWhatsApp(invoice, agency);
      if (res.mode === 'native_share') {
        setPdfSuccessToast(lang === 'hi' ? '✓ WhatsApp शेयर विंडो खुल गई है!' : '✓ WhatsApp share opened!');
      } else {
        setPdfSuccessToast(lang === 'hi' 
          ? '✓ PDF बिल डाउनलोड हो गया है और WhatsApp खुल गया है!' 
          : '✓ PDF bill downloaded & WhatsApp opened!');
      }
      setTimeout(() => setPdfSuccessToast(''), 4500);
    } catch (err) {
      console.error('Invoice PDF share error:', err);
    } finally {
      setIsSharingPdf(false);
    }
  };

  const handleDownloadPdf = () => {
    downloadInvoicePdf(invoice, agency);
    setPdfSuccessToast(lang === 'hi' ? '✓ PDF बिल फाइल डाउनलोड हो गई!' : '✓ PDF bill downloaded!');
    setTimeout(() => setPdfSuccessToast(''), 3500);
  };

  const handleSendBillSms = () => {
    if (!invoice) return;
    const msg = formatBillReminderSms(invoice.customerName, invoice, agency, lang);
    const ok = triggerSms(invoice.customerMobile, msg);
    if (ok) {
      setPdfSuccessToast(lang === 'hi' ? '✓ डिफ़ॉल्ट SMS ऐप खुल गई है!' : '✓ Device SMS app opened!');
      setTimeout(() => setPdfSuccessToast(''), 3500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className={`relative w-[94vw] sm:w-full ${printFormat === 'thermal' ? 'max-w-md' : 'max-w-2xl'} max-h-[85dvh] sm:max-h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col transition-all`}>
        
        {/* Delete Confirmation Overlay */}
        {isConfirmingDelete && (
          <div className="absolute inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl max-w-sm w-[90vw] sm:w-full max-h-[80dvh] overflow-y-auto overscroll-contain p-5 shadow-2xl border border-rose-200 text-center space-y-4 animate-in fade-in zoom-in-95 my-auto">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center shadow-inner">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-slate-900">
                  {lang === 'hi' ? 'क्या आप इस इनवॉइस को डिलीट करना चाहते हैं?' : 'Delete this invoice?'}
                </h3>
                <p className="text-xs text-slate-700 font-bold">
                  {invoice.customerName} - <span className="font-mono text-blue-900">{invoice.invoiceNumber}</span>
                </p>
                <div className="text-[11px] bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-rose-700 text-left space-y-1">
                  <div className="font-bold flex items-center justify-between">
                    <span>बिल राशि (Amount):</span>
                    <span className="font-mono font-black">₹{invoice.totalPayable}.00</span>
                  </div>
                  <div className="text-[10px] text-rose-600 leading-tight">
                    {lang === 'hi'
                      ? '• यह बिल इनवॉइस रिकॉर्ड एवं खाता बही (Ledger) से हमेशा के लिए हट जाएगा।'
                      : '• This invoice will be permanently removed from records & ledger.'}
                  </div>
                  <div className="text-[10px] text-rose-600 leading-tight">
                    {lang === 'hi'
                      ? '• ग्राहक का बकाया बैलेंस तदनुसार स्वतः अपडेट हो जाएगा।'
                      : '• Customer balance will be adjusted accordingly.'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="flex-1 py-2 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  {lang === 'hi' ? 'रद्द करें (Cancel)' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDeleteInvoice) {
                      onDeleteInvoice(invoice.id);
                    }
                    setIsConfirmingDelete(false);
                    onClose();
                  }}
                  className="flex-1 py-2 px-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{lang === 'hi' ? 'हाँ, डिलीट करें' : 'Yes, Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Top Action Bar (hidden in print) */}
        <div className="no-print bg-slate-100 px-4 sm:px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          
          {/* Format Selector Toggle */}
          <div className="inline-flex p-0.5 bg-slate-200 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setPrintFormat('thermal')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                printFormat === 'thermal'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>थर्मल (80mm)</span>
            </button>
            <button
              onClick={() => setPrintFormat('a4')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                printFormat === 'a4'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>A4 साइज</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* WhatsApp PDF Button */}
            <button
              type="button"
              disabled={isSharingPdf}
              onClick={handleSharePdfWhatsApp}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-lg transition shadow-xs cursor-pointer"
              title="WhatsApp पर PDF बिल फाइल भेजें"
            >
              {isSharingPdf ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Share2 className="w-3.5 h-3.5 text-white" />
              )}
              <span>WhatsApp PDF</span>
            </button>

            {/* Default Device SMS Button */}
            <button
              type="button"
              onClick={handleSendBillSms}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-indigo-900 bg-indigo-50 hover:bg-indigo-100 active:scale-98 border border-indigo-200 rounded-lg transition shadow-2xs cursor-pointer"
              title="डिफ़ॉल्ट मैसेजिंग ऐप से SMS बिल भेजें"
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-700" />
              <span>SMS बिल</span>
            </button>

            {/* Direct PDF Download Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition shadow-2xs"
              title="PDF बिल फाइल डाउनलोड करें"
            >
              <Download className="w-3.5 h-3.5 text-blue-900" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition shadow-xs ring-1 ring-blue-700/50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{printFormat === 'thermal' ? 'प्रिंट रसीद' : 'प्रिंट A4'}</span>
            </button>

            {/* Delete Invoice Button */}
            {onDeleteInvoice && (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 active:scale-98 border border-rose-200 rounded-lg transition shadow-2xs cursor-pointer"
                title="इस बिल को डिलीट करें"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>डिलीट</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Toast Notification */}
        {pdfSuccessToast && (
          <div className="no-print bg-emerald-50 px-4 py-2 border-b border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{pdfSuccessToast}</span>
            </div>
            <button
              onClick={() => setPdfSuccessToast('')}
              className="text-emerald-700 hover:text-emerald-900 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Scrollable Bill Content Area */}
        <div className="overflow-y-auto flex-1 overscroll-contain">
          {/* ------------------------------------------------------------- */}
          {/* VIEW A: THERMAL RECEIPT PRINTER FORMAT (58mm / 80mm POS Slip) */}
          {/* ------------------------------------------------------------- */}
          {printFormat === 'thermal' ? (
          <div className="thermal-sheet p-5 sm:p-6 text-slate-900 font-mono text-[11px] leading-tight space-y-3 bg-white">
            
            {/* Header */}
            <div className="text-center space-y-1">
              <div className="flex justify-center mb-1">
                <img 
                  src="/assets/aistudio/file_0000000043f482118d45f9a7391eadfe_4733c263.png" 
                  alt="Ajit collection" 
                  className="w-12 h-12 rounded-full object-cover border border-amber-300 shadow-2xs" 
                />
              </div>
              <div className="text-sm font-black uppercase tracking-tight text-slate-950 font-sans">
                {agency.nameHi || 'अजीत कलेक्शन'}
              </div>
              <div className="text-[10px] text-slate-600 font-bold">
                {agency.name || 'Ajit collection'}
              </div>
              <div className="text-[9px] text-slate-500">
                {agency.address}, {agency.city}
              </div>
              <div className="text-[10px] font-bold text-slate-800">
                📞 मो. {agency.mobile}
              </div>
            </div>

            <div className="border-b border-dashed border-slate-400 my-2" />

            {/* Bill Meta */}
            <div className="space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>बिल सं (Bill No):</span>
                <span className="font-bold">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>बिल माह:</span>
                <span className="font-bold">{invoice.billingMonth}</span>
              </div>
              <div className="flex justify-between">
                <span>दिनांक (Date):</span>
                <span>{invoice.billDate}</span>
              </div>
              <div className="flex justify-between font-bold text-rose-700">
                <span>अंतिम तिथि (Due Date):</span>
                <span>{invoice.dueDate}</span>
              </div>
            </div>

            <div className="border-b border-dashed border-slate-400 my-2" />

            {/* Customer Details */}
            <div className="space-y-0.5 text-[10px]">
              <div>
                <span className="text-slate-500">ग्राहक: </span>
                <strong className="text-slate-900 font-sans">{invoice.customerName}</strong>
              </div>
              <div>
                <span className="text-slate-500">पता: </span>
                <span>{invoice.customerAddress}</span>
              </div>
              <div>
                <span className="text-slate-500">मोबाइल: </span>
                <span>+91 {invoice.customerMobile}</span>
              </div>
            </div>

            <div className="border-b border-dashed border-slate-400 my-2" />

            {/* Items Table */}
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="border-b border-dashed border-slate-400 text-slate-600">
                  <th className="text-left pb-1 font-semibold">अखबार</th>
                  <th className="text-center pb-1 font-semibold">दिन</th>
                  <th className="text-right pb-1 font-semibold">दर</th>
                  <th className="text-right pb-1 font-semibold">योग (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dotted divide-slate-200">
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-1 font-sans">{item.newspaperName} (x{item.quantity})</td>
                    <td className="py-1 text-center">{item.daysBilled}</td>
                    <td className="py-1 text-right">₹{item.ratePerDay}</td>
                    <td className="py-1 text-right font-bold">₹{item.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-b border-dashed border-slate-400 my-2" />

            {/* Calculations Breakdown */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>चालू बिल राशि:</span>
                <span>₹{invoice.subtotal}.00</span>
              </div>
              <div className="flex justify-between">
                <span>पिछला बकाया:</span>
                <span>₹{invoice.previousBalance}.00</span>
              </div>
              {invoice.adjustments !== 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>छूट / समायोजन:</span>
                  <span>-₹{Math.abs(invoice.adjustments)}.00</span>
                </div>
              )}
              <div className="border-t border-dashed border-slate-400 pt-1 flex justify-between font-bold text-xs">
                <span>कुल देय राशि:</span>
                <span className="text-sm font-black">₹{invoice.totalPayable}.00</span>
              </div>
              {invoice.amountPaid > 0 && (
                <div className="flex justify-between text-emerald-800">
                  <span>जमा राशि (Paid):</span>
                  <span>₹{invoice.amountPaid}.00</span>
                </div>
              )}
              {invoice.remainingBalance > 0 && (
                <div className="flex justify-between font-bold text-rose-700">
                  <span>शेष बकाया (Due):</span>
                  <span>₹{invoice.remainingBalance}.00</span>
                </div>
              )}
            </div>

            <div className="border-b border-dashed border-slate-400 my-2" />

            {/* Real Dynamic PhonePe / Google Pay / Paytm QR Code for Thermal Slip */}
            <div className="text-center space-y-1 py-1.5 border-y border-dashed border-slate-400 my-2">
              <div className="text-[10px] font-black text-slate-950 uppercase tracking-tight">
                PhonePe / Google Pay / Paytm QR
              </div>
              <div className="w-28 h-28 mx-auto bg-white p-1 border-2 border-slate-900 rounded-lg flex items-center justify-center">
                <img
                  src={qrCodeImageUrl}
                  alt="UPI QR Code PhonePe Google Pay"
                  className="w-full h-full object-contain"
                  crossOrigin="anonymous"
                />
              </div>
              <div className="text-[11px] font-black text-slate-900 font-mono">
                देय राशि: ₹{upiPayable}.00
              </div>
              <div className="text-[9px] font-bold text-slate-700">
                PhonePe, Google Pay या Paytm से स्कैन कर भुगतान करें
              </div>
              <div className="text-[8px] font-mono text-slate-600">
                UPI ID: {upiId}
              </div>
            </div>

            <div className="border-b border-dashed border-slate-400 my-2" />

            {/* Footer */}
            <div className="text-center text-[9px] text-slate-500 space-y-0.5">
              <div>अजीत कलेक्शन ऐप द्वारा संचालित</div>
              <div>धन्यवाद! आपका दिन शुभ हो!</div>
              <div className="text-[8px] pt-1">--------------------------------</div>
            </div>

          </div>
        ) : (
          /* ------------------------------------------------------------- */
          /* VIEW B: STANDARD A4 INVOICE SHEET                             */
          /* ------------------------------------------------------------- */
          <div className="p-6 sm:p-8 space-y-6 text-slate-900 print:p-0">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <img 
                    src="/assets/aistudio/file_0000000043f482118d45f9a7391eadfe_4733c263.png" 
                    alt="Ajit collection" 
                    className="w-14 h-14 rounded-full object-cover border-2 border-amber-300 shadow-xs shrink-0" 
                  />
                  <div>
                    <div className="text-2xl font-black text-blue-950 tracking-tight">
                      {agency.nameHi || 'अजीत कलेक्शन'}
                    </div>
                    <div className="text-sm font-bold text-slate-700">
                      {agency.name || 'Ajit collection'}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 max-w-xs">
                      {agency.address}, {agency.city}, {agency.state} - {agency.pincode}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  फोन / WhatsApp: {agency.mobile}
                </p>
                {agency.gstin && (
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    GSTIN: {agency.gstin}
                  </p>
                )}
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="inline-block px-2.5 py-1 text-xs font-bold text-blue-900 bg-blue-50 border border-blue-200 rounded-md">
                  मासिक समाचार पत्र बिल (INVOICE)
                </span>
                <div className="text-sm font-mono font-bold text-slate-800 mt-2">
                  {invoice.invoiceNumber}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  बिल माह: <span className="font-semibold text-slate-800">{invoice.billingMonth}</span>
                </div>
                <div className="text-xs text-slate-500">
                  बिल दिनांक: {invoice.billDate}
                </div>
                <div className="text-xs text-rose-600 font-semibold mt-0.5">
                  अंतिम भुगतान तिथि: {invoice.dueDate}
                </div>
              </div>
            </div>

            {/* Customer Info Card */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                बिल प्रेषित (Billed To):
              </span>
              <div className="text-sm font-bold text-slate-900">{invoice.customerName}</div>
              <div className="text-slate-600 mt-0.5">{invoice.customerAddress}</div>
              <div className="text-slate-600 mt-0.5">मोबाइल: +91 {invoice.customerMobile}</div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-700 bg-slate-50/50">
                    <th className="py-2.5 px-3 font-semibold">क्र.सं.</th>
                    <th className="py-2.5 px-3 font-semibold">अखबार का नाम (Newspaper)</th>
                    <th className="py-2.5 px-3 text-right font-semibold">दर / दिन</th>
                    <th className="py-2.5 px-3 text-center font-semibold">दिन</th>
                    <th className="py-2.5 px-3 text-center font-semibold">मात्रा</th>
                    <th className="py-2.5 px-3 text-right font-semibold">कुल राशि (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {invoice.items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/30">
                      <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{item.newspaperName}</td>
                      <td className="py-2.5 px-3 text-right text-slate-700 font-mono">₹{item.ratePerDay.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-center text-slate-700 font-mono">{item.daysBilled}</td>
                      <td className="py-2.5 px-3 text-center text-slate-700 font-mono">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">₹{item.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals & UPI Pay box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              
              {/* Authentic PhonePe / Google Pay / Paytm UPI QR Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 rounded-xl p-3.5 border-2 border-blue-200 text-xs flex items-center gap-3">
                <div className="w-24 h-24 bg-white p-1 rounded-xl border-2 border-blue-900 shrink-0 flex items-center justify-center shadow-xs">
                  <img
                    src={qrCodeImageUrl}
                    alt="PhonePe Google Pay UPI QR"
                    className="w-full h-full object-contain"
                    crossOrigin="anonymous"
                  />
                </div>
                <div className="space-y-1">
                  <span className="font-black text-blue-950 text-xs block">UPI QR कोड (PhonePe / Google Pay)</span>
                  
                  {/* Brand Badges */}
                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                    <span className="px-1.5 py-0.5 bg-[#5f259f]/10 text-[#5f259f] font-bold text-[9px] rounded border border-[#5f259f]/30">PhonePe</span>
                    <span className="px-1.5 py-0.5 bg-[#4285f4]/10 text-[#1a73e8] font-bold text-[9px] rounded border border-[#4285f4]/30">Google Pay</span>
                    <span className="px-1.5 py-0.5 bg-[#002e6e]/10 text-[#002e6e] font-bold text-[9px] rounded border border-[#002e6e]/30">Paytm</span>
                    <span className="px-1.5 py-0.5 bg-[#00824b]/10 text-[#00824b] font-bold text-[9px] rounded border border-[#00824b]/30">BHIM</span>
                  </div>

                  <div className="text-xs font-bold text-slate-800 pt-0.5">
                    सटीक देय राशि: <span className="font-mono text-blue-900 font-black">₹{upiPayable}.00</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-blue-900 block truncate max-w-[180px]">
                    UPI: {upiId}
                  </span>
                  <span className="text-[9px] text-slate-500 block leading-tight">
                    PhonePe, Google Pay या Paytm से स्कैन कर सीधा भुगतान करें
                  </span>
                </div>
              </div>

              {/* Calculations Breakdown */}
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between py-1">
                  <span>चालू माह बिल राशि (Subtotal):</span>
                  <span className="font-mono font-semibold text-slate-900">₹{invoice.subtotal}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>पिछला बकाया (Previous Balance):</span>
                  <span className="font-mono font-semibold text-slate-900">₹{invoice.previousBalance}</span>
                </div>
                {invoice.adjustments !== 0 && (
                  <div className="flex justify-between py-1 text-emerald-700">
                    <span>छूट / समायोजन:</span>
                    <span className="font-mono font-semibold">-₹{Math.abs(invoice.adjustments)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-t border-slate-300 text-sm font-bold text-slate-900">
                  <span>कुल देय राशि (Total Payable):</span>
                  <span className="font-mono text-blue-900 text-base">₹{invoice.totalPayable}</span>
                </div>
                {invoice.amountPaid > 0 && (
                  <div className="flex justify-between py-1 text-emerald-700">
                    <span>जमा राशि (Paid):</span>
                    <span className="font-mono font-semibold">₹{invoice.amountPaid}</span>
                  </div>
                )}
                {invoice.remainingBalance > 0 ? (
                  <div className="flex justify-between py-1 font-bold text-rose-700">
                    <span>शेष बकाया (Remaining Due):</span>
                    <span className="font-mono">₹{invoice.remainingBalance}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-emerald-700 font-semibold justify-end pt-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>पूर्ण चुकता (Paid)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer & Signature */}
            <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
              <div>
                <p>• कृपया प्रत्येक माह की 10 तारीख तक बिल का भुगतान अवश्य करें।</p>
                <p>• असुविधा से बचने के लिए छुट्टी की सूचना 1 दिन पूर्व दें।</p>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-800">{agency.ownerName}</div>
                <div className="text-[11px]">अधिकृत हस्ताक्षर (Authorized Signatory)</div>
                <div className="text-[10px] text-slate-400 mt-1">अजीत कलेक्शन ऐप सिस्टम द्वारा जनरेटेड</div>
              </div>
            </div>

          </div>
        )}
        </div>

        {/* Modal Bottom Action Footer (hidden in print) */}
        <div className="no-print bg-slate-50 px-4 sm:px-5 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* WhatsApp Text Message */}
            <button
              type="button"
              onClick={() => onShareWhatsApp(invoice)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 active:scale-98 border border-emerald-300 rounded-lg transition shadow-2xs cursor-pointer"
              title="WhatsApp पर बिल का संदेश भेजें"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp संदेश</span>
            </button>

            {/* WhatsApp PDF Button */}
            <button
              type="button"
              disabled={isSharingPdf}
              onClick={handleSharePdfWhatsApp}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-lg transition shadow-xs cursor-pointer"
              title="WhatsApp पर PDF बिल फाइल भेजें"
            >
              {isSharingPdf ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Share2 className="w-3.5 h-3.5 text-white" />
              )}
              <span>WhatsApp PDF</span>
            </button>

            {/* Default Device SMS Button */}
            <button
              type="button"
              onClick={handleSendBillSms}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-indigo-900 bg-indigo-50 hover:bg-indigo-100 active:scale-98 border border-indigo-200 rounded-lg transition shadow-2xs cursor-pointer"
              title="डिफ़ॉल्ट मैसेजिंग ऐप से SMS बिल भेजें"
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-700" />
              <span>SMS बिल</span>
            </button>

            {/* Direct PDF Download Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition shadow-2xs cursor-pointer"
              title="PDF बिल फाइल डाउनलोड करें"
            >
              <Download className="w-3.5 h-3.5 text-blue-900" />
              <span>PDF डाउनलोड</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition shadow-xs ring-1 ring-blue-700/50 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{printFormat === 'thermal' ? 'प्रिंट रसीद' : 'प्रिंट A4'}</span>
            </button>

            {/* Delete Invoice Button */}
            {onDeleteInvoice && (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 active:scale-98 border border-rose-300 rounded-lg transition shadow-2xs cursor-pointer"
                title="इस बिल को डिलीट करें"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>बिल डिलीट करें</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-lg transition cursor-pointer"
          >
            बंद करें
          </button>
        </div>

      </div>
    </div>
  );
};
