import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPersistedStateStorage } from './persistentStorage';

describe('persistentStorage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces repeated writes and notifies once with the flushed key', () => {
    const storageArea = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const notifyUpdate = vi.fn();
    const storage = createPersistedStateStorage({
      debounceMs: 150,
      notifyUpdate,
      storageArea,
    });

    storage.setItem('drafts', 'first');
    storage.setItem('drafts', 'second');

    expect(storageArea.setItem).not.toHaveBeenCalled();

    vi.advanceTimersByTime(149);
    expect(storageArea.setItem).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(storageArea.setItem).toHaveBeenCalledTimes(1);
    expect(storageArea.setItem).toHaveBeenCalledWith('drafts', 'second');
    expect(notifyUpdate).toHaveBeenCalledTimes(1);
    expect(notifyUpdate).toHaveBeenCalledWith('drafts');
  });

  it('cancels a pending write when the same key is removed', () => {
    const storageArea = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const notifyUpdate = vi.fn();
    const storage = createPersistedStateStorage({
      debounceMs: 150,
      notifyUpdate,
      storageArea,
    });

    storage.setItem('drafts', 'pending');
    storage.removeItem('drafts');
    vi.advanceTimersByTime(150);

    expect(storageArea.setItem).not.toHaveBeenCalled();
    expect(storageArea.removeItem).toHaveBeenCalledWith('drafts');
    expect(notifyUpdate).toHaveBeenCalledWith('drafts');
  });
});
