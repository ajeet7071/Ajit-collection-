import React, { useState } from 'react';
import { 
  BarChart3, 
  Download, 
  Printer, 
  Calendar, 
  FileSpreadsheet, 
  TrendingUp, 
  Users, 
  CheckCircle2 
} from 'lucide-react';
import { 
  Customer, 
  PaymentRecord, 
  Invoice, 
  DeliveryRoute, 
  Language, 
  Agency 
} from '../../types';
import { translations } from '../../i18n/translations';

interface ReportsViewProps {
  customers: Customer[];
  payments: PaymentRecord[];
  invoices: Invoice[];
  routes: DeliveryRoute[];
  agency: Agency;
  lang: Language;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  customers,
  payments,
  invoices,
  routes,
  agency,
  lang,
}) => {
  const t = translations[lang];

  const [activeReportTab, setActiveReportTab] = useState<'outstanding' | 'daily_collection' | 'route_summary'>('outstanding');

  // Outstanding Customers (Dues > 0)
  const outstandingCustomers = customers.filter((c) => c.currentBalance > 0);
  const totalOutstanding = outstandingCustomers.reduce((sum, c) => sum + c.currentBalance, 0);

  const handleExportOutstandingCSV = () => {
    const headers = ['Customer Code', 'Name', 'Mobile', 'Address', 'Ward', 'Route', 'Outstanding Due'];
    const rows = outstandingCustomers.map((c) => [
      c.customerCode,
      `"${c.name}"`,
      c.mobile,
      `"${c.address}"`,
      c.wardNumber,
      routes.find((r) => r.id === c.routeId)?.code || c.routeId,
      c.currentBalance,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `outstanding_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      
      {/* Report Switcher Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">{t.nav.reports}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            बकाया वसूली रिपोर्ट, दैनिक कलेक्शन एवं रूट वितरण विश्लेषण।
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportOutstandingCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition shadow-xs whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-blue-900" />
            <span>Excel / CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-xl transition shadow-xs whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t.common.print}</span>
          </button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveReportTab('outstanding')}
          className={`px-3 py-1.5 rounded-lg transition ${
            activeReportTab === 'outstanding'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          ग्राहक बकाया सूची (Outstanding Dues)
        </button>
        <button
          onClick={() => setActiveReportTab('daily_collection')}
          className={`px-3 py-1.5 rounded-lg transition ${
            activeReportTab === 'daily_collection'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          दैनिक वसूली रिपोर्ट (Collection Summary)
        </button>
        <button
          onClick={() => setActiveReportTab('route_summary')}
          className={`px-3 py-1.5 rounded-lg transition ${
            activeReportTab === 'route_summary'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          रूट वितरण प्रदर्शन (Route Summary)
        </button>
      </div>

      {/* Content 1: Outstanding Report */}
      {activeReportTab === 'outstanding' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">
              कुल {outstandingCustomers.length} ग्राहकों पर बकाया देय
            </span>
            <span className="font-mono font-bold text-rose-700 text-sm">
              कुल बकाया: ₹{totalOutstanding.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                  <th className="py-2.5 px-4 font-semibold">कोड</th>
                  <th className="py-2.5 px-4 font-semibold">ग्राहक का नाम</th>
                  <th className="py-2.5 px-4 font-semibold">मोबाइल</th>
                  <th className="py-2.5 px-4 font-semibold">रूट व वार्ड</th>
                  <th className="py-2.5 px-4 text-right font-semibold">बकाया राशि (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {outstandingCustomers.map((cust) => {
                  const r = routes.find((rt) => rt.id === cust.routeId);
                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-mono font-bold text-blue-900">{cust.customerCode}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{cust.name}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-700">+91 {cust.mobile}</td>
                      <td className="py-2.5 px-4 text-slate-600">{r?.code} · वार्ड {cust.wardNumber}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-700 text-sm">
                        ₹{cust.currentBalance}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content 2: Daily Collection Summary */}
      {activeReportTab === 'daily_collection' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 text-xs font-bold text-slate-800">
            दैनिक वसूली प्रविष्टियां एवं माध्यम विभाजन
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                  <th className="py-2.5 px-4 font-semibold">रसीद सं.</th>
                  <th className="py-2.5 px-4 font-semibold">ग्राहक</th>
                  <th className="py-2.5 px-4 font-semibold">दिनांक</th>
                  <th className="py-2.5 px-4 font-semibold">माध्यम</th>
                  <th className="py-2.5 px-4 font-semibold">कलेक्टर</th>
                  <th className="py-2.5 px-4 text-right font-semibold">राशि (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-mono font-bold text-blue-900">{p.receiptNumber}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{p.customerName}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">{p.paymentDate}</td>
                    <td className="py-2.5 px-4 uppercase text-slate-700">{p.paymentMethod}</td>
                    <td className="py-2.5 px-4 text-slate-600">{p.collectedByAgentName}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-800 text-sm">
                      ₹{p.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content 3: Route Summary */}
      {activeReportTab === 'route_summary' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {routes.map((rt) => {
            const rtCustomers = customers.filter((c) => c.routeId === rt.id);
            const rtOutstanding = rtCustomers.reduce((s, c) => s + Math.max(0, c.currentBalance), 0);

            return (
              <div key={rt.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 font-mono">{rt.code}</span>
                  <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                    {rtCustomers.length} ग्राहक
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{rt.nameHi}</h3>
                  <div className="text-xs text-slate-500 mt-0.5">{rt.locality}</div>
                </div>
                <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-500">रूट पर कुल बकाया:</span>
                  <span className="font-mono font-bold text-rose-700 text-sm">₹{rtOutstanding}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
