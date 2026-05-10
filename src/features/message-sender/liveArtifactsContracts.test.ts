import { describe, expect, it } from 'vitest';
import { buildLiveArtifactsRequestParts, coerceLiveArtifactsOutput } from './liveArtifactsContracts';

describe('liveArtifactsContracts', () => {
  it('asks full HTML Live Artifacts for raw documents instead of code fences', () => {
    const parts = buildLiveArtifactsRequestParts({
      promptInstruction: 'Create a Live Artifact',
      sourceContent: 'source',
      language: 'en',
      promptMode: 'fullHtml',
    });

    expect(parts[0].text).toContain('Output only the raw complete HTML document');
    expect(parts[0].text).toContain('do not use markdown/html/css/text code fences');
    expect(parts[0].text).not.toContain('fenced code block');
  });

  it('reinforces that Live Artifacts formulas should stay as TeX text outside code tags', () => {
    const parts = buildLiveArtifactsRequestParts({
      promptInstruction: 'Create a Live Artifact',
      sourceContent: 'source',
      language: 'en',
      promptMode: 'inline',
    });

    expect(parts[0].text).toContain('Use $...$ or $$...$$ for formulas');
    expect(parts[0].text).toContain('do not put formulas inside <code> or <pre>');
  });

  it('coerces invalid full HTML output into a raw complete document', () => {
    const output = coerceLiveArtifactsOutput('plain markdown\n- item', 'en', 'fullHtml');

    expect(output).toMatch(/^<!DOCTYPE html>/);
    expect(output).toContain('<html lang="en">');
    expect(output).not.toContain('```');
  });

  it('unwraps a single fenced HTML artifact response into raw HTML', () => {
    const document = '<!DOCTYPE html><html><body><main>Artifact</main></body></html>';

    expect(coerceLiveArtifactsOutput(`\`\`\`html\n${document}\n\`\`\``, 'en', 'fullHtml')).toBe(document);
  });
});
