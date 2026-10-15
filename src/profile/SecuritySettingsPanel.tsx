import React from 'react';
import { ExternalLink, History, Lock, Smartphone } from 'lucide-react';
import { accountConsoleUrl } from '../auth/services/oidcAuthProvider';
import { AuthMode } from '../auth/types/authTypes';

interface SecuritySettingsPanelProps {
  authMode?: AuthMode;
}

const CARD = 'bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-md';

/**
 * Passwords, one-time codes and signed-in devices belong to the identity provider (Keycloak), not
 * to this app, so this tab sends the user to the provider's own account pages rather than
 * pretending to change them here.
 */
export const SecuritySettingsPanel: React.FC<SecuritySettingsPanelProps> = ({ authMode }) => {
  const signingIn = accountConsoleUrl('signing-in');
  const devices = accountConsoleUrl('device-activity');
  const live = authMode === 'PRODUCTION' && signingIn && devices;

  if (!live) {
    return (
      <div className={`${CARD} space-y-3`}>
        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Lock className="w-5 h-5 text-emerald-500" />
          <span>Security & Sign-in</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
          Demo personas have no password, one-time code or devices to manage. On the live platform, this tab opens the secure D-8 sign-in service, where you change your password, set up your authenticator app and sign out other devices.
        </p>
      </div>
    );
  }

  const items = [
    { icon: <Lock className="w-5 h-5 text-emerald-500" />, title: 'Password', text: 'Change your password. You will be asked for your current one first.', href: signingIn, action: 'Change password' },
    { icon: <Smartphone className="w-5 h-5 text-emerald-500" />, title: 'Two-factor authentication (one-time code)', text: 'Set up or replace the authenticator app (Google Authenticator, Microsoft Authenticator, 1Password). Staff roles must use it at every sign-in.', href: signingIn, action: 'Manage one-time code' },
    { icon: <History className="w-5 h-5 text-emerald-500" />, title: 'Signed-in devices', text: 'See where your account is signed in and sign out any device you do not recognise.', href: devices, action: 'View devices' },
  ];

  return (
    <div className="space-y-6">
      {items.map((item) => (
        <div key={item.title} className={`${CARD} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              {item.icon}
              <span>{item.title}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">{item.text}</p>
          </div>
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
          >
            <span>{item.action}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      ))}
      <p className="text-[11px] text-slate-500 dark:text-slate-400 px-2">
        These open the secure D-8 sign-in service in a new tab. Your sign-in there is the same as here.
      </p>
    </div>
  );
};
