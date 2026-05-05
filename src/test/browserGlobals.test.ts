import { describe, expect, it } from 'vitest';

import { resetBrowserTestEnvironment, setTestMatchMedia } from './browserEnvironment';

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

  it('provides common browser observer shims from the shared environment', () => {
    const observed = document.createElement('div');
    const intersectionObserver = new IntersectionObserver(() => {});
    const resizeObserver = new ResizeObserver(() => {});

    expect(typeof intersectionObserver.observe).toBe('function');
    expect(typeof intersectionObserver.unobserve).toBe('function');
    expect(typeof intersectionObserver.disconnect).toBe('function');
    expect(intersectionObserver.takeRecords()).toEqual([]);

    expect(typeof resizeObserver.observe).toBe('function');
    expect(typeof resizeObserver.unobserve).toBe('function');
    expect(typeof resizeObserver.disconnect).toBe('function');

    expect(() => intersectionObserver.observe(observed)).not.toThrow();
    expect(() => resizeObserver.observe(observed)).not.toThrow();
  });

  it('centralizes matchMedia overrides and resets them between tests', () => {
    setTestMatchMedia((query) => query.includes('prefers-color-scheme'));

    expect(window.matchMedia('(prefers-color-scheme: dark)').matches).toBe(true);
    expect(window.matchMedia('(hover: hover)').matches).toBe(false);

    resetBrowserTestEnvironment();

    expect(window.matchMedia('(prefers-color-scheme: dark)').matches).toBe(false);
  });
});
