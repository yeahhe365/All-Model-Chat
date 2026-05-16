import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createManagedObjectUrl, releaseManagedObjectUrl, releaseManagedObjectUrlsByOwner } from './objectUrlManager';

describe('ObjectUrlManager', () => {
  const blob = new Blob(['preview'], { type: 'text/plain' });
  let createObjectUrl: ReturnType<typeof vi.fn<(blob: Blob) => string>>;
  let revokeObjectUrl: ReturnType<typeof vi.fn<(url: string) => void>>;
  let createdUrls: string[];

  beforeEach(() => {
    let nextUrlId = 1;
    createdUrls = [];
    createObjectUrl = vi.fn((_: Blob) => `blob:preview-${nextUrlId++}`);
    revokeObjectUrl = vi.fn();
    vi.spyOn(URL, 'createObjectURL').mockImplementation((value) => {
      if (!(value instanceof Blob)) {
        throw new Error('Expected object URL source to be a Blob');
      }
      const url = createObjectUrl(value);
      createdUrls.push(url);
      return url;
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revokeObjectUrl);
  });

  afterEach(() => {
    for (const url of createdUrls) {
      releaseManagedObjectUrl(url);
    }
    vi.restoreAllMocks();
  });

  it('releases the previous owner URL when an owner acquires a replacement', () => {
    const firstUrl = createManagedObjectUrl(blob, { ownerId: 'recording-preview' });
    const secondUrl = createManagedObjectUrl(blob, { ownerId: 'recording-preview' });

    expect(firstUrl).toBe('blob:preview-1');
    expect(secondUrl).toBe('blob:preview-2');
    expect(revokeObjectUrl).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:preview-1');
  });

  it('revokes shared URLs only after every reference is released', () => {
    const url = createManagedObjectUrl(blob, { key: 'file-1' });
    const sameUrl = createManagedObjectUrl(blob, { key: 'file-1' });

    releaseManagedObjectUrl(url);

    expect(sameUrl).toBe(url);
    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).not.toHaveBeenCalled();

    releaseManagedObjectUrl(sameUrl);

    expect(revokeObjectUrl).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith(url);
  });

  it('can release all URLs owned by a component or session', () => {
    const ownedUrl = createManagedObjectUrl(blob, { ownerId: 'session-a' });
    const otherUrl = createManagedObjectUrl(blob, { ownerId: 'session-b' });

    releaseManagedObjectUrlsByOwner('session-a');

    expect(revokeObjectUrl).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith(ownedUrl);

    releaseManagedObjectUrl(otherUrl);

    expect(revokeObjectUrl).toHaveBeenCalledTimes(2);
    expect(revokeObjectUrl).toHaveBeenLastCalledWith(otherUrl);
  });
});
