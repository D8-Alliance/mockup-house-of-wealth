import React, { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { apiClient, AssetEngagement } from '../../../services/apiClient';

const STATUS: Record<string, string> = { PROPOSED: 'under discussion', ACCEPTED: 'awaiting Legal and Shariah', APPROVED: 'approved' };

/**
 * A project has two kinds of contract: its financing structure with investors (set when the project is
 * registered, analysed on this page) and, separately, one akad per asset partnership, agreed with each
 * asset owner. This note shows the second kind so the two are not confused.
 */
export const ProjectPartnershipsNote: React.FC<{ projectId: string; financingStructure: string }> = ({ projectId, financingStructure }) => {
  const [partnerships, setPartnerships] = useState<AssetEngagement[]>([]);
  useEffect(() => {
    setPartnerships([]);
    if (!projectId) return;
    apiClient.getAssetEngagements().then((list) => setPartnerships(list.filter((item) => item.project.projectId === projectId && STATUS[item.status]))).catch(() => setPartnerships([]));
  }, [projectId]);

  return (
    <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900 text-[11px] text-sky-900 dark:text-sky-200 space-y-1">
      <p className="flex items-start gap-1.5"><Info className="w-3.5 h-3.5 shrink-0 mt-0.5" /><span>This page is about the project's <strong>financing structure with investors</strong> ({financingStructure || 'not set'}), chosen when the project was registered. It is separate from the akad agreed with each asset owner.</span></p>
      {partnerships.length > 0 && (
        <ul className="pl-5 list-disc">
          {partnerships.map((item) => (
            <li key={item.id}>Asset partnership: <strong>{item.asset.name}</strong>, <strong>{item.akad === 'IJARAH' ? 'Ijarah' : 'Musharakah'}</strong> ({STATUS[item.status]}). Its akad was set in negotiation; its agreement is drafted from the partnership, not here.</li>
          ))}
        </ul>
      )}
    </div>
  );
};
