
import { useState, useRef, useEffect, useCallback } from 'react';
import { convertHtmlToMarkdown } from '../utils/htmlToMarkdown';

export const SUPPORTED_EXTENSIONS = [
  '.md', '.pdf', '.txt', '.json', '.js', '.ts', '.py', '.html', '.css', '.csv', '.xml', '.yaml', '.sql'
];

interface UseCreateFileEditorProps {
    initialContent: string;
    initialFilename: string;
    onConfirm: (content: string | Blob, filename: string) => void;
    themeId: string;
    isPasteRichTextAsMarkdownEnabled: boolean;
}

export const useCreateFileEditor = ({
    initialContent,
    initialFilename,
    onConfirm,
    themeId,
    isPasteRichTextAsMarkdownEnabled
}: UseCreateFileEditorProps) => {
    const [textContent, setTextContent] = useState(initialContent);
    const [debouncedContent, setDebouncedContent] = useState(initialContent);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    
    // Refs
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const imageReplacementsRef = useRef<Map<string, string>>(new Map());

    // Filename Logic
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
        return SUPPORTED_EXTENSIONS.includes(ext) ? ext : ext;
    });

    const isEditing = initialFilename !== '';
    const isPdf = extension === '.pdf';
    const supportsRichPreview = ['.md', '.markdown', '.pdf'].includes(extension);

    // Debounce content
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedContent(textContent), 300);
        return () => clearTimeout(handler);
    }, [textContent]);

    // Cleanup object URLs
    useEffect(() => {
        return () => {
            imageReplacementsRef.current.forEach((_, blobUrl) => URL.revokeObjectURL(blobUrl));
        };
    }, []);

    // Logic: PDF Generation
    const generatePdfBlob = async (): Promise<Blob | null> => {
        if (!printRef.current) {
            console.error("Print reference not found for PDF generation.");
            return null;
        }
        
        const opt = {
            margin: [10, 15, 10, 15],
            filename: 'temp.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2, 
                useCORS: true, 
                logging: false,
                letterRendering: true,
                backgroundColor: themeId === 'onyx' ? '#09090b' : '#ffffff'
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        // @ts-ignore
        if (window.html2pdf) {
            // @ts-ignore
            return await window.html2pdf().set(opt).from(printRef.current).output('blob');
        }
        return null;
    };

    const handleSave = async (isProcessing: boolean) => {
        if (isProcessing) return;
        
        let finalName = filenameBase.trim() || `file-${Date.now()}`;
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
            let contentToSave = textContent;
            if (imageReplacementsRef.current.size > 0) {
                imageReplacementsRef.current.forEach((base64, blobUrl) => {
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
        
        const opt = {
          margin: [10, 15, 10, 15],
          filename: `${finalName}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: 2, 
            useCORS: true, 
            backgroundColor: themeId === 'onyx' ? '#09090b' : '#ffffff'
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };
    
        try {
          // @ts-ignore
          if (window.html2pdf) {
            // @ts-ignore
            await window.html2pdf().set(opt).from(printRef.current).save();
          } else {
            alert("PDF generator not loaded.");
          }
        } catch (error) {
          console.error("PDF Export failed:", error);
        } finally {
          setIsExportingPdf(false);
        }
    };

    // Logic: Image Insertion
    const insertImageFile = useCallback((file: File, startPos: number, endPos: number = startPos) => {
        const blobUrl = URL.createObjectURL(file);
        const reader = new FileReader();
        reader.onload = (evt) => {
            const base64 = evt.target?.result as string;
            if (base64) {
                imageReplacementsRef.current.set(blobUrl, base64);
                const imageName = file.name || `image-${Date.now()}.png`;
                const markdownImage = `\n![${imageName}](${blobUrl})\n`;
                
                setTextContent(prev => {
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
    }, []);

    // Logic: Paste Handler
    const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const textarea = textareaRef.current;
        const items = e.clipboardData?.items;
        
        // 1. Handle Images
        if (items) {
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith('image/')) {
                    const file = items[i].getAsFile();
                    if (file) {
                        e.preventDefault();
                        const start = textarea ? textarea.selectionStart : textContent.length;
                        const end = textarea ? textarea.selectionEnd : textContent.length;
                        insertImageFile(file, start, end);
                        return;
                    }
                }
            }
        }

        // 2. Handle Rich Text
        if (isPasteRichTextAsMarkdownEnabled !== false) {
            const htmlContent = e.clipboardData.getData('text/html');
            if (htmlContent && /<[a-z][\s\S]*>/i.test(htmlContent)) {
                const markdown = convertHtmlToMarkdown(htmlContent);
                if (markdown) {
                    e.preventDefault();
                    if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const newValue = textContent.substring(0, start) + markdown + textContent.substring(end);
                        setTextContent(newValue);
                        setTimeout(() => {
                            textarea.focus();
                            textarea.setSelectionRange(start + markdown.length, start + markdown.length);
                        }, 0);
                    }
                    return;
                }
            }
        }
    }, [isPasteRichTextAsMarkdownEnabled, insertImageFile, textContent]);

    // Logic: Drop Handler
    const handleDrop = useCallback((e: React.DragEvent, isDragging: boolean) => {
        if (!isDragging) return;
        
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
            const cursorPosition = textareaRef.current ? textareaRef.current.selectionStart : textContent.length;
            insertImageFile(file, cursorPosition);
        }
    }, [insertImageFile, textContent]);

    // Focus Management
    useEffect(() => {
        const shouldFocus = !isPreviewMode || window.innerWidth >= 1024;
        if (shouldFocus) {
            const timer = setTimeout(() => {
                if (textareaRef.current && textareaRef.current.offsetParent !== null) {
                    textareaRef.current.focus();
                    if (isEditing) {
                        const len = textareaRef.current.value.length;
                        textareaRef.current.setSelectionRange(len, len);
                    }
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isEditing, isPreviewMode]);

    // Auto-disable preview for unsupported types
    useEffect(() => {
        if (!supportsRichPreview && isPreviewMode) {
            setIsPreviewMode(false);
        }
    }, [supportsRichPreview, isPreviewMode]);

    return {
        textContent, setTextContent,
        debouncedContent,
        filenameBase, setFilenameBase,
        extension, setExtension,
        isPreviewMode, setIsPreviewMode,
        isExportingPdf,
        textareaRef,
        printRef,
        isEditing,
        isPdf,
        supportsRichPreview,
        handleSave,
        handleDownloadPdf,
        handlePaste,
        handleDrop
    };
};
