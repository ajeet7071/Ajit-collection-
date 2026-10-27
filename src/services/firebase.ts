import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  Auth,
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  getDocFromServer,
  setLogLevel
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Agency, Customer, Newspaper, DeliveryRoute, Invoice, PaymentRecord, ExpenseRecord, CustomerLedgerEntry } from '../types';

// Silence internal verbose connection retry logs from firestore SDK to keep console clean
try {
  setLogLevel('silent');
} catch {
  // ignore
}

export interface CustomFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  recaptchaSiteKey?: string;
}

const CUSTOM_FIREBASE_CONFIG_KEY = 'ajeet_lakshay_firebase_config_v3';
export const FIREBASE_RECAPTCHA_SITE_KEY = '6LcMZR0UAAAAALgPMcgHwga7gY5p8QMg1Hj-bmUv';

// Built-in Firebase Phone Auth config for funky-envoy-sbcxw (lakshaycorporation@gmail.com)
export const FUNKY_ENVOY_FIREBASE_CONFIG: CustomFirebaseConfig = {
  apiKey: 'AIzaSyAPyXh801QzJCCV13Im15Knv29PwFQbS5c',
  authDomain: 'funky-envoy-sbcxw.firebaseapp.com',
  projectId: 'funky-envoy-sbcxw',
  storageBucket: 'funky-envoy-sbcxw.firebasestorage.app',
  messagingSenderId: '796996400695',
  appId: '1:796996400695:web:b5d034802c9ea7ff1431b2',
  recaptchaSiteKey: FIREBASE_RECAPTCHA_SITE_KEY,
};

export function getSavedCustomFirebaseConfig(): CustomFirebaseConfig {
  return FUNKY_ENVOY_FIREBASE_CONFIG;
}

export function saveCustomFirebaseConfig(config: CustomFirebaseConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CUSTOM_FIREBASE_CONFIG_KEY, JSON.stringify(config));
}

export function clearCustomFirebaseConfig(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CUSTOM_FIREBASE_CONFIG_KEY);
}

/**
 * Parses either raw JSON or a JavaScript snippet copied from Firebase Console
 */
export function parseFirebaseConfigSnippet(input: string): CustomFirebaseConfig | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.apiKey && parsed.projectId) {
      return {
        apiKey: String(parsed.apiKey).trim(),
        authDomain: String(parsed.authDomain || `${parsed.projectId}.firebaseapp.com`).trim(),
        projectId: String(parsed.projectId).trim(),
        appId: parsed.appId ? String(parsed.appId).trim() : undefined,
        storageBucket: parsed.storageBucket ? String(parsed.storageBucket).trim() : undefined,
        messagingSenderId: parsed.messagingSenderId ? String(parsed.messagingSenderId).trim() : undefined,
      };
    }
  } catch {
    // Fallback regex extraction
  }

  const extractField = (key: string): string | undefined => {
    const regex = new RegExp(`["']?${key}["']?\\s*:\\s*["']([^"']+)["']`);
    const match = trimmed.match(regex);
    return match?.[1]?.trim();
  };

  const apiKey = extractField('apiKey');
  const projectId = extractField('projectId');
  if (!apiKey || !projectId) {
    return null;
  }

  const authDomain = extractField('authDomain') || `${projectId}.firebaseapp.com`;
  const appId = extractField('appId');
  const storageBucket = extractField('storageBucket');
  const messagingSenderId = extractField('messagingSenderId');

  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    storageBucket,
    messagingSenderId,
  };
}

// Initialize primary Firebase app using funky-envoy-sbcxw configuration
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const phoneAuth = getAuth(app);
phoneAuth.useDeviceLanguage();

// CRITICAL: Must pass firestoreDatabaseId according to Firebase skill
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = phoneAuth;
export const FIREBASE_SYSTEM_EMAIL = 'lakshaycorporation@gmail.com';
export const FIREBASE_PROJECT_ID = 'funky-envoy-sbcxw';

// Active Firebase Auth instance for funky-envoy-sbcxw Phone SMS OTP Authentication
export function getActivePhoneAuth(): { authInstance: Auth; activeProjectId: string; isCustomProject: boolean } {
  return {
    authInstance: phoneAuth,
    activeProjectId: FIREBASE_PROJECT_ID,
    isCustomProject: true,
  };
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Configure language for auth
auth.useDeviceLanguage();

// Proactively clear any stale/unsupported persisted tokens that cause token-service-api errors
if (typeof window !== 'undefined') {
  auth.onIdTokenChanged(async (user) => {
    if (user) {
      try {
        await user.getIdToken();
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        if (
          errorMsg.includes('token-service-api') || 
          errorMsg.includes('securetoken.googleapis.com') ||
          errorMsg.includes('invalid-credential')
        ) {
          console.warn('Resetting unverified auth session to maintain clean connectivity.');
          await firebaseSignOut(auth).catch(() => {});
        }
      }
    }
  });
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
  return errInfo;
}

// CRITICAL CONSTRAINT: Test connection to Firestore on boot
export async function testConnection(): Promise<boolean> {
  try {
    if (auth.currentUser) {
      try {
        await auth.currentUser.getIdToken();
      } catch (authErr: any) {
        const authMsg = authErr?.message || String(authErr);
        if (authMsg.includes('token-service-api') || authMsg.includes('securetoken.googleapis.com')) {
          console.warn('Purged broken auth user before test connection.');
          await firebaseSignOut(auth).catch(() => {});
        }
      }
    }

    await getDocFromServer(doc(db, 'test', 'connection'));
    console.info('Cloud Firestore connection established.');
    return true;
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (
      errorMsg.includes('the client is offline') || 
      errorMsg.includes('Could not reach Cloud Firestore') ||
      errorMsg.includes('token-service-api') ||
      errorMsg.includes('securetoken.googleapis.com')
    ) {
      console.warn('Firebase Notice: Cloud connection is initializing or offline. App operates normally with local-first persistence.');
    } else {
      console.warn('Firebase connection check notice:', errorMsg);
    }
    return false;
  }
}
testConnection().catch((err) => {
  console.warn('Firebase boot connection test handled:', err?.message || err);
});

export interface FullBackupPayload {
  agency: Agency;
  customers: Customer[];
  newspapers: Newspaper[];
  routes: DeliveryRoute[];
  invoices: Invoice[];
  payments: PaymentRecord[];
  expenses: ExpenseRecord[];
  ledger: CustomerLedgerEntry[];
  deliveries?: any[];
  handovers?: any[];
  exportedAt?: string;
  version?: string;
}

export interface PhoneOtpResult {
  success: boolean;
  confirmationResult?: ConfirmationResult | null;
  isFirebaseSms: boolean;
  errorCode?: string;
  activeProjectId?: string;
  error?: string;
}

export const firebaseService = {
  // 1. Google Sign-In with popup
  async loginWithGoogle(hintEmail?: string): Promise<FirebaseUser | null> {
    try {
      const { authInstance } = getActivePhoneAuth();
      const params: Record<string, string> = {
        prompt: 'select_account',
      };
      if (hintEmail && hintEmail.trim()) {
        params.login_hint = hintEmail.trim();
      }
      googleProvider.setCustomParameters(params);
      const result = await signInWithPopup(authInstance, googleProvider);
      return result.user;
    } catch (error: any) {
      const code = error?.code || '';
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/user-cancelled'
      ) {
        return null;
      }
      if (code === 'auth/popup-blocked') {
        throw new Error('ब्राउज़र में पॉप-अप विंडो ब्लॉक है। कृपया पॉप-अप की अनुमति (Allow Popups) दें।');
      }
      if (code === 'auth/unauthorized-domain') {
        throw new Error(
          `इस डोमेन (${window.location.hostname}) को Firebase Console -> Authentication -> Settings -> Authorized domains में जोड़ें।`
        );
      }
      throw new Error(error?.message || 'Google साइन-इन पूरा नहीं हो सका। कृपया पुनः प्रयास करें।');
    }
  },

  // 2. Setup RecaptchaVerifier for Real Firebase Phone OTP SMS (funky-envoy-sbcxw)
  setupRecaptcha(containerId: string, size: 'invisible' | 'normal' = 'invisible'): RecaptchaVerifier | null {
    if (typeof window === 'undefined' || typeof document === 'undefined') return null;

    // Clear any previous RecaptchaVerifier instance cleanly
    if ((window as any).recaptchaVerifier) {
      try {
        (window as any).recaptchaVerifier.clear();
      } catch {
        // ignore cleanup errors
      }
      (window as any).recaptchaVerifier = null;
    }

    let parentContainer = document.getElementById(containerId);
    if (!parentContainer) {
      parentContainer = document.createElement('div');
      parentContainer.id = containerId;
      document.body.appendChild(parentContainer);
    }

    // Remove all previous child nodes and mount a brand-new DOM node
    // so grecaptcha never throws "reCAPTCHA has already been rendered in this element"
    parentContainer.innerHTML = '';
    const freshMountNode = document.createElement('div');
    freshMountNode.id = `${containerId}-node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    parentContainer.appendChild(freshMountNode);

    try {
      const { authInstance } = getActivePhoneAuth();
      // NOTE: Do NOT pass 'sitekey' in parameters here; Firebase Auth SDK asserts !parameters.sitekey
      // in validateStartingState() and automatically fetches the project's reCAPTCHA sitekey in init().
      const verifier = new RecaptchaVerifier(authInstance, freshMountNode, {
        size,
        callback: () => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          console.warn('reCAPTCHA expired. User should retry.');
        }
      });

      (window as any).recaptchaVerifier = verifier;
      (window as any).recaptchaContainerId = containerId;
      return verifier;
    } catch (err) {
      console.warn('Recaptcha initialization error:', err);
      return null;
    }
  },

  // 3. Send Real SMS OTP via Firebase Authentication (funky-envoy-sbcxw, NO fake/on-screen OTP codes)
  async sendPhoneOtp(
    phoneNumberWithCountryCode: string, 
    verifier: RecaptchaVerifier | null
  ): Promise<PhoneOtpResult> {
    const { authInstance, activeProjectId } = getActivePhoneAuth();
    const containerId = (window as any).recaptchaContainerId || 'firebase-login-recaptcha-box';

    let activeVerifier = verifier || this.setupRecaptcha(containerId, 'invisible');
    if (!activeVerifier) {
      return {
        success: false,
        isFirebaseSms: false,
        activeProjectId,
        errorCode: 'auth/recaptcha-not-ready',
        error: 'सुरक्षा सत्यापन (reCAPTCHA) तैयार नहीं हो सका। कृपया पेज रीफ्रेश करके पुनः प्रयास करें।',
      };
    }

    try {
      // Pre-render the reCAPTCHA widget once if not yet rendered
      await activeVerifier.render();
      const confirmationResult = await signInWithPhoneNumber(
        authInstance, 
        phoneNumberWithCountryCode, 
        activeVerifier
      );
      return {
        success: true,
        confirmationResult,
        isFirebaseSms: true,
        activeProjectId,
      };
    } catch (firstError: any) {
      const firstMsg = firstError?.message || String(firstError);
      const firstCode = firstError?.code || '';

      // If invisible reCAPTCHA had a rendering or challenge issue in the iframe,
      // automatically recreate a fresh normal/invisible verifier and retry once
      if (
        firstMsg.includes('already been rendered') ||
        firstCode === 'auth/internal-error' ||
        firstCode === 'auth/captcha-check-failed' ||
        firstCode === 'auth/missing-client-identifier'
      ) {
        try {
          activeVerifier = this.setupRecaptcha(containerId, 'normal');
          if (activeVerifier) {
            await activeVerifier.render();
            const retryResult = await signInWithPhoneNumber(
              authInstance,
              phoneNumberWithCountryCode,
              activeVerifier
            );
            return {
              success: true,
              confirmationResult: retryResult,
              isFirebaseSms: true,
              activeProjectId,
            };
          }
        } catch (retryErr: any) {
          firstError = retryErr;
        }
      }

      // Clean up the used verifier so the next attempt starts fresh
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch {
          // ignore
        }
        (window as any).recaptchaVerifier = null;
      }

      const errorCode = firstError?.code || '';
      const host = typeof window !== 'undefined' ? window.location.hostname : '';

      if (errorCode === 'auth/operation-not-allowed') {
        return {
          success: false,
          isFirebaseSms: false,
          errorCode,
          activeProjectId,
          error: `Firebase प्रोजेक्ट (${activeProjectId}) में Phone SMS साइन-इन की जांच करें।`,
        };
      }

      if (errorCode === 'auth/unauthorized-domain') {
        return {
          success: false,
          isFirebaseSms: false,
          errorCode,
          activeProjectId,
          error: `इस डोमेन (${host}) को आपके Firebase प्रोजेक्ट (${activeProjectId}) के Authorized Domains में जोड़ना आवश्यक है।`,
        };
      }

      if (errorCode === 'auth/billing-not-enabled') {
        return {
          success: false,
          isFirebaseSms: false,
          errorCode,
          activeProjectId,
          error: `Firebase प्रोजेक्ट (${activeProjectId}) में वास्तविक SMS भेजने के लिए Firebase Blaze (SMS Plan) या टेस्ट फ़ोन नंबर सक्षम होना आवश्यक है।`,
        };
      }

      if (errorCode === 'auth/invalid-phone-number') {
        return {
          success: false,
          isFirebaseSms: false,
          errorCode,
          activeProjectId,
          error: 'दर्ज किया गया मोबाइल नंबर अमान्य है। कृपया +91 के साथ 10 अंकों का सही नंबर डालें।',
        };
      }

      if (errorCode === 'auth/too-many-requests' || errorCode === 'auth/quota-exceeded') {
        return {
          success: false,
          isFirebaseSms: false,
          errorCode,
          activeProjectId,
          error: 'इस नंबर पर बहुत अधिक बार OTP अनुरोध किया गया है। कृपया कुछ समय बाद प्रयास करें।',
        };
      }

      return {
        success: false,
        isFirebaseSms: false,
        errorCode,
        activeProjectId,
        error: firstError?.message || 'Firebase से मोबाइल पर SMS OTP भेजने में त्रुटि हुई।',
      };
    }
  },

  // 4. Save Cloud Backup to Firestore
  async saveCloudBackup(
    _userId: string, 
    userEmail: string, 
    data: FullBackupPayload
  ): Promise<boolean> {
    const user = auth.currentUser;
    const effectiveEmail = (userEmail || user?.email || '').trim();
    if (!user && !effectiveEmail) {
      throw new Error('Google / Gmail आईडी जोड़ना आवश्यक है ताकि डेटा क्लाउड पर सुरक्षित हो सके।');
    }

    const uid = user?.uid || _userId || `email_${effectiveEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const backupRef = doc(db, 'user_backups', uid);

    try {
      await setDoc(backupRef, {
        userId: uid,
        userEmail: effectiveEmail,
        agency: data.agency,
        customers: data.customers || [],
        newspapers: data.newspapers || [],
        routes: data.routes || [],
        invoices: data.invoices || [],
        payments: data.payments || [],
        expenses: data.expenses || [],
        ledger: data.ledger || [],
        updatedAt: new Date().toISOString(),
        version: '1.0'
      });
      return true;
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `user_backups/${uid}`);
      throw error;
    }
  },

  // 5. Restore Cloud Backup from Firestore
  async getCloudBackup(_userId?: string): Promise<FullBackupPayload | null> {
    const user = auth.currentUser;
    const uid = user?.uid || _userId;
    if (!uid) {
      return null;
    }

    const backupRef = doc(db, 'user_backups', uid);

    try {
      const snapshot = await getDoc(backupRef);
      if (snapshot.exists()) {
        const d = snapshot.data();
        return {
          agency: d.agency,
          customers: d.customers || [],
          newspapers: d.newspapers || [],
          routes: d.routes || [],
          invoices: d.invoices || [],
          payments: d.payments || [],
          expenses: d.expenses || [],
          ledger: d.ledger || [],
        };
      }
      return null;
    } catch (error: any) {
      handleFirestoreError(error, OperationType.GET, `user_backups/${uid}`);
      return null;
    }
  },

  // 6. Save User Profile in Firestore
  async saveUserProfile(_userId: string, profile: any): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    const uid = user.uid;
    const userRef = doc(db, 'users', uid);
    try {
      await setDoc(userRef, {
        ...profile,
        uid,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
    }
  },

  // 7. Get User Profile from Firestore
  async getUserProfile(_userId?: string): Promise<any | null> {
    const user = auth.currentUser;
    if (!user) return null;

    const uid = user.uid;
    const userRef = doc(db, 'users', uid);
    try {
      const snapshot = await getDoc(userRef);
      return snapshot.exists() ? snapshot.data() : null;
    } catch (error: any) {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
      return null;
    }
  },

  // 8. Sign out
  async logout(): Promise<void> {
    await firebaseSignOut(auth);
  }
};
