import React, { useState } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  KeyRound, 
  UserCheck, 
  FileText, 
  Building2, 
  DollarSign, 
  Layers, 
  ChevronRight, 
  Check, 
  RotateCcw,
  Plus,
  Lock,
  Eye,
  Sliders,
  CheckCheck
} from 'lucide-react';
import { useRBAC } from '../../rbac/RBACContext';

interface ApprovalTierRule {
  tierId: string;
  tierName: string;
  amountRange: string;
  requiredSignatures: number;
  signersRequired: string[];
  quorumDescription: string;
  slaLimitHours: number;
  autoEscalationHours: number;
}

const APPROVAL_TIERS: ApprovalTierRule[] = [
  {
    tierId: 'TIER-1',
    tierName: 'Tier 1: Standard Operational Actions',
    amountRange: 'Up to $250,000 USD (PKR 70M)',
    requiredSignatures: 1,
    signersRequired: ['Project Reviewer', 'Pool Manager'],
    quorumDescription: 'Single signature from authorized operational officer or pool manager.',
    slaLimitHours: 12,
    autoEscalationHours: 24
  },
  {
    tierId: 'TIER-2',
    tierName: 'Tier 2: Medium Value Capital Actions',
    amountRange: '$250,000 – $2,000,000 USD (PKR 70M – 560M)',
    requiredSignatures: 2,
    signersRequired: ['Compliance Officer', 'Risk Officer'],
    quorumDescription: '2-Key Multi-Sig: Regulatory compliance clearance AND actuarial risk sign-off.',
    slaLimitHours: 24,
    autoEscalationHours: 48
  },
  {
    tierId: 'TIER-3',
    tierName: 'Tier 3: High Value & Shariah Structuring',
    amountRange: '$2,000,000 – $10,000,000 USD (PKR 560M – 2.8B)',
    requiredSignatures: 3,
    signersRequired: ['Compliance Officer', 'Shariah Advisor / Board Member', 'Country Admin'],
    quorumDescription: '3-Key Tripartite: Shariah Fatwa verification, AML clearance, and Regional Sovereign Node Admin sign-off.',
    slaLimitHours: 48,
    autoEscalationHours: 72
  },
  {
    tierId: 'TIER-4',
    tierName: 'Tier 4: Sovereign & Institutional Mega-Sukuk',
    amountRange: 'Above $10,000,000 USD (PKR 2.8B+)',
    requiredSignatures: 4,
    signersRequired: ['Super Admin', 'Shariah Committee Quorum', 'Executive Approver', 'Chief Risk Officer'],
    quorumDescription: '4-Eye Sovereign Board Quorum: Unanimous consensus with hardware-backed digital signature tokens.',
    slaLimitHours: 72,
    autoEscalationHours: 96
  }
];

interface PendingApprovalItem {
  id: string;
  title: string;
  category: 'ASSET_TOKENIZATION' | 'POOL_LAUNCH' | 'MILESTONE_PAYOUT' | 'SHARIAH_FATWA' | 'EMERGENCY_FREEZE';
  entity: string;
  countryNode: string;
  amountUsd: number;
  amountFormatted: string;
  tier: string;
  submittedAt: string;
  requesterName: string;
  requiredSignatures: number;
  currentSignatures: { role: string; signedBy: string; signedAt: string }[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  riskScore: 'LOW' | 'MEDIUM' | 'HIGH';
  shariahStatus: 'CERTIFIED' | 'UNDER_REVIEW';
}

const INITIAL_APPROVAL_ITEMS: PendingApprovalItem[] = [
  {
    id: 'APPR-PAK-101',
    title: 'Karachi Port Logistics Hub Sukuk Pool Opening & Tranche A Minting',
    category: 'POOL_LAUNCH',
    entity: 'Pak Sovereign Capital / Indus Port Terminal',
    countryNode: 'CN-PAK',
    amountUsd: 8200000,
    amountFormatted: '$8,200,000 USD (PKR 2.30B)',
    tier: 'TIER-3',
    submittedAt: '2026-08-16 10:00',
    requesterName: 'Ahmad bin Razak (Senior PDP)',
    requiredSignatures: 3,
    currentSignatures: [
      { role: 'Compliance Officer', signedBy: 'Zainab Qureshi', signedAt: '2026-08-16 14:20' },
      { role: 'Shariah Advisor', signedBy: 'Mufti Faraz Adam', signedAt: '2026-08-17 09:10' }
    ],
    status: 'PENDING',
    riskScore: 'LOW',
    shariahStatus: 'CERTIFIED'
  },
  {
    id: 'APPR-PAK-102',
    title: 'Islamabad Enclave Smart Residential Sukuk Phase 2 Allocation Release',
    category: 'MILESTONE_PAYOUT',
    entity: 'Indus Asset Holdings',
    countryNode: 'CN-PAK',
    amountUsd: 3500000,
    amountFormatted: '$3,500,000 USD (PKR 980M)',
    tier: 'TIER-3',
    submittedAt: '2026-08-17 08:30',
    requesterName: 'Tariq Mehmood',
    requiredSignatures: 3,
    currentSignatures: [
      { role: 'Compliance Officer', signedBy: 'Zainab Qureshi', signedAt: '2026-08-17 11:45' }
    ],
    status: 'PENDING',
    riskScore: 'MEDIUM',
    shariahStatus: 'CERTIFIED'
  },
  {
    id: 'APPR-MYS-204',
    title: 'FELDA Smart Palm Agritech IoT & Solar Irrigation Asset Tokenization',
    category: 'ASSET_TOKENIZATION',
    entity: 'FELDA Malaysia Agritech',
    countryNode: 'CN-MYS',
    amountUsd: 1200000,
    amountFormatted: '$1,200,000 USD (MYR 5.6M)',
    tier: 'TIER-2',
    submittedAt: '2026-08-17 12:15',
    requesterName: 'Siti Aminah',
    requiredSignatures: 2,
    currentSignatures: [
      { role: 'Compliance Officer', signedBy: 'Norhaliza Hashim', signedAt: '2026-08-17 13:00' }
    ],
    status: 'PENDING',
    riskScore: 'LOW',
    shariahStatus: 'CERTIFIED'
  },
  {
    id: 'APPR-TUR-305',
    title: 'Bosphorus Maritime Cold-Chain Logistics Hub Smart Sukuk Fatwa Structuring',
    category: 'SHARIAH_FATWA',
    entity: 'Bosphorus Maritime Logistics',
    countryNode: 'CN-TUR',
    amountUsd: 4500000,
    amountFormatted: '$4,500,000 USD (TRY 155M)',
    tier: 'TIER-3',
    submittedAt: '2026-08-17 15:00',
    requesterName: 'Emre Demir',
    requiredSignatures: 3,
    currentSignatures: [],
    status: 'PENDING',
    riskScore: 'LOW',
    shariahStatus: 'UNDER_REVIEW'
  }
];

export const ApprovalMatrixPanel: React.FC = () => {
  const { currentRole, activeUser } = useRBAC();
  const [activeTab, setActiveTab] = useState<'pending' | 'rules' | 'delegations'>('pending');
  const [approvalItems, setApprovalItems] = useState<PendingApprovalItem[]>(INITIAL_APPROVAL_ITEMS);
  const [selectedItem, setSelectedItem] = useState<PendingApprovalItem | null>(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signPin, setSignPin] = useState('123456');
  const [signNotes, setSignNotes] = useState('Approved following satisfactory Shariah & compliance audit.');

  const handleApprove = (itemId: string) => {
    setApprovalItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newSigs = [
          ...item.currentSignatures,
          {
            role: currentRole,
            signedBy: activeUser.name,
            signedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
          }
        ];
        const isNowComplete = newSigs.length >= item.requiredSignatures;
        return {
          ...item,
          currentSignatures: newSigs,
          status: isNowComplete ? 'APPROVED' : 'PENDING'
        };
      }
      return item;
    }));
    setShowSignModal(false);
    setSelectedItem(null);
  };

  const handleReject = (itemId: string) => {
    setApprovalItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, status: 'REJECTED' };
      }
      return item;
    }));
    setSelectedItem(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Multi-Sig Governance
            </span>
            <span className="text-xs text-slate-400 font-mono">4-Eye Principle & Quorum Engine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
            Approval Matrix & Multi-Signature Quorum
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure tiered financial thresholds, Shariah board sign-off requirements, and execute real-time multi-key governance approvals.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex bg-slate-100 dark:bg-slate-700/60 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'pending' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <span>Pending Queue</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                {approvalItems.filter(i => i.status === 'PENDING').length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'rules' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Threshold Rules
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pending Actions</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-600">
              {approvalItems.filter(i => i.status === 'PENDING').length}
            </span>
            <span className="text-xs text-slate-400">Awaiting Multi-Sig</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Completed Sign-Offs</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-600">
              {approvalItems.filter(i => i.status === 'APPROVED').length + 18}
            </span>
            <span className="text-xs text-slate-400">This Month</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Quorum Compliance</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400">100%</span>
            <span className="text-xs text-emerald-600 font-bold">4-Eye Strict</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Signer Role</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-sm font-black text-slate-900 dark:text-white truncate max-w-[150px]">
              {currentRole}
            </span>
          </div>
        </div>
      </div>

      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Live Approvals & Quorum Execution Queue
                </h3>
                <p className="text-xs text-slate-500">
                  Items requiring multi-signature verification, compliance sign-offs, and Shariah board concurrence.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {approvalItems.map(item => {
                const sigCount = item.currentSignatures.length;
                const isApproved = item.status === 'APPROVED';
                const isRejected = item.status === 'REJECTED';
                const hasAlreadySigned = item.currentSignatures.some(s => s.role === currentRole);

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all hover:border-purple-500/40"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                          {item.id}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {item.countryNode}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isApproved
                            ? 'bg-emerald-500/20 text-emerald-600'
                            : isRejected
                            ? 'bg-red-500/20 text-red-600'
                            : 'bg-amber-500/20 text-amber-600'
                        }`}>
                          {item.status} ({sigCount}/{item.requiredSignatures} Signatures)
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-600">
                          {item.tier}
                        </span>
                      </div>

                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        {item.title}
                      </h4>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span>Entity: <strong className="text-slate-700 dark:text-slate-300">{item.entity}</strong></span>
                        <span>•</span>
                        <span>Amount: <strong className="text-emerald-600 dark:text-emerald-400">{item.amountFormatted}</strong></span>
                        <span>•</span>
                        <span>Submitted: <span className="font-mono">{item.submittedAt}</span></span>
                      </div>

                      {/* Signatures List */}
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-400">Recorded Signatures:</span>
                        {item.currentSignatures.length === 0 ? (
                          <span className="text-[11px] text-amber-600 italic">No signatures recorded yet</span>
                        ) : (
                          item.currentSignatures.map((sig, sIdx) => (
                            <span key={sIdx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span>{sig.role} ({sig.signedBy})</span>
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {!isApproved && !isRejected && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setShowSignModal(true);
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-500 text-white shadow flex items-center gap-1.5 cursor-pointer transition-all"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Sign & Authorize</span>
                          </button>
                          <button
                            onClick={() => handleReject(item.id)}
                            className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-800 transition-all cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {isApproved && (
                        <span className="px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-500 text-white flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Fully Quorum Certified</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Multi-Level Governance Tiers & Sign-Off Matrix
            </h3>
            <p className="text-xs text-slate-500">
              Deterministic threshold policies mapped to transaction volume, Shariah risk classification, and multi-sig key holders.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {APPROVAL_TIERS.map(tier => (
                <div
                  key={tier.tierId}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      {tier.tierId}
                    </span>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {tier.requiredSignatures} Signatures Required
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    {tier.tierName}
                  </h4>

                  <div className="text-xs text-slate-500">
                    Threshold: <strong className="text-slate-800 dark:text-slate-200">{tier.amountRange}</strong>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                    {tier.quorumDescription}
                  </p>

                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Mandatory Authorized Signer Roles:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {tier.signersRequired.map((sig, sIdx) => (
                        <span key={sIdx} className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                          {sig}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700 font-mono">
                    <span>SLA: {tier.slaLimitHours}h</span>
                    <span>Escalation: {tier.autoEscalationHours}h</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Digital Signature PIN Modal */}
      {showSignModal && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-purple-600" />
                Hardware / PIN Multi-Sig Authorization
              </h3>
              <button
                onClick={() => setShowSignModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1 text-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Authorizing Item</span>
              <p className="font-bold text-slate-900 dark:text-white line-clamp-2">
                {selectedItem.title}
              </p>
              <div className="text-emerald-600 font-black font-mono pt-1">
                {selectedItem.amountFormatted}
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Active Signer Role & Identity
                </label>
                <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-500/20 text-purple-900 dark:text-purple-200 font-bold">
                  {currentRole} — {activeUser.name}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Security PIN / Token Passcode
                </label>
                <input
                  type="password"
                  value={signPin}
                  onChange={e => setSignPin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono tracking-widest text-center text-lg"
                  maxLength={6}
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Audit Sign-Off Notes
                </label>
                <textarea
                  rows={2}
                  value={signNotes}
                  onChange={e => setSignNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setShowSignModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprove(selectedItem.id)}
                className="px-4 py-2 rounded-xl text-xs font-black bg-purple-600 text-white hover:bg-purple-500 shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Cryptographic Signature</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
