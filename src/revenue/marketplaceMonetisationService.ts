import {
  PromotionPackage,
  PromotionCampaign,
  PromotedProfessionalService,
  SponsoredMarketplaceBanner,
  PromotionAnalyticsSummary,
  PromotionBadgeType
} from './marketplaceMonetisationTypes';
import {
  INITIAL_PROMOTION_PACKAGES,
  INITIAL_PROMOTION_CAMPAIGNS,
  INITIAL_PROMOTED_SERVICES,
  INITIAL_SPONSORED_MARKETPLACE_BANNER
} from './marketplaceMonetisationConfig';

class MarketplaceMonetisationService {
  private packages: PromotionPackage[] = [...INITIAL_PROMOTION_PACKAGES];
  private campaigns: PromotionCampaign[] = [...INITIAL_PROMOTION_CAMPAIGNS];
  private services: PromotedProfessionalService[] = [...INITIAL_PROMOTED_SERVICES];
  private marketplaceBanner: SponsoredMarketplaceBanner = { ...INITIAL_SPONSORED_MARKETPLACE_BANNER };
  private listeners: Set<() => void> = new Set();

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  // --- Package Management (Configurable Pricing) ---
  public getPackages(): PromotionPackage[] {
    return this.packages;
  }

  public getActivePackages(): PromotionPackage[] {
    return this.packages.filter(p => p.isActive);
  }

  public updatePackagePricing(
    packageId: string, 
    priceMYR: number, 
    priceUSD: number, 
    durationDays?: number,
    creditsCost?: number
  ): boolean {
    const pkg = this.packages.find(p => p.id === packageId);
    if (!pkg) return false;
    pkg.priceMYR = priceMYR;
    pkg.priceUSD = priceUSD;
    if (durationDays !== undefined) pkg.durationDays = durationDays;
    if (creditsCost !== undefined) pkg.creditsCost = creditsCost;
    this.notify();
    return true;
  }

  public togglePackageStatus(packageId: string): boolean {
    const pkg = this.packages.find(p => p.id === packageId);
    if (!pkg) return false;
    pkg.isActive = !pkg.isActive;
    this.notify();
    return true;
  }

  // --- Campaigns & PDP Status ---
  public getCampaigns(): PromotionCampaign[] {
    return this.campaigns;
  }

  public getCampaignByTarget(targetId: string): PromotionCampaign | undefined {
    return this.campaigns.find(c => c.targetId === targetId && (c.status === 'ACTIVE' || c.status === 'SCHEDULED'));
  }

  public getPDPPromotionDetails(projectId: string, projectTitle: string, orgName: string) {
    const activeCampaign = this.campaigns.find(
      c => c.targetId === projectId && (c.status === 'ACTIVE' || c.status === 'SCHEDULED')
    );

    if (activeCampaign) {
      return {
        hasPromotion: true,
        promotionStatus: `${activeCampaign.badgeType} (${activeCampaign.status})`,
        badgeType: activeCampaign.badgeType,
        packageName: activeCampaign.packageName,
        startDate: activeCampaign.startDate,
        endDate: activeCampaign.endDate,
        views: activeCampaign.metrics.views,
        clicks: activeCampaign.metrics.clicks,
        leads: activeCampaign.metrics.leads,
        promotionCost: activeCampaign.promotionCostMYR,
        currency: 'MYR',
        campaignId: activeCampaign.id,
        ctr: activeCampaign.metrics.ctr,
        conversionRate: activeCampaign.metrics.conversionRate
      };
    }

    // Default Organic (Free Listing)
    return {
      hasPromotion: false,
      promotionStatus: 'Organic (Free Listing)',
      badgeType: null as PromotionBadgeType | null,
      packageName: 'Free Project Listing',
      startDate: '2026-08-01',
      endDate: 'Continuous',
      views: 380,
      clicks: 34,
      leads: 3,
      promotionCost: 0,
      currency: 'MYR',
      campaignId: null as string | null,
      ctr: 8.94,
      conversionRate: 8.82
    };
  }

  public promoteProject(
    projectId: string,
    projectTitle: string,
    orgName: string,
    packageId: string,
    startDate: string = new Date().toISOString().slice(0, 10),
    paymentMethod: string = 'D-8 Wealth Wallet',
    paidByUserId: string = 'USR-8821'
  ): PromotionCampaign | null {
    const pkg = this.packages.find(p => p.id === packageId);
    if (!pkg) return null;

    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + (pkg.durationDays || 30));
    const endDate = end.toISOString().slice(0, 10);

    // Expire any existing active campaign for this project
    this.campaigns.forEach(c => {
      if (c.targetId === projectId && c.status === 'ACTIVE') {
        c.status = 'EXPIRED';
      }
    });

    const newCampaign: PromotionCampaign = {
      id: `CMP-${Date.now().toString().slice(-6)}`,
      targetId: projectId,
      targetType: 'PROJECT',
      targetTitle: projectTitle,
      targetOrg: orgName,
      packageId: pkg.id,
      packageName: pkg.title,
      badgeType: pkg.badgeType,
      status: 'ACTIVE',
      startDate,
      endDate,
      promotionCostMYR: pkg.priceMYR,
      promotionCostUSD: pkg.priceUSD,
      paymentMethod,
      paidByUserId,
      createdAt: new Date().toISOString().slice(0, 10),
      metrics: {
        views: 120,
        clicks: 16,
        ctr: 13.33,
        leads: 2,
        conversionRate: 12.5,
        estimatedCommitmentMYR: 50000
      }
    };

    this.campaigns = [newCampaign, ...this.campaigns];
    this.notify();
    return newCampaign;
  }

  public updateCampaignDatesAndStatus(
    campaignId: string,
    status: PromotionCampaign['status'],
    startDate: string,
    endDate: string
  ): boolean {
    const c = this.campaigns.find(item => item.id === campaignId);
    if (!c) return false;
    c.status = status;
    c.startDate = startDate;
    c.endDate = endDate;
    this.notify();
    return true;
  }

  // --- Professional Services ---
  public getPromotedServices(): PromotedProfessionalService[] {
    return this.services;
  }

  public promoteProfessionalService(options: {
    companyName: string;
    category: PromotedProfessionalService['category'];
    headline: string;
    description: string;
    location: string;
    verifiedCredentials: string[];
    contactEmail: string;
    paidByUserId?: string;
  }): PromotedProfessionalService {
    const pkg = this.packages.find(p => p.id === 'pkg_service_promo_30d') || this.packages[4];
    const newService: PromotedProfessionalService = {
      id: `SRV-${Date.now().toString().slice(-5)}`,
      companyName: options.companyName,
      category: options.category,
      badgeType: pkg.badgeType,
      headline: options.headline,
      description: options.description,
      location: options.location,
      verifiedCredentials: options.verifiedCredentials.length ? options.verifiedCredentials : ['Accredited Shariah Practice', 'Verified Member'],
      rating: 5.0,
      reviewCount: 1,
      activeCampaignId: `CMP-${Date.now().toString().slice(-6)}`,
      contactEmail: options.contactEmail,
      views: 12,
      inquiries: 1
    };
    this.services = [newService, ...this.services];
    this.notify();
    return newService;
  }

  public addPromotedService(
    companyName: string,
    category: PromotedProfessionalService['category'],
    headline: string,
    description: string,
    location: string,
    contactEmail: string,
    packageId: string
  ): PromotedProfessionalService {
    return this.promoteProfessionalService({
      companyName,
      category,
      headline,
      description,
      location,
      verifiedCredentials: ['Accredited Shariah Practice', 'Verified Member'],
      contactEmail
    });
  }

  public recordLead(campaignId: string, commitmentEstimateMYR: number = 0) {
    const c = this.campaigns.find(item => item.id === campaignId);
    if (c) {
      c.metrics.leads += 1;
      c.metrics.estimatedCommitmentMYR += commitmentEstimateMYR;
      c.metrics.conversionRate = Number(((c.metrics.leads / Math.max(1, c.metrics.clicks)) * 100).toFixed(2));
      this.notify();
    }
  }

  // --- Sponsored Marketplace Banner ---
  public getSponsoredMarketplaceBanner(): SponsoredMarketplaceBanner {
    return this.marketplaceBanner;
  }

  public updateSponsoredMarketplaceBanner(banner: Partial<SponsoredMarketplaceBanner>) {
    this.marketplaceBanner = { ...this.marketplaceBanner, ...banner };
    this.notify();
  }

  // --- Promotion Analytics & History ---
  public getAnalyticsSummary(): PromotionAnalyticsSummary {
    const activeCampaigns = this.campaigns.filter(c => c.status === 'ACTIVE');
    const totalViews = this.campaigns.reduce((acc, c) => acc + c.metrics.views, 0);
    const totalClicks = this.campaigns.reduce((acc, c) => acc + c.metrics.clicks, 0);
    const totalLeads = this.campaigns.reduce((acc, c) => acc + c.metrics.leads, 0);
    const totalRevenueMYR = this.campaigns.reduce((acc, c) => acc + c.promotionCostMYR, 0);
    const avgCTR = totalViews > 0 ? Number(((totalClicks / totalViews) * 100).toFixed(2)) : 0;

    const dailyTrend = [
      { date: 'Aug 07', views: 2400, clicks: 280, leads: 24 },
      { date: 'Aug 08', views: 2950, clicks: 350, leads: 31 },
      { date: 'Aug 09', views: 3200, clicks: 390, leads: 36 },
      { date: 'Aug 10', views: 3800, clicks: 460, leads: 42 },
      { date: 'Aug 11', views: 4200, clicks: 510, leads: 48 },
      { date: 'Aug 12', views: 4650, clicks: 580, leads: 54 },
      { date: 'Aug 13', views: 5100, clicks: 640, leads: 61 }
    ];

    const categoryBreakdown = [
      { category: 'Featured Projects (7D & 30D)', count: 3, spendMYR: 497 },
      { category: 'Sponsored Project Spotlights', count: 1, spendMYR: 499 },
      { category: 'Professional Service Promotions', count: 1, spendMYR: 199 },
      { category: 'Sponsored Marketplace Takeovers', count: 1, spendMYR: 999 }
    ];

    return {
      totalActiveCampaigns: activeCampaigns.length,
      totalViews,
      totalClicks,
      totalLeads,
      avgCTR,
      totalRevenueMYR,
      dailyImpressionTrend: dailyTrend,
      categoryBreakdown
    };
  }
}

export const marketplaceMonetisationService = new MarketplaceMonetisationService();
