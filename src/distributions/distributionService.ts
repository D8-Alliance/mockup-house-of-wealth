import { DistributionRecord, InvestorPayoutAllocation } from './distributionTypes';
import { INITIAL_DISTRIBUTIONS } from '../data/mockPoolingWorkflowDataPart3';
import { poolService } from '../pooling/poolService';
import { auditLogger } from '../audit/auditLogger';
import { notificationService } from '../notifications/notificationService';

class DistributionService {
  private distributions: DistributionRecord[] = [...INITIAL_DISTRIBUTIONS];
  private payouts: InvestorPayoutAllocation[] = [
    {
      id: 'PAYOUT-001',
      distributionId: 'DIST-001',
      investmentId: 'INV-MYS-001',
      investorId: 'USR-HNWI-001',
      investorName: 'Tengku Ahmad Shah',
      investedCapital: 1000000,
      payoutProfitAmount: 85000,
      totalPayoutAmount: 85000,
      status: 'PAID'
    }
  ];

  public getDistributionsByPool(poolId: string): DistributionRecord[] {
    return this.distributions.filter(d => d.poolId === poolId);
  }

  public getPayoutsByInvestor(investorId: string): InvestorPayoutAllocation[] {
    return this.payouts.filter(p => p.investorId === investorId);
  }

  public createDistribution(
    poolId: string, 
    totalRealizedProfit: number, 
    periodName: string, 
    userId: string, 
    userRole: string
  ): DistributionRecord {
    const pool = poolService.getPoolById(poolId);
    if (!pool) throw new Error('Pool not found');

    const newDist: DistributionRecord = {
      id: `DIST-${Date.now().toString().slice(-4)}`,
      poolId,
      poolName: pool.poolName,
      projectId: pool.projectId,
      organisationId: pool.organisationId,
      countryNodeId: pool.countryNodeId,
      distributionPeriod: periodName,
      distributionDate: new Date().toISOString().split('T')[0],
      totalGrossProfit: totalRealizedProfit,
      mudaribSharePercent: 20,
      netInvestorProfitPool: totalRealizedProfit * 0.80,
      status: 'Completed',
      currency: pool.currency,
      disclaimer: 'Indicative expected yield is for reference. Realized return is based on actual project revenue under Mudarabah rules.'
    };

    this.distributions.unshift(newDist);

    auditLogger.logEvent({
      userId,
      organisationId: pool.organisationId,
      countryNodeId: pool.countryNodeId,
      role: userRole,
      action: 'distribution',
      resourceType: 'distribution',
      resourceId: newDist.id,
      result: 'Success',
      metadata: { poolId, totalRealizedProfit, periodName }
    });

    notificationService.notify(
      'Profit Distribution Executed',
      `Profit distribution of ${totalRealizedProfit.toLocaleString()} ${pool.currency} processed for "${pool.poolName}".`,
      'success',
      'distribution',
      newDist.id
    );

    return newDist;
  }

  public maturePoolAndExit(poolId: string, userId: string, userRole: string) {
    const pool = poolService.getPoolById(poolId);
    if (!pool) throw new Error('Pool not found');

    pool.status = 'CLOSED';

    auditLogger.logEvent({
      userId,
      organisationId: pool.organisationId,
      countryNodeId: pool.countryNodeId,
      role: userRole,
      action: 'pool_close',
      resourceType: 'pool',
      resourceId: poolId,
      result: 'Success',
      metadata: { poolName: pool.poolName, status: 'MATURED_AND_CLOSED' }
    });

    notificationService.notify(
      'Pool Matured & Principal Returned',
      `Wealth Pool "${pool.poolName}" has reached full maturity. Principal capital refunded to investors.`,
      'success',
      'pool',
      poolId
    );
  }
}

export const distributionService = new DistributionService();
