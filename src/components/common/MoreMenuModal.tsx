import React from 'react';
import { 
  X, 
  Newspaper, 
  Receipt, 
  BarChart3, 
  UserCheck, 
  CheckCircle2, 
  BookOpen, 
  LogOut, 
  ShieldCheck,
  MapPin,
  UserCog,
  Cloud,
  Smartphone,
  Download,
  Lock,
  Globe
} from 'lucide-react';
import { Language, UserProfile } from '../../types';
import { translations } from '../../i18n/translations';

interface MoreMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: string) => void;
  onOpenAuth: () => void;
  onOpenRouteManagement: () => void;
  onOpenAgencyProfile: () => void;
  onOpenCloudBackup: () => void;
  currentUser: UserProfile;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
}

export const MoreMenuModal: React.FC<MoreMenuModalProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onOpenAuth,
  onOpenRouteManagement,
  onOpenAgencyProfile,
  onOpenCloudBackup,
  currentUser,
  lang,
  onLanguageChange,
}) => {
  if (!isOpen) return null;
  const t = translations[lang];

  const menuItems = [
    { 
      id: 'profile_manage', 
      label: 'एजेंट एवं एजेंसी प्रोफाइल (Profile & UPI)', 
      icon: UserCog, 
      desc: 'मोबाइल नंबर, एजेंसी का नाम, यूपीआई कोड व प्रोफाइल विवरण बदलें',
      action: () => {
        onClose();
        onOpenAgencyProfile();
      }
    },
    { 
      id: 'cloud_backup', 
      label: 'Google Cloud बैकअप एवं डेटा रिकवरी (Cloud Sync)', 
      icon: Cloud, 
      desc: 'जीमेल खाते पर ऐप का पूरा डेटा सेव करें या दोबारा रिकवर करें',
      action: () => {
        onClose();
        onOpenCloudBackup();
      }
    },
    { 
      id: 'routes_manage', 
      label: 'रूट जोड़ें एवं प्रबंधन (Delivery Routes)', 
      icon: MapPin, 
      desc: 'नया वितरण रूट बनाएं, हॉकर व वार्ड असाइन करें',
      action: () => {
        onClose();
        onOpenRouteManagement();
      }
    },
    { id: 'reports', label: t.nav.reports, icon: BarChart3, desc: 'बकाया, कलेक्शन एवं रूट रिपोर्ट्स' },
    { id: 'newspapers', label: t.nav.newspapers, icon: Newspaper, desc: 'अखबार सूची एवं एजेंसी दरें' },
    { id: 'expenses', label: t.nav.expenses, icon: Receipt, desc: 'हॉकर वेतन, पेट्रोल व डिपो खर्च' },
    { id: 'customerPortal', label: t.nav.customerPortal, icon: UserCheck, desc: 'ग्राहक बिल, ऑनलाइन भुगतान व हॉलीडे' },
    { id: 'qaTests', label: t.nav.qaTests, icon: CheckCircle2, desc: 'स्वचालित गणना एवं सिंक टेस्ट रनर' },
    { id: 'systemDocs', label: t.nav.systemDocs, icon: BookOpen, desc: 'PostgreSQL DDL एवं Android APK गाइड' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-[92vw] sm:w-full max-w-md max-h-[85dvh] sm:max-h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col">
        
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <img 
              src="/assets/aistudio/file_0000000043f482118d45f9a7391eadfe_4733c263.png" 
              alt="Ajit collection" 
              className="w-7 h-7 rounded-full object-cover border border-amber-300 shadow-2xs" 
            />
            <div>
              <span className="font-bold text-slate-900 text-sm block leading-tight">Ajit collection</span>
              <span className="text-[10px] text-slate-500 font-medium">अधिक मेनू विकल्प</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-2.5 overflow-y-auto flex-1 overscroll-contain">
          
          {/* Language Selection Bar (Moved from Header to More Menu) */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl mb-1 shadow-2xs">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-900" />
              <div>
                <div className="text-xs font-bold text-slate-900">ऐप की भाषा (Language)</div>
                <div className="text-[10px] text-slate-500">हिंदी अथवा English चुनें</div>
              </div>
            </div>
            <div className="inline-flex p-0.5 bg-slate-200 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => onLanguageChange('hi')}
                className={`px-3 py-1 rounded-md transition ${
                  lang === 'hi' ? 'bg-blue-900 text-white shadow-xs font-bold' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                हिंदी
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('en')}
                className={`px-3 py-1 rounded-md transition ${
                  lang === 'en' ? 'bg-blue-900 text-white shadow-xs font-bold' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                EN
              </button>
            </div>
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.action) {
                    item.action();
                  } else {
                    onSelectTab(item.id);
                    onClose();
                  }
                }}
                className="w-full p-3 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-100 flex items-center gap-3 text-left transition group"
              >
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-blue-900 group-hover:bg-blue-900 group-hover:text-white transition shadow-2xs">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-blue-950">
                    {item.label}
                  </div>
                  <div className="text-[11px] text-slate-500">{item.desc}</div>
                </div>
              </button>
            );
          })}

          {/* User Session & Quick Profile Edit */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-xs">
                  {currentUser.name ? currentUser.name[0] : 'A'}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    +91 {currentUser.mobile}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenAgencyProfile();
                }}
                className="px-2.5 py-1 bg-white border border-blue-900 text-blue-900 hover:bg-blue-50 text-[11px] font-bold rounded-lg transition"
              >
                एडिट करें
              </button>
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="w-full p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center justify-center gap-2 transition"
            >
              <Lock className="w-4 h-4 text-blue-900" />
              <span>वेंडर स्थायी लॉगिन / खाता प्रवेश</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
