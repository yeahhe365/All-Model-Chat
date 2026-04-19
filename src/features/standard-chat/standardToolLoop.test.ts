import { describe, expect, it, vi } from 'vitest';
import type { ChatHistoryItem } from '../../types';
import { runStandardToolLoop } from './standardToolLoop';

describe('runStandardToolLoop', () => {
  it('returns immediately when the model responds without function calls', async () => {
    const initialContents: ChatHistoryItem[] = [
      { role: 'user', parts: [{ text: 'Hello' }] },
    ];
    const runTurn = vi.fn().mockResolvedValue({
      modelContent: { role: 'model', parts: [{ text: 'Hi there' }] },
      parts: [{ text: 'Hi there' }],
      thoughts: undefined,
      functionCalls: [],
      usage: undefined,
      grounding: undefined,
      urlContext: undefined,
    });

    const result = await runStandardToolLoop({
      initialContents,
      clientFunctions: {},
      runTurn,
    });

    expect(runTurn).toHaveBeenCalledTimes(1);
    expect(result.toolMessages).toEqual([]);
    expect(result.generatedFiles).toEqual([]);
    expect(result.finalTurn.parts).toEqual([{ text: 'Hi there' }]);
  });

  it('executes tool calls, appends function responses, and continues until a final model answer is returned', async () => {
    const initialContents: ChatHistoryItem[] = [
      { role: 'user', parts: [{ text: 'Calculate 6 * 7' }] },
    ];
    const toolCallMessage = {
      role: 'model' as const,
      parts: [
        {
          functionCall: {
            id: 'call-1',
            name: 'run_local_python',
            args: { code: 'print(6 * 7)' },
          },
        },
      ],
    };
    const generatedFile = { id: 'file-1', name: 'chart.png', type: 'image/png' } as any;
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        modelContent: toolCallMessage,
        parts: [],
        thoughts: 'Need a calculation.',
        functionCalls: [
          {
            id: 'call-1',
            name: 'run_local_python',
            args: { code: 'print(6 * 7)' },
          },
        ],
        usage: undefined,
        grounding: undefined,
        urlContext: undefined,
      })
      .mockResolvedValueOnce({
        modelContent: { role: 'model' as const, parts: [{ text: 'The result is 42.' }] },
        parts: [{ text: 'The result is 42.' }],
        thoughts: undefined,
        functionCalls: [],
        usage: { totalTokenCount: 10 },
        grounding: undefined,
        urlContext: undefined,
      });

    const result = await runStandardToolLoop({
      initialContents,
      clientFunctions: {
        run_local_python: {
          declaration: {
            name: 'run_local_python',
            description: 'Run Python locally.',
            parameters: {
              type: 'object',
              properties: {},
            },
          } as any,
          handler: vi.fn(async () => ({
            response: { result: { output: '42' } },
            generatedFiles: [generatedFile],
          })),
        },
      },
      runTurn,
    });

    expect(runTurn).toHaveBeenCalledTimes(2);
    expect(runTurn.mock.calls[1][0]).toEqual([
      ...initialContents,
      toolCallMessage,
      {
        role: 'user',
        parts: [
          {
            functionResponse: {
              id: 'call-1',
              name: 'run_local_python',
              response: { result: { output: '42' } },
            },
          },
        ],
      },
    ]);
    expect(result.toolMessages).toEqual([
      {
        modelContent: toolCallMessage,
        functionResponseParts: [
          {
            functionResponse: {
              id: 'call-1',
              name: 'run_local_python',
              response: { result: { output: '42' } },
            },
          },
        ],
      },
    ]);
    expect(result.generatedFiles).toEqual([generatedFile]);
    expect(result.finalTurn.parts).toEqual([{ text: 'The result is 42.' }]);
  });
});
