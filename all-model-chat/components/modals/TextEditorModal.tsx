
import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '../shared/Modal';
import { X, Check } from 'lucide-react';

interface TextEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  t: (key: string) => string;
  readOnly?: boolean;
}

export const TextEditorModal: React.FC<TextEditorModalProps> = ({
  isOpen,
  onClose,
  title,
  value,
  onChange,
  placeholder,
  t,
  readOnly
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Use local state to decouple rendering from global app state during active typing
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    if (isOpen) {
      setLocalValue(value);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, value]);

  const handleValueChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (readOnly) return;
      setLocalValue(e.target.value);
  };

  const handleDone = () => {
      if (!readOnly && localValue !== value) {
          onChange(localValue);
      }
      onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleDone}
      contentClassName="w-full h-full sm:h-[90vh] sm:w-[90vw] max-w-5xl bg-[var(--theme-bg-primary)] sm:rounded-xl shadow-2xl flex flex-col overflow-hidden border border-[var(--theme-border-primary)]"
      noPadding
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)]/50">
        <h2 className="text-lg font-semibold text-[var(--theme-text-primary)]">{title}</h2>
        <button
          onClick={handleDone}
          className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-full transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      <div className="flex-grow p-4 flex flex-col min-h-0 bg-[var(--theme-bg-primary)]">
        <textarea
          ref={textareaRef}
          value={localValue}
          onChange={handleValueChange}
          readOnly={readOnly}
          className="flex-grow w-full p-4 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-lg focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:border-transparent text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] outline-none transition-all resize-none custom-scrollbar font-mono text-sm leading-relaxed"
          placeholder={placeholder}
          spellCheck={false}
        />
      </div>
      <div className="px-4 py-3 border-t border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)]/30 flex justify-end">
        <button
          onClick={handleDone}
          className="px-6 py-2 text-sm font-medium bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-lg shadow-sm transition-all flex items-center gap-2"
        >
          <Check size={16} /> {t('close') || 'Done'}
        </button>
      </div>
    </Modal>
  );
};
