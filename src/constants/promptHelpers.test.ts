import { describe, expect, it } from 'vitest';
import { isCanvasSystemInstruction, loadCanvasSystemPrompt } from './promptHelpers';

describe('promptHelpers', () => {
  it('recognizes both Chinese and English canvas system prompt markers', () => {
    expect(isCanvasSystemInstruction('[Canvas Artifact Protocol]')).toBe(true);
    expect(isCanvasSystemInstruction('[Canvas Artifact Protocol - zh]')).toBe(true);
    expect(isCanvasSystemInstruction('[Canvas Artifact Protocol - en]')).toBe(true);
    expect(isCanvasSystemInstruction('[Canvas Artifact Protocol v2]')).toBe(true);
    expect(isCanvasSystemInstruction('[Canvas Artifact Protocol v2 - zh]')).toBe(true);
    expect(isCanvasSystemInstruction('[Canvas Artifact Protocol v2 - en]')).toBe(true);
    expect(isCanvasSystemInstruction('<title>Canvas 助手：响应式视觉指南</title>')).toBe(true);
    expect(isCanvasSystemInstruction('<title>Canvas Assistant: Responsive Visual Guide</title>')).toBe(true);
  });

  it('loads semantically equivalent Chinese and English canvas prompts', async () => {
    const zhPrompt = await loadCanvasSystemPrompt('zh');
    const enPrompt = await loadCanvasSystemPrompt('en');

    expect(zhPrompt).toContain('[Canvas Artifact Protocol - zh]');
    expect(zhPrompt).toContain('输出模式判定');
    expect(zhPrompt).toContain('完整 HTML 页面');
    expect(zhPrompt).toContain('Markdown 内嵌片段');
    expect(zhPrompt).toContain('不要使用代码块');
    expect(zhPrompt).toContain('自检清单');
    expect(enPrompt).toContain('[Canvas Artifact Protocol - en]');
    expect(enPrompt).toContain('Output Mode Decision');
    expect(enPrompt).toContain('Full HTML page');
    expect(enPrompt).toContain('Markdown inline fragment');
    expect(enPrompt).toContain('do not use a code block');
    expect(enPrompt).toContain('Self-check');
    expect(enPrompt).not.toContain('输出模式判定');
    expect(enPrompt).not.toContain('自检清单');
  });

  it('does not include version numbers in the canvas prompt protocol marker', async () => {
    const zhPrompt = await loadCanvasSystemPrompt('zh');
    const enPrompt = await loadCanvasSystemPrompt('en');

    expect(zhPrompt).not.toMatch(/\[Canvas Artifact Protocol\s+v\d+/i);
    expect(enPrompt).not.toMatch(/\[Canvas Artifact Protocol\s+v\d+/i);
  });

  it('loads an English canvas prompt without Chinese text', async () => {
    const enPrompt = await loadCanvasSystemPrompt('en');

    expect(enPrompt).not.toMatch(/[\u4e00-\u9fff]/);
  });

  it('does not preload third-party visualization libraries in the canvas prompt', async () => {
    const zhPrompt = await loadCanvasSystemPrompt('zh');
    const enPrompt = await loadCanvasSystemPrompt('en');

    expect(zhPrompt).not.toMatch(/cdnjs|cdn\.jsdelivr|echarts@|viz\.js|svg-pan-zoom/i);
    expect(enPrompt).not.toMatch(/cdnjs|cdn\.jsdelivr|echarts@|viz\.js|svg-pan-zoom/i);
  });

  it('defaults canvas output to lightweight markdown unless the content is especially complex', async () => {
    const zhPrompt = await loadCanvasSystemPrompt('zh');
    const enPrompt = await loadCanvasSystemPrompt('en');

    expect(zhPrompt).toContain('默认优先选择模式 B');
    expect(zhPrompt).toContain('内容特别复杂');
    expect(zhPrompt).not.toContain('如果用户没有明确要求 Markdown 内嵌片段，默认选择模式 A');
    expect(enPrompt).toContain('By default, choose Mode B');
    expect(enPrompt).toContain('especially complex');
    expect(enPrompt).not.toContain(
      'If the user does not explicitly request a Markdown inline fragment, default to Mode A',
    );
  });

  it('tells canvas inline fragments not to emit mislabeled css or markdown code blocks', async () => {
    const zhPrompt = await loadCanvasSystemPrompt('zh');
    const enPrompt = await loadCanvasSystemPrompt('en');

    expect(zhPrompt).toContain('不要把 HTML 片段放进 css、text、markdown 或 html 代码块');
    expect(zhPrompt).toContain('不要先渲染一部分，再把剩余片段放进代码块');
    expect(enPrompt).toContain('Do not put HTML fragments inside css, text, markdown, or html code blocks');
    expect(enPrompt).toContain('Do not render one part and then place the remaining fragment in a code block');
  });
});
