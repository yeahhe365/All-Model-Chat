import { parseLiveArtifactInteractionSpec } from './liveArtifactInteraction';

type PreviewMarkupType = 'html' | 'svg';
interface NormalizePreviewableMarkdownOptions {
  isStreaming?: boolean;
}

const LIVE_ARTIFACT_HTML_LANGUAGE = 'amc-live-artifact-html';
const LIVE_ARTIFACT_INTERACTION_LANGUAGE = 'amc-live-artifact-interaction';
const HTML_LANGUAGE_ALIASES = new Set(['html', 'htm']);
const SVG_LANGUAGE_ALIASES = new Set(['svg']);
const HTML_DOCUMENT_REGEX = /^(?:<!doctype\s+html\b[^>]*>\s*)?<html\b[\s\S]*<\/html>$/i;
const HTML_DOCUMENT_START_REGEX = /^(?:<!doctype\s+html\b[^>]*>\s*)?(?:<html\b|<head\b|<body\b)/i;
const HTML_DOCTYPE_START_REGEX = /^<!doctype\s+html\b/i;
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
  'label',
  'li',
  'main',
  'meter',
  'nav',
  'ol',
  'p',
  'progress',
  'section',
  'select',
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
const HTML_FRAGMENT_START_REGEX = new RegExp(
  `^(?:<!--[\\s\\S]*?-->\\s*)?<(?:${HTML_FRAGMENT_TAG_NAMES})(?:\\s[^>]*)?>`,
  'i',
);
const HTML_STRUCTURAL_BLANK_LINE_REGEX = new RegExp(
  `\\n[ \\t]*\\n(?=[ \\t]*(?:<!--|<\\/?(?:${HTML_FRAGMENT_TAG_NAMES})(?:\\s|>|/)))`,
  'gi',
);
const HTML_STRUCTURAL_LINE_START_REGEX = new RegExp(
  `^(?:<!--[\\s\\S]*?-->\\s*)?<\\/?(?:${HTML_FRAGMENT_TAG_NAMES})(?:\\s|>|/)`,
  'i',
);
const HTML_COMMENT_REGEX = /<!--[\s\S]*?-->/g;
const UNSAFE_INLINE_FRAGMENT_TAG_REGEX = /<(?:script|style|iframe|object|embed)\b/i;
const SVG_DOCUMENT_REGEX = /^<svg\b[\s\S]*<\/svg>$/i;
const FENCED_CODE_BLOCK_REGEX = /```([^\n`]*)\n?([\s\S]*?)```/g;
const OPEN_FENCED_CODE_BLOCK_AT_END_REGEX = /```([^\n`]*)\n?([\s\S]*)$/;
const MISLABELED_HTML_FRAGMENT_LANGUAGES = new Set(['css', 'text', 'txt', 'markdown', 'md']);
const TOOL_RESULT_FRAGMENT_REGEX = /^<div\b(?=[^>]*\bclass=["'][^"']*\btool-result\b)/i;

const normalizeLanguage = (language?: string): string => {
  if (!language) return '';
  return language.trim().split(/\s+/)[0].toLowerCase();
};

export const isLiveArtifactLanguage = (language?: string): boolean => {
  return normalizeLanguage(language) === LIVE_ARTIFACT_HTML_LANGUAGE;
};

export const isLiveArtifactInteractionLanguage = (language?: string): boolean => {
  return normalizeLanguage(language) === LIVE_ARTIFACT_INTERACTION_LANGUAGE;
};

const isLikelyLiveArtifactInteractionJson = (textContent: string): boolean => {
  const normalizedContent = textContent.trim();
  if (
    !normalizedContent ||
    !normalizedContent.startsWith('{') ||
    !normalizedContent.includes('"instruction"') ||
    !normalizedContent.includes('"schema"')
  ) {
    return false;
  }

  return Boolean(parseLiveArtifactInteractionSpec(normalizedContent));
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

const isLikelyStreamingStandaloneHtmlFragment = (textContent: string): boolean => {
  const normalizedContent = textContent.trim();

  if (!normalizedContent || UNSAFE_INLINE_FRAGMENT_TAG_REGEX.test(normalizedContent)) {
    return false;
  }

  return HTML_FRAGMENT_START_REGEX.test(normalizedContent);
};

const isLikelyStreamingStandaloneHtmlDocument = (textContent: string): boolean => {
  const normalizedContent = textContent.trim();

  if (!normalizedContent) {
    return false;
  }

  return HTML_DOCUMENT_START_REGEX.test(normalizedContent) || HTML_DOCTYPE_START_REGEX.test(normalizedContent);
};

export const isLikelyStreamingHtmlArtifact = (textContent: string): boolean => {
  const normalizedContent = textContent.trim();

  if (!normalizedContent || TOOL_RESULT_FRAGMENT_REGEX.test(normalizedContent)) {
    return false;
  }

  return (
    isLikelyStreamingStandaloneHtmlDocument(normalizedContent) ||
    isLikelyStreamingStandaloneHtmlFragment(normalizedContent)
  );
};

export const isLikelyStreamingLiveArtifactInteractionJson = (textContent: string): boolean => {
  const normalizedContent = textContent.trim();
  const openFenceMatch = normalizedContent.match(OPEN_FENCED_CODE_BLOCK_AT_END_REGEX);
  const candidateContent =
    openFenceMatch && isLiveArtifactInteractionLanguage(openFenceMatch[1])
      ? (openFenceMatch[2] ?? '').trim()
      : normalizedContent;

  return (
    candidateContent.startsWith('{') &&
    candidateContent.includes('"instruction"') &&
    candidateContent.includes('"schema"')
  );
};

const isLikelyHtmlFragmentSegment = (textContent: string): boolean => {
  const normalizedContent = textContent.trim();

  if (!normalizedContent || UNSAFE_INLINE_FRAGMENT_TAG_REGEX.test(normalizedContent)) {
    return false;
  }

  return HTML_STRUCTURAL_LINE_START_REGEX.test(normalizedContent);
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

  if (isLiveArtifactLanguage(normalizedLanguage)) {
    return 'html';
  }

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

const wrapBarePreviewableArtifact = (
  markdownContent: string,
  options: NormalizePreviewableMarkdownOptions = {},
): string => {
  const content = markdownContent.trim();

  if (TOOL_RESULT_FRAGMENT_REGEX.test(content)) {
    return markdownContent;
  }

  const markupType =
    getPreviewMarkupType(content) || (options.isStreaming && isLikelyStreamingHtmlArtifact(content) ? 'html' : null);

  if (!markupType) {
    return markdownContent;
  }

  const artifactLanguage = markupType === 'html' ? LIVE_ARTIFACT_HTML_LANGUAGE : markupType;
  return `\`\`\`${artifactLanguage}\n${content}\n\`\`\``;
};

const wrapBareLiveArtifactInteraction = (
  markdownContent: string,
  options: NormalizePreviewableMarkdownOptions = {},
): string => {
  const content = markdownContent.trim();

  if (
    !isLikelyLiveArtifactInteractionJson(content) &&
    !(options.isStreaming && isLikelyStreamingLiveArtifactInteractionJson(content))
  ) {
    return markdownContent;
  }

  return `\`\`\`${LIVE_ARTIFACT_INTERACTION_LANGUAGE}\n${content}\n\`\`\``;
};

const unwrapMislabeledHtmlFragmentCodeBlocks = (markdownContent: string): string => {
  if (!markdownContent) return markdownContent;

  const normalizedClosedFences = markdownContent.replace(
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

  return normalizedClosedFences.replace(
    OPEN_FENCED_CODE_BLOCK_AT_END_REGEX,
    (match, rawLanguage: string = '', rawContent: string = '') => {
      const normalizedLanguage = normalizeLanguage(rawLanguage);
      const content = rawContent.trim();

      if (MISLABELED_HTML_FRAGMENT_LANGUAGES.has(normalizedLanguage) && isLikelyHtmlFragmentSegment(content)) {
        return content;
      }

      return match;
    },
  );
};

const normalizeStandaloneRawHtmlFragment = (markdownContent: string): string => {
  const content = markdownContent.trim();

  if (!isStandaloneHtmlFragment(content) && !isLikelyStreamingStandaloneHtmlFragment(content)) {
    return markdownContent;
  }

  return content.replace(HTML_STRUCTURAL_BLANK_LINE_REGEX, '\n');
};

export const normalizePreviewableMarkdownContent = (
  markdownContent: string,
  options: NormalizePreviewableMarkdownOptions = {},
): string => {
  return wrapBareLiveArtifactInteraction(
    wrapBarePreviewableArtifact(
      normalizeStandaloneRawHtmlFragment(unwrapMislabeledHtmlFragmentCodeBlocks(markdownContent)),
      options,
    ),
    options,
  );
};

export const isLikelyHtml = (textContent: string): boolean => {
  return getPreviewMarkupType(textContent) !== null;
};
