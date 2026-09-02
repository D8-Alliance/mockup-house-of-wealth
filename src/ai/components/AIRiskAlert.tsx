import React from 'react';
import { AISeverityLevel } from '../types/aiCoreTypes';
import { AlertOctagon, AlertTriangle, Info, ShieldAlert } from 'lucide-react';

interface AIRiskAlertProps {
  title: string;
  description: string;
  severity: AISeverityLevel;
  mitigation?: string;
}

export const AIRiskAlert: React.FC<AIRiskAlertProps> = ({ title, description, severity, mitigation }) => {
  const getSeverityStyle = () => {
    switch (severity) {
      case 'CRITICAL':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200',
          badge: 'bg-rose-600 text-white',
          icon: <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
        };
      case 'HIGH':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200',
          badge: 'bg-amber-600 text-white',
          icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        };
      case 'MEDIUM':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300 dark:border-yellow-800 text-yellow-900 dark:text-yellow-200',
          badge: 'bg-yellow-600 text-white',
          icon: <ShieldAlert className="w-4 h-4 text-yellow-600 shrink-0" />
        };
      case 'LOW':
      case 'INFO':
      default:
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200',
          badge: 'bg-blue-600 text-white',
          icon: <Info className="w-4 h-4 text-blue-600 shrink-0" />
        };
    }
  };

  const style = getSeverityStyle();

  return (
    <div className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${style.bg}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-black">
          {style.icon}
          <span>{title}</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${style.badge}`}>
          {severity}
        </span>
      </div>

      <p className="text-[11px] leading-relaxed opacity-90">{description}</p>

      {mitigation && (
        <div className="pt-1.5 border-t border-current/20 text-[10px] font-semibold">
          <span className="font-extrabold uppercase">Potential Consideration:</span> {mitigation}
        </div>
      )}
    </div>
  );
};
