/* eslint-disable react-hooks/refs */
import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { useWindowContext } from '../../contexts/WindowContext';
import { convertHtmlToMarkdown } from '../../utils/htmlToMarkdown';
import { copySelectionTextToClipboardEvent } from './selectionClipboard';
import {
  dispatchLiveArtifactClearSelection,
  isLiveArtifactSelectionDetail,
  LIVE_ARTIFACT_SELECTION_EVENT,
} from './liveArtifactSelection';

type ContainerRefLike = React.RefObject<HTMLElement> | HTMLElement | null;
type SelectionBounds = Pick<DOMRect, 'top' | 'left' | 'width' | 'height' | 'bottom'>;

interface UseSelectionPositionProps {
  containerRef: ContainerRefLike;
  isAudioActive: boolean;
  toolbarRef: React.RefObject<HTMLDivElement>;
  onCopySuccess?: (text: string) => void;
  preserveFormattingOnCopy?: boolean;
}

const resolveContainerElement = (containerRef: ContainerRefLike): HTMLElement | null => {
  if (!containerRef) return null;
  if ('current' in containerRef) return containerRef.current;
  return containerRef;
};

const isEditableElement = (element: Element | null): boolean => {
  if (!element) return false;

  const HTMLElementCtor = element.ownerDocument.defaultView?.HTMLElement ?? HTMLElement;
  if (!(element instanceof HTMLElementCtor)) return false;
  const htmlElement = element as HTMLElement;

  return htmlElement.tagName === 'INPUT' || htmlElement.tagName === 'TEXTAREA' || htmlElement.isContentEditable;
};

const SELECTION_EXCLUDED_SELECTOR = '.select-none, [data-selection-copy="exclude"]';

const cloneSelectionContent = (range: Range, targetDocument: Document): HTMLDivElement => {
  const container = targetDocument.createElement('div');
  container.appendChild(range.cloneContents());

  container.querySelectorAll(SELECTION_EXCLUDED_SELECTOR).forEach((element) => {
    element.remove();
  });

  return container;
};

const getPlainSelectionText = (container: HTMLElement): string =>
  (container.innerText || container.textContent || '').trim();

const getElementForNode = (node: Node): Element | null => {
  if (node.nodeType === Node.ELEMENT_NODE) {
    return node as Element;
  }

  return node.parentElement;
};

const getContainingCodeBlock = (node: Node): Element | null => {
  const element = getElementForNode(node);
  return element?.closest('pre, code') ?? null;
};

const isCodeSelection = (range: Range): boolean => {
  const startCodeBlock = getContainingCodeBlock(range.startContainer);
  const endCodeBlock = getContainingCodeBlock(range.endContainer);

  return Boolean(
    startCodeBlock &&
    endCodeBlock &&
    (startCodeBlock === endCodeBlock || startCodeBlock.contains(endCodeBlock) || endCodeBlock.contains(startCodeBlock)),
  );
};

export const useSelectionPosition = ({
  containerRef,
  isAudioActive,
  toolbarRef,
  onCopySuccess,
  preserveFormattingOnCopy = true,
}: UseSelectionPositionProps) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [selectedCopyText, setSelectedCopyText] = useState('');
  const [toolbarElement, setToolbarElement] = useState<HTMLDivElement | null>(null);
  const [toolbarSize, setToolbarSize] = useState<{ width: number; height: number } | null>(null);
  const selectionBoundsRef = useRef<SelectionBounds | null>(null);
  const selectedTextRef = useRef('');
  const selectedPlainTextRef = useRef('');
  const toolbarNode = toolbarRef.current;
  const { document: targetDocument, window: targetWindow } = useWindowContext();

  const clearSelectionState = useCallback(() => {
    setPosition(null);
    selectionBoundsRef.current = null;
    selectedTextRef.current = '';
    selectedPlainTextRef.current = '';
    setSelectedText('');
    setSelectedCopyText('');
  }, []);

  // Monitor selection changes
  useEffect(() => {
    const handleSelectionChange = () => {
      if (isAudioActive) {
        return;
      }

      const selection = targetWindow.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) {
        clearSelectionState();
        return;
      }

      const range = selection.getRangeAt(0);
      const commonAncestor = range.commonAncestorContainer;

      // Context checks
      const containerEl = resolveContainerElement(containerRef);
      if (containerEl && !containerEl.contains(commonAncestor)) {
        clearSelectionState();
        return;
      }

      const targetElement =
        commonAncestor.nodeType === 1 ? (commonAncestor as HTMLElement) : commonAncestor.parentElement;
      if (isEditableElement(targetElement)) {
        clearSelectionState();
        return;
      }

      // Extract content
      const container = cloneSelectionContent(range, targetDocument);
      const html = container.innerHTML;
      const rangeIsCodeSelection = isCodeSelection(range);
      const cleanedPlainText = getPlainSelectionText(container);
      const plainText = rangeIsCodeSelection ? (selection.toString() || cleanedPlainText).trim() : cleanedPlainText;
      const text = rangeIsCodeSelection ? plainText : convertHtmlToMarkdown(html).trim();

      if (!text) {
        clearSelectionState();
        return;
      }

      const rect = range.getBoundingClientRect();
      selectionBoundsRef.current = rect;
      selectedTextRef.current = text;
      selectedPlainTextRef.current = plainText;

      setPosition({
        top: rect.top - 50,
        left: rect.left + rect.width / 2,
      });
      setSelectedText(text);
      setSelectedCopyText(preserveFormattingOnCopy ? text : plainText || text);
    };

    targetDocument.addEventListener('selectionchange', handleSelectionChange);
    targetDocument.addEventListener('mouseup', handleSelectionChange);
    targetDocument.addEventListener('keyup', handleSelectionChange);

    return () => {
      targetDocument.removeEventListener('selectionchange', handleSelectionChange);
      targetDocument.removeEventListener('mouseup', handleSelectionChange);
      targetDocument.removeEventListener('keyup', handleSelectionChange);
    };
  }, [clearSelectionState, containerRef, isAudioActive, preserveFormattingOnCopy, targetDocument, targetWindow]);

  useEffect(() => {
    const handleLiveArtifactSelection = (event: Event) => {
      if (isAudioActive) {
        return;
      }

      const detail = (event as CustomEvent<unknown>).detail;
      if (!isLiveArtifactSelectionDetail(detail)) {
        clearSelectionState();
        return;
      }

      const copyText = detail.copyText || detail.text;
      selectionBoundsRef.current = detail.rect;
      selectedTextRef.current = detail.text;
      selectedPlainTextRef.current = copyText;
      setPosition({
        top: detail.rect.top - 50,
        left: detail.rect.left + detail.rect.width / 2,
      });
      setSelectedText(detail.text);
      setSelectedCopyText(copyText);
    };

    targetWindow.addEventListener(LIVE_ARTIFACT_SELECTION_EVENT, handleLiveArtifactSelection);
    return () => targetWindow.removeEventListener(LIVE_ARTIFACT_SELECTION_EVENT, handleLiveArtifactSelection);
  }, [clearSelectionState, isAudioActive, targetWindow]);

  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      if (isAudioActive) {
        return;
      }

      const activeElement = targetDocument.activeElement;
      if (isEditableElement(activeElement)) {
        return;
      }

      const text = preserveFormattingOnCopy
        ? selectedTextRef.current
        : selectedPlainTextRef.current || selectedTextRef.current;
      if (copySelectionTextToClipboardEvent(e, text)) {
        onCopySuccess?.(text);
      }
    };

    targetDocument.addEventListener('copy', handleCopy);
    return () => targetDocument.removeEventListener('copy', handleCopy);
  }, [isAudioActive, onCopySuccess, preserveFormattingOnCopy, targetDocument]);

  useLayoutEffect(() => {
    if (!position) {
      if (toolbarElement !== null) {
        setToolbarElement(null);
      }
      if (toolbarSize !== null) {
        setToolbarSize(null);
      }
      return;
    }

    if (toolbarNode !== toolbarElement) {
      setToolbarElement(toolbarNode);
    }
  }, [position, toolbarElement, toolbarNode, toolbarSize]);

  useLayoutEffect(() => {
    if (!position || !toolbarElement) {
      return;
    }

    const updateToolbarSize = () => {
      const rect = toolbarElement.getBoundingClientRect();
      const nextSize = {
        width: rect.width,
        height: rect.height,
      };

      setToolbarSize((prev) => {
        if (prev && prev.width === nextSize.width && prev.height === nextSize.height) {
          return prev;
        }

        return nextSize;
      });
    };

    updateToolbarSize();

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => updateToolbarSize()) : null;

    resizeObserver?.observe(toolbarElement);
    targetWindow.addEventListener('resize', updateToolbarSize);
    targetWindow.visualViewport?.addEventListener('resize', updateToolbarSize);
    targetWindow.visualViewport?.addEventListener('scroll', updateToolbarSize);

    return () => {
      resizeObserver?.disconnect();
      targetWindow.removeEventListener('resize', updateToolbarSize);
      targetWindow.visualViewport?.removeEventListener('resize', updateToolbarSize);
      targetWindow.visualViewport?.removeEventListener('scroll', updateToolbarSize);
    };
  }, [position, toolbarElement, targetWindow]);

  const clampedPosition = useMemo(() => {
    if (!position || !toolbarSize) return position;

    const { width, height } = toolbarSize;
    const viewportWidth = targetWindow.innerWidth;
    const viewportHeight = targetWindow.innerHeight;
    const padding = 10;

    let correctedLeft = position.left;
    let correctedTop = position.top;
    const halfWidth = width / 2;

    // Horizontal
    if (correctedLeft - halfWidth < padding) correctedLeft = padding + halfWidth;
    if (correctedLeft + halfWidth > viewportWidth - padding) correctedLeft = viewportWidth - padding - halfWidth;

    // Vertical
    if (correctedTop < padding) {
      if (selectionBoundsRef.current) {
        const belowPos = selectionBoundsRef.current.bottom + 10;
        if (belowPos + height < viewportHeight - padding) {
          correctedTop = belowPos;
        } else {
          correctedTop = padding;
        }
      } else {
        correctedTop = padding;
      }
    }
    if (correctedTop + height > viewportHeight - padding) {
      correctedTop = viewportHeight - padding - height;
    }

    if (Math.abs(correctedLeft - position.left) > 1 || Math.abs(correctedTop - position.top) > 1) {
      return { left: correctedLeft, top: correctedTop };
    }

    return position;
  }, [position, toolbarSize, targetWindow.innerHeight, targetWindow.innerWidth]);

  const clearSelection = () => {
    targetWindow.getSelection()?.removeAllRanges();
    dispatchLiveArtifactClearSelection(targetWindow);
    clearSelectionState();
  };

  return { position: clampedPosition, setPosition, selectedText, selectedCopyText, clearSelection };
};
