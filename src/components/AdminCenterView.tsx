import React, { useState } from 'react';
import { 
  Shield, 
  Globe, 
  Building2, 
  UserCheck, 
  KeyRound, 
  GitPullRequest, 
  CheckSquare, 
  UserPlus, 
  ShieldAlert, 
  Search, 
  AlertTriangle, 
  Activity, 
  FileSpreadsheet, 
  Cpu, 
  DollarSign, 
  TrendingUp, 
  ArrowUpRight, 
  FileCode2, 
  FileText, 
  BookOpen, 
  Award, 
  BarChart3, 
  Lock, 
  Download,
  LayoutDashboard,
  Sparkles,
  Megaphone,
  Newspaper,
  MapPin,
  Users,
  Power
} from 'lucide-react';
import { AdminModuleSection } from '../types';
import { AdminGovernanceDashboards } from './admin/AdminGovernanceDashboards';
import { AdminComplianceRisk } from './admin/AdminComplianceRisk';
import { AdminSystemSecurity } from './admin/AdminSystemSecurity';
import { AdminFinanceTemplates } from './admin/AdminFinanceTemplates';
import { SuperAdminDashboard } from './admin/SuperAdminDashboard';
import { CountryAdminDashboard } from './admin/CountryAdminDashboard';
import { OrganisationAdminDashboard } from './admin/OrganisationAdminDashboard';
import { AdminAIAnalyticsPanel } from '../ai/monetisation/AdminAIAnalyticsPanel';
import { MarketplaceMonetisationHub } from './revenue/MarketplaceMonetisationHub';
import { RevenueManagementHub } from './revenue/RevenueManagementHub';
import { PDPApplicationsAdminPanel } from '../pdp/components/PDPApplicationsAdminPanel';
import { PDPCountryConfigAdminPanel } from '../pdp/components/PDPCountryConfigAdminPanel';
import { AdminShariahContentManager } from './info/AdminShariahContentManager';
import { AdminPageContentManager } from './info/AdminPageContentManager';
import { useRBAC } from '../rbac/RBACContext';
import { FeatureModuleControlPanel } from './admin/FeatureModuleControlPanel';

export const AdminCenterView: React.FC = () => {
  const { currentRole } = useRBAC();
  const [activeSection, setActiveSection] = useState<string>('scoped_dashboard');

  const navCategories = [
    {
      group: 'Governance Dashboards',
      items: [
        { id: 'scoped_dashboard', label: 'Executive Scope Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'dash_compliance', label: 'Compliance Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
        { id: 'dash_audit', label: 'Audit Dashboard', icon: <FileSpreadsheet className="w-4 h-4" /> },
        { id: 'dash_finance', label: 'Finance Dashboard', icon: <DollarSign className="w-4 h-4" /> },
        { id: 'dash_security', label: 'Security Dashboard', icon: <Lock className="w-4 h-4" /> },
        { id: 'sys_reports', label: 'Regulatory Reports', icon: <FileText className="w-4 h-4" /> }
      ]
    },
    {
      group: 'Identity & Compliance',
      items: [
        { id: 'pdp_applications', label: 'PDP Applications Queue', icon: <Building2 className="w-4 h-4 text-purple-500" /> },
        { id: 'compliance_kyc', label: 'KYC Verification', icon: <UserPlus className="w-4 h-4" /> },
        { id: 'compliance_kyb', label: 'KYB Corporate Verification', icon: <Building2 className="w-4 h-4" /> },
        { id: 'compliance_aml', label: 'AML Transaction Monitoring', icon: <ShieldAlert className="w-4 h-4" /> },
        { id: 'compliance_pep', label: 'PEP Screening', icon: <Search className="w-4 h-4" /> },
        { id: 'compliance_sanctions', label: 'Sanction Screening', icon: <Lock className="w-4 h-4" /> }
      ]
    },
    {
      group: 'Risk & Operations',
      items: [
        { id: 'risk_register', label: 'Risk Register', icon: <AlertTriangle className="w-4 h-4" /> },
        { id: 'risk_incidents', label: 'Incident Management', icon: <Activity className="w-4 h-4" /> },
        { id: 'sys_auditlogs', label: 'Audit Logs Ledger', icon: <FileSpreadsheet className="w-4 h-4" /> },
        { id: 'analytics_monitoring', label: 'System Monitoring', icon: <Cpu className="w-4 h-4" /> }
      ]
    },
    {
      group: 'System & Organization',
      items: [
        { id: 'pdp_country_config', label: 'PDP Country Rules', icon: <Globe className="w-4 h-4 text-purple-500" /> },
        { id: 'sys_country', label: 'Country Management', icon: <Globe className="w-4 h-4" /> },
        { id: 'sys_orgs', label: 'Organization Management', icon: <Building2 className="w-4 h-4" /> },
        { id: 'sys_roles', label: 'Role Management', icon: <UserCheck className="w-4 h-4" /> },
        { id: 'sys_permissions', label: 'Permission Matrix', icon: <KeyRound className="w-4 h-4" /> },
        { id: 'sys_workflow', label: 'Workflow Engine', icon: <GitPullRequest className="w-4 h-4" /> },
        { id: 'sys_approvalmatrix', label: 'Approval Matrix', icon: <CheckSquare className="w-4 h-4" /> },
        { id: 'sys_modules', label: 'Module Availability', icon: <Power className="w-4 h-4" /> }
      ]
    },
    {
      group: 'Finance & Contracts',
      items: [
        { id: 'fin_revenue', label: 'Revenue & Monetisation', icon: <TrendingUp className="w-4 h-4 text-emerald-500" /> },
        { id: 'fin_marketplace_monetisation', label: 'Marketplace Promotions', icon: <Megaphone className="w-4 h-4 text-amber-500" /> },
        { id: 'fin_ai_monetisation', label: 'AI Token Economics', icon: <Sparkles className="w-4 h-4 text-purple-500" /> },
        { id: 'fin_fees', label: 'Platform Fees', icon: <DollarSign className="w-4 h-4" /> },
        { id: 'fin_settlement', label: 'Settlement Clearing', icon: <ArrowUpRight className="w-4 h-4" /> },
        { id: 'shariah_templates', label: 'Contract Templates', icon: <FileText className="w-4 h-4" /> },
        { id: 'shariah_governance', label: 'Shariah Governance', icon: <Award className="w-4 h-4" /> },
        { id: 'shariah_fatwa', label: 'Fatwa Repository', icon: <BookOpen className="w-4 h-4" /> }
      ]
    },
    {
      group: 'Public Site Content',
      items: [
        { id: 'content_about', label: 'About D-8', icon: <Globe className="w-4 h-4 text-sky-500" /> },
        { id: 'content_members', label: 'Member States', icon: <Users className="w-4 h-4 text-sky-500" /> },
        { id: 'content_news', label: 'News & Updates', icon: <Newspaper className="w-4 h-4 text-sky-500" /> },
        { id: 'content_contact', label: 'Contact', icon: <MapPin className="w-4 h-4 text-sky-500" /> }
      ]
    }
  ];

  const dashboardSections = ['dash_compliance', 'dash_audit', 'dash_finance', 'dash_security', 'sys_reports'];
  const complianceRiskSections = ['compliance_kyc', 'compliance_kyb', 'compliance_aml', 'compliance_pep', 'compliance_sanctions', 'risk_register', 'risk_incidents', 'sys_auditlogs'];
  const systemSecuritySections = ['sys_country', 'sys_orgs', 'sys_roles', 'sys_permissions', 'sys_workflow', 'sys_approvalmatrix', 'analytics_monitoring'];

  const renderScopedDashboard = () => {
    if (currentRole === 'Super Admin' || currentRole === 'Security Administrator' || currentRole === 'System Administrator') {
      return (
        <SuperAdminDashboard
          onNavigateCountryNodes={() => setActiveSection('sys_country')}
          onNavigateOrganisations={() => setActiveSection('sys_orgs')}
          onNavigateUsers={() => setActiveSection('sys_roles')}
        />
      );
    }
    if (currentRole === 'Country Admin') {
      return (
        <CountryAdminDashboard
          onNavigateOrganisations={() => setActiveSection('sys_orgs')}
          onNavigateUsers={() => setActiveSection('sys_roles')}
        />
      );
    }
    return (
      <OrganisationAdminDashboard
        onNavigateUsers={() => setActiveSection('sys_roles')}
        onOpenInviteModal={() => setActiveSection('sys_roles')}
      />
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-purple-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                Root Enterprise Governance & Administration
              </span>
              <span className="text-xs text-slate-400 font-mono">D-8 Multi-Jurisdiction Control</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Enterprise Governance Center
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Central executive dashboard, AAOIFI Shariah governance, AML/KYC screening, risk matrix, multi-sig approval engine, and cross-border settlement.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveSection('sys_modules')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 border border-white/20 cursor-pointer transition-all"
            >
              <Power className="w-4 h-4" />
              <span>Module Controls</span>
            </button>
            <button 
              onClick={() => setActiveSection('sys_reports')}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow cursor-pointer transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Generate Audit Package</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-sm space-y-4 sticky top-20 max-h-[85vh] overflow-y-auto">
            <div className="px-2 py-1 text-[11px] font-black text-slate-400 uppercase tracking-wider">
              Governance Modules
            </div>

            <div className="space-y-4 text-xs">
              {navCategories.map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <span className="font-extrabold text-[10px] text-purple-600 dark:text-purple-400 uppercase tracking-wider block px-2 mb-1">
                    {cat.group}
                  </span>
                  {cat.items.map(item => {
                    const active = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-bold transition-all text-left cursor-pointer ${
                          active
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                        }`}
                      >
                        {item.icon}
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-9 space-y-6">
          {activeSection === 'scoped_dashboard' && renderScopedDashboard()}

          {activeSection === 'pdp_applications' && <PDPApplicationsAdminPanel />}

          {activeSection === 'pdp_country_config' && <PDPCountryConfigAdminPanel />}

          {activeSection === 'fin_revenue' && <RevenueManagementHub />}

          {activeSection === 'fin_marketplace_monetisation' && <MarketplaceMonetisationHub />}

          {activeSection === 'fin_ai_monetisation' && <AdminAIAnalyticsPanel />}

          {activeSection === 'shariah_governance' && <AdminShariahContentManager />}

          {activeSection === 'sys_modules' && <FeatureModuleControlPanel />}

          {['content_about', 'content_members', 'content_news', 'content_contact'].includes(activeSection) && (
            <AdminPageContentManager />
          )}

          {dashboardSections.includes(activeSection) && (
            <AdminGovernanceDashboards section={activeSection as any} />
          )}

          {complianceRiskSections.includes(activeSection) && (
            <AdminComplianceRisk section={activeSection as any} />
          )}

          {systemSecuritySections.includes(activeSection) && (
            <AdminSystemSecurity 
              section={activeSection as any} 
              onNavigateSection={(sec) => setActiveSection(sec)}
            />
          )}

          {activeSection !== 'scoped_dashboard' && activeSection !== 'pdp_applications' && activeSection !== 'pdp_country_config' && activeSection !== 'fin_marketplace_monetisation' && activeSection !== 'fin_ai_monetisation' && activeSection !== 'shariah_governance' && activeSection !== 'sys_modules' && activeSection !== 'content_about' && activeSection !== 'content_members' && activeSection !== 'content_news' && activeSection !== 'content_contact' && !dashboardSections.includes(activeSection) && !complianceRiskSections.includes(activeSection) && !systemSecuritySections.includes(activeSection) && (
            <AdminFinanceTemplates section={activeSection as any} />
          )}
        </div>
      </div>
    </div>
  );
};
