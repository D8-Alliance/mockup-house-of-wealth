import React, { useState, useEffect } from 'react';
import { FileText, Globe, LayoutDashboard, PenSquare } from 'lucide-react';
import { PAGE_CONTENT_SCHEMAS } from './pageContentSchemas';
import { ContentStatus } from './pageContentTypes';
import { pageContentService } from './pageContentService';
import { PageContentEditor } from './PageContentEditor';
import { useRBAC } from '../../rbac/RBACContext';
import { isAdminRole } from './AdminShariahContentManager';

const SCHEMA_LIST = Object.values(PAGE_CONTENT_SCHEMAS);

export const AdminPageContentManager: React.FC = () => {
  const { activeUser, currentRole, authMode } = useRBAC();
  const [selectedId, setSelectedId] = useState<string>(SCHEMA_LIST[0].pageId);
  const [editorOpen, setEditorOpen] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, ContentStatus>>({});
  const [, force] = useState(0);

  const schema = PAGE_CONTENT_SCHEMAS[selectedId];

  useEffect(() => {
    pageContentService.setMode(authMode);
    const next: Record<string, ContentStatus> = {};
    SCHEMA_LIST.forEach((s) => (next[s.pageId] = pageContentService.getStatus(s.pageId)));
    setStatuses(next);
    const unsub = pageContentService.subscribe(() => {
      const fresh: Record<string, ContentStatus> = {};
      SCHEMA_LIST.forEach((s) => (fresh[s.pageId] = pageContentService.getStatus(s.pageId)));
      setStatuses(fresh);
      force((n) => n + 1);
    });
    return unsub;
  }, [authMode]);

  if (!isAdminRole(currentRole)) {
    return (
      <div className="rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/5 p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
          <PenSquare className="w-7 h-7" />
        </div>
        <h2 className="font-black text-lg mb-1">Action Forbidden</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Only an administrator (Super Admin, Country Admin, Organization Admin, or System Administrator)
          may edit these page contents. Your current role "{currentRole}" does not have edit access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-black text-base">Public Info Pages — Content Manager</h2>
              <p className="text-xs text-slate-500">
                Manage the About D-8, Member States, News & Updates, and Contact page content across all languages.
                Only administrators can make changes; visitors see the published version.
              </p>
            </div>
          </div>
          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
             authMode !== 'DEMO'
              ? 'bg-purple-500/15 text-purple-500 border-purple-500/30'
              : 'bg-slate-500/15 text-slate-500 border-slate-500/30'
          }`}>
             {authMode === 'PRE_PRODUCTION' ? 'Pre-Production Mode' : authMode === 'PRODUCTION' ? 'Production Mode' : 'Demo Mode'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {SCHEMA_LIST.map((s) => {
          const status = statuses[s.pageId] || 'published';
          return (
            <button
              key={s.pageId}
              onClick={() => { setSelectedId(s.pageId); setEditorOpen(false); }}
              className={`text-left p-4 rounded-2xl border cursor-pointer transition ${
                s.pageId === selectedId
                  ? 'border-sky-500/40 bg-sky-500/5 dark:bg-sky-500/10 ring-2 ring-sky-500/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-sky-400/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Globe className="w-5 h-5 text-sky-500" />
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                  status === 'published' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'
                }`}>
                  {status === 'published' ? 'Published' : 'Draft'}
                </span>
              </div>
              <h3 className="font-black text-sm">{s.navLabel || s.label}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">{s.sections.length} sections • {s.metaFields.length} settings</p>
            </button>
          );
        })}
      </div>

      {schema && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm">{schema.navLabel || schema.label}</h3>
                <p className="text-[10px] text-slate-500">Page: "{schema.pageId}"</p>
              </div>
            </div>
            <button
              onClick={() => setEditorOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow cursor-pointer"
            >
              <PenSquare className="w-4 h-4" />
              Edit {schema.navLabel || schema.label}
            </button>
          </div>
          <div className="text-[11px] text-slate-400 mt-3 leading-relaxed">
            Open the editor to update the headings, intro copy, and the {schema.sections.length + (schema.metaFields.length ? 1 : 0)} content
            sections of this page. Changes can be saved as a <strong>Draft</strong> (private) or{' '}
            <strong>Published</strong> (live immediately). Every action is recorded in the revision history with the editor's identity.
          </div>
        </div>
      )}

      {editorOpen && (
        <PageContentEditor
          schema={schema}
          initialContent={pageContentService.getDraft(schema.pageId)}
          status={statuses[selectedId] || 'published'}
          editorName={activeUser.name || currentRole}
          onClose={() => setEditorOpen(false)}
          onSaved={() => setEditorOpen(false)}
        />
      )}
    </div>
  );
};
