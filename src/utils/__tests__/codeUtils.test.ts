import { describe, expect, it } from 'vitest';
import { extractPreviewableCodeBlock, getPreviewMarkupType } from '../codeUtils';

describe('codeUtils preview detection', () => {
  it('only treats standalone html documents as previewable html by content', () => {
    expect(getPreviewMarkupType('  <html><body>Hello</body></html>  ')).toBe('html');
    expect(getPreviewMarkupType('const tpl = `<html><body>Hello</body></html>`;')).toBe(null);
  });

  it('treats standalone svg markup as previewable content', () => {
    expect(getPreviewMarkupType('<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" /></svg>')).toBe('svg');
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
});
