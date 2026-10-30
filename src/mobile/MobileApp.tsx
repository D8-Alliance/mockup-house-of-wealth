import React, { useState } from 'react';
import { RBACProvider, useRBAC } from '../rbac/RBACContext';
import { PrivacyConsentGate } from '../legal/PrivacyConsentGate';
import { authService } from '../auth/services/authService';
import { DEMO_PERSONAS } from '../auth/services/demoPersonas';
import { UserProfile } from '../types';
import { MobileShell } from './MobileShell';

const GUEST: UserProfile = {
  id: 'GUEST-001',
  name: 'Guest',
  email: '',
  role: 'Guest',
  organization: '',
  organizationName: '',
  country: 'Malaysia',
  countryCode: 'MY',
  verified: false,
  avatarUrl: '',
  joinedDate: '',
  kycLevel: 'Level 1',
  preferredCurrency: 'MYR',
  autoZakatPercent: 2.5,
  twoFactorEnabled: false,
  notifyEmail: false,
  notifyPush: false,
  notifySMS: false,
  timezone: 'Asia/Kuala_Lumpur',
};

/**
 * The Wealth Pooling mini-app, opened at /m inside the D8 Ideas super app (or a phone browser). Same sign-in,
 * API and rules as the web app; its own phone layout. Sign-in is Keycloak for now; the super app's SSO is
 * connected once D8 Ideas sends its identity provider details.
 */
export default function MobileApp() {
  const [user, setUser] = useState<UserProfile>(GUEST);
  return (
    <RBACProvider currentUser={user} onUserRoleChange={setUser}>
      <MobileGate />
    </RBACProvider>
  );
}

function MobileGate() {
  const { isAuthenticated, signInError } = useRBAC();
  if (!isAuthenticated) return <MobileSignIn error={signInError} />;
  return <PrivacyConsentGate><MobileShell /></PrivacyConsentGate>;
}

function MobileSignIn({ error }: { error: string | null }) {
  const { authMode, loginUser } = useRBAC();
  const [starting, setStarting] = useState(false);
  const [demoError, setDemoError] = useState('');
  const signIn = () => {
    setStarting(true);
    if (authMode === 'PRODUCTION') {
      // Keycloak: the browser leaves for the sign-in page and comes back to /m.
      authService.login({ email: '', password: '', selectedRole: 'Retail Investor', rememberMe: false });
      return;
    }
    // Demo and pre-production: the sample retail investor, as the web app's demo sign-in does.
    const persona = DEMO_PERSONAS['Retail Investor'];
    const result = authService.login({ email: persona.email, password: '', selectedRole: 'Retail Investor', rememberMe: false });
    if (result.success && result.session) loginUser(result.session.user.activeRole, result.session.user.email);
    else { setDemoError(result.error || 'Sign-in failed.'); setStarting(false); }
  };
  const shownError = error || demoError;
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-6 px-6 bg-gradient-to-b from-emerald-950 via-emerald-900 to-slate-950 text-white text-center">
      <div className="w-24 h-24 rounded-full bg-white/95 border-2 border-amber-400/60 flex items-center justify-center shadow-xl">
        <img src="/wealth-pooling-logo.svg" alt="" className="w-16 h-16" />
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-black">Wealth Pooling D-8</h1>
        <p className="text-sm text-amber-200 font-semibold">Islamic Circular Economy Platform</p>
      </div>
      <p className="text-sm text-emerald-50/80 max-w-xs">Invest in Shariah-compliant wealth pools and follow your investments from your phone.</p>
      {shownError && <p role="alert" className="max-w-xs rounded-xl bg-rose-500/15 border border-rose-400/40 p-3 text-xs font-semibold text-rose-100">{shownError}</p>}
      <button
        type="button"
        onClick={signIn}
        disabled={starting}
        className="w-full max-w-xs py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-black text-sm shadow-lg"
      >
        {starting ? 'Opening sign-in...' : 'Sign in'}
      </button>
    </main>
  );
}
