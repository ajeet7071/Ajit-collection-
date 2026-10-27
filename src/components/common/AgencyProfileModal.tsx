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
  Sparkles
} from 'lucide-react';
import { Agency, UserProfile, UserRole, Language } from '../../types';
import { generateUpiPaymentUrl } from '../../services/paymentService';

interface AgencyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  agency: Agency;
  currentUser: UserProfile;
  onSaveProfile: (updatedAgency: Agency, updatedUser: UserProfile) => void;
  lang: Language;
}

export const AgencyProfileModal: React.FC<AgencyProfileModalProps> = ({
  isOpen,
  onClose,
  agency,
  currentUser,
  onSaveProfile,
  lang,
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
  });

  const [activeTab, setActiveTab] = useState<'profile' | 'agency' | 'upi'>('profile');
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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
      });
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen, agency, currentUser]);

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

    const updatedAgency: Agency = {
      ...agency,
      name: formData.agencyName.trim(),
      nameHi: formData.agencyNameHi.trim() || formData.agencyName.trim(),
      ownerName: formData.agentName.trim() || formData.agencyOwnerName.trim(),
      mobile: cleanMobile,
      email: formData.agencyEmail.trim(),
      address: formData.agencyAddress.trim(),
      city: formData.agencyCity.trim(),
      state: formData.agencyState.trim(),
      pincode: formData.agencyPincode.trim(),
      gstin: formData.agencyGstin.trim(),
      upiId: formData.agencyUpiId.trim(),
      billingPolicy: formData.billingPolicy as any,
    };

    const updatedUser: UserProfile = {
      ...currentUser,
      name: formData.agentName.trim(),
      mobile: cleanMobile,
      role: formData.agentRole,
    };

    onSaveProfile(updatedAgency, updatedUser);
    setSuccessMessage(lang === 'hi' 
      ? '✓ एजेंट व एजेंसी प्रोफाइल और UPI कोड सफलतापूर्वक सहेज लिए गए!' 
      : '✓ Agent & Agency Profile saved successfully!');

    setTimeout(() => {
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-[92vw] sm:w-full max-w-2xl max-h-[85dvh] sm:max-h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-xs border border-white/20">
              <User className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                एजेंट एवं एजेंसी प्रोफाइल (Edit Agent Profile & UPI)
              </h3>
              <p className="text-xs text-blue-200">
                साइन अप विवरण, मोबाइल नंबर, एजेंसी नाम व UPI कोड एडिट करें
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 px-2 text-center flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeTab === 'profile'
                ? 'border-blue-900 text-blue-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>एजेंट प्रोफाइल (Agent)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('agency')}
            className={`flex-1 py-3 px-2 text-center flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeTab === 'agency'
                ? 'border-blue-900 text-blue-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>एजेंसी व पता (Agency)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upi')}
            className={`flex-1 py-3 px-2 text-center flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeTab === 'upi'
                ? 'border-blue-900 text-blue-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>UPI कोड व बिलिंग (UPI & QR)</span>
          </button>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-5 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
          
          {/* TAB 1: Agent & User Profile */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-800 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900">
                  यह वह प्रोफाइल जानकारी है जो आपने साइन अप करते समय दी थी। इसे अपडेट करने पर आपके सभी चालान, रसीद व बिल पर यही नाम व संपर्क नंबर दिखाई देगा।
                </div>
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
                });
                setErrorMessage('');
              }}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>बदलाव रद्द करें (Reset)</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                बंद करें
              </button>

              <button
                type="submit"
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-xs font-bold text-white flex items-center justify-center gap-2 shadow-md transition"
              >
                <Save className="w-4 h-4" />
                <span>प्रोफाइल सुरक्षित करें (Save Profile)</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
