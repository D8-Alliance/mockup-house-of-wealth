import { PolicyService } from './policy.service';

const service = new PolicyService();

describe('permission matrix conformance - system & organization roles', () => {
  describe('System Administrator', () => {
    it('may manage users and read audit logs (matrix)', () => {
      expect(service.can('System Administrator', 'users', 'read')).toBe(true);
      expect(service.can('System Administrator', 'users', 'update')).toBe(true);
      expect(service.can('System Administrator', 'users', 'delete')).toBe(true);
      expect(service.can('System Administrator', 'audit_logs', 'read')).toBe(true);
    });

    it('is denied every domain/funding capability (matrix)', () => {
      expect(service.can('System Administrator', 'marketplace', 'read')).toBe(false);
      expect(service.can('System Administrator', 'assets', 'create')).toBe(false);
      expect(service.can('System Administrator', 'pooling', 'read')).toBe(false);
      expect(service.can('System Administrator', 'approvals', 'approve')).toBe(false);
      expect(service.can('System Administrator', 'approvals', 'disburse')).toBe(false);
      expect(service.can('System Administrator', 'ledger', 'read')).toBe(false);
    });
  });

  describe('Organization Admin', () => {
    it('may approve funding requests within scope (matrix approvals.approve)', () => {
      expect(service.can('Organization Admin', 'approvals', 'read')).toBe(true);
      expect(service.can('Organization Admin', 'approvals', 'approve')).toBe(true);
    });

    it('may read marketplace and create pools/projects (matrix)', () => {
      expect(service.can('Organization Admin', 'marketplace', 'read')).toBe(true);
      expect(service.can('Organization Admin', 'pooling', 'create')).toBe(true);
      expect(service.can('Organization Admin', 'assets', 'create')).toBe(true);
      expect(service.can('Organization Admin', 'users', 'update')).toBe(true);
    });

    it('is denied every capability the matrix does not grant', () => {
      expect(service.can('Organization Admin', 'approvals', 'disburse')).toBe(false);
      expect(service.can('Organization Admin', 'approvals', 'create')).toBe(false);
      expect(service.can('Organization Admin', 'assets', 'delete')).toBe(false);
      expect(service.can('Organization Admin', 'audit_logs', 'read')).toBe(false);
      expect(service.can('Organization Admin', 'governance', 'read')).toBe(false);
    });
  });

  describe('Project Sponsor', () => {
    it('may create a funding request but cannot approve or disburse it', () => {
      expect(service.can('Project Sponsor', 'approvals', 'create')).toBe(true);
      expect(service.can('Project Sponsor', 'approvals', 'approve')).toBe(false);
      expect(service.can('Project Sponsor', 'approvals', 'disburse')).toBe(false);
    });
  });

  describe('other admin-tier roles (system family)', () => {
    it('Security Administrator is limited to users, audit logs and governance', () => {
      expect(service.can('Security Administrator', 'users', 'update')).toBe(true);
      expect(service.can('Security Administrator', 'audit_logs', 'read')).toBe(true);
      expect(service.can('Security Administrator', 'marketplace', 'read')).toBe(false);
      expect(service.can('Security Administrator', 'pooling', 'create')).toBe(false);
      expect(service.can('Security Administrator', 'approvals', 'approve')).toBe(false);
    });

    it('Data Administrator is limited to users and audit log read', () => {
      expect(service.can('Data Administrator', 'users', 'create')).toBe(true);
      expect(service.can('Data Administrator', 'users', 'read')).toBe(true);
      expect(service.can('Data Administrator', 'users', 'export')).toBe(true);
      expect(service.can('Data Administrator', 'audit_logs', 'read')).toBe(true);
      expect(service.can('Data Administrator', 'audit_logs', 'audit')).toBe(false);
      expect(service.can('Data Administrator', 'assets', 'read')).toBe(false);
    });

    it('AI Administrator is limited to governance, audit logs and reports', () => {
      expect(service.can('AI Administrator', 'governance', 'approve')).toBe(true);
      expect(service.can('AI Administrator', 'audit_logs', 'read')).toBe(true);
      expect(service.can('AI Administrator', 'reports', 'read')).toBe(true);
      expect(service.can('AI Administrator', 'users', 'read')).toBe(false);
      expect(service.can('AI Administrator', 'marketplace', 'read')).toBe(false);
    });
  });
});
