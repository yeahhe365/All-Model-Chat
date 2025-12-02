
import React from 'react';
import { Modal } from '../shared/Modal';
import { AlertTriangle, Info } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDanger = false,
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      contentClassName="bg-[var(--theme-bg-primary)] rounded-xl shadow-2xl w-full max-w-md border border-[var(--theme-border-primary)] overflow-hidden"
      noPadding
    >
      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full flex-shrink-0 ${isDanger ? 'bg-[var(--theme-bg-danger)]/10 text-[var(--theme-icon-error)]' : 'bg-[var(--theme-bg-accent)]/10 text-[var(--theme-bg-accent)]'}`}>
            {isDanger ? <AlertTriangle size={24} strokeWidth={2} /> : <Info size={24} strokeWidth={2} />}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-[var(--theme-text-primary)] mb-2 leading-tight">
              {title}
            </h3>
            <p className="text-sm text-[var(--theme-text-secondary)] leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[var(--theme-text-primary)] bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-colors flex items-center gap-2 ${
              isDanger 
                ? 'bg-[var(--theme-bg-danger)] hover:bg-[var(--theme-bg-danger-hover)]' 
                : 'bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
