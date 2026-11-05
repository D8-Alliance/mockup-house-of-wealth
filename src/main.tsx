import {StrictMode, Suspense, lazy} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
import {installPlatformTimeZone} from './utils/platformTime';
import {IS_STATIC_DEMO} from './services/apiFetch';
import {isMobileApp} from './mobile/mobilePath';
import {ErrorBoundary} from './components/ErrorBoundary';

// After a deploy the old script files are gone. A page loaded from an older copy of index.html then fails to load
// its screens and would stay blank: reload once to get the new files. A second failure within a minute is shown
// instead, so a real fault does not reload forever.
const RELOADED_AT = 'how.reloadedAfterDeploy';
function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOADED_AT) ?? 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(RELOADED_AT, String(Date.now()));
  } catch { /* storage blocked: reload anyway */ }
  window.location.reload();
  return true;
}
window.addEventListener('vite:preloadError', (event) => { if (reloadForNewVersion()) event.preventDefault(); });
const loadScreens = <T,>(load: () => Promise<T>) => () => load().catch((error) => {
  if (reloadForNewVersion()) return new Promise<T>(() => {});
  throw error;
});

// The web app and the mini-app (/m) are separate bundles: a phone opening the mini-app does not download the
// web app's screens, and the web app does not download the mini-app.
const App = lazy(loadScreens(() => import('./App.tsx')));
const MobileApp = lazy(loadScreens(() => import('./mobile/MobileApp')));

// Show all dates in the user's country-node time zone (Malaysia: GMT+8), not the device's.
installPlatformTimeZone();

const mobile = isMobileApp();
// Only the mini-app follows the phone's dark mode (see the dark variant in index.css); the web app stays light.
if (mobile) document.documentElement.classList.add('mini-app');

/** Instead of a blank screen when the mini-app fails: what went wrong and a way back in. Bilingual, as the language setting may not have loaded. */
const MobileCrash = (error: Error | null) => (
  <div className="min-h-dvh bg-emerald-950 text-white flex items-center justify-center p-6">
    <div className="max-w-sm w-full rounded-2xl bg-white/10 p-5 text-center space-y-3">
      <p className="text-lg font-black">Ada masalah memaparkan skrin ini</p>
      <p className="text-xs text-white/70">Something went wrong showing this screen.</p>
      {error?.message && <p className="text-[11px] text-white/60 break-words">{error.message}</p>}
      <button type="button" onClick={() => window.location.reload()} className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-black text-emerald-950">Muat semula / Reload</button>
    </div>
  </div>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {mobile ? (
      <ErrorBoundary fallback={MobileCrash}>
        <Suspense fallback={<div className="min-h-dvh bg-emerald-950" />}>
          <MobileApp />
        </Suspense>
      </ErrorBoundary>
    ) : (
      <Suspense fallback={null}>
        <App />
      </Suspense>
    )}
    {IS_STATIC_DEMO && (
      // In the mini-app the bottom of the screen holds the tabs, so the badge sits under the header instead.
      <div role="status" className={`fixed ${mobile ? 'top-16' : 'bottom-3'} left-3 z-[70] max-w-[calc(100vw-1.5rem)] rounded-full bg-amber-500 px-3.5 py-1.5 text-[11px] font-bold text-slate-950 shadow-lg pointer-events-none`}>
        Demo mode: recorded sample data, actions are not saved
      </div>
    )}
  </StrictMode>,
);
