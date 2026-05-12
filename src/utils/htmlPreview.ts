import katex from 'katex';
import katexCss from 'katex/dist/katex.min.css?inline';
import { PREVIEW_BRIDGE_SCRIPT, sanitizeElementTree, STREAMING_PREVIEW_RUNNER_SCRIPT } from './htmlPreviewScripts';

export {
  HTML_PREVIEW_CLEAR_SELECTION_EVENT,
  HTML_PREVIEW_DIAGNOSTIC_EVENT,
  HTML_PREVIEW_MESSAGE_CHANNEL,
  HTML_PREVIEW_STREAM_RENDER_EVENT,
} from './htmlPreviewScripts';

const KATEX_STYLE_ATTRIBUTE = 'data-amc-katex';
const PREVIEW_CONTENT_SECURITY_POLICY =
  "default-src 'none'; img-src https: data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:; media-src https: data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
const PREVIEW_CONTENT_SECURITY_POLICY_META = `<meta http-equiv="Content-Security-Policy" content="${PREVIEW_CONTENT_SECURITY_POLICY}">`;
const MATH_IGNORED_ANCESTOR_SELECTOR = 'script,style,textarea,pre,code,kbd,samp,.katex';
const TEX_MATH_SIGNAL_REGEX = /[\\^_{}=+\-*/<>|]|[A-Za-z]\d|\d[A-Za-z]|[\u0370-\u03ff]/;
const TEX_MATH_ENVIRONMENT_NAMES =
  'align\\*?|aligned|alignedat|array|Bmatrix|bmatrix|cases|equation\\*?|gather\\*?|gathered|matrix|multline\\*?|pmatrix|smallmatrix|split|subarray|Vmatrix|vmatrix';
const TEX_MATH_DELIMITER_REGEX = new RegExp(
  [
    String.raw`\$\$([\s\S]+?)\$\$`,
    String.raw`\$((?:\\.|[^$\\\n])+?)\$`,
    String.raw`\\\(([\s\S]+?)\\\)`,
    String.raw`\\\[([\s\S]+?)\\\]`,
    String.raw`\\begin\{(${TEX_MATH_ENVIRONMENT_NAMES})\}([\s\S]+?)\\end\{\5\}`,
  ].join('|'),
  'g',
);
const ASYMPTOTIC_COMPLEXITY_REGEX = /^(?:O|Θ|Ω|Theta|Omega)\s*\([^)]*[A-Za-z0-9][^)]*\)$/;

const cloneIntoDocument = (node: Node, targetDocument: Document): Node => targetDocument.importNode(node, true);

const isLikelyTexMath = (value: string): boolean => {
  const normalizedValue = value.trim();

  return (
    /^[A-Za-z]$/.test(normalizedValue) ||
    TEX_MATH_SIGNAL_REGEX.test(normalizedValue) ||
    ASYMPTOTIC_COMPLEXITY_REGEX.test(normalizedValue)
  );
};

const hasTexMathDelimiterCandidate = (value: string): boolean => {
  TEX_MATH_DELIMITER_REGEX.lastIndex = 0;
  const hasCandidate = TEX_MATH_DELIMITER_REGEX.test(value);
  TEX_MATH_DELIMITER_REGEX.lastIndex = 0;
  return hasCandidate;
};

const readTexMathMatch = (
  match: RegExpMatchArray,
): { latex: string; displayMode: boolean; shouldValidateMathSignal: boolean } => {
  if (match[1] !== undefined) {
    return { latex: match[1], displayMode: true, shouldValidateMathSignal: true };
  }

  if (match[2] !== undefined) {
    return { latex: match[2], displayMode: false, shouldValidateMathSignal: true };
  }

  if (match[3] !== undefined) {
    return { latex: match[3], displayMode: false, shouldValidateMathSignal: true };
  }

  if (match[4] !== undefined) {
    return { latex: match[4], displayMode: true, shouldValidateMathSignal: true };
  }

  return { latex: match[0], displayMode: true, shouldValidateMathSignal: false };
};

const createRenderedMathFragment = (targetDocument: Document, value: string): DocumentFragment | null => {
  TEX_MATH_DELIMITER_REGEX.lastIndex = 0;

  let lastIndex = 0;
  let rendered = false;
  const fragment = targetDocument.createDocumentFragment();

  for (const match of value.matchAll(TEX_MATH_DELIMITER_REGEX)) {
    const startIndex = match.index ?? 0;

    if (startIndex > 0 && value[startIndex - 1] === '\\') {
      continue;
    }

    const rawMatch = match[0];
    const { latex: rawLatex, displayMode, shouldValidateMathSignal } = readTexMathMatch(match);
    const latex = rawLatex.trim();

    if (!latex || (shouldValidateMathSignal && !isLikelyTexMath(latex))) {
      continue;
    }

    if (startIndex > lastIndex) {
      fragment.appendChild(targetDocument.createTextNode(value.slice(lastIndex, startIndex)));
    }

    try {
      const template = targetDocument.createElement('template');
      template.innerHTML = katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        strict: false,
      });
      fragment.appendChild(template.content.cloneNode(true));
      rendered = true;
    } catch {
      fragment.appendChild(targetDocument.createTextNode(rawMatch));
    }

    lastIndex = startIndex + rawMatch.length;
  }

  if (!rendered) {
    return null;
  }

  if (lastIndex < value.length) {
    fragment.appendChild(targetDocument.createTextNode(value.slice(lastIndex)));
  }

  return fragment;
};

const renderMathInDocument = (targetDocument: Document): boolean => {
  if (!targetDocument.body) {
    return false;
  }

  const showText = targetDocument.defaultView?.NodeFilter.SHOW_TEXT ?? 4;
  const walker = targetDocument.createTreeWalker(targetDocument.body, showText);
  const textNodes: Text[] = [];

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  let rendered = false;

  textNodes.forEach((textNode) => {
    if (textNode.parentElement?.closest(MATH_IGNORED_ANCESTOR_SELECTOR)) {
      return;
    }

    const renderedFragment = createRenderedMathFragment(targetDocument, textNode.data);
    if (!renderedFragment) {
      return;
    }

    textNode.replaceWith(renderedFragment);
    rendered = true;
  });

  return rendered;
};

const injectKatexStyles = (targetDocument: Document) => {
  if (targetDocument.head.querySelector(`style[${KATEX_STYLE_ATTRIBUTE}]`)) {
    return;
  }

  const styleElement = targetDocument.createElement('style');
  styleElement.setAttribute(KATEX_STYLE_ATTRIBUTE, 'true');
  styleElement.textContent = katexCss;
  targetDocument.head.appendChild(styleElement);
};

const renderPreviewMath = (srcDoc: string): string => {
  if (!hasTexMathDelimiterCandidate(srcDoc) || typeof DOMParser === 'undefined') {
    return srcDoc;
  }

  const parser = new DOMParser();
  const parsedDocument = parser.parseFromString(srcDoc, 'text/html');

  if (renderMathInDocument(parsedDocument)) {
    injectKatexStyles(parsedDocument);
  }

  return `<!DOCTYPE html>${parsedDocument.documentElement.outerHTML}`;
};

const injectPreviewSecurityPolicy = (srcDoc: string): string => {
  if (srcDoc.includes(PREVIEW_CONTENT_SECURITY_POLICY)) {
    return srcDoc;
  }

  if (/<head\b[^>]*>/i.test(srcDoc)) {
    return srcDoc.replace(/<head\b[^>]*>/i, (headTag) => `${headTag}${PREVIEW_CONTENT_SECURITY_POLICY_META}`);
  }

  if (/<html\b[^>]*>/i.test(srcDoc)) {
    return srcDoc.replace(
      /<html\b[^>]*>/i,
      (htmlTag) => `${htmlTag}<head>${PREVIEW_CONTENT_SECURITY_POLICY_META}</head>`,
    );
  }

  return `<!DOCTYPE html><html><head>${PREVIEW_CONTENT_SECURITY_POLICY_META}</head><body>${srcDoc}</body></html>`;
};

const prepareHtmlPreviewSrcDoc = (srcDoc: string): string => renderPreviewMath(injectPreviewSecurityPolicy(srcDoc));

export const buildStreamingHtmlPreviewRenderPayload = (htmlContent: string): string => {
  return renderPreviewMath(htmlContent);
};

export const buildHtmlPreviewSrcDoc = (htmlContent: string): string => {
  let srcDoc: string;

  if (!htmlContent) {
    srcDoc = `<!DOCTYPE html><html><body>${PREVIEW_BRIDGE_SCRIPT}</body></html>`;
    return prepareHtmlPreviewSrcDoc(srcDoc);
  }

  if (/<\/body>/i.test(htmlContent)) {
    srcDoc = htmlContent.replace(/<\/body>/i, `${PREVIEW_BRIDGE_SCRIPT}</body>`);
    return prepareHtmlPreviewSrcDoc(srcDoc);
  }

  if (/<\/html>/i.test(htmlContent)) {
    srcDoc = htmlContent.replace(/<\/html>/i, `${PREVIEW_BRIDGE_SCRIPT}</html>`);
    return prepareHtmlPreviewSrcDoc(srcDoc);
  }

  srcDoc = `<!DOCTYPE html><html><body>${htmlContent}${PREVIEW_BRIDGE_SCRIPT}</body></html>`;
  return prepareHtmlPreviewSrcDoc(srcDoc);
};

export const buildStreamingHtmlPreviewSrcDoc = (): string => {
  const srcDoc = `<!DOCTYPE html><html><body><div data-amc-stream-preview-root="true"></div>${PREVIEW_BRIDGE_SCRIPT}${STREAMING_PREVIEW_RUNNER_SCRIPT}</body></html>`;
  return prepareHtmlPreviewSrcDoc(srcDoc);
};

export const createStaticPreviewSnapshotContainer = (
  htmlContent: string,
  targetDocument: Document,
): { container: HTMLElement; cleanup: () => void } => {
  const parser = new DOMParser();
  const parsedDocument = parser.parseFromString(htmlContent, 'text/html');

  sanitizeElementTree(parsedDocument);

  const container = targetDocument.createElement('div');
  container.className = 'is-exporting-png html-preview-snapshot';
  Object.assign(container.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: '1200px',
    transform: 'translateX(-200vw)',
    pointerEvents: 'none',
    zIndex: '-1',
    overflow: 'hidden',
    background: '#ffffff',
  });

  parsedDocument.head.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    container.appendChild(cloneIntoDocument(node, targetDocument));
  });

  const bodyWrapper = targetDocument.createElement('div');
  bodyWrapper.className = parsedDocument.body.className;
  const inlineBodyStyle = parsedDocument.body.getAttribute('style');
  if (inlineBodyStyle) {
    bodyWrapper.setAttribute('style', inlineBodyStyle);
  }

  Array.from(parsedDocument.body.childNodes).forEach((node) => {
    bodyWrapper.appendChild(cloneIntoDocument(node, targetDocument));
  });

  container.appendChild(bodyWrapper);
  targetDocument.body.appendChild(container);

  return {
    container,
    cleanup: () => {
      container.remove();
    },
  };
};
