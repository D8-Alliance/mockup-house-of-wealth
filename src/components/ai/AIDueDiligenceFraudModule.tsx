import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { AIFraudAlert } from '../../types';
import { AIConfidenceBadge } from './AIConfidenceBadge';

export const AIDueDiligenceFraudModule: React.FC = () => {
  const [alerts, setAlerts] = useState<AIFraudAlert[]>([
    {
      id: 'FRD-109',
      category: 'AML Alert',
      title: 'High-Frequency Cross-Border Wire Structuring',
      entity: 'Account #ACC-8812 (Istanbul Node)',
      severity: 'Critical',
      timestamp: '2026-08-05 17:42',
      details: 'Detected 14 consecutive transfers under $9,900 USD threshold within 12 minutes (Structuring pattern).',
      status: 'Investigating'
    },
    {
      id: 'FRD-108',
      category: 'Duplicate Assets',
      title: 'Identical Property Title Deed Hash Match',
      entity: 'Deed #TR-IST-2024-8892',
      severity: 'Warning',
      timestamp: '2026-08-05 15:10',
      details: 'Deed metadata matches active asset on Malaysia Node (Asset #AST-102). Potential double tokenization attempt.',
      status: 'Flagged'
    },
    {
      id: 'FRD-107',
      category: 'Fake Documents',
      title: 'AI Signature Forgery Check Failed',
      entity: 'Auditor Certificate PDF',
      severity: 'Critical',
      timestamp: '2026-08-04 11:20',
      details: 'Digital signature metadata does not match AAOIFI certified public key registry.',
      status: 'Flagged'
    }
  ]);

  const handleResolveAlert = (id: string) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, status: 'Resolved' as const } : a));
  };

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            Module 7, 8, 11 & 12
          </span>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
            AI Due Diligence, Fraud Detection & AML Monitoring
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Continuous automated scan for money laundering patterns, forged documents, and duplicate tokenized RWA assets.
          </p>
        </div>

        <AIConfidenceBadge 
          confidence={{
            score: 98,
            modelName: 'AAOIFI AML & Anomaly Detection Neural Model',
            dataPointsEvaluated: 48000,
            factors: [
              { factor: 'Structuring Pattern Matching (AML)', weightPercent: 50, direction: 'Positive' },
              { factor: 'Cryptographic Hash Deed Matching', weightPercent: 30, direction: 'Positive' },
              { factor: 'Digital Signature Key Verification', weightPercent: 20, direction: 'Positive' }
            ],
            auditHash: '0x44e1...22b8'
          }}
          size="md"
        />
      </div>

      {/* Fraud & AML Alerts Feed */}
      <div className="space-y-3">
        {alerts.map(alert => (
          <div 
            key={alert.id}
            className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-slate-400">{alert.id}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  alert.severity === 'Critical' 
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' 
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                }`}>
                  {alert.severity} • {alert.category}
                </span>
                <span className="text-[10px] text-slate-400">{alert.timestamp}</span>
              </div>

              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{alert.title}</h4>
              <p className="text-xs text-slate-500">{alert.details}</p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-xs font-bold px-3 py-1 rounded-xl ${
                alert.status === 'Resolved' 
                  ? 'bg-emerald-500/10 text-emerald-600' 
                  : 'bg-rose-500/10 text-rose-600'
              }`}>
                {alert.status}
              </span>
              {alert.status !== 'Resolved' && (
                <button
                  onClick={() => handleResolveAlert(alert.id)}
                  className="px-3.5 py-2 bg-slate-900 dark:bg-slate-700 text-white font-extrabold text-xs rounded-xl cursor-pointer hover:bg-slate-800"
                >
                  Mark Resolved
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
