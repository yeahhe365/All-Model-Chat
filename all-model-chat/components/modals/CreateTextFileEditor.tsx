
import React, { useRef, useState, useEffect } from 'react';
import { Save, X, FilePlus, Edit3, ChevronDown, Eye, FileText, Download, Loader2 } from 'lucide-react';
import { Modal } from '../shared/Modal';
import { MarkdownRenderer } from '../message/MarkdownRenderer';
import { convertHtmlToMarkdown } from '../../utils/htmlToMarkdown';

interface CreateTextFileEditorProps {
  onConfirm: (content: string | Blob, filename: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
  isLoading: boolean;
  t: (key: string) => string;
  initialContent?: string;
  initialFilename?: string;
  themeId: string;
  isPasteRichTextAsMarkdownEnabled?: boolean;
}

const SUPPORTED_EXTENSIONS = [
  '.md', '.pdf', '.txt', '.json', '.js', '.ts', '.py', '.html', '.css', '.csv', '.xml', '.yaml', '.sql'
];

export const CreateTextFileEditor: React.FC<CreateTextFileEditorProps> = ({
  onConfirm,
  onCancel,
  isProcessing,
  isLoading,
  t,
  initialContent = '',
  initialFilename = '',
  themeId,
  isPasteRichTextAsMarkdownEnabled = true
}) => {
  const [createTextContent, setCreateTextContent] = useState(initialContent);
  const [debouncedContent, setDebouncedContent] = useState(initialContent);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  
  // Store mapping of short Blob URLs to full Base64 strings
  // This allows the editor to be clean (short URLs) while saving the full data
  const imageReplacementsRef = useRef<Map<string, string>>(new Map());

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      imageReplacementsRef.current.forEach((_, blobUrl) => {
        URL.revokeObjectURL(blobUrl);
      });
    };
  }, []);
  
  // Split initial filename into name and extension if editing
  const [filenameBase, setFilenameBase] = useState(() => {
      if (!initialFilename) return '';
      const lastDotIndex = initialFilename.lastIndexOf('.');
      if (lastDotIndex === -1) return initialFilename;
      return initialFilename.substring(0, lastDotIndex);
  });
  
  const [extension, setExtension] = useState(() => {
      if (!initialFilename) return '.md';
      const lastDotIndex = initialFilename.lastIndexOf('.');
      if (lastDotIndex === -1) return '.md';
      const ext = initialFilename.substring(lastDotIndex);
      return SUPPORTED_EXTENSIONS.includes(ext) ? ext : ext; // Keep original if not in list, or default logic
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isEditing = initialFilename !== '';
  
  const isMarkdown = ['.md', '.markdown'].includes(extension);
  const isPdf = extension === '.pdf';
  // Both Markdown and PDF modes benefit from the rich preview pane (PDF generates from it)
  const supportsRichPreview = isMarkdown || isPdf;

  // Debounce content updates for preview to improve performance
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedContent(createTextContent);
    }, 300);
    return () => clearTimeout(handler);
  }, [createTextContent]);

  useEffect(() => {
    // Focus the textarea when appropriate
    // On mobile: only when not in preview mode
    // On desktop: always try to focus if visible
    const shouldFocus = !isPreviewMode || window.innerWidth >= 1024;
    
    if (shouldFocus) {
        const timer = setTimeout(() => {
            // Check visibility by offsetParent (standard way to check if element is visible)
            if (textareaRef.current && textareaRef.current.offsetParent !== null) {
                textareaRef.current.focus();
                if (isEditing) {
                    // Move cursor to end
                    const len = textareaRef.current.value.length;
                    textareaRef.current.setSelectionRange(len, len);
                }
            }
        }, 100);
        return () => clearTimeout(timer);
    }
  }, [isEditing, isPreviewMode]);

  // Disable preview if extension changes to non-rich type
  useEffect(() => {
    if (!supportsRichPreview && isPreviewMode) {
      setIsPreviewMode(false);
    }
  }, [supportsRichPreview, isPreviewMode]);

  const generatePdfBlob = async (): Promise<Blob | null> => {
      if (!printRef.current) {
          console.error("Print reference not found for PDF generation.");
          return null;
      }
      
      // Configuration for html2pdf
      const opt = {
          margin:       [10, 15, 10, 15], // top, left, bottom, right in mm
          filename:     'temp.pdf', // filename here matters less if outputting blob
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { 
              scale: 2, 
              useCORS: true, 
              logging: false,
              letterRendering: true,
              backgroundColor: themeId === 'onyx' ? '#09090b' : '#ffffff'
          },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
      };

      // @ts-ignore
      if (window.html2pdf) {
          // @ts-ignore
          return await window.html2pdf().set(opt).from(printRef.current).output('blob');
      }
      return null;
  };

  const handleConfirm = async () => {
    if (isProcessing || isLoading) return;
    
    // Construct full filename
    let finalName = filenameBase.trim();
    if (!finalName) {
        // Fallback name if empty
        finalName = `file-${Date.now()}`;
    }
    // Ensure we don't double extend if user typed it
    if (!finalName.endsWith(extension)) {
        finalName += extension;
    }
    
    if (isPdf) {
        setIsExportingPdf(true);
        try {
            const pdfBlob = await generatePdfBlob();
            if (pdfBlob) {
                onConfirm(pdfBlob, finalName);
            } else {
                alert("Failed to generate PDF. Please ensure preview is loaded.");
            }
        } catch (error) {
            console.error("PDF generation error:", error);
            alert("Error generating PDF.");
        } finally {
            setIsExportingPdf(false);
        }
    } else {
        // Swap Blob URLs back to Base64 Data URLs for saving
        let contentToSave = createTextContent;
        if (imageReplacementsRef.current.size > 0) {
            imageReplacementsRef.current.forEach((base64, blobUrl) => {
                // Global replacement in case user copy-pasted the blob link multiple times
                contentToSave = contentToSave.split(blobUrl).join(base64);
            });
        }
        onConfirm(contentToSave, finalName);
    }
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    
    setIsExportingPdf(true);
    
    let finalName = filenameBase.trim() || 'document';
    if (finalName.endsWith(extension)) {
        finalName = finalName.substring(0, finalName.lastIndexOf('.'));
    }
    
    // Configuration for html2pdf
    const opt = {
      margin:       [10, 15, 10, 15], // top, left, bottom, right in mm
      filename:     `${finalName}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        letterRendering: true,
        // Match PDF background to theme to ensure text contrast (white text on dark bg vs black on white)
        backgroundColor: themeId === 'onyx' ? '#09090b' : '#ffffff'
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      // @ts-ignore - html2pdf is loaded via CDN script in index.html
      if (window.html2pdf) {
        const worker = window.html2pdf();
        await worker.set(opt).from(printRef.current).save();
      } else {
        alert("PDF generator not loaded. Please check your internet connection and refresh.");
      }
    } catch (error) {
      console.error("PDF Export failed:", error);
      alert("Failed to generate PDF. Check console for details.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const insertImageFile = (file: File, startPos: number, endPos: number = startPos) => {
    const blobUrl = URL.createObjectURL(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
        const base64 = evt.target?.result as string;
        if (base64) {
            imageReplacementsRef.current.set(blobUrl, base64);
            const imageName = file.name || `image-${Date.now()}.png`;
            const markdownImage = `\n![${imageName}](${blobUrl})\n`;
            
            setCreateTextContent(prev => {
                const safeStart = Math.min(startPos, prev.length);
                const safeEnd = Math.min(endPos, prev.length);
                return prev.substring(0, safeStart) + markdownImage + prev.substring(safeEnd);
            });

            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    const newCursorPos = startPos + markdownImage.length;
                    textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
                }
            }, 50);
        }
    };
    reader.readAsDataURL(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
        setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging && e.dataTransfer.types.includes('Files')) {
        setIsDragging(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    let file: File | null = null;
    
    if (items) {
        for (let i = 0; i < items.length; i++) {
             if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
                 file = items[i].getAsFile();
                 break;
             }
        }
    } else if (e.dataTransfer.files) {
         for (let i = 0; i < e.dataTransfer.files.length; i++) {
             if (e.dataTransfer.files[i].type.startsWith('image/')) {
                 file = e.dataTransfer.files[i];
                 break;
             }
         }
    }

    if (file) {
        const cursorPosition = textareaRef.current ? textareaRef.current.selectionStart : createTextContent.length;
        insertImageFile(file, cursorPosition);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    
    // 1. Check for image files in clipboard
    const items = e.clipboardData?.items;
    let handledImage = false;

    if (items) {
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                const file = items[i].getAsFile();
                if (file) {
                    e.preventDefault();
                    handledImage = true;

                    // Capture cursor position immediately
                    const start = textarea ? textarea.selectionStart : createTextContent.length;
                    const end = textarea ? textarea.selectionEnd : createTextContent.length;

                    insertImageFile(file, start, end);
                    
                    // Process only the first image found
                    break;
                }
            }
        }
    }

    if (handledImage) return;

    // 2. Standard Rich Text Handling (HTML -> Markdown)
    // Only intercept if setting enabled (default true)
    if (isPasteRichTextAsMarkdownEnabled === false) return;

    const htmlContent = e.clipboardData.getData('text/html');
    if (htmlContent) {
        // Simple heuristic to ensure it's actually HTML tags and not just text that happens to be in HTML format on clipboard
        const hasTags = /<[a-z][\s\S]*>/i.test(htmlContent);
        if (hasTags) {
            const markdown = convertHtmlToMarkdown(htmlContent);
            if (markdown) {
                e.preventDefault();
                if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const currentValue = createTextContent; // Use state variable
                    const newValue = currentValue.substring(0, start) + markdown + currentValue.substring(end);
                    setCreateTextContent(newValue);
                    
                    // Restore cursor position
                    setTimeout(() => {
                        textarea.focus();
                        const newCursorPos = start + markdown.length;
                        textarea.setSelectionRange(newCursorPos, newCursorPos);
                    }, 0);
                }
            }
        }
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      noPadding
      contentClassName="w-full h-full max-w-none bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-none flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--theme-bg-secondary)]/50 flex-shrink-0 z-10">
        <h2 className="text-lg font-semibold text-[var(--theme-text-primary)] flex items-center gap-2">
            <FileText size={20} className="text-[var(--theme-text-link)]" />
            {isEditing ? (t('edit') + ' File') : t('createText_title')}
        </h2>
        <div className="flex items-center gap-2">
            {isPdf && (
                 <button
                    onClick={handleDownloadPdf}
                    disabled={isExportingPdf}
                    className="flex items-center justify-center h-9 w-9 sm:w-auto sm:px-3 rounded-lg text-xs font-medium transition-colors bg-[var(--theme-bg-input)] text-[var(--theme-text-primary)] border border-[var(--theme-border-secondary)] hover:bg-[var(--theme-bg-tertiary)] disabled:opacity-50"
                    title="Download PDF"
                 >
                    {isExportingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    <span className="hidden sm:inline ml-2">PDF</span>
                 </button>
            )}

            {supportsRichPreview && (
                <button
                    onClick={() => setIsPreviewMode(!isPreviewMode)}
                    className={`lg:hidden flex items-center justify-center h-9 w-9 sm:w-auto sm:px-3 rounded-lg text-xs font-medium transition-colors border ${
                        isPreviewMode 
                        ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] border-[var(--theme-bg-accent)]' 
                        : 'bg-[var(--theme-bg-input)] text-[var(--theme-text-primary)] border-[var(--theme-border-secondary)] hover:bg-[var(--theme-bg-tertiary)]'
                    }`}
                    title={isPreviewMode ? "Switch to Edit" : "Switch to Preview"}
                 >
                    {isPreviewMode ? <Edit3 size={16} /> : <Eye size={16} />}
                    <span className="hidden sm:inline ml-2">{isPreviewMode ? t('edit') : t('preview')}</span>
                 </button>
            )}

            <button
                onClick={onCancel}
                className="h-9 w-9 flex items-center justify-center text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors"
                aria-label={t('close')}
            >
                <X size={20} />
            </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-grow flex flex-col p-4 min-h-0 bg-[var(--theme-bg-primary)]">
        
        {/* Split View Container */}
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
                value={createTextContent}
                onChange={(e) => setCreateTextContent(e.target.value)}
                onPaste={handlePaste}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
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

            {/* Preview Pane - Only visible for Rich types and (Preview Enabled OR Large Screen) */}
            {supportsRichPreview && (
                <div className={`
                    relative rounded-lg border border-[var(--theme-border-secondary)] overflow-hidden bg-[var(--theme-bg-input)]
                    lg:w-1/2
                    ${isPreviewMode ? 'flex-grow h-full' : 'hidden lg:block'}
                `}>
                  <div className="absolute inset-0 w-full h-full overflow-auto custom-scrollbar">
                      {/* Unified Markdown Render View (Same as Chat) */}
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
                                  allowHtml={false}
                                  t={t as any}
                                  themeId={themeId}
                              />
                          </div>
                          {/* Print Footer */}
                          <div className="mt-8 pt-4 border-t border-[var(--theme-border-secondary)] text-center text-xs text-[var(--theme-text-tertiary)] hidden print:block">
                             Generated with Markflow AI (All Model Chat)
                          </div>
                      </div>
                  </div>
                </div>
            )}
        </div>
      </div>

      {/* Footer Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 gap-3 bg-[var(--theme-bg-secondary)]/50 flex-shrink-0">
        
        {/* Input Group */}
        <div className="flex items-center gap-2 flex-1 min-w-0 w-full">
            <div className="flex-grow min-w-0">
                <input
                    type="text"
                    value={filenameBase}
                    onChange={(e) => setFilenameBase(e.target.value)}
                    placeholder={t('createText_filename_placeholder')}
                    className="w-full h-9 px-3 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-lg focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:border-transparent text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] outline-none transition-all text-sm font-medium"
                    aria-label="Filename"
                    autoComplete="off"
                />
            </div>
            
            <div className="relative flex-shrink-0">
                <select
                    value={extension}
                    onChange={(e) => setExtension(e.target.value)}
                    className="h-9 pl-3 pr-8 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-lg focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:border-transparent text-[var(--theme-text-primary)] outline-none transition-all text-sm font-mono cursor-pointer appearance-none max-w-[80px]"
                    aria-label="File Extension"
                >
                    {SUPPORTED_EXTENSIONS.map(ext => (
                        <option key={ext} value={ext}>{ext}</option>
                    ))}
                    {!SUPPORTED_EXTENSIONS.includes(extension) && (
                        <option value={extension}>{extension}</option>
                    )}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--theme-text-tertiary)] pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={(!createTextContent.trim() && !filenameBase.trim()) || isProcessing || isLoading || isExportingPdf}
              className="h-9 px-3 sm:px-4 text-sm font-medium bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform active:scale-95 whitespace-nowrap flex-shrink-0"
              title={isEditing ? t('save') : t('createText_create_button')}
            >
              {(isExportingPdf && isPdf) ? <Loader2 size={16} className="animate-spin" /> : (isEditing ? <Save size={16} strokeWidth={2} /> : <FilePlus size={16} strokeWidth={2} />)}
              <span className="hidden sm:inline">{isEditing ? t('save') : t('createText_create_button')}</span>
              <span className="sm:hidden">{isEditing ? t('save') : t('add')}</span>
            </button>
        </div>
      </div>
    </Modal>
  );
};
