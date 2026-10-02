import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {installPlatformTimeZone} from './utils/platformTime';

// Show all dates in the user's country-node time zone (Malaysia: GMT+8), not the device's.
installPlatformTimeZone();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
