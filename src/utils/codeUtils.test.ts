import { describe, expect, it } from 'vitest';
import {
  extractPreviewableCodeBlock,
  getCodeBlockPreviewType,
  normalizePreviewableMarkdownContent,
  wrapBarePreviewableDocument,
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

  it('wraps bare standalone html documents as previewable markdown code blocks', () => {
    const document = '<!DOCTYPE html><html><head><style>body{color:red}</style></head><body>Hello</body></html>';

    expect(wrapBarePreviewableDocument(`\n${document}\n`)).toBe(`\`\`\`html\n${document}\n\`\`\``);
    expect(extractPreviewableCodeBlock(document)).toEqual({
      content: document,
      markupType: 'html',
    });
  });

  it('does not wrap raw html fragments or prose that only contains html', () => {
    const fragment = '<div style="display:flex;gap:12px"><span>Ready</span></div>';

    expect(wrapBarePreviewableDocument(fragment)).toBe(fragment);
    expect(wrapBarePreviewableDocument(`Here is the page:\n${fragment}`)).toBe(`Here is the page:\n${fragment}`);
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

    expect(normalizePreviewableMarkdownContent(fragment)).toBe(`<div style="padding:24px">
  <section style="background:white">
    <p>Transformer summary</p>
  </section>
  <!-- 三大核心特性 -->
  <div style="display:grid">
    <strong>Self-Attention</strong>
  </div>
</div>`);
  });

  it('unwraps mislabeled fenced html fragments so they render inline', () => {
    const fragment =
      '<!-- 核心定义卡片 -->\n<div style="padding:20px;background:#f9fafb"><strong>Transformer</strong></div>';

    expect(normalizePreviewableMarkdownContent(`Intro\n\n\`\`\`css\n${fragment}\n\`\`\``)).toBe(`Intro\n\n${fragment}`);
    expect(getCodeBlockPreviewType(fragment, 'css')).toBe('html');
  });

  it('keeps real css code blocks fenced', () => {
    const css = '.card { color: #2563eb; display: grid; }';

    expect(normalizePreviewableMarkdownContent(`\`\`\`css\n${css}\n\`\`\``)).toBe(`\`\`\`css\n${css}\n\`\`\``);
  });

  it('keeps full html documents fenced for preview', () => {
    const document = '<!DOCTYPE html><html><head><style>body{color:red}</style></head><body>Hello</body></html>';

    expect(normalizePreviewableMarkdownContent(document)).toBe(`\`\`\`html\n${document}\n\`\`\``);
    expect(normalizePreviewableMarkdownContent(`\`\`\`html\n${document}\n\`\`\``)).toBe(
      `\`\`\`html\n${document}\n\`\`\``,
    );
  });
});
