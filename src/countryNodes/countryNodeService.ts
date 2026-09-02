import { CountryNode, CountryNodeStatus, CountryVerificationStatus } from './countryNodeTypes';
import { INITIAL_COUNTRY_NODES } from './mockCountryNodes';
import { auditLogger } from '../audit/auditLogger';

class CountryNodeServiceStore {
  private countryNodes: CountryNode[] = [...INITIAL_COUNTRY_NODES];

  public getAllCountryNodes(): CountryNode[] {
    return [...this.countryNodes];
  }

  public getCountryNodeById(id: string): CountryNode | undefined {
    return this.countryNodes.find(cn => cn.countryNodeId === id || cn.countryCode === id);
  }

  public createCountryNode(data: Omit<CountryNode, 'createdAt' | 'updatedAt' | 'activeOrganisationsCount' | 'activeUsersCount' | 'activeProjectsCount' | 'activePoolsCount'>, performedBy: string): CountryNode {
    const newNode: CountryNode = {
      ...data,
      activeOrganisationsCount: 0,
      activeUsersCount: 0,
      activeProjectsCount: 0,
      activePoolsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.countryNodes.unshift(newNode);

    auditLogger.logEvent({
      userId: performedBy,
      organisationId: 'GLOBAL',
      countryNodeId: newNode.countryNodeId,
      role: 'Super Admin',
      action: 'country_node_create' as any,
      resourceType: 'CountryNode',
      resourceId: newNode.countryNodeId,
      result: 'Success',
      metadata: { countryName: newNode.countryName, currency: newNode.currency }
    });

    return newNode;
  }

  public updateCountryNodeStatus(id: string, status: CountryNodeStatus, performedBy: string): CountryNode | undefined {
    const idx = this.countryNodes.findIndex(cn => cn.countryNodeId === id);
    if (idx === -1) return undefined;

    const oldStatus = this.countryNodes[idx].status;
    this.countryNodes[idx] = {
      ...this.countryNodes[idx],
      status,
      updatedAt: new Date().toISOString()
    };

    auditLogger.logEvent({
      userId: performedBy,
      organisationId: 'GLOBAL',
      countryNodeId: id,
      role: 'Super Admin',
      action: 'country_node_status_change' as any,
      resourceType: 'CountryNode',
      resourceId: id,
      result: 'Success',
      metadata: { oldStatus, newStatus: status }
    });

    return this.countryNodes[idx];
  }

  public updateCountryNode(id: string, updates: Partial<CountryNode>, performedBy: string): CountryNode | undefined {
    const idx = this.countryNodes.findIndex(cn => cn.countryNodeId === id);
    if (idx === -1) return undefined;

    this.countryNodes[idx] = {
      ...this.countryNodes[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    auditLogger.logEvent({
      userId: performedBy,
      organisationId: 'GLOBAL',
      countryNodeId: id,
      role: 'Super Admin',
      action: 'country_node_update' as any,
      resourceType: 'CountryNode',
      resourceId: id,
      result: 'Success'
    });

    return this.countryNodes[idx];
  }
}

export const countryNodeService = new CountryNodeServiceStore();
