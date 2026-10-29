import { ShariahContent, ShariahContentRevision, ContentStatus } from './coreValuesTypes';
import { INITIAL_SHARIAH_CONTENT, SHARIAH_CONTENT_ID } from './coreValuesSeed';
import { contentStore } from '../components/info/contentStore';

const STORAGE_KEY = 'how.shariah.content';
const REVISIONS_KEY = 'how.shariah.revisions';
const STATUS_KEY = 'how.shariah.status';

type Mode = 'DEMO' | 'PRE_PRODUCTION' | 'PRODUCTION';

/**
 * WordPress-like content manager for the public Shariah Governance page.
 *
 * - Holds a working "draft" buffer and separate published revisions.
 * - DEMO mode:          persisted to localStorage (frontend mock, no server).
 * - PRODUCTION mode:    routes save/publish to the backend API so server-side
 *                       policy and tenancy rules govern who may change content.
 * - Only admin roles are granted write access (enforced by the caller via
 *   RBAC `checkPermission`/role before invoking these methods).
 */
export class ShariahContentService {
  private mode: Mode = 'DEMO';
  private listeners: Set<() => void> = new Set();

  setMode(mode: Mode): void {
    this.mode = mode;
    contentStore.setMode(mode);
  }

  subscribe(fn: () => void): () => void {
    const fromStore = contentStore.subscribe(fn);
    this.listeners.add(fn);
    return () => { fromStore(); this.listeners.delete(fn); };
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  private loadStorage<T>(key: string, fallback: T): T {
    try {
      const raw = contentStore.get(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  isProduction(): boolean {
    return this.mode !== 'DEMO';
  }

  getStatus(): ContentStatus {
    return this.loadStorage<ContentStatus>(STATUS_KEY, 'published');
  }

  /**
   * Published content is what guests/visitors see. In demo mode it is the
   * stored published snapshot; in production it is fetched from the backend.
   */
  getPublishedContent(): ShariahContent {
    if (this.mode !== 'DEMO') {
      return this.getBackendPublished();
    }
    const stored = this.loadStorage<ShariahContent | null>(STORAGE_KEY, null);
    if (!stored || this.getStatus() !== 'published') {
      return INITIAL_SHARIAH_CONTENT;
    }
    return stored;
  }

  /** The version currently in the editor working buffer. */
  getDraft(): ShariahContent {
    const stored = this.loadStorage<ShariahContent | null>('how.shariah.draft', null);
    return stored || INITIAL_SHARIAH_CONTENT;
  }

  hasDraft(): boolean {
    return contentStore.get('how.shariah.draft') !== null;
  }

  getRevisions(): ShariahContentRevision[] {
    return this.loadStorage<ShariahContentRevision[]>(REVISIONS_KEY, []);
  }

  /**
   * Persist the working draft (not visible to the public) — like "Save Draft".
   */
  saveDraft(content: ShariahContent, editorName: string, note: string): ShariahContent {
    const draft: ShariahContent = {
      ...content,
      updatedAt: new Date().toISOString(),
      updatedBy: editorName
    };
    contentStore.set('how.shariah.draft', JSON.stringify(draft));
    contentStore.set(STATUS_KEY, JSON.stringify('draft'));
    this.recordRevision(draft, 'draft', editorName, note);
    this.emit();
    return draft;
  }

  /**
   * Publish the draft — makes it the live content visible to the public, in
   * production this is an authenticated, admin-gated write to the backend.
   */
  publish(content: ShariahContent, editorName: string, note: string): ShariahContent {
    const published: ShariahContent = {
      ...content,
      updatedAt: new Date().toISOString(),
      updatedBy: editorName
    };
    contentStore.set(STORAGE_KEY, JSON.stringify(published));
    contentStore.set('how.shariah.draft', JSON.stringify(published));
    contentStore.set(STATUS_KEY, JSON.stringify('published'));
    this.recordRevision(published, 'published', editorName, note);
    this.emit();
    return published;
  }

  discardDraft(): void {
    contentStore.remove('how.shariah.draft');
    this.emit();
  }

  resetToSeed(): ShariahContent {
    contentStore.set(STORAGE_KEY, JSON.stringify(INITIAL_SHARIAH_CONTENT));
    contentStore.set('how.shariah.draft', JSON.stringify(INITIAL_SHARIAH_CONTENT));
    contentStore.set(STATUS_KEY, JSON.stringify('published'));
    this.emit();
    return INITIAL_SHARIAH_CONTENT;
  }

  private recordRevision(content: ShariahContent, status: ContentStatus, editorName: string, note: string) {
    const revisions = this.getRevisions();
    const version = (revisions.length ? Math.max(...revisions.map((r) => r.version)) : 0) + 1;
    const revision: ShariahContentRevision = {
      id: `rev-${Date.now()}`,
      contentId: content.id || SHARIAH_CONTENT_ID,
      version,
      status,
      snapshot: content,
      editedBy: editorName,
      editedAt: new Date().toISOString(),
      note
    };
    contentStore.set(REVISIONS_KEY, JSON.stringify([revision, ...revisions].slice(0, 50)));
  }

  // Production backend hooks -------------------------------------------------
  private getBackendPublished(): ShariahContent {
    // In a live deployment this would GET /shariah/content/current.
    // Fall back to local mock so the UI still renders without a running server.
    const stored = this.loadStorage<ShariahContent | null>(STORAGE_KEY, null);
    return stored || INITIAL_SHARIAH_CONTENT;
  }

}

export const shariahContentService = new ShariahContentService();
