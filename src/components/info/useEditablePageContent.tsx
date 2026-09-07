import { useState, useEffect } from 'react';
import { PencilLine } from 'lucide-react';
import { PageContent, ContentStatus, PageId } from './pageContentTypes';
import { pageContentService } from './pageContentService';
import { useRBAC } from '../../rbac/RBACContext';
import { isAdminRole } from './AdminShariahContentManager';

interface EditablePageContent {
  content: PageContent;
  status: ContentStatus;
  canEdit: boolean;
  editorName: string;
  editorOpen: boolean;
  openEditor: () => void;
  closeEditor: () => void;
}

/**
 * Hooks a public info page up to the WordPress-like content service.
 * Renders the published version, applies the current auth mode, and
 * exposes the admin-only Edit flow (mirrors ShariahGovernancePage).
 */
export function useEditablePageContent(pageId: PageId): EditablePageContent {
  const { activeUser, currentRole, authMode, isAuthenticated } = useRBAC();
  const [content, setContent] = useState<PageContent>(() => pageContentService.getPublished(pageId));
  const [status, setStatus] = useState<ContentStatus>(() => pageContentService.getStatus(pageId));
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    pageContentService.setMode(authMode);
    const unsub = pageContentService.subscribe(() => {
      setContent(pageContentService.getPublished(pageId));
      setStatus(pageContentService.getStatus(pageId));
    });
    return unsub;
  }, [authMode, pageId]);

  const canEdit = isAuthenticated && isAdminRole(currentRole);

  return {
    content,
    status,
    canEdit,
    editorName: activeUser?.name || currentRole || 'Administrator',
    editorOpen,
    openEditor: () => setEditorOpen(true),
    closeEditor: () => setEditorOpen(false)
  };
}

export function EditablePageAdminBar({
  schemaLabel,
  status,
  canEdit,
  onEdit
}: {
  schemaLabel: string;
  status: ContentStatus;
  canEdit: boolean;
  onEdit: () => void;
}) {
  if (!canEdit) return null;
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 mb-4">
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10">
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
          status === 'published'
            ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
            : 'bg-amber-500/15 text-amber-600 border-amber-500/30'
        }`}>
          {status === 'published' ? '● Published' : '● Draft — preview only'}
        </span>
        <span className="text-xs text-slate-600 dark:text-slate-300 font-bold">
          You are viewing as an administrator. Visitors see the published version.
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer"
          >
            <PencilLine className="w-3.5 h-3.5" /> Edit {schemaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
