import { describe, expect, it, vi } from 'vitest';
import {
  extractPreviewableCodeBlock,
  getCodeBlockPreviewType,
  normalizePreviewableMarkdownContent,
} from './codeUtils';

describe('codeUtils preview detection', () => {
  it('only treats standalone html documents as previewable html by content', () => {
    expect(getCodeBlockPreviewType('  <html><body>Hello</body></html>  ')).toBe('html');
    expect(getCodeBlockPreviewType('const tpl = `<html><body>Hello</body></html>`;')).toBe(null);
  });

  it('treats standalone svg markup as previewable content', () => {
    expect(getCodeBlockPreviewType('<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" /></svg>')).toBe('svg');
  });

  it('treats standalone html fragments as previewable even when the fence language is wrong', () => {
    const fragment = '<div style="display:flex;gap:12px"><span>Ready</span></div>';

    expect(getCodeBlockPreviewType(fragment, 'css')).toBe('html');
    expect(extractPreviewableCodeBlock(`\`\`\`css\n${fragment}\n\`\`\``)).toEqual({
      content: fragment,
      markupType: 'html',
    });
  });

  it('treats richer inline artifact primitives as previewable html fragments', () => {
    expect(getCodeBlockPreviewType('<label for="tone">Tone</label>')).toBe('html');
    expect(getCodeBlockPreviewType('<progress value="70" max="100">70%</progress>')).toBe('html');
    expect(getCodeBlockPreviewType('<meter min="0" max="100" value="70">70</meter>')).toBe('html');
  });

  it('does not treat embedded html strings inside code as previewable fragments', () => {
    expect(getCodeBlockPreviewType('const card = `<div>Ready</div>`;', 'js')).toBe(null);
  });

  it('extracts previewable fenced blocks using the same rules regardless of language case', () => {
    expect(extractPreviewableCodeBlock('```HTML\n<div>Hello</div>\n```')).toEqual({
      content: '<div>Hello</div>',
      markupType: 'html',
    });
  });

  it('extracts unlabeled fenced html documents but ignores generic xml blocks', () => {
    expect(extractPreviewableCodeBlock('```\n<html><body>Hello</body></html>\n```')).toEqual({
      content: '<html><body>Hello</body></html>',
      markupType: 'html',
    });
    expect(extractPreviewableCodeBlock('```xml\n<note><to>Jane</to></note>\n```')).toBe(null);
  });

  it('removes markdown-breaking blank lines inside standalone raw html fragments', () => {
    const fragment = `<div style="padding:24px">
  <section style="background:white">
    <p>Transformer summary</p>
  </section>

  <!-- 三大核心特性 -->
  <div style="display:grid">
    <strong>Self-Attention</strong>
  </div>
</div>`;

    expect(normalizePreviewableMarkdownContent(fragment)).toBe(`\`\`\`amc-live-artifact-html
<div style="padding:24px">
  <section style="background:white">
    <p>Transformer summary</p>
  </section>
  <!-- 三大核心特性 -->
  <div style="display:grid">
    <strong>Self-Attention</strong>
  </div>
</div>
\`\`\``);
  });

  it('removes markdown-breaking blank lines inside streaming raw html fragments before they close', () => {
    const fragment = `<div style="padding:24px">
    <section style="background:white">
        <p>Transformer summary</p>
    </section>

    <!-- 三大核心特性 -->
    <div style="display:grid">
        <strong>Self-Attention</strong>`;

    expect(normalizePreviewableMarkdownContent(fragment)).toBe(`<div style="padding:24px">
    <section style="background:white">
        <p>Transformer summary</p>
    </section>
    <!-- 三大核心特性 -->
    <div style="display:grid">
        <strong>Self-Attention</strong>`);
  });

  it('wraps streaming raw html fragments in stable Live Artifact fences when loading', () => {
    const fragment = `<div style="padding:24px">
    <section style="background:white">
        <p>Transformer summary</p>
    </section>

    <!-- 三大核心特性 -->
    <div style="display:grid">
        <strong>Self-Attention</strong>`;

    expect(normalizePreviewableMarkdownContent(fragment, { isStreaming: true })).toBe(`\`\`\`amc-live-artifact-html
<div style="padding:24px">
    <section style="background:white">
        <p>Transformer summary</p>
    </section>
    <!-- 三大核心特性 -->
    <div style="display:grid">
        <strong>Self-Attention</strong>
\`\`\``);
  });

  it('wraps streaming full html documents before the closing html tag arrives', () => {
    const partialDocument = '<!DOCTYPE html><html><head><title>Live</title></head><body><main>Loading';

    expect(normalizePreviewableMarkdownContent(partialDocument, { isStreaming: true })).toBe(
      `\`\`\`amc-live-artifact-html\n${partialDocument}\n\`\`\``,
    );
  });

  it('unwraps mislabeled fenced html fragments so they render inline', () => {
    const fragment =
      '<!-- 核心定义卡片 -->\n<div style="padding:20px;background:#f9fafb"><strong>Transformer</strong></div>';

    expect(normalizePreviewableMarkdownContent(`Intro\n\n\`\`\`css\n${fragment}\n\`\`\``)).toBe(`Intro\n\n${fragment}`);
    expect(getCodeBlockPreviewType(fragment, 'css')).toBe('html');
  });

  it('unwraps streaming mislabeled html fragments from unclosed css fences', () => {
    const content = `<div style="padding:24px">
    <section style="background:white">
        <p>Transformer summary</p>
    </section>

\`\`\`css
    </div>
    <!-- 右侧：核心贡献与特质 -->
    <div style="display:grid">
        <strong>Self-Attention</strong>`;

    expect(normalizePreviewableMarkdownContent(content)).toBe(`<div style="padding:24px">
    <section style="background:white">
        <p>Transformer summary</p>
    </section>
</div>
    <!-- 右侧：核心贡献与特质 -->
    <div style="display:grid">
        <strong>Self-Attention</strong>`);
  });

  it('keeps real css code blocks fenced', () => {
    const css = '.card { color: #2563eb; display: grid; }';

    expect(normalizePreviewableMarkdownContent(`\`\`\`css\n${css}\n\`\`\``)).toBe(`\`\`\`css\n${css}\n\`\`\``);
  });

  it('keeps full html documents fenced for preview', () => {
    const document = '<!DOCTYPE html><html><head><style>body{color:red}</style></head><body>Hello</body></html>';

    expect(normalizePreviewableMarkdownContent(document)).toBe(`\`\`\`amc-live-artifact-html\n${document}\n\`\`\``);
    expect(normalizePreviewableMarkdownContent(`\`\`\`html\n${document}\n\`\`\``)).toBe(
      `\`\`\`html\n${document}\n\`\`\``,
    );
  });

  it('wraps bare Live Artifact interaction JSON in the dedicated interaction fence', () => {
    const interaction = JSON.stringify(
      {
        instruction: 'Continue with these choices.',
        schema: {
          type: 'object',
          properties: {
            tone: { type: 'string', enum: ['brief', 'detailed'] },
          },
        },
      },
      null,
      2,
    );

    expect(normalizePreviewableMarkdownContent(interaction)).toBe(
      `\`\`\`amc-live-artifact-interaction\n${interaction}\n\`\`\``,
    );
  });

  it('wraps streaming interaction JSON candidates before they parse completely', () => {
    const interaction = '{"instruction":"Collect writing options","schema":{';

    expect(normalizePreviewableMarkdownContent(interaction, { isStreaming: true })).toBe(
      `\`\`\`amc-live-artifact-interaction\n${interaction}\n\`\`\``,
    );
  });

  it('does not treat generic JSON schema examples as Live Artifact interactions', () => {
    const schemaExample = JSON.stringify(
      {
        instruction: 'This is only an API example.',
        schema: {
          type: 'object',
          properties: {
            topic: { title: 'Topic' },
          },
        },
      },
      null,
      2,
    );

    expect(normalizePreviewableMarkdownContent(schemaExample)).toBe(schemaExample);
  });

  it('skips interaction JSON parsing when content cannot be an interaction object', async () => {
    vi.resetModules();
    const parseLiveArtifactInteractionSpec = vi.fn(() => {
      throw new Error('Unexpected interaction parse');
    });
    vi.doMock('./liveArtifactInteraction', () => ({ parseLiveArtifactInteractionSpec }));

    try {
      const { normalizePreviewableMarkdownContent: isolatedNormalizePreviewableMarkdownContent } =
        await import('./codeUtils');

      expect(isolatedNormalizePreviewableMarkdownContent('plain markdown without json')).toBe(
        'plain markdown without json',
      );
      expect(parseLiveArtifactInteractionSpec).not.toHaveBeenCalled();
    } finally {
      vi.doUnmock('./liveArtifactInteraction');
      vi.resetModules();
    }
  });
});
