import React, { useState, useEffect } from 'react';
import { Award, PenSquare } from 'lucide-react';
import { ContentStatus } from '../../shariah/coreValuesTypes';
import { shariahContentService } from '../../shariah/shariahContentService';
import { ShariahContentEditor } from './ShariahContentEditor';
import { useRBAC } from '../../rbac/RBACContext';

const ADMIN_ROLES = ['Super Admin', 'Country Admin', 'Organization Admin', 'System Administrator'];

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role);
}

export const AdminShariahContentManager: React.FC = () => {
  const { activeUser, currentRole, authMode } = useRBAC();
  const [editorOpen, setEditorOpen] = useState(false);
  const [status, setStatus] = useState<ContentStatus>(shariahContentService.getStatus());
  const [, force] = useState(0);

  useEffect(() => {
    shariahContentService.setMode(authMode);
    const unsub = shariahContentService.subscribe(() => {
      setStatus(shariahContentService.getStatus());
      force((n) => n + 1);
    });
    return unsub;
  }, [authMode]);

  const published = shariahContentService.getPublishedContent();

  if (!isAdminRole(currentRole)) {
    return (
      <div className="rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/5 p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
          <PenSquare className="w-7 h-7" />
        </div>
        <h2 className="font-black text-lg mb-1">Action Forbidden</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Only an administrator (Super Admin, Country Admin, Organization Admin, or System Administrator)
          may edit the Shariah Governance content. Your current role "{currentRole}" does not have edit access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-black text-base">Shariah Governance — Page Content Manager</h2>
              <p className="text-xs text-slate-500">
                WordPress-style editor. Only administrators can make changes; guests see the published version.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
              status === 'published'
                ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-600 border-amber-500/30'
            }`}>
              {status === 'published' ? '● Published' : '● Draft'}
            </span>
            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
              authMode === 'PRODUCTION'
                ? 'bg-purple-500/15 text-purple-500 border-purple-500/30'
                : 'bg-slate-500/15 text-slate-500 border-slate-500/30'
            }`}>
              {authMode === 'PRODUCTION' ? 'Production Mode' : 'Demo Mode'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
            <p className="text-2xl font-black text-purple-600">{published.values.length}</p>
            <p className="text-[10px] font-bold uppercase text-slate-500">Core Values</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
            <p className="text-2xl font-black text-emerald-600">{published.values.filter((v) => v.arabic && v.name).length}</p>
            <p className="text-[10px] font-bold uppercase text-slate-500">Complete Values</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
            <p className="text-2xl font-black text-slate-600">{shariahContentService.hasDraft() ? 'Yes' : 'No'}</p>
            <p className="text-[10px] font-bold uppercase text-slate-500">Pending Draft</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
            <p className="text-2xl font-black text-slate-600">{shariahContentService.getRevisions().length}</p>
            <p className="text-[10px] font-bold uppercase text-slate-500">Revisions</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-6">
          <button
            onClick={() => setEditorOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow cursor-pointer"
          >
            <PenSquare className="w-4 h-4" />
            Edit Page Content
          </button>
        </div>

        <div className="mt-5 text-[11px] text-slate-400 leading-relaxed">
          How it works: click <strong>Edit Page Content</strong> to open the editor. Changes can be saved as a{' '}
          <strong>Draft</strong> (private, not visible to visitors) or <strong>Published</strong> (immediately live on the
          public Shariah Governance page). Every action is recorded in the revision history along with the editor's identity.
        </div>
      </div>

      {editorOpen && (
        <ShariahContentEditor
          initialContent={published}
          status={status}
          editorName={activeUser.name || currentRole}
          onClose={() => setEditorOpen(false)}
          onSaved={(c, s) => {
            setStatus(s);
            setEditorOpen(false);
          }}
        />
      )}
    </div>
  );
};
