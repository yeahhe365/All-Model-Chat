import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendOpenAICompatibleMessageNonStream, sendOpenAICompatibleMessageStream } from './openaiCompatibleApi';

describe('openaiCompatibleApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends a non-streaming chat completion request and maps the response text plus usage', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'hello from openai compatible' } }],
          usage: {
            prompt_tokens: 11,
            completion_tokens: 7,
            total_tokens: 18,
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const onComplete = vi.fn();
    const onError = vi.fn();

    await sendOpenAICompatibleMessageNonStream(
      'api-key',
      'gemini-3-flash-preview',
      [{ role: 'user', parts: [{ text: 'previous question' }] }],
      [{ text: 'current question' }],
      {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        systemInstruction: 'Be concise.',
        temperature: 0.4,
        topP: 0.9,
      },
      new AbortController().signal,
      onError,
      onComplete,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer api-key',
          'content-type': 'application/json',
        }),
      }),
    );
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(requestInit.body))).toEqual({
      model: 'gemini-3-flash-preview',
      messages: [
        { role: 'system', content: 'Be concise.' },
        { role: 'user', content: 'previous question' },
        { role: 'user', content: 'current question' },
      ],
      temperature: 0.4,
      top_p: 0.9,
      stream: false,
    });
    expect(onError).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledWith(
      [{ text: 'hello from openai compatible' }],
      undefined,
      {
        promptTokenCount: 11,
        candidatesTokenCount: 7,
        totalTokenCount: 18,
      },
      undefined,
      undefined,
    );
  });

  it('streams SSE chat completion chunks as text parts and reports final usage', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            [
              'data: {"choices":[{"delta":{"content":"hel"}}]}',
              '',
              'data: {"choices":[{"delta":{"content":"lo"}}],"usage":{"prompt_tokens":3,"completion_tokens":2,"total_tokens":5}}',
              '',
              'data: [DONE]',
              '',
            ].join('\n'),
          ),
        );
        controller.close();
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } })),
    );

    const onPart = vi.fn();
    const onComplete = vi.fn();
    const onError = vi.fn();

    await sendOpenAICompatibleMessageStream(
      'api-key',
      'gpt-4o-mini',
      [],
      [{ text: 'say hello' }],
      {
        baseUrl: 'https://api.openai.com/v1',
        temperature: 0.2,
      },
      new AbortController().signal,
      onPart,
      vi.fn(),
      onError,
      onComplete,
    );

    expect(onPart).toHaveBeenNthCalledWith(1, { text: 'hel' });
    expect(onPart).toHaveBeenNthCalledWith(2, { text: 'lo' });
    expect(onError).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledWith(
      {
        promptTokenCount: 3,
        candidatesTokenCount: 2,
        totalTokenCount: 5,
      },
      undefined,
      undefined,
    );
  });
});
