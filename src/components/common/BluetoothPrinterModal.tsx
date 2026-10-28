import React, { useState, useEffect } from 'react';
import {
  X,
  Bluetooth,
  Printer,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  Sliders,
  Link2,
  Unplug
} from 'lucide-react';
import { Agency } from '../../types';
import {
  btPrinterManager,
  BluetoothPrinterConfig,
  BluetoothPrintMode
} from '../../services/bluetoothPrinterService';
import { triggerTestBluetoothPrint } from '../../services/printService';

interface BluetoothPrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
  agency: Agency;
}

export const BluetoothPrinterModal: React.FC<BluetoothPrinterModalProps> = ({
  isOpen,
  onClose,
  agency,
}) => {
  const [config, setConfig] = useState<BluetoothPrinterConfig>(() =>
    btPrinterManager.getConfig()
  );
  const [isConnected, setIsConnected] = useState<boolean>(() =>
    btPrinterManager.isConnected()
  );
  const [connectedName, setConnectedName] = useState<string>(() =>
    btPrinterManager.getConnectedDeviceName()
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setConfig(btPrinterManager.getConfig());
    setIsConnected(btPrinterManager.isConnected());
    setConnectedName(btPrinterManager.getConnectedDeviceName());

    const unsubscribe = btPrinterManager.subscribe(() => {
      setConfig(btPrinterManager.getConfig());
      setIsConnected(btPrinterManager.isConnected());
      setConnectedName(btPrinterManager.getConnectedDeviceName());
    });

    return unsubscribe;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdateConfig = (partial: Partial<BluetoothPrinterConfig>) => {
    const next = btPrinterManager.saveConfig(partial);
    setConfig(next);
    setStatusMsg('✓ ब्लूटूथ प्रिंटर कमांड सेटिंग सेव हो गई!');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleConnectBluetooth = async () => {
    setErrorMsg('');
    setStatusMsg('');
    setIsConnecting(true);
    try {
      const res = await btPrinterManager.requestAndConnectPrinter();
      if (res.success) {
        setStatusMsg(`✓ ब्लूटूथ प्रिंटर "${res.deviceName}" सफलतापूर्वक जुड़ गया है! अब 1 क्लिक में सीधा प्रिंट निकलेगा।`);
      } else if (res.error) {
        setErrorMsg(res.error);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    btPrinterManager.disconnectPrinter();
    setStatusMsg('प्रिंटर डिस्कनेक्ट कर दिया गया है।');
  };

  const handleTestPrint = async () => {
    setErrorMsg('');
    setStatusMsg('');
    setIsTesting(true);
    try {
      await triggerTestBluetoothPrint(agency);
      setStatusMsg('✓ टेस्ट प्रिंट कमांड ब्लूटूथ प्रिंटर को भेज दिया गया है!');
    } catch (err: any) {
      setErrorMsg(err?.message || 'टेस्ट प्रिंट भेजने में समस्या आई।');
    } finally {
      setIsTesting(false);
    }
  };

  const modeOptions: Array<{
    id: BluetoothPrintMode;
    title: string;
    desc: string;
    badge: string;
  }> = [
    {
      id: 'ascii_escpos',
      title: '1. Print (ASCII) Code — डायरेक्ट ESC/POS ASCII कमांड',
      desc: 'सभी 58mm/80mm ब्लूटूथ थर्मल प्रिंटर के लिए 7-Bit ASCII अक्षर + ESC/POS कंट्रोल कोड (ESC @, ESC a, ESC E, GS !, LF) के साथ तुरंत प्रिंट',
      badge: 'Print (ASCII)',
    },
    {
      id: 'auto_smart',
      title: '2. ऑटो स्मार्ट डायरेक्ट (Web Bluetooth + RawBT ESC/POS)',
      desc: 'मोबाइल से जुड़े ब्लूटूथ प्रिंटर पर क्लिक करते ही सीधा ESC/POS कमांड भेजता है',
      badge: 'Smart Auto',
    },
    {
      id: 'web_bluetooth',
      title: '3. डायरेक्ट Web Bluetooth (बिना किसी बाहरी ऐप के)',
      desc: 'Chrome ब्राउज़र से सीधे ब्लूटूथ थर्मल प्रिंटर (BLE/Dual-Mode) से जुड़कर तुरंत प्रिंट निकालें',
      badge: 'Direct GATT',
    },
    {
      id: 'rawbt_escpos',
      title: '4. RawBT इंस्टेंट कमांड (rawbt:base64 ESC/POS)',
      desc: 'मोबाइल में RawBT सेवा के माध्यम से बिना प्रीव्यू विंडो खोले क्लिक करते ही ऑटोमेटिक प्रिंट निकालें',
      badge: '1-Click RawBT',
    },
    {
      id: 'bt_print_scheme',
      title: '5. Bluetooth Print App कमांड (my.bluetoothprint.scheme://)',
      desc: 'Mate Bluetooth Print / Thermer ऐप के डायरेक्ट स्कीम कमांड से सीधा प्रिंट निकालें',
      badge: 'App Scheme',
    },
    {
      id: 'custom_scheme',
      title: '6. कस्टम ऐप लिंक / कमांड URL (Custom App Command)',
      desc: 'यदि आप किसी विशेष प्रिंटर ऐप का लिंक या कमांड स्कीम उपयोग करते हैं तो उसे नीचे दर्ज करें',
      badge: 'Custom Link',
    },
  ];

  const asciiPreviewSample = [
    '<ESC @ [0x1B 0x40] INIT><ESC t 0 [0x1B 0x74 0x00] ASCII>',
    `<ESC a 1><ESC E 1><GS ! 0x01>${(agency.name || 'AJIT COLLECTION').toUpperCase()}<LF>`,
    `<ESC a 1>Mob: +91 ${agency.mobile || '9660527071'}<LF>`,
    '================================<LF>',
    '<ESC a 1><ESC E 1>PAYMENT RECEIPT (ASCII)<LF>',
    '--------------------------------<LF>',
    '<ESC a 0>Receipt No:         TEST-BT-001<LF>',
    `<ESC a 0>Date:                ${new Date().toISOString().split('T')[0]}<LF>`,
    '--------------------------------<LF>',
    '<ESC a 1><ESC E 1>AMOUNT RECEIVED<LF>',
    '<ESC a 1><ESC E 1><GS ! 0x11>Rs. 250.00<LF>',
    '<ESC a 1>Mode: CASH<LF>',
    '================================<LF>',
    '<ESC a 1>Thank You! Have a nice day!<LF>',
    `<ESC d ${config.feedLinesAfterPrint || 3}><GS V 66 0 [AUTO CUT]>`,
  ].join('\n');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/65 backdrop-blur-xs">
      <div className="relative w-[95vw] sm:w-full max-w-lg max-h-[90dvh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-blue-900 px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center">
              <Bluetooth className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black">
                ब्लूटूथ प्रिंटर (Print ASCII Code) सेटअप
              </h3>
              <p className="text-[11px] text-blue-200">
                1-Click Bluetooth POS Print with ESC/POS ASCII Code
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {statusMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">{statusMsg}</div>
            </div>
          )}

          {/* Direct Bluetooth Pairing & Status Card */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-3 h-3 rounded-full shrink-0 ${
                    isConnected
                      ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                      : 'bg-amber-400'
                  }`}
                />
                <div>
                  <div className="text-xs font-black">
                    {isConnected
                      ? `कनेक्टेड: ${connectedName || 'Bluetooth POS Printer'}`
                      : connectedName
                      ? `पूर्व चयनित प्रिंटर: ${connectedName}`
                      : 'डायरेक्ट ब्लूटूथ प्रिंटर पेयर करें'}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    {isConnected
                      ? 'क्लिक करते ही प्रिंटर तुरंत ASCII ESC/POS रसीद प्रिंट करेगा'
                      : 'मोबाइल का ब्लूटूथ व प्रिंटर चालू करके "प्रिंटर कनेक्ट करें" दबाएं'}
                  </div>
                </div>
              </div>
              {isConnected && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Unplug className="w-3.5 h-3.5" />
                  <span>हटाएं</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={isConnecting}
                onClick={handleConnectBluetooth}
                className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-2 shadow cursor-pointer transition"
              >
                {isConnecting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Bluetooth className="w-4 h-4" />
                )}
                <span>
                  {isConnected ? 'दूसरा प्रिंटर बदलें / जोड़ें' : 'ब्लूटूथ प्रिंटर कनेक्ट करें'}
                </span>
              </button>

              <button
                type="button"
                disabled={isTesting}
                onClick={handleTestPrint}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-2 shadow cursor-pointer transition"
              >
                {isTesting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
                <span>Print (ASCII) टेस्ट निकालें</span>
              </button>
            </div>
          </div>

          {/* Auto-Print on Payment Toggle */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/90 border-2 border-emerald-200 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="font-black text-slate-900 text-xs sm:text-sm">
                  रसीद कटते ही ऑटोमेटिक प्रिंट (Auto-Print on Payment)
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  इसे चालू करने पर जैसे ही आप "रसीद काटें एवं जमा करें" दबाएंगे, ब्लूटूथ प्रिंटर अपने-आप रसीद प्रिंट कर देगा।
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={config.autoPrintOnPayment}
              onChange={(e) => handleUpdateConfig({ autoPrintOnPayment: e.target.checked })}
              className="w-5 h-5 accent-emerald-700 rounded cursor-pointer shrink-0"
            />
          </div>

          {/* Paper Size & Print (ASCII) Code vs Raster Settings */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 font-black text-slate-900">
              <Sliders className="w-4 h-4 text-blue-900" />
              <span>पेपर साइज एवं Print (ASCII) Code एन्कोडिंग</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleUpdateConfig({ paperWidth: 58 })}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  config.paperWidth === 58
                    ? 'bg-blue-900 text-white border-blue-900 font-bold'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs font-bold">58mm (32 ASCII Cols)</div>
                <div className="text-[10px] opacity-80">2-इंच पोर्टेबल ब्लूटूथ प्रिंटर</div>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateConfig({ paperWidth: 80 })}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  config.paperWidth === 80
                    ? 'bg-blue-900 text-white border-blue-900 font-bold'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs font-bold">80mm (48 ASCII Cols)</div>
                <div className="text-[10px] opacity-80">3-इंच काउंटर थर्मल प्रिंटर</div>
              </button>
            </div>

            {/* Print (ASCII) Code Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() =>
                  handleUpdateConfig({
                    useAsciiCode: true,
                    useRasterForHindi: false,
                    mode: 'ascii_escpos',
                  })
                }
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  config.useAsciiCode || !config.useRasterForHindi
                    ? 'bg-emerald-900 text-white border-emerald-900 font-bold shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs font-black">✓ Print (ASCII) Code</div>
                <div className="text-[10px] opacity-85">
                  7-Bit ASCII + ESC/POS कंट्रोल कोड (सभी प्रिंटर में सबसे तेज़)
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleUpdateConfig({
                    useAsciiCode: false,
                    useRasterForHindi: true,
                  })
                }
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  !config.useAsciiCode && config.useRasterForHindi
                    ? 'bg-blue-900 text-white border-blue-900 font-bold shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs font-black">Hindi Bitmap (GS v 0)</div>
                <div className="text-[10px] opacity-85">
                  देवनागरी ग्राफ़िक रास्टर मोड (इमेज कमांड)
                </div>
              </button>
            </div>

            {/* Live ESC/POS ASCII Command Preview */}
            <div className="bg-slate-950 text-emerald-300 p-3 rounded-xl border border-slate-800 font-mono text-[10px] leading-relaxed overflow-x-auto">
              <div className="text-amber-300 font-bold mb-1 flex items-center justify-between">
                <span>ESC/POS Print (ASCII) Code स्ट्रीम प्रीव्यू:</span>
                <span className="text-[9px] bg-emerald-900/60 text-emerald-200 px-1.5 py-0.5 rounded">
                  PC437 7-Bit ASCII
                </span>
              </div>
              <pre className="whitespace-pre text-[10px]">{asciiPreviewSample}</pre>
            </div>
          </div>

          {/* Command Protocol Mode Selection */}
          <div className="space-y-2">
            <label className="block font-black text-slate-900">
              ब्लूटूथ प्रिंट कमांड मोड चुनें (Command Protocol):
            </label>
            <div className="space-y-2">
              {modeOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    handleUpdateConfig({
                      mode: opt.id,
                      ...(opt.id === 'ascii_escpos'
                        ? { useAsciiCode: true, useRasterForHindi: false }
                        : {}),
                    })
                  }
                  className={`w-full p-3 rounded-xl border text-left transition flex items-start justify-between gap-2 cursor-pointer ${
                    config.mode === opt.id
                      ? 'bg-blue-50/90 border-blue-700 ring-1 ring-blue-700'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900 text-xs">{opt.title}</div>
                    <div className="text-[11px] text-slate-600 leading-snug">{opt.desc}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                      config.mode === opt.id
                        ? 'bg-blue-900 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {opt.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom App Link / Scheme Input if user wants to paste a custom app command */}
          {config.mode === 'custom_scheme' && (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
              <label className="flex items-center gap-1.5 font-bold text-amber-950">
                <Link2 className="w-4 h-4 text-amber-700" />
                <span>कस्टम प्रिंटर ऐप कमांड / URL स्कीम:</span>
              </label>
              <input
                type="text"
                value={config.customSchemeTemplate || ''}
                onChange={(e) =>
                  handleUpdateConfig({ customSchemeTemplate: e.target.value })
                }
                placeholder="उदा. rawbt:base64,{base64} या my.bluetoothprint.scheme://{text}"
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:border-blue-900"
              />
              <p className="text-[10px] text-amber-800">
                यहाँ <code>{'{base64}'}</code> में ESC/POS बाइनरी कमांड और <code>{'{text}'}</code> में रसीद का टेक्स्ट अपने-आप जुड़ जाता है।
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleTestPrint}
            className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>टेस्ट प्रिंट</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            सेव एवं बंद करें
          </button>
        </div>
      </div>
    </div>
  );
};
