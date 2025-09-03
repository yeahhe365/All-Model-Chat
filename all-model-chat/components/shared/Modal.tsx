import React, { useState, useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  contentClassName?: string;
  backdropClassName?: string;
  noPadding?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  contentClassName = '',
  backdropClassName = 'bg-black bg-opacity-60 backdrop-blur-sm',
  noPadding = false,
  initialFocusRef,
}) => {
  const [isActuallyOpen, setIsActuallyOpen] = useState(isOpen);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  // Focus trap implementation
  const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(',');
    
    return Array.from(container.querySelectorAll(focusableSelectors));
  };

  const trapFocus = (event: KeyboardEvent) => {
    if (!modalContentRef.current || event.key !== 'Tab') return;
    
    const focusableElements = getFocusableElements(modalContentRef.current);
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsActuallyOpen(true);
      // Store previously focused element
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement;
    } else {
      const timer = setTimeout(() => {
        setIsActuallyOpen(false);
        // Restore focus to previously focused element when modal closes
        if (previouslyFocusedElementRef.current) {
          previouslyFocusedElementRef.current.focus();
          previouslyFocusedElementRef.current = null;
        }
      }, 300); // Corresponds to modal-exit-animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Set initial focus when modal opens
  useEffect(() => {
    if (isOpen && modalContentRef.current) {
      const timer = setTimeout(() => {
        if (initialFocusRef?.current) {
          initialFocusRef.current.focus();
        } else {
          // Focus first focusable element
          const focusableElements = getFocusableElements(modalContentRef.current!);
          if (focusableElements.length > 0) {
            focusableElements[0].focus();
          } else {
            // Fallback: focus the modal content itself
            modalContentRef.current!.focus();
          }
        }
      }, 100); // Small delay to ensure DOM is ready
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialFocusRef]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else {
        trapFocus(event);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if the click is on the backdrop itself, not on any of its children
    if (e.target === e.currentTarget) {
        onClose();
    }
  };

  if (!isActuallyOpen) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${noPadding ? '' : 'p-2 sm:p-4'} ${backdropClassName}`}
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalContentRef}
        className={`${contentClassName} ${isOpen ? 'modal-enter-animation' : 'modal-exit-animation'}`}
        tabIndex={-1}
        role="document"
      >
        {children}
      </div>
    </div>
  );
};
