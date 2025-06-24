

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, MessageListProps, UploadedFile } from '../types'; // Updated MessageListProps import
import { User, Bot, AlertTriangle, Edit3, ChevronDown, ChevronUp, ClipboardCopy, Check, Loader2, FileText, ImageIcon, AlertCircle, FileCode2, Trash2, FileVideo, FileAudio, X, Maximize, Minimize, RotateCw } from 'lucide-react'; // Added FileVideo, FileAudio, ImageIcon, AlertCircle, FileCode2, Trash2, X, Maximize, Minimize, RotateCw
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import html2canvas from 'html2canvas';
import { 
    SUPPORTED_IMAGE_MIME_TYPES, 
    SUPPORTED_TEXT_MIME_TYPES, 
    SUPPORTED_VIDEO_MIME_TYPES, 
    SUPPORTED_AUDIO_MIME_TYPES, 
    ThemeColors 
} from '../constants';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { HtmlPreviewModal } from './HtmlPreviewModal'; // Added import for HtmlPreviewModal


// Interface for ExportMessageButton props
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
    tempDiv.className = 'markdown-body'; // Apply base markdown styles
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px'; // Position off-screen
    tempDiv.style.top = '-9999px';  // Position off-screen
    tempDiv.style.width = '800px';  // Define a reasonable width for the image
    tempDiv.style.padding = '24px'; // Simulate message bubble padding
    tempDiv.style.backgroundColor = themeColors.bgModelMessage; // Message bubble background
    tempDiv.style.color = themeColors.bgModelMessageText;     // Default text color for the bubble
    tempDiv.style.border = `1px solid ${themeColors.borderSecondary}`;
    tempDiv.style.borderRadius = '8px'; // Rounded corners for the bubble
    
    const rawHtml = marked.parse(markdownContent); 
    tempDiv.innerHTML = DOMPurify.sanitize(rawHtml as string);


    tempDiv.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block as HTMLElement);
    });

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

  switch (exportState) {
    case 'exporting':
      icon = <Loader2 size={16} className="animate-spin text-[var(--theme-text-link)]" />;
      title = "Exporting PNG...";
      buttonStyle = `text-[var(--theme-text-link)]`;
      break;
    case 'success':
      icon = <Check size={16} className="text-[var(--theme-text-success)]" />;
      title = "PNG Exported successfully!";
      buttonStyle = `bg-[var(--theme-bg-success)] text-[var(--theme-text-success)] hover:bg-[var(--theme-bg-success)]`;
      break;
    case 'error':
      icon = <AlertCircle size={16} className="text-[var(--theme-text-danger)]" />;
      title = "PNG Export failed. Check console.";
      buttonStyle = `bg-[var(--theme-bg-danger)] text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)]`;
      break;
    default: 
      icon = <ImageIcon size={16} />;
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

  switch (exportState) {
    case 'exporting':
      icon = <Loader2 size={16} className="animate-spin text-[var(--theme-text-link)]" />;
      title = "Exporting HTML...";
      buttonStyle = `text-[var(--theme-text-link)]`;
      break;
    case 'success':
      icon = <Check size={16} className="text-[var(--theme-text-success)]" />;
      title = "HTML Exported successfully!";
      buttonStyle = `bg-[var(--theme-bg-success)] text-[var(--theme-text-success)] hover:bg-[var(--theme-bg-success)]`;
      break;
    case 'error':
      icon = <AlertCircle size={16} className="text-[var(--theme-text-danger)]" />;
      title = "HTML Export failed. Check console.";
      buttonStyle = `bg-[var(--theme-bg-danger)] text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)]`;
      break;
    default: 
      icon = <FileCode2 size={16} />;
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


const CODE_BLOCK_FOLDABLE_LINE_THRESHOLD = 8;

const isHtmlContent = (codeElement: HTMLElement, textContent: string): boolean => {
  if (codeElement.classList.contains('language-html') || codeElement.classList.contains('language-svg')) return true;
  const s = textContent.trim().toLowerCase();
  if (s.startsWith('<!doctype html>') || (s.includes('<html') && s.includes('</html>')) || (s.includes('<body') && s.includes('</body>')) || (s.includes('<head') && s.includes('</head>'))) return true;
  // Check for SVG specifically if not caught by language class
  if (s.startsWith('<svg') && s.includes('</svg>')) return true;
  
  const commonHtmlTags = ['<div', '<p', '<span', '<a', '<table', '<form', '<button', '<input', '<script', '<style'];
  const hasHtmlTags = commonHtmlTags.some(tag => s.includes(tag));
  const hasClosingTag = /<\/[a-z]+>/.test(s);
  if (hasHtmlTags && hasClosingTag && (s.match(/</g)?.length || 0) > 1) {
      // Avoid misidentifying SVG as generic HTML if it's not already class-tagged
      if ((s.includes('<svg') && s.includes('</svg>')) && !(s.includes('<body') || s.includes('<!doctype html>'))) return true; // It's SVG
      if (!(s.includes('<svg') && s.includes('</svg>'))) return true; // It's likely general HTML
  }
  return false;
};

const createUtilityButton = (
    initialIconSvg: string, initialAriaLabel: string, initialTitle: string,
    actionCallback: (iconContainer: HTMLSpanElement, button: HTMLButtonElement) => Promise<void> | void,
    noSuccessStateChange?: boolean // Optional flag
  ): HTMLButtonElement => {
    const button = document.createElement('button');
    button.className = 'code-block-utility-button p-1.5 rounded-md shadow-sm transition-colors focus:outline-none flex items-center justify-center';
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
         if (!noSuccessStateChange) { // Only change to success if not opted out
            iconContainer.innerHTML = ICON_CHECK_SVG_STRING;
            button.setAttribute('aria-label', `${initialTitle.split(' ')[0]} successful!`);
        } else { // If opted out, revert to initial icon immediately after action
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
        }, noSuccessStateChange ? 500 : 2000); // Shorter timeout if no success state change
      }
    });
    return button;
};

const createCopyButtonForCodeBlock = (codeText: string): HTMLButtonElement => {
  return createUtilityButton(ICON_COPY_SVG_STRING, 'Copy code to clipboard', 'Copy code',
    async (iconContainer, button) => {
      await navigator.clipboard.writeText(codeText);
      // Success state (check mark) handled by createUtilityButton's default behavior
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
      // Success state (check mark) handled by createUtilityButton's default behavior
    }
  );
};

const createHtmlPreviewButton = (codeText: string, onPreview: (html: string) => void): HTMLButtonElement => {
  return createUtilityButton(ICON_MAXIMIZE_SVG_STRING, 'Preview HTML in modal', 'Preview HTML',
    async () => { // iconContainer and button are not used here for state change
      onPreview(codeText);
    },
    true // noSuccessStateChange = true, because the modal opening is the success
  );
};


const MessageCopyButton: React.FC<{ textToCopy?: string; className?: string }> = ({ textToCopy, className }) => {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

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
      {copied ? <Check size={16} className="text-[var(--theme-text-success)]" /> : <ClipboardCopy size={16} />}
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

interface FileDisplayProps {
  file: UploadedFile;
  onImageClick?: (file: UploadedFile) => void;
}

const FileDisplay: React.FC<FileDisplayProps> = ({ file, onImageClick }) => {
  const commonClasses = "flex items-center gap-2 p-2 rounded-md bg-[var(--theme-bg-input)] bg-opacity-50 border border-[var(--theme-border-secondary)]";
  const textClasses = "text-sm";
  const nameClass = "font-medium truncate block";
  const detailsClass = "text-xs text-[var(--theme-text-tertiary)]";

  const isClickableImage = SUPPORTED_IMAGE_MIME_TYPES.includes(file.type) && file.dataUrl && !file.error && onImageClick;

  const imageElement = (
      <img 
        src={file.dataUrl} 
        alt={file.name} 
        className={`max-w-[120px] sm:max-w-[150px] max-h-40 rounded-lg object-contain border border-[var(--theme-border-secondary)] ${isClickableImage ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
        aria-label={`Uploaded image: ${file.name}`}
        onClick={isClickableImage ? () => onImageClick(file) : undefined}
      />
  );
  
  return (
    <div className={`${commonClasses} ${file.error ? 'border-[var(--theme-bg-danger)]' : ''}`}>
      {SUPPORTED_IMAGE_MIME_TYPES.includes(file.type) && file.dataUrl && !file.error ? (
        imageElement
      ) : SUPPORTED_VIDEO_MIME_TYPES.includes(file.type) && !file.error ? (
        <>
          <FileVideo size={24} className="text-[var(--theme-text-tertiary)] flex-shrink-0" />
          <div className={textClasses}>
            <span className={nameClass} title={file.name}>{file.name}</span>
            <span className={detailsClass}>{file.type} - {(file.size / 1024).toFixed(1)} KB</span>
          </div>
        </>
      ) : SUPPORTED_AUDIO_MIME_TYPES.includes(file.type) && !file.error ? (
        <>
          <FileAudio size={24} className="text-[var(--theme-text-tertiary)] flex-shrink-0" />
          <div className={textClasses}>
            <span className={nameClass} title={file.name}>{file.name}</span>
            <span className={detailsClass}>{file.type} - {(file.size / 1024).toFixed(1)} KB</span>
          </div>
        </>
      ) : SUPPORTED_TEXT_MIME_TYPES.includes(file.type) && !file.error ? (
        <>
          <FileText size={24} className="text-[var(--theme-text-tertiary)] flex-shrink-0" />
          <div className={textClasses}>
            <span className={nameClass} title={file.name}>{file.name}</span>
            <span className={detailsClass}>{file.type} - {(file.size / 1024).toFixed(1)} KB</span>
          </div>
        </>
      ) : ( // Fallback for errored files or unrecognized (but somehow passed) types
        <>
          <AlertCircle size={24} className={`${file.error ? 'text-[var(--theme-text-danger)]' : 'text-[var(--theme-text-tertiary)]'} flex-shrink-0`} />
           <div className={textClasses}>
            <span className={nameClass} title={file.name}>{file.name}</span>
            <span className={detailsClass}>{file.type} - {(file.size / 1024).toFixed(1)} KB</span>
          </div>
        </>
      )}
      {file.error && (
        <p className="text-xs text-[var(--theme-text-danger)] ml-auto pl-2 flex-shrink-0" title={file.error}>Error</p>
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
      // Reset state when a new file is opened or modal is reopened
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [file]);

  const handleWheel = useCallback((event: WheelEvent) => {
    if (!viewportRef.current || !file) return;
    event.preventDefault();

    const rect = viewportRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left; // Mouse X relative to viewport
    const mouseY = event.clientY - rect.top; // Mouse Y relative to viewport

    const newScale = event.deltaY < 0 
      ? Math.min(MAX_SCALE, scale * ZOOM_SPEED_FACTOR) 
      : Math.max(MIN_SCALE, scale / ZOOM_SPEED_FACTOR);
    
    if (newScale === scale) return; // No change in scale (already at min/max)

    const newPositionX = mouseX - (mouseX - position.x) * (newScale / scale);
    const newPositionY = mouseY - (mouseY - position.y) * (newScale / scale);
    
    setPosition({ x: newPositionX, y: newPositionY });
    setScale(newScale);
  }, [scale, position, file]);

  const handleMouseDown = (event: React.MouseEvent<HTMLImageElement>) => {
    if (!file || event.button !== 0) return; // Only main button
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
    if (isDragging) { // If mouse leaves viewport while dragging, stop dragging
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
    if (event.target === viewportRef.current) { // Click on backdrop itself
        onClose();
    }
  };


  if (!file || !file.dataUrl) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-zoom-modal-title"
      onClick={handleBackdropClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave} // Added to handle mouse leaving viewport
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
              transformOrigin: '0 0', // Ensures scaling is relative to top-left for zoom-to-mouse
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
          className="absolute top-4 right-4 p-2 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-input)] text-[var(--theme-text-primary)] rounded-full shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]"
          aria-label="Close image zoom view"
          title="Close (Esc)"
        >
          <X size={24} />
        </button>
         <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] px-3 py-1.5 rounded-lg shadow-lg text-xs select-none">
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

  const toggleThoughts = (messageId: string) => {
    setExpandedThoughts(prev => ({ ...prev, [messageId]: !(prev[messageId] ?? false) }));
  };

  const handleImageClick = (file: UploadedFile) => {
    setZoomedFile(file);
  };

  const closeImageZoomModal = () => {
    setZoomedFile(null);
  };

  const handleOpenHtmlPreview = useCallback((htmlContent: string) => {
    setHtmlToPreview(htmlContent);
    setIsHtmlPreviewModalOpen(true);
  }, []);

  const handleCloseHtmlPreview = useCallback(() => {
    setIsHtmlPreviewModalOpen(false);
    setHtmlToPreview(null);
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
          if (!originalCodeElement) { 
              const tempWrapper = preElement.querySelector<HTMLElement>('.code-block-content-wrapper code');
              if (tempWrapper) originalCodeElement = tempWrapper;
          }
          
          if (!originalCodeElement || originalCodeElement.classList.contains('katex')) {
            preElement.dataset.interactiveSetupComplete = 'true'; 
            return;
          }

          const oldHeaderQuery = preElement.querySelector('.code-block-header');
          if (oldHeaderQuery) oldHeaderQuery.remove();
          const oldWrapperQuery = preElement.querySelector('.code-block-content-wrapper');
          if (oldWrapperQuery && oldWrapperQuery.contains(originalCodeElement)) {
              preElement.appendChild(originalCodeElement); oldWrapperQuery.remove();
          } else if (oldWrapperQuery) { oldWrapperQuery.remove(); }
          
          const headerDiv = document.createElement('div');
          headerDiv.className = 'code-block-header absolute top-0 left-0 right-0 h-[2.8rem] px-3 flex items-center justify-between z-10';
          
          const toggleButton = document.createElement('button');
          toggleButton.className = 'code-block-toggle-button p-1 rounded-md flex items-center gap-1.5 text-xs focus:outline-none select-none';

          const toggleIcon = document.createElement('span'); 
          const toggleText = document.createElement('span'); 
          toggleButton.appendChild(toggleIcon); 
          toggleButton.appendChild(toggleText);
          toggleButton.addEventListener('click', () => setExpandedCodeBlocks(prev => ({ ...prev, [uniqueCodeBlockId]: !(prev[uniqueCodeBlockId] === true) })));
          
          const actionsContainer = document.createElement('div');
          actionsContainer.className = 'code-block-actions-container flex items-center gap-2';
          
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

        if (!currentCodeElement.dataset.highlighted) {
          hljs.highlightElement(currentCodeElement);
          currentCodeElement.dataset.highlighted = 'true';
        }

        const currentCodeText = currentCodeElement.innerText;
        const lineCount = currentCodeText.split('\n').length;
        const isFoldable = lineCount >= CODE_BLOCK_FOLDABLE_LINE_THRESHOLD;

        let languageClass = Array.from(currentCodeElement.classList).find(cls => cls.startsWith('language-'));
        let language = languageClass ? languageClass.replace('language-', '') : 'txt';
        let mimeType = 'text/plain';
        if (language === 'html' || language === 'xml' || language === 'svg') mimeType = 'text/html'; // Consider SVG as HTML for download
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
          
          if (isLikelyHTML) {
            actionsContainer.appendChild(createHtmlPreviewButton(currentCodeText, handleOpenHtmlPreview));
          }
          actionsContainer.appendChild(createDownloadButton(currentCodeText, downloadMimeType, `snippet.${finalLanguage}`));
          actionsContainer.appendChild(createCopyButtonForCodeBlock(currentCodeText));
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
  }, [messages, expandedCodeBlocks, showThoughts, handleOpenHtmlPreview]); 

  return (
    <>
    <div 
      ref={scrollContainerRef}
      onScroll={onScrollContainerScroll}
      className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-4 bg-[var(--theme-bg-secondary)]"
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

        return (
          <div
            key={msg.id}
            data-message-id={msg.id} 
            className={`flex items-start gap-2.5 group ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {(msg.role === 'model' || msg.role === 'error') && (
              <>
                <div className="flex-shrink-0 w-10 flex flex-col items-center sticky top-4 self-start z-10"> 
                  {msg.role === 'model' && <BotIcon />}
                  {msg.role === 'error' && <ErrorMsgIcon />}
                  
                  <div className="flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mt-1.5">
                      {canRetryMessage && (
                        <button
                          onClick={() => onRetryMessage(msg.id)}
                          className="p-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)] rounded-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-opacity-70"
                          aria-label="Retry generating this response"
                          title="Retry"
                        >
                          <RotateCw size={16} />
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
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                </div>
                
                <div
                  className={`max-w-xl lg:max-w-2xl xl:max-w-3xl p-3 sm:p-4 rounded-xl shadow-md flex flex-col 
                    ${ msg.role === 'model' 
                      ? 'bg-[var(--theme-bg-model-message)] text-[var(--theme-bg-model-message-text)] rounded-bl-none'
                      : 'bg-[var(--theme-bg-error-message)] text-[var(--theme-bg-error-message-text)] rounded-bl-none'
                  }`}
                >
                  {areThoughtsVisibleForThisMessage && (
                    <div className="mb-2 p-2 bg-[rgba(0,0,0,0.1)] dark:bg-[rgba(0,0,0,0.2)] rounded-md border border-[var(--theme-border-secondary)]">
                      <button
                        onClick={() => toggleThoughts(msg.id)}
                        className="flex items-center justify-between w-full text-xs font-semibold text-[var(--theme-icon-thought)] mb-1 hover:text-[var(--theme-text-link)] focus:outline-none"
                        aria-expanded={isThoughtsContentExpanded}
                        aria-controls={`thoughts-content-${msg.id}`}
                      >
                        <span className="flex items-center">
                          {msg.isLoading && <Loader2 size={14} className="animate-spin mr-1.5" />}
                          Thinking...
                        </span>
                        {isThoughtsContentExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
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
                    <div className="flex items-center text-sm text-[var(--theme-bg-model-message-text)] py-1">
                      <Loader2 size={18} className="animate-spin mr-2 text-[var(--theme-bg-accent)]" />
                      Thinking...
                    </div>
                  )}

                  {msg.content && (
                    <div 
                        className="markdown-body" 
                        style={{ fontSize: `${baseFontSize}px` }}
                    > 
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                        >
                            {msg.content}
                        </ReactMarkdown>
                    </div>
                  )}
                  
                  {(msg.role === 'model' || (msg.role === 'error' && msg.generationStartTime)) && (msg.isLoading || (msg.generationStartTime && msg.generationEndTime)) && (
                    <div className="mt-1.5 text-right">
                      <MessageTimer
                        startTime={msg.generationStartTime}
                        endTime={msg.generationEndTime}
                        isLoading={msg.isLoading}
                      />
                    </div>
                  )}
                </div> 
              </>
            )}
            
            {msg.role === 'user' && (
              <>
                <div
                  className={`max-w-xl lg:max-w-2xl xl:max-w-3xl p-3 sm:p-4 rounded-xl shadow-md flex flex-col 
                    bg-[var(--theme-bg-user-message)] text-[var(--theme-bg-user-message-text)] rounded-br-none
                  `}
                >
                  {msg.files && msg.files.length > 0 && (
                    <div className="mb-2 space-y-2">
                      {msg.files.map((file) => (
                         <FileDisplay key={file.id} file={file} onImageClick={handleImageClick} />
                      ))}
                    </div>
                  )}
                  {(msg.content) && (
                    <div 
                        className="markdown-body" 
                        style={{ fontSize: `${baseFontSize}px` }}
                    >
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                        >
                            {msg.content || ''}
                        </ReactMarkdown>
                    </div>
                  )}
                </div> 

                <div className="flex-shrink-0 w-10 flex flex-col items-center sticky top-4 self-start z-10"> 
                  <UserIcon />
                  <div className="flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mt-1.5">
                      {!msg.isLoading && ( 
                      <button
                          onClick={() => onEditMessage(msg.id)}
                          className="p-1 text-[var(--theme-icon-edit)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)] rounded-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-opacity-70"
                          aria-label="Edit message"
                          title="Edit message"
                      >
                          <Edit3 size={16} />
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
                        <Trash2 size={16} />
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
    {isHtmlPreviewModalOpen && htmlToPreview && (
      <HtmlPreviewModal
        isOpen={isHtmlPreviewModalOpen}
        onClose={handleCloseHtmlPreview}
        htmlContent={htmlToPreview}
        themeColors={themeColors}
      />
    )}
    </>
  );
};

const UserIcon: React.FC = () => <User size={24} className="text-[var(--theme-icon-user)] flex-shrink-0" />;
const BotIcon: React.FC = () => <Bot size={24} className="text-[var(--theme-icon-model)] flex-shrink-0" />;
const ErrorMsgIcon: React.FC = () => <AlertTriangle size={24} className="text-[var(--theme-icon-error)] flex-shrink-0" />;