import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Download, 
  Printer, 
  Calendar, 
  FileSpreadsheet, 
  TrendingUp, 
  Users, 
  CheckCircle2,
  FileText,
  IndianRupee,
  AlertCircle,
  MapPin,
  Award,
  Filter,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
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

interface RouteMonthlyMetric {
  routeId: string;
  routeCode: string;
  routeName: string;
  locality: string;
  customerCount: number;
  activeCustomerCount: number;
  invoicesGeneratedCount: number;
  invoicesBilledAmount: number;
  invoicesTotalPayable: number;
  revenueCollected: number;
  paymentsCount: number;
  cashCollected: number;
  digitalCollected: number;
  outstandingBalance: number;
  monthlyInvoiceUnpaid: number;
  collectionRate: number;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  customers,
  payments,
  invoices,
  routes,
  lang,
}) => {
  const t = translations[lang];

  // Determine available months from invoices and payments
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    invoices.forEach((inv) => {
      if (inv.billingMonth) monthSet.add(inv.billingMonth);
    });
    payments.forEach((p) => {
      if (p.paymentDate && p.paymentDate.length >= 7) {
        monthSet.add(p.paymentDate.slice(0, 7));
      }
    });
    if (monthSet.size === 0) {
      monthSet.add(new Date().toISOString().slice(0, 7));
    }
    return Array.from(monthSet).sort().reverse();
  }, [invoices, payments]);

  const defaultLatestMonth = availableMonths[0] || new Date().toISOString().slice(0, 7);

  // Date-Range Picker Filter State
  const [filterMode, setFilterMode] = useState<'month' | 'custom_range' | 'all'>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => defaultLatestMonth);
  const [startDate, setStartDate] = useState<string>(() => `${defaultLatestMonth}-01`);
  const [endDate, setEndDate] = useState<string>(() => `${defaultLatestMonth}-31`);
  const [activePreset, setActivePreset] = useState<string>('this_month');

  const [activeReportTab, setActiveReportTab] = useState<
    'monthly_route_summary' | 'outstanding' | 'daily_collection' | 'route_summary'
  >('monthly_route_summary');

  // Helper to get latest reference date from dataset or current date
  const referenceDateStr = useMemo(() => {
    const dates: string[] = [];
    payments.forEach((p) => {
      if (p.paymentDate) dates.push(p.paymentDate);
    });
    invoices.forEach((inv) => {
      if (inv.billDate) dates.push(inv.billDate);
    });
    if (dates.length > 0) {
      return dates.sort().reverse()[0];
    }
    return new Date().toISOString().split('T')[0];
  }, [payments, invoices]);

  // Apply Quick Date Range Presets
  const handleApplyPreset = (preset: 'today' | 'last_7_days' | 'this_month' | 'last_3_months' | 'all') => {
    setActivePreset(preset);

    if (preset === 'all') {
      setFilterMode('all');
      setSelectedMonth('all');
      return;
    }

    if (preset === 'this_month') {
      const m = availableMonths[0] || referenceDateStr.slice(0, 7);
      setFilterMode('month');
      setSelectedMonth(m);
      setStartDate(`${m}-01`);
      setEndDate(`${m}-31`);
      return;
    }

    const baseDate = new Date(`${referenceDateStr}T00:00:00`);
    const formatYMD = (d: Date) => d.toISOString().split('T')[0];

    if (preset === 'today') {
      const dStr = formatYMD(baseDate);
      setFilterMode('custom_range');
      setStartDate(dStr);
      setEndDate(dStr);
      return;
    }

    if (preset === 'last_7_days') {
      const start = new Date(baseDate);
      start.setDate(start.getDate() - 6);
      setFilterMode('custom_range');
      setStartDate(formatYMD(start));
      setEndDate(formatYMD(baseDate));
      return;
    }

    if (preset === 'last_3_months') {
      const start = new Date(baseDate);
      start.setMonth(start.getMonth() - 2);
      start.setDate(1);
      setFilterMode('custom_range');
      setStartDate(formatYMD(start));
      setEndDate(formatYMD(baseDate));
    }
  };

  // Match helpers for Invoices and Payments based on active Date-Range Filter
  const matchesInvoicePeriod = (inv: Invoice): boolean => {
    if (filterMode === 'all') return true;
    if (filterMode === 'month') {
      return selectedMonth === 'all' || inv.billingMonth === selectedMonth;
    }
    // custom_range
    const billDate = inv.billDate || (inv.billingMonth ? `${inv.billingMonth}-01` : '');
    const startMonth = startDate ? startDate.slice(0, 7) : '';
    const endMonth = endDate ? endDate.slice(0, 7) : '';

    if (billDate && (!startDate || billDate >= startDate) && (!endDate || billDate <= endDate)) {
      return true;
    }
    if (
      inv.billingMonth &&
      (!startMonth || inv.billingMonth >= startMonth) &&
      (!endMonth || inv.billingMonth <= endMonth)
    ) {
      return true;
    }
    return false;
  };

  const matchesPaymentPeriod = (p: PaymentRecord): boolean => {
    if (filterMode === 'all') return true;
    if (filterMode === 'month') {
      return selectedMonth === 'all' || (Boolean(p.paymentDate) && p.paymentDate.startsWith(selectedMonth));
    }
    // custom_range
    if (!p.paymentDate) return false;
    if (startDate && p.paymentDate < startDate) return false;
    if (endDate && p.paymentDate > endDate) return false;
    return true;
  };

  // Filtered payments for Daily Collection tab and summaries
  const filteredPayments = useMemo(
    () => payments.filter(matchesPaymentPeriod),
    [payments, filterMode, selectedMonth, startDate, endDate]
  );

  // Outstanding Customers (Dues > 0)
  const outstandingCustomers = useMemo(
    () => customers.filter((c) => c.currentBalance > 0),
    [customers]
  );
  const totalOutstanding = useMemo(
    () => outstandingCustomers.reduce((sum, c) => sum + c.currentBalance, 0),
    [outstandingCustomers]
  );

  // Calculate Summary Grouped by Route for active Month or Custom Date Range
  const routeMonthlyMetrics = useMemo<RouteMonthlyMetric[]>(() => {
    const knownRouteIds = new Set(routes.map((r) => r.id));

    const buildMetricForGroup = (
      routeId: string,
      routeCode: string,
      routeName: string,
      locality: string,
      groupCustomers: Customer[]
    ): RouteMonthlyMetric => {
      const customerIdSet = new Set(groupCustomers.map((c) => c.id));

      // Invoices generated for customers in this route for the active filter period
      const routeInvoices = invoices.filter(
        (inv) => customerIdSet.has(inv.customerId) && matchesInvoicePeriod(inv)
      );

      // Payments collected from customers in this route for the active filter period
      const routePayments = payments.filter(
        (p) => customerIdSet.has(p.customerId) && matchesPaymentPeriod(p)
      );

      const invoicesGeneratedCount = routeInvoices.length;
      const invoicesBilledAmount = routeInvoices.reduce(
        (sum, inv) => sum + (inv.subtotal || 0),
        0
      );
      const invoicesTotalPayable = routeInvoices.reduce(
        (sum, inv) => sum + (inv.totalPayable || 0),
        0
      );
      const monthlyInvoiceUnpaid = routeInvoices.reduce(
        (sum, inv) => sum + Math.max(0, inv.remainingBalance || 0),
        0
      );

      const revenueCollected = routePayments.reduce((sum, p) => sum + p.amount, 0);
      const paymentsCount = routePayments.length;
      const cashCollected = routePayments
        .filter((p) => p.paymentMethod === 'cash')
        .reduce((sum, p) => sum + p.amount, 0);
      const digitalCollected = routePayments
        .filter((p) => p.paymentMethod !== 'cash')
        .reduce((sum, p) => sum + p.amount, 0);

      const outstandingBalance = groupCustomers.reduce(
        (sum, c) => sum + Math.max(0, c.currentBalance),
        0
      );

      const totalCollectible = revenueCollected + outstandingBalance;
      const collectionRate =
        totalCollectible > 0 ? Math.round((revenueCollected / totalCollectible) * 100) : 0;

      return {
        routeId,
        routeCode,
        routeName,
        locality,
        customerCount: groupCustomers.length,
        activeCustomerCount: groupCustomers.filter((c) => c.subscriptionStatus === 'active').length,
        invoicesGeneratedCount,
        invoicesBilledAmount,
        invoicesTotalPayable,
        revenueCollected,
        paymentsCount,
        cashCollected,
        digitalCollected,
        outstandingBalance,
        monthlyInvoiceUnpaid,
        collectionRate,
      };
    };

    const metrics: RouteMonthlyMetric[] = routes.map((rt) => {
      const rtCustomers = customers.filter((c) => c.routeId === rt.id);
      return buildMetricForGroup(
        rt.id,
        rt.code,
        lang === 'hi' ? rt.nameHi || rt.name : rt.name,
        rt.locality,
        rtCustomers
      );
    });

    // Include unassigned customers if any exist
    const unassignedCustomers = customers.filter((c) => !knownRouteIds.has(c.routeId));
    if (unassignedCustomers.length > 0) {
      metrics.push(
        buildMetricForGroup(
          'unassigned',
          'OTHER',
          lang === 'hi' ? 'अन्य / अनअसाइंड' : 'Other / Unassigned',
          '-',
          unassignedCustomers
        )
      );
    }

    return metrics;
  }, [routes, customers, invoices, payments, filterMode, selectedMonth, startDate, endDate, lang]);

  // Identify top-performing route by Total Revenue Collected (and collection rate tie-breaker)
  const topPerformingRoute = useMemo(() => {
    if (routeMonthlyMetrics.length === 0) return null;
    return [...routeMonthlyMetrics].sort((a, b) => {
      if (b.revenueCollected !== a.revenueCollected) {
        return b.revenueCollected - a.revenueCollected;
      }
      return b.collectionRate - a.collectionRate;
    })[0];
  }, [routeMonthlyMetrics]);

  // Chart data formatted for Recharts BarChart
  const routeChartData = useMemo(() => {
    return routeMonthlyMetrics.map((m) => ({
      routeId: m.routeId,
      routeCode: m.routeCode,
      routeName: m.routeName,
      locality: m.locality,
      label: `${m.routeCode} (${m.routeName})`,
      totalRevenue: m.revenueCollected,
      outstandingBalance: m.outstandingBalance,
      invoicesCount: m.invoicesGeneratedCount,
      collectionRate: m.collectionRate,
    }));
  }, [routeMonthlyMetrics]);

  // Grand Totals across all routes for the selected month
  const monthlyTotals = useMemo(() => {
    return routeMonthlyMetrics.reduce(
      (acc, item) => ({
        customerCount: acc.customerCount + item.customerCount,
        invoicesGeneratedCount: acc.invoicesGeneratedCount + item.invoicesGeneratedCount,
        invoicesBilledAmount: acc.invoicesBilledAmount + item.invoicesBilledAmount,
        invoicesTotalPayable: acc.invoicesTotalPayable + item.invoicesTotalPayable,
        revenueCollected: acc.revenueCollected + item.revenueCollected,
        paymentsCount: acc.paymentsCount + item.paymentsCount,
        cashCollected: acc.cashCollected + item.cashCollected,
        digitalCollected: acc.digitalCollected + item.digitalCollected,
        outstandingBalance: acc.outstandingBalance + item.outstandingBalance,
        monthlyInvoiceUnpaid: acc.monthlyInvoiceUnpaid + item.monthlyInvoiceUnpaid,
      }),
      {
        customerCount: 0,
        invoicesGeneratedCount: 0,
        invoicesBilledAmount: 0,
        invoicesTotalPayable: 0,
        revenueCollected: 0,
        paymentsCount: 0,
        cashCollected: 0,
        digitalCollected: 0,
        outstandingBalance: 0,
        monthlyInvoiceUnpaid: 0,
      }
    );
  }, [routeMonthlyMetrics]);

  const formatMonthLabel = (monthStr: string) => {
    if (monthStr === 'all') {
      return lang === 'hi' ? 'सभी महीने (All Months)' : 'All Months';
    }
    const [year, month] = monthStr.split('-');
    const monthNamesHi: Record<string, string> = {
      '01': 'जनवरी',
      '02': 'फरवरी',
      '03': 'मार्च',
      '04': 'अप्रैल',
      '05': 'मई',
      '06': 'जून',
      '07': 'जुलाई',
      '08': 'अगस्त',
      '09': 'सितंबर',
      '10': 'अक्टूबर',
      '11': 'नवंबर',
      '12': 'दिसंबर',
    };
    const monthNamesEn: Record<string, string> = {
      '01': 'January',
      '02': 'February',
      '03': 'March',
      '04': 'April',
      '05': 'May',
      '06': 'June',
      '07': 'July',
      '08': 'August',
      '09': 'September',
      '10': 'October',
      '11': 'November',
      '12': 'December',
    };
    if (!year || !month) return monthStr;
    return lang === 'hi'
      ? `${monthNamesHi[month] || month} ${year}`
      : `${monthNamesEn[month] || month} ${year}`;
  };

  // Human-readable active period label for headers, charts, and exports
  const activePeriodLabel = useMemo(() => {
    if (filterMode === 'all') {
      return lang === 'hi' ? 'सभी समय (All Time)' : 'All Time';
    }
    if (filterMode === 'custom_range') {
      const fromLbl = startDate || '...';
      const toLbl = endDate || '...';
      return `${fromLbl} → ${toLbl}`;
    }
    return formatMonthLabel(selectedMonth);
  }, [filterMode, selectedMonth, startDate, endDate, lang]);

  const handleExportCSV = () => {
    const periodSlug =
      filterMode === 'custom_range'
        ? `${startDate}_to_${endDate}`
        : filterMode === 'all'
        ? 'all_time'
        : selectedMonth;

    if (activeReportTab === 'monthly_route_summary' || activeReportTab === 'route_summary') {
      const headers = [
        'Route Code',
        'Route Name',
        'Locality',
        'Total Customers',
        'Period',
        'Total Invoices Generated',
        'Total Invoiced Amount (INR)',
        'Total Revenue Collected (INR)',
        'Cash Collected (INR)',
        'UPI/Digital Collected (INR)',
        'Total Outstanding Balance (INR)',
      ];
      const rows = routeMonthlyMetrics.map((m) => [
        m.routeCode,
        `"${m.routeName}"`,
        `"${m.locality}"`,
        m.customerCount,
        `"${activePeriodLabel}"`,
        m.invoicesGeneratedCount,
        m.invoicesBilledAmount,
        m.revenueCollected,
        m.cashCollected,
        m.digitalCollected,
        m.outstandingBalance,
      ]);
      rows.push([
        'TOTAL',
        '"All Routes Total"',
        '"-"',
        monthlyTotals.customerCount,
        `"${activePeriodLabel}"`,
        monthlyTotals.invoicesGeneratedCount,
        monthlyTotals.invoicesBilledAmount,
        monthlyTotals.revenueCollected,
        monthlyTotals.cashCollected,
        monthlyTotals.digitalCollected,
        monthlyTotals.outstandingBalance,
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `route_summary_${periodSlug}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

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

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
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
    <div className="space-y-4">
      {/* Report Switcher Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-slate-900">{t.nav.reports}</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
              <Calendar className="w-3 h-3" />
              <span>{activePeriodLabel}</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            रूट-वार मासिक वसूली, कस्टम दिनांक रेंज विश्लेषण, जनरेटेड बिल एवं कुल बकाया रिपोर्ट।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition shadow-xs whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-900" />
            <span>Excel / CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-xl transition shadow-xs whitespace-nowrap cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t.common.print}</span>
          </button>
        </div>
      </div>

      {/* Dedicated Date-Range & Month Picker Filter Component */}
      <div className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Filter Mode Switcher (Month vs Custom Date Range vs All Time) */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-1">
              <Filter className="w-3.5 h-3.5 text-blue-900" />
              <span>अवधि फ़िल्टर (Period Filter):</span>
            </div>

            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setFilterMode('month');
                  if (selectedMonth === 'all') {
                    setSelectedMonth(defaultLatestMonth);
                  }
                  setActivePreset('this_month');
                }}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  filterMode === 'month'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                माह अनुसार (By Month)
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterMode('custom_range');
                  setActivePreset('custom');
                }}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  filterMode === 'custom_range'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                कस्टम दिनांक रेंज (Date Range)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('all')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                सभी समय (All Time)
              </button>
            </div>
          </div>

          {/* Right: Quick Date Range Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
            <span className="text-slate-400 mr-0.5">त्वरित चयन:</span>
            <button
              type="button"
              onClick={() => handleApplyPreset('today')}
              className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                activePreset === 'today' && filterMode === 'custom_range'
                  ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              आज (Today)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('last_7_days')}
              className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                activePreset === 'last_7_days' && filterMode === 'custom_range'
                  ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              पिछले 7 दिन (7D)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('this_month')}
              className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                activePreset === 'this_month' && filterMode === 'month'
                  ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              चालू माह (This Month)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('last_3_months')}
              className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                activePreset === 'last_3_months' && filterMode === 'custom_range'
                  ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              पिछले 3 माह (3M)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('this_month')}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              title="फ़िल्टर रीसेट करें"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom Row: Active Picker Inputs (Specific Month OR Start Date -> End Date) */}
        {filterMode === 'month' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-4 h-4 text-blue-900 shrink-0" />
              <label htmlFor="report-month-select" className="text-xs font-semibold text-slate-600">
                {lang === 'hi' ? 'बिलिंग माह चुनें:' : 'Select Month:'}
              </label>
              <select
                id="report-month-select"
                value={selectedMonth}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedMonth(val);
                  if (val === 'all') {
                    setFilterMode('all');
                    setActivePreset('all');
                  } else {
                    setStartDate(`${val}-01`);
                    setEndDate(`${val}-31`);
                    setActivePreset('custom_month');
                  }
                }}
                className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthLabel(m)} ({m})
                  </option>
                ))}
                <option value="all">
                  {lang === 'hi' ? 'सभी महीने (All Months)' : 'All Months'}
                </option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <span className="text-xs font-semibold text-slate-600">कैलेंडर माह:</span>
              <input
                type="month"
                aria-label="Select billing month"
                value={selectedMonth === 'all' ? defaultLatestMonth : selectedMonth}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedMonth(e.target.value);
                    setStartDate(`${e.target.value}-01`);
                    setEndDate(`${e.target.value}-31`);
                    setActivePreset('custom_month');
                  }
                }}
                className="text-xs font-mono font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        )}

        {filterMode === 'custom_range' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-4 h-4 text-blue-900 shrink-0" />
              <label htmlFor="report-start-date" className="text-xs font-semibold text-slate-600">
                प्रारंभ तिथि (From):
              </label>
              <input
                id="report-start-date"
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActivePreset('custom');
                }}
                className="text-xs font-mono font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-600"
              />
            </div>

            <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:block" />

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-4 h-4 text-blue-900 shrink-0" />
              <label htmlFor="report-end-date" className="text-xs font-semibold text-slate-600">
                अंतिम तिथि (To):
              </label>
              <input
                id="report-end-date"
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActivePreset('custom');
                }}
                className="text-xs font-mono font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-600"
              />
            </div>

            <span className="text-[11px] text-slate-500 font-medium">
              चयनित रेंज में <strong className="text-emerald-700">{monthlyTotals.paymentsCount} रसीदें</strong> व{' '}
              <strong className="text-blue-900">{monthlyTotals.invoicesGeneratedCount} बिल</strong> मिले
            </span>
          </div>
        )}
      </div>

      {/* Report Type Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveReportTab('monthly_route_summary')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
            activeReportTab === 'monthly_route_summary'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>मासिक रूट सारांश (Monthly Route Summary)</span>
        </button>
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
          रूट वितरण प्रदर्शन (Route Cards)
        </button>
      </div>

      {/* Content 0: Monthly Summary Report Grouped by Route */}
      {activeReportTab === 'monthly_route_summary' && (
        <div className="space-y-4">
          {/* Monthly KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Revenue Collected */}
            <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  कुल वसूली (Total Revenue Collected)
                </span>
                <div className="text-2xl font-extrabold font-mono text-emerald-800">
                  ₹{monthlyTotals.revenueCollected.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-0.5">
                  <span>{monthlyTotals.paymentsCount} रसीदें</span>
                  <span>•</span>
                  <span>नकद: ₹{monthlyTotals.cashCollected.toLocaleString('en-IN')}</span>
                  <span>•</span>
                  <span>UPI: ₹{monthlyTotals.digitalCollected.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            {/* Total Invoices Generated */}
            <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-xs flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                  कुल जनरेटेड बिल (Total Invoices Generated)
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold font-mono text-blue-900">
                    {monthlyTotals.invoicesGeneratedCount}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    बिल (₹{monthlyTotals.invoicesBilledAmount.toLocaleString('en-IN')})
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 pt-0.5">
                  अवधि: <strong className="text-slate-700">{activePeriodLabel}</strong> • कुल देय बिल: ₹
                  {monthlyTotals.invoicesTotalPayable.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-900">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            {/* Total Outstanding Balance */}
            <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                  कुल बकाया राशि (Total Outstanding Balance)
                </span>
                <div className="text-2xl font-extrabold font-mono text-rose-700">
                  ₹{monthlyTotals.outstandingBalance.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-500 pt-0.5">
                  {outstandingCustomers.length} बकायादार ग्राहक • सभी {routes.length} रूट शामिल
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Recharts BarChart: Total Revenue vs Outstanding Balance Grouped by Route */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-900" />
                  <span>
                    रूट-वार तुलनात्मक चार्ट: कुल वसूली बनाम बकाया राशि (Total Revenue vs Outstanding Balance)
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  उच्च प्रदर्शन वाले वितरण क्षेत्रों की त्वरित पहचान के लिए रूट-वार राजस्व वसूली और बकाया तुलना ({activePeriodLabel})।
                </p>
              </div>

              {topPerformingRoute && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl self-start md:self-auto">
                  <Award className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div className="text-[11px]">
                    <span className="text-emerald-800 font-semibold">शीर्ष प्रदर्शन रूट (Top Route): </span>
                    <span className="font-bold text-emerald-950">
                      {topPerformingRoute.routeCode} · {topPerformingRoute.routeName}
                    </span>
                    <span className="font-mono font-bold text-emerald-700 ml-1.5">
                      (₹{topPerformingRoute.revenueCollected.toLocaleString('en-IN')} | {topPerformingRoute.collectionRate}%)
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={routeChartData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                  barGap={8}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(val: number) => `₹${val.toLocaleString('en-IN')}`}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-700 text-xs space-y-1.5">
                          <div className="font-bold text-amber-300 border-b border-slate-700 pb-1">
                            {data.routeCode} — {data.routeName} ({data.locality})
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-emerald-300">कुल वसूली (Total Revenue):</span>
                            <span className="font-mono font-bold text-emerald-400">
                              ₹{Number(data.totalRevenue).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-rose-300">कुल बकाया (Outstanding Balance):</span>
                            <span className="font-mono font-bold text-rose-400">
                              ₹{Number(data.outstandingBalance).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800 text-[11px] text-slate-300">
                            <span>वसूली दर (Collection Rate):</span>
                            <span className="font-mono font-bold text-white">{data.collectionRate}%</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '8px' }}
                  />
                  <Bar
                    dataKey="totalRevenue"
                    name={lang === 'hi' ? 'कुल वसूली (Total Revenue)' : 'Total Revenue'}
                    fill="#059669"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                  <Bar
                    dataKey="outstandingBalance"
                    name={lang === 'hi' ? 'कुल बकाया (Outstanding Balance)' : 'Outstanding Balance'}
                    fill="#e11d48"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Route-Grouped Monthly Summary Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-900" />
                  <span>
                    रूट-वार सारांश रिपोर्ट (Summary Grouped by Route) —{' '}
                    <span className="text-blue-900">{activePeriodLabel}</span>
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  प्रत्येक वितरण रूट के अनुसार कुल जनरेटेड बिल, कुल वसूली और कुल बकाया बैलेंस का विवरण।
                </p>
              </div>
              <span className="text-xs font-mono font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                कुल रूट: {routeMonthlyMetrics.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
                    <th className="py-3 px-4 font-semibold">रूट कोड</th>
                    <th className="py-3 px-4 font-semibold">रूट का नाम व क्षेत्र</th>
                    <th className="py-3 px-4 text-center font-semibold">ग्राहक</th>
                    <th className="py-3 px-4 text-center font-semibold">
                      जनरेटेड बिल (Invoices)
                    </th>
                    <th className="py-3 px-4 text-right font-semibold">
                      मासिक बिल राशि (₹)
                    </th>
                    <th className="py-3 px-4 text-right font-semibold">
                      कुल वसूली / Revenue (₹)
                    </th>
                    <th className="py-3 px-4 text-right font-semibold">
                      कुल बकाया / Outstanding (₹)
                    </th>
                    <th className="py-3 px-4 text-center font-semibold">वसूली %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {routeMonthlyMetrics.map((item) => (
                    <tr key={item.routeId} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono font-bold text-blue-900">
                        <span className="bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                          {item.routeCode}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{item.routeName}</div>
                        <div className="text-[11px] text-slate-500">{item.locality}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                        {item.customerCount}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 font-mono font-bold">
                          {item.invoicesGeneratedCount} बिल
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                        ₹{item.invoicesBilledAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-bold text-emerald-700 text-sm">
                          ₹{item.revenueCollected.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {item.paymentsCount} रसीद (नकद ₹{item.cashCollected} | UPI ₹{item.digitalCollected})
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-700 text-sm">
                        ₹{item.outstandingBalance.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-mono font-bold text-[11px] text-slate-700">
                            {item.collectionRate}%
                          </span>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full"
                              style={{ width: `${Math.min(100, item.collectionRate)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold text-xs">
                    <td className="py-3 px-4 font-mono" colSpan={2}>
                      कुल योग (All Routes Grand Total)
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {monthlyTotals.customerCount}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {monthlyTotals.invoicesGeneratedCount} बिल
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      ₹{monthlyTotals.invoicesBilledAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-300 text-sm">
                      ₹{monthlyTotals.revenueCollected.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-300 text-sm">
                      ₹{monthlyTotals.outstandingBalance.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {monthlyTotals.revenueCollected + monthlyTotals.outstandingBalance > 0
                        ? Math.round(
                            (monthlyTotals.revenueCollected /
                              (monthlyTotals.revenueCollected + monthlyTotals.outstandingBalance)) *
                              100
                          )
                        : 0}
                      %
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

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
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-slate-800">
              दैनिक वसूली प्रविष्टियां ({activePeriodLabel}) — कुल {filteredPayments.length} रसीदें
            </span>
            <span className="font-mono font-bold text-emerald-700 text-sm">
              अवधि कुल वसूली: ₹{monthlyTotals.revenueCollected.toLocaleString('en-IN')}
            </span>
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
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      चयनित दिनांक रेंज ({activePeriodLabel}) में कोई वसूली रसीद नहीं मिली।
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content 3: Route Summary Cards */}
      {activeReportTab === 'route_summary' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {routeMonthlyMetrics.map((rt) => (
            <div key={rt.routeId} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900 font-mono bg-blue-50 px-2.5 py-0.5 rounded-md">
                  {rt.routeCode}
                </span>
                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                  {rt.customerCount} ग्राहक
                </span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">{rt.routeName}</h3>
                <div className="text-xs text-slate-500 mt-0.5">{rt.locality}</div>
              </div>
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">मासिक जनरेटेड बिल:</span>
                  <span className="font-mono font-bold text-blue-900">
                    {rt.invoicesGeneratedCount} बिल (₹{rt.invoicesBilledAmount.toLocaleString('en-IN')})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">मासिक कुल वसूली:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    ₹{rt.revenueCollected.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">रूट पर कुल बकाया:</span>
                  <span className="font-mono font-bold text-rose-700 text-sm">
                    ₹{rt.outstandingBalance.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
