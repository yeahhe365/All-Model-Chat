import { describe, expect, it } from 'vitest';

describe('browser-like globals in test environment', () => {
  it('provides a working localStorage implementation on globalThis', () => {
    expect(typeof globalThis.localStorage?.getItem).toBe('function');
    expect(typeof globalThis.localStorage?.setItem).toBe('function');
    expect(typeof globalThis.localStorage?.clear).toBe('function');

    globalThis.localStorage.clear();
    globalThis.localStorage.setItem('test-key', 'test-value');

    expect(globalThis.localStorage.getItem('test-key')).toBe('test-value');
  });

  it('provides indexedDB on globalThis', () => {
    expect(typeof globalThis.indexedDB?.open).toBe('function');
  });
});
