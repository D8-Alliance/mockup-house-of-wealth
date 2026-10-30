import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { ProfilePreferences } from '../services/apiClient';

type Channel = 'email' | 'push' | 'sms';

interface NotificationPreferencesPanelProps {
  preferences: ProfilePreferences;
  onSave: (change: ProfilePreferences) => Promise<void>;
}

// The platform notifies in the app and by email only; push and SMS are not offered.
const CHANNELS: { key: Channel; label: string; text: string }[] = [
  { key: 'email', label: 'Email', text: 'Investments, profit payouts, approvals and verification results, also sent to your sign-in email.' },
];

/** Saved on the server; the notification sender skips any channel switched off here. */
export const NotificationPreferencesPanel: React.FC<NotificationPreferencesPanelProps> = ({ preferences, onSave }) => {
  const [saving, setSaving] = useState<Channel | null>(null);
  const choices = preferences.notifications ?? {};

  const toggle = async (key: Channel) => {
    setSaving(key);
    try {
      await onSave({ notifications: { [key]: choices[key] === false } });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-md space-y-6">
      <div>
        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-emerald-500" />
          <span>Notification Preferences</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Notifications always appear in the app. Choose whether they also reach you by email.
        </p>
      </div>

      <div className="space-y-4">
        {CHANNELS.map((item) => {
          const on = choices[item.key] !== false;
          return (
            <div key={item.key} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex justify-between items-center gap-4">
              <div>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white block">{item.label}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block max-w-xl">{item.text}</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={item.label}
                disabled={saving !== null}
                onClick={() => void toggle(item.key)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 disabled:opacity-60 ${on ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform absolute top-0.5 ${on ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
