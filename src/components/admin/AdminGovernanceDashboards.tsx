import React, { useState } from 'react';
import { 
  ShieldCheck, 
  FileSpreadsheet, 
  DollarSign, 
  Lock, 
  FileText, 
  Download, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Activity, 
  Search, 
  Users, 
  Building2, 
  BarChart3, 
  ShieldAlert, 
  Cpu, 
  Server, 
  Calendar,
  Check,
  Eye,
  Plus
} from 'lucide-react';
import { AdminModuleSection } from '../../types';
import { AdminReportsView } from './AdminReportsView';

interface AdminGovernanceDashboardsProps {
  section: 'dash_compliance' | 'dash_audit' | 'dash_finance' | 'dash_security' | 'sys_reports';
}

export const AdminGovernanceDashboards: React.FC<AdminGovernanceDashboardsProps> = ({ section }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('This Month (August 2026)');
  const [selectedCountry, setSelectedCountry] = useState('All D-8 Jurisdictions');
  const [reportFormat, setReportFormat] = useState<'PDF' | 'CSV' | 'XLSX'>('PDF');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [generatedSuccess, setGeneratedSuccess] = useState<string | null>(null);

  // Compliance Dashboard Data
  const complianceStats = {
    kycVerifiedCount: 4820,
    kycPendingCount: 142,
    kybVerifiedOrgs: 310,
    amlAlertsActive: 3,
    pepScreenedToday: 1240,
    sanctionMatchesCleared: 99.8
  };

  // Audit Logs Data
  const [auditLogs] = useState([
    { id: 'LOG-88091', timestamp: '2026-08-05 18:42:10', actor: 'Dr. Tariq Al-Hashimi (Super Admin)', role: 'Super Admin', action: 'Approved Tokenization Pool #104 (Karachi Port Logistics)', hash: '0x88f21...90ab', status: 'Immutable Hash Certified' },
    { id: 'LOG-88090', timestamp: '2026-08-05 17:15:33', actor: 'Sheikh Prof. Imran Usmani (Shariah Board)', role: 'Shariah Scholar', action: 'Issued Fatwa Certificate #FTW-2026-04', hash: '0x3c71a...88e1', status: 'Immutable Hash Certified' },
    { id: 'LOG-88089', timestamp: '2026-08-05 15:02:18', actor: 'Compliance Officer Amina Bello', role: 'Compliance Admin', action: 'Whitelisted PEP Match False Positive (Ref #AML-991)', hash: '0x11e99...44a2', status: 'Immutable Hash Certified' },
    { id: 'LOG-88088', timestamp: '2026-08-05 12:40:01', actor: 'System Auto-Engine', role: 'System Cron', action: 'Automated Zakat Purification Distribution to Waqf Pool', hash: '0x99a22...77c1', status: 'Immutable Hash Certified' },
  ]);

  // Finance Dashboard Data
  const financeStats = {
    grossRevenueUSD: 1485000,
    platformFeesYTD: 620000,
    settlementVolumeUSD: 24800000,
    pendingWithdrawalsUSD: 340000,
    feeEfficiencyPercent: 99.4,
    clearingD8Countries: 8
  };

  // Security Dashboard Data
  const securityStats = {
    activeUserSessions: 342,
    twoFactorEnforcementPct: 100,
    failedAuthAttempts24h: 12,
    threatLevel: 'Low (Protected)',
    rpcFirewallBlocks24h: 184,
    smartContractAuditStatus: '100% Certified (CertiK & AAOIFI Audit)'
  };

  // Report Templates
  const reportTemplates = [
    { id: 'REP-01', name: 'Comprehensive Enterprise Governance & Compliance Summary', category: 'Compliance', frequency: 'Monthly', desc: 'Full audit of KYC/KYB rates, sanction screenings, PEP hits, and AAOIFI fatwa status.' },
    { id: 'REP-02', name: 'AAOIFI Shariah Governance & Non-Compliant Income Purification Statement', category: 'Shariah', frequency: 'Quarterly', desc: 'Detailed breakdown of interest-free yield, non-compliant revenue purifications, and Sadaqah fund transfers.' },
    { id: 'REP-03', name: 'D-8 Cross-Border Settlement & Treasury Revenue Ledger', category: 'Finance', frequency: 'Real-Time / Daily', desc: 'Multi-currency clearing flows across Pakistan, Malaysia, Indonesia, Turkey, Egypt, and Nigeria.' },
    { id: 'REP-04', name: 'System Security, Encryption & Access Permission Matrix Audit', category: 'Security', frequency: 'Weekly', desc: 'Role permissions audit, failed auth attempts, RPC firewall triggers, and key rotations.' }
  ];

  const handleGenerateReport = (title: string) => {
    setIsGeneratingReport(true);
    setGeneratedSuccess(null);
    setTimeout(() => {
      setIsGeneratingReport(false);
      setGeneratedSuccess(`Successfully generated '${title}' in ${reportFormat} format!`);
      setTimeout(() => setGeneratedSuccess(null), 4000);
    }, 800);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-purple-600" />
          <span className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">Dashboard Context:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select 
            value={selectedCountry}
            onChange={e => setSelectedCountry(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200"
          >
            <option>All D-8 Jurisdictions</option>
            <option>Pakistan (Karachi Node)</option>
            <option>Malaysia (KL Hub)</option>
            <option>Indonesia (Jakarta Hub)</option>
            <option>Turkey (Istanbul Node)</option>
            <option>Egypt (Cairo Node)</option>
            <option>Nigeria (Lagos Node)</option>
          </select>

          <select 
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200"
          >
            <option>This Month (August 2026)</option>
            <option>Last Quarter (Q2 2026)</option>
            <option>Year-to-Date (2026)</option>
            <option>All-Time Historical</option>
          </select>

          <button className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 cursor-pointer" title="Refresh Live Analytics">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* COMPLIANCE DASHBOARD */}
      {section === 'dash_compliance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Verified Individual Users (KYC)</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{complianceStats.kycVerifiedCount.toLocaleString()}</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">+14% MoM</span>
              </div>
              <span className="text-[11px] text-slate-500 block">{complianceStats.kycPendingCount} verification requests pending</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Corporate Entities (KYB)</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{complianceStats.kybVerifiedOrgs}</span>
                <span className="text-xs font-bold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded">Verified UBO</span>
              </div>
              <span className="text-[11px] text-slate-500 block">Trade Licenses & LEI Validated</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Active AML Suspicious Flags</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{complianceStats.amlAlertsActive} Flags</span>
                <span className="text-xs font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded">Action Req.</span>
              </div>
              <span className="text-[11px] text-slate-500 block">Structuring & Velocity Monitoring</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Sanction Clear Rate</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{complianceStats.sanctionMatchesCleared}%</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">OFAC / UN</span>
              </div>
              <span className="text-[11px] text-slate-500 block">{complianceStats.pepScreenedToday} PEP Screenings Today</span>
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">D-8 Regional Compliance Status Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">South Asia Node (Karachi / Islamabad)</span>
                <p className="text-slate-500 text-[11px]">SECP & SBP Shariah Regulatory Framework Compliant. Zero unresolved sanctions.</p>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-600">100% Compliant</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Southeast Asia Hub (Kuala Lumpur)</span>
                <p className="text-slate-500 text-[11px]">Bank Negara Malaysia (BNM) & Securities Commission Sukuk Guidelines Integrated.</p>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-600">100% Compliant</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Africa Node (Lagos)</span>
                <p className="text-slate-500 text-[11px]">Central Bank of Nigeria Non-Interest Financial Institutions Framework Onboarded.</p>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-amber-500/10 text-amber-600">Provisioning</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT DASHBOARD */}
      {section === 'dash_audit' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Cryptographic Audit Trail & Mutation Stream</h3>
                <p className="text-xs text-slate-500">Real-time immutable ledger logging every system configuration change, fatwa sign-off, and financial disbursement.</p>
              </div>
              <button className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer">
                <Download className="w-4 h-4" />
                <span>Export Signed Ledger (.json / .csv)</span>
              </button>
            </div>

            <div className="space-y-3">
              {auditLogs.map(log => (
                <div key={log.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2 text-xs">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-purple-600 font-bold">{log.id}</span>
                      <span className="text-slate-400">• {log.timestamp}</span>
                      <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 font-bold rounded text-[10px]">{log.role}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      {log.status}
                    </span>
                  </div>

                  <p className="font-extrabold text-slate-900 dark:text-white text-sm">{log.action}</p>
                  <p className="text-slate-500 text-[11px]">Actor: <strong>{log.actor}</strong></p>
                  <p className="font-mono text-[10px] text-slate-400 break-all bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    Merkle Root Hash: {log.hash}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FINANCE DASHBOARD */}
      {section === 'dash_finance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Platform Gross Revenue YTD</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">${(financeStats.grossRevenueUSD / 1000000).toFixed(2)}M USD</span>
              <span className="text-[11px] text-slate-500 block">Across 16 Tokenization & Waqf Pools</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Cross-Border Settlement Volume</span>
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400">${(financeStats.settlementVolumeUSD / 1000000).toFixed(1)}M USD</span>
              <span className="text-[11px] text-slate-500 block">Cleared across 8 D-8 Central Banks</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Pending Settlement Withdrawals</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">${(financeStats.pendingWithdrawalsUSD / 1000).toFixed(0)}k USD</span>
              <span className="text-[11px] text-slate-500 block">Multi-sig authorization queue active</span>
            </div>
          </div>
        </div>
      )}

      {/* SECURITY DASHBOARD */}
      {section === 'dash_security' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Enterprise Cybersecurity Posture & RPC Firewall</h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Active Sessions</span>
                <span className="text-lg font-black text-slate-900 dark:text-white">{securityStats.activeUserSessions}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">2FA Enforcement</span>
                <span className="text-lg font-black text-emerald-600">{securityStats.twoFactorEnforcementPct}% Mandatory</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Failed Auth 24h</span>
                <span className="text-lg font-black text-slate-900 dark:text-white">{securityStats.failedAuthAttempts24h}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Threat Level</span>
                <span className="text-lg font-black text-emerald-600">{securityStats.threatLevel}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">RPC Firewall Blocks</span>
                <span className="text-lg font-black text-purple-600">{securityStats.rpcFirewallBlocks24h}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Smart Contract Cert</span>
                <span className="text-xs font-black text-emerald-600">CertiK Verified</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPORTS MODULE */}
      {section === 'sys_reports' && (
        <AdminReportsView reportTemplates={reportTemplates} />
      )}

    </div>
  );
};
