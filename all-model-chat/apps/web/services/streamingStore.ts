
type Listener = () => void;

class StreamingStore {
  private content = new Map<string, string>();
  private thoughts = new Map<string, string>();
  private listeners = new Map<string, Set<Listener>>();

  updateContent(id: string, text: string) {
    const current = this.content.get(id) || '';
    this.content.set(id, current + text);
    this.notify(id);
  }

  updateThoughts(id: string, text: string) {
    const current = this.thoughts.get(id) || '';
    this.thoughts.set(id, current + text);
    this.notify(id);
  }

  getContent(id: string) {
    return this.content.get(id) || '';
  }

  getThoughts(id: string) {
    return this.thoughts.get(id) || '';
  }

  subscribe(id: string, listener: Listener) {
    if (!this.listeners.has(id)) this.listeners.set(id, new Set());
    this.listeners.get(id)!.add(listener);
    return () => this.listeners.get(id)?.delete(listener);
  }

  private notify(id: string) {
    this.listeners.get(id)?.forEach(l => l());
  }

  clear(id: string) {
    this.content.delete(id);
    this.thoughts.delete(id);
    // Don't delete listeners immediately as component unmount might happen slightly later
  }
}

export const streamingStore = new StreamingStore();
