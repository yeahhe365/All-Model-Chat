import { describe, expect, it } from 'vitest';

import {
  assertCodeExecutionSummary,
  buildCodeExecutionFollowUpContents,
  summarizeCodeExecutionParts,
} from '../../../scripts/verify-code-execution.mjs';

describe('verify-code-execution helpers', () => {
  it('summarizes executable code, execution results, inline media, and signatures', () => {
    const summary = summarizeCodeExecutionParts([
      {
        executableCode: {
          id: 'exec-1',
          language: 'PYTHON',
          code: 'print(13)',
        },
      },
      {
        codeExecutionResult: {
          id: 'exec-1',
          outcome: 'OUTCOME_OK',
          output: '13\n',
        },
      },
      {
        inlineData: {
          mimeType: 'image/png',
          data: 'base64',
        },
        thoughtSignature: 'sig-1',
      },
      {
        text: 'TOTAL: 13',
      },
    ]);

    expect(summary).toEqual({
      executableCodes: [{ id: 'exec-1', language: 'PYTHON' }],
      executionResults: [{ id: 'exec-1', outcome: 'OUTCOME_OK', output: '13\n' }],
      texts: ['TOTAL: 13'],
      inlineMimeTypes: ['image/png'],
      thoughtSignatures: 1,
    });
  });

  it('rejects summaries that are missing code execution artifacts', () => {
    expect(() =>
      assertCodeExecutionSummary({
        executableCodes: [],
        executionResults: [],
        texts: [],
        inlineMimeTypes: [],
        thoughtSignatures: 0,
      }),
    ).toThrow('No executableCode parts were returned by the model.');
  });

  it('rejects mismatched executable/result ids', () => {
    expect(() =>
      assertCodeExecutionSummary({
        executableCodes: [{ id: 'exec-1', language: 'PYTHON' }],
        executionResults: [{ id: 'exec-2', outcome: 'OUTCOME_OK', output: '13\n' }],
        texts: [],
        inlineMimeTypes: [],
        thoughtSignatures: 0,
      }),
    ).toThrow('Missing matching codeExecutionResult for executableCode id "exec-1".');
  });

  it('builds a minimal three-step follow-up history', () => {
    const initialUserContent = {
      role: 'user',
      parts: [{ text: 'first question' }],
    };
    const modelContent = {
      role: 'model',
      parts: [{ text: 'first answer' }],
    };

    expect(buildCodeExecutionFollowUpContents(initialUserContent, modelContent, 'follow-up')).toEqual([
      initialUserContent,
      modelContent,
      {
        role: 'user',
        parts: [{ text: 'follow-up' }],
      },
    ]);
  });
});
