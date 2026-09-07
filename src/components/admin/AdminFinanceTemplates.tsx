import React, { useState } from 'react';
import { 
  Edit2
} from 'lucide-react';
import { AdminRevenueDashboard } from '../revenue/AdminRevenueDashboard';
import { AdminRevenueConfig } from '../revenue/AdminRevenueConfig';
import { revenueService } from '../../revenue/revenueService';

interface AdminFinanceTemplatesProps {
  section: 'fin_fees' | 'fin_revenue' | 'fin_settlement' | 'sys_digitalsig' | 'sys_doc_templates' | 'shariah_templates' | 'shariah_governance' | 'shariah_fatwa';
}

export const AdminFinanceTemplates: React.FC<AdminFinanceTemplatesProps> = ({ section }) => {
  const [showConfigView, setShowConfigView] = useState(false);
  const revenueMetrics = revenueService.getRevenueMetrics();

  // Fee Structure State
  const [feeSchedules, setFeeSchedules] = useState([
    { id: 'FEE-01', name: 'Asset Origination & Tokenization Fee', rate: '1.25%', basis: 'On Asset Valuation at Listing', destination: 'Platform Operational Treasury', status: 'Active' },
    { id: 'FEE-02', name: 'Annual Asset Management Fee', rate: '0.75%', basis: 'Per Annum on AUM', destination: 'Pool Custodian & Node Operator', status: 'Active' },
    { id: 'FEE-03', name: 'Profit Share Performance Incentive Fee', rate: '10.00%', basis: 'On Yield Exceeding Target Benchmark', destination: 'Mudarib / Asset Manager', status: 'Active' },
    { id: 'FEE-04', name: 'Shariah Purification Fee', rate: '0.50%', basis: 'On Non-Compliant Residual Revenue', destination: 'Verified Waqf & Zakat Foundation', status: 'Active' }
  ]);

  // Settlement Queue State
  const [settlements] = useState([
    { id: 'SET-8812', sourceCurrency: 'MYR (Kuala Lumpur Node)', destCurrency: 'MYR (KL Hub)', grossAmount: '$1,200,000 USD Equivalent', clearingBank: 'Islamic Development Bank (IsDB) Clearing', status: 'Cleared & Settled', timestamp: '2026-08-05 14:00' },
    { id: 'SET-8811', sourceCurrency: 'TRY (Istanbul Node)', destCurrency: 'USD (Treasury Vault)', grossAmount: '$450,000 USD Equivalent', clearingBank: 'Ziraat Katilim Clearing', status: 'Settlement In Progress', timestamp: '2026-08-05 11:15' }
  ]);

  // Fatwa Certificates State
  const [fatwas] = useState([
    { id: 'FTW-2026-01', title: 'AAOIFI Shariah Compliance Fatwa for Fractional Sukuk Tokenization', scholars: 'Sheikh Prof. Imran Usmani & Dr. Mohamed Ali Elgari', contractType: 'Musharakah Mutanaqisah', aaoifiStandard: 'AAOIFI Standard No. 17 (Investment Sukuk)', date: '2026-01-15' },
    { id: 'FTW-2026-02', title: 'Fatwa on Cross-Border Multi-Currency Waqf Liquidity Pools', scholars: 'Dr. Nizam Yaquby & Dr. Bashir Al-Hassani', contractType: 'Wakalah bil-Istithmar', aaoifiStandard: 'AAOIFI Standard No. 33 (Waqf)', date: '2026-03-22' }
  ]);

  // Document Templates State
  const [docTemplates] = useState([
    { id: 'TPL-DOC-01', title: 'Standardized Asset Tokenization Prospectus', tags: ['{{asset_title}}', '{{total_value}}', '{{sponsor_name}}', '{{expected_yield}}'], category: 'Legal & Offering' },
    { id: 'TPL-DOC-02', title: 'Waqf Asset Trust Deed Agreement', tags: ['{{waqf_beneficiary}}', '{{custodian_name}}', '{{purification_rate}}'], category: 'Waqf & Estate' }
  ]);

  // Contract Templates State
  const [contractTemplates] = useState([
    { id: 'TPL-CON-01', title: 'AAOIFI Standard Mudarabah Investment Agreement', type: 'Mudarabah', profitSplit: '80% Capital Provider / 20% Mudarib', lossSplit: '100% Capital Provider (unless negligence)' },
    { id: 'TPL-CON-02', title: 'AAOIFI Standard Ijarah Muntahia Bittamleek (Lease-to-Own)', type: 'Ijarah', profitSplit: 'Fixed Rental Lease Yield', lossSplit: 'Lessor bears structural risk' }
  ]);

  // Digital Signature Registry State
  const [signatureRegistry] = useState([
    { id: 'SIG-01', signatory: 'Prof. Dr. Imran Habib', role: 'Chairman, Supreme Shariah Board', keyId: 'HSM-KEY-ALPHA-8842', status: 'Active', attestations: 142 },
    { id: 'SIG-02', signatory: 'Yusuf Al-Mansoor', role: 'Head of Finance & Treasury', keyId: 'HSM-KEY-BETA-7731', status: 'Active', attestations: 89 },
    { id: 'SIG-03', signatory: 'Aisha Bint Tariq', role: 'Compliance Officer (Signing Authority)', keyId: 'HSM-KEY-GAMMA-7719', status: 'Active', attestations: 64 }
  ]);

  // Shariah Board Members State
  const [shariahBoardMembers] = useState([
    { id: 'SHB-01', name: 'Prof. Dr. Imran Habib', role: 'Chairman', affiliation: 'International Islamic University', status: 'Active' },
    { id: 'SHB-02', name: 'Dr. Nurul Izzah Binti Hassan', role: 'Board Member', affiliation: 'Islamic Finance Research Centre (KL)', status: 'Active' },
    { id: 'SHB-03', name: 'Dr. Bashir Al-Hassani', role: 'Board Member', affiliation: 'AAOIFI Governance Committee', status: 'Active' },
    { id: 'SHB-04', name: 'Mufti Abdullah Zubair', role: 'Board Member', affiliation: 'Darul Uloom Kuala Lumpur', status: 'Active' }
  ]);

  return (
    <div className="space-y-6">

      {/* PLATFORM FEES */}
      {section === 'fin_fees' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Enterprise Platform Fee Schedule & Purification Split</h3>
              <p className="text-xs text-slate-500">Configurable fee schedules for asset origination, management, performance splits, and Zakat purification.</p>
            </div>
            <button className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs shadow cursor-pointer">
              + Add Fee Rule
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {feeSchedules.map(f => (
              <div key={f.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-purple-600 font-bold">{f.id}</span>
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm">{f.name}</span>
                  </div>
                  <p className="text-slate-500">Basis: {f.basis} • Destination: <strong className="text-slate-800 dark:text-slate-200">{f.destination}</strong></p>
                </div>
                <div className="flex items-center gap-3 justify-between sm:justify-end">
                  <span className="text-xl font-black text-purple-600 dark:text-purple-400 bg-purple-500/10 px-3 py-1 rounded-xl">{f.rate}</span>
                  <button className="p-2 bg-slate-200 dark:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-200 cursor-pointer">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REVENUE TRACKING & MONETISATION */}
      {section === 'fin_revenue' && (
        <div>
          {showConfigView ? (
            <AdminRevenueConfig onBack={() => setShowConfigView(false)} />
          ) : (
            <AdminRevenueDashboard 
              metrics={revenueMetrics} 
              onOpenConfig={() => setShowConfigView(true)} 
            />
          )}
        </div>
      )}

      {/* SETTLEMENT */}
      {section === 'fin_settlement' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">D-8 Multi-Currency Cross-Border Settlement Clearing</h3>
          <div className="space-y-3 text-xs">
            {settlements.map(s => (
              <div key={s.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-purple-600 font-bold">{s.id} • {s.clearingBank}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${s.status.includes('Cleared') ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                    {s.status}
                  </span>
                </div>
                <div className="flex justify-between items-center font-bold text-slate-900 dark:text-white text-sm">
                  <span>{s.sourceCurrency} ➔ {s.destCurrency}</span>
                  <span className="text-purple-600">{s.grossAmount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FATWA REPOSITORY */}
      {section === 'shariah_fatwa' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">AAOIFI Fatwa Repository & Scholar Sign-Off Library</h3>
              <p className="text-xs text-slate-500">Certified Islamic legal rulings, AAOIFI standard mappings, and scholar signatures.</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {fatwas.map(ft => (
              <div key={ft.id} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-purple-600 font-extrabold text-xs">{ft.id}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600">
                    AAOIFI Validated
                  </span>
                </div>
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white">{ft.title}</h4>
                <p className="text-slate-600 dark:text-slate-300">Signatories: <strong>{ft.scholars}</strong></p>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-[11px]">
                  <span className="font-bold text-purple-600">{ft.contractType}</span>
                  <span className="text-slate-500 font-mono">{ft.aaoifiStandard}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DOCUMENT TEMPLATES */}
      {section === 'sys_doc_templates' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Variable Document Master Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {docTemplates.map(d => (
              <div key={d.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
                <span className="font-mono text-purple-600 font-bold text-[10px]">{d.id} • {d.category}</span>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{d.title}</h4>
                <div className="flex flex-wrap gap-1">
                  {d.tags.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 font-mono text-[10px]">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONTRACT TEMPLATES */}
      {section === 'shariah_templates' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">AAOIFI Compliant Smart Contract Master Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {contractTemplates.map(c => (
              <div key={c.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <span className="font-mono text-purple-600 font-bold text-[10px]">{c.id} • {c.type}</span>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{c.title}</h4>
                <p className="text-slate-500">Profit Allocation Rule: <strong className="text-slate-800 dark:text-slate-200">{c.profitSplit}</strong></p>
                <p className="text-slate-500">Loss Allocation Rule: <strong className="text-slate-800 dark:text-slate-200">{c.lossSplit}</strong></p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DIGITAL SIGNATURE MANAGEMENT */}
      {section === 'sys_digitalsig' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Digital Signature & E-Signature Control Registry</h3>
          <p className="text-xs text-slate-500">Track authorized signatories, signature keys, and attestation status for financial documents.</p>
          <div className="space-y-3 text-xs">
            {signatureRegistry.map(row => (
              <div key={row.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-purple-600 font-bold">{row.id}</span>
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm">{row.signatory}</span>
                  </div>
                  <p className="text-slate-500">Role: {row.role} • Key: <span className="font-mono">{row.keyId}</span></p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600">
                    {row.status}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/10 text-purple-600">
                    {row.attestations} Attestations
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SHARIAH GOVERNANCE */}
      {section === 'shariah_governance' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Shariah Governance & Board Oversight</h3>
          <p className="text-xs text-slate-500">Supreme Shariah Board composition, review cadence, and governance controls.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {shariahBoardMembers.map(member => (
              <div key={member.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                <span className="font-mono text-purple-600 font-bold text-[10px]">{member.id} • {member.role}</span>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{member.name}</h4>
                <p className="text-slate-500">{member.affiliation}</p>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600">{member.status}</span>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-700 dark:text-purple-300 space-y-1">
            <p className="font-extrabold">Annual Governance Review Schedule</p>
            <p>Shariah Audit Sign-Off Deadline: Q4 2026 • New Product Structure Review: Bimonthly • Ijarah Pool Certification: Quarterly</p>
          </div>
        </div>
      )}

    </div>
  );
};
