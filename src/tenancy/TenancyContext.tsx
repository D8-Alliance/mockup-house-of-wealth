import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CountryNode } from '../models/countryNode';
import { Organisation } from '../models/organisation';
import { AppUser } from '../models/user';
import { useRBAC } from '../rbac/RBACContext';
import { filterByTenant, TenantContext } from './tenantFilter';
import { organisationService } from '../organisations/organisationService';
import { userService } from '../users/userService';

export const INITIAL_COUNTRY_NODES: CountryNode[] = [
  { id: 'CN-PAK', countryNodeId: 'CN-PAK', code: 'PAK', countryCode: 'PAK', name: 'Pakistan', countryName: 'Pakistan', flagUrl: '🇵🇰', currency: 'PKR / USD', timezone: 'Asia/Karachi', centralBankApproval: true, activeOrganisationsCount: 12, activeUsersCount: 98, activeProjectsCount: 16, activePoolsCount: 6, status: 'ACTIVE', verificationStatus: 'VERIFIED', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2026-08-01T00:00:00Z', regulatoryProfile: 'SBP / SECP', region: 'South Asia' },
  { id: 'CN-TUR', countryNodeId: 'CN-TUR', code: 'TUR', countryCode: 'TUR', name: 'Turkey', countryName: 'Turkey', flagUrl: '🇹🇷', currency: 'TRY / USD', timezone: 'Europe/Istanbul', centralBankApproval: true, activeOrganisationsCount: 8, activeUsersCount: 64, activeProjectsCount: 10, activePoolsCount: 4, status: 'ACTIVE', verificationStatus: 'VERIFIED', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2026-08-01T00:00:00Z', regulatoryProfile: 'SPK / BDDK', region: 'Eurasia' },
  { id: 'CN-MYS', countryNodeId: 'CN-MYS', code: 'MYS', countryCode: 'MYS', name: 'Malaysia', countryName: 'Malaysia', flagUrl: '🇲🇾', currency: 'MYR / USD', timezone: 'Asia/Kuala_Lumpur', centralBankApproval: true, activeOrganisationsCount: 18, activeUsersCount: 142, activeProjectsCount: 24, activePoolsCount: 8, status: 'ACTIVE', verificationStatus: 'VERIFIED', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2026-08-01T00:00:00Z', regulatoryProfile: 'Bank Negara Malaysia / SC', region: 'Southeast Asia' }
];

interface TenancyContextType {
  activeCountryNode: CountryNode;
  activeOrganisation: Organisation;
  countryNodes: CountryNode[];
  organisations: Organisation[];
  setCountryNode: (id: string) => void;
  setOrganisation: (id: string) => void;
  tenantContext: TenantContext;
  filterTenantData: <T extends Record<string, any>>(items: T[]) => T[];
}

const TenancyContext = createContext<TenancyContextType | undefined>(undefined);

export const TenancyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentRole, activeUser } = useRBAC();

  const [countryNodes] = useState<CountryNode[]>(INITIAL_COUNTRY_NODES);
  const [organisations, setOrganisations] = useState<Organisation[]>(organisationService.getAllOrganisations());

  const [activeCountryNodeId, setActiveCountryNodeId] = useState<string>('CN-PAK');
  const [activeOrganisationId, setActiveOrganisationId] = useState<string>('ORG-GULF-CAP');

  const activeCountryNode = countryNodes.find(c => c.countryNodeId === activeCountryNodeId || c.id === activeCountryNodeId) || countryNodes[0];
  const activeOrganisation = organisations.find(o => o.organisationId === activeOrganisationId || (o as any).id === activeOrganisationId) || organisations[0];

  const tenantContext: TenantContext = {
    userId: activeUser.id,
    role: currentRole,
    organisationId: activeOrganisation.organisationId || (activeOrganisation as any).id,
    countryNodeId: activeCountryNode.countryNodeId || activeCountryNode.id
  };

  const setCountryNode = (id: string) => {
    setActiveCountryNodeId(id);
    const orgs = organisationService.getOrganisationsByCountryNode(id);
    if (orgs.length > 0) {
      setActiveOrganisationId(orgs[0].organisationId || (orgs[0] as any).id);
    }
  };

  const setOrganisation = (id: string) => {
    setActiveOrganisationId(id);
    const org = organisationService.getOrganisationById(id);
    if (org) {
      setActiveCountryNodeId(org.countryNodeId);
    }
  };

  const filterTenantData = <T extends Record<string, any>>(items: T[]): T[] => {
    return filterByTenant(items, tenantContext);
  };

  return (
    <TenancyContext.Provider
      value={{
        activeCountryNode,
        activeOrganisation,
        countryNodes,
        organisations,
        setCountryNode,
        setOrganisation,
        tenantContext,
        filterTenantData
      }}
    >
      {children}
    </TenancyContext.Provider>
  );
};

export const useTenancy = () => {
  const ctx = useContext(TenancyContext);
  if (!ctx) {
    throw new Error('useTenancy must be used within a TenancyProvider');
  }
  return ctx;
};
