
import React, { useState } from 'react';
import { MarkdownRenderer } from '../../message/MarkdownRenderer';
import { translations } from '../../../utils/appUtils';

interface CreateFileBodyProps {
    textContent: string;
    setTextContent: (text: string) => void;
    debouncedContent: string;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    printRef: React.RefObject<HTMLDivElement>;
    isPreviewMode: boolean;
    supportsRichPreview: boolean;
    handlePaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
    handleDrop: (e: React.DragEvent, isDragging: boolean) => void;
    themeId: string;
    t: (key: keyof typeof translations | string) => string;
}

export const CreateFileBody: React.FC<CreateFileBodyProps> = ({
    textContent,
    setTextContent,
    debouncedContent,
    textareaRef,
    printRef,
    isPreviewMode,
    supportsRichPreview,
    handlePaste,
    handleDrop,
    themeId,
    t
}) => {
    const [isDragging, setIsDragging] = useState(false);

    const onDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.types.includes('Files')) setIsDragging(true);
    };

    const onDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging && e.dataTransfer.types.includes('Files')) setIsDragging(true);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleDrop(e, isDragging);
        setIsDragging(false);
    };

    return (
        <div className="flex-grow flex flex-col p-4 min-h-0 bg-[var(--theme-bg-primary)]">
            <div className="flex-grow flex flex-col lg:flex-row gap-4 min-h-0 h-full">
                
                {/* Editor Pane */}
                <div className={`
                    relative rounded-lg border overflow-hidden focus-within:ring-2 focus-within:ring-[var(--theme-border-focus)] focus-within:border-transparent transition-all bg-[var(--theme-bg-input)]
                    ${isDragging ? 'border-[var(--theme-bg-accent)] ring-2 ring-[var(--theme-bg-accent)] bg-[var(--theme-bg-accent)]/10' : 'border-[var(--theme-border-secondary)]'}
                    ${supportsRichPreview ? 'lg:w-1/2' : 'w-full'}
                    ${supportsRichPreview && isPreviewMode ? 'hidden lg:block' : 'flex-grow h-full'}
                `}>
                  <textarea
                    ref={textareaRef}
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    onPaste={handlePaste}
                    onDragEnter={onDragEnter}
                    onDragLeave={onDragLeave}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    className="absolute inset-0 w-full h-full p-4 bg-transparent border-none text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] resize-none custom-scrollbar outline-none font-mono text-sm leading-relaxed"
                    placeholder={t('createText_content_placeholder')}
                    aria-label="File content"
                    spellCheck={false}
                  />
                  {isDragging && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-[var(--theme-bg-accent)]/10 backdrop-blur-sm">
                          <div className="bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] px-4 py-2 rounded-lg font-medium shadow-lg animate-in fade-in zoom-in duration-200">
                              Drop image to insert
                          </div>
                      </div>
                  )}
                </div>
    
                {/* Preview Pane */}
                {supportsRichPreview && (
                    <div className={`
                        relative rounded-lg border border-[var(--theme-border-secondary)] overflow-hidden bg-[var(--theme-bg-input)]
                        lg:w-1/2
                        ${isPreviewMode ? 'flex-grow h-full' : 'hidden lg:block'}
                    `}>
                      <div className="absolute inset-0 w-full h-full overflow-auto custom-scrollbar">
                          <div 
                            ref={printRef}
                            className="w-full min-h-full bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] p-4 sm:p-6 transition-colors duration-300"
                            style={{ fontSize: '16px' }}
                          >
                              <div className="markdown-body">
                                  <MarkdownRenderer 
                                      content={debouncedContent || '*Start typing...*'}
                                      isLoading={false}
                                      onImageClick={() => {}}
                                      onOpenHtmlPreview={() => {}}
                                      onOpenSidePanel={() => {}}
                                      expandCodeBlocksByDefault={true}
                                      isMermaidRenderingEnabled={true}
                                      isGraphvizRenderingEnabled={true}
                                      allowHtml={true}
                                      t={t as any}
                                      themeId={themeId}
                                  />
                              </div>
                              <div className="mt-8 pt-4 border-t border-[var(--theme-border-secondary)] text-center text-xs text-[var(--theme-text-tertiary)] hidden print:block">
                                 Generated with Markflow AI (All Model Chat)
                              </div>
                          </div>
                      </div>
                    </div>
                )}
            </div>
        </div>
    );
};
