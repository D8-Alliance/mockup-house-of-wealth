import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {installPlatformTimeZone} from './utils/platformTime';
import {IS_STATIC_DEMO} from './services/apiFetch';

// Show all dates in the user's country-node time zone (Malaysia: GMT+8), not the device's.
installPlatformTimeZone();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {IS_STATIC_DEMO && (
      <div role="status" className="fixed bottom-3 left-3 z-[70] max-w-[calc(100vw-1.5rem)] rounded-full bg-amber-500 px-3.5 py-1.5 text-[11px] font-bold text-slate-950 shadow-lg pointer-events-none">
        Demo mode: recorded sample data, actions are not saved
      </div>
    )}
  </StrictMode>,
);
