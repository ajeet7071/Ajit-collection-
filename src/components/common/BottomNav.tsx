import React from 'react';
import { 
  LayoutDashboard, 
  IndianRupee, 
  Users, 
  FileText, 
  MoreHorizontal 
} from 'lucide-react';
import { Language } from '../../types';
import { translations } from '../../i18n/translations';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  lang: Language;
  onOpenMore: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  lang,
  onOpenMore,
}) => {
  const t = translations[lang];

  const tabs = [
    { id: 'customers', label: t.nav.customers, icon: Users },
    { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { id: 'collections', label: t.nav.collections, icon: IndianRupee },
    { id: 'billing', label: t.nav.billing, icon: FileText },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 safe-bottom">
      <div className="grid grid-cols-5 items-center h-16 px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center justify-center h-full min-h-[44px] transition-colors focus:outline-none"
            >
              <Icon
                className={`w-5 h-5 transition-transform ${
                  isActive ? 'text-blue-900 scale-110' : 'text-slate-500'
                }`}
              />
              <span
                className={`text-[10px] font-medium tracking-tight mt-1 truncate max-w-full px-0.5 ${
                  isActive ? 'text-blue-900 font-bold' : 'text-slate-600'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* More tab for Reports, Rates, Expenses, QA */}
        <button
          onClick={onOpenMore}
          className="flex flex-col items-center justify-center h-full min-h-[44px] transition-colors text-slate-500 hover:text-slate-900 focus:outline-none"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-1 text-slate-600">
            {lang === 'hi' ? 'अन्य' : 'More'}
          </span>
        </button>
      </div>
    </nav>
  );
};
