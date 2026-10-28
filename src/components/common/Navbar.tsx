import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw,
  Settings,
  Bluetooth
} from 'lucide-react';
import { UserProfile, Language } from '../../types';
import { translations } from '../../i18n/translations';
import { btPrinterManager } from '../../services/bluetoothPrinterService';

interface NavbarProps {
  currentUser?: UserProfile;
  lang: Language;
  onLanguageChange?: (lang: Language) => void;
  onOpenAuth?: () => void;
  onOpenCloudBackup?: () => void;
  onOpenMore?: () => void;
  onOpenSettings?: () => void;
  onOpenBluetoothPrinter?: () => void;
  isOnline: boolean;
  pendingSyncCount: number;
  onSync: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  lang,
  onOpenSettings,
  onOpenBluetoothPrinter,
  isOnline,
  pendingSyncCount,
  onSync,
  activeTab,
  onTabChange,
}) => {
  const t = translations[lang];
  const [isBtConnected, setIsBtConnected] = useState<boolean>(() =>
    btPrinterManager.isConnected()
  );

  useEffect(() => {
    btPrinterManager.trySilentReconnect();
    return btPrinterManager.subscribe(() => {
      setIsBtConnected(btPrinterManager.isConnected());
    });
  }, []);

  const navLinks = [
    { id: 'customers', label: t.nav.customers },
    { id: 'dashboard', label: t.nav.dashboard },
    { id: 'collections', label: t.nav.collections },
    { id: 'billing', label: t.nav.billing },
    { id: 'reports', label: t.nav.reports },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-16">
          
          {/* Left Zone: Desktop Navigation Links */}
          <div className="flex items-center min-w-0 z-10">
            <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-600">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => onTabChange(link.id)}
                  className={`transition-colors whitespace-nowrap py-1 ${
                    activeTab === link.id
                      ? 'text-blue-900 font-bold border-b-2 border-blue-900'
                      : 'hover:text-slate-900 font-medium'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Center Zone: Logo + App Name ("Ajit collection") - Centered with no tagline */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-auto">
            <button 
              onClick={() => onTabChange('customers')}
              className="flex items-center gap-2 sm:gap-2.5 text-center focus:outline-none hover:opacity-95 transition group"
              title="Ajit collection"
            >
              <img 
                src="/assets/aistudio/file_0000000043f482118d45f9a7391eadfe_4733c263.png" 
                alt="Ajit collection logo" 
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover shadow-2xs border border-amber-300 group-hover:scale-105 transition shrink-0" 
              />
              <span className="text-base sm:text-lg lg:text-xl font-black tracking-tight text-slate-900 whitespace-nowrap font-sans">
                Ajit collection
              </span>
            </button>
          </div>

          {/* Right Zone: Actions (Sync status, Bluetooth Printer & Settings) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 z-10 ml-auto">
            {/* Offline & Sync Indicator */}
            {isOnline ? (
              pendingSyncCount > 0 ? (
                <button
                  onClick={onSync}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition whitespace-nowrap cursor-pointer"
                  title="Click to sync pending records"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{pendingSyncCount} Sync</span>
                </button>
              ) : (
                <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap">
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Online</span>
                </div>
              )
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg whitespace-nowrap">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline</span>
              </div>
            )}

            {onOpenBluetoothPrinter && (
              <button
                type="button"
                onClick={onOpenBluetoothPrinter}
                className={`relative p-2 rounded-xl border transition cursor-pointer shadow-2xs ${
                  isBtConnected
                    ? 'text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border-emerald-300'
                    : 'text-blue-900 bg-blue-50 hover:bg-blue-100 border-blue-200'
                }`}
                title="ब्लूटूथ प्रिंटर ऑटो-प्रिंट कॉन्फ़िगरेशन (Bluetooth POS Setup)"
              >
                <Bluetooth className="w-4 h-4" />
                <span
                  className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${
                    isBtConnected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </button>
            )}

            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-2 text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition cursor-pointer shadow-2xs"
                title="एजेंसी सेटिंग्स व थीम (Settings & Theme)"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
