
import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useWindowContext } from '../../contexts/useWindowContext';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  contentClassName?: string;
  backdropClassName?: string;
  noPadding?: boolean;
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const getFocusableElements = (container: HTMLElement | null) => {
  if (!container) return [] as HTMLElement[];

  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true'
  );
};

const modalStacks = new WeakMap<Document, string[]>();

const getModalStack = (targetDocument: Document) => {
  const existingStack = modalStacks.get(targetDocument);
  if (existingStack) return existingStack;

  const nextStack: string[] = [];
  modalStacks.set(targetDocument, nextStack);
  return nextStack;
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  contentClassName = '',
  backdropClassName = 'bg-black bg-opacity-60 backdrop-blur-sm',
  noPadding = false,
}) => {
  const modalContentRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const hasBeenOpenRef = useRef(false);
  const modalId = useId();
  const { document: targetDocument } = useWindowContext();

  useEffect(() => {
    if (!isOpen) return undefined;

    const stack = getModalStack(targetDocument);
    stack.push(modalId);

    return () => {
      const currentStack = getModalStack(targetDocument);
      const index = currentStack.lastIndexOf(modalId);
      if (index !== -1) {
        currentStack.splice(index, 1);
      }
    };
  }, [isOpen, modalId, targetDocument]);

  useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
      const stack = getModalStack(targetDocument);
      const isTopMostModal = stack[stack.length - 1] === modalId;
      if (!isTopMostModal) return;

      if (event.key === 'Tab') {
        const modalContent = modalContentRef.current;
        if (!modalContent) return;

        const focusableElements = getFocusableElements(modalContent);
        const firstFocusable = focusableElements[0] ?? modalContent;
        const lastFocusable = focusableElements[focusableElements.length - 1] ?? modalContent;
        const activeElement = targetDocument.activeElement as HTMLElement | null;

        if (!modalContent.contains(activeElement)) {
          event.preventDefault();
          firstFocusable.focus();
          return;
        }

        if (event.shiftKey && activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable.focus();
          return;
        }

        if (!event.shiftKey && activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable.focus();
        }
      }

      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      targetDocument.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      targetDocument.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, modalId, onClose, targetDocument]);

  useEffect(() => {
    if (!isOpen) {
      if (hasBeenOpenRef.current) {
        hasBeenOpenRef.current = false;
        const previouslyFocusedElement = previouslyFocusedElementRef.current;
        if (previouslyFocusedElement?.isConnected) {
          previouslyFocusedElement.focus();
        }
      }
      return;
    }

    hasBeenOpenRef.current = true;
    previouslyFocusedElementRef.current =
      targetDocument.activeElement instanceof HTMLElement ? targetDocument.activeElement : null;

    const firstFocusableElement = getFocusableElements(modalContentRef.current)[0] ?? modalContentRef.current;
    firstFocusableElement?.focus();
  }, [isOpen, targetDocument]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if the click is on the backdrop itself, not on any of its children
    if (e.target === e.currentTarget) {
        onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      className={`fixed inset-0 z-[2100] flex items-center justify-center ${noPadding ? '' : 'p-2 sm:p-4'} ${backdropClassName}`}
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalContentRef}
        tabIndex={-1}
        className={`${contentClassName} modal-enter-animation`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    targetDocument.body
  );
};
