import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Building2, 
  QrCode, 
  Smartphone, 
  Mail, 
  MapPin, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  ShieldCheck, 
  RotateCcw,
  Sparkles,
  Palette,
  Bell,
  Download,
  Clock
} from 'lucide-react';
import { Agency, UserProfile, UserRole, Language } from '../../types';
import { generateUpiPaymentUrl } from '../../services/paymentService';
import { THEME_PRESETS, DEFAULT_PRIMARY_COLOR, applyPrimaryTheme } from '../../utils/themeEngine';
import { backupReminderService, BackupReminderStatus } from '../../services/backupReminderService';

interface AgencyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  agency: Agency;
  currentUser: UserProfile;
  onSaveProfile: (updatedAgency: Agency, updatedUser: UserProfile) => void;
  lang: Language;
  initialTab?: 'profile' | 'agency' | 'upi' | 'theme';
}

export const AgencyProfileModal: React.FC<AgencyProfileModalProps> = ({
  isOpen,
  onClose,
  agency,
  currentUser,
  onSaveProfile,
  lang,
  initialTab = 'profile',
}) => {
  // Form State initialized from agency and currentUser
  const [formData, setFormData] = useState({
    // User / Agent fields
    agentName: currentUser.name || agency.ownerName || '',
    agentMobile: currentUser.mobile || agency.mobile || '',
    agentRole: (currentUser.role || 'agency_owner') as UserRole,

    // Agency fields
    agencyName: agency.name || '',
    agencyNameHi: agency.nameHi || '',
    agencyOwnerName: agency.ownerName || currentUser.name || '',
    agencyMobile: agency.mobile || currentUser.mobile || '',
    agencyEmail: agency.email || '',
    agencyAddress: agency.address || '',
    agencyCity: agency.city || '',
    agencyState: agency.state || '',
    agencyPincode: agency.pincode || '',
    agencyGstin: agency.gstin || '',
    agencyUpiId: agency.upiId || '',
    billingPolicy: agency.billingPolicy || 'calendar_days',
    primaryColor: agency.primaryColor || DEFAULT_PRIMARY_COLOR,
    themePreset: agency.themePreset || 'navy',
  });

  const [activeTab, setActiveTab] = useState<'profile' | 'agency' | 'upi' | 'theme'>(initialTab);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [backupStatus, setBackupStatus] = useState<BackupReminderStatus>(() =>
    backupReminderService.getStatus()
  );

  // Re-sync when agency or currentUser prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        agentName: currentUser.name || agency.ownerName || '',
        agentMobile: currentUser.mobile || agency.mobile || '',
        agentRole: (currentUser.role || 'agency_owner') as UserRole,
        agencyName: agency.name || '',
        agencyNameHi: agency.nameHi || '',
        agencyOwnerName: agency.ownerName || currentUser.name || '',
        agencyMobile: agency.mobile || currentUser.mobile || '',
        agencyEmail: agency.email || '',
        agencyAddress: agency.address || '',
        agencyCity: agency.city || '',
        agencyState: agency.state || '',
        agencyPincode: agency.pincode || '',
        agencyGstin: agency.gstin || '',
        agencyUpiId: agency.upiId || '',
        billingPolicy: agency.billingPolicy || 'calendar_days',
        primaryColor: agency.primaryColor || DEFAULT_PRIMARY_COLOR,
        themePreset: agency.themePreset || 'navy',
      });
      setActiveTab(initialTab);
      setBackupStatus(backupReminderService.getStatus());
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen, agency, currentUser, initialTab]);

  if (!isOpen) return null;

  const previewUpiUrl = generateUpiPaymentUrl(
    formData.agencyUpiId.trim() || 'agency@upi',
    formData.agencyName.trim() || 'Newspaper Agency',
    100,
    'Bill Payment Test'
  );

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(previewUpiUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (errorMessage) setErrorMessage('');
    if (successMessage) setSuccessMessage('');
  };

  const handleSelectThemeColor = (hexColor: string, presetId: string = 'custom') => {
    const normalized = hexColor.startsWith('#') ? hexColor : `#${hexColor}`;
    setFormData(prev => ({
      ...prev,
      primaryColor: normalized,
      themePreset: presetId,
    }));
    if (/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
      applyPrimaryTheme(normalized);
      // Immediately persist theme change to agency storage so live selection stays applied
      onSaveProfile(
        {
          ...agency,
          primaryColor: normalized,
          themePreset: presetId,
        },
        currentUser
      );
    }
    if (errorMessage) setErrorMessage('');
  };

  const handleToggleBackupReminder = (enabled: boolean) => {
    backupReminderService.saveSettings({ enabled });
    setBackupStatus(backupReminderService.getStatus());
    if (enabled) {
      backupReminderService.requestNotificationPermission().then(() => {
        setBackupStatus(backupReminderService.getStatus());
      });
    }
    setSuccessMessage(
      enabled
        ? '✓ 30-दिवसीय ऑफ़लाइन JSON बैकअप रिमाइंडर चालू कर दिया गया है!'
        : '30-दिवसीय ऑफ़लाइन बैकअप रिमाइंडर बंद कर दिया गया है।'
    );
  };

  const handleDownloadJsonBackupNow = () => {
    const result = backupReminderService.downloadOfflineJsonBackup();
    setBackupStatus(backupReminderService.getStatus());
    setSuccessMessage(
      `✓ ऑफ़लाइन बैकअप फ़ाइल (${result.filename}) डाउनलोड हो गई! अगला रिमाइंडर 30 दिन बाद मिलेगा।`
    );
  };

  const handleTestBackupNotification = async () => {
    await backupReminderService.fireLocalBrowserNotification(
      '🔒 Ajit collection - 30-दिवसीय बैकअप रिमाइंडर',
      'सुरक्षा हेतु कृपया अपने ऐप के वर्तमान डेटा का ऑफ़लाइन JSON बैकअप डाउनलोड करें।'
    );
    setBackupStatus(backupReminderService.getStatus());
    setSuccessMessage('✓ लोकल बैकअप रिमाइंडर नोटिफिकेशन भेजा गया!');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const cleanMobile = formData.agentMobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setErrorMessage(lang === 'hi' 
        ? 'कृपया मान्य 10 अंकों का एजेंट मोबाइल नंबर दर्ज करें (उदा. 9660527071)' 
        : 'Please enter a valid 10-digit mobile number');
      return;
    }

    if (!formData.agencyName.trim()) {
      setErrorMessage(lang === 'hi' ? 'कृपया एजेंसी का नाम दर्ज करें' : 'Please enter agency name');
      return;
    }

    if (!formData.agencyUpiId.trim() || !formData.agencyUpiId.includes('@')) {
      setErrorMessage(lang === 'hi' 
        ? 'कृपया मान्य UPI आईडी दर्ज करें (उदा. 9660527071@upi या name@okhdfcbank)' 
        : 'Please enter a valid UPI ID (e.g. yourname@upi)');
      return;
    }

    const validPrimaryColor = /^#[0-9A-Fa-f]{6}$/.test(formData.primaryColor.trim())
      ? formData.primaryColor.trim()
      : DEFAULT_PRIMARY_COLOR;

    applyPrimaryTheme(validPrimaryColor);

    const cleanedEmail = formData.agencyEmail.trim().toLowerCase();
    if (cleanedEmail) {
      localStorage.setItem('ajeet_user_explicit_email_linked', 'true');
    } else {
      localStorage.removeItem('ajeet_user_explicit_email_linked');
    }

    const updatedAgency: Agency = {
      ...agency,
      name: formData.agencyName.trim(),
      nameHi: formData.agencyNameHi.trim() || formData.agencyName.trim(),
      ownerName: formData.agentName.trim() || formData.agencyOwnerName.trim(),
      mobile: cleanMobile,
      email: cleanedEmail,
      address: formData.agencyAddress.trim(),
      city: formData.agencyCity.trim(),
      state: formData.agencyState.trim(),
      pincode: formData.agencyPincode.trim(),
      gstin: formData.agencyGstin.trim(),
      upiId: formData.agencyUpiId.trim(),
      billingPolicy: formData.billingPolicy as any,
      primaryColor: validPrimaryColor,
      themePreset: formData.themePreset,
    };

    const updatedUser: UserProfile = {
      ...currentUser,
      name: formData.agentName.trim(),
      mobile: cleanMobile,
      email: cleanedEmail,
      role: formData.agentRole,
    };

    onSaveProfile(updatedAgency, updatedUser);
    setSuccessMessage(lang === 'hi' 
      ? '✓ प्रोफाइल, UPI एवं ऐप थीम सेटिंग्स सफलतापूर्वक सहेज ली गईं!' 
      : '✓ Agent Profile, UPI & Theme Settings saved successfully!');

    setTimeout(() => {
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-[92vw] sm:w-full max-w-2xl max-h-[85dvh] sm:max-h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-xs border border-white/20">
              <User className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                एजेंसी प्रोफाइल एवं ऐप सेटिंग्स (Settings & Theme)
              </h3>
              <p className="text-xs text-blue-200">
                प्रोफाइल विवरण, मोबाइल नंबर, UPI कोड व ऐप का रंग (Theme) बदलें
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2.5 px-2 text-center flex items-center justify-center gap-1.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'profile'
                ? 'border-blue-900 text-blue-900 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span>प्रोफाइल</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('agency')}
            className={`flex-1 py-2.5 px-2 text-center flex items-center justify-center gap-1.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'agency'
                ? 'border-blue-900 text-blue-900 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span>एजेंसी व पता</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upi')}
            className={`flex-1 py-2.5 px-2 text-center flex items-center justify-center gap-1.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'upi'
                ? 'border-blue-900 text-blue-900 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 shrink-0" />
            <span>UPI व बिलिंग</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            className={`flex-1 py-2.5 px-2 text-center flex items-center justify-center gap-1.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'theme'
                ? 'border-blue-900 text-blue-900 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Palette className="w-3.5 h-3.5 shrink-0" />
            <span>थीम व रंग (Theme)</span>
          </button>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="mx-5 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-5 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
          
          {/* TAB 1: Agent & User Profile */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between gap-2.5">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-800 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-900">
                    चालान, रसीद व बिल पर यही नाम व संपर्क नंबर दिखाई देगा।
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('theme')}
                  className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-900 text-white text-[11px] font-bold shadow-2xs hover:bg-blue-800 transition cursor-pointer"
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>रंग बदलें</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    एजेंट / संचालक का पूरा नाम *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.agentName}
                    onChange={(e) => handleInputChange('agentName', e.target.value)}
                    placeholder="उदा. Ajeet Kumar"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    चालान व रसीद पर 'अधिकृत संचालक' के रूप में मुद्रित होगा
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    अधिकृत मोबाइल नंबर (Sign-up Mobile) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={formData.agentMobile}
                      onChange={(e) => handleInputChange('agentMobile', e.target.value.replace(/\D/g, ''))}
                      placeholder="9660527071"
                      className="w-full pl-11 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    ओटीपी लॉगिन एवं व्हाट्सएप बिल भेजने हेतु अधिकृत नंबर
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    आपकी भूमिका / पद (System Role)
                  </label>
                  <select
                    value={formData.agentRole}
                    onChange={(e) => handleInputChange('agentRole', e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="agency_owner">एजेंसी मालिक / संचालक (Agency Owner)</option>
                    <option value="manager">प्रबंधक / मैनेजर (Manager)</option>
                    <option value="supervisor">पर्यवेक्षक / सुपरवाइजर (Supervisor)</option>
                    <option value="collection_agent">कलेक्शन एजेंट (Collection Agent)</option>
                    <option value="delivery_agent">वितरण हॉकर / एजेंट (Delivery Hawker)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ईमेल आईडी (Email Address)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={formData.agencyEmail}
                      onChange={(e) => handleInputChange('agencyEmail', e.target.value)}
                      placeholder="ajeet9660527071@gmail.com"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    बैकअप रिपोर्ट एवं मासिक जीएसटी सारांश प्राप्त करने हेतु
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Agency Details */}
          {activeTab === 'agency' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    एजेंसी का नाम (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.agencyName}
                    onChange={(e) => handleInputChange('agencyName', e.target.value)}
                    placeholder="Ajeet Newspaper Agency"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    एजेंसी का नाम (हिंदी में)
                  </label>
                  <input
                    type="text"
                    value={formData.agencyNameHi}
                    onChange={(e) => handleInputChange('agencyNameHi', e.target.value)}
                    placeholder="अजीत कलेक्शन एवं न्यूज एजेंसी"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  दुकान / डिपो का पूरा पता (Street Address)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={formData.agencyAddress}
                    onChange={(e) => handleInputChange('agencyAddress', e.target.value)}
                    placeholder="मेन मार्केट रोड, क्लॉक टॉवर के पास"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    शहर / कस्बा (City)
                  </label>
                  <input
                    type="text"
                    value={formData.agencyCity}
                    onChange={(e) => handleInputChange('agencyCity', e.target.value)}
                    placeholder="Sri Ganganagar"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    राज्य (State)
                  </label>
                  <input
                    type="text"
                    value={formData.agencyState}
                    onChange={(e) => handleInputChange('agencyState', e.target.value)}
                    placeholder="Rajasthan"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    पिनकोड (Pincode)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.agencyPincode}
                    onChange={(e) => handleInputChange('agencyPincode', e.target.value.replace(/\D/g, ''))}
                    placeholder="335001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  GSTIN नंबर (वैकल्पिक / Optional)
                </label>
                <input
                  type="text"
                  value={formData.agencyGstin}
                  onChange={(e) => handleInputChange('agencyGstin', e.target.value.toUpperCase())}
                  placeholder="08AAAAA0000A1Z5"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 uppercase"
                />
              </div>
            </div>
          )}

          {/* TAB 3: UPI Code & Billing Policy */}
          {activeTab === 'upi' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  यूपीआई आईडी / स्कैनर वीपीए (UPI ID / VPA Code) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={formData.agencyUpiId}
                    onChange={(e) => handleInputChange('agencyUpiId', e.target.value)}
                    placeholder="9660527071@upi या name@okhdfcbank"
                    className="flex-1 px-3 py-2 bg-white border border-blue-400 rounded-xl text-sm font-mono font-bold text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition"
                    title="UPI लिंक कॉपी करें"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>कॉपी</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  यही UPI ID ग्राहकों के QR स्कैनर, थर्मल बिल रसीद और व्हाट्सएप पेमेंट लिंक में जाएगी।
                </p>
              </div>

              {/* Live QR Preview */}
              <div className="p-4 bg-white rounded-xl border-2 border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-32 h-32 bg-white p-2 rounded-xl border border-slate-300 shadow-xs flex flex-col items-center justify-center shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900">
                    <rect x="0" y="0" width="30" height="30" fill="currentColor" />
                    <rect x="5" y="5" width="20" height="20" fill="white" />
                    <rect x="10" y="10" width="10" height="10" fill="currentColor" />

                    <rect x="70" y="0" width="30" height="30" fill="currentColor" />
                    <rect x="75" y="5" width="20" height="20" fill="white" />
                    <rect x="80" y="10" width="10" height="10" fill="currentColor" />

                    <rect x="0" y="70" width="30" height="30" fill="currentColor" />
                    <rect x="5" y="75" width="20" height="20" fill="white" />
                    <rect x="10" y="80" width="10" height="10" fill="currentColor" />

                    <circle cx="50" cy="50" r="10" fill="currentColor" />
                    <rect x="40" y="15" width="20" height="8" fill="currentColor" />
                    <rect x="40" y="77" width="20" height="8" fill="currentColor" />
                    <rect x="15" y="40" width="8" height="20" fill="currentColor" />
                    <rect x="77" y="40" width="8" height="20" fill="currentColor" />
                  </svg>
                </div>

                <div className="text-left space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>लाइव QR कोड स्कैनर पूर्वावलोकन</span>
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-800 break-all">
                    {formData.agencyUpiId || 'ajeet9660527071@upi'}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    पेमेंट नाम: <span className="font-semibold text-slate-900">{formData.agencyName || 'Ajeet Newspaper Agency'}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    गूगल पे, फोनपे, पेटीएम एवं भीम (BHIM) से तुरंत सीधे बैंक खाते में भुगतान प्राप्त करें।
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  बिलिंग गणना नीति (Monthly Billing Calculation Policy)
                </label>
                <select
                  value={formData.billingPolicy}
                  onChange={(e) => handleInputChange('billingPolicy', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                >
                  <option value="calendar_days">माह के कुल कैलेंडर दिवस (30 / 31 दिन के हिसाब से)</option>
                  <option value="actual_delivery">केवल वास्तविक डिलीवरी दिन (हॉलीडे कटौती के बाद)</option>
                  <option value="fixed_monthly">फिक्स्ड मासिक शुल्क (फ्लैट सब्सक्रिप्शन दर)</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 4: Theme & Primary Color Customization */}
          {activeTab === 'theme' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Palette className="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-800 space-y-0.5">
                    <div className="font-bold text-blue-950">
                      ऐप का मुख्य रंग व थीम कस्टमाइज करें (Primary Theme Color)
                    </div>
                    <div className="text-[11px] text-slate-600">
                      नीचे दिए गए प्रीसेट रंगों में से चुनें या कस्टम कलर पिकर से अपनी पसंद का कोई भी रंग चुनें।
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectThemeColor(DEFAULT_PRIMARY_COLOR, 'navy')}
                  className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-semibold transition cursor-pointer shadow-2xs"
                  title="डिफ़ॉल्ट रॉयल नेवी रंग पर रीसेट करें"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>डिफ़ॉल्ट रंग</span>
                </button>
              </div>

              {/* Preset Theme Selector Grid */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  1. प्रीसेट थीम चुनें (Preset Themes)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {THEME_PRESETS.map((preset) => {
                    const isSelected =
                      formData.primaryColor.toLowerCase() === preset.primaryHex.toLowerCase();
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectThemeColor(preset.primaryHex, preset.id)}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-2 cursor-pointer relative ${
                          isSelected
                            ? 'border-blue-900 bg-blue-50/60 ring-2 ring-blue-900/20 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-6 h-6 rounded-full border border-white shadow-xs shrink-0"
                              style={{ backgroundColor: preset.primaryHex }}
                            />
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-slate-200 shrink-0"
                              style={{ backgroundColor: preset.accentHex }}
                            />
                          </div>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-blue-900 text-white flex items-center justify-center shadow-2xs">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 leading-tight">
                            {preset.nameHi}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {preset.primaryHex.toUpperCase()}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Color Picker */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  2. कस्टम कलर पिकर (Custom Color Picker)
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-2.5 flex-1">
                    <label
                      htmlFor="agency-custom-color-picker"
                      className="relative w-11 h-11 rounded-xl border-2 border-slate-300 shadow-xs overflow-hidden cursor-pointer shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: formData.primaryColor }}
                      title="रंग चुनने के लिए क्लिक करें"
                    >
                      <input
                        id="agency-custom-color-picker"
                        type="color"
                        value={
                          /^#[0-9A-Fa-f]{6}$/.test(formData.primaryColor)
                            ? formData.primaryColor
                            : DEFAULT_PRIMARY_COLOR
                        }
                        onChange={(e) => handleSelectThemeColor(e.target.value, 'custom')}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      />
                    </label>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-slate-700 mb-1">
                        Hex Color Code (उदा. #1E3A8A)
                      </div>
                      <input
                        type="text"
                        maxLength={7}
                        value={formData.primaryColor}
                        onChange={(e) => handleSelectThemeColor(e.target.value, 'custom')}
                        placeholder="#1e3a8a"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-blue-900"
                      />
                    </div>
                  </div>

                  {/* Live Theme Preview Box */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center gap-2 shrink-0">
                    <span className="px-3 py-1.5 rounded-lg bg-blue-900 text-white text-xs font-bold shadow-2xs">
                      मुख्य बटन
                    </span>
                    <span className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 text-xs font-bold">
                      बैज / टैग
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. 30-Day Scheduled Offline JSON Backup Notification Reminder */}
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        3. 30-दिवसीय ऑफ़लाइन JSON बैकअप रिमाइंडर (Security Backup Schedule)
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        डेटा सुरक्षा के लिए हर 30 दिन में ऑफ़लाइन JSON बैकअप डाउनलोड करने हेतु स्वचालित लोकल नोटिफिकेशन रिमाइंडर।
                      </p>
                    </div>
                  </div>

                  {/* Enable / Disable Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleBackupReminder(!backupStatus.settings.enabled)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 border ${
                      backupStatus.settings.enabled
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {backupStatus.settings.enabled ? '✓ रिमाइंडर चालू (ON)' : 'रिमाइंडर बंद (OFF)'}
                  </button>
                </div>

                {/* Schedule Status Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-emerald-200/80 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">अंतिम ऑफ़लाइन बैकअप:</span>
                    <span className="font-bold text-slate-900">
                      {backupStatus.lastBackupDateFormatted || 'अभी तक नहीं'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-emerald-200/80 flex items-center justify-between">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>अगला 30-दिन रिमाइंडर:</span>
                    </span>
                    <span className="font-bold text-emerald-800">
                      {backupStatus.settings.enabled
                        ? `${backupStatus.nextReminderDateFormatted} (${backupStatus.daysUntilNextReminder} दिन शेष)`
                        : 'बंद है (Disabled)'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons: Download JSON Backup Now & Test Local Notification */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadJsonBackupNow}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>अभी ऑफ़लाइन JSON बैकअप डाउनलोड करें</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestBackupNotification}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-semibold transition cursor-pointer"
                    title="लोकल नोटिफिकेशन रिमाइंडर की जांच करें"
                  >
                    <Bell className="w-3.5 h-3.5 text-emerald-600" />
                    <span>टेस्ट रिमाइंडर भेजें</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                // Quick reset to current values
                setFormData({
                  agentName: currentUser.name || agency.ownerName || '',
                  agentMobile: currentUser.mobile || agency.mobile || '',
                  agentRole: (currentUser.role || 'agency_owner') as UserRole,
                  agencyName: agency.name || '',
                  agencyNameHi: agency.nameHi || '',
                  agencyOwnerName: agency.ownerName || currentUser.name || '',
                  agencyMobile: agency.mobile || currentUser.mobile || '',
                  agencyEmail: agency.email || '',
                  agencyAddress: agency.address || '',
                  agencyCity: agency.city || '',
                  agencyState: agency.state || '',
                  agencyPincode: agency.pincode || '',
                  agencyGstin: agency.gstin || '',
                  agencyUpiId: agency.upiId || '',
                  billingPolicy: agency.billingPolicy || 'calendar_days',
                  primaryColor: agency.primaryColor || DEFAULT_PRIMARY_COLOR,
                  themePreset: agency.themePreset || 'navy',
                });
                applyPrimaryTheme(agency.primaryColor || DEFAULT_PRIMARY_COLOR);
                setErrorMessage('');
              }}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>बदलाव रद्द करें (Reset)</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                बंद करें
              </button>

              <button
                type="submit"
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-xs font-bold text-white flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>सेटिंग्स सुरक्षित करें (Save)</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
