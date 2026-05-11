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
    expect(parts[0].text).not.toContain('```html');
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

  it('advertises declarative follow-up buttons in the output contract', () => {
    const parts = buildLiveArtifactsRequestParts({
      promptInstruction: 'Create a Live Artifact',
      sourceContent: 'source',
      language: 'en',
      promptMode: 'inline',
    });

    expect(parts[0].text).toContain('data-amc-followup');
    expect(parts[0].text).toContain('instruction is required');
    expect(parts[0].text).toContain('Do not add follow-up buttons by default');
  });

  it('shows the exact JSON attribute shape for declarative follow-up buttons', () => {
    const parts = buildLiveArtifactsRequestParts({
      promptInstruction: 'Create a Live Artifact',
      sourceContent: 'source',
      language: 'en',
      promptMode: 'inline',
    });

    expect(parts[0].text).toContain(`data-amc-followup='{"instruction":"Continue"}'`);
  });

  it('advertises declarative state keys for dynamic follow-up state', () => {
    const parts = buildLiveArtifactsRequestParts({
      promptInstruction: 'Create a Live Artifact',
      sourceContent: 'source',
      language: 'en',
      promptMode: 'inline',
    });

    expect(parts[0].text).toContain('data-amc-state-key');
    expect(parts[0].text).toContain('current control values');
  });

  it('advertises schema-driven interaction artifacts for collecting user input', () => {
    const parts = buildLiveArtifactsRequestParts({
      promptInstruction: 'Create a Live Artifact',
      sourceContent: 'source',
      language: 'en',
      promptMode: 'inline',
    });

    expect(parts[0].text).toContain('amc-live-artifact-interaction');
    expect(parts[0].text).toContain('```amc-live-artifact-interaction');
    expect(parts[0].text).toContain('"schema"');
    expect(parts[0].text).toContain('"instruction"');
    expect(parts[0].text).toContain('structured user input');
  });

  it('preserves bare interaction JSON output as an interaction artifact fence', () => {
    const interaction = JSON.stringify({
      instruction: 'Collect the writing parameters.',
      schema: {
        type: 'object',
        properties: {
          topic: { type: 'string', title: 'Topic' },
        },
      },
    });

    expect(coerceLiveArtifactsOutput(interaction, 'en', 'inline')).toBe(
      `\`\`\`amc-live-artifact-interaction\n${interaction}\n\`\`\``,
    );
  });

  it('preserves an already fenced interaction artifact response', () => {
    const interaction = JSON.stringify({
      instruction: 'Collect the writing parameters.',
      schema: {
        type: 'object',
        properties: {
          topic: { type: 'string', title: 'Topic' },
        },
      },
    });
    const fencedInteraction = `\`\`\`amc-live-artifact-interaction\n${interaction}\n\`\`\``;

    expect(coerceLiveArtifactsOutput(fencedInteraction, 'en', 'inline')).toBe(fencedInteraction);
  });

  it('does not preserve invalid interaction JSON that the renderer cannot parse', () => {
    const invalidInteraction = JSON.stringify({
      instruction: 'Collect the writing parameters.',
      schema: {
        type: 'object',
        properties: {
          topic: { title: 'Topic' },
        },
      },
    });

    const output = coerceLiveArtifactsOutput(invalidInteraction, 'en', 'inline');

    expect(output).toMatch(/^<section/);
    expect(output).not.toContain('```amc-live-artifact-interaction');
    expect(output).toContain('&quot;instruction&quot;');
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
