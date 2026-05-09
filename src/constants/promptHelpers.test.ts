import { describe, expect, it } from 'vitest';
import { isLiveArtifactsSystemInstruction, loadLiveArtifactsSystemPrompt } from './promptHelpers';

describe('promptHelpers', () => {
  it('recognizes current Live Artifacts markers and legacy Canvas markers', () => {
    expect(isLiveArtifactsSystemInstruction('[Live Artifacts Protocol]')).toBe(true);
    expect(isLiveArtifactsSystemInstruction('[Live Artifacts Protocol - zh]')).toBe(true);
    expect(isLiveArtifactsSystemInstruction('[Live Artifacts Protocol - en]')).toBe(true);
    expect(isLiveArtifactsSystemInstruction('[Canvas Artifact Protocol]')).toBe(true);
    expect(isLiveArtifactsSystemInstruction('<title>Canvas 助手：响应式视觉指南</title>')).toBe(true);
    expect(isLiveArtifactsSystemInstruction('<title>Canvas Assistant: Responsive Visual Guide</title>')).toBe(true);
  });

  it('loads semantically equivalent Chinese and English Live Artifacts prompts', async () => {
    const zhPrompt = await loadLiveArtifactsSystemPrompt('zh');
    const enPrompt = await loadLiveArtifactsSystemPrompt('en');

    expect(zhPrompt).toContain('[Live Artifacts Protocol - zh]');
    expect(zhPrompt).toContain('Live Artifacts Designer');
    expect(zhPrompt).toContain('核心规则');
    expect(zhPrompt).toContain('完整 HTML');
    expect(zhPrompt).toContain('内嵌 HTML 片段');
    expect(zhPrompt).toContain('不要解释');
    expect(zhPrompt).toContain('避免空按钮');
    expect(enPrompt).toContain('[Live Artifacts Protocol - en]');
    expect(enPrompt).toContain('Live Artifacts Designer');
    expect(enPrompt).toContain('Core rules');
    expect(enPrompt).toContain('full HTML');
    expect(enPrompt).toContain('inline HTML fragment');
    expect(enPrompt).toContain('Do not explain');
    expect(enPrompt).toContain('empty buttons');
    expect(enPrompt).not.toContain('核心规则');
  });

  it('emphasizes HTML artifacts instead of traditional Markdown output', async () => {
    const zhPrompt = await loadLiveArtifactsSystemPrompt('zh');
    const enPrompt = await loadLiveArtifactsSystemPrompt('en');

    expect(zhPrompt).toContain('用 HTML 产物替代传统 Markdown 排版');
    expect(zhPrompt).toContain('不要输出传统 Markdown 标题、列表或表格');
    expect(zhPrompt).not.toContain('轻量增强 Markdown');
    expect(zhPrompt).not.toContain('Markdown 片段');
    expect(enPrompt).toContain('Use HTML artifacts to replace traditional Markdown formatting');
    expect(enPrompt).toContain('Do not output traditional Markdown headings, lists, or tables');
    expect(enPrompt).not.toContain('lightweight Markdown enhancement');
    expect(enPrompt).not.toContain('Markdown fragment');
  });

  it('does not include version numbers in the Live Artifacts prompt protocol marker', async () => {
    const zhPrompt = await loadLiveArtifactsSystemPrompt('zh');
    const enPrompt = await loadLiveArtifactsSystemPrompt('en');

    expect(zhPrompt).not.toMatch(/\[Live Artifacts Protocol\s+v\d+/i);
    expect(enPrompt).not.toMatch(/\[Live Artifacts Protocol\s+v\d+/i);
  });

  it('loads an English Live Artifacts prompt without Chinese text', async () => {
    const enPrompt = await loadLiveArtifactsSystemPrompt('en');

    expect(enPrompt).not.toMatch(/[\u4e00-\u9fff]/);
  });

  it('does not preload third-party visualization libraries in the Live Artifacts prompt', async () => {
    const zhPrompt = await loadLiveArtifactsSystemPrompt('zh');
    const enPrompt = await loadLiveArtifactsSystemPrompt('en');

    expect(zhPrompt).not.toMatch(/cdnjs|cdn\.jsdelivr|echarts@|viz\.js|svg-pan-zoom/i);
    expect(enPrompt).not.toMatch(/cdnjs|cdn\.jsdelivr|echarts@|viz\.js|svg-pan-zoom/i);
  });

  it('keeps Live Artifacts prompts concise instead of acting like a design handbook', async () => {
    const zhPrompt = await loadLiveArtifactsSystemPrompt('zh');
    const enPrompt = await loadLiveArtifactsSystemPrompt('en');

    expect(zhPrompt.length).toBeLessThan(2500);
    expect(enPrompt.length).toBeLessThan(2500);
    expect(zhPrompt).not.toContain('信息设计原则');
    expect(zhPrompt).not.toContain('完整 HTML 页面能力');
    expect(enPrompt).not.toContain('Information Design Principles');
    expect(enPrompt).not.toContain('Full HTML Page Capabilities');
  });

  it('tells Live Artifacts inline fragments not to emit mislabeled css or markdown code blocks', async () => {
    const zhPrompt = await loadLiveArtifactsSystemPrompt('zh');
    const enPrompt = await loadLiveArtifactsSystemPrompt('en');

    expect(zhPrompt).toContain('不要放进 css、text、markdown 或 html 代码块');
    expect(zhPrompt).toContain('不要一半直出、一半进代码块');
    expect(enPrompt).toContain('Do not wrap it in css, text, markdown, or html fences');
    expect(enPrompt).toContain('Do not split one artifact between rendered HTML and a code block');
  });
});
