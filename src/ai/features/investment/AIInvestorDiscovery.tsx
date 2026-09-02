import React, { useState } from 'react';
import { Search, Sparkles, Filter, ArrowRight } from 'lucide-react';

export const AIInvestorDiscovery: React.FC = () => {
  const [query, setQuery] = useState('I want a medium-risk investment in Malaysia for around 5 years yielding over 9%');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  const handleSearch = () => {
    setLoading(true);
    setTimeout(() => {
      setResults([
        { poolId: 'POOL-MYS-001', poolName: 'FELDA Agri Expansion Pool', matchScore: 94, risk: 'Moderate', term: '5 Years', return: '10.5% p.a.' },
        { poolId: 'POOL-MYS-002', poolName: 'Commercial Waqf Tech Park', matchScore: 89, risk: 'Moderate', term: '5 Years', return: '9.2% p.a.' }
      ]);
      setLoading(false);
    }, 500);
  };

  return (
    <div className="space-y-6 text-xs animate-fadeIn">
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div>
          <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 w-fit">
            <Search className="w-3.5 h-3.5" />
            Natural Language Investment Discovery
          </span>
          <h2 className="text-base font-black text-slate-900 dark:text-white mt-1">
            Prompt-Driven Pool Discovery Engine
          </h2>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-grow p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold text-xs"
            placeholder="Type your preferences in plain English..."
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            {loading ? 'Searching...' : 'Search Pools'}
          </button>
        </div>
      </div>

      {results && (
        <div className="space-y-3">
          <h3 className="font-black text-slate-900 dark:text-white text-sm">Matching Wealth Pools</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map(r => (
              <div key={r.poolId} className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-slate-900 dark:text-white">{r.poolName}</h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">{r.matchScore}% Match</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span>Risk: <strong className="text-slate-800 dark:text-slate-200">{r.risk}</strong></span> • 
                  <span>Term: <strong className="text-slate-800 dark:text-slate-200">{r.term}</strong></span> • 
                  <span>Expected Yield: <strong className="text-emerald-600 font-bold">{r.return}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
