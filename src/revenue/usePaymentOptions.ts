import { useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';

/**
 * Whether the backend accepts simulated (demo) payments. Starts false and stays
 * false if the request fails, so demo methods are only offered when allowed.
 */
export function useSimulatedPaymentsAllowed() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    let active = true;
    apiClient.getPaymentOptions().then((options) => { if (active) setAllowed(options.simulatedPaymentsAllowed); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  return allowed;
}
