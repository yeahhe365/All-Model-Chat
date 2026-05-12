import { describe, expect, it, vi } from 'vitest';
import type { ChatHistoryItem } from '@/types';
import { createUploadedFile } from '@/test/factories';
import { runStandardToolLoop } from './standardToolLoop';

describe('runStandardToolLoop', () => {
  it('returns immediately when the model responds without function calls', async () => {
    const initialContents: ChatHistoryItem[] = [{ role: 'user', parts: [{ text: 'Hello' }] }];
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
    const initialContents: ChatHistoryItem[] = [{ role: 'user', parts: [{ text: 'Calculate 6 * 7' }] }];
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
    const generatedFile = createUploadedFile({ name: 'chart.png' });
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
          },
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

  it('aggregates usage and metadata from earlier tool turns into the returned final turn', async () => {
    const initialContents: ChatHistoryItem[] = [{ role: 'user', parts: [{ text: 'Research and calculate.' }] }];
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
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        modelContent: toolCallMessage,
        parts: [],
        thoughts: undefined,
        functionCalls: [
          {
            id: 'call-1',
            name: 'run_local_python',
            args: { code: 'print(6 * 7)' },
          },
        ],
        usage: {
          promptTokenCount: 10,
          toolUsePromptTokenCount: 5,
          totalTokenCount: 20,
          promptTokensDetails: [{ modality: 'TEXT', tokenCount: 10 }],
          toolUsePromptTokensDetails: [{ modality: 'TEXT', tokenCount: 5 }],
          responseTokensDetails: [{ modality: 'TEXT', tokenCount: 5 }],
        },
        grounding: {
          citations: [{ uri: 'https://example.com/search' }],
          webSearchQueries: ['latest weather'],
        },
        urlContext: {
          urlMetadata: [{ retrievedUrl: 'https://example.com/doc-a' }],
        },
      })
      .mockResolvedValueOnce({
        modelContent: { role: 'model' as const, parts: [{ text: 'The result is 42.' }] },
        parts: [{ text: 'The result is 42.' }],
        thoughts: undefined,
        functionCalls: [],
        usage: {
          responseTokenCount: 7,
          totalTokenCount: 7,
          responseTokensDetails: [{ modality: 'TEXT', tokenCount: 7 }],
        },
        grounding: {
          citations: [{ uri: 'https://example.com/final' }],
        },
        urlContext: {
          urlMetadata: [{ retrievedUrl: 'https://example.com/doc-b' }],
        },
      });

    const result = await runStandardToolLoop({
      initialContents,
      clientFunctions: {
        run_local_python: {
          declaration: {
            name: 'run_local_python',
            description: 'Run Python locally.',
          },
          handler: vi.fn(async () => ({
            response: { output: '42' },
            generatedFiles: [],
          })),
        },
      },
      runTurn,
    });

    expect(result.finalTurn.usage).toEqual({
      promptTokenCount: 10,
      toolUsePromptTokenCount: 5,
      responseTokenCount: 12,
      totalTokenCount: 27,
      promptTokensDetails: [{ modality: 'TEXT', tokenCount: 10 }],
      toolUsePromptTokensDetails: [{ modality: 'TEXT', tokenCount: 5 }],
      responseTokensDetails: [{ modality: 'TEXT', tokenCount: 12 }],
    });
    expect(result.finalTurn.grounding).toEqual({
      citations: [{ uri: 'https://example.com/final' }, { uri: 'https://example.com/search' }],
      webSearchQueries: ['latest weather'],
    });
    expect(result.finalTurn.urlContext).toEqual({
      urlMetadata: [{ retrievedUrl: 'https://example.com/doc-a' }, { retrievedUrl: 'https://example.com/doc-b' }],
    });
  });

  it('preserves earlier grounding sources without merging prior support offsets into the final turn', async () => {
    const initialContents: ChatHistoryItem[] = [{ role: 'user', parts: [{ text: 'Search and then answer.' }] }];
    const toolCallMessage = {
      role: 'model' as const,
      parts: [
        {
          functionCall: {
            id: 'call-1',
            name: 'run_local_python',
            args: { code: 'print(42)' },
          },
        },
      ],
    };
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        modelContent: toolCallMessage,
        parts: [],
        thoughts: undefined,
        functionCalls: [
          {
            id: 'call-1',
            name: 'run_local_python',
            args: { code: 'print(42)' },
          },
        ],
        usage: undefined,
        grounding: {
          webSearchQueries: ['alpha query'],
          groundingChunks: [
            {
              web: {
                uri: 'https://example.com/alpha',
                title: 'Alpha source',
              },
            },
          ],
          groundingSupports: [
            {
              segment: { endIndex: 5 },
              groundingChunkIndices: [0],
            },
          ],
        },
        urlContext: undefined,
      })
      .mockResolvedValueOnce({
        modelContent: { role: 'model' as const, parts: [{ text: 'Beta' }] },
        parts: [{ text: 'Beta' }],
        thoughts: undefined,
        functionCalls: [],
        usage: undefined,
        grounding: {
          webSearchQueries: ['beta query'],
          groundingChunks: [
            {
              web: {
                uri: 'https://example.com/beta',
                title: 'Beta source',
              },
            },
          ],
          groundingSupports: [
            {
              segment: { endIndex: 4 },
              groundingChunkIndices: [0],
            },
          ],
        },
        urlContext: undefined,
      });

    const result = await runStandardToolLoop({
      initialContents,
      clientFunctions: {
        run_local_python: {
          declaration: {
            name: 'run_local_python',
            description: 'Run Python locally.',
          },
          handler: vi.fn(async () => ({
            response: { output: '42' },
            generatedFiles: [],
          })),
        },
      },
      runTurn,
    });

    expect(result.finalTurn.grounding).toEqual({
      webSearchQueries: ['alpha query', 'beta query'],
      groundingChunks: [
        {
          web: {
            uri: 'https://example.com/beta',
            title: 'Beta source',
          },
        },
      ],
      groundingSupports: [
        {
          segment: { endIndex: 4 },
          groundingChunkIndices: [0],
        },
      ],
      citations: [
        {
          uri: 'https://example.com/alpha',
          title: 'Alpha source',
        },
      ],
    });
  });

  it('keeps only the latest url-context status for a repeated URL across tool turns', async () => {
    const initialContents: ChatHistoryItem[] = [{ role: 'user', parts: [{ text: 'Follow this URL.' }] }];
    const toolCallMessage = {
      role: 'model' as const,
      parts: [
        {
          functionCall: {
            id: 'call-1',
            name: 'run_local_python',
            args: { code: 'print(42)' },
          },
        },
      ],
    };
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        modelContent: toolCallMessage,
        parts: [],
        thoughts: undefined,
        functionCalls: [
          {
            id: 'call-1',
            name: 'run_local_python',
            args: { code: 'print(42)' },
          },
        ],
        usage: undefined,
        grounding: undefined,
        urlContext: {
          urlMetadata: [
            {
              retrievedUrl: 'https://example.com/doc',
              urlRetrievalStatus: 'URL_RETRIEVAL_STATUS_FAILED',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        modelContent: { role: 'model' as const, parts: [{ text: 'Done.' }] },
        parts: [{ text: 'Done.' }],
        thoughts: undefined,
        functionCalls: [],
        usage: undefined,
        grounding: undefined,
        urlContext: {
          urlMetadata: [
            {
              retrievedUrl: 'https://example.com/doc',
              urlRetrievalStatus: 'URL_RETRIEVAL_STATUS_SUCCESS',
            },
          ],
        },
      });

    const result = await runStandardToolLoop({
      initialContents,
      clientFunctions: {
        run_local_python: {
          declaration: {
            name: 'run_local_python',
            description: 'Run Python locally.',
          },
          handler: vi.fn(async () => ({
            response: { output: '42' },
            generatedFiles: [],
          })),
        },
      },
      runTurn,
    });

    expect(result.finalTurn.urlContext).toEqual({
      urlMetadata: [
        {
          retrievedUrl: 'https://example.com/doc',
          urlRetrievalStatus: 'URL_RETRIEVAL_STATUS_SUCCESS',
        },
      ],
    });
  });

  it('uses the latest available search entry point across grounded tool turns', async () => {
    const initialContents: ChatHistoryItem[] = [{ role: 'user', parts: [{ text: 'Search twice and answer.' }] }];
    const toolCallMessage = {
      role: 'model' as const,
      parts: [
        {
          functionCall: {
            id: 'call-1',
            name: 'run_local_python',
            args: { code: 'print(42)' },
          },
        },
      ],
    };
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        modelContent: toolCallMessage,
        parts: [],
        thoughts: undefined,
        functionCalls: [
          {
            id: 'call-1',
            name: 'run_local_python',
            args: { code: 'print(42)' },
          },
        ],
        usage: undefined,
        grounding: {
          webSearchQueries: ['alpha query'],
          searchEntryPoint: {
            renderedContent: '<div>alpha widget</div>',
          },
        },
        urlContext: undefined,
      })
      .mockResolvedValueOnce({
        modelContent: toolCallMessage,
        parts: [],
        thoughts: undefined,
        functionCalls: [
          {
            id: 'call-1',
            name: 'run_local_python',
            args: { code: 'print(42)' },
          },
        ],
        usage: undefined,
        grounding: {
          webSearchQueries: ['beta query'],
          searchEntryPoint: {
            renderedContent: '<div>beta widget</div>',
          },
        },
        urlContext: undefined,
      })
      .mockResolvedValueOnce({
        modelContent: { role: 'model' as const, parts: [{ text: 'Done.' }] },
        parts: [{ text: 'Done.' }],
        thoughts: undefined,
        functionCalls: [],
        usage: undefined,
        grounding: {
          webSearchQueries: ['final query'],
        },
        urlContext: undefined,
      });

    const result = await runStandardToolLoop({
      initialContents,
      clientFunctions: {
        run_local_python: {
          declaration: {
            name: 'run_local_python',
            description: 'Run Python locally.',
          },
          handler: vi.fn(async () => ({
            response: { output: '42' },
            generatedFiles: [],
          })),
        },
      },
      runTurn,
    });

    expect(result.finalTurn.grounding).toEqual({
      webSearchQueries: ['alpha query', 'beta query', 'final query'],
      searchEntryPoint: {
        renderedContent: '<div>beta widget</div>',
      },
    });
  });
});
