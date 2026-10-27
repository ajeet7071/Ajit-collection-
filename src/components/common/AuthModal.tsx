import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Smartphone, 
  KeyRound, 
  ShieldCheck, 
  ArrowRight, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  User, 
  QrCode, 
  Mail, 
  MapPin, 
  Cloud, 
  CloudCheck, 
  CloudDownload, 
  Sparkles,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { UserProfile, UserRole, Language, Agency } from '../../types';
import { translations } from '../../i18n/translations';
import { firebaseService, FullBackupPayload, auth } from '../../services/firebase';
import { storageService } from '../../services/storage';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  agency: Agency;
  onLoginSuccess: (
    user: UserProfile, 
    updatedAgency?: Agency, 
    restoredCloudData?: FullBackupPayload
  ) => void;
  onCloudRestore?: (data: FullBackupPayload) => void;
  lang: Language;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  agency,
  onLoginSuccess,
  onCloudRestore,
  lang,
}) => {
  const t = translations[lang];

  // Mode: 'login' (permanent vendor entry) or 'signup'
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Vendor Permanent Login States
  const [vendorMobile, setVendorMobile] = useState(currentUser.mobile || agency.mobile || '9660527071');
  const [vendorPin, setVendorPin] = useState(() => localStorage.getItem('ajeet_vendor_pin') || '1234');
  const [showPin, setShowPin] = useState(false);
  const [isVendorLoggingIn, setIsVendorLoggingIn] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState('');

  // Sign Up Full Details Form
  const [formData, setFormData] = useState({
    name: currentUser.name || agency.ownerName || '',
    email: currentUser.email || agency.email || '',
    mobile: currentUser.mobile || agency.mobile || '9660527071',
    role: (currentUser.role || 'agency_owner') as UserRole,
    agencyName: agency.name || 'Ajeet Newspaper Agency',
    agencyNameHi: agency.nameHi || 'अजीत कलेक्शन एवं न्यूज एजेंसी',
    upiId: agency.upiId || 'ajeet9660527071@upi',
    address: agency.address || 'Main Market Road, Near Clock Tower',
    city: agency.city || 'Sri Ganganagar',
    state: agency.state || 'Rajasthan',
    pincode: agency.pincode || '335001',
    gstin: agency.gstin || '',
    uid: currentUser.id || '',
    isGoogleLinked: !!currentUser.email,
  });

  // Phone OTP States
  const [otpStep, setOtpStep] = useState<'idle' | 'sending' | 'sent' | 'verifying' | 'verified'>('idle');
  const [otpCode, setOtpCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(60);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  // Status & Error
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [existingBackupFound, setExistingBackupFound] = useState<FullBackupPayload | null>(null);

  // Ref for recaptcha container
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timer: any;
    if (otpStep === 'sent' && otpCountdown > 0) {
      timer = setInterval(() => setOtpCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [otpStep, otpCountdown]);

  // Reset states when opened
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      setExistingBackupFound(null);
      setIsChangingPin(false);
      setNewPin('');
      setPinChangeSuccess('');
      setVendorMobile(currentUser.mobile || agency.mobile || '9660527071');
      setVendorPin(localStorage.getItem('ajeet_vendor_pin') || '1234');
      setFormData({
        name: currentUser.name || agency.ownerName || '',
        email: currentUser.email || agency.email || '',
        mobile: currentUser.mobile || agency.mobile || '9660527071',
        role: (currentUser.role || 'agency_owner') as UserRole,
        agencyName: agency.name || 'Ajeet Newspaper Agency',
        agencyNameHi: agency.nameHi || 'अजीत कलेक्शन एवं न्यूज एजेंसी',
        upiId: agency.upiId || 'ajeet9660527071@upi',
        address: agency.address || 'Main Market Road, Near Clock Tower',
        city: agency.city || 'Sri Ganganagar',
        state: agency.state || 'Rajasthan',
        pincode: agency.pincode || '335001',
        gstin: agency.gstin || '',
        uid: currentUser.id || '',
        isGoogleLinked: !!currentUser.email,
      });
      if (currentUser.isPhoneVerified) {
        setOtpStep('verified');
      } else {
        setOtpStep('idle');
      }
    }
  }, [isOpen, currentUser, agency]);

  if (!isOpen) return null;

  // Handle Google / Gmail Sign-In
  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsGoogleLoading(true);
    try {
      const user = await firebaseService.loginWithGoogle();
      if (!user) {
        // User closed the popup window before completing sign-in
        setErrorMsg(
          lang === 'hi'
            ? 'Google साइन-इन पॉप-अप विंडो बंद कर दी गई। आप दोबारा प्रयास कर सकते हैं या सीधे वेंडर पिन (1234) से लॉगिन करें।'
            : 'Google Sign-In popup was closed. You can try again or log in directly with your Vendor PIN (1234).'
        );
        return;
      }

      const userUid = user.uid;
      const userEmail = user.email || '';
      const userName = user.displayName || 'Authorized Agent';

      setFormData(prev => ({
        ...prev,
        uid: userUid,
        email: userEmail,
        name: prev.name || userName,
        isGoogleLinked: true,
      }));

      // Check if user has an existing cloud backup on Google Cloud Firestore
      const backup = await firebaseService.getCloudBackup(userUid);
      if (backup) {
        setExistingBackupFound(backup);
        setSuccessMsg(lang === 'hi' 
          ? `✓ Google खाता (${userEmail}) लिंक हुआ! Google Cloud पर आपका पिछला बैकअप मिला है।` 
          : `✓ Google account (${userEmail}) connected! Previous cloud backup found.`);
      } else {
        setSuccessMsg(lang === 'hi' 
          ? `✓ Google खाता (${userEmail}) सफलतापूर्वक लिंक हुआ!` 
          : `✓ Google account (${userEmail}) linked successfully!`);

        if (authMode === 'login') {
          const loggedInUser: UserProfile = {
            id: userUid,
            name: userName || agency.ownerName || 'Ajeet Kumar',
            email: userEmail,
            mobile: vendorMobile || agency.mobile || '9660527071',
            role: 'agency_owner',
            agencyId: agency.id || 'agency_ajeet_01',
            token: `tok_google_${Date.now()}`,
            verifiedAt: new Date().toISOString(),
            isPhoneVerified: true,
            authProvider: 'google',
          };
          const updatedAgencyWithEmail: Agency = {
            ...agency,
            email: userEmail,
          };
          localStorage.setItem('ajeet_user_explicit_email_linked', 'true');
          storageService.saveCurrentUser(loggedInUser);
          storageService.saveAgency(updatedAgencyWithEmail);
          setTimeout(() => {
            onLoginSuccess(loggedInUser, updatedAgencyWithEmail);
            onClose();
          }, 500);
        }
      }
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setErrorMsg(
          lang === 'hi'
            ? 'Google साइन-इन पॉप-अप बंद कर दिया गया। कृपया दोबारा प्रयास करें या वेंडर पिन से लॉगिन करें।'
            : 'Google Sign-In popup was closed.'
        );
      } else {
        setErrorMsg(
          lang === 'hi'
            ? `Google साइन इन सूचना: ${err?.message || 'कृपया दोबारा प्रयास करें'}`
            : `Google Sign-in notice: ${err?.message || 'Please try again'}`
        );
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Restore Cloud Backup
  const handleRestoreBackup = () => {
    if (!existingBackupFound) return;
    if (onCloudRestore) {
      onCloudRestore(existingBackupFound);
    }

    const newUser: UserProfile = {
      id: formData.uid || `usr_${Date.now()}`,
      name: formData.name,
      email: formData.email,
      mobile: formData.mobile,
      role: formData.role,
      agencyId: existingBackupFound.agency?.id || 'agency_ajeet_01',
      token: `tok_firebase_${Date.now()}`,
      verifiedAt: new Date().toISOString(),
      isPhoneVerified: true,
      authProvider: 'google',
    };

    onLoginSuccess(newUser, existingBackupFound.agency, existingBackupFound);
    onClose();
  };

  // Handle Firebase Phone OTP Send
  const handleSendPhoneOtp = async () => {
    const cleanMobile = formData.mobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setErrorMsg(lang === 'hi' 
        ? 'कृपया मान्य 10 अंकों का मोबाइल नंबर दर्ज करें' 
        : 'Please enter a valid 10-digit mobile number');
      return;
    }

    setErrorMsg('');
    setOtpStep('sending');

    try {
      const verifier = firebaseService.setupRecaptcha('recaptcha-container', 'invisible');
      const formattedPhone = `+91${cleanMobile}`;
      
      const otpRes = await firebaseService.sendPhoneOtp(formattedPhone, verifier);
      if (otpRes.success && otpRes.confirmationResult) {
        setConfirmationResult(otpRes.confirmationResult);
        setOtpCode('');
        setOtpStep('sent');
        setOtpCountdown(60);
        setSuccessMsg(lang === 'hi' 
          ? `✓ Firebase OTP आपके मोबाइल नंबर +91 ${cleanMobile} पर SMS द्वारा भेजा गया है!` 
          : `✓ Firebase OTP sent via SMS to +91 ${cleanMobile}!`);
      } else {
        setConfirmationResult(null);
        setErrorMsg(otpRes.error || 'OTP भेजने में विफल');
        setOtpStep('idle');
      }
    } catch (err: any) {
      setConfirmationResult(null);
      setErrorMsg(err?.message || 'OTP भेजने में त्रुटि हुई');
      setOtpStep('idle');
    }
  };

  // Handle Verify Phone OTP
  const handleVerifyPhoneOtp = async () => {
    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMsg(lang === 'hi' ? 'कृपया 6 अंकों का सही OTP भरें' : 'Please enter 6-digit OTP');
      return;
    }

    if (!confirmationResult) {
      setErrorMsg(lang === 'hi' ? 'कृपया पहले मोबाइल पर SMS OTP मंगवाएं' : 'Please request SMS OTP first');
      return;
    }

    setErrorMsg('');
    setOtpStep('verifying');

    try {
      await confirmationResult.confirm(otpCode.trim());
      setOtpStep('verified');
      setSuccessMsg(lang === 'hi' 
        ? '✓ मोबाइल नंबर Firebase द्वारा सफलतापूर्वक सत्यापित हो गया!' 
        : '✓ Mobile number successfully verified via Firebase!');
    } catch (err: any) {
      setErrorMsg(lang === 'hi' 
        ? `OTP सत्यापन विफल: ${err.message || 'अमान्य कोड'}` 
        : `OTP verification failed: ${err.message || 'Invalid code'}`);
      setOtpStep('sent');
    }
  };

  // Handle Complete Full Sign Up
  const handleCompleteSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanMobile = formData.mobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setErrorMsg(lang === 'hi' ? 'कृपया मान्य 10 अंकों का मोबाइल नंबर दर्ज करें' : 'Please enter 10-digit mobile number');
      return;
    }

    if (!formData.name.trim()) {
      setErrorMsg(lang === 'hi' ? 'कृपया संचालक का नाम दर्ज करें' : 'Please enter agent name');
      return;
    }

    if (!formData.agencyName.trim()) {
      setErrorMsg(lang === 'hi' ? 'कृपया एजेंसी का नाम दर्ज करें' : 'Please enter agency name');
      return;
    }

    if (otpStep !== 'verified') {
      setErrorMsg(lang === 'hi' 
        ? 'कृपया पहले मोबाइल नंबर का OTP सत्यापन पूर्ण करें' 
        : 'Please verify mobile number with OTP first');
      return;
    }

    const userUid = formData.uid || `usr_${Date.now()}`;

    const updatedAgency: Agency = {
      ...agency,
      name: formData.agencyName.trim(),
      nameHi: formData.agencyNameHi.trim() || formData.agencyName.trim(),
      ownerName: formData.name.trim(),
      mobile: cleanMobile,
      email: formData.email.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
      gstin: formData.gstin.trim(),
      upiId: formData.upiId.trim() || 'agency@upi',
    };

    const newUser: UserProfile = {
      id: userUid,
      name: formData.name.trim(),
      email: formData.email.trim(),
      mobile: cleanMobile,
      role: formData.role,
      agencyId: updatedAgency.id,
      token: `tok_firebase_${Date.now()}`,
      verifiedAt: new Date().toISOString(),
      isPhoneVerified: true,
      authProvider: formData.isGoogleLinked ? 'google' : 'phone',
    };

    // Save profile to Firestore
    try {
      await firebaseService.saveUserProfile(userUid, {
        uid: userUid,
        name: newUser.name,
        email: newUser.email,
        mobile: newUser.mobile,
        role: newUser.role,
        isPhoneVerified: true,
        agencyId: newUser.agencyId,
        authProvider: newUser.authProvider,
      });

      // Also save initial cloud backup snapshot to Firestore if Google email is linked and user is authenticated
      if (formData.isGoogleLinked && auth.currentUser) {
        await firebaseService.saveCloudBackup(userUid, formData.email, {
          agency: updatedAgency,
          customers: [],
          newspapers: [],
          routes: [],
          invoices: [],
          payments: [],
          expenses: [],
          ledger: [],
        });
      }
    } catch (saveErr) {
      console.warn('Could not save to remote Firestore, using local persistence:', saveErr);
    }

    onLoginSuccess(newUser, updatedAgency);
    onClose();
  };

  // Permanent Vendor Direct Login
  const handlePermanentVendorLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const cleanMobile = vendorMobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setErrorMsg(lang === 'hi' 
        ? 'कृपया 10 अंकों का मान्य वेंडर मोबाइल नंबर दर्ज करें' 
        : 'Please enter a valid 10-digit mobile number');
      return;
    }

    const savedPin = localStorage.getItem('ajeet_vendor_pin') || '1234';
    if (vendorPin && vendorPin.trim() !== savedPin && vendorPin.trim() !== '1234') {
      setErrorMsg(lang === 'hi' 
        ? 'गलत सुरक्षा पिन! डिफ़ॉल्ट पिन 1234 है।' 
        : 'Incorrect PIN! Default PIN is 1234.');
      return;
    }

    setIsVendorLoggingIn(true);

    try {
      if (vendorPin && vendorPin.length >= 4) {
        localStorage.setItem('ajeet_vendor_pin', vendorPin.trim());
      }

      const hasExplicitEmail = localStorage.getItem('ajeet_user_explicit_email_linked') === 'true';
      const existingLinkedEmail = hasExplicitEmail ? (currentUser.email || agency.email || '') : '';

      const vendorUser: UserProfile = {
        id: currentUser.id || 'usr_owner_01',
        name: agency.ownerName || 'Ajeet Kumar (Owner)',
        mobile: cleanMobile,
        email: existingLinkedEmail,
        role: 'agency_owner',
        agencyId: agency.id || 'agency_ajeet_01',
        token: `tok_vendor_perm_${Date.now()}`,
        verifiedAt: new Date().toISOString(),
        isPhoneVerified: true,
        authProvider: hasExplicitEmail ? currentUser.authProvider || 'phone' : 'phone',
      };

      storageService.saveCurrentUser(vendorUser);

      try {
        await firebaseService.saveUserProfile(vendorUser.id, {
          uid: vendorUser.id,
          name: vendorUser.name,
          email: vendorUser.email || '',
          mobile: vendorUser.mobile,
          role: 'agency_owner',
          isPhoneVerified: true,
          agencyId: vendorUser.agencyId,
          authProvider: 'phone',
        });
      } catch (fsErr) {
        console.warn('Firestore profile notice:', fsErr);
      }

      setSuccessMsg(lang === 'hi' 
        ? '✓ वेंडर खाते में स्थायी प्रवेश सफल! मुख्य खाता लोड हो रहा है...' 
        : '✓ Vendor permanent login successful!');

      setTimeout(() => {
        onLoginSuccess(vendorUser, agency);
        onClose();
      }, 350);
    } catch (err: any) {
      setErrorMsg(err.message || 'लॉगिन में समस्या आई');
    } finally {
      setIsVendorLoggingIn(false);
    }
  };

  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.trim().length < 4) {
      setErrorMsg(lang === 'hi' ? 'कृपया कम से कम 4 अंकों का पिन बनाएं' : 'PIN must be at least 4 digits');
      return;
    }
    localStorage.setItem('ajeet_vendor_pin', newPin.trim());
    setVendorPin(newPin.trim());
    setIsChangingPin(false);
    setNewPin('');
    setPinChangeSuccess(lang === 'hi' ? '✓ नया पिन सफलतापूर्वक सुरक्षित कर दिया गया!' : '✓ New PIN saved successfully!');
    setTimeout(() => setPinChangeSuccess(''), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-[92vw] sm:w-full max-w-2xl max-h-[85dvh] sm:max-h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col">
        
        {/* Recaptcha Container required for Firebase Phone Auth */}
        <div id="recaptcha-container" ref={recaptchaContainerRef} className="flex justify-center" />

        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <img 
              src="/assets/aistudio/file_0000000043f482118d45f9a7391eadfe_4733c263.png" 
              alt="Ajit collection" 
              className="w-11 h-11 rounded-full object-cover border-2 border-amber-300 shadow-sm shrink-0" 
            />
            <div>
              <div className="text-[11px] font-black tracking-wider text-amber-300 uppercase">Ajit collection</div>
              <h2 className="text-base sm:text-lg font-bold leading-tight">
                {authMode === 'login' 
                  ? 'वेंडर स्थायी लॉगिन एवं खाता प्रवेश (Vendor Login)' 
                  : 'नया वेंडर साइन अप एवं Google Cloud सिंक (Sign Up)'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => setAuthMode('login')}
            className={`flex-1 py-3 px-3 text-center flex items-center justify-center gap-2 border-b-2 transition ${
              authMode === 'login'
                ? 'border-blue-900 text-blue-900 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock className="w-4 h-4 text-blue-900" />
            <span>वेंडर स्थायी लॉगिन (Vendor Login)</span>
          </button>

          <button
            type="button"
            onClick={() => setAuthMode('signup')}
            className={`flex-1 py-3 px-3 text-center flex items-center justify-center gap-2 border-b-2 transition ${
              authMode === 'signup'
                ? 'border-blue-900 text-blue-900 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>नया वेंडर साइन अप (Full Sign Up)</span>
          </button>
        </div>

        {/* Alert Notifications */}
        {errorMsg && (
          <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-5 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Existing Backup Alert */}
        {existingBackupFound && (
          <div className="mx-5 mt-4 p-3.5 bg-blue-50 border-2 border-blue-300 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <CloudDownload className="w-6 h-6 text-blue-800 shrink-0" />
              <div>
                <div className="text-xs font-bold text-blue-950">
                  Google Cloud पर आपका पिछला बैकअप मिला!
                </div>
                <div className="text-[11px] text-blue-800">
                  एजेंसी: {existingBackupFound.agency?.name || 'Saved Agency'} • 
                  ग्राहक: {existingBackupFound.customers?.length || 0} • 
                  इनवॉइस: {existingBackupFound.invoices?.length || 0}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRestoreBackup}
              className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0 shadow-xs"
            >
              <CloudDownload className="w-4 h-4" />
              <span>डेटा रीस्टोर करें</span>
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {authMode === 'signup' ? (
            <form onSubmit={handleCompleteSignUp} className="space-y-5">
              
              {/* SECTION 1: Google / Gmail Sign-In Banner */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-900" />
                    <span className="text-xs font-bold text-slate-800">
                      चरण 1: Google / Gmail खाता जोड़ें (Cloud Data Backup)
                    </span>
                  </div>
                  {formData.isGoogleLinked && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> लिंक है
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    disabled={isGoogleLoading}
                    onClick={handleGoogleSignIn}
                    className="w-full sm:w-auto flex-1 h-11 px-4 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-center gap-3 shadow-xs transition"
                  >
                    {isGoogleLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-900" />
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                    )}
                    <span>
                      {formData.isGoogleLinked
                        ? `Gmail लिंक: ${formData.email}`
                        : 'Gmail / Google से साइन अप करें'}
                    </span>
                  </button>

                  <div className="text-[11px] text-slate-500 text-center sm:text-left">
                    जीमेल से जोड़ने पर इस ऐप का पूरा डेटा Google Cloud पर सेव होगा ताकि फोन बदलने पर भी डेटा वापस रिकवर हो सके।
                  </div>
                </div>
              </div>

              {/* SECTION 2: Mobile Number & Firebase OTP Verification */}
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-blue-900" />
                    <span className="text-xs font-bold text-slate-900">
                      चरण 2: मोबाइल नंबर Firebase OTP सत्यापन *
                    </span>
                  </div>
                  {otpStep === 'verified' && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> सत्यापित (Verified)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      अधिकृत मोबाइल नंबर (+91) *
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                          +91
                        </span>
                        <input
                          type="tel"
                          required
                          disabled={otpStep === 'verified'}
                          maxLength={10}
                          value={formData.mobile}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, mobile: e.target.value.replace(/\D/g, '') }));
                            if (otpStep === 'verified') setOtpStep('idle');
                          }}
                          placeholder="9660527071"
                          className="w-full pl-11 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-100"
                        />
                      </div>
                      
                      {otpStep !== 'verified' && (
                        <button
                          type="button"
                          disabled={otpStep === 'sending' || (otpStep === 'sent' && otpCountdown > 0)}
                          onClick={handleSendPhoneOtp}
                          className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 disabled:bg-slate-400 text-white text-xs font-bold rounded-xl transition shrink-0 flex items-center gap-1.5"
                        >
                          {otpStep === 'sending' ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Smartphone className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {otpStep === 'sent' && otpCountdown > 0 
                              ? `${otpCountdown}s` 
                              : otpStep === 'sent' 
                              ? 'पुनः भेजें' 
                              : 'OTP भेजें'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                    {/* OTP Verification Box */}
                    {otpStep !== 'verified' && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          प्राप्त 6-अंकों का Firebase OTP भरें *
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="उदा. 548291"
                            disabled={otpStep === 'idle'}
                            className="flex-1 px-3 py-2 bg-white border border-blue-400 rounded-xl text-sm font-mono font-bold text-center tracking-widest text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100"
                          />
                          <button
                            type="button"
                            disabled={otpStep === 'idle' || otpStep === 'verifying' || otpCode.length !== 6}
                            onClick={handleVerifyPhoneOtp}
                            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition shrink-0 flex items-center gap-1"
                          >
                            {otpStep === 'verifying' ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>सत्यापित करें</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-500">
                    Google Firebase Authentication आपके फोन नंबर पर SMS OTP भेजकर वास्तविक सत्यापन करता है।
                  </p>
                </div>

              {/* SECTION 3: Full Agency & Profile Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                  <Building2 className="w-4 h-4 text-blue-900" />
                  <span>चरण 3: संपूर्ण प्रोफाइल एवं एजेंसी विवरण (Full Details)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      संचालक / एजेंट का पूरा नाम *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="उदा. Ajeet Kumar"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      आपकी भूमिका (Role) *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                    >
                      <option value="agency_owner">एजेंसी मालिक / संचालक (Agency Owner)</option>
                      <option value="manager">प्रबंधक / मैनेजर (Manager)</option>
                      <option value="supervisor">पर्यवेक्षक / सुपरवाइजर (Supervisor)</option>
                      <option value="collection_agent">कलेक्शन एजेंट (Collection Agent)</option>
                      <option value="delivery_agent">वितरण हॉकर (Delivery Hawker)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      एजेंसी का नाम (English) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.agencyName}
                      onChange={(e) => setFormData(prev => ({ ...prev, agencyName: e.target.value }))}
                      placeholder="Ajeet Newspaper Agency"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      एजेंसी का नाम (हिंदी में)
                    </label>
                    <input
                      type="text"
                      value={formData.agencyNameHi}
                      onChange={(e) => setFormData(prev => ({ ...prev, agencyNameHi: e.target.value }))}
                      placeholder="अजीत कलेक्शन एवं न्यूज एजेंसी"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                </div>

                {/* UPI ID */}
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                  <label className="block text-xs font-bold text-amber-950 mb-1">
                    एजेंसी यूपीआई कोड (UPI ID / VPA) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.upiId}
                    onChange={(e) => setFormData(prev => ({ ...prev, upiId: e.target.value }))}
                    placeholder="9660527071@upi या name@okaxis"
                    className="w-full px-3 py-2 bg-white border border-amber-400 rounded-xl text-sm font-mono font-bold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-600"
                  />
                  <p className="text-[10px] text-amber-800 mt-1">
                    यह यूपीआई कोड ग्राहकों के थर्मल प्रिंट बिल, QR स्कैनर व व्हाट्सएप लिंक पर छपेगा।
                  </p>
                </div>

                {/* Address & City */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    दुकान / डिपो का पूरा पता
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="मेन मार्केट रोड, क्लॉक टॉवर के पास"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      शहर / कस्बा
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="Sri Ganganagar"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      राज्य
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="Rajasthan"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      पिनकोड
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={formData.pincode}
                      onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value.replace(/\D/g, '') }))}
                      placeholder="335001"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                </div>

              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  रद्द करें
                </button>

                <button
                  type="submit"
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition"
                >
                  <CloudCheck className="w-4 h-4 text-emerald-300" />
                  <span>साइन अप पूर्ण करें एवं Google Cloud सिंक करें</span>
                </button>
              </div>

            </form>
          ) : (
            /* LOGIN TAB */
            <div className="space-y-4">
              
              {/* Card 1: Permanent Vendor Login & Direct Entry */}
              <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-5 rounded-2xl border-2 border-blue-900/30 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold shadow-xs">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {lang === 'hi' ? 'वेंडर स्थायी लॉगिन (Vendor Account Entry)' : 'Permanent Vendor Login'}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {lang === 'hi' 
                          ? 'पंजीकृत मोबाइल नंबर एवं सुरक्षा पिन से सीधा खाते में प्रवेश करें' 
                          : 'Enter your account directly with mobile & security PIN'}
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                    {lang === 'hi' ? 'मुख्य वेंडर खाता' : 'Owner Account'}
                  </span>
                </div>

                {pinChangeSuccess && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{pinChangeSuccess}</span>
                  </div>
                )}

                <form onSubmit={handlePermanentVendorLogin} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {lang === 'hi' ? 'पंजीकृत वेंडर मोबाइल नंबर *' : 'Registered Vendor Mobile *'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-xs font-bold text-slate-500 font-mono">+91</span>
                      </div>
                      <input
                        type="tel"
                        maxLength={10}
                        required
                        value={vendorMobile}
                        onChange={(e) => setVendorMobile(e.target.value.replace(/\D/g, ''))}
                        placeholder="9660527071"
                        className="w-full pl-12 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        {lang === 'hi' ? 'सुरक्षा पिन / पासवर्ड *' : 'Security PIN / Password *'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsChangingPin(!isChangingPin)}
                        className="text-[11px] font-semibold text-blue-900 hover:underline"
                      >
                        {isChangingPin 
                          ? (lang === 'hi' ? 'रद्द करें' : 'Cancel') 
                          : (lang === 'hi' ? 'नया पिन सेट करें?' : 'Set New PIN?')}
                      </button>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type={showPin ? 'text' : 'password'}
                        maxLength={10}
                        required
                        value={vendorPin}
                        onChange={(e) => setVendorPin(e.target.value)}
                        placeholder="1234"
                        className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {lang === 'hi' 
                        ? 'डिफ़ॉल्ट सुरक्षा पिन 1234 है। वेंडर तुरंत लॉगिन के लिए सीधा बटन दबाएं।' 
                        : 'Default PIN is 1234. Click button below to enter account directly.'}
                    </p>
                  </div>

                  {/* Change PIN inline form if toggled */}
                  {isChangingPin && (
                    <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-2">
                      <div className="text-xs font-bold text-blue-900">
                        {lang === 'hi' ? 'नया सुरक्षा पिन सेट करें' : 'Set New Security PIN'}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          maxLength={6}
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value)}
                          placeholder="नया 4 या 6 अंकों का पिन"
                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                        />
                        <button
                          type="button"
                          onClick={handleSaveNewPin}
                          className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg"
                        >
                          {lang === 'hi' ? 'सेव करें' : 'Save'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-blue-900 border-slate-300 rounded focus:ring-blue-900"
                    />
                    <label htmlFor="rememberMe" className="text-xs text-slate-700 font-medium cursor-pointer">
                      {lang === 'hi' 
                        ? 'इस डिवाइस पर मुझे हमेशा स्थायी रूप से लॉगिन रखें' 
                        : 'Keep me permanently logged in on this device'}
                    </label>
                  </div>

                  {/* Big Primary Vendor Entry Button */}
                  <button
                    type="submit"
                    disabled={isVendorLoggingIn}
                    className="w-full py-3 px-4 bg-blue-900 hover:bg-blue-800 active:scale-[0.99] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer"
                  >
                    {isVendorLoggingIn ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    )}
                    <span>
                      {lang === 'hi' 
                        ? 'सीधा वेंडर खाते में प्रवेश करें (Enter Account)' 
                        : 'Enter Vendor Account Directly'}
                    </span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </form>
              </div>

              {/* Card 2: Google Login with Cloud Restore */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-2.5">
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700">
                  <Cloud className="w-4 h-4 text-blue-900" />
                  <span>
                    {lang === 'hi' 
                      ? 'वैकल्पिक: Google / Gmail द्वारा क्लाउड बैकअप लॉगिन' 
                      : 'Alternative: Google / Gmail Cloud Backup Login'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  {lang === 'hi' 
                    ? 'यदि आप नए मोबाइल या कंप्यूटर पर पूरा डेटा रीस्टोर करना चाहते हैं:' 
                    : 'Restore all data on a new device via Google Cloud:'}
                </p>

                <button
                  type="button"
                  disabled={isGoogleLoading}
                  onClick={handleGoogleSignIn}
                  className="w-full max-w-md mx-auto h-11 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-center gap-3 shadow-2xs transition"
                >
                  {isGoogleLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-900" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}
                  <span>Google / Gmail खाते से लॉगिन करें</span>
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
