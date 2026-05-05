type MatchMediaResolver = (query: string) => boolean;

let matchMediaResolver: MatchMediaResolver = () => false;
let objectUrlId = 0;

const createMemoryStorage = (): Storage => {
  const storage = new Map<string, string>();

  return {
    get length() {
      return storage.size;
    },
    clear() {
      storage.clear();
    },
    getItem(key: string) {
      return storage.has(key) ? storage.get(key)! : null;
    },
    key(index: number) {
      return Array.from(storage.keys())[index] ?? null;
    },
    removeItem(key: string) {
      storage.delete(key);
    },
    setItem(key: string, value: string) {
      storage.set(String(key), String(value));
    },
  };
};

class TestIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null;
  readonly rootMargin: string;
  readonly thresholds: ReadonlyArray<number>;
  private readonly observedElements = new Set<Element>();

  constructor(
    private readonly callback: IntersectionObserverCallback,
    options: IntersectionObserverInit = {},
  ) {
    this.root = options.root ?? null;
    this.rootMargin = options.rootMargin ?? '0px';
    this.thresholds = Array.isArray(options.threshold) ? options.threshold : [options.threshold ?? 0];
  }

  observe(target: Element) {
    this.observedElements.add(target);
    queueMicrotask(() => {
      if (!this.observedElements.has(target)) {
        return;
      }

      this.emit([
        {
          boundingClientRect: target.getBoundingClientRect(),
          intersectionRatio: 1,
          intersectionRect: target.getBoundingClientRect(),
          isIntersecting: true,
          rootBounds: null,
          target,
          time: performance.now(),
        } as IntersectionObserverEntry,
      ]);
    });
  }

  unobserve(target: Element) {
    this.observedElements.delete(target);
  }

  disconnect() {
    this.observedElements.clear();
  }

  takeRecords() {
    return [];
  }

  emit(entries: IntersectionObserverEntry[]) {
    this.callback(entries, this);
  }
}

class TestResizeObserver implements ResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}

  observe() {}

  unobserve() {}

  disconnect() {}

  emit(entries: ResizeObserverEntry[]) {
    this.callback(entries, this);
  }
}

const defineBrowserGlobal = <K extends keyof typeof globalThis>(key: K, value: (typeof globalThis)[K]) => {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value,
  });

  if (typeof window !== 'undefined') {
    Object.defineProperty(window, key, {
      configurable: true,
      writable: true,
      value,
    });
  }
};

const createMatchMedia =
  () =>
  (query: string): MediaQueryList => ({
    matches: matchMediaResolver(query),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });

export const setTestMatchMedia = (resolver: MatchMediaResolver | boolean) => {
  matchMediaResolver = typeof resolver === 'function' ? resolver : () => resolver;
};

export const installBrowserTestEnvironment = () => {
  if (typeof globalThis !== 'undefined') {
    Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
      configurable: true,
      writable: true,
      value: true,
    });
  }

  if (typeof window !== 'undefined') {
    const localStorage = createMemoryStorage();
    const sessionStorage = createMemoryStorage();

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: localStorage,
    });

    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: sessionStorage,
    });

    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: localStorage,
    });

    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: sessionStorage,
    });
  }

  defineBrowserGlobal('matchMedia', createMatchMedia() as typeof matchMedia);
  defineBrowserGlobal('IntersectionObserver', TestIntersectionObserver as unknown as typeof IntersectionObserver);
  defineBrowserGlobal('ResizeObserver', TestResizeObserver as unknown as typeof ResizeObserver);

  if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: () => {},
    });
  }

  if (typeof URL !== 'undefined') {
    if (!URL.createObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        writable: true,
        value: () => `blob:test-object-url-${++objectUrlId}`,
      });
    }

    if (!URL.revokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        writable: true,
        value: () => {},
      });
    }
  }
};

export const resetBrowserTestEnvironment = () => {
  matchMediaResolver = () => false;
  objectUrlId = 0;

  if (typeof globalThis.localStorage?.clear === 'function') {
    globalThis.localStorage.clear();
  }

  if (typeof globalThis.sessionStorage?.clear === 'function') {
    globalThis.sessionStorage.clear();
  }
};
