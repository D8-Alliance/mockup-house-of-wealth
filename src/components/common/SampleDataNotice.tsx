import React from 'react';
import { FlaskConical } from 'lucide-react';
import { useRBAC } from '../../rbac/RBACContext';

interface SampleDataNoticeProps {
  /** What the screen will show once it reads the database, e.g. "Wealth pools". */
  subject?: string;
}

/**
 * Marks a screen that still shows built-in sample figures. In the demo every screen is sample data, so the
 * notice appears only in pre-production and production, where a reader would otherwise take it as real.
 */
export const SampleDataNotice: React.FC<SampleDataNoticeProps> = ({ subject }) => {
  const { authMode } = useRBAC();
  if (authMode === 'DEMO') return null;
  return (
    <div role="note" className="p-4 rounded-2xl border border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
      <FlaskConical className="w-5 h-5 shrink-0 text-amber-600" />
      <div>
        <p className="font-black uppercase tracking-wider text-[11px]">Sample data: not live records</p>
        <p className="mt-0.5 font-medium">
          {subject ? `${subject} on this screen are` : 'The figures on this screen are'} built-in examples, not records from the platform's database.
          Nothing here reflects real users, money or decisions.
        </p>
      </div>
    </div>
  );
};
