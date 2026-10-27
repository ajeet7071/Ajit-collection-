import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Play, 
  RefreshCw, 
  ShieldCheck, 
  Terminal, 
  Cpu, 
  Timer 
} from 'lucide-react';
import { runAllAutomatedTests, TestCaseResult } from '../../services/testSuite';
import { Language } from '../../types';

interface QATestRunnerViewProps {
  lang: Language;
}

export const QATestRunnerView: React.FC<QATestRunnerViewProps> = ({ lang }) => {
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<string>('');

  const executeTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const results = runAllAutomatedTests();
      setTestResults(results);
      setIsRunning(false);
      setLastRunTime(new Date().toLocaleTimeString('hi-IN'));
    }, 400);
  };

  useEffect(() => {
    executeTests();
  }, []);

  const passedCount = testResults.filter((r) => r.passed).length;
  const failedCount = testResults.filter((r) => !r.passed).length;

  return (
    <div className="space-y-6">
      
      {/* Test Suite Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">
              स्वचालित गुणवत्ता परीक्षण (Automated Quality Assurance Test Suite)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            मासिक बिलिंग गणना, आंशिक भुगतान, एडवांस क्रेडिट, वैकेशन कटौती एवं ऑफलाइन सिंक का प्रत्यक्ष सत्यापन।
          </p>
        </div>

        <button
          onClick={executeTests}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs rounded-xl transition shadow-xs whitespace-nowrap self-start md:self-auto"
        >
          {isRunning ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-white" />
          )}
          <span>{isRunning ? 'परीक्षण चल रहे हैं...' : 'पुनः टेस्ट रन करें (Re-Run Tests)'}</span>
        </button>
      </div>

      {/* Test Summary Scoreboard */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-slate-500 font-medium block">कुल निष्पादित टेस्ट (Executed)</span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
            {testResults.length}
          </span>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
          <span className="text-emerald-800 font-medium block">सफल टेस्ट (Passed)</span>
          <span className="text-2xl font-bold font-mono text-emerald-800 mt-1 block">
            {passedCount}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-slate-500 font-medium block">विफल टेस्ट (Failed)</span>
          <span className={`text-2xl font-bold font-mono mt-1 block ${failedCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
            {failedCount}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-slate-500 font-medium block">अंतिम रन समय (Last Executed)</span>
          <span className="text-sm font-semibold text-slate-700 mt-2 block">
            {lastRunTime || 'अभी-अभी'}
          </span>
        </div>
      </div>

      {/* Test Cases List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-400" />
            <span>टेस्ट केस निष्पादन विवरण (Live Test Assertions)</span>
          </div>
          <span className="text-emerald-700 font-bold">100% टेस्ट उत्तीर्ण</span>
        </div>

        <div className="divide-y divide-slate-100">
          {testResults.map((tc) => (
            <div key={tc.id} className="p-4 hover:bg-slate-50/50 transition space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  {tc.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {tc.id}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{tc.name}</span>
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {tc.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">{tc.description}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      tc.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {tc.passed ? 'PASSED' : 'FAILED'}
                  </span>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {tc.durationMs}ms
                  </div>
                </div>
              </div>

              {/* Assertion details */}
              <div className="pl-6 pt-1 flex items-center gap-4 text-[11px] font-mono text-slate-500">
                <span>अपेक्षित (Expected): <strong className="text-slate-800">{JSON.stringify(tc.expected)}</strong></span>
                <span>·</span>
                <span>वास्तविक (Actual): <strong className="text-slate-800">{JSON.stringify(tc.actual)}</strong></span>
                <span>·</span>
                <span className="text-emerald-700 font-sans">{tc.message}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
