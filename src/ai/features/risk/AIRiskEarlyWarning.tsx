import React from 'react';
import { AIRiskAlert } from '../../components/AIRiskAlert';
import { AIConfidenceBadge } from '../../components/AIConfidenceBadge';
import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export const AIRiskEarlyWarning: React.FC = () => {
  const activeProjects = [
    {
      id: 'PROJ-MYS-001',
      title: 'FELDA Agriculture Expansion',
      plannedProgress: 60,
      actualProgress: 42,
      variance: -18,
      status: 'EARLY_WARNING',
      issue: 'Milestone 3 (Equipment Installation) delayed by 3 weeks due to port customs clearance backlog.'
    },
    {
      id: 'PROJ-IDN-002',
      title: 'Sumatra Commercial Solar Waqf',
      plannedProgress: 85,
      actualProgress: 88,
      variance: +3,
      status: 'ON_TRACK',
      issue: 'Grid synchronization milestone completed ahead of schedule.'
    }
  ];

  return (
    <div className="space-y-6 text-xs animate-fadeIn">
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 w-fit">
              <Activity className="w-3.5 h-3.5" />
              Continuous Early Warning Engine
            </span>
            <h2 className="text-base font-black text-slate-900 dark:text-white mt-1">
              Active Project Performance & Variance Monitoring
            </h2>
          </div>
          <AIConfidenceBadge confidence={{ level: 'HIGH', scorePercent: 97, disclaimer: 'Telemetry based on IoT & submitted milestone reports.' }} />
        </div>

        <div className="space-y-4">
          {activeProjects.map(p => (
            <div key={p.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-sm">{p.title}</h3>
                  <span className="text-[10px] font-mono text-slate-400">{p.id}</span>
                </div>

                <span className={`px-2.5 py-1 rounded-full font-black text-[10px] ${
                  p.status === 'EARLY_WARNING' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {p.status === 'EARLY_WARNING' ? '⚠️ Variance Warning' : '✓ On Track'}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold">
                  <span>Progress Comparison (Planned vs Actual)</span>
                  <span className={p.variance < 0 ? 'text-amber-600 font-mono' : 'text-emerald-600 font-mono'}>
                    Planned {p.plannedProgress}% | Actual {p.actualProgress}% ({p.variance}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                  <div className="h-full bg-emerald-500" style={{ width: `${p.actualProgress}%` }} />
                  <div className="h-full bg-amber-400 opacity-60" style={{ width: `${Math.max(0, p.plannedProgress - p.actualProgress)}%` }} />
                </div>
              </div>

              {p.status === 'EARLY_WARNING' && (
                <AIRiskAlert
                  title="Early Warning Triggered: Schedule Slip Detected"
                  description={p.issue}
                  severity="HIGH"
                  mitigation="Manager recommended action: Initiate site visit and verify updated supplier delivery timeline."
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
