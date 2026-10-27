import React, { useState } from 'react';
import { 
  BookOpen, 
  Terminal, 
  Database, 
  Smartphone, 
  CheckSquare, 
  Server, 
  Copy, 
  Check, 
  FileCode,
  ShieldCheck
} from 'lucide-react';
import { Language } from '../../types';

interface SystemDocsViewProps {
  lang: Language;
}

export const SystemDocsView: React.FC<SystemDocsViewProps> = ({ lang }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const postgresSchema = `-- ====================================================================
-- AJEET COLLECTION APP: POSTGRESQL / SUPABASE PRODUCTION DATABASE SCHEMA
-- Multi-Tenant Newspaper Business Management System
-- Timezone: Asia/Kolkata (IST), Currency: INR (₹)
-- ====================================================================

-- 1. Organizations / Agency Tenants
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    name_hi VARCHAR(255) NOT NULL,
    owner_name VARCHAR(150) NOT NULL,
    mobile VARCHAR(15) NOT NULL UNIQUE,
    email VARCHAR(150),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Sri Ganganagar',
    state VARCHAR(100) NOT NULL DEFAULT 'Rajasthan',
    pincode VARCHAR(10) NOT NULL,
    gstin VARCHAR(20),
    upi_id VARCHAR(100) NOT NULL,
    billing_policy VARCHAR(50) DEFAULT 'calendar_days',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Accounts & Role-Based Access Control
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    mobile VARCHAR(15) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'super_admin', 'agency_owner', 'manager', 'supervisor',
        'collection_agent', 'delivery_agent', 'accountant', 'customer'
    )),
    is_mobile_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Delivery Routes
CREATE TABLE delivery_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    name_hi VARCHAR(150) NOT NULL,
    locality VARCHAR(200) NOT NULL,
    ward_numbers TEXT[] NOT NULL,
    assigned_delivery_agent_id UUID REFERENCES users(id),
    assigned_collection_agent_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Customer Directory
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    customer_code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    alt_mobile VARCHAR(15),
    address TEXT NOT NULL,
    landmark VARCHAR(150),
    village_city VARCHAR(100) NOT NULL,
    ward_number VARCHAR(20) NOT NULL,
    route_id UUID REFERENCES delivery_routes(id),
    customer_type VARCHAR(50) DEFAULT 'residential',
    subscription_status VARCHAR(50) DEFAULT 'active' CHECK (subscription_status IN ('active', 'paused', 'discontinued')),
    delivery_agent_id UUID REFERENCES users(id),
    collection_agent_id UUID REFERENCES users(id),
    opening_balance DECIMAL(10,2) DEFAULT 0.00,
    current_balance DECIMAL(10,2) DEFAULT 0.00,
    pause_start_date DATE,
    pause_end_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, customer_code),
    UNIQUE(org_id, mobile)
);

-- 5. Newspapers & Pricing Catalog
CREATE TABLE newspapers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    name_hi VARCHAR(150) NOT NULL,
    edition VARCHAR(100) NOT NULL,
    retail_price DECIMAL(8,2) NOT NULL,
    agency_price DECIMAL(8,2) NOT NULL,
    fixed_monthly_price DECIMAL(8,2),
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Customer Subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    newspaper_id UUID REFERENCES newspapers(id),
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    custom_price_per_day DECIMAL(8,2),
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Daily Newspaper Delivery Tracking
CREATE TABLE daily_delivery_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    route_id UUID REFERENCES delivery_routes(id),
    customer_id UUID REFERENCES customers(id),
    newspaper_id UUID REFERENCES newspapers(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('delivered', 'missed', 'suspended')),
    logged_by_agent_id UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, customer_id, newspaper_id)
);

-- 8. Monthly Invoices & Billing
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    customer_id UUID REFERENCES customers(id),
    billing_month VARCHAR(7) NOT NULL, -- e.g. '2026-10'
    bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    billing_policy VARCHAR(50) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    previous_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    adjustments DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_payable DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    remaining_balance DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('unpaid', 'partial', 'paid')),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, billing_month)
);

-- 9. Payment Collection & Digital Receipts
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    receipt_number VARCHAR(100) NOT NULL UNIQUE,
    customer_id UUID REFERENCES customers(id),
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'online_gateway')),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    collected_by_agent_id UUID REFERENCES users(id),
    invoice_id UUID REFERENCES invoices(id),
    transaction_ref VARCHAR(150),
    is_advance BOOLEAN DEFAULT FALSE,
    handover_status VARCHAR(50) DEFAULT 'in_hand',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Immutable Customer Account Ledger
CREATE TABLE customer_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('invoice', 'payment', 'adjustment')),
    reference_id VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    debit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    credit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    balance DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR FAST REPORTING & SEARCH
CREATE INDEX idx_customers_search ON customers (org_id, mobile, customer_code);
CREATE INDEX idx_delivery_route_date ON daily_delivery_records (route_id, date);
CREATE INDEX idx_invoices_cust_month ON invoices (customer_id, billing_month);
CREATE INDEX idx_payments_date ON payments (org_id, payment_date);`;

  const apkBuildScript = `# ====================================================================
# ANDROID APK BUILD & DEPLOYMENT INSTRUCTIONS (FLUTTER / CAPACITOR / PWA)
# ====================================================================

# Option A: Progressive Web App / Trusted Web Activity (TWA) via Bubblewrap
# 1. Install Bubblewrap CLI
npm install -g @bubblewrap/cli

# 2. Initialize Android Project from the deployed PWA URL
bubblewrap init --manifest="https://ais-pre-i6s7tolugr67qpm66gnmpr-296903934693.asia-east1.run.app/manifest.webmanifest"

# 3. Build signed Release APK & Android App Bundle (AAB)
bubblewrap build

# Option B: Cross-Platform Capacitor Android Build
# 1. Add Capacitor dependencies
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Ajeet Collection App" com.ajeet.collectionapp --web-dir dist

# 2. Add Android platform
npx cap add android

# 3. Build production web assets and sync to native Android project
npm run build
npx cap sync

# 4. Open and build release APK in Android Studio
npx cap open android
./gradlew assembleRelease`;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-900" />
          <h1 className="text-lg font-bold text-slate-900">
            सिस्टम तकनीकी दस्तावेज, डेटाबेस एवं APK निर्माण (Deliverables)
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          पूर्ण बैकएंड आर्किटेक्चर, PostgreSQL DDL माइग्रेशन स्क्रिप्ट्स, रेस्ट एपीआई एंडपॉइंट्स एवं Google Play पब्लिकेशन चेकलिस्ट।
        </p>
      </div>

      {/* Grid of Technical Deliverables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Deliverable 1: Database Architecture */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-slate-900">1. PostgreSQL / Supabase Schema (DDL)</h2>
            </div>
            <button
              onClick={() => handleCopy('db_schema', postgresSchema)}
              className="flex items-center gap-1 text-xs font-semibold text-blue-900 hover:underline"
            >
              {copiedKey === 'db_schema' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'db_schema' ? 'कॉपी हो गया' : 'SQL कॉपी करें'}</span>
            </button>
          </div>

          <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-xl text-[11px] font-mono overflow-x-auto max-h-72">
            {postgresSchema}
          </pre>
          <p className="text-[11px] text-slate-500">
            मल्टी-टेनेंट अलगाव (Multi-tenant isolation), विदेशी कुंजी प्रतिबंध (Foreign keys), एवं खाता बही लेजर की अखंडता।
          </p>
        </div>

        {/* Deliverable 2: Android APK Build */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-900" />
              <h2 className="text-sm font-bold text-slate-900">2. Android APK & AAB निर्माण गाइड</h2>
            </div>
            <button
              onClick={() => handleCopy('apk_build', apkBuildScript)}
              className="flex items-center gap-1 text-xs font-semibold text-blue-900 hover:underline"
            >
              {copiedKey === 'apk_build' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'apk_build' ? 'कॉपी हो गया' : 'कमांड्स कॉपी करें'}</span>
            </button>
          </div>

          <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-xl text-[11px] font-mono overflow-x-auto max-h-72">
            {apkBuildScript}
          </pre>
          <p className="text-[11px] text-slate-500">
            Capacitor एवं TWA बबलरैप द्वारा एंड्रॉइड 8.0+ पर चलने वाला मूल रिलीज एपीके जनरेट करें।
          </p>
        </div>

      </div>

      {/* Deliverable 3: Google Play Store Publication Checklist */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <CheckSquare className="w-4 h-4 text-emerald-700" />
          <h2 className="text-sm font-bold text-slate-900">3. Google Play Store प्रकाशन चेकलिस्ट (Play Store Checklist)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
            <span className="font-bold text-slate-900 block">गोपनीयता नीति एवं डेटा सुरक्षा (Data Safety)</span>
            <ul className="space-y-1 text-slate-600 list-disc list-inside">
              <li>ग्राहक मोबाइल नंबर केवल ओटीपी सत्यापन एवं बिल डिलीवरी के लिए उपयोग होगा।</li>
              <li>कोई भी संवेदनशील वित्तीय पासवर्ड, यूपीआई पिन या कार्ड डेटा ऐप में स्टोर नहीं किया जाएगा।</li>
              <li>डिजिटल पेमेंट गेटवे हेतु 256-बिट SSL TLS 1.3 एन्क्रिप्शन अनिवार्य।</li>
            </ul>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
            <span className="font-bold text-slate-900 block">ऐप एसेट्स एवं प्रदर्शन (App Store Assets)</span>
            <ul className="space-y-1 text-slate-600 list-disc list-inside">
              <li>हाई-रेजोल्यूशन ऐप आइकन (512x512 PNG 32-बिट)।</li>
              <li>फीचर ग्राफिक बैनर (1024x500 JPG/PNG)।</li>
              <li>कम से कम 4 स्क्रीनशॉट (डैशबोर्ड, वितरण रूट, मासिक बिलिंग, यूपीआई पेमेंट रसीद)।</li>
              <li>हिंदी एवं अंग्रेजी में स्पष्ट विवरण।</li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
};
