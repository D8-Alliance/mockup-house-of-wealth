import React from 'react';
import { LanguageCode } from '../types';
import { LanguageProvider } from '../mobile/i18n';
import { MobileLeasing } from '../mobile/screens/MobileLeasing';

/**
 * Direct leasing (Ijarah without a project) on the web portal: the same screens as the mini-app's Leasing tab,
 * for asset owners (units, requests, rent, deposits, report), companies looking for space and Legal/Shariah
 * reviewers. Shown in Malay when the portal is in Malay, otherwise in English.
 */
export const LeasingWebView: React.FC<{ lang: LanguageCode }> = ({ lang }) => (
  <LanguageProvider fixed={lang === 'ms' ? 'ms' : 'en'}>
    <div className="max-w-3xl mx-auto text-slate-900 dark:text-white">
      <MobileLeasing />
    </div>
  </LanguageProvider>
);
