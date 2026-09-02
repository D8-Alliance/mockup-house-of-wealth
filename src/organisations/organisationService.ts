import { Organisation, OrganisationStatus, OrganisationVerificationStatus, OrganisationOnboardingPayload } from './organisationTypes';
import { INITIAL_ORGANISATIONS } from './mockOrganisations';
import { auditLogger } from '../audit/auditLogger';

class OrganisationServiceStore {
  private organisations: Organisation[] = [...INITIAL_ORGANISATIONS];

  public getAllOrganisations(): Organisation[] {
    return [...this.organisations];
  }

  public getOrganisationById(id: string): Organisation | undefined {
    return this.organisations.find(o => o.organisationId === id || (o as any).id === id);
  }

  public getOrganisationsByCountryNode(countryNodeId: string): Organisation[] {
    return this.organisations.filter(o => o.countryNodeId === countryNodeId);
  }

  public createOrganisation(payload: OrganisationOnboardingPayload, performedBy: string): Organisation {
    const orgId = `ORG-${payload.countryNodeId.replace('CN-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrg: Organisation = {
      organisationId: orgId,
      legalName: payload.legalName,
      displayName: payload.displayName || payload.legalName,
      registrationNumber: payload.registrationNumber,
      organisationType: payload.organisationType,
      countryNodeId: payload.countryNodeId,
      address: payload.address,
      contactEmail: payload.contactEmail,
      contactPhone: payload.contactPhone,
      website: payload.website,
      logoUrl: payload.logoUrl || 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=200&q=80',
      industry: payload.industry,
      description: payload.description,
      status: 'PENDING',
      verificationStatus: 'UNDER_REVIEW',
      activeUsersCount: 1,
      activeProjectsCount: 0,
      activeAssetsCount: 0,
      activePoolsCount: 0,
      documents: payload.documents.map((doc, idx) => ({
        ...doc,
        id: `DOC-${idx + 1}`,
        submittedAt: new Date().toISOString(),
        status: 'Pending Review'
      })),
      reviewComments: [
        {
          id: `REV-${Date.now()}`,
          reviewerId: performedBy,
          reviewerName: 'System Registrar',
          timestamp: new Date().toISOString(),
          comment: `Submitted registration for ${payload.legalName}. Pending KYB verification.`,
          actionTaken: 'Submitted'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: performedBy,
      updatedBy: performedBy
    };

    this.organisations.unshift(newOrg);

    auditLogger.logEvent({
      userId: performedBy,
      organisationId: orgId,
      countryNodeId: payload.countryNodeId,
      role: 'Organization Admin',
      action: 'organisation_create' as any,
      resourceType: 'Organisation',
      resourceId: orgId,
      result: 'Success',
      metadata: { legalName: payload.legalName, type: payload.organisationType }
    });

    return newOrg;
  }

  public updateOrganisationStatus(id: string, status: OrganisationStatus, performedBy: string, comment?: string): Organisation | undefined {
    const idx = this.organisations.findIndex(o => o.organisationId === id || (o as any).id === id);
    if (idx === -1) return undefined;

    const oldStatus = this.organisations[idx].status;
    this.organisations[idx] = {
      ...this.organisations[idx],
      status,
      updatedAt: new Date().toISOString(),
      updatedBy: performedBy
    };

    if (comment) {
      this.organisations[idx].reviewComments.unshift({
        id: `REV-${Date.now()}`,
        reviewerId: performedBy,
        reviewerName: 'Reviewer',
        timestamp: new Date().toISOString(),
        comment,
        actionTaken: status === 'ACTIVE' ? 'Approved' : 'Rejected'
      });
    }

    auditLogger.logEvent({
      userId: performedBy,
      organisationId: id,
      countryNodeId: this.organisations[idx].countryNodeId,
      role: 'Country Admin',
      action: 'organisation_update' as any,
      resourceType: 'Organisation',
      resourceId: id,
      result: 'Success',
      metadata: { oldStatus, newStatus: status, comment }
    });

    return this.organisations[idx];
  }

  public updateVerificationStatus(id: string, verificationStatus: OrganisationVerificationStatus, performedBy: string, comment: string): Organisation | undefined {
    const idx = this.organisations.findIndex(o => o.organisationId === id || (o as any).id === id);
    if (idx === -1) return undefined;

    const newStatus: OrganisationStatus = verificationStatus === 'VERIFIED' ? 'ACTIVE' : verificationStatus === 'REJECTED' ? 'REJECTED' : 'PENDING';

    this.organisations[idx] = {
      ...this.organisations[idx],
      verificationStatus,
      status: newStatus,
      updatedAt: new Date().toISOString(),
      updatedBy: performedBy
    };

    this.organisations[idx].reviewComments.unshift({
      id: `REV-${Date.now()}`,
      reviewerId: performedBy,
      reviewerName: 'Compliance Reviewer',
      timestamp: new Date().toISOString(),
      comment,
      actionTaken: verificationStatus === 'VERIFIED' ? 'Approved' : verificationStatus === 'REJECTED' ? 'Rejected' : 'Requested Info'
    });

    auditLogger.logEvent({
      userId: performedBy,
      organisationId: id,
      countryNodeId: this.organisations[idx].countryNodeId,
      role: 'Compliance Officer',
      action: verificationStatus === 'VERIFIED' ? 'organisation_approve' as any : 'organisation_reject' as any,
      resourceType: 'Organisation',
      resourceId: id,
      result: 'Success',
      metadata: { verificationStatus, comment }
    });

    return this.organisations[idx];
  }
}

export const organisationService = new OrganisationServiceStore();
