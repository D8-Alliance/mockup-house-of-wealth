import React, { useState } from 'react';
import { Building2, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useRBAC } from '../../rbac/RBACContext';
import { UserRole } from '../../rbac/types';
import { authService } from '../../auth/services/authService';

import { LoginForm } from '../../auth/components/LoginForm';
import { MfaStep } from '../../auth/components/MfaStep';
import { ForgotPasswordStep } from '../../auth/components/ForgotPasswordStep';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessLogin?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccessLogin }) => {
  const { currentRole, authMode } = useRBAC();

  const [mode, setMode] = useState<'login' | 'mfa' | 'forgot'>('login');
  const [email, setEmail] = useState('ahmed.almansoor@how.org');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [selectedRole, setSelectedRole] = useState<UserRole>('Country Admin');
  const [otp, setOtp] = useState(['4', '8', '2', '9', '1', '0']);
  const [challengeId, setChallengeId] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmitLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter both email address and password.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const res = authService.login({
        email,
        password,
        selectedRole,
        rememberMe
      });

      if (res.mfaRequired && res.challengeId) {
        setChallengeId(res.challengeId);
        setMode('mfa');
      } else if (res.success && res.session) {
        performLoginSuccess(selectedRole);
      } else {
        setError(res.error || 'Authentication failed. Please check your credentials.');
      }
    }, 600);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.join('').length < 6) {
      setError('Please enter full 6-digit MFA verification code.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const res = authService.completeMfa(challengeId, otp.join(''), selectedRole);
      if (res.success && res.session) {
        performLoginSuccess(selectedRole);
      } else {
        setError(res.error || 'Invalid MFA Code.');
      }
    }, 600);
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address to receive reset instructions.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const res = authService.requestPasswordReset(email);
      setSuccessMsg(res.message);
      setTimeout(() => {
        setSuccessMsg(null);
        setMode('login');
      }, 2500);
    }, 600);
  };

  const performLoginSuccess = (role: UserRole) => {
    setSuccessMsg(`Authenticated successfully as ${role}`);
    setTimeout(() => {
      setSuccessMsg(null);
      if (onSuccessLogin) onSuccessLogin();
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white">House of Wealth</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                D-8 Enterprise Identity Gateway ({authMode || 'DEMO'} MODE)
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-300 font-medium mt-1">
            {mode === 'login' && 'Sign in to access your role-based financial workspace'}
            {mode === 'mfa' && 'Two-Factor Authentication (2FA / MFA Required)'}
            {mode === 'forgot' && 'Reset your House of Wealth account password'}
          </p>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-6">

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'login' && (
            <LoginForm
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              rememberMe={rememberMe}
              setRememberMe={setRememberMe}
              selectedRole={selectedRole}
              setSelectedRole={setSelectedRole}
              loading={loading}
              onLoginSubmit={handleSubmitLogin}
              onForgotPasswordClick={() => setMode('forgot')}
              authMode={authMode}
            />
          )}

          {mode === 'mfa' && (
            <MfaStep
              otp={otp}
              setOtp={setOtp}
              selectedRole={selectedRole}
              loading={loading}
              onVerifyMfa={handleVerifyOtp}
              onBackToLogin={() => setMode('login')}
            />
          )}

          {mode === 'forgot' && (
            <ForgotPasswordStep
              email={email}
              setEmail={setEmail}
              loading={loading}
              onSubmitForgot={handleForgotPassword}
              onCancel={() => setMode('login')}
            />
          )}

        </div>

      </div>
    </div>
  );
};
