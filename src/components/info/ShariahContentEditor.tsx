import React, { useState } from 'react';
import {
  ArrowUp,
  ArrowDown,
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
import { ShariahContent, CoreValue, ContentStatus } from '../../shariah/coreValuesTypes';
import { shariahContentService } from '../../shariah/shariahContentService';

interface Props {
  initialContent: ShariahContent;
  status: ContentStatus;
  editorName: string;
  onClose: () => void;
  onSaved: (content: ShariahContent, status: ContentStatus) => void;
}

function EmptyValue(id: string): CoreValue {
  return {
    id,
    order: 0,
    arabic: '',
    name: '',
    translation: '',
    meaning: '',
    whatItMeans: '',
    applications: [''],
    guidingPrinciple: '',
    simpleExample: ''
  };
}

export const ShariahContentEditor: React.FC<Props> = ({
  initialContent,
  status,
  editorName,
  onClose,
  onSaved
}) => {
  const [content, setContent] = useState<ShariahContent>({ ...initialContent, values: initialContent.values.map((v) => ({ ...v, applications: [...v.applications] })) });
  const [dirty, setDirty] = useState(false);
  const [note, setNote] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const revisions = shariahContentService.getRevisions();

  const markDirty = (next: ShariahContent) => {
    setContent(next);
    setDirty(true);
  };

  const updateMeta = (field: 'title' | 'subtitle' | 'intro', value: string) => {
    markDirty({ ...content, [field]: value });
  };

  const reorder = (id: string, dir: -1 | 1) => {
    const idx = content.values.findIndex((v) => v.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= content.values.length) return;
    const next = [...content.values];
    [next[idx], next[target]] = [next[target], next[idx]];
    markDirty({ ...content, values: next.map((v, i) => ({ ...v, order: i + 1 })) });
  };

  const updateValue = (id: string, patch: Partial<CoreValue>) => {
    const next = content.values.map((v) => (v.id === id ? { ...v, ...patch } : v));
    markDirty({ ...content, values: next });
  };

  const updateApp = (id: string, appIdx: number, value: string) => {
    const next = content.values.map((v) => {
      if (v.id !== id) return v;
      const applications = [...v.applications];
      applications[appIdx] = value;
      return { ...v, applications };
    });
    markDirty({ ...content, values: next });
  };

  const addApp = (id: string) => {
    const next = content.values.map((v) => (v.id === id ? { ...v, applications: [...v.applications, ''] } : v));
    markDirty({ ...content, values: next });
  };

  const removeApp = (id: string, appIdx: number) => {
    const next = content.values.map((v) => {
      if (v.id !== id) return v;
      const applications = v.applications.filter((_, i) => i !== appIdx);
      return { ...v, applications: applications.length ? applications : [''] };
    });
    markDirty({ ...content, values: next });
  };

  const addValue = () => {
    markDirty({
      ...content,
      values: [...content.values, EmptyValue(`value-${Date.now()}`)].map((v, i) => ({ ...v, order: i + 1 }))
    });
  };

  const removeValue = (id: string) => {
    markDirty({
      ...content,
      values: content.values.filter((v) => v.id !== id).map((v, i) => ({ ...v, order: i + 1 }))
    });
  };

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const handleSaveDraft = () => {
    const saved = shariahContentService.saveDraft(content, editorName, note || 'Saved as draft');
    setDirty(false);
    setNote('');
    flash('Draft saved. Not visible to the public yet.');
    onSaved(saved, 'draft');
  };

  const handlePublish = () => {
    const saved = shariahContentService.publish(content, editorName, note || 'Published');
    setDirty(false);
    setNote('');
    flash('Published. The page now shows the updated content.');
    onSaved(saved, 'published');
  };

  const handleDiscard = () => {
    setContent({ ...initialContent, values: initialContent.values.map((v) => ({ ...v, applications: [...v.applications] })) });
    setDirty(false);
  };

  const inputCls =
    'w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40';

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex">
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
        {/* Top toolbar */}
        <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <PencilLine className="w-5 h-5 text-emerald-500" />
            <div>
              <h2 className="font-black text-sm">Edit Shariah Governance Content</h2>
              <p className="text-[10px] text-slate-400">
                Editing as <span className="font-bold text-emerald-600">{editorName}</span> •{' '}
                {shariahContentService.isProduction() ? (
                  <span className="font-bold text-purple-500">PRODUCTION · live backend save</span>
                ) : (
                  <span className="font-bold text-slate-500">DEMO · local save</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <X className="w-3.5 h-3.5" />
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: editor columns */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
            {/* Page metadata */}
            <section className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
              <h3 className="font-black text-xs uppercase tracking-wider text-slate-400">Page Settings</h3>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Title</label>
                <input value={content.title} onChange={(e) => updateMeta('title', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Subtitle</label>
                <textarea value={content.subtitle} onChange={(e) => updateMeta('subtitle', e.target.value)} rows={2} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Introduction</label>
                <textarea value={content.intro} onChange={(e) => updateMeta('intro', e.target.value)} rows={4} className={inputCls} />
              </div>
            </section>

            {/* Core values */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-400">Core Values ({content.values.length})</h3>
                <button
                  onClick={addValue}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Value
                </button>
              </div>

              {content.values.map((v, idx) => (
                <div key={v.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 mb-4 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                    <GripVertical className="w-4 h-4 text-slate-300" />
                    <span className="w-6 h-6 rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-black">
                      {v.order}
                    </span>
                    <span className="font-bold text-xs text-slate-500 truncate">
                      {v.arabic || 'New Value'} — {v.name || '(untitled)'}
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                      <button onClick={() => reorder(v.id, -1)} disabled={idx === 0} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 disabled:opacity-30 cursor-pointer">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => reorder(v.id, 1)} disabled={idx === content.values.length - 1} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 disabled:opacity-30 cursor-pointer">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => removeValue(v.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Arabic Term</label>
                      <input value={v.arabic} onChange={(e) => updateValue(v.id, { arabic: e.target.value })} className={inputCls} placeholder="الأصالة" dir="rtl" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">English Name</label>
                      <input value={v.name} onChange={(e) => updateValue(v.id, { name: e.target.value })} className={inputCls} placeholder="Al-Asālah" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Translation</label>
                      <input value={v.translation} onChange={(e) => updateValue(v.id, { translation: e.target.value })} className={inputCls} placeholder="Authenticity & Credibility" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Meaning in the Islamic Digital Economy</label>
                      <input value={v.meaning} onChange={(e) => updateValue(v.id, { meaning: e.target.value })} className={inputCls} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">What it means for D-8 IDEAS</label>
                      <input value={v.whatItMeans} onChange={(e) => updateValue(v.id, { whatItMeans: e.target.value })} className={inputCls} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">SuperApp Applications</label>
                      {v.applications.map((app, ai) => (
                        <div key={ai} className="flex items-center gap-2 mb-1.5">
                          <span className="text-emerald-500 text-xs">•</span>
                          <input value={app} onChange={(e) => updateApp(v.id, ai, e.target.value)} className={inputCls} />
                          <button onClick={() => removeApp(v.id, ai)} className="text-red-400 hover:text-red-600 cursor-pointer shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => addApp(v.id)} className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline cursor-pointer mt-1">
                        <Plus className="w-3 h-3" /> Add application
                      </button>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Guiding Principle</label>
                      <input value={v.guidingPrinciple} onChange={(e) => updateValue(v.id, { guidingPrinciple: e.target.value })} className={inputCls} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Simple Example</label>
                      <textarea value={v.simpleExample} onChange={(e) => updateValue(v.id, { simpleExample: e.target.value })} rows={2} className={inputCls} />
                    </div>
                  </div>
                </div>
              ))}
            </section>
          </div>

          {/* Right: publish sidebar */}
          <aside className="w-80 shrink-0 border-l border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-5 overflow-y-auto space-y-4 hidden lg:block">
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4">
              <h4 className="font-black text-xs text-slate-400 uppercase tracking-wider mb-3">Publish</h4>
              <div className="text-xs space-y-2 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Current status</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    status === 'published'
                      ? 'bg-emerald-500/15 text-emerald-600'
                      : 'bg-amber-500/15 text-amber-600'
                  }`}>
                    {status === 'published' ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Values</span>
                  <span className="font-bold">{content.values.length}</span>
                </div>
                {dirty && <div className="text-amber-600 font-bold">Unsaved changes</div>}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Revision note</label>
                <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder="e.g. Updated Al-Asālah wording" />
              </div>
              <div className="grid grid-cols-1 gap-2 mt-4">
                <button
                  onClick={handleSaveDraft}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-extrabold hover:bg-amber-500/25 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Save as Draft
                </button>
                <button
                  onClick={handlePublish}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Publish
                </button>
                <button
                  onClick={handleDiscard}
                  disabled={!dirty}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold disabled:opacity-40 cursor-pointer"
                >
                  <Undo2 className="w-4 h-4" />
                  Discard Changes
                </button>
                <button
                  onClick={() => { shariahContentService.resetToSeed(); handleDiscard(); }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-500 text-xs font-bold hover:bg-red-500/20 cursor-pointer"
                >
                  <FilePlus2 className="w-4 h-4" />
                  Reset to Default
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

        {/* Mobile bottom actions */}
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-700 px-5 py-3 flex gap-2">
          <button onClick={handleSaveDraft} className="flex-1 py-2.5 rounded-xl bg-amber-500/15 text-amber-600 text-xs font-extrabold cursor-pointer">
            Save Draft
          </button>
          <button onClick={handlePublish} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-extrabold cursor-pointer">
            Publish
          </button>
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
