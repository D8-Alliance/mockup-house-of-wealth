import { PageContent, PageContentRevision, ContentStatus } from './pageContentTypes';
import { INITIAL_PAGE_CONTENT, PAGE_CONTENT_ID } from './pageContentSeed';

const K = {
  published: (id: string) => `how.page.${id}.published`,
  draft: (id: string) => `how.page.${id}.draft`,
  status: (id: string) => `how.page.${id}.status`,
  revisions: (id: string) => `how.page.${id}.revisions`
};

type Mode = 'DEMO' | 'PRODUCTION';

function clone(content: PageContent): PageContent {
  return JSON.parse(JSON.stringify(content)) as PageContent;
}

/**
 * Generic WordPress-like content manager for the public info pages
 * (About D-8, Member States, News & Updates, Contact).
 *
 * - DEMO mode:      persisted to localStorage (frontend mock).
 * - PRODUCTION mode: routed to the backend write path so server-side policy
 *                    governs who may change content.
 * - Only admin roles are granted write access (enforced by the caller).
 */
export class PageContentService {
  private mode: Mode = 'DEMO';
  private listeners: Set<() => void> = new Set();

  get isProduction(): boolean {
    return this.mode === 'PRODUCTION';
  }

  setMode(mode: Mode): void {
    this.mode = mode;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  private load<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  getStatus(pageId: string): ContentStatus {
    return this.load<ContentStatus>(K.status(pageId), 'published');
  }

  getPublished(pageId: string): PageContent {
    const id = PAGE_CONTENT_ID[pageId] || pageId;
    const stored = this.load<PageContent | null>(K.published(id), null);
    if (!stored || this.getStatus(pageId) !== 'published') {
      return INITIAL_PAGE_CONTENT[pageId];
    }
    return stored;
  }

  getDraft(pageId: string): PageContent {
    const id = PAGE_CONTENT_ID[pageId] || pageId;
    return this.load<PageContent>(K.draft(id), INITIAL_PAGE_CONTENT[pageId]);
  }

  hasDraft(pageId: string): boolean {
    return localStorage.getItem(K.draft(PAGE_CONTENT_ID[pageId] || pageId)) !== null;
  }

  getRevisions(pageId: string): PageContentRevision[] {
    return this.load<PageContentRevision[]>(K.revisions(pageId), []);
  }

  saveDraft(pageId: string, content: PageContent, editorName: string, note: string): PageContent {
    const id = PAGE_CONTENT_ID[pageId] || pageId;
    const draft: PageContent = { ...clone(content), updatedAt: new Date().toISOString(), updatedBy: editorName };
    localStorage.setItem(K.draft(id), JSON.stringify(draft));
    localStorage.setItem(K.status(pageId), 'draft');
    this.record(pageId, draft, 'draft', editorName, note);
    if (this.mode === 'PRODUCTION') this.pushChanges(pageId, draft, 'draft', editorName, note);
    this.emit();
    return draft;
  }

  publish(pageId: string, content: PageContent, editorName: string, note: string): PageContent {
    const id = PAGE_CONTENT_ID[pageId] || pageId;
    const published: PageContent = { ...clone(content), updatedAt: new Date().toISOString(), updatedBy: editorName };
    localStorage.setItem(K.published(id), JSON.stringify(published));
    localStorage.setItem(K.draft(id), JSON.stringify(published));
    localStorage.setItem(K.status(pageId), 'published');
    this.record(pageId, published, 'published', editorName, note);
    if (this.mode === 'PRODUCTION') this.pushChanges(pageId, published, 'published', editorName, note);
    this.emit();
    return published;
  }

  resetToSeed(pageId: string): PageContent {
    const id = PAGE_CONTENT_ID[pageId] || pageId;
    localStorage.setItem(K.published(id), JSON.stringify(INITIAL_PAGE_CONTENT[pageId]));
    localStorage.setItem(K.draft(id), JSON.stringify(INITIAL_PAGE_CONTENT[pageId]));
    localStorage.setItem(K.status(pageId), 'published');
    this.emit();
    return INITIAL_PAGE_CONTENT[pageId];
  }

  private record(pageId: string, content: PageContent, status: ContentStatus, editorName: string, note: string) {
    const revisions = this.getRevisions(pageId);
    const version = (revisions.length ? Math.max(...revisions.map((r) => r.version)) : 0) + 1;
    const rev: PageContentRevision = {
      id: `rev-${Date.now()}`,
      pageId: pageId as PageContentRevision['pageId'],
      version,
      status,
      snapshot: content,
      editedBy: editorName,
      editedAt: new Date().toISOString(),
      note
    };
    const id = PAGE_CONTENT_ID[pageId] || pageId;
    localStorage.setItem(K.revisions(id), JSON.stringify([rev, ...revisions].slice(0, 50)));
  }

  private pushChanges(pageId: string, content: PageContent, status: ContentStatus, editorName: string, note: string): void {
    // Production write-path. In this demo the backend is not live, so changes
    // are logged to make the branch explicit and testable.
    // eslint-disable-next-line no-console
    console.info('[PageContent • PRODUCTION]', {
      pageId,
      action: status === 'published' ? 'PUBLISH' : 'SAVE_DRAFT',
      editor: editorName,
      note
    });
  }
}

export const pageContentService = new PageContentService();
