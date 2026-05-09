import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { useCopyToClipboard } from '../useCopyToClipboard';
import { extractTextFromNode } from '../../utils/uiUtils';
import { getCodeBlockPreviewType } from '../../utils/codeUtils';
import { createManagedObjectUrl } from '../../services/objectUrlManager';
import { triggerDownload, sanitizeFilename } from '../../utils/export/core';
import { SideViewContent } from '../../types';
import { useI18n } from '../../contexts/I18nContext';

const COLLAPSE_THRESHOLD_PX = 320;

const LANGUAGE_EXTENSION_MAP: Record<string, string> = {
  javascript: 'js',
  js: 'js',
  node: 'js',
  typescript: 'ts',
  ts: 'ts',
  python: 'py',
  py: 'py',
  py3: 'py',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  csharp: 'cs',
  cs: 'cs',
  'c#': 'cs',
  go: 'go',
  golang: 'go',
  rust: 'rs',
  rs: 'rs',
  php: 'php',
  ruby: 'rb',
  rb: 'rb',
  swift: 'swift',
  kotlin: 'kt',
  kt: 'kt',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',
  json: 'json',
  xml: 'xml',
  svg: 'svg',
  yaml: 'yaml',
  yml: 'yaml',
  sql: 'sql',
  shell: 'sh',
  bash: 'sh',
  sh: 'sh',
  zsh: 'sh',
  markdown: 'md',
  md: 'md',
  react: 'jsx',
  jsx: 'jsx',
  tsx: 'tsx',
  vue: 'vue',
  lua: 'lua',
  r: 'r',
  dart: 'dart',
  perl: 'pl',
  pl: 'pl',
  powershell: 'ps1',
  ps1: 'ps1',
  dockerfile: 'dockerfile',
  docker: 'dockerfile',
  batch: 'bat',
  bat: 'bat',
  text: 'txt',
  txt: 'txt',
  plaintext: 'txt',
};

interface UseCodeBlockProps {
  children: React.ReactNode;
  className?: string;
  expandCodeBlocksByDefault: boolean;
  onOpenHtmlPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void;
  onOpenSidePanel: (content: SideViewContent) => void;
}

type CodeElementProps = {
  className?: string;
  children?: React.ReactNode;
};

export const useCodeBlock = ({
  children,
  className,
  expandCodeBlocksByDefault,
  onOpenHtmlPreview,
  onOpenSidePanel,
}: UseCodeBlockProps) => {
  const { t } = useI18n();
  const preRef = useRef<HTMLPreElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [expandedOverride, setExpandedOverride] = useState<boolean | null>(null);

  const { isCopied, copyToClipboard } = useCopyToClipboard();

  // Auto-scroll logic state
  const userHasScrolledUp = useRef(false);
  const prevTextLength = useRef(0);
  const lastKnownScrollTop = useRef(0);

  // Find the code element
  const codeElement = React.Children.toArray(children).find(
    (child): child is React.ReactElement<CodeElementProps> =>
      React.isValidElement<CodeElementProps>(child) &&
      (child.type === 'code' || Boolean(child.props.className?.includes('language-'))),
  );

  // Synchronously resolve content string
  const currentContent = codeElement ? extractTextFromNode(codeElement.props.children) : extractTextFromNode(children);
  const resolvedCodeText = currentContent;
  const isExpanded = expandedOverride ?? expandCodeBlocksByDefault;

  // Scroll handler
  const handleScroll = useCallback(() => {
    const el = preRef.current;
    if (!el) return;

    const previousScrollTop = lastKnownScrollTop.current;
    const isAtBottom = Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop) < 25;

    if (isAtBottom) {
      userHasScrolledUp.current = false;
    } else if (el.scrollTop < previousScrollTop - 1) {
      userHasScrolledUp.current = true;
    }

    lastKnownScrollTop.current = el.scrollTop;
  }, []);

  useEffect(() => {
    const el = preRef.current;
    if (el) {
      lastKnownScrollTop.current = el.scrollTop;
      el.addEventListener('scroll', handleScroll);
      return () => el.removeEventListener('scroll', handleScroll);
    }
    return undefined;
  }, [handleScroll]);

  // Layout effect for overflow and auto-scroll
  useLayoutEffect(() => {
    const preElement = preRef.current;
    if (!preElement) return;

    const isCurrentlyOverflowing = preElement.scrollHeight > COLLAPSE_THRESHOLD_PX;

    if (isCurrentlyOverflowing !== isOverflowing) {
      setIsOverflowing(isCurrentlyOverflowing);
      if (isCurrentlyOverflowing) {
        userHasScrolledUp.current = false;
      }
      lastKnownScrollTop.current = preElement.scrollTop;
      return;
    }

    // Auto-scroll Logic
    const currentLength = resolvedCodeText.length;
    if (!isExpanded && prevTextLength.current > 0 && currentLength > prevTextLength.current) {
      if (!userHasScrolledUp.current) {
        preElement.scrollTop = preElement.scrollHeight;
        lastKnownScrollTop.current = preElement.scrollTop;
      }
    }

    prevTextLength.current = currentLength;
    lastKnownScrollTop.current = preElement.scrollTop;
  }, [children, isExpanded, isOverflowing, resolvedCodeText]);

  const handleToggleExpand = () => {
    setExpandedOverride((prev) => !(prev ?? expandCodeBlocksByDefault));
  };

  const handleCopy = () => {
    if (resolvedCodeText && !isCopied) {
      copyToClipboard(resolvedCodeText);
    }
  };

  // Language processing
  const langMatch = className?.match(/language-(\S+)/);
  const language = langMatch ? langMatch[1].toLowerCase() : 'txt';

  const previewMarkupType = getCodeBlockPreviewType(resolvedCodeText, language);

  let mimeType = 'text/plain';
  if (language === 'svg' || previewMarkupType === 'svg') mimeType = 'image/svg+xml';
  else if (['html', 'xml'].includes(language) || previewMarkupType === 'html') mimeType = 'text/html';
  else if (['javascript', 'js', 'typescript', 'ts'].includes(language)) mimeType = 'application/javascript';
  else if (language === 'css') mimeType = 'text/css';
  else if (language === 'json') mimeType = 'application/json';
  else if (['markdown', 'md'].includes(language)) mimeType = 'text/markdown';

  const showPreview = previewMarkupType !== null;
  const downloadMimeType =
    mimeType !== 'text/plain'
      ? mimeType
      : previewMarkupType === 'svg'
        ? 'image/svg+xml'
        : showPreview
          ? 'text/html'
          : 'text/plain';

  let finalLanguage = language;
  if (previewMarkupType === 'html') finalLanguage = 'html';
  else if (previewMarkupType === 'svg') finalLanguage = 'svg';

  const handleOpenSide = () => {
    let displayTitle = t('htmlPreview_title');
    if (finalLanguage === 'html') {
      const titleMatch = resolvedCodeText.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        displayTitle = titleMatch[1];
      }
    }

    onOpenSidePanel({
      type: 'html',
      content: resolvedCodeText,
      language: finalLanguage,
      title: displayTitle,
    });
  };

  const handleFullscreenPreview = (trueFullscreen: boolean) => {
    onOpenHtmlPreview(resolvedCodeText, { initialTrueFullscreen: trueFullscreen });
  };

  const handleDownload = () => {
    const ext = LANGUAGE_EXTENSION_MAP[finalLanguage.toLowerCase()] || finalLanguage;
    let filename = `snippet.${ext}`;

    if (downloadMimeType === 'text/html' || ext === 'html') {
      const titleMatch = resolvedCodeText.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        const saneTitle = sanitizeFilename(titleMatch[1].trim());
        if (saneTitle) filename = `${saneTitle}.html`;
      }
    }
    const blob = new Blob([resolvedCodeText], { type: downloadMimeType });
    const url = createManagedObjectUrl(blob);
    triggerDownload(url, filename);
  };

  return {
    preRef,
    isExpanded,
    isOverflowing,
    isCopied,
    finalLanguage,
    showPreview,
    handleToggleExpand,
    handleCopy,
    handleOpenSide,
    handleFullscreenPreview,
    handleDownload,
    codeElement,
    COLLAPSE_THRESHOLD_PX,
  };
};
