import React, { useState } from 'react';
import { aiGovernanceService } from '../services/AIGovernanceService';
import { aiAuditLogger } from '../services/AIAuditLogger';
import { AIFeatureKey, AIFeatureStatus } from '../types/aiCoreTypes';
import { Settings, ShieldCheck, Activity, ToggleLeft, ToggleRight, MessageSquare, History } from 'lucide-react';

export const AIGovernanceAdminPanel: React.FC = () => {
  const [configs, setConfigs] = useState(aiGovernanceService.getConfigs());
  const [auditLogs] = useState(aiAuditLogger.getAllLogs());
  const [feedbackList] = useState(aiGovernanceService.getFeedbackList());
  const [activeSubTab, setActiveSubTab] = useState<'features' | 'logs' | 'feedback'>('features');

  const handleToggle = (key: AIFeatureKey, currentStatus: AIFeatureStatus) => {
    const nextStatus: AIFeatureStatus = currentStatus === 'ENABLED' ? 'DISABLED' : 'ENABLED';
    aiGovernanceService.toggleFeatureStatus(key, nextStatus);
    setConfigs(aiGovernanceService.getConfigs());
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 text-white">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-black">AI Governance & Administration</h2>
          </div>
          <p className="text-slate-300 text-[11px] mt-1">
            Toggle AI modules, configure human approval requirements, and audit decision logs across all tenants.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('features')}
            className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer ${
              activeSubTab === 'features' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            Modules ({configs.length})
          </button>
          <button
            onClick={() => setActiveSubTab('logs')}
            className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer ${
              activeSubTab === 'logs' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            AI Audit Logs ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveSubTab('feedback')}
            className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer ${
              activeSubTab === 'feedback' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            User Feedback ({feedbackList.length})
          </button>
        </div>
      </div>

      {activeSubTab === 'features' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {configs.map(cfg => (
            <div
              key={cfg.key}
              className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-900 dark:text-white text-sm">{cfg.name}</h3>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {cfg.version}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{cfg.description}</p>
                </div>

                <button
                  onClick={() => handleToggle(cfg.key, cfg.status)}
                  className="cursor-pointer text-slate-700 dark:text-slate-200"
                >
                  {cfg.status === 'ENABLED' ? (
                    <ToggleRight className="w-8 h-8 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-400" />
                  )}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between text-[10px] pt-2 border-t border-slate-100 dark:border-slate-700/60 text-slate-500">
                <span>Owner Role: <strong className="text-slate-700 dark:text-slate-300">{cfg.ownerRole}</strong></span>
                <span>Human Review: <strong className={cfg.humanApprovalRequired ? 'text-amber-600 font-extrabold' : 'text-slate-500'}>{cfg.humanApprovalRequired ? 'Mandatory' : 'Optional'}</strong></span>
                <span>Status: <strong className={cfg.status === 'ENABLED' ? 'text-emerald-600' : 'text-rose-600'}>{cfg.status}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'logs' && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
          <h3 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-purple-600" />
            Global AI Decision Audit Events
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold uppercase text-[9px]">
                <tr>
                  <th className="p-2.5 rounded-l-xl">Request ID</th>
                  <th className="p-2.5">Feature</th>
                  <th className="p-2.5">User & Role</th>
                  <th className="p-2.5">Confidence</th>
                  <th className="p-2.5">Human Decision</th>
                  <th className="p-2.5 rounded-r-xl">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {auditLogs.map(log => (
                  <tr key={log.aiRequestId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="p-2.5 font-mono font-bold text-purple-600">{log.aiRequestId}</td>
                    <td className="p-2.5 font-semibold capitalize">{log.aiFeature.replace('_', ' ')}</td>
                    <td className="p-2.5">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{log.userName || log.userId}</div>
                      <div className="text-[10px] text-slate-400">{log.role}</div>
                    </td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.confidenceLevel === 'HIGH' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {log.confidenceLevel}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        log.humanDecision === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                        log.humanDecision === 'OVERRIDDEN' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {log.humanDecision}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-400 font-mono text-[10px]">{log.timestamp.slice(0, 16).replace('T', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'feedback' && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
          <h3 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            AI Output Quality & Human Feedback
          </h3>
          <p className="text-slate-500 text-[11px]">
            Direct feedback captured from Shariah advisors, risk officers, and pool managers.
          </p>

          {feedbackList.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs italic">
              No negative feedback or quality issue reports logged yet.
            </div>
          ) : (
            <div className="space-y-2">
              {feedbackList.map(f => (
                <div key={f.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{f.aiFeature}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{f.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">{f.comments}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
