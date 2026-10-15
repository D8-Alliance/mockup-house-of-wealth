import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useRBAC } from '../../rbac/RBACContext';

/** Plain-language explanations for the reasons the API gives when it refuses a sign-in. */
const EXPLANATIONS: { match: RegExp; text: string }[] = [
  { match: /MFA is required/i, text: 'Your role needs a one-time code (OTP), but the sign-in did not record one. Ask an administrator to check the OTP settings in Keycloak.' },
  { match: /not provisioned|inactive/i, text: 'Your sign-in account is not linked to a user in this system yet, or that user is inactive. Ask an administrator to set up your access.' },
  { match: /role is currently disabled/i, text: 'Your role is switched off on this platform. A Super Admin can turn it on under Admin Center > Role Availability.' },
  { match: /no active role/i, text: 'You have no active role in this organisation and country. Ask an administrator to assign one.' },
  { match: /issuer mismatch|audience mismatch|signature|algorithm/i, text: 'The sign-in server and the system are not configured to match. Please tell an administrator.' },
  { match: /tidak dapat dicapai|failed to fetch|network/i, text: 'The system could not be reached. Check your connection and try again.' },
];

/** Shows why the last sign-in was refused, instead of silently returning to the home page. */
export const SignInErrorBanner: React.FC = () => {
  const { signInError, clearSignInError } = useRBAC();
  if (!signInError) return null;
  const explanation = EXPLANATIONS.find(item => item.match.test(signInError))?.text ?? 'The sign-in could not be completed. Please try again, or tell an administrator.';
  return (
    <div role="alert" className="w-full bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-start gap-3 text-sm">
        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-rose-800 dark:text-rose-200">Sign-in was not completed</p>
          <p className="text-rose-700 dark:text-rose-300">{explanation}</p>
          <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5 break-words">Reason from the server: {signInError}</p>
        </div>
        <button type="button" onClick={clearSignInError} aria-label="Dismiss" className="p-1 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/50">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
