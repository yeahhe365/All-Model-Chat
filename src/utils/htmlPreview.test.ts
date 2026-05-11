import { describe, expect, it } from 'vitest';
import {
  buildHtmlPreviewSrcDoc,
  buildStreamingHtmlPreviewSrcDoc,
  createStaticPreviewSnapshotContainer,
  HTML_PREVIEW_DIAGNOSTIC_EVENT,
  HTML_PREVIEW_MESSAGE_CHANNEL,
  HTML_PREVIEW_STREAM_RENDER_EVENT,
} from './htmlPreview';

describe('htmlPreview utilities', () => {
  it('injects the iframe bridge script into preview documents', () => {
    const srcDoc = buildHtmlPreviewSrcDoc('<html><head><title>Demo</title></head><body>Hello</body></html>');

    expect(srcDoc).toContain(HTML_PREVIEW_MESSAGE_CHANNEL);
    expect(srcDoc).toContain('parent.postMessage');
    expect(srcDoc).toContain("event.key === 'Escape'");
  });

  it('injects a restrictive preview CSP while allowing inline artifact scripts and HTTPS images', () => {
    const srcDoc = buildHtmlPreviewSrcDoc(
      '<html><head><title>Demo</title><script src="https://cdn.example/app.js"></script></head><body><img src="https://example.com/demo.png" alt="Demo"></body></html>',
    );

    expect(srcDoc).toContain('http-equiv="Content-Security-Policy"');
    expect(srcDoc).toContain("default-src 'none'");
    expect(srcDoc).toContain("script-src 'unsafe-inline'");
    expect(srcDoc).toContain('img-src https: data: blob:');
    expect(srcDoc).toContain("connect-src 'none'");
    expect(srcDoc.indexOf('http-equiv="Content-Security-Policy"')).toBeLessThan(srcDoc.indexOf('cdn.example/app.js'));
  });

  it('injects the preview CSP into fragment wrappers before bridge scripts', () => {
    const srcDoc = buildHtmlPreviewSrcDoc('<section><p>Fragment</p></section>');

    expect(srcDoc).toContain('<head><meta http-equiv="Content-Security-Policy"');
    expect(srcDoc.indexOf('Content-Security-Policy')).toBeLessThan(srcDoc.indexOf(HTML_PREVIEW_MESSAGE_CHANNEL));
  });

  it('builds a stable streaming preview runner that receives html over postMessage', () => {
    const srcDoc = buildStreamingHtmlPreviewSrcDoc();

    expect(srcDoc).toContain('data-amc-stream-preview-root');
    expect(srcDoc).toContain(HTML_PREVIEW_MESSAGE_CHANNEL);
    expect(srcDoc).toContain(HTML_PREVIEW_STREAM_RENDER_EVENT);
    expect(srcDoc).toContain("event.data.event !== 'stream-render'");
    expect(srcDoc).toContain('replaceChildren');
    expect(srcDoc).not.toContain('<section>First chunk</section>');
  });

  it('streaming preview runner keeps full document attributes in sync', () => {
    const srcDoc = buildStreamingHtmlPreviewSrcDoc();

    expect(srcDoc).toContain('syncDocumentAttributes');
    expect(srcDoc).toContain("parsedDocument.documentElement");
    expect(srcDoc).toContain('parsedDocument.body');
  });

  it('injects a bridge command for clearing iframe selections from the parent', () => {
    const srcDoc = buildHtmlPreviewSrcDoc('<section><p>Select this artifact text.</p></section>');

    expect(srcDoc).toContain("event.data.event !== 'clear-selection'");
    expect(srcDoc).toContain('window.getSelection()?.removeAllRanges()');
  });

  it('injects a declarative Live Artifact follow-up click bridge', () => {
    const srcDoc = buildHtmlPreviewSrcDoc(
      `<section><button data-amc-followup='{"instruction":"Continue","state":{"selected":"B"}}'>Continue</button></section>`,
    );

    expect(srcDoc).toContain('data-amc-followup');
    expect(srcDoc).toContain("notify('followup'");
    expect(srcDoc).toContain("closest('[data-amc-followup]')");
    expect(srcDoc).toContain('JSON.parse');
  });

  it('injects bridge helpers for collecting current declarative artifact state', () => {
    const srcDoc = buildHtmlPreviewSrcDoc(
      `<section data-amc-followup-scope>
        <input data-amc-state-key="priority" value="low-risk" />
        <button data-amc-followup='{"instruction":"Continue"}'>Continue</button>
      </section>`,
    );

    expect(srcDoc).toContain('data-amc-state-key');
    expect(srcDoc).toContain('collectFollowupState');
    expect(srcDoc).toContain('data-amc-followup-scope');
    expect(srcDoc).toContain('mergeFollowupState');
  });

  it('injects a Live Artifact text selection bridge', () => {
    const srcDoc = buildHtmlPreviewSrcDoc('<section><p>Select this artifact text.</p></section>');

    expect(srcDoc).toContain("notify('selection'");
    expect(srcDoc).toContain("document.addEventListener('selectionchange'");
    expect(srcDoc).toContain('window.getSelection');
    expect(srcDoc).toContain('getBoundingClientRect');
  });

  it('injects preview diagnostics for blocked resources and runtime failures', () => {
    const srcDoc = buildHtmlPreviewSrcDoc('<section><img src="https://example.com/missing.png" alt="Missing"></section>');

    expect(srcDoc).toContain(HTML_PREVIEW_DIAGNOSTIC_EVENT);
    expect(srcDoc).toContain('resource-error');
    expect(srcDoc).toContain('runtime-error');
    expect(srcDoc).toContain('unhandledrejection');
    expect(srcDoc).toContain('securitypolicyviolation');
    expect(srcDoc).toContain('csp-violation');
  });

  it('treats a plain data-amc-followup value as the follow-up instruction', () => {
    const messages: unknown[] = [];
    const srcDoc = buildHtmlPreviewSrcDoc(
      `<section><button data-amc-followup="生成参考文献">生成参考文献</button></section>`,
    );
    const scriptContent = srcDoc.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    expect(scriptContent).toBeDefined();

    const originalPostMessage = window.postMessage;
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;

    window.postMessage = ((message: unknown) => {
      messages.push(message);
    }) as Window['postMessage'];
    window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    }) as Window['requestAnimationFrame'];
    window.cancelAnimationFrame = (() => {}) as Window['cancelAnimationFrame'];

    try {
      document.body.innerHTML = '<section><button data-amc-followup="生成参考文献">生成参考文献</button></section>';
      window.eval(scriptContent!);
      document.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(messages).toContainEqual({
        channel: HTML_PREVIEW_MESSAGE_CHANNEL,
        event: 'followup',
        payload: { instruction: '生成参考文献' },
      });
    } finally {
      document.body.innerHTML = '';
      window.postMessage = originalPostMessage;
      window.requestAnimationFrame = originalRequestAnimationFrame;
      window.cancelAnimationFrame = originalCancelAnimationFrame;
    }
  });

  it('pre-renders TeX math delimiters inside preview HTML with KaTeX styles', () => {
    const srcDoc = buildHtmlPreviewSrcDoc(
      '<section><p>Action chunk $a_{t:t+H-1}$</p><p>Loss $$L = ||\\epsilon - \\epsilon_\\theta(x_t,t)||^2$$</p></section>',
    );

    expect(srcDoc).toContain('class="katex"');
    expect(srcDoc).toContain('a_{t:t+H-1}');
    expect(srcDoc).toContain('L = ||\\epsilon - \\epsilon_\\theta(x_t,t)||^2');
    expect(srcDoc).toContain('data-amc-katex');
    expect(srcDoc).toContain('.katex');
  });

  it('does not render TeX delimiters inside code-like preview HTML elements', () => {
    const srcDoc = buildHtmlPreviewSrcDoc(
      '<section><p>Formula $x_t$</p><code>$x_t$</code><pre>$$y_t$$</pre></section>',
    );

    expect(srcDoc).toContain('class="katex"');
    expect(srcDoc).toContain('<code>$x_t$</code>');
    expect(srcDoc).toContain('<pre>$$y_t$$</pre>');
  });

  it('does not treat ordinary dollar amounts as preview math', () => {
    const srcDoc = buildHtmlPreviewSrcDoc('<section><p>Budget $20 and $30 this week.</p></section>');

    expect(srcDoc).not.toContain('class="katex"');
    expect(srcDoc).toContain('Budget $20 and $30 this week.');
  });

  it('renders asymptotic complexity formulas in preview HTML', () => {
    const srcDoc = buildHtmlPreviewSrcDoc('<section><p>AR $O(L)$</p><p>NAR $O(1)$</p></section>');

    expect(srcDoc).toContain('class="katex"');
    expect(srcDoc).toContain('O(L)');
    expect(srcDoc).toContain('O(1)');
    expect(srcDoc).not.toContain('$O(L)$');
    expect(srcDoc).not.toContain('$O(1)$');
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
