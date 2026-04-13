import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { useSelectionPosition } from './useSelectionPosition';

const renderHook = <T,>(callback: () => T) => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const result: { current: T | null } = { current: null };

  const TestComponent = () => {
    result.current = callback();
    return null;
  };

  act(() => {
    root.render(<TestComponent />);
  });

  return {
    result: result as { current: T },
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
};

describe('useSelectionPosition', () => {
  it('does not crash when the container is temporarily null', () => {
    const textNode = document.createTextNode('hello world');
    document.body.appendChild(textNode);

    const toolbarRef = { current: document.createElement('div') } as React.RefObject<HTMLDivElement>;
    toolbarRef.current!.getBoundingClientRect = () =>
      ({
        width: 100,
        height: 20,
        top: 0,
        left: 0,
        right: 100,
        bottom: 20,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect);

    const { unmount } = renderHook(() =>
      useSelectionPosition({
        containerRef: null as any,
        isAudioActive: false,
        toolbarRef,
      }),
    );

    const range = document.createRange();
    range.selectNodeContents(textNode);
    range.getBoundingClientRect = () =>
      ({
        width: 50,
        height: 20,
        top: 100,
        left: 200,
        right: 250,
        bottom: 120,
        x: 200,
        y: 100,
        toJSON: () => ({}),
      } as DOMRect);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    expect(() => {
      act(() => {
        document.dispatchEvent(new Event('selectionchange'));
      });
    }).not.toThrow();

    selection?.removeAllRanges();
    unmount();
    textNode.remove();
  });

  it('supports a direct HTMLElement container reference', () => {
    const host = document.createElement('div');
    const textNode = document.createTextNode('hello world');
    host.appendChild(textNode);
    document.body.appendChild(host);

    const toolbarRef = { current: document.createElement('div') } as React.RefObject<HTMLDivElement>;
    toolbarRef.current!.getBoundingClientRect = () =>
      ({
        width: 100,
        height: 20,
        top: 0,
        left: 0,
        right: 100,
        bottom: 20,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect);

    const { result, unmount } = renderHook(() =>
      useSelectionPosition({
        containerRef: host as any,
        isAudioActive: false,
        toolbarRef,
      }),
    );

    const range = document.createRange();
    range.selectNodeContents(textNode);
    range.getBoundingClientRect = () =>
      ({
        width: 50,
        height: 20,
        top: 100,
        left: 200,
        right: 250,
        bottom: 120,
        x: 200,
        y: 100,
        toJSON: () => ({}),
      } as DOMRect);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    act(() => {
      document.dispatchEvent(new Event('selectionchange'));
    });

    expect(result.current.selectedText).toBe('hello world');
    expect(result.current.position).not.toBeNull();

    selection?.removeAllRanges();
    unmount();
    host.remove();
  });
});
