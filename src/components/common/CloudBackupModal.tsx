import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Cloud, 
  CloudCheck, 
  CloudDownload, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Database, 
  Mail, 
  ShieldCheck, 
  Calendar,
  Layers,
  Sliders,
  Zap,
  Check,
  Download,
  Upload,
  HardDrive
} from 'lucide-react';
import { UserProfile, Agency, Language } from '../../types';
import { firebaseService, FullBackupPayload, auth } from '../../services/firebase';
import { storageService } from '../../services/storage';

interface CloudBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  agency: Agency;
  onOpenAuth: () => void;
  onPerformBackup: () => Promise<boolean>;
  onRestoreBackup: (data: FullBackupPayload) => void;
  lang: Language;
}

export const CloudBackupModal: React.FC<CloudBackupModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  agency,
  onOpenAuth,
  onPerformBackup,
  onRestoreBackup,
  lang,
}) => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDownloadingOffline, setIsDownloadingOffline] = useState(false);
  const [isRestoringFile, setIsRestoringFile] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [availableBackup, setAvailableBackup] = useState<FullBackupPayload | null>(null);
  const [isCheckingBackup, setIsCheckingBackup] = useState(false);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [autoSyncOnLaunch, setAutoSyncOnLaunch] = useState<boolean>(() => storageService.getAutoSyncOnLaunch());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStatusMsg(null);
      setAutoSyncOnLaunch(storageService.getAutoSyncOnLaunch());
      if (auth.currentUser) {
        checkExistingBackup();
      } else {
        setAvailableBackup(null);
        setIsCheckingBackup(false);
      }
    }
  }, [isOpen, currentUser]);

  const handleToggleAutoSync = () => {
    const nextVal = !autoSyncOnLaunch;
    setAutoSyncOnLaunch(nextVal);
    storageService.saveAutoSyncOnLaunch(nextVal);
    setStatusMsg({
      type: 'success',
      text: nextVal
        ? '✓ ऐप खुलते ही ऑटो-सिंक (Auto-Sync on App Launch) सक्रिय कर दिया गया है। लोकल डेटा Firebase से सदैव सिंक रहेगा।'
        : '✓ ऐप खुलते ही ऑटो-सिंक निष्क्रिय किया गया। अब आप मैन्युअल रूप से बैकअप ले सकेंगे।',
    });
  };

  if (!isOpen) return null;

  const checkExistingBackup = async () => {
    if (!auth.currentUser) {
      setAvailableBackup(null);
      return;
    }
    setIsCheckingBackup(true);
    try {
      const data = await firebaseService.getCloudBackup();
      setAvailableBackup(data);
    } catch (err) {
      console.warn('Check cloud backup notice:', err);
    } finally {
      setIsCheckingBackup(false);
    }
  };

  const handleQuickGoogleLink = async () => {
    setIsSigningInGoogle(true);
    setStatusMsg(null);
    try {
      await firebaseService.loginWithGoogle();
      setStatusMsg({
        type: 'success',
        text: '✓ Google खाता सफलतापूर्वक लिंक हो गया है।',
      });
      await checkExistingBackup();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: `Google लॉगिन विफल: ${err.message || 'रद्द किया गया'}`,
      });
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  const handleBackupNow = async () => {
    if (!auth.currentUser) {
      setStatusMsg({
        type: 'error',
        text: lang === 'hi'
          ? 'कृपया पहले ऊपर "Gmail जोड़ें" बटन दबाकर अपना Google खाता लिंक करें।'
          : 'Please sign in with Google above to enable cloud backup.',
      });
      return;
    }

    setIsBackingUp(true);
    setStatusMsg(null);
    try {
      const success = await onPerformBackup();
      if (success) {
        setStatusMsg({
          type: 'success',
          text: lang === 'hi'
            ? '✓ बधाई! आपकी एजेंसी का संपूर्ण डेटा (ग्राहक, बिल, रूट, रसीदें) Google Cloud पर सुरक्षित हो गया है।'
            : '✓ Success! Complete agency data backed up to Google Cloud.',
        });
        await checkExistingBackup();
      } else {
        throw new Error('बैकअप प्रक्रिया अधूरी रही');
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: lang === 'hi'
          ? `बैकअप विफल: ${err.message || 'कृपया इंटरनेट कनेक्शन जांचें'}`
          : `Backup failed: ${err.message || 'Please check connection'}`,
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreNow = async () => {
    if (!availableBackup) return;
    setIsRestoring(true);
    setStatusMsg(null);
    try {
      onRestoreBackup(availableBackup);
      setStatusMsg({
        type: 'success',
        text: lang === 'hi'
          ? '✓ Google Cloud से आपका सारा डेटा सफलतापूर्वक रीस्टोर (Recover) कर लिया गया है!'
          : '✓ Data successfully restored from Google Cloud!',
      });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: lang === 'hi'
          ? `डेटा रीस्टोर विफल: ${err.message}`
          : `Restore failed: ${err.message}`,
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDownloadOfflineBackup = () => {
    setIsDownloadingOffline(true);
    setStatusMsg(null);
    try {
      const customers = storageService.getCustomers();
      const newspapers = storageService.getNewspapers();
      const routes = storageService.getRoutes();
      const deliveries = storageService.getDeliveries();
      const invoices = storageService.getInvoices();
      const payments = storageService.getPayments();
      const expenses = storageService.getExpenses();
      const ledger = storageService.getLedger();
      const handovers = storageService.getHandovers();
      const currentAgency = storageService.getAgency() || agency;

      const backupData: FullBackupPayload = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        agency: currentAgency,
        customers,
        newspapers,
        routes,
        deliveries,
        invoices,
        payments,
        expenses,
        ledger,
        handovers,
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      const timeStr = new Date().toTimeString().slice(0, 5).replace(':', '');
      const sanitizedAgencyName = (currentAgency.name || 'Agency').replace(/[^a-zA-Z0-9]/g, '_');
      link.href = url;
      link.download = `${sanitizedAgencyName}_Backup_${dateStr}_${timeStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatusMsg({
        type: 'success',
        text: `✓ सम्पूर्ण डेटा बैकअप JSON फाइल (${customers.length} ग्राहक, ${invoices.length} बिल, ${payments.length} रसीदें) सफलता से डाउनलोड हो गई है! इसे सुरक्षित रखें।`,
      });
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: `ऑफलाइन बैकअप डाउनलोड विफल: ${err?.message || 'अज्ञात त्रुटि'}`,
      });
    } finally {
      setIsDownloadingOffline(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoringFile(true);
    setStatusMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          throw new Error('फाइल खाली है');
        }
        const parsed = JSON.parse(text) as FullBackupPayload;

        if (!parsed.agency && !parsed.customers && !parsed.invoices) {
          throw new Error('अमान्य बैकअप फाइल फॉर्मेट। आवश्यक डेटा नहीं मिला।');
        }

        onRestoreBackup(parsed);

        setStatusMsg({
          type: 'success',
          text: `✓ बैकअप फाइल सफलतापूर्वक लोड हो गई! ${parsed.customers?.length || 0} ग्राहक, ${parsed.invoices?.length || 0} बिल, और ${parsed.payments?.length || 0} भुगतान रसीदें रीस्टोर हुईं।`,
        });
      } catch (err: any) {
        setStatusMsg({
          type: 'error',
          text: `फाइल रीस्टोर विफल: ${err.message || 'अमान्य JSON फाइल'}`,
        });
      } finally {
        setIsRestoringFile(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      setStatusMsg({
        type: 'error',
        text: 'फाइल पढ़ने में समस्या आई। कृपया पुनः प्रयास करें।',
      });
      setIsRestoringFile(false);
    };

    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-[92vw] sm:w-full max-w-lg max-h-[85dvh] sm:max-h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <img 
              src="/assets/aistudio/file_0000000043f482118d45f9a7391eadfe_4733c263.png" 
              alt="Ajit collection" 
              className="w-10 h-10 rounded-full object-cover border border-amber-300 shadow-xs shrink-0" 
            />
            <div>
              <div className="text-[10px] font-black tracking-wider text-amber-300 uppercase">Ajit collection</div>
              <h3 className="font-bold text-base leading-tight">डेटा बैकअप एवं रिकवरी (Cloud & Offline)</h3>
              <p className="text-xs text-blue-200">
                Google Cloud एवं डिवाइस ऑफलाइन JSON बैकअप
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

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain">
          
          {/* Linked Account Status */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>{auth.currentUser?.email || currentUser.email || 'कोई Gmail खाता लिंक नहीं है'}</span>
                  {auth.currentUser ? (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-bold">
                      ✓ सक्रिय क्लाउड
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 font-bold">
                      ऑफलाइन मोड
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  संचालक: {currentUser.name} (+91 {currentUser.mobile})
                </div>
              </div>
            </div>

            {!auth.currentUser && (
              <button
                type="button"
                onClick={handleQuickGoogleLink}
                disabled={isSigningInGoogle}
                className="px-3 py-1.5 bg-blue-900 text-white rounded-lg text-xs font-bold hover:bg-blue-800 transition shadow-xs flex items-center gap-1.5"
              >
                {isSigningInGoogle ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Mail className="w-3.5 h-3.5" />
                )}
                <span>Gmail जोड़ें</span>
              </button>
            )}
          </div>

          {/* Status Message */}
          {statusMsg && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Action 1: Backup Now */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CloudCheck className="w-5 h-5 text-blue-900" />
                <span className="text-xs font-bold text-slate-900">
                  Google Cloud पर डेटा सेव करें (Upload Backup)
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-600">
              ऐप में मौजूद सभी वर्तमान ग्राहक, वितरण रूट, अखबार दरें, बिल और रसीदें आपकी जीमेल आईडी पर Google Cloud पर सुरक्षित हो जाएंगी।
            </p>
            <button
              onClick={handleBackupNow}
              disabled={isBackingUp}
              className="w-full h-11 bg-blue-900 hover:bg-blue-800 disabled:bg-blue-300 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition"
            >
              {isBackingUp ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CloudCheck className="w-4 h-4 text-emerald-300" />
              )}
              <span>
                {isBackingUp ? 'Google Cloud पर सेव हो रहा है...' : 'अभी क्लाउड बैकअप लें (Backup Now)'}
              </span>
            </button>
          </div>

          {/* Action 2: Cloud Restore */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CloudDownload className="w-5 h-5 text-indigo-900" />
                <span className="text-xs font-bold text-slate-900">
                  Google Cloud से पुराना डेटा रीस्टोर करें (Recover Data)
                </span>
              </div>
              {isCheckingBackup && <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />}
            </div>

            {availableBackup ? (
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span>उपलब्ध बैकअप विवरण:</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono font-bold">
                    ✓ क्लाउड पर उपलब्ध
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 grid grid-cols-2 gap-1 pt-1">
                  <div>एजेंसी: <span className="font-semibold text-slate-800">{availableBackup.agency?.name}</span></div>
                  <div>ग्राहक संख्या: <span className="font-semibold text-slate-800">{availableBackup.customers?.length || 0}</span></div>
                  <div>रूट संख्या: <span className="font-semibold text-slate-800">{availableBackup.routes?.length || 0}</span></div>
                  <div>कुल इनवॉइस: <span className="font-semibold text-slate-800">{availableBackup.invoices?.length || 0}</span></div>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                {isCheckingBackup 
                  ? 'क्लाउड बैकअप की जांच की जा रही है...' 
                  : 'इस खाते पर अभी कोई पुराना क्लाउड बैकअप नहीं मिला। ऊपर "अभी क्लाउड बैकअप लें" पर क्लिक करके बैकअप बनाएं।'}
              </p>
            )}

            <button
              onClick={handleRestoreNow}
              disabled={!availableBackup || isRestoring}
              className="w-full h-11 bg-indigo-900 hover:bg-indigo-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition"
            >
              {isRestoring ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CloudDownload className="w-4 h-4" />
              )}
              <span>
                {isRestoring ? 'डेटा रीस्टोर हो रहा है...' : 'Google Cloud से डेटा रीस्टोर करें (Restore Data)'}
              </span>
            </button>
          </div>

          {/* Action 3: Offline Device Backup (Direct JSON Download & File Restore) */}
          <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/50 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900">
                      ऑफलाइन डिवाइस बैकअप (Download Backup JSON)
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                      सुरक्षा उपाय (Safety Measure)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    पूरी एजेंसी का डेटा (ग्राहक, बिल, रूट, दरें, भुगतान) एक क्लिक में अपनी डिवाइस में सुरक्षित डाउनलोड करें। इसके लिए इंटरनेट या जीमेल की आवश्यकता नहीं है।
                  </p>
                </div>
              </div>
            </div>

            {/* Current Application State Live Badges */}
            <div className="p-3 bg-white rounded-xl border border-emerald-200 grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                <div className="text-[10px] text-slate-500 font-medium">कुल ग्राहक</div>
                <div className="text-sm font-bold text-emerald-900">{storageService.getCustomers().length}</div>
              </div>
              <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                <div className="text-[10px] text-slate-500 font-medium">कुल बिल</div>
                <div className="text-sm font-bold text-emerald-900">{storageService.getInvoices().length}</div>
              </div>
              <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                <div className="text-[10px] text-slate-500 font-medium">रसीदें</div>
                <div className="text-sm font-bold text-emerald-900">{storageService.getPayments().length}</div>
              </div>
              <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                <div className="text-[10px] text-slate-500 font-medium">वितरण रूट</div>
                <div className="text-sm font-bold text-emerald-900">{storageService.getRoutes().length}</div>
              </div>
            </div>

            {/* Buttons: Download Backup and Restore from File */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadOfflineBackup}
                disabled={isDownloadingOffline}
                className="h-11 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:bg-emerald-300 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                {isDownloadingOffline ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>
                  {isDownloadingOffline ? 'डाउनलोड हो रहा है...' : 'ऑफलाइन बैकअप डाउनलोड करें (JSON)'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isRestoringFile}
                className="h-11 bg-white hover:bg-slate-50 border border-slate-300 active:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                {isRestoringFile ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-600" />
                ) : (
                  <Upload className="w-4 h-4 text-slate-600" />
                )}
                <span>
                  {isRestoringFile ? 'फाइल रीस्टोर हो रही है...' : 'फाइल से रीस्टोर करें (Upload JSON)'}
                </span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Section 4: Cloud Sync Settings */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-900" />
                <span className="text-xs font-bold text-slate-900">
                  क्लाउड सिंक सेटिंग्स (Cloud Sync Settings)
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                autoSyncOnLaunch 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                  : 'bg-slate-100 text-slate-600 border border-slate-300'
              }`}>
                {autoSyncOnLaunch ? '✓ ऑटो-सिंक सक्रिय' : '✕ ऑटो-सिंक बंद'}
              </span>
            </div>

            {/* Toggle Switch Row */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="space-y-0.5 pr-3">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>ऐप खुलते ही ऑटो-सिंक (Auto-Sync on App Launch)</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  ऐप शुरू होते ही Google Firebase क्लाउड से नवीनतम ग्राहक, बिल, रूट व रसीदों का डेटा स्वतः सिंक हो जाएगा ताकि लोकल डेटा सदैव अद्यतन रहे।
                </p>
              </div>

              {/* Interactive Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={autoSyncOnLaunch}
                onClick={handleToggleAutoSync}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2 ${
                  autoSyncOnLaunch ? 'bg-blue-900' : 'bg-slate-300'
                }`}
              >
                <span className="sr-only">Toggle Auto-Sync on App Launch</span>
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                    autoSyncOnLaunch ? 'translate-x-5' : 'translate-x-0'
                  }`}
                >
                  {autoSyncOnLaunch ? (
                    <Check className="w-3 h-3 text-blue-900 stroke-[3]" />
                  ) : null}
                </span>
              </button>
            </div>

            <div className="text-[10px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-0.5">
              <span>क्लाउड डेटाबेस: Google Firebase Firestore (Enterprise Cloud)</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                ऑफलाइन व ऑनलाइन समर्थित
              </span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition"
          >
            बंद करें
          </button>
        </div>

      </div>
    </div>
  );
};
