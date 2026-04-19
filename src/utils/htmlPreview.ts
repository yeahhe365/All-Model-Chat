export const HTML_PREVIEW_MESSAGE_CHANNEL = 'all-model-chat-html-preview';

const PREVIEW_BRIDGE_SCRIPT = `<script>
(() => {
  const channel = ${JSON.stringify(HTML_PREVIEW_MESSAGE_CHANNEL)};
  const notify = (event) => {
    try {
      parent.postMessage({ channel, event }, '*');
    } catch {}
  };

  const notifyReady = () => notify('ready');

  if (document.readyState === 'complete') {
    Promise.resolve().then(notifyReady);
  } else {
    window.addEventListener('load', notifyReady, { once: true });
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      notify('escape');
    }
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

const cloneIntoDocument = (node: Node, targetDocument: Document): Node =>
  targetDocument.importNode(node, true);

export const buildHtmlPreviewSrcDoc = (htmlContent: string): string => {
  if (!htmlContent) {
    return `<!DOCTYPE html><html><body>${PREVIEW_BRIDGE_SCRIPT}</body></html>`;
  }

  if (/<\/body>/i.test(htmlContent)) {
    return htmlContent.replace(/<\/body>/i, `${PREVIEW_BRIDGE_SCRIPT}</body>`);
  }

  if (/<\/html>/i.test(htmlContent)) {
    return htmlContent.replace(/<\/html>/i, `${PREVIEW_BRIDGE_SCRIPT}</html>`);
  }

  return `<!DOCTYPE html><html><body>${htmlContent}${PREVIEW_BRIDGE_SCRIPT}</body></html>`;
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
