import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { ConfirmationResult } from 'firebase/auth';
import { Agency, UserProfile, Language } from '../../types';
import {
  firebaseService,
  FullBackupPayload
} from '../../services/firebase';
import { storageService } from '../../services/storage';

interface OtpLoginPageProps {
  agency: Agency;
  currentUser: UserProfile;
  lang: Language;
  onLoginVerified: (
    user: UserProfile,
    updatedAgency?: Agency,
    restoredBackup?: FullBackupPayload
  ) => void;
}

export const OtpLoginPage: React.FC<OtpLoginPageProps> = ({
  agency,
  currentUser,
  onLoginVerified,
}) => {
  const [mobileNumber, setMobileNumber] = useState(
    currentUser.mobile || agency.mobile || ''
  );

  const [otpStep, setOtpStep] = useState<'enter_mobile' | 'sending' | 'verify_otp' | 'verifying'>(
    'enter_mobile'
  );
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  useEffect(() => {
    if (otpStep === 'verify_otp' && countdown > 0) {
      const timer = window.setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => window.clearInterval(timer);
    }
  }, [otpStep, countdown]);

  // Step 1: Send Real SMS OTP to Mobile Number via Firebase Authentication
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const cleanMobile = mobileNumber.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setErrorMsg('कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें (उदा. 7340187071)');
      return;
    }

    setOtpStep('sending');
    setOtpCode('');

    try {
      const verifier = firebaseService.setupRecaptcha('firebase-login-recaptcha-box', 'invisible');
      const fullPhone = `+91${cleanMobile}`;
      const res = await firebaseService.sendPhoneOtp(fullPhone, verifier);

      if (res.success && res.confirmationResult) {
        setConfirmationResult(res.confirmationResult);
        setOtpCode('');
        setCountdown(60);
        setOtpStep('verify_otp');
        setInfoMsg(
          `✓ आपके मोबाइल नंबर +91 ${cleanMobile} पर SMS द्वारा 6-अंकों का OTP भेज दिया गया है।`
        );
      } else {
        setConfirmationResult(null);
        setOtpStep('enter_mobile');
        setErrorMsg(
          res.error || 'मोबाइल पर SMS OTP भेजने में समस्या आई। कृपया पुनः प्रयास करें।'
        );
      }
    } catch (err: any) {
      setConfirmationResult(null);
      setOtpStep('enter_mobile');
      setErrorMsg(
        err?.message || 'मोबाइल पर SMS OTP भेजने में त्रुटि हुई। कृपया पुनः प्रयास करें।'
      );
    }
  };

  // Step 2: Verify Real SMS OTP & Immediately Open App
  const handleVerifyOtpAndOpenApp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const cleanOtp = otpCode.replace(/\D/g, '').trim();
    if (cleanOtp.length !== 6) {
      setErrorMsg('कृपया मोबाइल SMS में प्राप्त 6 अंकों का सही OTP कोड दर्ज करें।');
      return;
    }

    if (!confirmationResult) {
      setOtpStep('enter_mobile');
      setErrorMsg('OTP सत्र समाप्त हो गया है। कृपया दोबारा मोबाइल पर SMS OTP मंगवाएं।');
      return;
    }

    setOtpStep('verifying');

    try {
      const credential = await confirmationResult.confirm(cleanOtp);
      const fbUser = credential.user;

      const cleanMobile = mobileNumber.replace(/\D/g, '');
      const verifiedUser: UserProfile = {
        ...currentUser,
        id: fbUser?.uid || currentUser.id || `usr_otp_${cleanMobile}`,
        name: currentUser.name || agency.ownerName || 'Ajeet Kumar',
        mobile: cleanMobile,
        email: '',
        role: currentUser.role || 'agency_owner',
        agencyId: agency.id || 'agency_ajeet_01',
        token: `tok_firebase_otp_${Date.now()}`,
        verifiedAt: new Date().toISOString(),
        isPhoneVerified: true,
        authProvider: 'phone',
      };

      const updatedAgency: Agency = {
        ...agency,
        mobile: cleanMobile,
        email: '',
      };

      localStorage.removeItem('ajeet_user_explicit_email_linked');
      storageService.saveCurrentUser(verifiedUser);
      storageService.saveAgency(updatedAgency);
      storageService.setOtpSessionVerified(true);

      onLoginVerified(verifiedUser, updatedAgency);
    } catch (err: any) {
      setOtpStep('verify_otp');
      const code = err?.code || '';
      if (code === 'auth/invalid-verification-code') {
        setErrorMsg('गलत OTP कोड! कृपया अपने मोबाइल पर आए SMS में लिखा सही 6-अंकों का OTP डालें।');
      } else if (code === 'auth/code-expired') {
        setErrorMsg('यह OTP कोड समाप्त (Expire) हो चुका है। कृपया "पुनः SMS भेजें" पर क्लिक करें।');
      } else {
        setErrorMsg(
          `OTP सत्यापन विफल: ${err?.message || 'कृपया मोबाइल SMS में प्राप्त सही 6-अंकों का OTP कोड दर्ज करें।'}`
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-3 sm:p-6 font-sans">
      <div className="w-[92vw] max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-4">
        {/* Top Brand Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 px-6 py-6 text-center text-white">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full p-0.5 bg-amber-300 shadow-lg">
            <img
              src="/assets/aistudio/file_0000000043f482118d45f9a7391eadfe_4733c263.png"
              alt="Ajit collection"
              className="w-full h-full rounded-full object-cover"
            />
          </div>
          <h1 className="text-xl font-black tracking-tight text-white">Ajit collection</h1>
          <p className="text-xs text-blue-200 mt-1 font-medium">
            मोबाइल नंबर एवं OTP लॉगिन
          </p>
        </div>

        {/* Main Mobile OTP Login Form Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {/* Info Banner */}
          {infoMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-semibold flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* Mobile Number & OTP Form */}
          <form
            onSubmit={
              otpStep === 'verify_otp' || otpStep === 'verifying'
                ? handleVerifyOtpAndOpenApp
                : handleSendOtp
            }
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                मोबाइल नंबर दर्ज करें (10-Digit Mobile Number) *
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-3 text-sm font-bold text-slate-500 font-mono">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    disabled={otpStep === 'sending' || otpStep === 'verifying'}
                    value={mobileNumber}
                    onChange={(e) => {
                      setMobileNumber(e.target.value.replace(/\D/g, ''));
                      if (otpStep === 'verify_otp') {
                        setOtpStep('enter_mobile');
                        setConfirmationResult(null);
                        setOtpCode('');
                      }
                    }}
                    placeholder="मोबाइल नंबर डालें"
                    className="w-full pl-12 pr-3.5 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl text-base font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-900"
                  />
                </div>

                {otpStep === 'verify_otp' && (
                  <button
                    type="button"
                    disabled={countdown > 0}
                    onClick={() => handleSendOtp()}
                    className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-xs font-bold text-slate-700 shrink-0 transition cursor-pointer"
                  >
                    {countdown > 0 ? `${countdown}s` : 'पुनः SMS भेजें'}
                  </button>
                )}
              </div>
            </div>

            {/* Visible DOM container for Firebase RecaptchaVerifier */}
            <div id="firebase-login-recaptcha-box" className="flex justify-center my-1 min-h-[2px]" />

            {/* Send OTP Button when in Step 1 */}
            {(otpStep === 'enter_mobile' || otpStep === 'sending') && (
              <button
                type="submit"
                disabled={otpStep === 'sending' || mobileNumber.replace(/\D/g, '').length !== 10}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-900 hover:bg-blue-800 disabled:bg-slate-300 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
              >
                {otpStep === 'sending' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>मोबाइल पर SMS OTP भेजा जा रहा है...</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4" />
                    <span>मोबाइल पर OTP प्राप्त करें</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}

            {/* STEP 2: Enter 6-Digit SMS OTP received on mobile phone */}
            {(otpStep === 'verify_otp' || otpStep === 'verifying') && (
              <div className="p-4 rounded-2xl bg-blue-50/70 border-2 border-blue-200 space-y-3.5 animate-in fade-in">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    मोबाइल पर प्राप्त 6-अंकों का OTP दर्ज करें *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    autoFocus
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    className="w-full px-4 py-3 bg-white border-2 border-blue-600 rounded-xl text-center text-xl font-mono font-black tracking-[0.35em] text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={otpStep === 'verifying' || otpCode.replace(/\D/g, '').length !== 6}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                >
                  {otpStep === 'verifying' ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>OTP सत्यापित हो रहा है...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ओटीपी वेरीफाई करें व ऐप खोलें</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
