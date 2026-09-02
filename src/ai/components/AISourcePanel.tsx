import React from 'react';
import { Database } from 'lucide-react';

export const AISourcePanel: React.FC<{ sources: string[] }> = ({ sources }) => {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
      <span className="font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1">
        <Database className="w-3 h-3 text-purple-600" />
        Data Sources Consulted:
      </span>
      {sources.map((s, idx) => (
        <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono">
          {s}
        </span>
      ))}
    </div>
  );
};
