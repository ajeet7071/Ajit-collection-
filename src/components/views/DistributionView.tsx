import React, { useState } from 'react';
import { 
  Bike, 
  Calendar, 
  Check, 
  X, 
  PauseCircle, 
  Printer, 
  CheckCheck, 
  Layers, 
  MapPin, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  DeliveryRoute, 
  Customer, 
  Newspaper, 
  DailyDeliveryRecord, 
  DeliveryStatus, 
  Language,
  UserProfile 
} from '../../types';
import { translations } from '../../i18n/translations';

interface DistributionViewProps {
  routes: DeliveryRoute[];
  customers: Customer[];
  newspapers: Newspaper[];
  deliveries: DailyDeliveryRecord[];
  currentUser: UserProfile;
  lang: Language;
  onUpdateDeliveryStatus: (
    customerId: string,
    newspaperId: string,
    status: DeliveryStatus,
    date: string
  ) => void;
  onBulkMarkRouteDelivered: (routeId: string, date: string) => void;
}

export const DistributionView: React.FC<DistributionViewProps> = ({
  routes,
  customers,
  newspapers,
  deliveries,
  currentUser,
  lang,
  onUpdateDeliveryStatus,
  onBulkMarkRouteDelivered,
}) => {
  const t = translations[lang];

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedRouteId, setSelectedRouteId] = useState(routes[0]?.id || 'route_1');

  const selectedRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
  const routeCustomers = customers.filter(
    (c) => c.routeId === selectedRouteId && c.subscriptionStatus !== 'discontinued'
  );

  // Bundle counts for selected route
  const bundleSummary: { [newspaperId: string]: { name: string; count: number } } = {};
  newspapers.forEach((np) => {
    bundleSummary[np.id] = { name: np.nameHi, count: 0 };
  });

  routeCustomers.forEach((cust) => {
    if (cust.subscriptionStatus === 'paused') return;
    cust.subscriptions.forEach((sub) => {
      if (sub.status === 'active' && bundleSummary[sub.newspaperId]) {
        bundleSummary[sub.newspaperId].count += sub.quantity;
      }
    });
  });

  const handlePrintSheet = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      
      {/* Route & Date Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Route tabs / dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              {t.distribution.selectRoute}:
            </label>
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} - {r.nameHi}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              {t.distribution.dateSelector}:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
            />
          </div>

        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onBulkMarkRouteDelivered(selectedRouteId, selectedDate)}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition shadow-xs whitespace-nowrap"
          >
            <CheckCheck className="w-4 h-4 text-emerald-700" />
            <span>{t.distribution.bulkMarkAllDelivered}</span>
          </button>

          <button
            onClick={handlePrintSheet}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition shadow-xs whitespace-nowrap"
          >
            <Printer className="w-4 h-4 text-blue-900" />
            <span>{t.distribution.printRouteSheet}</span>
          </button>
        </div>
      </div>

      {/* Daily Bundle Summary Strip (Hacker Bundle Count) */}
      <div className="bg-gradient-to-r from-blue-950 to-indigo-950 text-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-blue-300" />
          <h2 className="text-xs font-bold tracking-wide uppercase text-blue-200">
            {t.distribution.bundleSummary} ({selectedRoute?.code})
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(bundleSummary).map(([npId, data]) => (
            <div key={npId} className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10">
              <span className="text-[11px] text-blue-200 block truncate">{data.name}</span>
              <div className="text-xl font-black font-mono mt-0.5">{data.count} <span className="text-xs font-normal text-blue-300">प्रतियां</span></div>
            </div>
          ))}
        </div>
      </div>

      {/* Route Delivery List (Hawker Thumb Interface) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
          <span>{selectedRoute?.nameHi} · कुल {routeCustomers.length} मकान / दुकान</span>
          <span>एक-टैप वितरण पुष्टि (Tap to Update)</span>
        </div>

        <div className="divide-y divide-slate-100">
          {routeCustomers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              इस रूट में कोई ग्राहक नहीं है।
            </div>
          ) : (
            routeCustomers.map((cust, idx) => {
              const isCustPaused = cust.subscriptionStatus === 'paused';

              return (
                <div key={cust.id} className="p-3 sm:p-4 hover:bg-slate-50/50 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    {/* Left Customer Info */}
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{cust.name}</span>
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {cust.customerCode}
                          </span>
                          {isCustPaused && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                              <PauseCircle className="w-3 h-3" />
                              <span>छुट्टी पर (Paused)</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{cust.address} (वार्ड {cust.wardNumber})</span>
                          {cust.landmark && (
                            <span className="text-slate-400 hidden sm:inline">· {cust.landmark}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Subscribed Newspapers & Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                      {cust.subscriptions.map((sub) => {
                        // Find logged delivery status for this customer & date & newspaper
                        const record = deliveries.find(
                          (d) =>
                            d.customerId === cust.id &&
                            d.newspaperId === sub.newspaperId &&
                            d.date === selectedDate
                        );
                        const status: DeliveryStatus = record ? record.status : isCustPaused ? 'suspended' : 'delivered';

                        return (
                          <div 
                            key={sub.id}
                            className="flex items-center gap-2 p-1.5 rounded-xl border border-slate-200 bg-slate-50"
                          >
                            <div className="leading-tight pl-1">
                              <div className="text-xs font-bold text-slate-800">{sub.newspaperNameHi}</div>
                              <div className="text-[10px] text-slate-500">मात्रा: {sub.quantity} प्रति</div>
                            </div>

                            {/* Status Toggle Buttons */}
                            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                              <button
                                onClick={() => onUpdateDeliveryStatus(cust.id, sub.newspaperId, 'delivered', selectedDate)}
                                className={`p-1.5 rounded-md text-xs font-semibold transition ${
                                  status === 'delivered'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-400 hover:text-emerald-700'
                                }`}
                                title={t.distribution.markDelivered}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => onUpdateDeliveryStatus(cust.id, sub.newspaperId, 'missed', selectedDate)}
                                className={`p-1.5 rounded-md text-xs font-semibold transition ${
                                  status === 'missed'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'text-slate-400 hover:text-rose-700'
                                }`}
                                title={t.distribution.markMissed}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => onUpdateDeliveryStatus(cust.id, sub.newspaperId, 'suspended', selectedDate)}
                                className={`p-1.5 rounded-md text-xs font-semibold transition ${
                                  status === 'suspended'
                                    ? 'bg-amber-500 text-white shadow-xs'
                                    : 'text-slate-400 hover:text-amber-700'
                                }`}
                                title={t.distribution.markSuspended}
                              >
                                <PauseCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>

                          </div>
                        );
                      })}
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
};
