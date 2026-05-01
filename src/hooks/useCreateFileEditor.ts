import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { convertHtmlToMarkdown } from '../utils/htmlToMarkdown';
import { triggerDownload } from '../utils/export/core';
import { createMarkdownPdfBlob } from '../utils/export/markdownPdf';
import {
  createInlineImagePlaceholder,
  extractInlineImagePlaceholders,
  resolveInlineImagePlaceholders,
} from '../utils/inlineImagePlaceholders';
import { isImageMimeType } from '../utils/fileTypeUtils';
import { CREATE_TEXT_FILE_EDITOR_LAST_EXTENSION_KEY } from '../constants/appConstants';

export const SUPPORTED_EXTENSIONS = [
  '.md',
  '.pdf',
  '.txt',
  '.json',
  '.js',
  '.ts',
  '.py',
  '.html',
  '.css',
  '.csv',
  '.xml',
  '.yaml',
  '.sql',
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
  isPasteRichTextAsMarkdownEnabled,
}: UseCreateFileEditorProps) => {
  const initialInlineImagesRef = useRef(extractInlineImagePlaceholders(initialContent));
  const imagePlaceholdersRef = useRef(initialInlineImagesRef.current.placeholders);
  const nextImageIndexRef = useRef(initialInlineImagesRef.current.nextIndex);

  const [textContent, setTextContent] = useState(initialInlineImagesRef.current.editorContent);
  const [debouncedEditorContent, setDebouncedEditorContent] = useState(initialInlineImagesRef.current.editorContent);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Filename Logic
  const [filenameBase, setFilenameBase] = useState(() => {
    if (!initialFilename) return '';
    const lastDotIndex = initialFilename.lastIndexOf('.');
    if (lastDotIndex === -1) return initialFilename;
    return initialFilename.substring(0, lastDotIndex);
  });

  const [extension, setExtension] = useState(() => {
    if (!initialFilename) {
      if (typeof window !== 'undefined') {
        const storedExtension = window.localStorage.getItem(CREATE_TEXT_FILE_EDITOR_LAST_EXTENSION_KEY);
        if (storedExtension && SUPPORTED_EXTENSIONS.includes(storedExtension)) {
          return storedExtension;
        }
      }
      return '.md';
    }
    const lastDotIndex = initialFilename.lastIndexOf('.');
    if (lastDotIndex === -1) return '.md';
    const ext = initialFilename.substring(lastDotIndex);
    return SUPPORTED_EXTENSIONS.includes(ext) ? ext : ext;
  });

  const handleSetExtension = useCallback((nextExtension: string) => {
    setExtension(nextExtension);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CREATE_TEXT_FILE_EDITOR_LAST_EXTENSION_KEY, nextExtension);
    }
  }, []);

  const isEditing = initialFilename !== '';
  const isPdf = extension === '.pdf';
  const supportsRichPreview = ['.md', '.markdown', '.pdf'].includes(extension);

  // Debounce content
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedEditorContent(textContent), 300);
    return () => clearTimeout(handler);
  }, [textContent]);

  const debouncedContent = useMemo(
    () => resolveInlineImagePlaceholders(debouncedEditorContent, imagePlaceholdersRef.current),
    [debouncedEditorContent],
  );

  // Logic: PDF Generation
  const generatePdfBlob = async (filename: string): Promise<Blob> =>
    createMarkdownPdfBlob(resolveInlineImagePlaceholders(textContent, imagePlaceholdersRef.current), {
      filename,
      themeId,
    });

  const handleSave = async (isProcessing: boolean) => {
    if (isProcessing) return;

    let finalName = filenameBase.trim() || `file-${Date.now()}`;
    if (!finalName.endsWith(extension)) {
      finalName += extension;
    }

    if (isPdf) {
      setIsExportingPdf(true);
      try {
        const pdfBlob = await generatePdfBlob(finalName);
        onConfirm(pdfBlob, finalName);
      } catch (error) {
        console.error('PDF generation error:', error);
        alert('Error generating PDF.');
      } finally {
        setIsExportingPdf(false);
      }
    } else {
      onConfirm(resolveInlineImagePlaceholders(textContent, imagePlaceholdersRef.current), finalName);
    }
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    const finalName = `${filenameBase.trim() || 'document'}.pdf`;

    try {
      const pdfBlob = await generatePdfBlob(finalName);
      triggerDownload(URL.createObjectURL(pdfBlob), finalName);
    } catch (error) {
      console.error('PDF Export failed:', error);
      alert('Error generating PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Logic: Image Insertion
  const insertImageFile = useCallback((file: File, startPos: number, endPos: number = startPos) => {
    const placeholder = createInlineImagePlaceholder(nextImageIndexRef.current++);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        imagePlaceholdersRef.current.set(placeholder, dataUrl);
        const imageName = file.name || `image-${Date.now()}.png`;
        const markdownImage = `\n![${imageName}](${placeholder})\n`;

        setTextContent((prev) => {
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
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const textarea = textareaRef.current;
      const items = e.clipboardData?.items;

      // 1. Handle Images
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (isImageMimeType(items[i].type)) {
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
    },
    [isPasteRichTextAsMarkdownEnabled, insertImageFile, textContent],
  );

  // Logic: Drop Handler
  const handleDrop = useCallback(
    (e: React.DragEvent, isDragging: boolean) => {
      if (!isDragging) return;

      const items = e.dataTransfer.items;
      let file: File | null = null;

      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].kind === 'file' && isImageMimeType(items[i].type)) {
            file = items[i].getAsFile();
            break;
          }
        }
      } else if (e.dataTransfer.files) {
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          if (isImageMimeType(e.dataTransfer.files[i].type)) {
            file = e.dataTransfer.files[i];
            break;
          }
        }
      }

      if (file) {
        const cursorPosition = textareaRef.current ? textareaRef.current.selectionStart : textContent.length;
        insertImageFile(file, cursorPosition);
      }
    },
    [insertImageFile, textContent],
  );

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
    return undefined;
  }, [isEditing, isPreviewMode]);

  // Auto-disable preview for unsupported types
  useEffect(() => {
    if (!supportsRichPreview && isPreviewMode) {
      setIsPreviewMode(false);
    }
  }, [supportsRichPreview, isPreviewMode]);

  return {
    textContent,
    setTextContent,
    debouncedContent,
    filenameBase,
    setFilenameBase,
    extension,
    setExtension: handleSetExtension,
    isPreviewMode,
    setIsPreviewMode,
    isExportingPdf,
    textareaRef,
    isEditing,
    isPdf,
    supportsRichPreview,
    handleSave,
    handleDownloadPdf,
    handlePaste,
    handleDrop,
  };
};
