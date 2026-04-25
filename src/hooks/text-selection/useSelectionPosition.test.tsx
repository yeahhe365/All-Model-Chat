import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSelectionPosition } from './useSelectionPosition';

const renderHook = <T,>(callback: () => T) => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const result: { current: T | null } = { current: null };
  let currentCallback = callback;

  const TestComponent = () => {
    result.current = currentCallback();
    return null;
  };

  act(() => {
    root.render(<TestComponent />);
  });

  return {
    result: result as { current: T },
    rerender: (nextCallback: () => T) => {
      currentCallback = nextCallback;
      act(() => {
        root.render(<TestComponent />);
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
};

const createRect = (overrides: Partial<DOMRect> = {}): DOMRect =>
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
    ...overrides,
  } as DOMRect);

const createToolbarRef = () => {
  const toolbarRef = { current: document.createElement('div') } as React.RefObject<HTMLDivElement>;
  toolbarRef.current!.getBoundingClientRect = () => createRect({ width: 100 });
  return toolbarRef;
};

const selectNode = (node: Node) => {
  const range = document.createRange();
  range.selectNode(node);
  range.getBoundingClientRect = () => createRect();

  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);

  act(() => {
    document.dispatchEvent(new Event('selectionchange'));
  });

  return selection;
};

afterEach(() => {
  window.getSelection()?.removeAllRanges();
  document.body.innerHTML = '';
});

describe('useSelectionPosition', () => {
  it('does not crash when the container is temporarily null', () => {
    const textNode = document.createTextNode('hello world');
    document.body.appendChild(textNode);

    const toolbarRef = createToolbarRef();

    const { unmount } = renderHook(() =>
      useSelectionPosition({
        containerRef: null as any,
        isAudioActive: false,
        toolbarRef,
      }),
    );

    const range = document.createRange();
    range.selectNodeContents(textNode);
    range.getBoundingClientRect = () => createRect();

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    expect(() => {
      act(() => {
        document.dispatchEvent(new Event('selectionchange'));
      });
    }).not.toThrow();

    unmount();
  });

  it('supports a direct HTMLElement container reference', () => {
    const host = document.createElement('div');
    const textNode = document.createTextNode('hello world');
    host.appendChild(textNode);
    document.body.appendChild(host);

    const toolbarRef = createToolbarRef();

    const { result, unmount } = renderHook(() =>
      useSelectionPosition({
        containerRef: host as any,
        isAudioActive: false,
        toolbarRef,
      }),
    );

    const range = document.createRange();
    range.selectNodeContents(textNode);
    range.getBoundingClientRect = () => createRect();

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    act(() => {
      document.dispatchEvent(new Event('selectionchange'));
    });

    expect(result.current.selectedText).toBe('hello world');
    expect(result.current.position).not.toBeNull();

    unmount();
  });

  it('copies markdown text to the clipboard on global copy', () => {
    const host = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = 'hello world';
    host.appendChild(strong);
    document.body.appendChild(host);

    const toolbarRef = createToolbarRef();
    const { result, unmount } = renderHook(() =>
      useSelectionPosition({
        containerRef: host as any,
        isAudioActive: false,
        toolbarRef,
      }),
    );

    selectNode(strong);

    expect(result.current.selectedText).toBe('**hello world**');

    const setData = vi.fn();
    const copyEvent = new Event('copy', { bubbles: true, cancelable: true });
    Object.defineProperty(copyEvent, 'clipboardData', {
      configurable: true,
      value: { setData },
    });

    act(() => {
      document.dispatchEvent(copyEvent);
    });

    expect(copyEvent.defaultPrevented).toBe(true);
    expect(setData).toHaveBeenCalledWith('text/plain', '**hello world**');

    unmount();
  });

  it('copies plain selected text on global copy when formatting preservation is disabled', () => {
    const host = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = 'hello world';
    host.appendChild(strong);
    document.body.appendChild(host);

    const toolbarRef = createToolbarRef();
    const { result, unmount } = renderHook(() =>
      useSelectionPosition({
        containerRef: host as any,
        isAudioActive: false,
        toolbarRef,
        preserveFormattingOnCopy: false,
      }),
    );

    selectNode(strong);

    expect(result.current.selectedText).toBe('**hello world**');

    const setData = vi.fn();
    const copyEvent = new Event('copy', { bubbles: true, cancelable: true });
    Object.defineProperty(copyEvent, 'clipboardData', {
      configurable: true,
      value: { setData },
    });

    act(() => {
      document.dispatchEvent(copyEvent);
    });

    expect(copyEvent.defaultPrevented).toBe(true);
    expect(setData).toHaveBeenCalledWith('text/plain', 'hello world');

    unmount();
  });

  it('notifies when global copy uses the selected markdown text', () => {
    const host = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = 'hello world';
    host.appendChild(strong);
    document.body.appendChild(host);

    const onCopySuccess = vi.fn();
    const toolbarRef = createToolbarRef();
    const { unmount } = renderHook(() =>
      useSelectionPosition({
        containerRef: host as any,
        isAudioActive: false,
        toolbarRef,
        onCopySuccess,
      }),
    );

    selectNode(strong);

    const copyEvent = new Event('copy', { bubbles: true, cancelable: true });
    Object.defineProperty(copyEvent, 'clipboardData', {
      configurable: true,
      value: { setData: vi.fn() },
    });

    act(() => {
      document.dispatchEvent(copyEvent);
    });

    expect(onCopySuccess).toHaveBeenCalledWith('**hello world**');

    unmount();
  });

  it('does not override copy while an editable field is focused', () => {
    const host = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = 'hello world';
    host.appendChild(strong);
    document.body.appendChild(host);

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    const toolbarRef = createToolbarRef();
    const { unmount } = renderHook(() =>
      useSelectionPosition({
        containerRef: host as any,
        isAudioActive: false,
        toolbarRef,
      }),
    );

    selectNode(strong);

    const setData = vi.fn();
    const copyEvent = new Event('copy', { bubbles: true, cancelable: true });
    Object.defineProperty(copyEvent, 'clipboardData', {
      configurable: true,
      value: { setData },
    });

    act(() => {
      document.dispatchEvent(copyEvent);
    });

    expect(document.activeElement).toBe(textarea);
    expect(copyEvent.defaultPrevented).toBe(false);
    expect(setData).not.toHaveBeenCalled();

    unmount();
  });

  it('clears cached selected text when selection moves outside the container', () => {
    const host = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = 'hello world';
    host.appendChild(strong);
    document.body.appendChild(host);

    const outside = document.createElement('div');
    outside.textContent = 'outside';
    document.body.appendChild(outside);

    const toolbarRef = createToolbarRef();
    const { result, unmount } = renderHook(() =>
      useSelectionPosition({
        containerRef: host as any,
        isAudioActive: false,
        toolbarRef,
      }),
    );

    selectNode(strong);
    expect(result.current.selectedText).toBe('**hello world**');

    selectNode(outside);

    expect(result.current.selectedText).toBe('');
    expect(result.current.position).toBeNull();

    unmount();
  });

  it('preserves the toolbar anchor while audio playback is active', () => {
    const host = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = 'hello world';
    host.appendChild(strong);
    document.body.appendChild(host);

    const toolbarRef = createToolbarRef();
    let isAudioActive = false;

    const { result, rerender, unmount } = renderHook(() =>
      useSelectionPosition({
        containerRef: host as any,
        isAudioActive,
        toolbarRef,
      }),
    );

    selectNode(strong);

    expect(result.current.selectedText).toBe('**hello world**');
    expect(result.current.position).not.toBeNull();

    isAudioActive = true;
    rerender(() =>
      useSelectionPosition({
        containerRef: host as any,
        isAudioActive,
        toolbarRef,
      }),
    );

    window.getSelection()?.removeAllRanges();
    act(() => {
      document.dispatchEvent(new Event('selectionchange'));
    });

    expect(result.current.selectedText).toBe('**hello world**');
    expect(result.current.position).not.toBeNull();

    unmount();
  });

  it('re-clamps the toolbar position after the toolbar ref becomes available', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 390,
    });

    const host = document.createElement('div');
    const textNode = document.createTextNode('hello world');
    host.appendChild(textNode);
    document.body.appendChild(host);

    const toolbarRef = { current: null } as { current: HTMLDivElement | null };

    const { result, rerender, unmount } = renderHook(() =>
      useSelectionPosition({
        containerRef: host as any,
        isAudioActive: false,
        toolbarRef: toolbarRef as React.RefObject<HTMLDivElement>,
      }),
    );

    const range = document.createRange();
    range.selectNodeContents(textNode);
    range.getBoundingClientRect = () =>
      createRect({
        width: 80,
        left: 300,
        right: 380,
      });

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    act(() => {
      document.dispatchEvent(new Event('selectionchange'));
    });

    expect(result.current.position).toEqual({ top: 50, left: 340 });

    const toolbar = document.createElement('div');
    toolbar.getBoundingClientRect = () => createRect({ width: 280, height: 44 });
    toolbarRef.current = toolbar;

    rerender(() =>
      useSelectionPosition({
        containerRef: host as any,
        isAudioActive: false,
        toolbarRef: toolbarRef as React.RefObject<HTMLDivElement>,
      }),
    );

    expect(result.current.position).toEqual({ top: 50, left: 240 });

    unmount();
  });
});
