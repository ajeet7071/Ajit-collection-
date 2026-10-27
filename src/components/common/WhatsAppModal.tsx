import React, { useState, useEffect } from 'react';
import { X, Send, Copy, Check, MessageSquare } from 'lucide-react';
import { getWhatsAppClickUrl } from '../../services/whatsappService';
import { Language } from '../../types';
import { translations } from '../../i18n/translations';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerMobile: string;
  customerName: string;
  defaultMessage: string;
  lang: Language;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  customerMobile,
  customerName,
  defaultMessage,
  lang,
}) => {
  const t = translations[lang];

  const [message, setMessage] = useState(defaultMessage);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMessage(defaultMessage);
  }, [defaultMessage]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    const url = getWhatsAppClickUrl(customerMobile, message);
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-[92vw] sm:w-full max-w-md max-h-[85dvh] sm:max-h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col">
        
        {/* Header */}
        <div className="bg-emerald-800 p-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-300" />
            <div>
              <h3 className="text-sm font-bold">व्हाट्सएप संदेश भेजें (WhatsApp Message)</h3>
              <p className="text-[11px] text-emerald-200">
                {customerName} (+91 {customerMobile})
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

        {/* Text Area */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              संदेश पूर्वावलोकन एवं संपादन (Message Content):
            </label>
            <textarea
              rows={7}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-sans text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 leading-relaxed"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 h-11 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-xl transition flex items-center justify-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copied ? 'कॉपी हो गया' : 'टेक्स्ट कॉपी करें'}</span>
            </button>
            <button
              onClick={handleSend}
              className="flex-1 h-11 bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Send className="w-4 h-4" />
              <span>WhatsApp पर खोलें</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
