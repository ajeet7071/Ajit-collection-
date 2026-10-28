/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  Share2, 
  Smartphone, 
  FileText, 
  Download, 
  CheckCircle2, 
  RefreshCw,
  MessageSquare,
  Bluetooth,
  Sliders
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PaymentRecord, Agency, Language } from '../../types';
import { translations } from '../../i18n/translations';
import {
  triggerDirectPrintReceipt,
  triggerBluetoothThermalPrint,
  triggerBluetoothAsciiPrintReceipt,
} from '../../services/printService';
import {
  btPrinterManager,
  buildPaymentReceiptAsciiLines,
  formatAsciiLinesToPlainText,
} from '../../services/bluetoothPrinterService';
import { shareReceiptPdfOnWhatsApp, downloadReceiptPdf } from '../../services/pdfReceiptService';
import { triggerSms, formatPaymentReceiptSms } from '../../services/smsService';

interface ReceiptModalProps {
  payment: PaymentRecord | null;
  agency: Agency;
  onClose: () => void;
  lang: Language;
  onShareWhatsApp: (payment: PaymentRecord) => void;
  onOpenBluetoothSetup?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  payment,
  agency,
  onClose,
  lang,
  onShareWhatsApp,
  onOpenBluetoothSetup,
}) => {
  const t = translations[lang];

  // Print Format Mode: Default to 'thermal' (80mm portable POS slip) or 'ascii'
  const [printFormat, setPrintFormat] = useState<'thermal' | 'ascii' | 'standard'>('thermal');
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [pdfSuccessToast, setPdfSuccessToast] = useState('');

  useEffect(() => {
    if (payment) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {
        // Ignore if confetti fails
      }
    }
  }, [payment]);

  if (!payment) return null;

  const btConfig = btPrinterManager.getConfig();
  const asciiLines = buildPaymentReceiptAsciiLines(payment, agency, btConfig);
  const asciiPlainPreview = formatAsciiLinesToPlainText(asciiLines, btConfig, false);
  const asciiEscPosTagPreview = formatAsciiLinesToPlainText(asciiLines, btConfig, true);

  const handlePrint = () => {
    if (printFormat === 'ascii') {
      handleBluetoothAsciiPrint();
      return;
    }
    triggerDirectPrintReceipt(payment, agency, printFormat === 'standard' ? 'standard' : 'thermal');
  };

  const handleBluetoothAsciiPrint = async () => {
    setPdfSuccessToast('ब्लूटूथ प्रिंटर को Print (ASCII) Code कमांड भेजा जा रहा है...');
    await triggerBluetoothAsciiPrintReceipt(payment, agency);
    setPdfSuccessToast('✓ Print (ASCII) Code ब्लूटूथ प्रिंटर को भेज दिया गया है!');
    setTimeout(() => setPdfSuccessToast(''), 3500);
  };

  const handleBluetoothPrint = async () => {
    setPdfSuccessToast('ब्लूटूथ प्रिंटर को सीधा प्रिंट कमांड भेजा जा रहा है...');
    await triggerBluetoothThermalPrint(payment, agency, true);
    setPdfSuccessToast('✓ Print (ASCII) Code ब्लूटूथ प्रिंटर को भेज दिया गया है!');
    setTimeout(() => setPdfSuccessToast(''), 3500);
  };

  const handleSharePdfWhatsApp = async () => {
    setIsSharingPdf(true);
    try {
      const res = await shareReceiptPdfOnWhatsApp(payment, agency);
      if (res.mode === 'native_share') {
        setPdfSuccessToast(lang === 'hi' ? '✓ WhatsApp शेयर विंडो खुल गई है!' : '✓ WhatsApp share opened!');
      } else {
        setPdfSuccessToast(lang === 'hi' 
          ? '✓ PDF रसीद डाउनलोड हो गई है और WhatsApp खुल गया है!' 
          : '✓ PDF downloaded & WhatsApp opened!');
      }
      setTimeout(() => setPdfSuccessToast(''), 4500);
    } catch (err) {
      console.error('PDF share failed:', err);
    } finally {
      setIsSharingPdf(false);
    }
  };

  const handleDownloadPdf = () => {
    downloadReceiptPdf(payment, agency);
    setPdfSuccessToast(lang === 'hi' ? '✓ PDF रसीद फाइल डाउनलोड हो गई!' : '✓ PDF receipt downloaded!');
    setTimeout(() => setPdfSuccessToast(''), 3500);
  };

  const handleSendReceiptSms = () => {
    if (!payment) return;
    const msg = formatPaymentReceiptSms(payment, agency, lang);
    const ok = triggerSms(payment.customerMobile, msg);
    if (ok) {
      setPdfSuccessToast(lang === 'hi' ? '✓ डिफ़ॉल्ट SMS ऐप खुल गई है!' : '✓ Device SMS app opened!');
      setTimeout(() => setPdfSuccessToast(''), 3500);
    }
  };

  const methodBadge = 
    payment.paymentMethod === 'cash' ? 'नकद (Cash)' : 
    payment.paymentMethod === 'upi' ? 'UPI डिजिटल' : 
    payment.paymentMethod === 'bank_transfer' ? 'बैंक ट्रांसफर' : 'ऑनलाइन';

  const agencyLogoSrc =
    agency.logoUrl || '/assets/aistudio/file_0000000043f482118d45f9a7391eadfe_4733c263.png';
  const fullAgencyAddress = [agency.address, agency.city, agency.state, agency.pincode]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className={`relative w-[95vw] sm:w-full ${printFormat === 'thermal' ? 'max-w-lg' : 'max-w-2xl'} max-h-[90dvh] sm:max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col transition-all`}>
        
        {/* Dedicated Agency Identity Header Section */}
        <div className="no-print bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-4 sm:px-5 py-3.5 text-white flex items-center justify-between gap-3 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={agencyLogoSrc}
              alt={agency.name || 'Agency Logo'}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-amber-400 shadow-sm bg-white shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-white tracking-tight truncate">
                  {agency.nameHi || 'अजीत कलेक्शन'}
                </h3>
                <span className="text-[11px] font-semibold text-amber-300 truncate">
                  ({agency.name || 'Ajit collection'})
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">
                📍 {fullAgencyAddress || 'मेन मार्केट रोड'} • 📞 +91 {agency.mobile}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition shrink-0 cursor-pointer"
            title="बंद करें"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="no-print bg-slate-100 px-4 sm:px-5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          
          {/* Format Selector Toggle */}
          <div className="inline-flex p-0.5 bg-slate-200 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPrintFormat('thermal')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition cursor-pointer ${
                printFormat === 'thermal'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>थर्मल (80mm)</span>
            </button>
            <button
              type="button"
              onClick={() => setPrintFormat('ascii')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition cursor-pointer ${
                printFormat === 'ascii'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Bluetooth className="w-3 h-3" />
              <span>Print (ASCII)</span>
            </button>
            <button
              type="button"
              onClick={() => setPrintFormat('standard')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition cursor-pointer ${
                printFormat === 'standard'
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
              title="WhatsApp पर PDF रसीद फाइल भेजें"
            >
              {isSharingPdf ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Share2 className="w-3.5 h-3.5 text-white" />
              )}
              <span>WhatsApp PDF</span>
            </button>

            {/* Default Device SMS Receipt Button */}
            <button
              type="button"
              onClick={handleSendReceiptSms}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-indigo-900 bg-indigo-50 hover:bg-indigo-100 active:scale-98 border border-indigo-200 rounded-lg transition shadow-2xs cursor-pointer"
              title="डिफ़ॉल्ट मैसेजिंग ऐप से SMS रसीद भेजें"
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-700" />
              <span>SMS रसीद</span>
            </button>

            {/* Direct PDF Download Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition shadow-2xs cursor-pointer"
              title="PDF रसीद फाइल डाउनलोड करें"
            >
              <Download className="w-3.5 h-3.5 text-blue-900" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            {/* Bluetooth POS Direct Print (ASCII) Code Button */}
            <button
              type="button"
              onClick={handleBluetoothAsciiPrint}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-600 border border-blue-800 rounded-lg transition shadow-2xs cursor-pointer"
              title="Print (ASCII) Code के साथ ब्लूटूथ प्रिंटर से तुरंत रसीद प्रिंट करें"
            >
              <Bluetooth className="w-3.5 h-3.5 text-sky-200" />
              <span>Print (ASCII) BT</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition shadow-xs cursor-pointer"
              title="सीधे थर्मल प्रिंट करें (Direct Thermal Print)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>थर्मल प्रिंट</span>
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

        {/* Scrollable Receipt Body */}
        <div className="overflow-y-auto flex-1 overscroll-contain">
          {/* ------------------------------------------------------------- */}
          {/* VIEW 1: THERMAL RECEIPT SLIP PREVIEW (58mm / 80mm POS Slip)   */}
          {/* ------------------------------------------------------------- */}
          {printFormat === 'thermal' ? (
          <div className="p-4 sm:p-6 bg-slate-50 flex justify-center">
            <div className="w-full max-w-[340px] bg-white border border-dashed border-slate-300 shadow-sm p-4 font-mono text-xs text-slate-900 space-y-2.5 rounded-lg">
              
              {/* Enhanced Agency Header inside Thermal Slip */}
              <div className="text-center pb-2.5 border-b-2 border-slate-900 font-sans bg-slate-50/70 p-2.5 rounded-t-md">
                <div className="flex justify-center mb-1.5">
                  <img 
                    src={agencyLogoSrc} 
                    alt={agency.name || 'Agency Logo'} 
                    className="w-14 h-14 rounded-full object-cover border-2 border-amber-400 shadow-xs bg-white" 
                  />
                </div>
                <div className="text-base font-black text-slate-950 uppercase leading-snug">
                  {agency.nameHi || 'अजीत कलेक्शन'}
                </div>
                <div className="text-xs font-bold text-slate-700">
                  {agency.name || 'Ajit collection'}
                </div>
                <div className="text-[11px] font-medium text-slate-700 mt-1 leading-snug">
                  📍 {fullAgencyAddress}
                </div>
                <div className="text-[11px] font-bold text-slate-900 mt-1">
                  📞 मो. +91 {agency.mobile}
                </div>
                {agency.gstin && (
                  <div className="text-[10px] font-mono text-slate-600 mt-0.5">
                    GSTIN: {agency.gstin}
                  </div>
                )}
              </div>

              <div className="text-center font-bold text-xs tracking-wider border-b border-dashed border-slate-400 pb-1">
                भुगतान रसीद (PAYMENT RECEIPT)
              </div>

              {/* Receipt & Date */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">रसीद सं. (No):</span>
                  <span className="font-bold">{payment.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">दिनांक (Date):</span>
                  <span>{payment.paymentDate}</span>
                </div>
                {payment.transactionRef && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ref:</span>
                    <span className="font-bold">{payment.transactionRef}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">ग्राहक:</span>
                  <span className="font-bold font-sans">{payment.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">फोन:</span>
                  <span>+91 {payment.customerMobile}</span>
                </div>
              </div>

              {/* Large Amount Received Box */}
              <div className="border-2 border-slate-900 bg-slate-50 p-2.5 text-center my-2 rounded">
                <div className="text-[10px] font-semibold text-slate-600 font-sans">
                  प्राप्त राशि (AMOUNT RECEIVED)
                </div>
                <div className="text-2xl font-black text-slate-950 font-mono mt-0.5">
                  ₹{payment.amount}.00
                </div>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white font-sans">
                  {methodBadge}
                </span>
              </div>

              {payment.notes && (
                <div className="text-[10px] text-slate-600 border-t border-dashed border-slate-300 pt-1">
                  विवरण: {payment.notes}
                </div>
              )}

              {/* Collector Sign */}
              <div className="border-t border-dashed border-slate-400 pt-2 text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">वसूलीकर्ता:</span>
                  <span className="font-bold font-sans">{payment.collectedByAgentName}</span>
                </div>
                <div className="text-right pt-3">
                  <div className="text-slate-400">........................</div>
                  <div className="text-[9px] text-slate-600 font-sans">अधिकृत हस्ताक्षर / मोहर</div>
                </div>
              </div>

              <div className="text-center text-[9px] text-slate-500 border-t border-dashed border-slate-300 pt-2 font-sans">
                🙏 भुगतान करने हेतु आपका धन्यवाद!<br />
                अजीत कलेक्शन ऐप डिजिटल रसीद
              </div>

            </div>
          </div>
        ) : printFormat === 'ascii' ? (
          /* ------------------------------------------------------------- */
          /* VIEW 1B: PRINT (ASCII) CODE BLUETOOTH SLIP & COMMAND PREVIEW  */
          /* ------------------------------------------------------------- */
          <div className="p-4 sm:p-6 bg-slate-50 space-y-4">
            <div className="max-w-[360px] mx-auto bg-white border-2 border-slate-900 rounded-xl shadow-sm p-4 font-mono text-xs text-slate-950">
              <div className="flex items-center justify-between border-b border-dashed border-slate-300 pb-2 mb-2 text-[10px] font-sans">
                <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  Print (ASCII) Code Slip ({btConfig.paperWidth}mm)
                </span>
                <button
                  type="button"
                  onClick={handleBluetoothAsciiPrint}
                  className="px-2.5 py-1 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-md flex items-center gap-1 cursor-pointer"
                >
                  <Bluetooth className="w-3 h-3" />
                  <span>Print (ASCII)</span>
                </button>
              </div>
              <pre className="whitespace-pre-wrap text-[11px] leading-snug font-mono text-slate-900 overflow-x-auto">
                {asciiPlainPreview}
              </pre>
            </div>

            <div className="max-w-[440px] mx-auto bg-slate-950 text-emerald-300 p-3.5 rounded-xl border border-slate-800 font-mono text-[10px] space-y-1.5">
              <div className="flex items-center justify-between text-amber-300 font-bold">
                <span>ESC/POS Print (ASCII) Command Stream:</span>
                <span className="text-[9px] bg-blue-900/60 text-sky-200 px-2 py-0.5 rounded">
                  ESC @ | ESC t 0 | ESC a | ESC E | GS !
                </span>
              </div>
              <pre className="whitespace-pre overflow-x-auto text-[10px] leading-relaxed">
                {asciiEscPosTagPreview}
              </pre>
            </div>
          </div>
        ) : (
          /* ------------------------------------------------------------- */
          /* VIEW 2: STANDARD / A4 RECEIPT PREVIEW                         */
          /* ------------------------------------------------------------- */
          <div className="p-6 sm:p-8 space-y-5 text-slate-900">
            {/* Enhanced Agency Banner for A4 / Standard Receipt */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 sm:p-5 text-center">
              <div className="flex justify-center mb-2">
                <img 
                  src={agencyLogoSrc} 
                  alt={agency.name || 'Agency Logo'} 
                  className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 shadow-xs bg-white" 
                />
              </div>
              <div className="text-xl sm:text-2xl font-black text-blue-950 tracking-tight">
                {agency.nameHi || 'अजीत कलेक्शन'}
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-700 mt-0.5">
                {agency.name || 'Ajit collection'}
              </div>
              <p className="text-xs text-slate-600 mt-1.5 font-medium">
                📍 {fullAgencyAddress}
              </p>
              <p className="text-xs font-bold text-slate-800 mt-0.5">
                📞 संपर्क: +91 {agency.mobile}
                {agency.email ? ` • ✉️ ${agency.email}` : ''}
                {agency.gstin ? ` • GSTIN: ${agency.gstin}` : ''}
              </p>
            </div>

            {/* Receipt Info Grid */}
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block">रसीद संख्या (Receipt No):</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{payment.receiptNumber}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">दिनांक (Date):</span>
                <span className="font-semibold text-slate-900">{payment.paymentDate}</span>
              </div>
            </div>

            {/* Amount Paid Callout */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <span className="text-xs font-medium text-emerald-800 block">
                प्राप्त राशि (Amount Received)
              </span>
              <div className="text-3xl font-black text-emerald-900 mt-1 flex items-center justify-center gap-1 font-mono">
                <span>₹{payment.amount}.00</span>
              </div>
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-200 text-emerald-900">
                {methodBadge}
              </span>
              {payment.transactionRef && (
                <div className="text-[10px] text-slate-500 font-mono mt-1">
                  Ref: {payment.transactionRef}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-2 text-xs border-y border-slate-200 py-4">
              <div className="flex justify-between">
                <span className="text-slate-500">ग्राहक का नाम:</span>
                <span className="font-bold text-slate-900">{payment.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ग्राहक मोबाइल:</span>
                <span className="font-semibold text-slate-800">+91 {payment.customerMobile}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">वसूलीकर्ता (Collected By):</span>
                <span className="font-semibold text-slate-800">{payment.collectedByAgentName}</span>
              </div>
              {payment.notes && (
                <div className="flex justify-between">
                  <span className="text-slate-500">विवरण / टिप्पणी:</span>
                  <span className="text-slate-800">{payment.notes}</span>
                </div>
              )}
            </div>

            {/* Footer Sign */}
            <div className="flex justify-between items-end pt-3 text-xs text-slate-500">
              <div>
                <p className="text-[10px] italic">भुगतान करने हेतु आपका धन्यवाद!</p>
                <p className="text-[9px] text-slate-400">अजीत कलेक्शन ऐप डिजिटल रसीद</p>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-800">{payment.collectedByAgentName}</div>
                <div className="text-[10px] text-slate-400">अधिकृत हस्ताक्षर / रसीद जारीकर्ता</div>
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Modal Footer Actions (Direct Thermal & Bluetooth POS Auto-Print) */}
        <div className="no-print p-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleBluetoothAsciiPrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Bluetooth className="w-3.5 h-3.5 shrink-0" />
              <span>Print (ASCII) ब्लूटूथ</span>
            </button>
            {onOpenBluetoothSetup && (
              <button
                type="button"
                onClick={onOpenBluetoothSetup}
                className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 transition cursor-pointer"
                title="ब्लूटूथ प्रिंटर (Print ASCII Code) सेटिंग्स"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              बंद करें
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span>थर्मल प्रिंट करें</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
