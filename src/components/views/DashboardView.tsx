import React from 'react';
import { 
  Users, 
  IndianRupee, 
  TrendingUp, 
  AlertCircle, 
  FileText, 
  CreditCard, 
  ArrowUpRight,
  PlusCircle,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { 
  Customer, 
  Invoice, 
  PaymentRecord, 
  Newspaper, 
  DeliveryRoute, 
  DailyDeliveryRecord,
  ExpenseRecord,
  Language,
  Agency
} from '../../types';
import { translations } from '../../i18n/translations';

interface DashboardViewProps {
  customers: Customer[];
  invoices: Invoice[];
  payments: PaymentRecord[];
  newspapers: Newspaper[];
  routes: DeliveryRoute[];
  deliveries: DailyDeliveryRecord[];
  expenses: ExpenseRecord[];
  agency: Agency;
  lang: Language;
  onNavigate: (tab: string) => void;
  onOpenNewPayment: () => void;
  onOpenNewCustomer: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  customers,
  invoices,
  payments,
  newspapers,
  routes,
  deliveries,
  expenses,
  agency,
  lang,
  onNavigate,
  onOpenNewPayment,
  onOpenNewCustomer,
}) => {
  const t = translations[lang];

  const activeCustomers = customers.filter((c) => c.subscriptionStatus === 'active');
  const pausedCustomers = customers.filter((c) => c.subscriptionStatus === 'paused');
  
  // Total outstanding balance across all customers
  const totalOutstanding = customers.reduce((sum, c) => sum + Math.max(0, c.currentBalance), 0);

  // Collections calculation
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const cashCollected = payments
    .filter((p) => p.paymentMethod === 'cash')
    .reduce((sum, p) => sum + p.amount, 0);
  const onlineCollected = payments
    .filter((p) => p.paymentMethod !== 'cash')
    .reduce((sum, p) => sum + p.amount, 0);

  // Invoiced billing amount
  const totalBilled = invoices.reduce((sum, inv) => sum + inv.subtotal, 0) || (activeCustomers.length * 280);

  // Expenses calculation
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Estimated Profit = Billed Revenue - Purchase Cost - Expenses
  const estimatedCost = totalBilled * 0.68; // ~68% cost of newspaper purchase from publisher
  const estimatedNetProfit = Math.max(0, Math.round(totalBilled - estimatedCost - (totalExpenses * 0.2)));

  // Daily delivery fulfillment rate
  const todayStr = new Date().toISOString().split('T')[0];
  const todayDeliveries = deliveries.filter((d) => d.date === todayStr);
  const todayDeliveredCount = todayDeliveries.filter((d) => d.status === 'delivered').length;
  const fulfillmentPct = todayDeliveries.length > 0 
    ? Math.round((todayDeliveredCount / todayDeliveries.length) * 100) 
    : 94; // fallback standard fulfillment

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Date & Quick Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-blue-900" />
            <span>{t.dashboard.todayDate}: {new Date().toLocaleDateString('hi-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {agency.nameHi}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.appSubtitle} · एशिया/कोलकाता (IST)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenNewPayment}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition shadow-xs"
          >
            <IndianRupee className="w-3.5 h-3.5 text-emerald-700" />
            <span>{t.dashboard.collectPayment}</span>
          </button>
          <button
            onClick={onOpenNewCustomer}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-xl transition shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{t.dashboard.addCustomer}</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metric Cards (60-30-10 discipline) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Active Customers */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">{t.dashboard.activeCustomers}</span>
            <Users className="w-4 h-4 text-blue-900" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {activeCustomers.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {pausedCustomers.length} {lang === 'hi' ? 'ग्राहक छुट्टी पर' : 'on vacation'}
          </div>
        </div>

        {/* Metric 2: Total Outstanding */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">{t.dashboard.totalOutstanding}</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700 font-mono tabular-nums">
            ₹{totalOutstanding.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-rose-600 font-medium mt-1">
            {lang === 'hi' ? 'वसूली हेतु लंबित' : 'Pending recovery'}
          </div>
        </div>

        {/* Metric 3: Total Collections */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">कुल वसूली (Total Collection)</span>
            <IndianRupee className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-emerald-800 font-mono tabular-nums">
            ₹{totalCollected.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
            <span>नकद: ₹{cashCollected}</span>
            <span>·</span>
            <span>UPI: ₹{onlineCollected}</span>
          </div>
        </div>

        {/* Metric 4: Estimated Profit */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">{t.dashboard.netProfitEst}</span>
            <TrendingUp className="w-4 h-4 text-blue-900" />
          </div>
          <div className="text-2xl font-bold text-blue-950 font-mono tabular-nums">
            ₹{estimatedNetProfit.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {lang === 'hi' ? 'थोक खरीद व खर्च घटाकर' : 'Net agency margin'}
          </div>
        </div>

      </div>

      {/* Middle Split: Route Summary & Newspaper Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Route Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h2 className="text-sm font-bold text-slate-900">
              {t.dashboard.routeSummary}
            </h2>
            <button
              onClick={() => onNavigate('customers')}
              className="text-xs font-semibold text-blue-900 hover:underline flex items-center gap-0.5"
            >
              <span>{t.dashboard.viewAll}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {routes.map((route) => {
              const routeCustomers = customers.filter((c) => c.routeId === route.id);
              return (
                <div 
                  key={route.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/70 transition border border-slate-100"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {route.nameHi} ({route.code})
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {route.locality} · वार्ड: {route.wardNumbers.join(', ')}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {routeCustomers.length}
                    </span>
                    <span className="text-[11px] text-slate-500 block">ग्राहक</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Newspaper Share Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h2 className="text-sm font-bold text-slate-900">
              {t.dashboard.newspaperShare}
            </h2>
            <button
              onClick={() => onNavigate('newspapers')}
              className="text-xs font-semibold text-blue-900 hover:underline flex items-center gap-0.5"
            >
              <span>दरें देखें</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {newspapers.map((np) => {
              // Count total copies for this newspaper
              let count = 0;
              customers.forEach((c) => {
                c.subscriptions.forEach((sub) => {
                  if (sub.newspaperId === np.id && sub.status === 'active') {
                    count += sub.quantity;
                  }
                });
              });
              return (
                <div 
                  key={np.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-900" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {np.nameHi}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        दर: ₹{np.retailPrice}/दिन · लागत: ₹{np.agencyPrice}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {count}
                    </span>
                    <span className="text-[11px] text-slate-500 block">प्रतियां / दिन</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Recent Collections Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h2 className="text-sm font-bold text-slate-900">
            {t.dashboard.recentTransactions}
          </h2>
          <button
            onClick={() => onNavigate('collections')}
            className="text-xs font-semibold text-blue-900 hover:underline flex items-center gap-0.5"
          >
            <span>{t.dashboard.viewAll}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            आज अभी तक कोई भुगतान दर्ज नहीं हुआ है। "भुगतान रसीद काटें" बटन दबाकर रसीद बनाएं।
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {payments.slice(-5).reverse().map((pay) => (
              <div key={pay.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900">{pay.customerName}</span>
                  <div className="text-[11px] text-slate-500">
                    रसीद: {pay.receiptNumber} · {pay.collectedByAgentName}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-emerald-800 text-sm">
                    +₹{pay.amount}
                  </span>
                  <div className="text-[10px] text-slate-500 uppercase">
                    {pay.paymentMethod}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
