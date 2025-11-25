
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../../types';
import { Modal } from '../shared/Modal';
import { Save, X } from 'lucide-react';
import { translations } from '../../utils/appUtils';

interface EditMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: ChatMessage | null;
  onSave: (messageId: string, newContent: string) => void;
  t: (key: keyof typeof translations) => string;
}

export const EditMessageModal: React.FC<EditMessageModalProps> = ({
  isOpen,
  onClose,
  message,
  onSave,
  t,
}) => {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && message) {
      setContent(message.content || '');
      // Focus after a slight delay to allow modal animation
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, message]);

  const handleSave = () => {
    if (message) {
      onSave(message.id, content);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  if (!message) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      contentClassName="w-full max-w-3xl bg-[var(--theme-bg-primary)] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-[var(--theme-border-primary)] max-h-[85vh]"
      noPadding
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)]/50">
        <h2 className="text-lg font-semibold text-[var(--theme-text-primary)] flex items-center gap-2">
          <span className="text-[var(--theme-text-tertiary)]">
            {t('edit')} {message.role === 'user' ? t('scenarios_editor_role_user') : t('scenarios_editor_role_model')}
          </span>
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-full transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-grow p-4 flex flex-col min-h-[200px]">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-grow w-full p-4 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-lg focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:border-transparent text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] outline-none transition-all resize-none custom-scrollbar font-mono text-sm leading-relaxed"
          placeholder="Enter message content..."
        />
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)]/30 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors"
        >
          {t('cancel')}
        </button>
        <button
          onClick={handleSave}
          disabled={!content.trim()}
          className="px-4 py-2 text-sm font-medium bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save size={16} /> {t('save')}
        </button>
      </div>
    </Modal>
  );
};
