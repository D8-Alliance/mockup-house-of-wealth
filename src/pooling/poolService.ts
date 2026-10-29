import { WealthPool } from './poolTypes';
import { apiClient, BackendPool, PoolSignOffStep } from '../services/apiClient';
import { projectService } from '../projects/projectService';

/**
 * Wealth pools for the Wealth Pooling page, read from the server. A new pool is DRAFT until
 * Shariah, compliance, risk and an authorised executive sign off (then APPROVED), and an
 * approver opens it to investors. The list is cached after refresh() for synchronous lookups.
 */
function mapPool(raw: BackendPool): WealthPool {
  const project = projectService.getProjectById(raw.projectId);
  const targetAmount = raw.targetAmount ?? project?.fundingRequired ?? 0;
  const amountRaised = raw.raisedAmount ?? 0;
  return {
    poolId: raw.poolId,
    poolCode: raw.poolId.slice(-8).toUpperCase(),
    poolName: raw.poolName,
    projectId: raw.projectId,
    projectName: raw.projectName || project?.projectName || '',
    organisationId: raw.organisationId || project?.organisationId || '',
    organisationName: project?.organisationName || '',
    countryNodeId: raw.countryNodeId || project?.countryNodeId || '',
    poolType: 'SME / Trade',
    investmentStructure: raw.investmentStructure as WealthPool['investmentStructure'],
    targetAmount,
    minimumAmount: targetAmount,
    maximumAmount: targetAmount,
    amountRaised,
    // The server sets no per-investor limits; the most anyone can add is what is left to raise.
    minimumInvestment: 1,
    maximumInvestment: Math.max(1, targetAmount - amountRaised),
    currency: raw.currency,
    durationMonths: project?.projectDurationMonths ?? 0,
    indicativeExpectedReturn: Number(raw.indicativeExpectedReturn),
    riskLevel: 'Medium',
    openingDate: '',
    closingDate: '',
    status: raw.status as WealthPool['status'],
    investorCount: 0,
    feesDescription: project ? `Raises funding for ${project.projectName}.` : '',
    distributionFrequency: 'At Maturity',
    riskDisclosure: 'Indicative expected returns are not guaranteed.',
    approvals: {
      shariahApproval: !!raw.shariahApprovedAt,
      shariahApprovedBy: raw.shariahApprovedBy ?? undefined,
      shariahApprovedAt: raw.shariahApprovedAt ?? undefined,
      complianceApproval: !!raw.complianceApprovedAt,
      complianceApprovedBy: raw.complianceApprovedBy ?? undefined,
      complianceApprovedAt: raw.complianceApprovedAt ?? undefined,
      riskApproval: !!raw.riskApprovedAt,
      riskApprovedBy: raw.riskApprovedBy ?? undefined,
      riskApprovedAt: raw.riskApprovedAt ?? undefined,
      authorisedApproval: !!raw.authorisedApprovedAt,
      authorisedApprovedBy: raw.authorisedApprovedBy ?? undefined,
      authorisedApprovedAt: raw.authorisedApprovedAt ?? undefined,
    },
    createdAt: raw.createdAt || '',
    updatedAt: raw.createdAt || '',
  };
}

class PoolService {
  private pools: WealthPool[] = [];

  /** Call after projectService.refresh(), so pools can show their project's organisation and tenure. */
  public async refresh(): Promise<void> {
    this.pools = (await apiClient.getPools()).map(pool => mapPool(pool));
  }

  public getAllPools(): WealthPool[] {
    return [...this.pools];
  }

  public getPoolById(id: string): WealthPool | undefined {
    return this.pools.find(p => p.poolId === id);
  }

  public getPoolsByProject(projectId: string): WealthPool[] {
    return this.pools.filter(p => p.projectId === projectId);
  }

  private upsert(pool: WealthPool): void {
    const idx = this.pools.findIndex(p => p.poolId === pool.poolId);
    if (idx >= 0) this.pools[idx] = pool;
    else this.pools.unshift(pool);
  }

  /** Single-pool responses carry no amounts, so they are kept from the cached row. */
  private async replaceFrom(raw: BackendPool): Promise<WealthPool> {
    const cached = this.getPoolById(raw.poolId);
    const pool = mapPool({ ...raw, targetAmount: cached?.targetAmount, raisedAmount: cached?.amountRaised });
    this.upsert(pool);
    return pool;
  }

  /** Pause, reopen, mark full or close an opened pool; the note goes to the audit trail. */
  public async setStatus(poolId: string, status: 'OPEN' | 'PAUSED' | 'FULL' | 'CLOSED', note?: string): Promise<WealthPool> {
    return this.replaceFrom(await apiClient.setPoolStatus(poolId, status, note));
  }

  public async approvePoolStep(poolId: string, step: PoolSignOffStep, _userId: string, _userRole: string): Promise<WealthPool> {
    return this.replaceFrom(await apiClient.signOffPool(poolId, step));
  }

  public async openPool(poolId: string, _userId: string, _userRole: string): Promise<WealthPool> {
    return this.replaceFrom(await apiClient.openPool(poolId));
  }
}

export const poolService = new PoolService();
