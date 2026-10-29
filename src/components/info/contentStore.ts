import { apiClient } from '../../services/apiClient';

type Mode = 'DEMO' | 'PRE_PRODUCTION' | 'PRODUCTION';

/**
 * Where the public site's editable content lives. In the demo it is this browser's localStorage. Elsewhere it is
 * the server (/site-content), so what Super Admin publishes is what every visitor sees: reads come from a copy
 * loaded from the server, and writes go to that copy and then to the server, batched per save.
 */
class ContentStore {
  private mode: Mode = 'DEMO';
  private cache = new Map<string, string>();
  private pending: Record<string, unknown> = {};
  private flushing: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();
  private loaded: 'none' | 'public' | 'editor' = 'none';

  get live(): boolean {
    return this.mode !== 'DEMO';
  }

  setMode(mode: Mode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    this.cache.clear();
    this.loaded = 'none';
    if (this.live) void this.load(false);
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Loads the content from the server; editors also get drafts and revision history. */
  async load(editor: boolean): Promise<void> {
    if (!this.live || this.loaded === 'editor' || (this.loaded === 'public' && !editor)) return;
    try {
      const entries = await apiClient.getSiteContent(editor);
      for (const [key, value] of Object.entries(entries)) this.cache.set(key, JSON.stringify(value));
      this.loaded = editor ? 'editor' : 'public';
      this.listeners.forEach((fn) => fn());
    } catch {
      // Visitors then see the built-in content; editors see an error when they save.
    }
  }

  get(key: string): string | null {
    if (!this.live) return localStorage.getItem(key);
    return this.cache.get(key) ?? null;
  }

  set(key: string, raw: string): void {
    if (!this.live) { localStorage.setItem(key, raw); return; }
    this.cache.set(key, raw);
    // Older saves stored a bare word (e.g. a status) rather than JSON.
    let value: unknown = raw;
    try { value = JSON.parse(raw); } catch { /* keep the text */ }
    this.queue(key, value);
  }

  remove(key: string): void {
    if (!this.live) { localStorage.removeItem(key); return; }
    this.cache.delete(key);
    this.queue(key, null);
  }

  // One request per save: a publish writes several keys in the same tick.
  private queue(key: string, value: unknown): void {
    this.pending[key] = value;
    if (this.flushing) return;
    this.flushing = setTimeout(() => {
      const entries = this.pending;
      this.pending = {};
      this.flushing = null;
      apiClient.saveSiteContent(entries).catch((cause) => {
        window.alert(`The content was not saved on the server: ${cause instanceof Error ? cause.message : 'unknown error'}. Reload the page before editing again.`);
      });
    }, 0);
  }
}

export const contentStore = new ContentStore();
