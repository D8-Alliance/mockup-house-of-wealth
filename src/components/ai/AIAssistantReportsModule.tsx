import React, { useState } from 'react';
import { Bot, Send, Download, FileText, Sparkles, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { AIExecutiveSummaryReport } from './AITypes';
import { AIConfidenceBadge } from './AIConfidenceBadge';

export const AIAssistantReportsModule: React.FC = () => {
  const [messages, setMessages] = useState<{ sender: 'user' | 'ai'; text: string; time: string }[]>([
    {
      sender: 'ai',
      text: 'Assalamu Alaikum! I am your AI Wealth & Shariah Governance Assistant. Ask me anything regarding Mudarabah profit ratios, AAOIFI Fatwas, or executive summary generation.',
      time: '18:10'
    }
  ]);

  const [inputMsg, setInputMsg] = useState('');

  const [report, setReport] = useState<AIExecutiveSummaryReport>({
    title: 'House of Wealth Portfolio & Shariah Executive Summary',
    generatedDate: '2026-08-05',
    keyInsights: [
      'Portfolio yields 9.4% net annualized return across 5 D-8 regional pools.',
      '100% AAOIFI Shariah compliance score verified across all active contracts.',
      'Zero AML structuring incidents detected over the past 30 days.'
    ],
    overallShariahRating: 'AA+ Grade Certified',
    portfolioHealthScore: 94,
    auditTrailId: 'AUD-2026-X881'
  });

  const handleSendChat = () => {
    if (!inputMsg.trim()) return;
    const userMsg = inputMsg;
    const newChat = [
      ...messages,
      { sender: 'user' as const, text: userMsg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ];
    setMessages(newChat);
    setInputMsg('');

    setTimeout(() => {
      let aiResponse = "I have analyzed your query across the D-8 House of Wealth database. All transactions adhere strictly to AAOIFI Shariah Governance Standard No. 7. How else may I assist your portfolio strategy?";
      if (userMsg.toLowerCase().includes('mudarabah') || userMsg.toLowerCase().includes('musharakah')) {
        aiResponse = "In Mudarabah, capital is provided entirely by the investor (Rabb-ul-Mal) while management is provided by the Mudarib. In Musharakah, both parties contribute capital and share profits and losses proportionally.";
      } else if (userMsg.toLowerCase().includes('zakat')) {
        aiResponse = "Zakat is automatically calculated at 2.5% on net zakatable asset value exceeding the Nisab threshold ($5,850 USD silver equivalent). Non-compliant income components are auto-purified to Sadaqah.";
      }
      setMessages(prev => [
        ...prev,
        { sender: 'ai', text: aiResponse, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    }, 600);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* AI Chat Assistant */}
      <div className="lg:col-span-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm space-y-4 flex flex-col justify-between h-[520px]">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-500" />
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                AI Chat Assistant
              </h3>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              Online
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[360px] p-2 mt-2">
            {messages.map((m, i) => (
              <div 
                key={i} 
                className={`p-3.5 rounded-2xl text-xs max-w-[85%] ${
                  m.sender === 'user' 
                    ? 'ml-auto bg-emerald-600 text-white rounded-br-none' 
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                <p className="leading-relaxed">{m.text}</p>
                <span className="text-[9px] opacity-60 block text-right mt-1">{m.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
          <input 
            type="text" 
            value={inputMsg}
            onChange={e => setInputMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendChat()}
            placeholder="Ask about Shariah Fatwas, pools or yields..."
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
          />
          <button 
            onClick={handleSendChat}
            className="p-2.5 bg-emerald-600 text-white rounded-xl cursor-pointer hover:bg-emerald-500"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* AI Report Generator & Executive Summary */}
      <div className="lg:col-span-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 border border-purple-500/20">
              Module 15 & 16
            </span>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base mt-0.5">
              AI Report Generator & Executive Summary
            </h3>
          </div>
          <FileText className="w-5 h-5 text-purple-500" />
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 space-y-3 text-xs">
          <div className="flex justify-between items-center">
            <span className="font-black text-slate-900 dark:text-white">{report.title}</span>
            <span className="font-mono text-[10px] text-slate-400">{report.generatedDate}</span>
          </div>

          <div className="space-y-1.5">
            <span className="font-bold text-slate-700 dark:text-slate-300 block text-[11px]">Key Highlights:</span>
            {report.keyInsights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{insight}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <span className="text-[10px] text-slate-400 font-mono">Audit ID: {report.auditTrailId}</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{report.overallShariahRating}</span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button 
            onClick={() => alert(`Generated PDF Report: ${report.title}`)}
            className="w-1/2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF Report</span>
          </button>
          <button 
            onClick={() => alert(`Generated Excel Data Sheet: ${report.title}`)}
            className="w-1/2 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-xl cursor-pointer hover:bg-slate-200"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Export Excel Sheet</span>
          </button>
        </div>
      </div>

    </div>
  );
};
