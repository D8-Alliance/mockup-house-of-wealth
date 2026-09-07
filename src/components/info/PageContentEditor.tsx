import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  FileCheck2,
  FilePlus2,
  GripVertical,
  Info,
  PencilLine,
  Plus,
  Save,
  Send,
  Trash2,
  Undo2,
  X
} from 'lucide-react';
import {
  PageContent,
  PageContentSchema,
  PageContentItem,
  ContentStatus
} from './pageContentTypes';
import { pageContentService } from './pageContentService';

interface Props {
  schema: PageContentSchema;
  initialContent: PageContent;
  status: ContentStatus;
  editorName: string;
  onClose: () => void;
  onSaved: (content: PageContent, status: ContentStatus) => void;
}

export const PageContentEditor: React.FC<Props> = ({
  schema,
  initialContent,
  status,
  editorName,
  onClose,
  onSaved
}) => {
  const [content, setContent] = useState<PageContent>(JSON.parse(JSON.stringify(initialContent)) as PageContent);
  const [dirty, setDirty] = useState(false);
  const [note, setNote] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const revisions = pageContentService.getRevisions(schema.pageId);

  const markDirty = (next: PageContent) => {
    setContent(next);
    setDirty(true);
  };

  const updateMeta = (key: string, value: string) => {
    markDirty({ ...content, meta: { ...content.meta, [key]: value } });
  };

  const sectionItems = (sectionKey: string): PageContentItem[] => content.sections[sectionKey] || [];

  const reorder = (sectionKey: string, id: string, dir: -1 | 1) => {
    const items = [...sectionItems(sectionKey)];
    const idx = items.findIndex((it) => it.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= items.length) return;
    [items[idx], items[target]] = [items[target], items[idx]];
    markDirty({ ...content, sections: { ...content.sections, [sectionKey]: items } });
  };

  const updateItem = (sectionKey: string, id: string, fieldKey: string, value: string) => {
    const items = sectionItems(sectionKey).map((it) =>
      it.id === id ? { ...it, values: { ...it.values, [fieldKey]: value } } : it
    );
    markDirty({ ...content, sections: { ...content.sections, [sectionKey]: items } });
  };

  const addItem = (sectionKey: string) => {
    const empty: Record<string, string> = {};
    schema.sections
      .find((s) => s.key === sectionKey)!
      .fields.forEach((f) => (empty[f.key] = ''));
    markDirty({
      ...content,
      sections: { ...content.sections, [sectionKey]: [...sectionItems(sectionKey), { id: `${sectionKey}-${Date.now()}`, values: empty }] }
    });
  };

  const removeItem = (sectionKey: string, id: string) => {
    markDirty({
      ...content,
      sections: { ...content.sections, [sectionKey]: sectionItems(sectionKey).filter((it) => it.id !== id) }
    });
  };

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const handleSaveDraft = () => {
    pageContentService.saveDraft(schema.pageId, content, editorName, note || 'Saved as draft');
    setDirty(false);
    setNote('');
    flash('Draft saved. Not visible to the public yet.');
    onSaved(content, 'draft');
  };

  const handlePublish = () => {
    const saved = pageContentService.publish(schema.pageId, content, editorName, note || 'Published');
    setDirty(false);
    setNote('');
    flash('Published. The page now shows the updated content.');
    onSaved(saved, 'published');
  };

  const handleDiscard = () => {
    setContent(JSON.parse(JSON.stringify(initialContent)) as PageContent);
    setDirty(false);
  };

  const inputCls =
    'w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40';

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex">
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <PencilLine className="w-5 h-5 text-emerald-500" />
            <div>
              <h2 className="font-black text-sm">Edit {schema.label} Content</h2>
              <p className="text-[10px] text-slate-400">
                Editing as <span className="font-bold text-emerald-600">{editorName}</span> •{' '}
                {pageContentService.isProduction ? (
                  <span className="font-bold text-purple-500">PRODUCTION · live backend save</span>
                ) : (
                  <span className="font-bold text-slate-500">DEMO · local save</span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <X className="w-3.5 h-3.5" />
            Close
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
            <section className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
              <h3 className="font-black text-xs uppercase tracking-wider text-slate-400">Page Settings</h3>
              {schema.metaFields.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea value={content.meta[f.key] || ''} onChange={(e) => updateMeta(f.key, e.target.value)} rows={f.rows || 3} className={inputCls} />
                  ) : (
                    <input value={content.meta[f.key] || ''} onChange={(e) => updateMeta(f.key, e.target.value)} className={inputCls} />
                  )}
                </div>
              ))}
            </section>

            {schema.sections.map((s) => {
              const items = sectionItems(s.key);
              return (
                <section key={s.key}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-black text-xs uppercase tracking-wider text-slate-400">
                      {s.label} ({items.length})
                    </h3>
                    <button
                      onClick={() => addItem(s.key)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add {s.singular}
                    </button>
                  </div>

                  {items.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-6 text-center text-xs text-slate-400">
                      No {s.label.toLowerCase()} yet. Click "Add {s.singular}" to create one.
                    </div>
                  )}

                  {items.map((it, idx) => (
                    <div key={it.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 mb-4 overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                        <GripVertical className="w-4 h-4 text-slate-300" />
                        <span className="w-6 h-6 rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-black">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-xs text-slate-500 truncate">
                          {it.values.title || it.values.year || it.values.region || it.values.city || `${s.singular} ${idx + 1}`}
                        </span>
                        <div className="ml-auto flex items-center gap-1">
                          <button onClick={() => reorder(s.key, it.id, -1)} disabled={idx === 0} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 disabled:opacity-30 cursor-pointer">
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => reorder(s.key, it.id, 1)} disabled={idx === items.length - 1} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 disabled:opacity-30 cursor-pointer">
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => removeItem(s.key, it.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {s.fields.map((f) => (
                          <div key={f.key} className={f.type === 'textarea' ? 'md:col-span-2' : ''}>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{f.label}</label>
                            {f.type === 'textarea' ? (
                              <textarea value={it.values[f.key] || ''} onChange={(e) => updateItem(s.key, it.id, f.key, e.target.value)} rows={f.rows || 3} className={inputCls} />
                            ) : (
                              <input value={it.values[f.key] || ''} onChange={(e) => updateItem(s.key, it.id, f.key, e.target.value)} className={inputCls} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              );
            })}
          </div>

          <aside className="w-80 shrink-0 border-l border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-5 overflow-y-auto space-y-4 hidden lg:block">
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4">
              <h4 className="font-black text-xs text-slate-400 uppercase tracking-wider mb-3">Publish</h4>
              <div className="text-xs space-y-2 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Current status</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    status === 'published' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'
                  }`}>
                    {status === 'published' ? 'Published' : 'Draft'}
                  </span>
                </div>
                {dirty && <div className="text-amber-600 font-bold">Unsaved changes</div>}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Revision note</label>
                <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
              </div>
              <div className="grid grid-cols-1 gap-2 mt-4">
                <button onClick={handleSaveDraft} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-extrabold hover:bg-amber-500/25 cursor-pointer">
                  <Save className="w-4 h-4" /> Save as Draft
                </button>
                <button onClick={handlePublish} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow cursor-pointer">
                  <Send className="w-4 h-4" /> Publish
                </button>
                <button onClick={handleDiscard} disabled={!dirty} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold disabled:opacity-40 cursor-pointer">
                  <Undo2 className="w-4 h-4" /> Discard Changes
                </button>
                <button
                  onClick={() => { pageContentService.resetToSeed(schema.pageId); handleDiscard(); }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-500 text-xs font-bold hover:bg-red-500/20 cursor-pointer"
                >
                  <FilePlus2 className="w-4 h-4" /> Reset to Default
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4">
              <h4 className="font-black text-xs text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5" /> Revision History
              </h4>
              {revisions.length === 0 ? (
                <p className="text-[10px] text-slate-400">No revisions recorded yet.</p>
              ) : (
                <ul className="space-y-2">
                  {revisions.slice(0, 8).map((r) => (
                    <li key={r.id} className="text-[10px] border-l-2 border-slate-200 dark:border-slate-700 pl-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          r.status === 'published' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'
                        }`}>
                          v{r.version} {r.status}
                        </span>
                        <span className="text-slate-400">{new Date(r.editedAt).toLocaleString()}</span>
                      </div>
                      <div className="text-slate-500 mt-0.5 truncate">{r.note}</div>
                      <div className="text-slate-400">by {r.editedBy}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>

        <div className="lg:hidden border-t border-slate-200 dark:border-slate-700 px-5 py-3 flex gap-2">
          <button onClick={handleSaveDraft} className="flex-1 py-2.5 rounded-xl bg-amber-500/15 text-amber-600 text-xs font-extrabold cursor-pointer">Save Draft</button>
          <button onClick={handlePublish} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-extrabold cursor-pointer">Publish</button>
        </div>

        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] px-5 py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-2xl border border-emerald-500/40 flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-400" />
            {toast}
          </div>
        )}
      </div>
    </div>
  );
};
