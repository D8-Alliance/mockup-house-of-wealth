import React from 'react';
import { Download, FileText } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { ASSET_DOCUMENT_LABELS } from '../../assets/assetLabels';
import { KYB_DOCUMENT_LABELS } from '../../organisations/organisationKybLabels';
import { UserRole } from '../../rbac/types';
import { AuditorPerformanceQueue } from '../performance/PerformanceReports';

/** Who sees which documents: each list comes from the screen that already governs access to it. */
const ASSET_ROLES: UserRole[] = ['Asset Owner', 'Asset Manager', 'Legal Officer'];
const KYB_ROLES: UserRole[] = ['KYB Officer', 'Compliance Officer'];

interface Row { key: string; group: string; owner: string; label: string; fileName: string; fileSize: number; sha256: string; createdAt: string; open: () => Promise<unknown> }

const size = (bytes: number) => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * The Document Vault for roles without project access: asset documents for asset owners, asset managers and
 * Legal (verification), KYB documents for KYB and Compliance officers. Downloads go through the same routes,
 * with the same access checks and audit log, as the asset and KYB screens.
 */
export const RoleDocumentVault: React.FC<{ role: UserRole }> = ({ role }) => {
  const assets = ASSET_ROLES.includes(role);
  const kyb = KYB_ROLES.includes(role);
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState('');

  React.useEffect(() => {
    if (!assets && !kyb) { setRows([]); return; }
    const load = async () => {
      const list: Row[] = [];
      if (assets) {
        for (const asset of await apiClient.getAssets()) {
          for (const document of asset.documents) list.push({ key: `asset-${document.id}`, group: 'Asset documents', owner: asset.organisationName ? `${asset.name} · ${asset.organisationName}` : asset.name, label: ASSET_DOCUMENT_LABELS[document.documentType]?.label ?? document.documentType, fileName: document.fileName, fileSize: document.fileSize, sha256: document.sha256, createdAt: document.createdAt, open: () => apiClient.downloadAssetDocument(asset.id, document.id) });
        }
      }
      if (kyb) {
        for (const organisation of await apiClient.getOrganisationKybQueue('ALL')) {
          for (const document of organisation.kybDocuments) list.push({ key: `kyb-${document.id}`, group: 'Organisation KYB documents', owner: organisation.name, label: KYB_DOCUMENT_LABELS[document.documentType] ?? document.documentType, fileName: document.fileName, fileSize: document.fileSize, sha256: document.sha256, createdAt: document.createdAt, open: () => apiClient.downloadOrganisationKybDocument(organisation.id, document.id) });
        }
      }
      setRows(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    };
    load().catch((cause) => { setRows([]); setError(cause instanceof Error ? cause.message : 'The documents could not be loaded.'); });
  }, [assets, kyb]);

  const open = async (row: Row) => {
    setBusy(row.key);
    setError('');
    try { await row.open(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'The document could not be opened.'); } finally { setBusy(''); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2"><FileText className="w-6 h-6 text-emerald-600" />Document Vault</h2>
        <p className="text-sm text-slate-500">{assets && kyb ? 'Asset and organisation documents you may open.' : assets ? (role === 'Legal Officer' ? 'Documents of assets in your country, for verification.' : 'Documents of your organisation\'s assets.') : kyb ? 'KYB documents of organisations in your country.' : ''}</p>
      </div>
      {!assets && !kyb && (
        <p className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300">
          {role === 'KYC Officer' ? 'Identity documents are opened only from the KYC review queue, one application at a time, so they are not listed here.'
            : role === 'Auditor' ? 'You verify the projects\' quarterly performance reports below. Project files are opened by the project\'s reviewers, not listed here.'
            : 'Your role has no documents to open here.'}
        </p>
      )}
      {role === 'Auditor' && <AuditorPerformanceQueue />}
      {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      {(assets || kyb) && rows === null && <p className="text-xs text-slate-500">Loading…</p>}
      {(assets || kyb) && rows?.length === 0 && !error && <p className="text-xs text-slate-500">No documents yet.</p>}
      {rows && rows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/40 text-[10px] uppercase tracking-wider text-slate-400">
              <tr><th className="px-3 py-2.5 text-left font-black">Document</th><th className="px-3 py-2.5 text-left font-black">Belongs to</th><th className="px-3 py-2.5 text-left font-black">Uploaded</th><th className="px-3 py-2.5 text-right font-black">Size</th><th className="px-3 py-2.5" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {rows.map((row) => (
                <tr key={row.key}>
                  <td className="px-3 py-2.5"><p className="font-bold text-slate-900 dark:text-white">{row.label}</p><p className="text-slate-500">{row.fileName} · <span className="font-mono" title={row.sha256}>{row.sha256.slice(0, 12)}…</span></p></td>
                  <td className="px-3 py-2.5"><p>{row.owner}</p><p className="text-slate-500">{row.group}</p></td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{row.createdAt.slice(0, 10)}</td>
                  <td className="px-3 py-2.5 text-right">{size(row.fileSize)}</td>
                  <td className="px-3 py-2.5 text-right"><button type="button" disabled={busy === row.key} onClick={() => void open(row)} className="px-2.5 py-1.5 rounded-lg border border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"><Download className="w-3.5 h-3.5" />Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
