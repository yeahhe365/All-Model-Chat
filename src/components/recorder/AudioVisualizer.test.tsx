import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioVisualizer } from './AudioVisualizer';

describe('AudioVisualizer', () => {
  const renderer = setupTestRenderer();
  let scheduledFrames: Map<number, FrameRequestCallback>;
  let nextFrameId: number;
  let getComputedStyleSpy: ReturnType<typeof vi.spyOn>;
  let getContextSpy: ReturnType<typeof vi.spyOn>;
  let closeAudioContext: ReturnType<typeof vi.fn>;

  const flushNextFrame = () => {
    const nextFrame = scheduledFrames.entries().next().value as [number, FrameRequestCallback] | undefined;
    if (!nextFrame) return false;

    const [frameId, callback] = nextFrame;
    scheduledFrames.delete(frameId);

    act(() => {
      callback(16);
    });

    return true;
  };

  beforeEach(() => {
    vi.useFakeTimers();

    scheduledFrames = new Map<number, FrameRequestCallback>();
    nextFrameId = 0;
    closeAudioContext = vi.fn().mockResolvedValue(undefined);

    getComputedStyleSpy = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: (propertyName: string) => (propertyName === '--theme-bg-accent' ? '#22c55e' : ''),
    } as CSSStyleDeclaration);

    getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      beginPath: vi.fn(),
      clearRect: vi.fn(),
      fill: vi.fn(),
      roundRect: vi.fn(),
      set fillStyle(_value: string) {},
    } as unknown as CanvasRenderingContext2D);

    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        const frameId = ++nextFrameId;
        scheduledFrames.set(frameId, callback);
        return frameId;
      }),
    );

    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn((frameId: number) => {
        scheduledFrames.delete(frameId);
      }),
    );

    function FakeAudioContext() {
      return {
        close: closeAudioContext,
        createAnalyser: () => ({
          connect: vi.fn(),
          disconnect: vi.fn(),
          fftSize: 0,
          frequencyBinCount: 32,
          getByteFrequencyData: (array: Uint8Array) => {
            array.fill(128);
          },
          smoothingTimeConstant: 0,
        }),
        createMediaStreamSource: () => ({
          connect: vi.fn(),
          disconnect: vi.fn(),
        }),
      };
    }

    vi.stubGlobal('AudioContext', FakeAudioContext);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    getComputedStyleSpy.mockRestore();
    getContextSpy.mockRestore();
  });

  it('reads the theme accent color once before drawing animation frames', () => {
    renderer.root.render(<AudioVisualizer stream={{} as MediaStream} />);

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(getComputedStyleSpy).toHaveBeenCalledTimes(1);

    flushNextFrame();
    flushNextFrame();
    flushNextFrame();

    expect(getComputedStyleSpy).toHaveBeenCalledTimes(1);
  });
});
