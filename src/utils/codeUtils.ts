type PreviewMarkupType = 'html' | 'svg';

const HTML_LANGUAGE_ALIASES = new Set(['html', 'htm']);
const SVG_LANGUAGE_ALIASES = new Set(['svg']);
const HTML_DOCUMENT_REGEX = /^(?:<!doctype\s+html\b[^>]*>\s*)?<html\b[\s\S]*<\/html>$/i;
const SVG_DOCUMENT_REGEX = /^<svg\b[\s\S]*<\/svg>$/i;
const FENCED_CODE_BLOCK_REGEX = /```([^\n`]*)\n?([\s\S]*?)```/g;

const normalizeLanguage = (language?: string): string => {
  if (!language) return '';
  return language.trim().split(/\s+/)[0].toLowerCase();
};

export const getPreviewMarkupType = (textContent: string): PreviewMarkupType | null => {
  if (!textContent) return null;

  const normalizedContent = textContent.trim();
  if (!normalizedContent) return null;

  if (SVG_DOCUMENT_REGEX.test(normalizedContent)) {
    return 'svg';
  }

  if (HTML_DOCUMENT_REGEX.test(normalizedContent)) {
    return 'html';
  }

  return null;
};

export const getCodeBlockPreviewType = (
  textContent: string,
  language?: string,
): PreviewMarkupType | null => {
  const normalizedLanguage = normalizeLanguage(language);

  if (HTML_LANGUAGE_ALIASES.has(normalizedLanguage)) {
    return 'html';
  }

  if (SVG_LANGUAGE_ALIASES.has(normalizedLanguage)) {
    return 'svg';
  }

  return getPreviewMarkupType(textContent);
};

export const extractPreviewableCodeBlock = (
  markdownContent: string,
): { content: string; markupType: PreviewMarkupType } | null => {
  if (!markdownContent) return null;

  for (const match of markdownContent.matchAll(FENCED_CODE_BLOCK_REGEX)) {
    const rawLanguage = match[1] ?? '';
    const rawContent = match[2] ?? '';
    const content = rawContent.trim();
    const markupType = getCodeBlockPreviewType(content, rawLanguage);

    if (markupType) {
      return { content, markupType };
    }
  }

  return null;
};

export const isLikelyHtml = (textContent: string): boolean => {
  return getPreviewMarkupType(textContent) !== null;
};
