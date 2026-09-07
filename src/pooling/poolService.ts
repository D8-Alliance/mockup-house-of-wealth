import { WealthPool } from './poolTypes';
import { INITIAL_WEALTH_POOLS } from '../data/mockPoolingWorkflowDataPart3';
import { auditLogger } from '../audit/auditLogger';
import { notificationService } from '../notifications/notificationService';
import { generateNumericId } from '../utils/id';

class PoolService {
  private pools: WealthPool[] = [...INITIAL_WEALTH_POOLS];

  public getAllPools(): WealthPool[] {
    return [...this.pools];
  }

  public getPoolById(id: string): WealthPool | undefined {
    return this.pools.find(p => p.poolId === id);
  }

  public getPoolsByProject(projectId: string): WealthPool[] {
    return this.pools.filter(p => p.projectId === projectId);
  }

  public createPool(poolData: Partial<WealthPool>, userId: string, userRole: string): WealthPool {
    const newId = `POOL-${poolData.countryNodeId || 'MYS'}-${generateNumericId('P', 4)}`;
    const newCode = `POOL-${(poolData.poolName || 'SUKUK').toUpperCase().slice(0, 8)}-${Math.floor(100 + Math.random() * 900)}`;

    const newPool: WealthPool = {
      poolId: newId,
      poolCode: newCode,
      poolName: poolData.poolName || 'New Wealth Sukuk Pool',
      projectId: poolData.projectId || 'PROJ-MYS-001',
      projectName: poolData.projectName || 'FELDA Agri Expansion',
      organisationId: poolData.organisationId || 'ORG-FELDA-MYS',
      organisationName: poolData.organisationName || 'FELDA Holdings Berhad',
      countryNodeId: poolData.countryNodeId || 'CN-MYS',
      poolType: poolData.poolType || 'Agriculture',
      investmentStructure: poolData.investmentStructure || 'Mudarabah',
      targetAmount: poolData.targetAmount || 8000000,
      minimumAmount: poolData.minimumAmount || 5000000,
      maximumAmount: poolData.maximumAmount || 10000000,
      amountRaised: 0,
      minimumInvestment: poolData.minimumInvestment || 10000,
      maximumInvestment: poolData.maximumInvestment || 1000000,
      currency: poolData.currency || 'USD',
      durationMonths: poolData.durationMonths || 60,
      indicativeExpectedReturn: poolData.indicativeExpectedReturn || 8.5,
      riskLevel: poolData.riskLevel || 'Medium',
      openingDate: poolData.openingDate || new Date().toISOString().split('T')[0],
      closingDate: poolData.closingDate || '2026-12-31',
      status: 'DRAFT',
      investorCount: 0,
      feesDescription: poolData.feesDescription || '1.5% p.a. Mudarib management fee.',
      distributionFrequency: poolData.distributionFrequency || 'Quarterly',
      riskDisclosure: poolData.riskDisclosure || 'Indicative expected returns are for demonstration only and do not constitute a guaranteed return.',
      approvals: {
        shariahApproval: false,
        complianceApproval: false,
        riskApproval: false,
        authorisedApproval: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.pools.unshift(newPool);

    auditLogger.logEvent({
      userId,
      organisationId: newPool.organisationId,
      countryNodeId: newPool.countryNodeId,
      role: userRole,
      action: 'pool_create',
      resourceType: 'pool',
      resourceId: newId,
      result: 'Success',
      metadata: { poolName: newPool.poolName, targetAmount: newPool.targetAmount }
    });

    notificationService.notify(
      'Wealth Pool Structured',
      `Wealth Pool "${newPool.poolName}" created in DRAFT status.`,
      'info',
      'pool',
      newId
    );

    return newPool;
  }

  public approvePoolStep(
    poolId: string, 
    step: 'shariah' | 'compliance' | 'risk' | 'authorised', 
    userId: string, 
    userRole: string
  ): WealthPool {
    const pool = this.getPoolById(poolId);
    if (!pool) throw new Error('Pool not found');

    const now = new Date().toISOString();
    if (step === 'shariah') {
      pool.approvals.shariahApproval = true;
      pool.approvals.shariahApprovedBy = userRole;
      pool.approvals.shariahApprovedAt = now;
    } else if (step === 'compliance') {
      pool.approvals.complianceApproval = true;
      pool.approvals.complianceApprovedBy = userRole;
      pool.approvals.complianceApprovedAt = now;
    } else if (step === 'risk') {
      pool.approvals.riskApproval = true;
      pool.approvals.riskApprovedBy = userRole;
      pool.approvals.riskApprovedAt = now;
    } else if (step === 'authorised') {
      pool.approvals.authorisedApproval = true;
      pool.approvals.authorisedApprovedBy = userRole;
      pool.approvals.authorisedApprovedAt = now;
    }

    const allApproved = 
      pool.approvals.shariahApproval &&
      pool.approvals.complianceApproval &&
      pool.approvals.riskApproval &&
      pool.approvals.authorisedApproval;

    if (allApproved) {
      pool.status = 'APPROVED';

      auditLogger.logEvent({
        userId,
        organisationId: pool.organisationId,
        countryNodeId: pool.countryNodeId,
        role: userRole,
        action: 'pool_approve',
        resourceType: 'pool',
        resourceId: poolId,
        result: 'Success',
        metadata: { poolName: pool.poolName }
      });

      notificationService.notify(
        'Pool Fully Approved',
        `Pool "${pool.poolName}" has received all 4 governance sign-offs and is APPROVED for opening.`,
        'success',
        'pool',
        poolId
      );
    }

    pool.updatedAt = now;
    return pool;
  }

  public openPool(poolId: string, userId: string, userRole: string): WealthPool {
    const pool = this.getPoolById(poolId);
    if (!pool) throw new Error('Pool not found');

    const allApproved = 
      pool.approvals.shariahApproval &&
      pool.approvals.complianceApproval &&
      pool.approvals.riskApproval &&
      pool.approvals.authorisedApproval;

    if (!allApproved || pool.status !== 'APPROVED') {
      throw new Error('Approval Dependency Error: Pool cannot be OPENED until Shariah, Compliance, Risk, and Executive approvals are completed.');
    }

    if (userRole === 'Investor') {
      throw new Error('Segregation of Duties Violation: Investors cannot open or approve wealth pools.');
    }

    pool.status = 'OPEN';
    pool.updatedAt = new Date().toISOString();

    auditLogger.logEvent({
      userId,
      organisationId: pool.organisationId,
      countryNodeId: pool.countryNodeId,
      role: userRole,
      action: 'pool_open',
      resourceType: 'pool',
      resourceId: poolId,
      result: 'Success',
      metadata: { poolName: pool.poolName }
    });

    notificationService.notify(
      'Wealth Pool Opened for Subscriptions',
      `Wealth Pool "${pool.poolName}" is now OPEN on the Marketplace for eligible investors.`,
      'success',
      'pool',
      poolId
    );

    return pool;
  }
}

export const poolService = new PoolService();
