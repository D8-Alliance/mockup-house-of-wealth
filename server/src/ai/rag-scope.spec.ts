import { assertRagTransition, canManageRagScope, ragManagementWhere, ragScopeKey, ragVisibilityWhere } from './rag-scope';

describe('rag-scope', () => {
  describe('canManageRagScope', () => {
    it('limits GLOBAL (all D-8 countries) to Super Admin and AI Administrator', () => {
      expect(canManageRagScope({ role: 'Super Admin', countryNodeId: 'CN-MYS' }, 'GLOBAL', 'CN-MYS')).toBe(true);
      expect(canManageRagScope({ role: 'AI Administrator', countryNodeId: 'CN-TUR' }, 'GLOBAL', 'CN-TUR')).toBe(true);
      expect(canManageRagScope({ role: 'Country Admin', countryNodeId: 'CN-MYS' }, 'GLOBAL', 'CN-MYS')).toBe(false);
    });

    it('keeps Country Admins and AI Administrators inside their own country for COUNTRY and PROJECT', () => {
      expect(canManageRagScope({ role: 'Country Admin', countryNodeId: 'CN-MYS' }, 'COUNTRY', 'CN-MYS')).toBe(true);
      expect(canManageRagScope({ role: 'Country Admin', countryNodeId: 'CN-MYS' }, 'COUNTRY', 'CN-IDN')).toBe(false);
      expect(canManageRagScope({ role: 'AI Administrator', countryNodeId: 'CN-MYS' }, 'PROJECT', 'CN-PAK')).toBe(false);
      expect(canManageRagScope({ role: 'Super Admin', countryNodeId: 'CN-MYS' }, 'COUNTRY', 'CN-EGY')).toBe(true);
    });

    it('denies content management to non-manager roles', () => {
      expect(canManageRagScope({ role: 'Project Sponsor', countryNodeId: 'CN-MYS' }, 'PROJECT', 'CN-MYS')).toBe(false);
      expect(canManageRagScope({ role: 'Shariah Reviewer', countryNodeId: 'CN-MYS' }, 'COUNTRY', 'CN-MYS')).toBe(false);
    });
  });

  describe('ragVisibilityWhere', () => {
    it('without a project returns GLOBAL plus the actor country only', () => {
      expect(ragVisibilityWhere({ countryNodeId: 'CN-NGA' })).toEqual({ OR: [{ scope: 'GLOBAL' }, { scope: 'COUNTRY', countryNodeId: 'CN-NGA' }] });
    });

    it('with a project uses the project country and adds only that project', () => {
      expect(ragVisibilityWhere({ countryNodeId: 'CN-MYS' }, { projectId: 'P1', countryNodeId: 'CN-TUR' })).toEqual({
        OR: [{ scope: 'GLOBAL' }, { scope: 'COUNTRY', countryNodeId: 'CN-TUR' }, { scope: 'PROJECT', projectId: 'P1' }],
      });
    });
  });

  it('management listing is unrestricted for Super Admin and country-bound otherwise', () => {
    expect(ragManagementWhere({ role: 'Super Admin', countryNodeId: 'CN-MYS' })).toEqual({});
    expect(ragManagementWhere({ role: 'Country Admin', countryNodeId: 'CN-BGD' })).toEqual({ OR: [{ scope: 'GLOBAL' }, { scope: { in: ['COUNTRY', 'PROJECT'] }, countryNodeId: 'CN-BGD' }] });
  });

  it('builds per-scope de-duplication keys', () => {
    expect(ragScopeKey('GLOBAL', { countryNodeId: 'CN-MYS' })).toBe('GLOBAL');
    expect(ragScopeKey('COUNTRY', { countryNodeId: 'CN-IRN' })).toBe('CN-IRN');
    expect(ragScopeKey('PROJECT', { countryNodeId: 'CN-MYS', projectId: 'P9' })).toBe('P9');
    expect(() => ragScopeKey('PROJECT', { countryNodeId: 'CN-MYS' })).toThrow();
  });

  describe('assertRagTransition (two-person rule)', () => {
    const draft = { approvalStatus: 'DRAFT', uploadedBy: 'uploader', reviewedBy: null };
    const reviewed = { approvalStatus: 'REVIEWED', uploadedBy: 'uploader', reviewedBy: 'reviewer' };

    it('blocks the uploader from reviewing or approving', () => {
      expect(assertRagTransition(draft, 'REVIEWED', 'uploader')).toMatch(/uploader/);
      expect(assertRagTransition(reviewed, 'APPROVED', 'uploader')).toMatch(/uploader/);
    });

    it('requires DRAFT -> REVIEWED -> APPROVED by different people', () => {
      expect(assertRagTransition(draft, 'REVIEWED', 'reviewer')).toBeNull();
      expect(assertRagTransition(draft, 'APPROVED', 'approver')).toMatch(/Only REVIEWED/);
      expect(assertRagTransition(reviewed, 'APPROVED', 'reviewer')).toMatch(/different person/);
      expect(assertRagTransition(reviewed, 'APPROVED', 'approver')).toBeNull();
    });

    it('allows rejection before approval only', () => {
      expect(assertRagTransition(draft, 'REJECTED', 'reviewer')).toBeNull();
      expect(assertRagTransition({ ...reviewed, approvalStatus: 'APPROVED' }, 'REJECTED', 'reviewer')).toMatch(/Cannot reject/);
    });
  });
});
