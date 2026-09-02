import { 
  PDPApplication, 
  PDPApplicationStatus, 
  KYBVerificationStatus,
  PDPDocument, 
  PDPCountryConfig,
  PDPStatusHistoryEntry
} from './pdpTypes';
import { INITIAL_PDP_APPLICATIONS } from './mockPDPApplications';
import { INITIAL_PDP_COUNTRY_CONFIGS } from './pdpCountryConfig';
import { UserRole } from '../rbac/types';

class PDPService {
  private applications: PDPApplication[] = [...INITIAL_PDP_APPLICATIONS];
  private countryConfigs: Record<string, PDPCountryConfig> = { ...INITIAL_PDP_COUNTRY_CONFIGS };
  private listeners: (() => void)[] = [];

  // Subscription
  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  // Application Queries
  getAllApplications(): PDPApplication[] {
    return [...this.applications];
  }

  getApplicationById(id: string): PDPApplication | undefined {
    return this.applications.find(app => app.id === id || app.applicationNumber === id);
  }

  getApplicationByUserId(userId: string): PDPApplication | undefined {
    return this.applications.find(app => app.userId === userId);
  }

  getApplicationsByCountry(countryCode: string): PDPApplication[] {
    return this.applications.filter(app => app.countryCode === countryCode);
  }

  getApplicationsByStatus(status: PDPApplicationStatus): PDPApplication[] {
    return this.applications.filter(app => app.status === status);
  }

  // Application Creation & Drafting
  createOrSaveDraft(data: Partial<PDPApplication>, userId: string, userRole: UserRole): PDPApplication {
    const existingIndex = this.applications.findIndex(a => a.id === data.id || a.userId === userId);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

    if (existingIndex >= 0) {
      const existing = this.applications[existingIndex];
      const updated: PDPApplication = {
        ...existing,
        ...data,
        updatedAt: now
      };
      this.applications[existingIndex] = updated;
      this.notify();
      return updated;
    } else {
      const newId = `PDP-APP-${Math.floor(1000 + Math.random() * 9000)}`;
      const appNum = `PDP-APP-2026-${String(this.applications.length + 1).padStart(3, '0')}`;
      
      const newApp: PDPApplication = {
        id: newId,
        applicationNumber: appNum,
        userId: userId || `USR-${Math.floor(1000 + Math.random() * 9000)}`,
        userEmail: data.userEmail || '',
        userMobile: data.userMobile || '',
        countryCode: data.countryCode || 'MYS',
        countryName: data.countryName || 'Malaysia',
        preferredLanguage: data.preferredLanguage || 'English',
        pdpType: data.pdpType || 'Company',
        organisationName: data.organisationName || '',
        tradingName: data.tradingName || '',
        registrationNumber: data.registrationNumber || '',
        countryOfRegistration: data.countryOfRegistration || data.countryName || 'Malaysia',
        registeredAddress: data.registeredAddress || '',
        businessAddress: data.businessAddress || '',
        contactPhone: data.contactPhone || '',
        website: data.website || '',
        businessCategory: data.businessCategory || 'Infrastructure & Real Estate',
        dateOfIncorporation: data.dateOfIncorporation || '2020-01-01',
        taxIdentificationNumber: data.taxIdentificationNumber || '',
        representative: data.representative || {
          id: 'REP-NEW',
          fullName: '',
          nationality: '',
          idPassportNumber: '',
          position: '',
          email: '',
          mobile: ''
        },
        beneficialOwners: data.beneficialOwners || [],
        kybStatus: 'IN_PROGRESS',
        documents: data.documents || [],
        bankInfo: data.bankInfo || {
          bankName: '',
          accountHolderName: '',
          accountNumber: '',
          swiftBicCode: '',
          currency: 'MYR',
          country: 'Malaysia',
          settlementMethod: 'Corporate FPX'
        },
        compliance: data.compliance || {
          amlCftDeclaration: false,
          sourceOfFundsDeclaration: false,
          beneficialOwnershipAccurate: false,
          sanctionsNonMatchDeclared: false,
          regulatoryComplianceAgreed: false,
          shariahComplianceAttested: false,
          termsAndConditionsAccepted: false,
          privacyConsentGranted: false
        },
        status: 'DRAFT',
        statusHistory: [
          {
            id: `HIST-${Date.now()}`,
            timestamp: now,
            previousStatus: 'DRAFT',
            newStatus: 'DRAFT',
            changedByUserId: userId,
            changedByRole: userRole,
            reason: 'Draft PDP Registration created'
          }
        ],
        activePoolsCount: 0,
        totalRaisedMYR: 0,
        totalDistributedMYR: 0,
        pendingSettlementMYR: 0,
        createdAt: now,
        updatedAt: now
      };

      this.applications.unshift(newApp);
      this.notify();
      return newApp;
    }
  }

  // Application Submission
  submitApplication(appId: string, userId: string, userRole: UserRole): PDPApplication | null {
    const app = this.applications.find(a => a.id === appId);
    if (!app) return null;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const prevStatus = app.status;

    app.status = 'SUBMITTED';
    app.kybStatus = 'SUBMITTED';
    app.submittedAt = now;
    app.updatedAt = now;

    const historyEntry: PDPStatusHistoryEntry = {
      id: `HIST-${Date.now()}`,
      timestamp: now,
      previousStatus: prevStatus,
      newStatus: 'SUBMITTED',
      changedByUserId: userId,
      changedByRole: userRole,
      reason: 'Application submitted for official compliance and KYB review'
    };

    app.statusHistory.push(historyEntry);
    this.notify();
    return app;
  }

  // Admin & Compliance Decision Workflows
  startReview(appId: string, reviewerId: string, reviewerRole: UserRole): PDPApplication | null {
    const app = this.applications.find(a => a.id === appId);
    if (!app) return null;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const prevStatus = app.status;

    app.status = 'UNDER_REVIEW';
    app.kybStatus = 'UNDER_REVIEW';
    app.updatedAt = now;

    app.statusHistory.push({
      id: `HIST-${Date.now()}`,
      timestamp: now,
      previousStatus: prevStatus,
      newStatus: 'UNDER_REVIEW',
      changedByUserId: reviewerId,
      changedByRole: reviewerRole,
      reason: 'Compliance officer commenced review of KYB documents and sanctions screening'
    });

    this.notify();
    return app;
  }

  approveApplication(appId: string, reviewerId: string, reviewerRole: UserRole, comments: string): PDPApplication | null {
    const app = this.applications.find(a => a.id === appId);
    if (!app) return null;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const prevStatus = app.status;

    app.status = 'ACTIVE';
    app.kybStatus = 'VERIFIED';
    app.reviewerComments = comments;
    app.approvedAt = now;
    app.activatedAt = now;
    app.updatedAt = now;

    // Mark all documents verified
    app.documents = app.documents.map(d => ({ ...d, status: 'VERIFIED' }));

    app.statusHistory.push({
      id: `HIST-${Date.now()}`,
      timestamp: now,
      previousStatus: prevStatus,
      newStatus: 'ACTIVE',
      changedByUserId: reviewerId,
      changedByRole: reviewerRole,
      reason: 'PDP application fully verified and approved for pool creation',
      comment: comments
    });

    this.notify();
    return app;
  }

  rejectApplication(appId: string, reviewerId: string, reviewerRole: UserRole, rejectionReason: string): PDPApplication | null {
    const app = this.applications.find(a => a.id === appId);
    if (!app) return null;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const prevStatus = app.status;

    app.status = 'REJECTED';
    app.kybStatus = 'REJECTED';
    app.rejectionReason = rejectionReason;
    app.updatedAt = now;

    app.statusHistory.push({
      id: `HIST-${Date.now()}`,
      timestamp: now,
      previousStatus: prevStatus,
      newStatus: 'REJECTED',
      changedByUserId: reviewerId,
      changedByRole: reviewerRole,
      reason: 'Application rejected during compliance review',
      comment: rejectionReason
    });

    this.notify();
    return app;
  }

  requestAdditionalInfo(
    appId: string, 
    reviewerId: string, 
    reviewerRole: UserRole, 
    requestNote: string,
    flaggedDocIds: string[] = []
  ): PDPApplication | null {
    const app = this.applications.find(a => a.id === appId);
    if (!app) return null;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const prevStatus = app.status;

    app.status = 'ADDITIONAL_INFORMATION_REQUIRED';
    app.kybStatus = 'CORRECTION_REQUIRED';
    app.additionalInfoRequestNote = requestNote;
    app.updatedAt = now;

    if (flaggedDocIds.length > 0) {
      app.documents = app.documents.map(d => {
        if (flaggedDocIds.includes(d.id)) {
          return {
            ...d,
            status: 'CORRECTION_REQUESTED',
            rejectionReason: requestNote
          };
        }
        return d;
      });
    }

    app.statusHistory.push({
      id: `HIST-${Date.now()}`,
      timestamp: now,
      previousStatus: prevStatus,
      newStatus: 'ADDITIONAL_INFORMATION_REQUIRED',
      changedByUserId: reviewerId,
      changedByRole: reviewerRole,
      reason: 'Additional documents / clarifications requested by reviewer',
      comment: requestNote
    });

    this.notify();
    return app;
  }

  suspendPDP(appId: string, adminId: string, adminRole: UserRole, reason: string): PDPApplication | null {
    const app = this.applications.find(a => a.id === appId);
    if (!app) return null;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const prevStatus = app.status;

    app.status = 'SUSPENDED';
    app.updatedAt = now;

    app.statusHistory.push({
      id: `HIST-${Date.now()}`,
      timestamp: now,
      previousStatus: prevStatus,
      newStatus: 'SUSPENDED',
      changedByUserId: adminId,
      changedByRole: adminRole,
      reason: 'PDP account temporarily suspended',
      comment: reason
    });

    this.notify();
    return app;
  }

  reactivatePDP(appId: string, adminId: string, adminRole: UserRole, reason: string): PDPApplication | null {
    const app = this.applications.find(a => a.id === appId);
    if (!app) return null;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const prevStatus = app.status;

    app.status = 'ACTIVE';
    app.updatedAt = now;

    app.statusHistory.push({
      id: `HIST-${Date.now()}`,
      timestamp: now,
      previousStatus: prevStatus,
      newStatus: 'ACTIVE',
      changedByUserId: adminId,
      changedByRole: adminRole,
      reason: 'PDP account reinstated to ACTIVE',
      comment: reason
    });

    this.notify();
    return app;
  }

  // Document Management
  updateDocumentStatus(
    appId: string, 
    docId: string, 
    status: PDPDocument['status'], 
    reason?: string
  ): PDPApplication | null {
    const app = this.applications.find(a => a.id === appId);
    if (!app) return null;

    app.documents = app.documents.map(d => d.id === docId ? { ...d, status, rejectionReason: reason } : d);
    app.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    this.notify();
    return app;
  }

  uploadDocument(appId: string, newDoc: PDPDocument): PDPApplication | null {
    const app = this.applications.find(a => a.id === appId);
    if (!app) return null;

    const existingDocIdx = app.documents.findIndex(d => d.documentType === newDoc.documentType || d.id === newDoc.id);
    if (existingDocIdx >= 0) {
      app.documents[existingDocIdx] = newDoc;
    } else {
      app.documents.push(newDoc);
    }
    app.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    this.notify();
    return app;
  }

  // Country Configuration Management
  getAllCountryConfigs(): PDPCountryConfig[] {
    return Object.values(this.countryConfigs);
  }

  getCountryConfig(countryCode: string): PDPCountryConfig | undefined {
    return this.countryConfigs[countryCode];
  }

  updateCountryConfig(countryCode: string, updated: Partial<PDPCountryConfig>): PDPCountryConfig | null {
    if (!this.countryConfigs[countryCode]) return null;
    this.countryConfigs[countryCode] = {
      ...this.countryConfigs[countryCode],
      ...updated
    };
    this.notify();
    return this.countryConfigs[countryCode];
  }
}

export const pdpService = new PDPService();
