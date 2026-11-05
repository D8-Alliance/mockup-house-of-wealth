import { useEffect, useState } from 'react';
import { INITIAL_COUNTRY_NODES } from '../../countryNodes/mockCountryNodes';
import { CountryNode } from '../../countryNodes/countryNodeTypes';
import { apiClient } from '../../services/apiClient';
import { useRBAC } from '../../rbac/RBACContext';

// Region and ISO code are fixed geography; everything else comes from the server.
const GEOGRAPHY = new Map(INITIAL_COUNTRY_NODES.map((node) => [node.countryNodeId, node]));
const EMPTY_COUNTS = { activeOrganisationsCount: 0, activeUsersCount: 0, activeProjectsCount: 0, activePoolsCount: 0 };

let cached: Promise<CountryNode[]> | null = null;
function loadNetwork(): Promise<CountryNode[]> {
  cached ??= apiClient.getPublicNetwork().then((rows) => rows.map((row) => {
    const geography = GEOGRAPHY.get(row.countryNodeId);
    return {
      ...(geography ?? { countryCode: row.countryNodeId.replace(/^CN-/, ''), region: '', timezone: '', verificationStatus: 'VERIFIED', createdAt: '', updatedAt: '' }),
      ...row,
    } as CountryNode;
  })).catch((error) => { cached = null; throw error; });
  return cached;
}

/**
 * The member states for the public pages, with live counts of organisations, projects, pools and users
 * (GET /public/network). The built-in examples are used only in the demo mode. Until the figures arrive, or if
 * they cannot be loaded, the counts show as zero rather than as sample numbers.
 */
export function useNetworkCountries(): CountryNode[] {
  const { authMode } = useRBAC();
  const demo = authMode === 'DEMO';
  const [live, setLive] = useState<CountryNode[] | null>(null);
  useEffect(() => {
    if (demo) return;
    let cancelled = false;
    loadNetwork().then((rows) => { if (!cancelled) setLive(rows); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [demo]);
  if (demo) return INITIAL_COUNTRY_NODES;
  return live ?? INITIAL_COUNTRY_NODES.map((node) => ({ ...node, ...EMPTY_COUNTS }));
}
