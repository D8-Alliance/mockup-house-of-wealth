import {StrictMode, Suspense, lazy} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
import {installPlatformTimeZone} from './utils/platformTime';
import {IS_STATIC_DEMO} from './services/apiFetch';
import {isMobileApp} from './mobile/mobilePath';

// The web app and the mini-app (/m) are separate bundles: a phone opening the mini-app does not download the
// web app's screens, and the web app does not download the mini-app.
const App = lazy(() => import('./App.tsx'));
const MobileApp = lazy(() => import('./mobile/MobileApp'));

// Show all dates in the user's country-node time zone (Malaysia: GMT+8), not the device's.
installPlatformTimeZone();

const mobile = isMobileApp();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {mobile ? (
      <Suspense fallback={<div className="min-h-dvh bg-emerald-950" />}>
        <MobileApp />
      </Suspense>
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
