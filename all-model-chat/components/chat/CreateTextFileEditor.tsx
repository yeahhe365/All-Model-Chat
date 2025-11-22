import React, { useRef, useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';

interface CreateTextFileEditorProps {
  onConfirm: (content: string, filename: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
  isLoading: boolean;
  isHistorySidebarOpen?: boolean;
}

export const CreateTextFileEditor: React.FC<CreateTextFileEditorProps> = ({
  onConfirm,
  onCancel,
  isProcessing,
  isLoading,
  isHistorySidebarOpen,
}) => {
  const [createTextContent, setCreateTextContent] = React.useState('');
  const [customFilename, setCustomFilename] = React.useState('');
  const createTextEditorTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [leftOffset, setLeftOffset] = useState('0px');

  React.useEffect(() => {
    // Focus the textarea when the editor becomes visible
    setTimeout(() => createTextEditorTextareaRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    const calculateOffset = () => {
      // The sidebar is 18rem (288px) wide on screens >= 768px (md breakpoint).
      // On smaller screens, it's an overlay, so the editor should be fullscreen.
      if (isHistorySidebarOpen && window.innerWidth >= 768) {
        setLeftOffset('18rem');
      } else {
        setLeftOffset('0px');
      }
    };

    calculateOffset();
    window.addEventListener('resize', calculateOffset);
    return () => window.removeEventListener('resize', calculateOffset);
  }, [isHistorySidebarOpen]);

  const handleConfirm = () => {
    if (!createTextContent.trim() || isProcessing || isLoading) return;
    onConfirm(createTextContent, customFilename);
  };

  return (
    <div 
      className="fixed top-0 right-0 bottom-0 bg-[var(--theme-bg-primary)] z-[2100] flex flex-col p-3 sm:p-4 md:p-6"
      style={{ left: leftOffset, transition: 'left 0.3s ease-in-out' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-text-file-title"
    >
      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <h2 id="create-text-file-title" className="text-lg sm:text-xl font-semibold text-[var(--theme-text-link)]">
          Create New Text File
        </h2>
        <button
          onClick={onCancel}
          className="p-1.5 sm:p-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)] rounded-md"
          aria-label="Close text file editor"
        >
          <X size={20} />
        </button>
      </div>

      <input
        type="text"
        value={customFilename}
        onChange={(e) => setCustomFilename(e.target.value)}
        placeholder="Optional: Enter filename (e.g., my_notes.txt)"
        className="w-full p-2 sm:p-2.5 mb-2 sm:mb-3 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-md focus:ring-1 focus:ring-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm"
        aria-label="Custom filename for text file"
      />
      <textarea
        ref={createTextEditorTextareaRef}
        value={createTextContent}
        onChange={(e) => setCreateTextContent(e.target.value)}
        className="flex-grow w-full p-2 sm:p-3 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-md focus:ring-1 focus:ring-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-base resize-none custom-scrollbar"
        placeholder="Type or paste your text content here..."
        aria-label="Text content for new file"
      />
      <div className="mt-3 sm:mt-4 flex justify-end gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] rounded-md transition-colors flex items-center gap-1 sm:gap-1.5"
          aria-label="Cancel creating text file"
        >
          <X size={14} /> Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!createTextContent.trim() || isProcessing || isLoading}
          className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-md disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)] transition-colors flex items-center gap-1 sm:gap-1.5"
          aria-label="Create text file from content"
        >
          <Save size={14} /> Create File
        </button>
      </div>
    </div>
  );
};