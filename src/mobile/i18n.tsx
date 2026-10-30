import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { apiClient } from '../services/apiClient';
import { MS } from './i18n.ms';

export type Language = 'en' | 'ms';

const STORAGE_KEY = 'how-mobile-language';

/**
 * The mini-app's text is written in English and looked up in the Malay table by that same English text, so a
 * screen reads `t('Open pools')`. Text missing from the table shows in English rather than as a blank or a key.
 * `{name}` placeholders are filled from `vars`.
 */
export function translate(language: Language, text: string, vars?: Record<string, string | number>): string {
  const base = language === 'ms' ? MS[text] ?? text : text;
  return vars ? base.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match)) : base;
}

function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'ms') return saved;
  } catch {
    // Storage unavailable: fall back to the phone's language.
  }
  return typeof navigator !== 'undefined' && /^(ms|id)\b/i.test(navigator.language) ? 'ms' : 'en';
}

interface LanguageContextValue {
  language: Language;
  /** Changes the language; once signed in it is also saved with the account, so it follows the user to another phone. */
  setLanguage: (language: Language, options?: { saveToAccount?: boolean }) => void;
  t: (text: string, vars?: Record<string, string | number>) => string;
  /** For dates and numbers: ms-MY or en-MY. */
  locale: string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => undefined,
  t: (text, vars) => translate('en', text, vars),
  locale: 'en-MY',
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const setLanguage = useCallback((next: Language, options?: { saveToAccount?: boolean }) => {
    setLanguageState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* the choice lasts for this visit only */ }
    if (options?.saveToAccount) apiClient.updateMyProfile({ preferences: { language: next } }).catch(() => undefined);
  }, []);
  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage,
    t: (text, vars) => translate(language, text, vars),
    locale: language === 'ms' ? 'ms-MY' : 'en-MY',
  }), [language, setLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useT = () => useContext(LanguageContext);

/** The BM | EN switch. */
export const LanguageToggle: React.FC<{ saveToAccount?: boolean; tone?: 'dark' | 'light' }> = ({ saveToAccount, tone = 'dark' }) => {
  const { language, setLanguage, t } = useT();
  const idle = tone === 'dark' ? 'text-emerald-100/80' : 'text-slate-500';
  return (
    <div role="radiogroup" aria-label={t('Language')} className={`flex rounded-full border p-0.5 text-[11px] font-black ${tone === 'dark' ? 'border-white/30' : 'border-slate-300 dark:border-slate-600'}`}>
      {(['ms', 'en'] as Language[]).map(option => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={language === option}
          onClick={() => setLanguage(option, { saveToAccount })}
          className={`px-2 py-0.5 rounded-full ${language === option ? 'bg-amber-300 text-emerald-950' : idle}`}
        >
          {option === 'ms' ? 'BM' : 'EN'}
        </button>
      ))}
    </div>
  );
};
