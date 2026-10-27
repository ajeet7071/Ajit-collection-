import React, { useState } from 'react';
import { Smartphone, Check, Copy, ExternalLink, QrCode } from 'lucide-react';

interface DynamicUpiQrCardProps {
  upiId: string;
  payeeName: string;
  amount: number;
  customerName?: string;
  customerCode?: string;
  note?: string;
  className?: string;
}

export const DynamicUpiQrCard: React.FC<DynamicUpiQrCardProps> = ({
  upiId,
  payeeName,
  amount,
  customerName,
  customerCode,
  note,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const cleanUpiId = upiId?.trim() || 'ajeet9660527071@upi';
  const cleanPayee = payeeName?.trim() || 'Ajeet Newspaper Agency';
  const validAmount = Math.max(0, Number(amount) || 0);
  const txNote = note || (customerCode ? `Newspaper Bill ${customerCode}` : 'Newspaper Bill Payment');

  // Standard NPCI UPI URI
  const upiUri = `upi://pay?pa=${encodeURIComponent(cleanUpiId)}&pn=${encodeURIComponent(
    cleanPayee
  )}&am=${validAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(txNote)}`;

  // High-reliability QR generator API with high error correction (M)
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=2&ecc=M&data=${encodeURIComponent(
    upiUri
  )}`;

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(cleanUpiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenUpiApp = () => {
    window.location.href = upiUri;
  };

  return (
    <div
      className={`bg-gradient-to-b from-indigo-50/70 via-white to-slate-50 border-2 border-indigo-200/80 rounded-2xl p-4 shadow-sm text-center space-y-3 ${className}`}
    >
      {/* Top Header Badge */}
      <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
        <div className="flex items-center gap-1.5 text-indigo-950 font-bold text-xs text-left">
          <QrCode className="w-4 h-4 text-indigo-700 shrink-0" />
          <span>सटीक राशि का लाइव UPI QR कोड</span>
        </div>
        <div className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-300">
          ऑटो-जनरेटेड
        </div>
      </div>

      {/* Exact Amount Banner */}
      <div className="bg-white py-2 px-3 rounded-xl border border-indigo-100 shadow-2xs">
        <div className="text-[11px] text-slate-500 font-medium">भुगतान की जाने वाली सटीक राशि:</div>
        <div className="font-mono text-2xl font-black text-indigo-950 tracking-tight">
          ₹{validAmount.toLocaleString('en-IN')}
        </div>
        {customerName && (
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
            ग्राहक: <strong className="text-slate-700">{customerName}</strong> {customerCode ? `(${customerCode})` : ''}
          </div>
        )}
      </div>

      {/* QR Code Canvas / Container */}
      <div className="relative w-48 h-48 mx-auto bg-white p-2.5 rounded-2xl border-2 border-indigo-300/80 shadow-md flex items-center justify-center">
        {!imgLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 rounded-2xl text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-1" />
            <span>QR कोड लोड हो रहा है...</span>
          </div>
        )}
        <img
          key={upiUri}
          src={qrImageUrl}
          alt={`UPI QR Code for ₹${validAmount}`}
          onLoad={() => setImgLoaded(true)}
          className={`w-full h-full object-contain rounded-lg transition-opacity duration-200 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>

      {/* Supported UPI Apps Badges */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap pt-1 text-[10px] font-semibold">
        <span className="px-2 py-0.5 bg-[#5f259f]/10 text-[#5f259f] rounded-md border border-[#5f259f]/20">
          PhonePe
        </span>
        <span className="px-2 py-0.5 bg-[#4285f4]/10 text-[#1a73e8] rounded-md border border-[#4285f4]/20">
          Google Pay
        </span>
        <span className="px-2 py-0.5 bg-[#002e6e]/10 text-[#002e6e] rounded-md border border-[#002e6e]/20">
          Paytm
        </span>
        <span className="px-2 py-0.5 bg-[#00824b]/10 text-[#00824b] rounded-md border border-[#00824b]/20">
          BHIM UPI
        </span>
      </div>

      {/* Payee Info & UPI ID Copy */}
      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-left text-xs space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 text-[11px]">खाताधारक / एजेंसी:</span>
          <span className="font-bold text-slate-800 text-[11px] truncate max-w-[170px]">{cleanPayee}</span>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
          <span className="font-mono text-indigo-900 font-bold text-xs truncate max-w-[190px]">
            {cleanUpiId}
          </span>
          <button
            type="button"
            onClick={handleCopyUpiId}
            className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 transition"
            title="UPI ID कॉपी करें"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">कॉपी हुआ</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>कॉपी</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Direct Open in UPI App Button (for Mobile devices) */}
      <div className="pt-1">
        <button
          type="button"
          onClick={handleOpenUpiApp}
          className="w-full py-2.5 px-3 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 active:scale-98"
        >
          <Smartphone className="w-4 h-4" />
          <span>सीधे PhonePe / GPay ऐप में खोलें</span>
          <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-80" />
        </button>
        <p className="text-[10px] text-slate-400 mt-1">
          स्कैन करते ही ग्राहक के ऐप में ₹{validAmount} की राशि स्वतः भर जाएगी।
        </p>
      </div>
    </div>
  );
};
