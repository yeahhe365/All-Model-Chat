


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, MessageListProps, UploadedFile } from '../types'; 
import { User, Bot, AlertTriangle, Edit3, ChevronDown, ChevronUp, ClipboardCopy, Check, Loader2, FileText, ImageIcon, AlertCircle, FileCode2, Trash2, FileVideo, FileAudio, X, Maximize, Minimize, RotateCw, ExternalLink, Expand, Sigma } from 'lucide-react'; 
import { marked } from 'marked';
import DOMPurify from 'dompurify';
// import hljs from 'highlight.js'; // No longer needed directly here
import html2canvas from 'html2canvas';
import { 
    SUPPORTED_IMAGE_MIME_TYPES, 
    SUPPORTED_TEXT_MIME_TYPES, 
    SUPPORTED_VIDEO_MIME_TYPES, 
    SUPPORTED_AUDIO_MIME_TYPES, 
    SUPPORTED_PDF_MIME_TYPES, 
    ThemeColors 
} from '../constants';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight'; // Added for syntax highlighting
import { HtmlPreviewModal } from './HtmlPreviewModal'; 


interface ExportMessageButtonProps {
  markdownContent: string;
  messageId: string;
  themeColors: ThemeColors;
  className?: string;
}

const ExportMessageButton: React.FC<ExportMessageButtonProps> = ({ markdownContent, messageId, themeColors, className }) => {
  const [exportState, setExportState] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');

  const handleExport = async () => {
    if (!markdownContent || exportState === 'exporting') return;
    setExportState('exporting');

    const tempDiv = document.createElement('div');
    tempDiv.className = 'markdown-body'; 
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px'; 
    tempDiv.style.top = '-9999px';  
    tempDiv.style.width = '800px';  
    tempDiv.style.padding = '24px'; 
    tempDiv.style.backgroundColor = themeColors.bgModelMessage; 
    tempDiv.style.color = themeColors.bgModelMessageText;     
    tempDiv.style.border = `1px solid ${themeColors.borderSecondary}`;
    tempDiv.style.borderRadius = '8px'; 
    
    const rawHtml = marked.parse(markdownContent); 
    tempDiv.innerHTML = DOMPurify.sanitize(rawHtml as string);

    // Manually trigger highlighting for elements within the temporary div for export if needed
    // This is tricky because rehype-highlight works within ReactMarkdown's context.
    // For html2canvas export, if rehype-highlight styles are crucial, consider rendering
    // the ReactMarkdown component off-screen. For now, this uses marked + manual hljs.
    // Since hljs is removed from direct import, this might need adjustment if hljs is not globally available.
    // However, for this specific export, relying on the styles applied by rehype-highlight in the main view
    // and then hoping html2canvas captures them if they are purely CSS might be one way, or
    // we would need to ensure hljs is available for this export function.
    // For now, let's assume the basic structure is fine, and complex highlighting for export is a TODO.
    // If hljs is not available globally, this part will not highlight for export.
    if (window.hljs) {
        tempDiv.querySelectorAll('pre code').forEach((block) => {
         (window.hljs as any).highlightElement(block as HTMLElement);
        });
    }


    document.body.appendChild(tempDiv);

    try {
      const images = Array.from(tempDiv.querySelectorAll('img'));
      await Promise.all(
        images.map(img => new Promise<void>(resolve => {
          if (img.complete) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => resolve(); 
          }
        }))
      );
      
      const canvas = await html2canvas(tempDiv, {
        useCORS: true, 
        backgroundColor: themeColors.bgModelMessage, 
        scale: window.devicePixelRatio || 2, 
        logging: false, 
        scrollX: 0, 
        scrollY: -window.scrollY, 
        windowWidth: tempDiv.scrollWidth,
        windowHeight: tempDiv.scrollHeight,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `chat-message-${messageId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setExportState('success');
    } catch (err) {
      console.error('Failed to export message as PNG:', err);
      setExportState('error');
    } finally {
      document.body.removeChild(tempDiv);
      setTimeout(() => setExportState('idle'), 2500); 
    }
  };

  let icon;
  let title = "Export message as PNG";
  let buttonStyle = `text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)]`;
  const iconSize = window.innerWidth < 640 ? 14 : 16;

  switch (exportState) {
    case 'exporting':
      icon = <Loader2 size={iconSize} className="animate-spin text-[var(--theme-text-link)]" />;
      title = "Exporting PNG...";
      buttonStyle = `text-[var(--theme-text-link)]`;
      break;
    case 'success':
      icon = <Check size={iconSize} className="text-[var(--theme-text-success)]" />;
      title = "PNG Exported successfully!";
      buttonStyle = `bg-[var(--theme-bg-success)] text-[var(--theme-text-success)] hover:bg-[var(--theme-bg-success)]`;
      break;
    case 'error':
      icon = <AlertCircle size={iconSize} className="text-[var(--theme-text-danger)]" />;
      title = "PNG Export failed. Check console.";
      buttonStyle = `bg-[var(--theme-bg-danger)] text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)]`;
      break;
    default: 
      icon = <ImageIcon size={iconSize} />;
      break;
  }
  
  const baseStyle = `p-1 rounded-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-opacity-70 ${className || ''}`;

  return (
    <button
      onClick={handleExport}
      disabled={exportState === 'exporting'}
      className={`${baseStyle} ${buttonStyle}`}
      aria-label={title}
      title={title}
    >
      {icon}
    </button>
  );
};

const generateThemeCssVariables = (colors: ThemeColors): string => {
  let css = ':root {\n';
  for (const [key, value] of Object.entries(colors)) {
    const cssVarName = `--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    css += `  ${cssVarName}: ${value};\n`;
  }
  css += `  --markdown-code-bg: ${colors.bgCodeBlock || colors.bgInput };\n`;
  css += `  --markdown-code-text: ${colors.textCode};\n`;
  css += `  --markdown-pre-bg: ${colors.bgCodeBlock || colors.bgSecondary};\n`;
  css += `  --markdown-link-text: ${colors.textLink};\n`;
  css += `  --markdown-blockquote-text: ${colors.textTertiary};\n`;
  css += `  --markdown-blockquote-border: ${colors.borderSecondary};\n`;
  css += `  --markdown-hr-bg: ${colors.borderSecondary};\n`;
  css += `  --markdown-table-border: ${colors.borderSecondary};\n`;
  css += '}';
  return css;
};

const generateFullHtmlDocument = (contentHtml: string, themeColors: ThemeColors, messageId: string): string => {
  const themeVariablesCss = generateThemeCssVariables(themeColors);

  const embeddedStyles = `
    <style id="theme-variables">
      ${themeVariablesCss}
    </style>
    <style>
      .katex { font-family: 'KaTeX_Main', 'Times New Roman', serif !important; }
      html, body {
        background-color: var(--theme-bg-primary);
        color: var(--theme-text-primary);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
        margin: 0;
        padding: 0;
      }
      body {
        padding: 20px;
        box-sizing: border-box;
      }
      .markdown-body-container {
        background-color: var(--theme-bg-model-message);
        color: var(--theme-bg-model-message-text);
        padding: 20px;
        border-radius: 8px;
        border: 1px solid var(--theme-border-secondary);
        max-width: 900px;
        margin: 0 auto;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      }
      .markdown-body { 
        background-color: transparent !important;
        color: var(--theme-bg-model-message-text) !important;
        font-size: 1rem; 
        line-height: 1.7;
      }
      .markdown-body p,
      .markdown-body ul,
      .markdown-body ol,
      .markdown-body blockquote,
      .markdown-body pre,
      .markdown-body table,
      .markdown-body dl {
        margin-top: 0;
        margin-bottom: 16px;
      }
      .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6 {
        margin-top: 24px;
        margin-bottom: 16px;
        font-weight: 600;
        color: var(--theme-bg-model-message-text) !important;
        border-bottom-color: var(--theme-border-secondary) !important;
      }
      .markdown-body code:not(pre code) {
        background-color: var(--markdown-code-bg) !important;
        color: var(--markdown-code-text) !important;
        padding: 0.2em 0.4em;
        margin: 0;
        font-size: 85%;
        border-radius: 3px;
      }
      .markdown-body pre {
        background-color: var(--markdown-pre-bg) !important;
        padding: 16px !important;
        border-radius: 6px !important;
        overflow: auto;
        border: 1px solid var(--theme-border-secondary);
        position: relative; 
      }
      .markdown-body pre code.hljs { 
        background-color: #2b2b2b !important; 
        color: #f8f8f2 !important;
        padding: 1em !important; 
      }
      .markdown-body pre code:not(.hljs) {
          background-color: transparent !important;
          color: var(--markdown-code-text) !important;
          padding: 0 !important;
      }
      .markdown-body a {
          color: var(--markdown-link-text) !important;
      }
      .markdown-body a:hover {
          text-decoration: underline !important;
      }
      .markdown-body blockquote {
          color: var(--markdown-blockquote-text) !important;
          border-left-color: var(--markdown-blockquote-border) !important;
          padding-left: 1em;
          margin-left: 0;
      }
      .markdown-body hr {
          background-color: var(--markdown-hr-bg) !important;
          height: .25em !important;
          padding: 0 !important;
          margin: 24px 0 !important;
          border-radius: 1px;
          border: 0 !important; 
      }
      .markdown-body table th, .markdown-body table td {
          border-color: var(--markdown-table-border) !important;
      }
      .markdown-body ol,
      .markdown-body ul {
        list-style: revert;
        margin: revert;
        padding: revert;
      }
    </style>
  `;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Chat Message Export - ${messageId}</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown-dark.min.css" integrity="sha512-ASzAcRBTKCkHmyOBR9L8MAXAOI9q9l+pQFMWFFL82PZ1KO0YfFvsEIGaJ4c1g7lbbZJzwqJVfOq2hucL+x/hRg==" crossorigin="anonymous" referrerpolicy="no-referrer" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/a11y-dark.min.css">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" integrity="sha384-n8MVd4RsNIU07VB8WQgmEHBbWFm_J_wqLVRMmLcVXMZuiAbo7KBZ_4E4UePnCkqP" crossorigin="anonymous">
      ${embeddedStyles}
    </head>
    <body>
      <div class="markdown-body-container">
        <div class="markdown-body">
          ${contentHtml} 
        </div>
      </div>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
      <script>
        document.addEventListener('DOMContentLoaded', (event) => {
          document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
          });
        });
      </script>
    </body>
    </html>
  `;
};


const ExportMessageToHtmlButton: React.FC<ExportMessageButtonProps> = ({ markdownContent, messageId, themeColors, className }) => {
  const [exportState, setExportState] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');

  const handleExport = async () => {
    if (!markdownContent || exportState === 'exporting') return;
    setExportState('exporting');

    try {
      const rawHtml = marked.parse(markdownContent);
      const sanitizedHtml = DOMPurify.sanitize(rawHtml as string);
      const fullHtmlDoc = generateFullHtmlDocument(sanitizedHtml, themeColors, messageId);

      const blob = new Blob([fullHtmlDoc], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chat-message-${messageId}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setExportState('success');
    } catch (err) {
      console.error('Failed to export message as HTML:', err);
      setExportState('error');
    } finally {
      setTimeout(() => setExportState('idle'), 2500);
    }
  };
  
  let icon;
  let title = "Export message as HTML";
  let buttonStyle = `text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)]`;
  const iconSize = window.innerWidth < 640 ? 14 : 16;

  switch (exportState) {
    case 'exporting':
      icon = <Loader2 size={iconSize} className="animate-spin text-[var(--theme-text-link)]" />;
      title = "Exporting HTML...";
      buttonStyle = `text-[var(--theme-text-link)]`;
      break;
    case 'success':
      icon = <Check size={iconSize} className="text-[var(--theme-text-success)]" />;
      title = "HTML Exported successfully!";
      buttonStyle = `bg-[var(--theme-bg-success)] text-[var(--theme-text-success)] hover:bg-[var(--theme-bg-success)]`;
      break;
    case 'error':
      icon = <AlertCircle size={iconSize} className="text-[var(--theme-text-danger)]" />;
      title = "HTML Export failed. Check console.";
      buttonStyle = `bg-[var(--theme-bg-danger)] text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)]`;
      break;
    default: 
      icon = <FileCode2 size={iconSize} />;
      break;
  }
  
  const baseStyle = `p-1 rounded-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-opacity-70 ${className || ''}`;

  return (
    <button
      onClick={handleExport}
      disabled={exportState === 'exporting'}
      className={`${baseStyle} ${buttonStyle}`}
      aria-label={title}
      title={title}
    >
      {icon}
    </button>
  );
};


marked.setOptions({
  breaks: true,
  gfm: true,    
});

const renderThoughtsMarkdown = (content: string) => {
  const rawMarkup = marked.parse(content || ''); 
  const cleanMarkup = DOMPurify.sanitize(rawMarkup as string);
  return { __html: cleanMarkup };
};


const ICON_COPY_SVG_STRING = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-copy"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>`;
const ICON_CHECK_SVG_STRING = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--theme-text-success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_DOWNLOAD_SVG_STRING = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`;
const ICON_LOADER_SVG_STRING = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-loader-2 animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`;
const ICON_CHEVRON_DOWN_SVG_STRING = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
const ICON_CHEVRON_UP_SVG_STRING = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
const ICON_MAXIMIZE_SVG_STRING = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-maximize"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;
const ICON_EXTERNAL_LINK_SVG_STRING = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>`;


const CODE_BLOCK_FOLDABLE_LINE_THRESHOLD = 8;

const isHtmlContent = (codeElement: HTMLElement, textContent: string): boolean => {
  if (codeElement.classList.contains('language-html') || codeElement.classList.contains('language-svg')) return true;
  const s = textContent.trim().toLowerCase();
  if (s.startsWith('<!doctype html>') || (s.includes('<html') && s.includes('</html>')) || (s.includes('<body') && s.includes('</body>')) || (s.includes('<head') && s.includes('</head>'))) return true;
  if (s.startsWith('<svg') && s.includes('</svg>')) return true;
  
  const commonHtmlTags = ['<div', '<p', '<span', '<a', '<table', '<form', '<button', '<input', '<script', '<style'];
  const hasHtmlTags = commonHtmlTags.some(tag => s.includes(tag));
  const hasClosingTag = /<\/[a-z]+>/.test(s);
  if (hasHtmlTags && hasClosingTag && (s.match(/</g)?.length || 0) > 1) {
      if ((s.includes('<svg') && s.includes('</svg>')) && !(s.includes('<body') || s.includes('<!doctype html>'))) return true; 
      if (!(s.includes('<svg') && s.includes('</svg>'))) return true; 
  }
  return false;
};

const createUtilityButton = (
    initialIconSvg: string, initialAriaLabel: string, initialTitle: string,
    actionCallback: (iconContainer: HTMLSpanElement, button: HTMLButtonElement) => Promise<void> | void,
    noSuccessStateChange?: boolean 
  ): HTMLButtonElement => {
    const button = document.createElement('button');
    button.className = 'code-block-utility-button rounded-md shadow-sm transition-colors focus:outline-none flex items-center justify-center'; // Tailwind CSS controls padding via utility class in index.html
    const iconContainer = document.createElement('span');
    iconContainer.innerHTML = initialIconSvg;
    button.appendChild(iconContainer);
    button.setAttribute('aria-label', initialAriaLabel);
    button.title = initialTitle;
    let operationTimeoutId: number | null = null;
    
    button.addEventListener('click', async (e) => {
      e.stopPropagation(); 
      if (operationTimeoutId) clearTimeout(operationTimeoutId);
      button.disabled = true;
      iconContainer.innerHTML = ICON_LOADER_SVG_STRING;
      try {
        await actionCallback(iconContainer, button);
         if (!noSuccessStateChange) { 
            iconContainer.innerHTML = ICON_CHECK_SVG_STRING;
            button.setAttribute('aria-label', `${initialTitle.split(' ')[0]} successful!`);
        } else { 
            iconContainer.innerHTML = initialIconSvg;
        }
      } catch (err) {
        console.error(`Action failed for ${initialTitle}:`, err);
        iconContainer.innerHTML = initialIconSvg; 
        button.setAttribute('aria-label', `Failed to ${initialTitle.toLowerCase()}`);
      } finally {
        button.disabled = false;
        operationTimeoutId = window.setTimeout(() => {
          iconContainer.innerHTML = initialIconSvg;
          button.setAttribute('aria-label', initialAriaLabel);
          button.title = initialTitle;
        }, noSuccessStateChange ? 500 : 2000); 
      }
    });
    return button;
};

const createCopyButtonForCodeBlock = (codeText: string): HTMLButtonElement => {
  return createUtilityButton(ICON_COPY_SVG_STRING, 'Copy code to clipboard', 'Copy code',
    async (iconContainer, button) => {
      await navigator.clipboard.writeText(codeText);
    }
  );
};

const createDownloadButton = (codeText: string, mimeType: string = 'text/plain', defaultFilename: string = 'snippet.txt'): HTMLButtonElement => {
  let filename = defaultFilename;
  if (mimeType === 'text/html') filename = 'snippet.html';
  else if (mimeType === 'application/javascript' || mimeType === 'text/javascript') filename = 'snippet.js';
  else if (mimeType === 'text/css') filename = 'snippet.css';
  else if (mimeType === 'application/json') filename = 'snippet.json';
  else if (mimeType === 'application/xml' || mimeType === 'text/xml') filename = 'snippet.xml';
  else if (mimeType === 'text/markdown') filename = 'snippet.md';

  return createUtilityButton(ICON_DOWNLOAD_SVG_STRING, `Download ${filename.split('.').pop()?.toUpperCase() || 'File'}`, `Download ${filename}`,
    async (iconContainer, button) => {
      button.setAttribute('aria-label', `Downloading ${filename.split('.').pop()?.toUpperCase() || 'File'}...`);
      const blob = new Blob([codeText], { type: `${mimeType};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }
  );
};

const createHtmlModalPreviewButton = (
    codeText: string, 
    onPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void
): HTMLButtonElement => {
  return createUtilityButton(ICON_MAXIMIZE_SVG_STRING, 'Preview HTML in modal', 'Modal Preview',
    async () => { 
      onPreview(codeText, { initialTrueFullscreen: false });
    },
    true 
  );
};

const createHtmlTrueFullscreenPreviewButton = (
  codeText: string,
  onPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void
): HTMLButtonElement => {
  return createUtilityButton(
    ICON_EXTERNAL_LINK_SVG_STRING, 
    'Preview HTML in true fullscreen',
    'True Fullscreen Preview',
    async () => {
      onPreview(codeText, { initialTrueFullscreen: true });
    },
    true
  );
};


const MessageCopyButton: React.FC<{ textToCopy?: string; className?: string }> = ({ textToCopy, className }) => {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const iconSize = window.innerWidth < 640 ? 14 : 16;


  const handleCopy = async () => {
    if (!textToCopy || copied) return;
    setError(false);
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err)      {
      console.error('Failed to copy message content: ', err);
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };
  
  let baseStyle = `p-1 rounded-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-opacity-70 ${className || ''}`;
  let stateStyle = 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)]';

  if (copied) {
    stateStyle = 'bg-[var(--theme-bg-success)] text-[var(--theme-text-success)] hover:bg-[var(--theme-bg-success)]'; 
  } else if (error) {
    stateStyle = 'bg-[var(--theme-bg-danger)] text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)]'; 
  }

  return (
    <button
      onClick={handleCopy}
      disabled={!textToCopy}
      className={`${baseStyle} ${stateStyle}`}
      aria-label={copied ? "Content copied!" : error ? "Copy failed" : "Copy message content"}
      title={copied ? "Copied!" : error ? "Failed to copy" : "Copy content"}
    >
      {copied ? <Check size={iconSize} className="text-[var(--theme-text-success)]" /> : <ClipboardCopy size={iconSize} />}
    </button>
  );
};

const MessageTimer: React.FC<{ startTime?: Date; endTime?: Date; isLoading?: boolean }> = ({
  startTime, endTime, isLoading,
}) => {
  const [elapsedTime, setElapsedTime] = useState<string>('');
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (isLoading && startTime instanceof Date) {
      const updateTimer = () => {
        const now = new Date();
        const diffMs = now.getTime() - startTime.getTime();
        setElapsedTime(`${(diffMs / 1000).toFixed(1)}s`);
      };
      updateTimer();
      intervalId = setInterval(updateTimer, 200);
    } else if (!isLoading && startTime instanceof Date && endTime instanceof Date) {
      const diffMs = endTime.getTime() - startTime.getTime();
      setElapsedTime(`${(diffMs / 1000).toFixed(1)}s`);
      if (intervalId) clearInterval(intervalId);
    } else {
      if (!isLoading && startTime && endTime && (!(startTime instanceof Date) || !(endTime instanceof Date))) {
        console.warn('MessageTimer: startTime or endTime is not a valid Date object.', { startTime, endTime });
        setElapsedTime('?s');
      } else {
        setElapsedTime('');
      }
      if (intervalId) clearInterval(intervalId);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [startTime, endTime, isLoading]);

  if (!elapsedTime && !(isLoading && startTime)) return null;
  const displayTime = elapsedTime || (isLoading && startTime ? "0.0s" : "");

  return (
    <span className="text-xs text-[var(--theme-text-tertiary)] tabular-nums pt-0.5 flex items-center"> 
      {isLoading && startTime && <Loader2 size={10} className="animate-spin mr-1 text-[var(--theme-text-tertiary)]" />} 
      {displayTime}
    </span>
  );
};

const TokenDisplay: React.FC<{ message: ChatMessage }> = ({ message }) => {
  // Show token info only for model messages that have some token data.
  // User messages don't have prompt/completion/total tokens in the same way.
  // Error messages also might not have this.
  if (message.role !== 'model' || (
      typeof message.promptTokens !== 'number' &&
      typeof message.completionTokens !== 'number' &&
      typeof message.cumulativeTotalTokens !== 'number'
  )) {
    return null;
  }

  const parts: string[] = [];
  // Display promptTokens for the current turn if available
  if (typeof message.promptTokens === 'number') {
    parts.push(`Input: ${message.promptTokens}`);
  }
  // Display completionTokens for the current turn if available
  if (typeof message.completionTokens === 'number') {
    parts.push(`Output: ${message.completionTokens}`);
  }
  // Display cumulativeTotalTokens if available
  if (typeof message.cumulativeTotalTokens === 'number') {
    parts.push(`Total: ${message.cumulativeTotalTokens}`);
  }
  
  if (parts.length === 0) return null;

  return (
    <span className="text-xs text-[var(--theme-text-tertiary)] tabular-nums pt-0.5 flex items-center" title="Token Usage (Input/Output for current turn, Total is cumulative for session)">
      <Sigma size={10} className="mr-1.5 opacity-80" />
      {parts.join(' | ')}
      {parts.length > 0 && <span className="ml-1">tokens</span>}
    </span>
  );
};


interface FileDisplayProps {
  file: UploadedFile;
  onImageClick?: (file: UploadedFile) => void;
  isFromMessageList?: boolean; // New prop to distinguish context
}

const FileDisplay: React.FC<FileDisplayProps> = ({ file, onImageClick, isFromMessageList }) => {
  const commonClasses = "flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-md bg-[var(--theme-bg-input)] bg-opacity-50 border border-[var(--theme-border-secondary)]";
  const textClasses = "text-xs sm:text-sm";
  const nameClass = "font-medium truncate block";
  const detailsClass = "text-xs text-[var(--theme-text-tertiary)]";
  const [idCopied, setIdCopied] = useState(false);
  const iconSize = window.innerWidth < 640 ? 20 : 24;


  const isClickableImage = SUPPORTED_IMAGE_MIME_TYPES.includes(file.type) && file.dataUrl && !file.error && onImageClick;

  const handleCopyId = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!file.fileApiName) return;
    navigator.clipboard.writeText(file.fileApiName)
      .then(() => {
        setIdCopied(true);
        setTimeout(() => setIdCopied(false), 2000);
      })
      .catch(err => console.error("Failed to copy file ID:", err));
  };

  const imageElement = (
      <img 
        src={file.dataUrl} 
        alt={file.name} 
        className={`max-w-[100px] sm:max-w-[120px] max-h-28 sm:max-h-32 rounded-lg object-contain border border-[var(--theme-border-secondary)] ${isClickableImage ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
        aria-label={`Uploaded image: ${file.name}`}
        onClick={isClickableImage ? () => onImageClick && onImageClick(file) : undefined}
        tabIndex={isClickableImage ? 0 : -1} 
        onKeyDown={isClickableImage ? (e) => { if ((e.key === 'Enter' || e.key === ' ') && onImageClick) onImageClick(file); } : undefined}
      />
  );
  
  return (
    <div className={`${commonClasses} ${file.error ? 'border-[var(--theme-bg-danger)]' : ''} relative group`}>
      {SUPPORTED_IMAGE_MIME_TYPES.includes(file.type) && file.dataUrl && !file.error ? (
        imageElement
      ) : SUPPORTED_VIDEO_MIME_TYPES.includes(file.type) && !file.error ? (
        <>
          <FileVideo size={iconSize} className="text-[var(--theme-text-tertiary)] flex-shrink-0" />
          <div className={textClasses}>
            <span className={nameClass} title={file.name}>{file.name}</span>
            <span className={detailsClass}>{file.type} - {(file.size / 1024).toFixed(1)} KB</span>
          </div>
        </>
      ) : SUPPORTED_AUDIO_MIME_TYPES.includes(file.type) && !file.error ? (
        <>
          <FileAudio size={iconSize} className="text-[var(--theme-text-tertiary)] flex-shrink-0" />
          <div className={textClasses}>
            <span className={nameClass} title={file.name}>{file.name}</span>
            <span className={detailsClass}>{file.type} - {(file.size / 1024).toFixed(1)} KB</span>
          </div>
        </>
      ) : SUPPORTED_PDF_MIME_TYPES.includes(file.type) && !file.error ? ( 
        <>
          <FileText size={iconSize} className="text-red-500 flex-shrink-0" /> 
          <div className={textClasses}>
            <span className={nameClass} title={file.name}>{file.name}</span>
            <span className={detailsClass}>{file.type} - {(file.size / 1024).toFixed(1)} KB</span>
          </div>
        </>
      ) : SUPPORTED_TEXT_MIME_TYPES.includes(file.type) && !file.error ? (
        <>
          <FileText size={iconSize} className="text-[var(--theme-text-tertiary)] flex-shrink-0" />
          <div className={textClasses}>
            <span className={nameClass} title={file.name}>{file.name}</span>
            <span className={detailsClass}>{file.type} - {(file.size / 1024).toFixed(1)} KB</span>
          </div>
        </>
      ) : ( 
        <>
          <AlertCircle size={iconSize} className={`${file.error ? 'text-[var(--theme-text-danger)]' : 'text-[var(--theme-text-tertiary)]'} flex-shrink-0`} />
           <div className={textClasses}>
            <span className={nameClass} title={file.name}>{file.name}</span>
            <span className={detailsClass}>{file.type} - {(file.size / 1024).toFixed(1)} KB</span>
          </div>
        </>
      )}
      {file.error && (
        <p className="text-xs text-[var(--theme-text-danger)] ml-auto pl-2 flex-shrink-0" title={file.error}>Error</p>
      )}
      {isFromMessageList && file.fileApiName && file.uploadState === 'active' && !file.error && (
        <button
          onClick={handleCopyId}
          title={idCopied ? "File ID Copied!" : "Copy File ID (e.g., files/xyz123)"}
          aria-label={idCopied ? "File ID Copied!" : "Copy File ID"}
          className={`absolute top-0.5 right-0.5 sm:top-1 sm:right-1 p-0.5 rounded-full bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] transition-all
                      ${idCopied ? 'text-[var(--theme-text-success)]' : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)]'}
                      opacity-0 group-hover:opacity-100 focus:opacity-100`}
        >
          {idCopied ? <Check size={12} /> : <ClipboardCopy size={12} />}
        </button>
      )}
    </div>
  );
};


interface ImageZoomModalProps {
  file: UploadedFile | null;
  onClose: () => void;
  themeColors: ThemeColors;
}

const ImageZoomModal: React.FC<ImageZoomModalProps> = ({ file, onClose, themeColors }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const MIN_SCALE = 0.2;
  const MAX_SCALE = 10;
  const ZOOM_SPEED_FACTOR = 1.1;

  useEffect(() => {
    if (file) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [file]);

  const handleWheel = useCallback((event: WheelEvent) => {
    if (!viewportRef.current || !file) return;
    event.preventDefault();

    const rect = viewportRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left; 
    const mouseY = event.clientY - rect.top; 

    const newScale = event.deltaY < 0 
      ? Math.min(MAX_SCALE, scale * ZOOM_SPEED_FACTOR) 
      : Math.max(MIN_SCALE, scale / ZOOM_SPEED_FACTOR);
    
    if (newScale === scale) return; 

    const newPositionX = mouseX - (mouseX - position.x) * (newScale / scale);
    const newPositionY = mouseY - (mouseY - position.y) * (newScale / scale);
    
    setPosition({ x: newPositionX, y: newPositionY });
    setScale(newScale);
  }, [scale, position, file]);

  const handleMouseDown = (event: React.MouseEvent<HTMLImageElement>) => {
    if (!file || event.button !== 0) return; 
    event.preventDefault();
    setIsDragging(true);
    setDragStart({ 
      x: event.clientX - position.x, 
      y: event.clientY - position.y 
    });
    if (imageRef.current) imageRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !file) return;
    event.preventDefault();
    setPosition({
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y,
    });
  };

  const handleMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!file) return;
    event.preventDefault();
    setIsDragging(false);
    if (imageRef.current) imageRef.current.style.cursor = 'grab';
  };
  
  const handleMouseLeave = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) { 
        handleMouseUp(event);
    }
  };


  useEffect(() => {
    const vpRef = viewportRef.current;
    if (vpRef && file) {
      vpRef.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (vpRef && file) {
        vpRef.removeEventListener('wheel', handleWheel);
      }
    };
  }, [handleWheel, file]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    if (file) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, onClose]);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === viewportRef.current?.parentElement) { // Check if click is on the direct parent (backdrop)
        onClose();
    }
  };


  if (!file || !file.dataUrl) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-2 sm:p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-zoom-modal-title"
      onClick={handleBackdropClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave} 
    >
        <h2 id="image-zoom-modal-title" className="sr-only">Zoomed Image: {file.name}</h2>
        <div 
            ref={viewportRef} 
            className="w-full h-full flex items-center justify-center overflow-hidden relative"
        >
          <img
            ref={imageRef}
            src={file.dataUrl}
            alt={`Zoomed view of ${file.name}`}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: '0 0', 
              transition: isDragging ? 'none' : 'transform 0.05s ease-out',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none', 
            }}
            onMouseDown={handleMouseDown}
            draggable="false" 
          />
        </div>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1.5 sm:p-2 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-input)] text-[var(--theme-text-primary)] rounded-full shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]"
          aria-label="Close image zoom view"
          title="Close (Esc)"
        >
          <X size={window.innerWidth < 640 ? 20 : 24} />
        </button>
         <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg shadow-lg text-xs select-none">
            {file.name} ({(scale * 100).toFixed(0)}%)
        </div>
    </div>
  );
};


export const MessageList: React.FC<MessageListProps> = ({ 
    messages, messagesEndRef, scrollContainerRef, onScrollContainerScroll, 
    onEditMessage, onDeleteMessage, onRetryMessage, showThoughts, themeColors, baseFontSize
}) => {
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});
  const [expandedCodeBlocks, setExpandedCodeBlocks] = useState<Record<string, boolean>>({});
  const [zoomedFile, setZoomedFile] = useState<UploadedFile | null>(null);
  
  const [isHtmlPreviewModalOpen, setIsHtmlPreviewModalOpen] = useState(false);
  const [htmlToPreview, setHtmlToPreview] = useState<string | null>(null);
  const [initialTrueFullscreenRequest, setInitialTrueFullscreenRequest] = useState(false);
  const [_previewedMessageId, setPreviewedMessageId] = useState<string | null>(null); // Underscore to indicate it's for context if needed
  const previewedCodeBlockGlobalIdRef = useRef<string | null>(null);


  const toggleThoughts = (messageId: string) => {
    setExpandedThoughts(prev => ({ ...prev, [messageId]: !(prev[messageId] ?? false) }));
  };

  const handleImageClick = (file: UploadedFile) => {
    setZoomedFile(file);
  };

  const closeImageZoomModal = () => {
    setZoomedFile(null);
  };

  const handleOpenHtmlPreview = useCallback((
      htmlContent: string, 
      options?: { initialTrueFullscreen?: boolean },
      messageId?: string, // Added messageId
      codeBlockId?: string // Added codeBlockId
    ) => {
    setHtmlToPreview(htmlContent);
    if (messageId) setPreviewedMessageId(messageId);
    if (codeBlockId) previewedCodeBlockGlobalIdRef.current = codeBlockId;
    setInitialTrueFullscreenRequest(options?.initialTrueFullscreen ?? false);
    setIsHtmlPreviewModalOpen(true);
  }, []);

  const handleCloseHtmlPreview = useCallback(() => {
    setIsHtmlPreviewModalOpen(false);
    setHtmlToPreview(null);
    setInitialTrueFullscreenRequest(false);
    setPreviewedMessageId(null);
    previewedCodeBlockGlobalIdRef.current = null;
  }, []);


  useEffect(() => {
    const setupInteractiveCodeBlocks = () => {
      document.querySelectorAll('.markdown-body pre').forEach((preElement) => {
        if (!(preElement instanceof HTMLElement)) return;

        const messageElement = preElement.closest('[data-message-id]');
        const messageDomId = messageElement?.getAttribute('data-message-id');

        if (!messageDomId) return; 

        const allPotentialPresInMessage = Array.from(messageElement.querySelectorAll('pre'));
        const actualCodePresInMessage = allPotentialPresInMessage.filter(p => 
            p instanceof HTMLElement && 
            !p.classList.contains('katex-block') && 
            !p.querySelector('.katex-display') &&   
            !p.querySelector('code.katex')          
        );
        
        const indexInMessage = actualCodePresInMessage.indexOf(preElement as HTMLPreElement);
        if (indexInMessage === -1) return;

        const uniqueCodeBlockId = `codeblock-${messageDomId}-${indexInMessage}`;
        
        if (!preElement.dataset.interactiveSetupComplete) {
          let originalCodeElement = preElement.querySelector<HTMLElement>('code');
          // If rehype-highlight already processed it, it might be nested if there was old wrapper
           if (!originalCodeElement && preElement.firstChild && preElement.firstChild.nodeName === "CODE") {
             originalCodeElement = preElement.firstChild as HTMLElement;
           }


          if (!originalCodeElement || originalCodeElement.classList.contains('katex')) {
            preElement.dataset.interactiveSetupComplete = 'true'; 
            return;
          }
          
          const oldHeaderQuery = preElement.querySelector('.code-block-header');
          if (oldHeaderQuery) oldHeaderQuery.remove();
          const oldWrapperQuery = preElement.querySelector('.code-block-content-wrapper');
           // Ensure originalCodeElement is a direct child of preElement before creating new wrapper
          if (oldWrapperQuery && oldWrapperQuery.contains(originalCodeElement)) {
              preElement.appendChild(originalCodeElement); oldWrapperQuery.remove();
          } else if (oldWrapperQuery) { oldWrapperQuery.remove(); }
          
          const headerDiv = document.createElement('div');
          headerDiv.className = 'code-block-header absolute top-0 left-0 right-0 flex items-center justify-between z-10';
          
          const toggleButton = document.createElement('button');
          toggleButton.className = 'code-block-toggle-button p-1 rounded-md flex items-center gap-1.5 focus:outline-none select-none'; 

          const toggleIcon = document.createElement('span'); 
          const toggleText = document.createElement('span'); 
          toggleButton.appendChild(toggleIcon); 
          toggleButton.appendChild(toggleText);
          toggleButton.addEventListener('click', () => setExpandedCodeBlocks(prev => ({ ...prev, [uniqueCodeBlockId]: !(prev[uniqueCodeBlockId] === true) })));
          
          const actionsContainer = document.createElement('div');
          actionsContainer.className = 'code-block-actions-container flex items-center gap-1 sm:gap-2';
          
          headerDiv.appendChild(toggleButton); 
          headerDiv.appendChild(actionsContainer); 
          preElement.prepend(headerDiv);
          
          const contentWrapper = document.createElement('div');
          contentWrapper.className = 'code-block-content-wrapper overflow-hidden';
          contentWrapper.id = `${uniqueCodeBlockId}-content`;
          contentWrapper.style.transition = 'max-height 0.25s ease-in-out';
          contentWrapper.appendChild(originalCodeElement); 
          preElement.appendChild(contentWrapper);
          preElement.dataset.interactiveSetupComplete = 'true';
        }

        const headerDiv = preElement.querySelector<HTMLDivElement>('.code-block-header');
        const contentWrapper = preElement.querySelector<HTMLDivElement>('.code-block-content-wrapper');
        const currentCodeElement = contentWrapper?.querySelector<HTMLElement>('code');
        
        if (!headerDiv || !contentWrapper || !currentCodeElement) { 
            delete preElement.dataset.interactiveSetupComplete; 
            return; 
        }

        // With rehype-highlight, highlighting is done by the plugin.
        // The check for data-highlighted and manual call to hljs.highlightElement are removed.

        const currentCodeText = currentCodeElement.innerText;
        const lineCount = currentCodeText.split('\n').length;
        const isFoldable = lineCount >= CODE_BLOCK_FOLDABLE_LINE_THRESHOLD;

        let languageClass = Array.from(currentCodeElement.classList).find(cls => cls.startsWith('language-'));
        let language = languageClass ? languageClass.replace('language-', '') : 'txt';
        let mimeType = 'text/plain';
        if (language === 'html' || language === 'xml' || language === 'svg') mimeType = 'text/html'; 
        else if (language === 'javascript' || language === 'js' || language === 'typescript' || language === 'ts') mimeType = 'application/javascript';
        else if (language === 'css') mimeType = 'text/css';
        else if (language === 'json') mimeType = 'application/json';
        else if (language === 'markdown' || language === 'md') mimeType = 'text/markdown';
        
        const isLikelyHTML = isHtmlContent(currentCodeElement, currentCodeText);
        const downloadMimeType = mimeType !== 'text/plain' ? mimeType : (isLikelyHTML ? 'text/html' : 'text/plain');
        const finalLanguage = language === 'txt' && isLikelyHTML ? 'html' : (language === 'xml' && isLikelyHTML ? 'html' : language);
        
        const actionsContainer = headerDiv.querySelector<HTMLDivElement>('.code-block-actions-container');
        if (actionsContainer) {
          actionsContainer.innerHTML = ''; 
          
          const modalPreviewButtonCallback = (htmlFromButton: string, optsFromButton?: { initialTrueFullscreen?: boolean }) => {
              handleOpenHtmlPreview(htmlFromButton, optsFromButton, messageDomId, uniqueCodeBlockId);
          };
          const trueFullscreenButtonCallback = (htmlFromButton: string, optsFromButton?: { initialTrueFullscreen?: boolean }) => {
              handleOpenHtmlPreview(htmlFromButton, optsFromButton, messageDomId, uniqueCodeBlockId);
          };

          if (isLikelyHTML) {
            actionsContainer.appendChild(createHtmlTrueFullscreenPreviewButton(currentCodeText, trueFullscreenButtonCallback));
            actionsContainer.appendChild(createHtmlModalPreviewButton(currentCodeText, modalPreviewButtonCallback));
          }
          actionsContainer.appendChild(createDownloadButton(currentCodeText, downloadMimeType, `snippet.${finalLanguage}`));
          actionsContainer.appendChild(createCopyButtonForCodeBlock(currentCodeText));
        }
        
        if (isHtmlPreviewModalOpen && previewedCodeBlockGlobalIdRef.current === uniqueCodeBlockId) {
          if (htmlToPreview !== currentCodeText) {
            setHtmlToPreview(currentCodeText);
          }
        }
        
        const toggleButton = headerDiv.querySelector<HTMLButtonElement>('.code-block-toggle-button');
        const toggleIcon = toggleButton?.querySelector<HTMLSpanElement>('span:first-child'); 
        const toggleText = toggleButton?.querySelector<HTMLSpanElement>('span:last-child'); 

        const existingFooterButton = contentWrapper.querySelector('.code-block-footer-collapse');

        if (isFoldable) {
          toggleButton.style.display = ''; 
          toggleButton.disabled = false;
          const isExpanded = expandedCodeBlocks[uniqueCodeBlockId] === true;
          toggleButton.setAttribute('aria-expanded', String(isExpanded));
          toggleButton.setAttribute('aria-controls', contentWrapper.id);

          if (isExpanded) {
            toggleText.textContent = 'Hide Code'; 
            toggleIcon.innerHTML = ICON_CHEVRON_UP_SVG_STRING;
            
            if (!existingFooterButton) {
              const footerCollapseButton = document.createElement('button');
              footerCollapseButton.className = 'code-block-footer-collapse flex items-center justify-center w-full p-1.5 mt-1 text-xs text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)] bg-[var(--theme-bg-input)] hover:bg-[var(--theme-bg-secondary)] border-t border-[var(--theme-border-secondary)] transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--theme-border-focus)] focus:ring-opacity-50';
              const footerIcon = document.createElement('span');
              footerIcon.innerHTML = ICON_CHEVRON_UP_SVG_STRING;
              const footerText = document.createElement('span');
              footerText.className = 'ml-1.5';
              footerText.textContent = 'Collapse';
              footerCollapseButton.appendChild(footerIcon);
              footerCollapseButton.appendChild(footerText);
              footerCollapseButton.setAttribute('aria-label', 'Collapse code block');
              footerCollapseButton.title = 'Collapse code block';
              footerCollapseButton.addEventListener('click', (e) => {
                e.stopPropagation();
                setExpandedCodeBlocks(prev => ({ ...prev, [uniqueCodeBlockId]: false }));
              });
              contentWrapper.appendChild(footerCollapseButton);
            }
            
            contentWrapper.style.transition = 'none'; 
            contentWrapper.style.maxHeight = `${contentWrapper.scrollHeight}px`;
            void contentWrapper.offsetHeight; 
            contentWrapper.style.transition = 'max-height 0.25s ease-in-out';
          } else { 
            toggleText.textContent = 'Show Code'; 
            toggleIcon.innerHTML = ICON_CHEVRON_DOWN_SVG_STRING;
            if (existingFooterButton) {
              existingFooterButton.remove();
            }
            contentWrapper.style.maxHeight = '0px';
          }
        } else { 
          toggleButton.style.display = 'none'; 
          toggleButton.disabled = true;
          if (existingFooterButton) {
            existingFooterButton.remove();
          }
          contentWrapper.style.maxHeight = 'none'; 
          contentWrapper.style.transition = 'none'; 
        }
      });
    };
    setupInteractiveCodeBlocks();
  }, [messages, expandedCodeBlocks, showThoughts, handleOpenHtmlPreview, isHtmlPreviewModalOpen, htmlToPreview]); 

  return (
    <>
    <div 
      ref={scrollContainerRef}
      onScroll={onScrollContainerScroll}
      className="flex-grow overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 bg-[var(--theme-bg-secondary)] custom-scrollbar"
      aria-live="polite" 
    >
      {messages.map((msg) => {
        const areThoughtsVisibleForThisMessage = msg.role === 'model' && msg.thoughts && showThoughts;
        const isThoughtsContentExpanded = expandedThoughts[msg.id] ?? false;

        const showPrimaryThinkingIndicator =
          msg.isLoading &&
          msg.role === 'model' &&
          !msg.content && 
          (!showThoughts || !msg.thoughts); 
        
        const canRetryMessage = (msg.role === 'model' || (msg.role === 'error' && msg.generationStartTime)) && !msg.isLoading;
        const actionIconSize = window.innerWidth < 640 ? 14 : 16;


        return (
          <div
            key={msg.id}
            data-message-id={msg.id} 
            className={`flex items-start gap-2 group ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {(msg.role === 'model' || msg.role === 'error') && (
              <>
                <div className="flex-shrink-0 w-8 sm:w-10 flex flex-col items-center sticky top-2 sm:top-4 self-start z-10"> 
                  {msg.role === 'model' && <BotIcon />}
                  {msg.role === 'error' && <ErrorMsgIcon />}
                  
                  <div className="flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mt-1 sm:mt-1.5">
                      {canRetryMessage && (
                        <button
                          onClick={() => onRetryMessage(msg.id)}
                          className="p-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)] rounded-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-opacity-70"
                          aria-label="Retry generating this response"
                          title="Retry"
                        >
                          <RotateCw size={actionIconSize} />
                        </button>
                      )}
                      {(msg.content || (msg.thoughts && showThoughts)) && !msg.isLoading && (
                         <MessageCopyButton 
                           textToCopy={msg.thoughts && showThoughts && isThoughtsContentExpanded ? `${msg.thoughts}\n\n${msg.content}` : msg.content}
                         />
                      )}
                      {msg.content && !msg.isLoading && (
                        <>
                          <ExportMessageButton
                            markdownContent={msg.content}
                            messageId={msg.id}
                            themeColors={themeColors}
                          />
                          <ExportMessageToHtmlButton
                            markdownContent={msg.content}
                            messageId={msg.id}
                            themeColors={themeColors}
                          />
                        </>
                      )}
                      {!msg.isLoading && (
                        <button
                          onClick={() => onDeleteMessage(msg.id)}
                          className="p-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-tertiary)] rounded-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-opacity-70"
                          aria-label="Delete message"
                          title="Delete message"
                        >
                          <Trash2 size={actionIconSize} />
                        </button>
                      )}
                    </div>
                </div>
                
                <div
                  className={`max-w-md sm:max-w-xl lg:max-w-2xl xl:max-w-3xl p-2.5 sm:p-3 rounded-xl shadow-md flex flex-col 
                    ${ msg.role === 'model' 
                      ? 'bg-[var(--theme-bg-model-message)] text-[var(--theme-bg-model-message-text)] rounded-bl-none'
                      : 'bg-[var(--theme-bg-error-message)] text-[var(--theme-bg-error-message-text)] rounded-bl-none'
                  }`}
                >
                  {areThoughtsVisibleForThisMessage && (
                    <div className="mb-1.5 p-1.5 sm:p-2 bg-[rgba(0,0,0,0.1)] dark:bg-[rgba(0,0,0,0.2)] rounded-md border border-[var(--theme-border-secondary)]">
                      <button
                        onClick={() => toggleThoughts(msg.id)}
                        className="flex items-center justify-between w-full text-xs font-semibold text-[var(--theme-icon-thought)] mb-1 hover:text-[var(--theme-text-link)] focus:outline-none"
                        aria-expanded={isThoughtsContentExpanded}
                        aria-controls={`thoughts-content-${msg.id}`}
                      >
                        <span className="flex items-center">
                          {msg.isLoading && <Loader2 size={12} className="animate-spin mr-1.5" />}
                          Thinking...
                        </span>
                        {isThoughtsContentExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {isThoughtsContentExpanded && (
                        <div
                          id={`thoughts-content-${msg.id}`}
                          className="text-xs text-[var(--theme-text-secondary)] markdown-body" 
                          dangerouslySetInnerHTML={renderThoughtsMarkdown(msg.thoughts!)} 
                        />
                      )}
                    </div>
                  )}
                  
                  {showPrimaryThinkingIndicator && (
                    <div className="flex items-center text-sm text-[var(--theme-bg-model-message-text)] py-0.5">
                      <Loader2 size={16} className="animate-spin mr-2 text-[var(--theme-bg-accent)]" />
                      Thinking...
                    </div>
                  )}

                  {msg.content && (
                    <div 
                        className="markdown-body" 
                        style={{ fontSize: `${baseFontSize}px` }} // Dynamic font size applied here
                    > 
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex, rehypeHighlight]}
                        >
                            {msg.content}
                        </ReactMarkdown>
                    </div>
                  )}
                  
                  {msg.files && msg.files.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {msg.files.map((file) => (
                         <FileDisplay key={file.id} file={file} onImageClick={handleImageClick} isFromMessageList={true} />
                      ))}
                    </div>
                  )}

                  <div className="mt-1 sm:mt-1.5 flex justify-end items-center gap-2 sm:gap-3">
                    <TokenDisplay message={msg} />
                    {(msg.role === 'model' || (msg.role === 'error' && msg.generationStartTime)) && (msg.isLoading || (msg.generationStartTime && msg.generationEndTime)) && (
                        <MessageTimer
                            startTime={msg.generationStartTime}
                            endTime={msg.generationEndTime}
                            isLoading={msg.isLoading}
                        />
                    )}
                  </div>
                </div> 
              </>
            )}
            
            {msg.role === 'user' && (
              <>
                <div
                  className={`max-w-md sm:max-w-xl lg:max-w-2xl xl:max-w-3xl p-2.5 sm:p-3 rounded-xl shadow-md flex flex-col 
                    bg-[var(--theme-bg-user-message)] text-[var(--theme-bg-user-message-text)] rounded-br-none
                  `}
                >
                  {msg.files && msg.files.length > 0 && (
                    <div className="mb-1.5 sm:mb-2 space-y-1.5 sm:space-y-2">
                      {msg.files.map((file) => (
                         <FileDisplay key={file.id} file={file} onImageClick={handleImageClick} isFromMessageList={true} />
                      ))}
                    </div>
                  )}
                  {(msg.content) && (
                    <div 
                        className="markdown-body" 
                        style={{ fontSize: `${baseFontSize}px` }} // Dynamic font size applied here
                    >
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex, rehypeHighlight]}
                        >
                            {msg.content || ''}
                        </ReactMarkdown>
                    </div>
                  )}
                </div> 

                <div className="flex-shrink-0 w-8 sm:w-10 flex flex-col items-center sticky top-2 sm:top-4 self-start z-10"> 
                  <UserIcon />
                  <div className="flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mt-1 sm:mt-1.5">
                      {!msg.isLoading && ( 
                      <button
                          onClick={() => onEditMessage(msg.id)}
                          className="p-1 text-[var(--theme-icon-edit)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)] rounded-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-opacity-70"
                          aria-label="Edit message"
                          title="Edit message"
                      >
                          <Edit3 size={actionIconSize} />
                      </button>
                      )}
                      {(msg.content || (msg.files && msg.files.length > 0)) && (
                         <MessageCopyButton textToCopy={msg.content} />
                      )}
                      <button
                        onClick={() => onDeleteMessage(msg.id)}
                        className="p-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-tertiary)] rounded-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-opacity-70"
                        aria-label="Delete message"
                        title="Delete message"
                      >
                        <Trash2 size={actionIconSize} />
                      </button>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
    {zoomedFile && (
      <ImageZoomModal 
        file={zoomedFile} 
        onClose={closeImageZoomModal}
        themeColors={themeColors}
      />
    )}
    {isHtmlPreviewModalOpen && htmlToPreview !== null && ( // Ensure htmlToPreview is not null before rendering
      <HtmlPreviewModal
        isOpen={isHtmlPreviewModalOpen}
        onClose={handleCloseHtmlPreview}
        htmlContent={htmlToPreview}
        themeColors={themeColors}
        initialTrueFullscreenRequest={initialTrueFullscreenRequest}
      />
    )}
    </>
  );
};

const UserIcon: React.FC = () => <User size={window.innerWidth < 640 ? 20 : 24} className="text-[var(--theme-icon-user)] flex-shrink-0" />;
const BotIcon: React.FC = () => <Bot size={window.innerWidth < 640 ? 20 : 24} className="text-[var(--theme-icon-model)] flex-shrink-0" />;
const ErrorMsgIcon: React.FC = () => <AlertTriangle size={window.innerWidth < 640 ? 20 : 24} className="text-[var(--theme-icon-error)] flex-shrink-0" />;