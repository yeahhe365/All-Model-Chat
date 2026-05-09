type PreviewMarkupType = 'html' | 'svg';

const HTML_LANGUAGE_ALIASES = new Set(['html', 'htm']);
const SVG_LANGUAGE_ALIASES = new Set(['svg']);
const HTML_DOCUMENT_REGEX = /^(?:<!doctype\s+html\b[^>]*>\s*)?<html\b[\s\S]*<\/html>$/i;
const HTML_FRAGMENT_TAG_NAMES = [
  'article',
  'aside',
  'blockquote',
  'button',
  'caption',
  'details',
  'div',
  'figure',
  'figcaption',
  'footer',
  'form',
  'h[1-6]',
  'header',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'section',
  'span',
  'summary',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul',
].join('|');
const HTML_FRAGMENT_REGEX = new RegExp(`^<(${HTML_FRAGMENT_TAG_NAMES})(?:\\s[^>]*)?>[\\s\\S]*<\\/\\1>$`, 'i');
const HTML_FRAGMENT_CONTAINER_REGEX = new RegExp(
  `^<(?:${HTML_FRAGMENT_TAG_NAMES})(?:\\s[^>]*)?>[\\s\\S]*<\\/(?:${HTML_FRAGMENT_TAG_NAMES})>$`,
  'i',
);
const HTML_COMMENT_REGEX = /<!--[\s\S]*?-->/g;
const UNSAFE_INLINE_FRAGMENT_TAG_REGEX = /<(?:script|style|iframe|object|embed)\b/i;
const SVG_DOCUMENT_REGEX = /^<svg\b[\s\S]*<\/svg>$/i;
const FENCED_CODE_BLOCK_REGEX = /```([^\n`]*)\n?([\s\S]*?)```/g;
const MISLABELED_HTML_FRAGMENT_LANGUAGES = new Set(['css', 'text', 'txt', 'markdown', 'md']);

const normalizeLanguage = (language?: string): string => {
  if (!language) return '';
  return language.trim().split(/\s+/)[0].toLowerCase();
};

const getPreviewMarkupType = (textContent: string): PreviewMarkupType | null => {
  if (!textContent) return null;

  const normalizedContent = textContent.trim();
  if (!normalizedContent) return null;

  if (SVG_DOCUMENT_REGEX.test(normalizedContent)) {
    return 'svg';
  }

  if (HTML_DOCUMENT_REGEX.test(normalizedContent)) {
    return 'html';
  }

  if (isStandaloneHtmlFragment(normalizedContent)) {
    return 'html';
  }

  return null;
};

const isStandaloneHtmlFragment = (textContent: string): boolean => {
  if (!textContent) return false;

  const normalizedContent = textContent.trim();
  if (!normalizedContent || UNSAFE_INLINE_FRAGMENT_TAG_REGEX.test(normalizedContent)) {
    return false;
  }

  const contentWithoutComments = normalizedContent.replace(HTML_COMMENT_REGEX, '').trim();

  return HTML_FRAGMENT_REGEX.test(contentWithoutComments) || HTML_FRAGMENT_CONTAINER_REGEX.test(contentWithoutComments);
};

const getStandaloneDocumentPreviewType = (textContent: string): PreviewMarkupType | null => {
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

export const getCodeBlockPreviewType = (textContent: string, language?: string): PreviewMarkupType | null => {
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

  const standaloneDocumentType = getStandaloneDocumentPreviewType(markdownContent);
  if (standaloneDocumentType) {
    return { content: markdownContent.trim(), markupType: standaloneDocumentType };
  }

  return null;
};

export const wrapBarePreviewableDocument = (markdownContent: string): string => {
  const content = markdownContent.trim();
  const markupType = getStandaloneDocumentPreviewType(content);

  if (!markupType) {
    return markdownContent;
  }

  return `\`\`\`${markupType}\n${content}\n\`\`\``;
};

const unwrapMislabeledHtmlFragmentCodeBlocks = (markdownContent: string): string => {
  if (!markdownContent) return markdownContent;

  return markdownContent.replace(
    FENCED_CODE_BLOCK_REGEX,
    (match, rawLanguage: string = '', rawContent: string = '') => {
      const normalizedLanguage = normalizeLanguage(rawLanguage);
      const content = rawContent.trim();

      if (MISLABELED_HTML_FRAGMENT_LANGUAGES.has(normalizedLanguage) && isStandaloneHtmlFragment(content)) {
        return content;
      }

      return match;
    },
  );
};

const normalizeStandaloneRawHtmlFragment = (markdownContent: string): string => {
  const content = markdownContent.trim();

  if (!isStandaloneHtmlFragment(content)) {
    return markdownContent;
  }

  return content.replace(/\n[ \t]*\n/g, '\n');
};

export const normalizePreviewableMarkdownContent = (markdownContent: string): string => {
  return wrapBarePreviewableDocument(
    normalizeStandaloneRawHtmlFragment(unwrapMislabeledHtmlFragmentCodeBlocks(markdownContent)),
  );
};

export const isLikelyHtml = (textContent: string): boolean => {
  return getPreviewMarkupType(textContent) !== null;
};
