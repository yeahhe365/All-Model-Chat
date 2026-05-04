import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectUrlManager } from './objectUrlManager';

describe('ObjectUrlManager', () => {
  const blob = new Blob(['preview'], { type: 'text/plain' });
  let createObjectUrl: ReturnType<typeof vi.fn<(blob: Blob) => string>>;
  let revokeObjectUrl: ReturnType<typeof vi.fn<(url: string) => void>>;
  let manager: ObjectUrlManager;

  beforeEach(() => {
    let nextUrlId = 1;
    createObjectUrl = vi.fn((_: Blob) => `blob:preview-${nextUrlId++}`);
    revokeObjectUrl = vi.fn();
    manager = new ObjectUrlManager({ createObjectUrl, revokeObjectUrl });
  });

  it('releases the previous owner URL when an owner acquires a replacement', () => {
    const firstUrl = manager.acquire(blob, { ownerId: 'recording-preview' });
    const secondUrl = manager.acquire(blob, { ownerId: 'recording-preview' });

    expect(firstUrl).toBe('blob:preview-1');
    expect(secondUrl).toBe('blob:preview-2');
    expect(revokeObjectUrl).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:preview-1');
  });

  it('revokes shared URLs only after every reference is released', () => {
    const url = manager.acquire(blob, { key: 'file-1' });
    const sameUrl = manager.acquire(blob, { key: 'file-1' });

    manager.release(url);

    expect(sameUrl).toBe(url);
    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).not.toHaveBeenCalled();

    manager.release(sameUrl);

    expect(revokeObjectUrl).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith(url);
  });

  it('can release all URLs owned by a component or session', () => {
    const ownedUrl = manager.acquire(blob, { ownerId: 'session-a' });
    const otherUrl = manager.acquire(blob, { ownerId: 'session-b' });

    manager.releaseOwner('session-a');

    expect(revokeObjectUrl).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith(ownedUrl);
    expect(manager.has(otherUrl)).toBe(true);
  });
});
