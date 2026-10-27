import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Download, 
  Upload, 
  Filter, 
  Phone, 
  MapPin, 
  Calendar, 
  PauseCircle, 
  PlayCircle, 
  FileText, 
  Edit3, 
  AlertTriangle,
  X,
  Check,
  IndianRupee,
  Trash2,
  User,
  CheckCircle2,
  XCircle,
  Eye,
  MessageSquare
} from 'lucide-react';
import { 
  Customer, 
  DeliveryRoute, 
  Newspaper, 
  CustomerLedgerEntry, 
  Language, 
  CustomerType, 
  SubscriptionStatus 
} from '../../types';
import { translations } from '../../i18n/translations';
import { storageService } from '../../services/storage';
import { triggerSms, formatDueBalanceReminderSms } from '../../services/smsService';

interface CustomersViewProps {
  customers: Customer[];
  routes: DeliveryRoute[];
  newspapers: Newspaper[];
  ledger: CustomerLedgerEntry[];
  lang: Language;
  onSaveCustomer: (customer: Customer) => void;
  onDeleteCustomer?: (customerId: string) => void;
  onViewLedger: (customer: Customer) => void;
  onDirectCollectPayment: (customer: Customer) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  routes,
  newspapers,
  ledger,
  lang,
  onSaveCustomer,
  onDeleteCustomer,
  onViewLedger,
  onDirectCollectPayment,
}) => {
  const t = translations[lang];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRouteFilter, setSelectedRouteFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [statusFeedbackMsg, setStatusFeedbackMsg] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [altMobile, setAltMobile] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [villageCity, setVillageCity] = useState('Sri Ganganagar');
  const [wardNumber, setWardNumber] = useState('01');
  const [routeId, setRouteId] = useState(routes[0]?.id || 'route_1');
  const [customerType, setCustomerType] = useState<CustomerType>('residential');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [selectedNewspaperIds, setSelectedNewspaperIds] = useState<string[]>([newspapers[0]?.id || 'np_bhaskar']);
  const [notes, setNotes] = useState('');

  const [duplicateWarning, setDuplicateWarning] = useState(false);

  // Filter customers
  const filteredCustomers = customers.filter((cust) => {
    const matchesSearch =
      cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cust.mobile.includes(searchQuery) ||
      cust.customerCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cust.wardNumber.includes(searchQuery) ||
      cust.address.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRoute = selectedRouteFilter === 'all' || cust.routeId === selectedRouteFilter;
    const matchesStatus = selectedStatusFilter === 'all' || cust.subscriptionStatus === selectedStatusFilter;

    return matchesSearch && matchesRoute && matchesStatus;
  });

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setName('');
    setMobile('');
    setAltMobile('');
    setAddress('');
    setLandmark('');
    setVillageCity('Sri Ganganagar');
    setWardNumber('01');
    setRouteId(routes[0]?.id || 'route_1');
    setCustomerType('residential');
    setOpeningBalance('0');
    setSelectedNewspaperIds([newspapers[0]?.id || 'np_bhaskar']);
    setNotes('');
    setDuplicateWarning(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setName(customer.name);
    setMobile(customer.mobile);
    setAltMobile(customer.alternateMobile || '');
    setAddress(customer.address);
    setLandmark(customer.landmark || '');
    setVillageCity(customer.villageCity);
    setWardNumber(customer.wardNumber);
    setRouteId(customer.routeId);
    setCustomerType(customer.customerType);
    setOpeningBalance(customer.openingBalance.toString());
    setSelectedNewspaperIds(customer.subscriptions.map((s) => s.newspaperId));
    setNotes(customer.notes || '');
    setDuplicateWarning(false);
    setIsModalOpen(true);
  };

  const handleCheckMobileDuplicate = (val: string) => {
    setMobile(val);
    if (val.length === 10) {
      const exists = customers.some(
        (c) => c.mobile === val && (!editingCustomer || c.id !== editingCustomer.id)
      );
      setDuplicateWarning(exists);
    } else {
      setDuplicateWarning(false);
    }
  };

  const handleSave = () => {
    if (!name.trim() || !mobile.trim()) return;

    const opBal = parseFloat(openingBalance) || 0;
    const customerCode = editingCustomer ? editingCustomer.customerCode : `AJT-${customers.length + 101}`;

    const subscriptions = selectedNewspaperIds.map((npId, idx) => {
      const np = newspapers.find((n) => n.id === npId);
      return {
        id: `sub_${customerCode}_${idx}`,
        newspaperId: npId,
        newspaperName: np?.name || 'Newspaper',
        newspaperNameHi: np?.nameHi || 'अखबार',
        quantity: 1,
        startDate: new Date().toISOString().split('T')[0],
        status: 'active' as const,
      };
    });

    const newCust: Customer = {
      id: editingCustomer ? editingCustomer.id : `cust_${Date.now()}`,
      customerCode,
      name,
      mobile,
      alternateMobile: altMobile || undefined,
      address,
      landmark: landmark || undefined,
      villageCity,
      wardNumber,
      routeId,
      customerType,
      subscriptionStatus: editingCustomer ? editingCustomer.subscriptionStatus : 'active',
      deliveryAgentId: 'agent_hawker_1',
      collectionAgentId: 'agent_collector_1',
      preferredLanguage: 'hi',
      openingBalance: opBal,
      currentBalance: editingCustomer ? editingCustomer.currentBalance : opBal,
      billingCycle: 'monthly',
      paymentPreference: 'upi',
      notes,
      subscriptions: subscriptions.length > 0 ? subscriptions : editingCustomer?.subscriptions || [],
      createdAt: editingCustomer ? editingCustomer.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveCustomer(newCust);
    setIsModalOpen(false);
  };

  const handleTogglePause = (customer: Customer) => {
    const isPaused = customer.subscriptionStatus === 'paused';
    const newStatus: SubscriptionStatus = isPaused ? 'active' : 'paused';
    const updated: Customer = {
      ...customer,
      subscriptionStatus: newStatus,
      pauseStartDate: !isPaused ? new Date().toISOString().split('T')[0] : undefined,
      pauseEndDate: !isPaused ? '2026-10-31' : undefined,
      updatedAt: new Date().toISOString(),
    };
    onSaveCustomer(updated);
  };

  const handleUpdateStatus = (newStatus: SubscriptionStatus) => {
    if (!detailCustomer) return;
    const isPaused = newStatus === 'paused';
    const updated: Customer = {
      ...detailCustomer,
      subscriptionStatus: newStatus,
      pauseStartDate: isPaused ? new Date().toISOString().split('T')[0] : undefined,
      pauseEndDate: isPaused ? '2026-10-31' : undefined,
      updatedAt: new Date().toISOString(),
    };
    onSaveCustomer(updated);
    setDetailCustomer(updated);
    setStatusFeedbackMsg(
      newStatus === 'active'
        ? '✓ ग्राहक खाता सफलतापूर्वक सक्रिय (Active) कर दिया गया है।'
        : newStatus === 'discontinued'
        ? '✓ ग्राहक खाता सफलतापूर्वक निष्क्रिय (Inactive) कर दिया गया है।'
        : '✓ ग्राहक खाता छुट्टी रोक (Paused) पर सेट किया गया।'
    );
    setTimeout(() => setStatusFeedbackMsg(''), 3500);
  };

  const handleSendCustomerSms = (cust: Customer) => {
    const agency = storageService.getAgency();
    const msg = formatDueBalanceReminderSms(cust, agency, lang);
    const success = triggerSms(cust.mobile, msg);
    if (success) {
      setStatusFeedbackMsg('✓ डिवाइस की SMS ऐप खुल गई है!');
      setTimeout(() => setStatusFeedbackMsg(''), 3000);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Code', 'Name', 'Mobile', 'Address', 'Ward', 'Route', 'Status', 'Balance'];
    const rows = customers.map((c) => [
      c.customerCode,
      `"${c.name}"`,
      c.mobile,
      `"${c.address}"`,
      c.wardNumber,
      routes.find((r) => r.id === c.routeId)?.code || c.routeId,
      c.subscriptionStatus,
      c.currentBalance,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ajeet_customers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      
      {/* Top Search & Actions Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.customers.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Route filter */}
          <select
            value={selectedRouteFilter}
            onChange={(e) => setSelectedRouteFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="all">{t.customers.filterRoute}</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.code} - {r.nameHi}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="all">{t.customers.filterStatus}</option>
            <option value="active">{t.customers.active}</option>
            <option value="paused">{t.customers.paused}</option>
            <option value="discontinued">{t.customers.discontinued}</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-xl transition shadow-xs whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.customers.addNew}</span>
          </button>
        </div>
      </div>

      {/* Customer List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                <th className="py-3 px-3 font-semibold">{t.customers.customerCode}</th>
                <th className="py-3 px-3 font-semibold">{t.customers.name}</th>
                <th className="py-3 px-3 font-semibold">{t.customers.mobile}</th>
                <th className="py-3 px-3 font-semibold">{t.customers.address}</th>
                <th className="py-3 px-3 font-semibold">{t.customers.newspapers}</th>
                <th className="py-3 px-3 text-right font-semibold">{t.customers.balance}</th>
                <th className="py-3 px-3 text-center font-bold text-emerald-800">कलेक्शन (वसूली)</th>
                <th className="py-3 px-3 text-center font-semibold">{t.customers.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                    कोई ग्राहक नहीं मिला। नया ग्राहक जोड़ने के लिए ऊपर दिए बटन पर क्लिक करें।
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const routeObj = routes.find((r) => r.id === cust.routeId);
                  const isPaused = cust.subscriptionStatus === 'paused';

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => setDetailCustomer(cust)}
                          className="inline-flex items-center gap-1.5 font-mono font-bold text-xs text-blue-900 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 px-2.5 py-1.5 rounded-lg border border-blue-200 transition group shadow-2xs cursor-pointer text-left"
                          title="कस्टमर कोड पर क्लिक करके फुल डिटेल देखें"
                        >
                          <span className="underline decoration-blue-300 underline-offset-2">{cust.customerCode}</span>
                          <span className="text-[10px] text-blue-600 group-hover:scale-125 transition">👁️</span>
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => setDetailCustomer(cust)}
                          className="font-bold text-slate-900 hover:text-blue-900 flex items-center gap-1.5 text-left transition cursor-pointer"
                          title="फुल डिटेल देखें"
                        >
                          <span>{cust.name}</span>
                          {isPaused && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">
                              छुट्टी रोक
                            </span>
                          )}
                          {cust.subscriptionStatus === 'discontinued' && (
                            <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-semibold">
                              निष्क्रिय
                            </span>
                          )}
                        </button>
                        <div className="text-[11px] text-slate-500 capitalize">
                          {cust.customerType === 'residential' ? 'घरेलू (Home)' : 'व्यावसायिक (Shop)'}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-slate-700">
                        +91 {cust.mobile}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <div>{cust.address}</div>
                        <div className="text-[10px] text-slate-400">
                          {routeObj?.code} · वार्ड: {cust.wardNumber}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {cust.subscriptions.map((sub) => (
                            <span
                              key={sub.id}
                              className="text-[10px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
                            >
                              {sub.newspaperNameHi} (x{sub.quantity})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`font-mono font-bold text-sm tabular-nums ${
                            cust.currentBalance > 0
                              ? 'text-rose-700'
                              : cust.currentBalance < 0
                              ? 'text-emerald-700'
                              : 'text-slate-800'
                          }`}
                        >
                          ₹{cust.currentBalance}
                        </span>
                        {cust.currentBalance < 0 && (
                          <span className="text-[9px] text-emerald-600 block">एडवांस जमा</span>
                        )}
                      </td>

                      {/* Prominent Direct Collection Button */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => onDirectCollectPayment(cust)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs whitespace-nowrap active:scale-95 ${
                            cust.currentBalance > 0
                              ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                          title={`ग्राहक ${cust.name} से भुगतान वसूलें`}
                        >
                          <IndianRupee className="w-3.5 h-3.5" />
                          <span>कलेक्शन ₹</span>
                        </button>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-1">
                          {/* View Full Details Button */}
                          <button
                            type="button"
                            onClick={() => setDetailCustomer(cust)}
                            className="p-1.5 text-blue-900 hover:text-blue-950 hover:bg-blue-50 rounded-lg transition"
                            title="ग्राहक की फुल डिटेल देखें"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Ledger Button */}
                          <button
                            onClick={() => onViewLedger(cust)}
                            className="p-1.5 text-slate-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition"
                            title={t.customers.historyLedger}
                          >
                            <FileText className="w-4 h-4" />
                          </button>



                          {/* Delete Customer */}
                          {onDeleteCustomer && (
                            <button
                              onClick={() => setCustomerToDelete(cust)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title={t.customers.delete}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-[92vw] sm:w-full max-w-xl max-h-[85dvh] sm:max-h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col">
            
            <div className="bg-blue-950 p-4 text-white flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold">
                {editingCustomer ? 'ग्राहक विवरण संशोधित करें' : 'नया ग्राहक जोड़ें (Add Customer)'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-blue-200 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain text-xs">
              
              {duplicateWarning && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{t.customers.duplicateWarning}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ग्राहक का पूरा नाम *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="उदा. राजेश कुमार"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">मोबाइल नंबर (10 अंक) *</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => handleCheckMobileDuplicate(e.target.value.replace(/\D/g, ''))}
                    placeholder="98XXXXXXXX"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">वैकल्पिक मोबाइल</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={altMobile}
                    onChange={(e) => setAltMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="वैकल्पिक संपर्क"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ग्राहक प्रकार</label>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value as CustomerType)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none"
                  >
                    <option value="residential">घरेलू (Residential)</option>
                    <option value="commercial">दुकान / व्यावसायिक (Commercial)</option>
                    <option value="institution">कार्यालय / संस्थान (Office)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">मकान / दुकान पता *</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="मकान सं. 12, गली नं. 4"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">वार्ड नंबर</label>
                  <input
                    type="text"
                    value={wardNumber}
                    onChange={(e) => setWardNumber(e.target.value)}
                    placeholder="वार्ड 02"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">वितरण रूट (Delivery Route)</label>
                  <select
                    value={routeId}
                    onChange={(e) => setRouteId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none"
                  >
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.code} - {r.nameHi}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">शुरुआती बकाया (Opening Balance)</label>
                  <input
                    type="number"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Newspaper selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  अखबार चयन करें (Select Subscriptions):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {newspapers.map((np) => {
                    const isSelected = selectedNewspaperIds.includes(np.id);
                    return (
                      <button
                        type="button"
                        key={np.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedNewspaperIds(selectedNewspaperIds.filter((id) => id !== np.id));
                          } else {
                            setSelectedNewspaperIds([...selectedNewspaperIds, np.id]);
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-50 border-blue-600 text-blue-950 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div>
                          <div>{np.nameHi}</div>
                          <div className="text-[10px] text-slate-500 font-normal">₹{np.retailPrice}/दिन</div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-900" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">टिप्पणी / लैंडमार्क (Notes)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="उदा. सुबह 6:30 बजे मुख्य गेट पर डालें"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                {editingCustomer && onDeleteCustomer ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerToDelete(editingCustomer);
                    }}
                    className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.customers.delete}</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl font-medium text-slate-700 hover:bg-slate-50"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-xl shadow-xs"
                  >
                    सुरक्षित करें
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Delete Customer Confirmation Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-[90vw] sm:w-full max-w-md max-h-[85dvh] overflow-y-auto overscroll-contain bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  {t.customers.deleteConfirm || 'क्या आप वाकई इस ग्राहक को हटाना चाहते हैं?'}
                </h4>
                <p className="text-xs text-slate-500">
                  यह क्रिया पूर्ववत नहीं की जा सकती (Cannot be undone).
                </p>
              </div>
            </div>

            {/* Customer Details Box */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">ग्राहक नाम:</span>
                <span className="font-bold text-slate-900">{customerToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ग्राहक कोड:</span>
                <span className="font-mono font-bold text-blue-900">{customerToDelete.customerCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">मोबाइल:</span>
                <span className="font-mono font-medium text-slate-800">+91 {customerToDelete.mobile}</span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-slate-200">
                <span className="text-slate-500">वर्तमान बकाया राशि:</span>
                <span className={`font-mono font-bold text-sm ${customerToDelete.currentBalance > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                  ₹{customerToDelete.currentBalance}
                </span>
              </div>
            </div>

            {customerToDelete.currentBalance > 0 && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>सावधानी: इस ग्राहक पर ₹{customerToDelete.currentBalance} का बकाया दर्ज है।</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                रद्द करें (Cancel)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteCustomer) {
                    onDeleteCustomer(customerToDelete.id);
                  }
                  setCustomerToDelete(null);
                  setIsModalOpen(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>हाँ, ग्राहक हटाएं</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CUSTOMER FULL DETAILS MODAL WITH ACTIVE / INACTIVE OPTION     */}
      {/* ------------------------------------------------------------- */}
      {detailCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-[92vw] sm:w-full max-w-2xl max-h-[85dvh] sm:max-h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center font-bold text-lg text-white border border-white/20 shadow-xs shrink-0">
                  {detailCustomer.name[0] || 'C'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-black bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-md shadow-xs">
                      {detailCustomer.customerCode}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      detailCustomer.subscriptionStatus === 'active'
                        ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                        : detailCustomer.subscriptionStatus === 'paused'
                        ? 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
                        : 'bg-rose-500/20 text-rose-200 border border-rose-400/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        detailCustomer.subscriptionStatus === 'active' ? 'bg-emerald-400' :
                        detailCustomer.subscriptionStatus === 'paused' ? 'bg-amber-400' : 'bg-rose-400'
                      }`} />
                      {detailCustomer.subscriptionStatus === 'active' ? 'सक्रिय (Active)' :
                       detailCustomer.subscriptionStatus === 'paused' ? 'छुट्टी रोक (Paused)' : 'निष्क्रिय (Inactive)'}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mt-1 leading-tight">
                    {detailCustomer.name}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setDetailCustomer(null)}
                className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                title="बंद करें"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Toast Alert */}
            {statusFeedbackMsg && (
              <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 text-xs font-bold text-emerald-800 flex items-center gap-2 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{statusFeedbackMsg}</span>
              </div>
            )}

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 overscroll-contain text-xs">
              
              {/* Financial Balance Callout */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className={`p-3 rounded-xl border ${
                  detailCustomer.currentBalance > 0
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : detailCustomer.currentBalance < 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}>
                  <div className="text-[10px] text-slate-500 font-semibold">वर्तमान बकाया (Balance)</div>
                  <div className="text-lg font-black font-mono mt-0.5">
                    ₹{detailCustomer.currentBalance}
                  </div>
                  <div className="text-[10px] font-bold mt-0.5">
                    {detailCustomer.currentBalance > 0 ? 'बकाया देय राशि' : detailCustomer.currentBalance < 0 ? 'एडवांस जमा' : 'खाता बेबाक (0)'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">प्रारंभिक शेष (Opening)</div>
                  <div className="text-lg font-black font-mono text-slate-900 mt-0.5">
                    ₹{detailCustomer.openingBalance}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">शुरुआती खाता बैलेंस</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">ग्राहक प्रकार (Type)</div>
                  <div className="text-sm font-bold text-slate-900 mt-1 capitalize">
                    {detailCustomer.customerType === 'residential' ? 'घरेलू (Home)' :
                     detailCustomer.customerType === 'commercial' ? 'दुकान/व्यावसायिक' : 'संस्थान'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">मासिक बिलिंग चक्र</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">वितरण रूट (Route)</div>
                  <div className="text-sm font-bold text-blue-900 mt-1 truncate">
                    {routes.find((r) => r.id === detailCustomer.routeId)?.nameHi || detailCustomer.routeId}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    कोड: {routes.find((r) => r.id === detailCustomer.routeId)?.code || '-'}
                  </div>
                </div>
              </div>

              {/* Personal & Contact Details */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                <div className="font-bold text-slate-900 text-xs flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-900" />
                    <span>व्यक्तिगत एवं संपर्क विवरण (Personal & Contact)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">कोड: {detailCustomer.customerCode}</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">ग्राहक का नाम:</span>
                    <span className="font-bold text-slate-900 text-sm">{detailCustomer.name}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">मोबाइल नंबर (Primary):</span>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="font-mono font-bold text-slate-900 text-sm">+91 {detailCustomer.mobile}</span>
                      <a
                        href={`tel:${detailCustomer.mobile}`}
                        className="px-2 py-0.5 bg-blue-50 text-blue-900 hover:bg-blue-100 rounded text-[10px] font-bold border border-blue-200 transition"
                        title="कॉल करें"
                      >
                        कॉल 📞
                      </a>
                      <a
                        href={`https://wa.me/91${detailCustomer.mobile}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded text-[10px] font-bold border border-emerald-200 transition"
                        title="WhatsApp पर संदेश भेजें"
                      >
                        WhatsApp
                      </a>
                      <button
                        type="button"
                        onClick={() => handleSendCustomerSms(detailCustomer)}
                        className="px-2 py-0.5 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 rounded text-[10px] font-bold border border-indigo-200 transition flex items-center gap-1 cursor-pointer"
                        title="SMS संदेश भेजें (डिफ़ॉल्ट मैसेजिंग ऐप)"
                      >
                        <MessageSquare className="w-2.5 h-2.5" />
                        <span>SMS</span>
                      </button>
                    </div>
                  </div>

                  {detailCustomer.alternateMobile && (
                    <div>
                      <span className="text-slate-500 block text-[11px]">वैकल्पिक मोबाइल:</span>
                      <span className="font-mono font-semibold text-slate-800">+91 {detailCustomer.alternateMobile}</span>
                    </div>
                  )}

                  <div>
                    <span className="text-slate-500 block text-[11px]">शहर / गाँव:</span>
                    <span className="font-semibold text-slate-800">{detailCustomer.villageCity || 'Sri Ganganagar'}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">वार्ड संख्या:</span>
                    <span className="font-semibold text-slate-800">वार्ड नं. {detailCustomer.wardNumber}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">पहचान चिन्ह (Landmark):</span>
                    <span className="font-semibold text-slate-800">{detailCustomer.landmark || '-'}</span>
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-slate-500 block text-[11px]">वितरण पता (Delivery Address):</span>
                    <span className="font-medium text-slate-800 bg-slate-50 p-2.5 rounded-lg block border border-slate-200 mt-1">
                      {detailCustomer.address}
                    </span>
                  </div>

                  {detailCustomer.notes && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-500 block text-[11px]">विशेष निर्देश / नोट्स:</span>
                      <span className="text-slate-700 italic bg-amber-50/60 p-2 rounded-lg block border border-amber-200 mt-1">
                        "{detailCustomer.notes}"
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Subscribed Newspapers */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                <div className="font-bold text-slate-900 text-xs flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-900" />
                    <span>अखबार सदस्यता (Subscribed Newspapers)</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">
                    कुल अखबार: {detailCustomer.subscriptions.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {detailCustomer.subscriptions.map((sub, idx) => {
                    const npObj = newspapers.find((n) => n.id === sub.newspaperId);
                    const rate = sub.customPricePerDay || npObj?.retailPrice || 5.0;
                    const monthlyEst = rate * 30 * sub.quantity;

                    return (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span>{sub.newspaperNameHi || npObj?.nameHi || sub.newspaperId}</span>
                            <span className="text-[10px] bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded font-mono font-bold">
                              {sub.quantity} कॉपी
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            दैनिक दर: ₹{rate.toFixed(2)} / दिन · मासिक अनुमानित: ₹{monthlyEst.toFixed(2)}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono font-bold text-slate-800">
                            ₹{monthlyEst.toFixed(0)}/माह
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CRITICAL USER REQUIREMENT: CUSTOMER ACTIVE / INACTIVE OPTION AT THE BOTTOM OF FULL DETAILS */}
              <div className="p-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      ⚡
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        कस्टमर एक्टिव / इन-एक्टिव विकल्प (Customer Status)
                      </span>
                      <span className="text-[11px] text-slate-600">
                        अखबार वितरण एवं बिलिंग चालू अथवा बंद करने के लिए नीचे चुनें
                      </span>
                    </div>
                  </div>

                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                    detailCustomer.subscriptionStatus === 'active'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : detailCustomer.subscriptionStatus === 'paused'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}>
                    {detailCustomer.subscriptionStatus === 'active' ? '✓ वर्तमान में सक्रिय (ACTIVE)' :
                     detailCustomer.subscriptionStatus === 'paused' ? '⏸️ वर्तमान में छुट्टी रोक (PAUSED)' :
                     '✕ वर्तमान में निष्क्रिय (INACTIVE)'}
                  </span>
                </div>

                {/* Status Toggle Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {/* Option 1: Active */}
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('active')}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      detailCustomer.subscriptionStatus === 'active'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400'
                        : 'bg-white hover:bg-emerald-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <CheckCircle2 className={`w-4 h-4 ${detailCustomer.subscriptionStatus === 'active' ? 'text-white' : 'text-emerald-600'}`} />
                        सक्रिय (Active)
                      </span>
                      {detailCustomer.subscriptionStatus === 'active' && (
                        <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded font-bold">चयनित ✓</span>
                      )}
                    </div>
                    <p className={`text-[10px] mt-1.5 ${detailCustomer.subscriptionStatus === 'active' ? 'text-emerald-100' : 'text-slate-500'}`}>
                      अखबार नियमित चालू रहेगा और बिलिंग सक्रिय रहेगी।
                    </p>
                  </button>

                  {/* Option 2: Inactive / Discontinued */}
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('discontinued')}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      detailCustomer.subscriptionStatus === 'discontinued'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-400'
                        : 'bg-white hover:bg-rose-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <XCircle className={`w-4 h-4 ${detailCustomer.subscriptionStatus === 'discontinued' ? 'text-white' : 'text-rose-600'}`} />
                        निष्क्रिय (Inactive)
                      </span>
                      {detailCustomer.subscriptionStatus === 'discontinued' && (
                        <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded font-bold">चयनित ✓</span>
                      )}
                    </div>
                    <p className={`text-[10px] mt-1.5 ${detailCustomer.subscriptionStatus === 'discontinued' ? 'text-rose-100' : 'text-slate-500'}`}>
                      अखबार बंद कर दिया जाएगा और नई बिलिंग रुक जाएगी।
                    </p>
                  </button>

                  {/* Option 3: Vacation Pause */}
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('paused')}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      detailCustomer.subscriptionStatus === 'paused'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-md ring-2 ring-amber-400'
                        : 'bg-white hover:bg-amber-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <PauseCircle className={`w-4 h-4 ${detailCustomer.subscriptionStatus === 'paused' ? 'text-white' : 'text-amber-600'}`} />
                        छुट्टी रोक (Paused)
                      </span>
                      {detailCustomer.subscriptionStatus === 'paused' && (
                        <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded font-bold">चयनित ✓</span>
                      )}
                    </div>
                    <p className={`text-[10px] mt-1.5 ${detailCustomer.subscriptionStatus === 'paused' ? 'text-amber-100' : 'text-slate-500'}`}>
                      अस्थायी छुट्टी या बाहर जाने पर कुछ दिनों के लिए रोकें।
                    </p>
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const cust = detailCustomer;
                    setDetailCustomer(null);
                    onDirectCollectPayment(cust);
                  }}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <IndianRupee className="w-3.5 h-3.5" />
                  <span>कलेक्शन ₹</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const cust = detailCustomer;
                    setDetailCustomer(null);
                    onViewLedger(cust);
                  }}
                  className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>खाता बही (Ledger)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendCustomerSms(detailCustomer)}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                  title="डिफ़ॉल्ट मैसेज ऐप से SMS भेजें"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-700" />
                  <span>SMS भेजें</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const cust = detailCustomer;
                    setDetailCustomer(null);
                    handleOpenEdit(cust);
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-900" />
                  <span>एडिट करें</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDetailCustomer(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  बंद करें
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
