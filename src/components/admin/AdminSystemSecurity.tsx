import React, { useState } from 'react';
import { CountryNodeList } from '../../countryNodes/CountryNodeList';
import { CountryNodeDetail } from '../../countryNodes/CountryNodeDetail';
import { CountryNodeFormModal } from '../../countryNodes/CountryNodeFormModal';
import { CountryNode } from '../../countryNodes/countryNodeTypes';

import { OrganisationList } from '../../organisations/OrganisationList';
import { OrganisationDetail } from '../../organisations/OrganisationDetail';
import { OrganisationOnboardingModal } from '../../organisations/OrganisationOnboardingModal';
import { OrganisationVerificationModal } from '../../organisations/OrganisationVerificationModal';
import { Organisation } from '../../organisations/organisationTypes';

import { UserList } from '../../users/UserList';
import { UserDetailModal } from '../../users/UserDetailModal';
import { InviteUserModal } from '../../users/InviteUserModal';
import { RoleAssignmentModal } from '../../users/RoleAssignmentModal';
import { UserOnboardingModal } from '../../users/UserOnboardingModal';
import { AppUser } from '../../users/userTypes';

import { RoleManagementPanel } from './RoleManagementPanel';
import { PermissionMatrixPanel } from './PermissionMatrixPanel';
import { WorkflowEnginePanel } from './WorkflowEnginePanel';
import { ApprovalMatrixPanel } from './ApprovalMatrixPanel';
import { SystemMonitoringPanel } from './SystemMonitoringPanel';

interface AdminSystemSecurityProps {
  section: 'sys_country' | 'sys_orgs' | 'sys_roles' | 'sys_permissions' | 'sys_workflow' | 'sys_approvalmatrix' | 'analytics_monitoring';
  onNavigateSection?: (section: any) => void;
}

export const AdminSystemSecurity: React.FC<AdminSystemSecurityProps> = ({ 
  section,
  onNavigateSection
}) => {
  // State for Country Nodes
  const [selectedCountryNode, setSelectedCountryNode] = useState<CountryNode | null>(null);
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);

  // State for Organisations
  const [selectedOrganisation, setSelectedOrganisation] = useState<Organisation | null>(null);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [verificationTargetOrg, setVerificationTargetOrg] = useState<Organisation | null>(null);

  // State for Users
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [isInviteUserOpen, setIsInviteUserOpen] = useState(false);
  const [roleAssignmentTargetUser, setRoleAssignmentTargetUser] = useState<AppUser | null>(null);
  const [onboardingTargetUserId, setOnboardingTargetUserId] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const forceRefresh = () => setRefreshKey(prev => prev + 1);

  return (
    <div key={refreshKey} className="space-y-6">
      {/* 1. COUNTRY NODE MANAGEMENT */}
      {section === 'sys_country' && (
        <>
          {selectedCountryNode ? (
            <CountryNodeDetail
              countryNode={selectedCountryNode}
              onBack={() => setSelectedCountryNode(null)}
            />
          ) : (
            <CountryNodeList
              onSelectCountryNode={node => setSelectedCountryNode(node)}
              onCreateNewNode={() => setIsCountryModalOpen(true)}
            />
          )}

          <CountryNodeFormModal
            isOpen={isCountryModalOpen}
            onClose={() => setIsCountryModalOpen(false)}
            onCreated={forceRefresh}
          />
        </>
      )}

      {/* 2. ORGANISATION MANAGEMENT */}
      {section === 'sys_orgs' && (
        <>
          {selectedOrganisation ? (
            <OrganisationDetail
              organisation={selectedOrganisation}
              onBack={() => setSelectedOrganisation(null)}
            />
          ) : (
            <OrganisationList
              onSelectOrganisation={org => setSelectedOrganisation(org)}
              onOpenOnboarding={() => setIsOnboardingModalOpen(true)}
              onOpenVerification={org => setVerificationTargetOrg(org)}
            />
          )}

          <OrganisationOnboardingModal
            isOpen={isOnboardingModalOpen}
            onClose={() => setIsOnboardingModalOpen(false)}
            onOnboarded={forceRefresh}
          />

          <OrganisationVerificationModal
            organisation={verificationTargetOrg}
            isOpen={!!verificationTargetOrg}
            onClose={() => setVerificationTargetOrg(null)}
            onUpdated={forceRefresh}
          />
        </>
      )}

      {/* 3. ROLE MANAGEMENT */}
      {section === 'sys_roles' && (
        <RoleManagementPanel
          onNavigateToPermissions={() => onNavigateSection?.('sys_permissions')}
          onNavigateToUserList={() => onNavigateSection?.('users_dir')}
        />
      )}

      {/* 4. PERMISSION MATRIX */}
      {section === 'sys_permissions' && (
        <PermissionMatrixPanel />
      )}

      {/* 5. WORKFLOW ENGINE */}
      {section === 'sys_workflow' && (
        <WorkflowEnginePanel />
      )}

      {/* 6. APPROVAL MATRIX */}
      {section === 'sys_approvalmatrix' && (
        <ApprovalMatrixPanel />
      )}

      {/* 7. SYSTEM MONITORING & TELEMETRY */}
      {section === 'analytics_monitoring' && (
        <SystemMonitoringPanel />
      )}
    </div>
  );
};
