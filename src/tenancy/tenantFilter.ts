import { UserRole } from '../rbac/types';

export interface TenantContext {
  userId: string;
  role: UserRole;
  organisationId: string;
  countryNodeId: string;
}

export function filterByTenant<T extends { 
  organisationId?: string; 
  countryNodeId?: string; 
  createdBy?: string; 
  owner?: string;
  shariahStatus?: string;
  metadata?: { organisationId?: string; countryNodeId?: string; createdBy?: string };
}>(items: T[], ctx: TenantContext): T[] {
  if (!items) return [];

  const roleStr = ctx.role as string;

  // 1. Super Admin, Security Admin, System Admin -> See all records globally
  if (ctx.role === 'Super Admin' || ctx.role === 'Security Administrator' || ctx.role === 'System Administrator') {
    return items;
  }

  // 2. Country Admin -> See all records within their Country Node
  if (ctx.role === 'Country Admin') {
    return items.filter(item => {
      const cNode = item.countryNodeId || item.metadata?.countryNodeId;
      return !cNode || cNode === ctx.countryNodeId;
    });
  }

  // 3. Organization Admin, Project Sponsor, Pool Manager, Finance Officer, Risk Officer
  if (
    ctx.role === 'Organization Admin' || 
    ctx.role === 'Project Sponsor' || 
    ctx.role === 'Project Manager' ||
    ctx.role === 'Pool Manager' ||
    ctx.role === 'Finance Officer' ||
    ctx.role === 'Treasury Officer'
  ) {
    return items.filter(item => {
      const orgId = item.organisationId || item.metadata?.organisationId;
      return !orgId || orgId === ctx.organisationId;
    });
  }

  // 4. Investor types -> See only own investments/data
  if (
    ctx.role === 'Retail Investor' || 
    ctx.role === 'HNWI Investor' || 
    ctx.role === 'Institutional Investor' || 
    ctx.role === 'Corporate Investor'
  ) {
    return items.filter(item => {
      const creator = item.createdBy || item.metadata?.createdBy || item.owner;
      if (!creator || creator === ctx.userId || item.owner === ctx.userId) return true;
      return item.organisationId === ctx.organisationId;
    });
  }

  // 5. Shariah Advisor, Shariah Reviewer, Shariah Committee -> See records requiring Shariah review or in organisation
  if (roleStr.startsWith('Shariah')) {
    return items.filter(item => {
      if (item.shariahStatus === 'Pending Review' || item.shariahStatus === 'Verified') return true;
      const orgId = item.organisationId || item.metadata?.organisationId;
      return !orgId || orgId === ctx.organisationId || item.countryNodeId === ctx.countryNodeId;
    });
  }

  // Default fallback: Filter by organisation ID
  return items.filter(item => {
    const orgId = item.organisationId || item.metadata?.organisationId;
    return !orgId || orgId === ctx.organisationId;
  });
}
