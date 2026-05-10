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
