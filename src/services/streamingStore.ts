type Listener = () => void;
type NotifyFrameHandle = ReturnType<typeof requestAnimationFrame>;

const STREAM_ENTRY_TTL_MS = 5 * 60_000;

class StreamingStore {
  private content = new Map<string, string>();
  private thoughts = new Map<string, string>();
  private listeners = new Map<string, Set<Listener>>();
  private touchedAt = new Map<string, number>();
  private pendingNotifyIds = new Set<string>();
  private notifyFrame: NotifyFrameHandle | null = null;

  private touch(id: string, now = Date.now()) {
    this.touchedAt.set(id, now);
  }

  updateContent(id: string, text: string) {
    this.sweepExpiredEntries();
    const current = this.content.get(id) || '';
    this.content.set(id, current + text);
    this.touch(id);
    this.notify(id);
  }

  updateThoughts(id: string, text: string) {
    this.sweepExpiredEntries();
    const current = this.thoughts.get(id) || '';
    this.thoughts.set(id, current + text);
    this.touch(id);
    this.notify(id);
  }

  getContent(id: string) {
    this.sweepExpiredEntries();
    if (this.content.has(id) || this.thoughts.has(id)) {
      this.touch(id);
    }
    return this.content.get(id) || '';
  }

  getThoughts(id: string) {
    this.sweepExpiredEntries();
    if (this.content.has(id) || this.thoughts.has(id)) {
      this.touch(id);
    }
    return this.thoughts.get(id) || '';
  }

  subscribe(id: string, listener: Listener) {
    this.sweepExpiredEntries();
    if (!this.listeners.has(id)) this.listeners.set(id, new Set());
    this.listeners.get(id)!.add(listener);
    this.touch(id);
    return () => {
      const listeners = this.listeners.get(id);
      listeners?.delete(listener);
      if (listeners && listeners.size === 0) {
        this.touch(id);
      }
    };
  }

  private notify(id: string) {
    this.pendingNotifyIds.add(id);

    if (this.notifyFrame !== null) {
      return;
    }

    this.notifyFrame = requestAnimationFrame(() => {
      this.notifyFrame = null;
      const ids = Array.from(this.pendingNotifyIds);
      this.pendingNotifyIds.clear();

      ids.forEach((pendingId) => {
        this.listeners.get(pendingId)?.forEach((listener) => listener());
      });
    });
  }

  clear(id: string) {
    this.content.delete(id);
    this.thoughts.delete(id);
    this.touchedAt.delete(id);
    this.pendingNotifyIds.delete(id);
    if (this.pendingNotifyIds.size === 0 && this.notifyFrame !== null) {
      cancelAnimationFrame(this.notifyFrame);
      this.notifyFrame = null;
    }
    // Don't delete listeners immediately as component unmount might happen slightly later
  }

  sweepExpiredEntries(now = Date.now()) {
    for (const [id, touchedAt] of this.touchedAt.entries()) {
      const listeners = this.listeners.get(id);
      const hasActiveListeners = !!listeners && listeners.size > 0;
      const isExpired = now - touchedAt > STREAM_ENTRY_TTL_MS;

      if (!isExpired || hasActiveListeners) {
        continue;
      }

      this.content.delete(id);
      this.thoughts.delete(id);
      this.touchedAt.delete(id);

      if (listeners?.size === 0) {
        this.listeners.delete(id);
      }
    }
  }
}

export const streamingStore = new StreamingStore();
