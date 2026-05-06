import { describe, expect, it } from 'vitest';
import {
  buildHtmlPreviewSrcDoc,
  createStaticPreviewSnapshotContainer,
  HTML_PREVIEW_MESSAGE_CHANNEL,
} from './htmlPreview';

describe('htmlPreview utilities', () => {
  it('injects the iframe bridge script into preview documents', () => {
    const srcDoc = buildHtmlPreviewSrcDoc('<html><head><title>Demo</title></head><body>Hello</body></html>');

    expect(srcDoc).toContain(HTML_PREVIEW_MESSAGE_CHANNEL);
    expect(srcDoc).toContain('parent.postMessage');
    expect(srcDoc).toContain("event.key === 'Escape'");
  });

  it('creates a static screenshot container without scripts or inline event handlers', () => {
    const { container, cleanup } = createStaticPreviewSnapshotContainer(
      '<html><head><style>.demo { color: red; }</style><script>window.parent.alert("x")</script></head><body class="demo" onclick="alert(1)"><button onmouseover="alert(2)">Run</button></body></html>',
      document,
    );

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('[onclick]')).toBeNull();
    expect(container.querySelector('[onmouseover]')).toBeNull();
    expect(container.textContent).toContain('Run');
    expect(container.querySelector('style')?.textContent).toContain('.demo');

    cleanup();
  });

  it('keeps the static screenshot container renderable for html2canvas', () => {
    const { container, cleanup } = createStaticPreviewSnapshotContainer(
      '<html><body><div style="width:120px;height:40px;background:#000;color:#fff">Visible</div></body></html>',
      document,
    );

    expect(container.style.opacity).not.toBe('0');
    expect(container.style.visibility).not.toBe('hidden');
    expect(container.style.pointerEvents).toBe('none');
    expect(container.textContent).toContain('Visible');

    cleanup();
  });
});
