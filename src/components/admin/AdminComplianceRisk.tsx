import React, { useState } from 'react';
import { 
  UserCheck, 
  Building2, 
  ShieldAlert, 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Plus, 
  Filter, 
  FileSpreadsheet, 
  Activity, 
  Check, 
  RefreshCw, 
  Eye, 
  Download,
  Lock,
  ExternalLink
} from 'lucide-react';

interface AdminComplianceRiskProps {
  section: 'compliance_kyc' | 'compliance_kyb' | 'compliance_aml' | 'compliance_pep' | 'compliance_sanctions' | 'risk_register' | 'risk_incidents' | 'sys_auditlogs';
}

export const AdminComplianceRisk: React.FC<AdminComplianceRiskProps> = ({ section }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // KYC Queue State
  const [kycList, setKycList] = useState([
    { id: 'KYC-1092', name: 'Zaid Al-Mansoor', country: 'Pakistan', docType: 'CNIC & Passport', livenessScore: 98, status: 'Pending Review', submittedDate: '2026-08-05 14:10' },
    { id: 'KYC-1091', name: 'Siti Nurhaliza', country: 'Malaysia', docType: 'MyKad National ID', livenessScore: 99, status: 'Verified', submittedDate: '2026-08-05 11:30' },
    { id: 'KYC-1090', name: 'Bambang Soetjipto', country: 'Indonesia', docType: 'KTP ID Card', livenessScore: 84, status: 'Re-upload Requested', submittedDate: '2026-08-04 18:45' },
    { id: 'KYC-1089', name: 'Mehmet Yilmaz', country: 'Turkey', docType: 'Turkish Passport', livenessScore: 96, status: 'Verified', submittedDate: '2026-08-04 15:20' }
  ]);

  // KYB Queue State
  const [kybList, setKybList] = useState([
    { id: 'KYB-302', companyName: 'Bosphorus Cold Chain Logistics A.S.', country: 'Turkey', tradeLicense: 'TR-IST-884920', uboName: 'Ahmet Yilmaz (85% Owner)', leiCode: '2549008892110034', status: 'Pending Approval', riskGrade: 'Low Risk' },
    { id: 'KYB-301', companyName: 'Nusantara Halal Export Group Pt.', country: 'Indonesia', tradeLicense: 'ID-JKT-119283', uboName: 'Dian Sastro (100% Owner)', leiCode: '5493003310022394', status: 'Verified', riskGrade: 'Low Risk' },
    { id: 'KYB-300', companyName: 'D-8 Agritech Ventures Ltd.', country: 'Pakistan', tradeLicense: 'PK-ISB-998231', uboName: 'Tariq Al-Mansoor (60% Owner)', leiCode: '9845001192837482', status: 'Verified', riskGrade: 'Low Risk' }
  ]);

  // AML Alerts State
  const [amlAlerts, setAmlAlerts] = useState([
    { id: 'AML-991', user: 'Farooq Al-Jaber', entityType: 'Individual Account', score: 88, issue: 'Cross-border Wire Structuring ($9,800 x 12 within 30 mins)', status: 'Under Review', timestamp: '2026-08-05 16:22' },
    { id: 'AML-992', user: 'Global Logistics FZE', entityType: 'Corporate (KYB)', score: 94, issue: 'High Velocity Outflow to Unverified Offshore Pool', status: 'Flagged / Freeze Applied', timestamp: '2026-08-05 12:10' }
  ]);

  // PEP Matches State
  const [pepMatches, setPepMatches] = useState([
    { id: 'PEP-104', subjectName: 'Hassan Al-Attas', country: 'Malaysia', politicalRole: 'Deputy Minister of Trade & Industry', matchScore: 92, status: 'Enhanced Due Diligence (EDD) Required' },
    { id: 'PEP-103', subjectName: 'General Ibrahim Babangida', country: 'Nigeria', politicalRole: 'Former State Executive Member', matchScore: 89, status: 'Whitelisted / Cleared' }
  ]);

  // Sanctions Matches State
  const [sanctionsList, setSanctionsList] = useState([
    { id: 'SNC-881', entityName: 'Bosphorus Marine Holdings Ltd', listSource: 'OFAC SDN List', matchPct: 94, reason: 'Identical Name Match & Registered Address', status: 'Asset Tokenization Frozen' },
    { id: 'SNC-880', entityName: 'Al-Baraka Trading FZE (Historical)', listSource: 'UN Security Council List', matchPct: 12, reason: 'Low Fuzzy Score False Positive', status: 'Whitelisted' }
  ]);

  // Risk Register State
  const [riskRegister, setRiskRegister] = useState([
    { id: 'RSK-01', category: 'Compliance & Legal', description: 'Cross-Border Sukuk Tax Withholding Variance in D-8 Nations', inherentRisk: 'High', residualRisk: 'Low', owner: 'Legal & Tax Office', mitigation: 'Automated D-8 Double Taxation Treaty Deduction Engine' },
    { id: 'RSK-02', category: 'Shariah Governance', description: 'Delay in Annual Shariah Audit Sign-Off for Ijarah Pools', inherentRisk: 'Medium', residualRisk: 'Low', owner: 'Shariah Board', mitigation: 'Automated AAOIFI Smart Contract Oracle Attestation' },
    { id: 'RSK-03', category: 'Cybersecurity', description: 'Distributed Denial of Service (DDoS) on Regional RPC Relays', inherentRisk: 'High', residualRisk: 'Low', owner: 'DevOps / SecOps', mitigation: 'Cloudflare Enterprise + Multi-Region Container Failover' }
  ]);

  // Incident Tickets State
  const [incidents, setIncidents] = useState([
    { id: 'INC-2026-09', title: 'RPC Latency Spike on Istanbul Regional Node', priority: 'P2 - Medium', status: 'Investigating', impact: 'Sub-second Delay in Asset Valuation Feeds', timestamp: '2026-08-05 18:00' },
    { id: 'INC-2026-08', title: 'Failed Webhook Notification Relay for KYC Approval', priority: 'P3 - Low', status: 'Resolved', impact: 'Delayed SMS Confirmation for 14 Users', timestamp: '2026-08-04 11:30' }
  ]);

  const handleApproveKyc = (id: string) => {
    setKycList(kycList.map(k => k.id === id ? { ...k, status: 'Verified' } : k));
  };

  const handleApproveKyb = (id: string) => {
    setKybList(kybList.map(k => k.id === id ? { ...k, status: 'Verified' } : k));
  };

  return (
    <div className="space-y-6">
      
      {/* KYC VERIFICATION MODULE */}
      {section === 'compliance_kyc' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">KYC Individual Verification Queue</h3>
              <p className="text-xs text-slate-500">National ID, Passport, Liveness Check, and Biometric Identity Verification Queue.</p>
            </div>
            <span className="text-xs font-bold bg-purple-500/10 text-purple-600 px-3 py-1 rounded-full border border-purple-500/20">
              1 Pending Verification
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                  <th className="p-3.5">Ref ID</th>
                  <th className="p-3.5">Full Name</th>
                  <th className="p-3.5">Jurisdiction</th>
                  <th className="p-3.5">Document Type</th>
                  <th className="p-3.5">Biometric Liveness</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {kycList.map(k => (
                  <tr key={k.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                    <td className="p-3.5 font-bold font-mono text-purple-600">{k.id}</td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{k.name}</td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">{k.country}</td>
                    <td className="p-3.5 text-slate-500">{k.docType}</td>
                    <td className="p-3.5 font-bold font-mono text-emerald-600">{k.livenessScore}% Match</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                        k.status === 'Verified' 
                          ? 'bg-emerald-500/10 text-emerald-600' 
                          : k.status === 'Re-upload Requested' 
                          ? 'bg-amber-500/10 text-amber-600' 
                          : 'bg-purple-500/10 text-purple-600'
                      }`}>
                        {k.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {k.status === 'Pending Review' && (
                        <button 
                          onClick={() => handleApproveKyc(k.id)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-extrabold text-[11px] shadow cursor-pointer hover:bg-emerald-500"
                        >
                          Approve KYC
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KYB VERIFICATION MODULE */}
      {section === 'compliance_kyb' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">KYB Corporate Verification Ledger</h3>
              <p className="text-xs text-slate-500">Corporate Registration, Ultimate Beneficial Owners (UBO), and LEI Code Validation.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                  <th className="p-3.5">Ref ID</th>
                  <th className="p-3.5">Company Legal Name</th>
                  <th className="p-3.5">Country</th>
                  <th className="p-3.5">Trade License</th>
                  <th className="p-3.5">Ultimate Beneficial Owner (UBO)</th>
                  <th className="p-3.5">LEI Code</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {kybList.map(k => (
                  <tr key={k.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                    <td className="p-3.5 font-bold font-mono text-purple-600">{k.id}</td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{k.companyName}</td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">{k.country}</td>
                    <td className="p-3.5 font-mono text-slate-500">{k.tradeLicense}</td>
                    <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">{k.uboName}</td>
                    <td className="p-3.5 font-mono text-slate-400">{k.leiCode}</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                        k.status === 'Verified' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        {k.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {k.status === 'Pending Approval' && (
                        <button 
                          onClick={() => handleApproveKyb(k.id)}
                          className="px-3 py-1.5 rounded-xl bg-purple-600 text-white font-extrabold text-[11px] shadow cursor-pointer hover:bg-purple-500"
                        >
                          Verify Entity
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AML MODULE */}
      {section === 'compliance_aml' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Anti-Money Laundering (AML) Monitoring Engine</h3>
          <div className="space-y-3">
            {amlAlerts.map(alert => (
              <div key={alert.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-purple-600 font-bold">{alert.id} • {alert.entityType}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-600 border border-rose-500/20">
                    Suspicion Score: {alert.score}%
                  </span>
                </div>
                <p className="font-extrabold text-slate-900 dark:text-white text-sm">{alert.user}</p>
                <p className="text-rose-600 dark:text-rose-400 font-medium">{alert.issue}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RISK REGISTER */}
      {section === 'risk_register' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Enterprise Risk Register Matrix</h3>
            <button className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs shadow cursor-pointer">
              + Add Risk Factor
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                  <th className="p-3.5">Risk ID</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Risk Description</th>
                  <th className="p-3.5">Inherent</th>
                  <th className="p-3.5">Residual</th>
                  <th className="p-3.5">Mitigation Strategy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {riskRegister.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                    <td className="p-3.5 font-bold font-mono text-purple-600">{r.id}</td>
                    <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">{r.category}</td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">{r.description}</td>
                    <td className="p-3.5 font-black text-rose-600">{r.inherentRisk}</td>
                    <td className="p-3.5 font-black text-emerald-600">{r.residualRisk}</td>
                    <td className="p-3.5 text-slate-500">{r.mitigation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INCIDENT MANAGEMENT */}
      {section === 'risk_incidents' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Incident Response Management</h3>
          <div className="space-y-3">
            {incidents.map(inc => (
              <div key={inc.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-purple-600 font-bold">{inc.id} • {inc.priority}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${inc.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                    {inc.status}
                  </span>
                </div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{inc.title}</h4>
                <p className="text-slate-500">Impact: {inc.impact}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PEP & SANCTIONS FALLBACK / SUMMARY */}
      {(section === 'compliance_pep' || section === 'compliance_sanctions') && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white capitalize">{section.replace(/_/g, ' ')} Active Screening Ledger</h3>
          <div className="space-y-3 text-xs">
            {section === 'compliance_pep' ? pepMatches.map(p => (
              <div key={p.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white text-sm block">{p.subjectName} ({p.country})</span>
                  <span className="text-slate-500">{p.politicalRole}</span>
                </div>
                <span className="font-bold text-purple-600 bg-purple-500/10 px-2.5 py-1 rounded-full">{p.matchScore}% Match • {p.status}</span>
              </div>
            )) : sanctionsList.map(s => (
              <div key={s.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white text-sm block">{s.entityName}</span>
                  <span className="text-slate-500">{s.listSource} • {s.reason}</span>
                </div>
                <span className={`font-bold px-2.5 py-1 rounded-full ${s.status.includes('Frozen') ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'}`}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
