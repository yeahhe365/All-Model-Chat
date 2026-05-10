import katex from 'katex';
import katexCss from 'katex/dist/katex.min.css?inline';

export const HTML_PREVIEW_MESSAGE_CHANNEL = 'amc-webui-html-preview';

const KATEX_STYLE_ATTRIBUTE = 'data-amc-katex';
const MATH_IGNORED_ANCESTOR_SELECTOR = 'script,style,textarea,pre,code,kbd,samp,.katex';
const TEX_MATH_SIGNAL_REGEX = /[\\^_{}=+\-*/<>|]|[A-Za-z]\d|\d[A-Za-z]|[\u0370-\u03ff]/;
const TEX_MATH_DELIMITER_REGEX = /\$\$([\s\S]+?)\$\$|\$((?:\\.|[^$\\\n])+?)\$/g;

const PREVIEW_BRIDGE_SCRIPT = `<script>
(() => {
  const channel = ${JSON.stringify(HTML_PREVIEW_MESSAGE_CHANNEL)};
  const notify = (event, payload) => {
    try {
      parent.postMessage(payload === undefined ? { channel, event } : { channel, event, payload }, '*');
    } catch {}
  };
  const notifyResize = () => {
    try {
      const body = document.body;
      const root = document.documentElement;
      const height = Math.max(
        body ? body.scrollHeight : 0,
        body ? body.offsetHeight : 0,
        root ? root.scrollHeight : 0,
        root ? root.offsetHeight : 0
      );
      parent.postMessage({ channel, event: 'resize', height }, '*');
    } catch {}
  };

  let resizeFrame = 0;
  const scheduleResize = () => {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      notifyResize();
    });
  };

  const notifyReady = () => {
    notify('ready');
    scheduleResize();
  };

  if (document.readyState === 'complete') {
    Promise.resolve().then(notifyReady);
  } else {
    window.addEventListener('load', notifyReady, { once: true });
  }

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleResize);
    if (document.documentElement) observer.observe(document.documentElement);
    if (document.body) observer.observe(document.body);
  }

  if ('MutationObserver' in window) {
    const observer = new MutationObserver(scheduleResize);
    observer.observe(document.documentElement || document, { childList: true, subtree: true, attributes: true });
  }

  window.addEventListener('resize', scheduleResize);

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      notify('escape');
    }
  });

  const readFollowupPayload = (target) => {
    if (!(target instanceof Element)) return null;
    const trigger = target.closest('[data-amc-followup]');
    if (!trigger) return null;

    const rawPayload = trigger.getAttribute('data-amc-followup');
    if (!rawPayload) return null;

    try {
      return mergeFollowupState(JSON.parse(rawPayload), collectFollowupState(trigger));
    } catch (error) {
      console.warn('Invalid Live Artifact follow-up payload.', error);
      return null;
    }
  };

  const resolveFollowupScope = (trigger) => {
    const scopeSelector = trigger.getAttribute('data-amc-followup-scope');
    if (scopeSelector && scopeSelector.trim()) {
      try {
        return document.querySelector(scopeSelector) || trigger.closest(scopeSelector) || document;
      } catch {
        return document;
      }
    }

    return trigger.closest('[data-amc-followup-scope]') || document;
  };

  const readStateValue = (element) => {
    if (element instanceof HTMLInputElement) {
      const inputType = element.type.toLowerCase();
      if (inputType === 'checkbox') return element.checked;
      if (inputType === 'radio') return element.checked ? element.value || true : undefined;
      if (inputType === 'number' || inputType === 'range') {
        return element.value === '' || Number.isNaN(element.valueAsNumber) ? element.value : element.valueAsNumber;
      }
      return element.value;
    }

    if (element instanceof HTMLSelectElement) {
      if (element.multiple) {
        return Array.from(element.selectedOptions).map((option) => option.value);
      }
      return element.value;
    }

    if (element instanceof HTMLTextAreaElement) return element.value;

    const stateValue = element.getAttribute('data-amc-state-value');
    if (stateValue !== null) {
      const isToggleLike =
        element.hasAttribute('aria-pressed') ||
        element.hasAttribute('aria-selected') ||
        element.hasAttribute('aria-checked');
      if (!isToggleLike) return stateValue;

      const isActive =
        element.getAttribute('aria-pressed') === 'true' ||
        element.getAttribute('aria-selected') === 'true' ||
        element.getAttribute('aria-checked') === 'true';
      return isActive ? stateValue : undefined;
    }

    const textValue = element.textContent ? element.textContent.trim() : '';
    return textValue || undefined;
  };

  const appendStateValue = (state, key, value) => {
    if (value === undefined) return;

    if (Object.prototype.hasOwnProperty.call(state, key)) {
      state[key] = Array.isArray(state[key]) ? [...state[key], value] : [state[key], value];
      return;
    }

    state[key] = value;
  };

  const collectFollowupState = (trigger) => {
    const scope = resolveFollowupScope(trigger);
    const state = {};
    const stateElements = [];

    if (scope instanceof Element && scope.matches('[data-amc-state-key]')) {
      stateElements.push(scope);
    }

    stateElements.push(...Array.from(scope.querySelectorAll('[data-amc-state-key]')));

    stateElements.forEach((element) => {
      const key = element.getAttribute('data-amc-state-key');
      if (!key || element.disabled) return;

      appendStateValue(state, key, readStateValue(element));
    });

    return state;
  };

  const mergeFollowupState = (payload, collectedState) => {
    if (!collectedState || Object.keys(collectedState).length === 0) return payload;

    const existingState =
      payload && typeof payload.state === 'object' && !Array.isArray(payload.state)
        ? payload.state
        : payload && payload.state !== undefined
          ? { value: payload.state }
          : {};

    return {
      ...payload,
      state: {
        ...existingState,
        ...collectedState,
      },
    };
  };

  document.addEventListener('click', (event) => {
    const payload = readFollowupPayload(event.target);
    if (!payload) return;

    event.preventDefault();
    notify('followup', payload);
  });
})();
</script>`;

const DANGEROUS_SELECTOR = 'script, iframe, object, embed';

const sanitizeElementTree = (root: ParentNode) => {
  root.querySelectorAll(DANGEROUS_SELECTOR).forEach((element) => {
    element.remove();
  });

  root.querySelectorAll('*').forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const attributeName = attribute.name.toLowerCase();
      const attributeValue = attribute.value.trim().toLowerCase();

      if (attributeName.startsWith('on') || attributeName === 'srcdoc') {
        element.removeAttribute(attribute.name);
        return;
      }

      if ((attributeName === 'src' || attributeName === 'href') && attributeValue.startsWith('javascript:')) {
        element.removeAttribute(attribute.name);
      }
    });
  });
};

const cloneIntoDocument = (node: Node, targetDocument: Document): Node => targetDocument.importNode(node, true);

const isLikelyTexMath = (value: string): boolean => {
  const normalizedValue = value.trim();

  return /^[A-Za-z]$/.test(normalizedValue) || TEX_MATH_SIGNAL_REGEX.test(normalizedValue);
};

const hasTexMathDelimiterCandidate = (value: string): boolean => {
  TEX_MATH_DELIMITER_REGEX.lastIndex = 0;
  const hasCandidate = TEX_MATH_DELIMITER_REGEX.test(value);
  TEX_MATH_DELIMITER_REGEX.lastIndex = 0;
  return hasCandidate;
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
    const latex = (match[1] ?? match[2] ?? '').trim();

    if (!latex || !isLikelyTexMath(latex)) {
      continue;
    }

    if (startIndex > lastIndex) {
      fragment.appendChild(targetDocument.createTextNode(value.slice(lastIndex, startIndex)));
    }

    try {
      const template = targetDocument.createElement('template');
      template.innerHTML = katex.renderToString(latex, {
        displayMode: match[1] !== undefined,
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

export const buildHtmlPreviewSrcDoc = (htmlContent: string): string => {
  let srcDoc: string;

  if (!htmlContent) {
    srcDoc = `<!DOCTYPE html><html><body>${PREVIEW_BRIDGE_SCRIPT}</body></html>`;
    return renderPreviewMath(srcDoc);
  }

  if (/<\/body>/i.test(htmlContent)) {
    srcDoc = htmlContent.replace(/<\/body>/i, `${PREVIEW_BRIDGE_SCRIPT}</body>`);
    return renderPreviewMath(srcDoc);
  }

  if (/<\/html>/i.test(htmlContent)) {
    srcDoc = htmlContent.replace(/<\/html>/i, `${PREVIEW_BRIDGE_SCRIPT}</html>`);
    return renderPreviewMath(srcDoc);
  }

  srcDoc = `<!DOCTYPE html><html><body>${htmlContent}${PREVIEW_BRIDGE_SCRIPT}</body></html>`;
  return renderPreviewMath(srcDoc);
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
