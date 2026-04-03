
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useWindowContext } from '../../contexts/WindowContext';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  contentClassName?: string;
  backdropClassName?: string;
  noPadding?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  contentClassName = '',
  backdropClassName = 'bg-black bg-opacity-60 backdrop-blur-sm',
  noPadding = false,
}) => {
  const [isActuallyOpen, setIsActuallyOpen] = useState(isOpen);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const { document: targetDocument } = useWindowContext();

  useEffect(() => {
    if (isOpen) {
      setIsActuallyOpen(true);
    } else {
      const timer = setTimeout(() => setIsActuallyOpen(false), 300); // Corresponds to modal-exit-animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
  }, [isOpen, onClose, targetDocument]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if the click is on the backdrop itself, not on any of its children
    if (e.target === e.currentTarget) {
        onClose();
    }
  };

  if (!isActuallyOpen) {
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
        className={`${contentClassName} ${isOpen ? 'modal-enter-animation' : 'modal-exit-animation'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    targetDocument.body
  );
};
