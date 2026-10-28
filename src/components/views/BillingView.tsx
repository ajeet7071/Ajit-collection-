import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Search,
  Printer,
  CheckSquare,
  Square,
  Bluetooth,
  X,
  Eye
} from 'lucide-react';
import { 
  Customer, 
  Newspaper, 
  DailyDeliveryRecord, 
  Invoice, 
  Agency, 
  Language,
  UserProfile
} from '../../types';
import { translations } from '../../i18n/translations';
import {
  buildBulkPendingInvoicesThermalSnippet,
  triggerPrintBulkPendingThermalSummary,
  triggerBluetoothBulkPendingThermalSummary
} from '../../services/printService';

interface BillingViewProps {
  customers: Customer[];
  newspapers: Newspaper[];
  deliveries: DailyDeliveryRecord[];
  invoices: Invoice[];
  agency: Agency;
  currentUser: UserProfile;
  lang: Language;
  onOpenInvoiceModal: (invoice: Invoice) => void;
  onShareWhatsAppBill: (invoice: Invoice) => void;
  onDeleteInvoice?: (invoiceId: string) => void;
}

export const BillingView: React.FC<BillingViewProps> = ({
  invoices,
  agency,
  lang,
  onOpenInvoiceModal,
}) => {
  const t = translations[lang];

  const currentMonthStr = '2026-10';
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [billingPolicy, setBillingPolicy] = useState<'calendar_days' | 'actual_delivery' | 'fixed_monthly'>(
    agency.billingPolicy
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [isBulkPreviewOpen, setIsBulkPreviewOpen] = useState(false);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesMonth = !selectedMonth || inv.billingMonth === selectedMonth;
      const matchesSearch =
        inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.customerMobile.includes(searchQuery);
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;

      return matchesMonth && matchesSearch && matchesStatus;
    });
  }, [invoices, selectedMonth, searchQuery, statusFilter]);

  // Pending invoices eligible for bulk print in current filtered view
  const filteredPendingInvoices = useMemo(
    () => filteredInvoices.filter((inv) => inv.status !== 'paid'),
    [filteredInvoices]
  );

  // Selected pending invoices across the filtered list (or all invoices if selected)
  const selectedPendingInvoices = useMemo(
    () => invoices.filter((inv) => inv.status !== 'paid' && selectedInvoiceIds.includes(inv.id)),
    [invoices, selectedInvoiceIds]
  );

  const allVisiblePendingSelected =
    filteredPendingInvoices.length > 0 &&
    filteredPendingInvoices.every((inv) => selectedInvoiceIds.includes(inv.id));

  const toggleInvoiceSelection = (invoiceId: string) => {
    setSelectedInvoiceIds((prev) =>
      prev.includes(invoiceId) ? prev.filter((id) => id !== invoiceId) : [...prev, invoiceId]
    );
  };

  const handleToggleSelectAllPending = () => {
    if (allVisiblePendingSelected) {
      const visibleIds = new Set(filteredPendingInvoices.map((inv) => inv.id));
      setSelectedInvoiceIds((prev) => prev.filter((id) => !visibleIds.has(id)));
    } else {
      const merged = new Set([...selectedInvoiceIds, ...filteredPendingInvoices.map((inv) => inv.id)]);
      setSelectedInvoiceIds(Array.from(merged));
    }
  };

  const selectedTotalPendingDue = selectedPendingInvoices.reduce(
    (sum, inv) => sum + (inv.remainingBalance > 0 ? inv.remainingBalance : inv.totalPayable - inv.amountPaid),
    0
  );

  const totalBilledMonth = filteredInvoices.reduce((sum, inv) => sum + inv.totalPayable, 0);
  const totalCollectedMonth = filteredInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
  const totalRemainingMonth = filteredInvoices.reduce((sum, inv) => sum + inv.remainingBalance, 0);

  const handleDirectBulkThermalPrint = () => {
    const targets = selectedPendingInvoices.length > 0 ? selectedPendingInvoices : filteredPendingInvoices;
    if (targets.length === 0) return;
    if (selectedPendingInvoices.length === 0) {
      setSelectedInvoiceIds(targets.map((inv) => inv.id));
    }
    triggerPrintBulkPendingThermalSummary(targets, agency, selectedMonth);
  };

  const handleOpenBulkPreview = () => {
    const targets = selectedPendingInvoices.length > 0 ? selectedPendingInvoices : filteredPendingInvoices;
    if (targets.length === 0) return;
    if (selectedPendingInvoices.length === 0) {
      setSelectedInvoiceIds(targets.map((inv) => inv.id));
    }
    setIsBulkPreviewOpen(true);
  };

  return (
    <div className="space-y-5">
      
      {/* Top Banner / Auto-Billing Status */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{t.billing.title}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              महीने के अंत में गणना कर प्रत्येक ग्राहक का बिल स्वतः जनरेट होता है एवं खाता बही (Ledger) में नामे (Debit) दर्ज हो जाता है।
            </p>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>स्वचालित मासिक बिलिंग सक्रिय (Auto Month-End Billing)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {/* Month selector */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">{t.billing.billingMonth}</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none"
            />
          </div>

          {/* Billing policy selector */}
          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">{t.billing.policyTitle}</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setBillingPolicy('calendar_days')}
                className={`p-2 rounded-xl border text-left transition ${
                  billingPolicy === 'calendar_days'
                    ? 'bg-blue-50 border-blue-800 text-blue-950 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div>कैलेंडर दिवस (31 दिन)</div>
                <div className="text-[10px] text-slate-500 font-normal">दैनिक दर × कुल दिन</div>
              </button>

              <button
                type="button"
                onClick={() => setBillingPolicy('actual_delivery')}
                className={`p-2 rounded-xl border text-left transition ${
                  billingPolicy === 'actual_delivery'
                    ? 'bg-blue-50 border-blue-800 text-blue-950 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div>वास्तविक वितरण दिवस</div>
                <div className="text-[10px] text-slate-500 font-normal">हॉकर द्वारा दर्ज प्रतियां</div>
              </button>

              <button
                type="button"
                onClick={() => setBillingPolicy('fixed_monthly')}
                className={`p-2 rounded-xl border text-left transition ${
                  billingPolicy === 'fixed_monthly'
                    ? 'bg-blue-50 border-blue-800 text-blue-950 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div>मासिक फिक्स दर</div>
                <div className="text-[10px] text-slate-500 font-normal">मासिक फ्लैट सब्सक्रिप्शन</div>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
          <span className="text-[11px] text-slate-500 font-medium block">कुल बिल राशि (Payable)</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-0.5 block">
            ₹{totalBilledMonth.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
          <span className="text-[11px] text-emerald-700 font-medium block">प्राप्त भुगतान (Collected)</span>
          <span className="text-xl font-bold font-mono text-emerald-800 mt-0.5 block">
            ₹{totalCollectedMonth.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
          <span className="text-[11px] text-rose-600 font-medium block">शेष बकाया (Pending Due)</span>
          <span className="text-xl font-bold font-mono text-rose-700 mt-0.5 block">
            ₹{totalRemainingMonth.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Bulk Print Thermal Summary Bar */}
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleToggleSelectAllPending}
            disabled={filteredPendingInvoices.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {allVisiblePendingSelected ? (
              <CheckSquare className="w-4 h-4 text-teal-400 shrink-0" />
            ) : (
              <Square className="w-4 h-4 text-slate-400 shrink-0" />
            )}
            <span>
              {allVisiblePendingSelected
                ? 'सभी बकाया चयन हटाएं (Clear Selection)'
                : `सभी बकाया चुनें (${filteredPendingInvoices.length} Pending)`}
            </span>
          </button>

          <div className="text-xs">
            {selectedPendingInvoices.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-teal-500/20 border border-teal-400/30 text-teal-300 font-bold">
                  {selectedPendingInvoices.length} बकाया बिल चयनित
                </span>
                <span className="text-slate-300">
                  कुल वसूली योग्य योग:{' '}
                  <strong className="font-mono text-white text-sm">
                    ₹{selectedTotalPendingDue.toLocaleString('en-IN')}
                  </strong>
                </span>
              </div>
            ) : (
              <span className="text-slate-300">
                थर्मल प्रिंटर (58mm/80mm) पर एकल सारांश शीट (Bulk Summary Sheet) प्रिंट करने के लिए बकाया बिल चुनें।
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedPendingInvoices.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedInvoiceIds([])}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              रीसेट (Reset)
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenBulkPreview}
            disabled={selectedPendingInvoices.length === 0 && filteredPendingInvoices.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="थर्मल रसीद सारांश शीट का पूर्वावलोकन देखें"
          >
            <Eye className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>सारांश शीट देखें (Preview)</span>
          </button>

          <button
            type="button"
            onClick={handleDirectBulkThermalPrint}
            disabled={selectedPendingInvoices.length === 0 && filteredPendingInvoices.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="चयनित बकाया बिलों की सिंगल थर्मल सारांश शीट प्रिंट करें"
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span>
              बल्क थर्मल प्रिंट (Bulk Print{' '}
              {selectedPendingInvoices.length > 0
                ? `${selectedPendingInvoices.length}`
                : filteredPendingInvoices.length > 0
                ? `All ${filteredPendingInvoices.length}`
                : '0'}
              )
            </span>
          </button>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Filters */}
        <div className="p-3 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="बिल नंबर, ग्राहक नाम या फोन खोजें..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:bg-white focus:outline-none font-medium"
            >
              <option value="all">सभी स्थिति (All)</option>
              <option value="unpaid">अदत्त (Unpaid)</option>
              <option value="partial">आंशिक (Partial)</option>
              <option value="paid">पूर्ण चुकता (Paid)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                <th className="py-2.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allVisiblePendingSelected}
                    disabled={filteredPendingInvoices.length === 0}
                    onChange={handleToggleSelectAllPending}
                    title="सभी बकाया बिल चुनें (Select all pending invoices)"
                    className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer disabled:opacity-40"
                  />
                </th>
                <th className="py-2.5 px-3 font-semibold">{t.billing.invoiceNumber}</th>
                <th className="py-2.5 px-3 font-semibold">{t.billing.customer}</th>
                <th className="py-2.5 px-3 text-right font-semibold">{t.billing.billedAmount}</th>
                <th className="py-2.5 px-3 text-right font-semibold">{t.billing.prevBalance}</th>
                <th className="py-2.5 px-3 text-right font-semibold">{t.billing.totalPayable}</th>
                <th className="py-2.5 px-3 text-center font-semibold">{t.billing.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    इस माह के लिए कोई बिल नहीं मिला। महीने के अंत में सभी सक्रिय ग्राहकों का बिल व लेजर प्रविष्टि स्वतः तैयार हो जाती है।
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isPending = inv.status !== 'paid';
                  const isSelected = selectedInvoiceIds.includes(inv.id);
                  return (
                    <tr
                      key={inv.id}
                      className={`transition ${
                        isSelected ? 'bg-teal-50/60 hover:bg-teal-50' : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        {isPending ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleInvoiceSelection(inv.id)}
                            title="बल्क थर्मल सारांश प्रिंट के लिए चुनें"
                            className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                          />
                        ) : (
                          <span
                            className="inline-block text-[10px] text-emerald-600 font-bold"
                            title="पूर्ण चुकता बिल"
                          >
                            ✓
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => onOpenInvoiceModal(inv)}
                          className="font-mono font-bold text-blue-900 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 inline-flex items-center gap-1.5 transition cursor-pointer group shadow-2xs text-left"
                          title="बिल नंबर पर क्लिक कर बिल की सारी जानकारी व विकल्प देखें"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-700 group-hover:scale-110 transition-transform shrink-0" />
                          <span className="underline decoration-blue-300 underline-offset-2">{inv.invoiceNumber}</span>
                        </button>
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => onOpenInvoiceModal(inv)}
                          className="text-left group cursor-pointer"
                          title="ग्राहक का बिल देखने के लिए क्लिक करें"
                        >
                          <div className="font-bold text-slate-900 group-hover:text-blue-900 group-hover:underline decoration-blue-400 underline-offset-2 transition">
                            {inv.customerName}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">+91 {inv.customerMobile}</div>
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                        ₹{inv.subtotal}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        ₹{inv.previousBalance}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                        ₹{inv.remainingBalance > 0 ? inv.remainingBalance : inv.totalPayable}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'partial'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {inv.status === 'paid'
                            ? t.billing.paidStatus
                            : inv.status === 'partial'
                            ? t.billing.partialStatus
                            : t.billing.unpaidStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Bulk Thermal Summary Preview Modal */}
      {isBulkPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-teal-400" />
                <div>
                  <h3 className="text-sm font-bold">बल्क थर्मल सारांश शीट (Thermal Summary)</h3>
                  <p className="text-[11px] text-slate-300">
                    58mm / 80mm थर्मल रसीद प्रिंटर के लिए अनुकूलित ({selectedPendingInvoices.length} बकाया बिल)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkPreviewOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thermal Receipt Paper Preview */}
            <div className="p-4 bg-slate-100 overflow-y-auto flex-1 flex justify-center">
              <div
                className="bg-white shadow-md border border-slate-300 p-2 rounded-xs"
                dangerouslySetInnerHTML={{
                  __html: buildBulkPendingInvoicesThermalSnippet(
                    selectedPendingInvoices,
                    agency,
                    selectedMonth
                  ),
                }}
              />
            </div>

            {/* Modal Footer Actions */}
            <div className="p-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() =>
                  triggerBluetoothBulkPendingThermalSummary(selectedPendingInvoices, agency, selectedMonth)
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold transition cursor-pointer"
              >
                <Bluetooth className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                <span>Bluetooth POS (RawBT)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkPreviewOpen(false)}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  बंद करें
                </button>
                <button
                  type="button"
                  onClick={() =>
                    triggerPrintBulkPendingThermalSummary(selectedPendingInvoices, agency, selectedMonth)
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 shrink-0" />
                  <span>थर्मल शीट प्रिंट करें</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

