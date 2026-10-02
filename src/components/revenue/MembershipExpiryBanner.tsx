import React, { useEffect, useState } from 'react';
import { CalendarClock, X } from 'lucide-react';
import { apiClient, BackendMembershipStatus } from '../../services/apiClient';
import { formatDate } from './membershipFormat';

/**
 * App-wide reminder shown when a paid plan is within 7 days of its end date or in its
 * grace period. Renewal is manual (ToyyibPay bills are one-off), so this is the main
 * prompt members get until email reminders exist.
 */
export const MembershipExpiryBanner: React.FC<{ onRenew: () => void }> = ({ onRenew }) => {
  const [status, setStatus] = useState<BackendMembershipStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    apiClient.getMembershipStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  if (dismissed || !status || (status.lifecycleStatus !== 'EXPIRING_SOON' && status.lifecycleStatus !== 'GRACE')) return null;
  const inGrace = status.lifecycleStatus === 'GRACE';

  return (
    <div className={`mb-6 p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
      inGrace
        ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800/50 dark:text-rose-300'
        : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800/50 dark:text-amber-300'
    }`}>
      <div className="flex items-start gap-3 text-sm">
        <CalendarClock className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <div className="font-black">
            {inGrace
              ? `Your ${status.planName} plan ended on ${formatDate(status.currentPeriodEnd)}`
              : `Your ${status.planName} plan ends in ${status.daysRemaining} day${status.daysRemaining === 1 ? '' : 's'}`}
          </div>
          <div className="text-xs mt-0.5 opacity-90">
            {inGrace
              ? `Renew by ${formatDate(status.graceEndsAt)} to keep your plan. After that your account moves to the Free plan.`
              : `Renew before ${formatDate(status.currentPeriodEnd)}. Renewing early adds a full period after the current end date.`}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={onRenew} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer">Renew now</button>
        <button onClick={() => setDismissed(true)} className="p-2 rounded-xl opacity-70 hover:opacity-100 cursor-pointer" aria-label="Dismiss membership reminder"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
};
