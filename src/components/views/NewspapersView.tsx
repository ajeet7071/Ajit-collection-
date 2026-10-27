import React, { useState } from 'react';
import { 
  Newspaper as NewspaperIcon, 
  Plus, 
  Edit3, 
  Check, 
  X, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  DollarSign, 
  IndianRupee 
} from 'lucide-react';
import { Newspaper, Language } from '../../types';
import { translations } from '../../i18n/translations';

interface NewspapersViewProps {
  newspapers: Newspaper[];
  lang: Language;
  onSaveNewspaper: (np: Newspaper) => void;
  onDeleteNewspaper?: (id: string) => void;
}

export const NewspapersView: React.FC<NewspapersViewProps> = ({
  newspapers,
  lang,
  onSaveNewspaper,
  onDeleteNewspaper,
}) => {
  const t = translations[lang];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNp, setEditingNp] = useState<Newspaper | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [nameHi, setNameHi] = useState('');
  const [edition, setEdition] = useState('');
  const [language, setLanguage] = useState('Hindi');
  const [publisher, setPublisher] = useState('');
  const [retailPrice, setRetailPrice] = useState('5.0');
  const [agencyPrice, setAgencyPrice] = useState('3.6');
  const [fixedMonthly, setFixedMonthly] = useState('150');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const handleOpenAdd = () => {
    setEditingNp(null);
    setName('');
    setNameHi('');
    setEdition('City Edition');
    setLanguage('Hindi');
    setPublisher('');
    setRetailPrice('5.0');
    setAgencyPrice('3.6');
    setFixedMonthly('150');
    setStatus('active');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (np: Newspaper) => {
    setEditingNp(np);
    setName(np.name);
    setNameHi(np.nameHi);
    setEdition(np.edition);
    setLanguage(np.language);
    setPublisher(np.publisher);
    setRetailPrice(np.retailPrice.toString());
    setAgencyPrice(np.agencyPrice.toString());
    setFixedMonthly((np.fixedMonthlyPrice || 150).toString());
    setStatus(np.status);
    setIsModalOpen(true);
  };

  const handleQuickPriceChange = (np: Newspaper, delta: number) => {
    const newPrice = Math.max(1, Number((np.retailPrice + delta).toFixed(2)));
    const updated: Newspaper = {
      ...np,
      retailPrice: newPrice,
      effectiveDate: new Date().toISOString().split('T')[0],
    };
    onSaveNewspaper(updated);
  };

  const handleSave = () => {
    if (!name.trim() || !nameHi.trim()) return;

    const saved: Newspaper = {
      id: editingNp ? editingNp.id : `np_${Date.now()}`,
      name: name.trim(),
      nameHi: nameHi.trim(),
      edition: edition.trim(),
      language: language.trim(),
      publisher: publisher.trim(),
      retailPrice: parseFloat(retailPrice) || 5.0,
      agencyPrice: parseFloat(agencyPrice) || 3.6,
      fixedMonthlyPrice: parseFloat(fixedMonthly) || undefined,
      effectiveDate: editingNp ? editingNp.effectiveDate : new Date().toISOString().split('T')[0],
      status,
    };

    onSaveNewspaper(saved);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`क्या आप वाकई "${name}" को अखबार सूची से हटाना चाहते हैं?`)) {
      if (onDeleteNewspaper) {
        onDeleteNewspaper(id);
      }
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">{t.nav.newspapers}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            अखबारों की सूची, खुदरा दर (Retail Price) एवं एजेंसी थोक खरीद लागत (Cost Price) संपादन व प्रबंधन।
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-xl transition shadow-xs whitespace-nowrap self-start md:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>नया अखबार जोड़ें (Add Newspaper)</span>
        </button>
      </div>

      {/* Grid of Newspaper Cards with Quick Edit & Full Edit */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {newspapers.map((np) => {
          const margin = np.retailPrice - np.agencyPrice;
          const marginPct = Math.round((margin / np.retailPrice) * 100);

          return (
            <div key={np.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 relative overflow-hidden">
              
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{np.nameHi}</h3>
                  <div className="text-xs text-slate-500 font-medium">{np.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    संस्करण: {np.edition} · भाषा: {np.language}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(np)}
                    className="p-1.5 text-blue-900 hover:text-blue-950 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                    title="पूरी जानकारी एडिट करें"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {onDeleteNewspaper && (
                    <button
                      onClick={() => handleDelete(np.id, np.nameHi)}
                      className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                      title="अखबार हटाएं"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Price Badges & Quick Inline Adjustment */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center text-xs">
                
                {/* Retail Price with Quick + / - Adjuster */}
                <div className="bg-slate-50 p-2 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 font-medium block">ग्राहक बिक्री दर</span>
                  <div className="flex items-center justify-center gap-1 my-0.5">
                    <button
                      onClick={() => handleQuickPriceChange(np, -0.5)}
                      className="w-5 h-5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 text-xs font-bold leading-none"
                      title="दर ₹0.50 घटाएं"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-slate-900 text-sm">₹{np.retailPrice}</span>
                    <button
                      onClick={() => handleQuickPriceChange(np, 0.5)}
                      className="w-5 h-5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 text-xs font-bold leading-none"
                      title="दर ₹0.50 बढ़ाएं"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-[9px] text-slate-400">प्रति दिन</span>
                </div>

                {/* Agency Purchase Price */}
                <div className="bg-slate-50 p-2 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 font-medium block">प्रेस थोक खरीद</span>
                  <span className="font-mono font-bold text-slate-700 text-sm my-0.5">₹{np.agencyPrice}</span>
                  <span className="text-[9px] text-slate-400">लागत दर</span>
                </div>

                {/* Margin */}
                <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100 flex flex-col justify-between">
                  <span className="text-[10px] text-emerald-800 font-semibold block">एजेंसी मार्जिन</span>
                  <span className="font-mono font-bold text-emerald-800 text-sm my-0.5">₹{margin.toFixed(2)}</span>
                  <span className="text-[9px] text-emerald-700 font-bold">{marginPct}% मुनाफा</span>
                </div>

              </div>

              {/* Publisher & Monthly details */}
              <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                <span>प्रकाशक: {np.publisher || 'दैनिक प्रेस'}</span>
                {np.fixedMonthlyPrice && (
                  <span className="font-semibold text-blue-900">
                    मासिक: ₹{np.fixedMonthlyPrice}
                  </span>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Edit / Add Newspaper Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            
            <div className="bg-blue-950 p-4 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">
                {editingNp ? 'अखबार जानकारी एवं दरें संपादित करें' : 'नया समाचार पत्र जोड़ें'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-blue-200 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">अखबार का नाम (हिंदी) *</label>
                <input
                  type="text"
                  value={nameHi}
                  onChange={(e) => setNameHi(e.target.value)}
                  placeholder="उदा. दैनिक भास्कर"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Newspaper Name (English) *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dainik Bhaskar"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ग्राहक दर (₹/दिन) *</label>
                  <input
                    type="number"
                    step="0.25"
                    value={retailPrice}
                    onChange={(e) => setRetailPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">एजेंसी खरीद लागत (₹/दिन) *</label>
                  <input
                    type="number"
                    step="0.05"
                    value={agencyPrice}
                    onChange={(e) => setAgencyPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">मासिक फ्लैट दर (₹/माह)</label>
                  <input
                    type="number"
                    value={fixedMonthly}
                    onChange={(e) => setFixedMonthly(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">भाषा (Language)</label>
                  <input
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    placeholder="उदा. Hindi, English"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">संस्करण (Edition)</label>
                  <input
                    type="text"
                    value={edition}
                    onChange={(e) => setEdition(e.target.value)}
                    placeholder="उदा. श्री गंगानगर सिटी"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">प्रकाशक (Publisher)</label>
                  <input
                    type="text"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                    placeholder="उदा. DB Corp Ltd"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
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
      )}

    </div>
  );
};
