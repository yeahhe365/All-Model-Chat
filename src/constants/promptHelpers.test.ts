import { describe, expect, it } from 'vitest';
import { isCanvasSystemInstruction, loadCanvasSystemPrompt } from './promptHelpers';

describe('promptHelpers', () => {
  it('recognizes both Chinese and English canvas system prompt markers', () => {
    expect(isCanvasSystemInstruction('<title>Canvas 助手：响应式视觉指南</title>')).toBe(true);
    expect(isCanvasSystemInstruction('<title>Canvas Assistant: Responsive Visual Guide</title>')).toBe(true);
  });

  it('loads semantically equivalent Chinese and English canvas prompts', async () => {
    const zhPrompt = await loadCanvasSystemPrompt('zh');
    const enPrompt = await loadCanvasSystemPrompt('en');

    expect(zhPrompt).toContain('输出格式');
    expect(zhPrompt).toContain('轻量化原则');
    expect(enPrompt).toContain('Output Format');
    expect(enPrompt).toContain('Zero-Dependency Principle');
    expect(enPrompt).not.toContain('输出格式');
    expect(enPrompt).not.toContain('轻量化原则');
  });

  it('loads an English canvas prompt without Chinese text', async () => {
    const enPrompt = await loadCanvasSystemPrompt('en');

    expect(enPrompt).not.toMatch(/[\u4e00-\u9fff]/);
  });
});
