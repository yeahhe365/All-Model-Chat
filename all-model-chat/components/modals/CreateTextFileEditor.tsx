
import React, { useRef, useState, useEffect } from 'react';
import { Save, X, FilePlus } from 'lucide-react';
import { Modal } from '../shared/Modal';

interface CreateTextFileEditorProps {
  onConfirm: (content: string, filename: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
  isLoading: boolean;
  t: (key: string) => string;
}

export const CreateTextFileEditor: React.FC<CreateTextFileEditorProps> = ({
  onConfirm,
  onCancel,
  isProcessing,
  isLoading,
  t,
}) => {
  const [createTextContent, setCreateTextContent] = useState('');
  const [customFilename, setCustomFilename] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus the textarea when the editor becomes visible
    const timer = setTimeout(() => textareaRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleConfirm = () => {
    if (!createTextContent.trim() || isProcessing || isLoading) return;
    onConfirm(createTextContent, customFilename);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      noPadding
      contentClassName="w-full h-full sm:h-[85vh] sm:w-[90vw] md:max-w-4xl bg-[var(--theme-bg-primary)] sm:rounded-xl shadow-2xl flex flex-col overflow-hidden border-0 sm:border border-[var(--theme-border-primary)] animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)]/50">
        <h2 id="create-text-file-title" className="text-lg font-semibold text-[var(--theme-text-primary)] tracking-tight">
          {t('createText_title')}
        </h2>
        <button
          onClick={onCancel}
          className="p-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-full transition-colors"
          aria-label={t('close')}
        >
          <X size={20} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-grow flex flex-col p-4 sm:p-6 gap-4 min-h-0 bg-[var(--theme-bg-primary)]">
        <div>
          <input
            type="text"
            value={customFilename}
            onChange={(e) => setCustomFilename(e.target.value)}
            placeholder={t('createText_filename_placeholder')}
            className="w-full p-3 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-lg focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:border-transparent text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] outline-none transition-all text-sm"
            aria-label="Filename"
            autoComplete="off"
          />
        </div>
        <div className="flex-grow relative rounded-lg border border-[var(--theme-border-secondary)] overflow-hidden focus-within:ring-2 focus-within:ring-[var(--theme-border-focus)] focus-within:border-transparent transition-all bg-[var(--theme-bg-input)]">
          <textarea
            ref={textareaRef}
            value={createTextContent}
            onChange={(e) => setCreateTextContent(e.target.value)}
            className="absolute inset-0 w-full h-full p-4 bg-transparent border-none text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] resize-none custom-scrollbar outline-none font-mono text-sm leading-relaxed"
            placeholder={t('createText_content_placeholder')}
            aria-label="File content"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 sm:px-6 py-4 border-t border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)]/30 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors flex items-center gap-2"
        >
          <X size={16} /> {t('cancel')}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!createTextContent.trim() || isProcessing || isLoading}
          className="px-5 py-2 text-sm font-medium bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform active:scale-95"
        >
          <FilePlus size={16} strokeWidth={2} /> {t('createText_create_button')}
        </button>
      </div>
    </Modal>
  );
};
