import React, { useState } from 'react';
import { Plus, IndianRupee, Tag, Calendar, User, X } from 'lucide-react';
import { ExpenseRecord, Language, UserProfile } from '../../types';
import { translations } from '../../i18n/translations';

interface ExpensesViewProps {
  expenses: ExpenseRecord[];
  currentUser: UserProfile;
  lang: Language;
  onSaveExpense: (exp: ExpenseRecord) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  currentUser,
  lang,
  onSaveExpense,
}) => {
  const t = translations[lang];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseRecord['category']>('fuel_vehicle');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleSave = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !title.trim()) return;

    const newExp: ExpenseRecord = {
      id: `exp_${Date.now()}`,
      agencyId: 'agency_ajeet_01',
      category,
      title,
      titleHi: title,
      amount: amt,
      date,
      recordedBy: currentUser.name,
      notes,
    };

    onSaveExpense(newExp);
    setIsModalOpen(false);
    setTitle('');
    setAmount('');
  };

  const getCategoryLabel = (cat: ExpenseRecord['category']) => {
    switch (cat) {
      case 'newspaper_purchase': return 'अखबार थोक खरीद (Press Purchase)';
      case 'delivery_salary': return 'हॉकर डिलीवरी वेतन (Salaries)';
      case 'collection_commission': return 'वसूली कमीशन (Commission)';
      case 'fuel_vehicle': return 'पेट्रोल व वाहन खर्च (Fuel)';
      case 'rent': return 'डिपो / ऑफिस किराया (Rent)';
      case 'electricity': return 'बिजली बिल (Electricity)';
      case 'printing': return 'प्रिंटिंग व स्टेशनरी (Printing)';
      default: return 'अन्य विविध खर्च (Misc)';
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">{t.nav.expenses}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            वितरण वेतन, प्रेस खरीद, पेट्रोल एवं डिपो खर्चों का पूर्ण लेखा-जोखा।
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] text-slate-500 block">कुल खर्च (Total Expenses)</span>
            <span className="font-mono font-bold text-rose-700 text-lg">
              ₹{totalExpenseAmount.toLocaleString('en-IN')}
            </span>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-xl transition shadow-xs whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>नया खर्च दर्ज करें</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                <th className="py-3 px-4 font-semibold">दिनांक</th>
                <th className="py-3 px-4 font-semibold">विवरण (Expense Title)</th>
                <th className="py-3 px-4 font-semibold">श्रेणी (Category)</th>
                <th className="py-3 px-4 font-semibold">दर्जकर्ता</th>
                <th className="py-3 px-4 text-right font-semibold">राशि (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-3 px-4 font-mono text-slate-600">{exp.date}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{exp.titleHi || exp.title}</div>
                    {exp.notes && <div className="text-[10px] text-slate-500">{exp.notes}</div>}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800">
                      {getCategoryLabel(exp.category)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{exp.recordedBy}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-rose-700 text-sm">
                    ₹{exp.amount.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-[92vw] sm:w-full max-w-md max-h-[85dvh] sm:max-h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col">
            <div className="bg-blue-950 p-4 text-white flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold">व्यवसाय खर्च प्रविष्टि (Record Expense)</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-blue-200 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1 overscroll-contain">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">खर्च विवरण (Title) *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="उदा. हॉकर बाइक पेट्रोल"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">खर्च राशि (₹) *</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="500"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">श्रेणी</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="newspaper_purchase">प्रेस थोक खरीद</option>
                    <option value="delivery_salary">हॉकर वेतन</option>
                    <option value="collection_commission">कलेक्शन कमीशन</option>
                    <option value="fuel_vehicle">पेट्रोल / वाहन</option>
                    <option value="rent">डिपो किराया</option>
                    <option value="electricity">बिजली</option>
                    <option value="printing">प्रिंटिंग / पर्ची</option>
                    <option value="misc">अन्य विविध</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">दिनांक</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">टिप्पणी</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="अतिरिक्त विवरण"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-medium text-slate-700"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-xl"
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
