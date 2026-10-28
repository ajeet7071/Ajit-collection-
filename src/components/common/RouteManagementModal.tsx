/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Plus, 
  Edit2, 
  Trash2, 
  Users, 
  Bike, 
  Check, 
  Search,
  AlertCircle
} from 'lucide-react';
import { DeliveryRoute, Customer, Language } from '../../types';
import { translations } from '../../i18n/translations';

interface RouteManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  routes: DeliveryRoute[];
  customers: Customer[];
  onSaveRoute: (route: DeliveryRoute) => void;
  onDeleteRoute: (routeId: string) => void;
  lang: Language;
}

export const RouteManagementModal: React.FC<RouteManagementModalProps> = ({
  isOpen,
  onClose,
  routes,
  customers,
  onSaveRoute,
  onDeleteRoute,
  lang,
}) => {
  const t = translations[lang];

  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [nameHi, setNameHi] = useState('');
  const [locality, setLocality] = useState('');
  const [wardInput, setWardInput] = useState('');
  const [deliveryAgentId, setDeliveryAgentId] = useState('agent_hawker_1');
  const [collectionAgentId, setCollectionAgentId] = useState('agent_collector_1');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [routeToDelete, setRouteToDelete] = useState<DeliveryRoute | null>(null);

  if (!isOpen) return null;

  const agentOptions = [
    { id: 'agent_hawker_1', name: 'रमेश हॉकर (Ramesh Hawker)', role: 'delivery' },
    { id: 'agent_hawker_2', name: 'सुरेश हॉकर (Suresh Hawker)', role: 'delivery' },
    { id: 'agent_hawker_3', name: 'राजेश हॉकर (Rajesh Hawker)', role: 'delivery' },
  ];

  const collectorOptions = [
    { id: 'agent_collector_1', name: 'विकास कलेक्टर (Vikas Collector)' },
    { id: 'agent_collector_2', name: 'अमित कुमार (Amit Collector)' },
  ];

  const handleOpenAddForm = () => {
    const nextNum = routes.length + 1;
    const nextCode = `RT-${nextNum < 10 ? '0' + nextNum : nextNum}`;
    setCode(nextCode);
    setName('');
    setNameHi('');
    setLocality('');
    setWardInput('');
    setDeliveryAgentId('agent_hawker_1');
    setCollectionAgentId('agent_collector_1');
    setEditingRouteId(null);
    setIsEditing(true);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleOpenEditForm = (route: DeliveryRoute) => {
    setCode(route.code);
    setName(route.name);
    setNameHi(route.nameHi);
    setLocality(route.locality);
    setWardInput(route.wardNumbers.join(', '));
    setDeliveryAgentId(route.assignedDeliveryAgentId || 'agent_hawker_1');
    setCollectionAgentId(route.assignedCollectionAgentId || 'agent_collector_1');
    setEditingRouteId(route.id);
    setIsEditing(true);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameHi.trim() || !name.trim() || !code.trim()) {
      setErrorMsg('कृपया रूट कोड, हिंदी व अंग्रेजी नाम अनिवार्य रूप से भरें।');
      return;
    }

    const parsedWards = wardInput
      .split(',')
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    const newRoute: DeliveryRoute = {
      id: editingRouteId || `route_${Date.now()}`,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      nameHi: nameHi.trim(),
      locality: locality.trim() || name.trim(),
      wardNumbers: parsedWards.length > 0 ? parsedWards : ['01'],
      assignedDeliveryAgentId: deliveryAgentId,
      assignedCollectionAgentId: collectionAgentId,
      customerCount: editingRouteId
        ? customers.filter((c) => c.routeId === editingRouteId).length
        : 0,
    };

    onSaveRoute(newRoute);
    setIsEditing(false);
    setSuccessMsg('रूट सफलतापूर्वक सुरक्षित कर लिया गया है!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDelete = (route: DeliveryRoute) => {
    const assignedCount = customers.filter((c) => c.routeId === route.id).length;
    if (assignedCount > 0) {
      setErrorMsg(
        `इस रूट (${route.nameHi}) पर ${assignedCount} ग्राहक जुड़े हुए हैं। पहले उन ग्राहकों को अन्य रूट पर ट्रांसफर करें।`
      );
      setTimeout(() => setErrorMsg(''), 4500);
      return;
    }

    setErrorMsg('');
    setRouteToDelete(route);
  };

  const handleConfirmDeleteRoute = () => {
    if (!routeToDelete) return;
    onDeleteRoute(routeToDelete.id);
    setRouteToDelete(null);
    setSuccessMsg('रूट सफलतापूर्वक हटा दिया गया।');
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  const filteredRoutes = routes.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.nameHi.includes(q) ||
      r.code.toLowerCase().includes(q) ||
      r.locality.toLowerCase().includes(q) ||
      r.wardNumbers.some((w) => w.includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-[92vw] sm:w-full max-w-2xl max-h-[85dvh] sm:max-h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col">
        
        {/* Header */}
        <div className="bg-blue-900 px-5 sm:px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-800 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-blue-200" />
            </div>
            <div>
              <h3 className="text-base font-bold">डिलीवरी रूट प्रबंधन (Delivery Routes)</h3>
              <p className="text-xs text-blue-200">नया वितरण रूट जोड़ें, हॉकर व वार्ड असाइन करें</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain text-xs">
          
          {/* Notifications */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {routeToDelete && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-rose-900">
                <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                <div>
                  <div className="font-bold">
                    क्या आप वाकई रूट "{routeToDelete.nameHi} ({routeToDelete.code})" को हटाना चाहते हैं?
                  </div>
                  <div className="text-[11px] text-rose-700">यह रूट सूची से स्थायी रूप से हट जाएगा।</div>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setRouteToDelete(null)}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteRoute}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold cursor-pointer"
                >
                  हाँ, हटाएं
                </button>
              </div>
            </div>
          )}

          {/* Action Header: Search & Add Route Button */}
          {!isEditing && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="रूट नाम, कोड या वार्ड संख्या से खोजें..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleOpenAddForm}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs transition shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ नया रूट जोड़ें (Add Route)</span>
              </button>
            </div>
          )}

          {/* Add / Edit Form */}
          {isEditing && (
            <form onSubmit={handleSubmit} className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-blue-200 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-900" />
                  <span>{editingRouteId ? 'रूट विवरण एडिट करें' : 'नया रूट जोड़ें (Add New Delivery Route)'}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-slate-500 hover:text-slate-800 text-xs font-semibold"
                >
                  रद्द करें
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    रूट कोड (Code) *
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="उदा. RT-04"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl focus:outline-none font-mono uppercase"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    रूट का नाम (हिंदी में) *
                  </label>
                  <input
                    type="text"
                    value={nameHi}
                    onChange={(e) => setNameHi(e.target.value)}
                    placeholder="उदा. न्यू आदर्श नगर एवं भगत सिंह चौक"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Route Name (English) *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. New Adarsh Nagar & Bhagat Singh Chowk"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    कॉलोनी / क्षेत्र / मोहल्ला (Locality)
                  </label>
                  <input
                    type="text"
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    placeholder="उदा. आदर्श नगर, मेन रोड"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    वार्ड संख्याएं (Wards, कॉमा से अलग करें)
                  </label>
                  <input
                    type="text"
                    value={wardInput}
                    onChange={(e) => setWardInput(e.target.value)}
                    placeholder="उदा. 12, 13, 14"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    डिलीवरी हॉकर (Delivery Agent)
                  </label>
                  <select
                    value={deliveryAgentId}
                    onChange={(e) => setDeliveryAgentId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl focus:outline-none"
                  >
                    {agentOptions.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    कलेक्शन एजेंट (Collector)
                  </label>
                  <select
                    value={collectionAgentId}
                    onChange={(e) => setCollectionAgentId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl focus:outline-none"
                  >
                    {collectorOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-1.5 text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl font-medium transition"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingRouteId ? 'रूट अपडेट करें' : 'रूट जोड़ें (Save Route)'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Existing Routes Cards / List */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>कुल रूट ({filteredRoutes.length})</span>
              <span>सक्रिय ग्राहक</span>
            </div>

            {filteredRoutes.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-500">
                कोई रूट नहीं मिला।
              </div>
            ) : (
              filteredRoutes.map((r) => {
                const customerCount = customers.filter((c) => c.routeId === r.id).length;
                const deliveryAgent = agentOptions.find((a) => a.id === r.assignedDeliveryAgentId)?.name || 'हॉकर असाइन नहीं';

                return (
                  <div
                    key={r.id}
                    className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-blue-300 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className="px-2.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg font-mono font-bold text-xs shrink-0">
                        {r.code}
                      </div>

                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 text-sm">
                          {r.nameHi}
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          {r.name} · {r.locality}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium">
                            <Bike className="w-3 h-3 text-slate-500" />
                            <span>{deliveryAgent}</span>
                          </span>

                          {r.wardNumbers.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-medium font-mono">
                              वार्ड: {r.wardNumbers.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                      <div className="flex items-center gap-1 text-slate-700 font-medium">
                        <Users className="w-3.5 h-3.5 text-blue-800" />
                        <span className="font-mono font-bold text-sm text-blue-900">{customerCount}</span>
                        <span className="text-[11px] text-slate-500">ग्राहक</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditForm(r)}
                          className="p-1.5 text-blue-900 hover:bg-blue-50 rounded-lg transition"
                          title="रूट एडिट करें"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(r)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="रूट हटाएं"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition"
          >
            बंद करें (Close)
          </button>
        </div>

      </div>
    </div>
  );
};
