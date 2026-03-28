import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { convertHistoryToOpenAIMessages } from '../services/api/openaiCompatApi';

// Mock logService since it depends on browser APIs
vi.mock('../services/logService', () => ({
    logService: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

describe('openaiCompatApi', () => {
    describe('convertHistoryToOpenAIMessages', () => {
        it('should convert empty history with text parts', () => {
            const messages = convertHistoryToOpenAIMessages(
                [],
                [{ text: 'Hello, world!' }],
            );
            expect(messages).toEqual([
                { role: 'user', content: 'Hello, world!' },
            ]);
        });

        it('should add system instruction when provided', () => {
            const messages = convertHistoryToOpenAIMessages(
                [],
                [{ text: 'Hi' }],
                'You are a helpful assistant.',
            );
            expect(messages).toEqual([
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: 'Hi' },
            ]);
        });

        it('should convert model role to assistant', () => {
            const history = [
                { role: 'user' as const, parts: [{ text: 'Hello' }] },
                { role: 'model' as const, parts: [{ text: 'Hi there!' }] },
            ];
            const messages = convertHistoryToOpenAIMessages(
                history,
                [{ text: 'How are you?' }],
            );
            expect(messages).toEqual([
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi there!' },
                { role: 'user', content: 'How are you?' },
            ]);
        });

        it('should handle multi-part messages by joining with newline', () => {
            const history = [
                { role: 'user' as const, parts: [{ text: 'Part 1' }, { text: 'Part 2' }] },
            ];
            const messages = convertHistoryToOpenAIMessages(history, [{ text: 'Question' }]);
            expect(messages[0].content).toBe('Part 1\nPart 2');
        });

        it('should handle inline data parts as attachment placeholder', () => {
            const history = [
                {
                    role: 'user' as const,
                    parts: [
                        { text: 'Check this image' },
                        { inlineData: { mimeType: 'image/png', data: 'base64...' } } as any,
                    ],
                },
            ];
            const messages = convertHistoryToOpenAIMessages(history, [{ text: 'What is it?' }]);
            expect(messages[0].content).toContain('Check this image');
            expect(messages[0].content).toContain('[Attachment: media content]');
        });

        it('should handle fileData parts as attachment placeholder', () => {
            const history = [
                {
                    role: 'user' as const,
                    parts: [
                        { fileData: { mimeType: 'application/pdf', fileUri: 'gs://...' } } as any,
                    ],
                },
            ];
            const messages = convertHistoryToOpenAIMessages(history, [{ text: 'Summarize' }]);
            expect(messages[0].content).toContain('[Attachment: file reference]');
        });

        it('should respect role parameter for current message', () => {
            const messages = convertHistoryToOpenAIMessages(
                [],
                [{ text: 'Continue the story' }],
                undefined,
                'model',
            );
            expect(messages[0].role).toBe('assistant');
        });

        it('should skip empty history items', () => {
            const history = [
                { role: 'user' as const, parts: [] },
                { role: 'model' as const, parts: [{ text: 'Response' }] },
            ];
            const messages = convertHistoryToOpenAIMessages(history, [{ text: 'Next' }]);
            // Empty user message should be skipped
            expect(messages.length).toBe(2);
            expect(messages[0].role).toBe('assistant');
        });

        it('should handle complex conversation with system instruction', () => {
            const history = [
                { role: 'user' as const, parts: [{ text: 'Tell me a joke' }] },
                { role: 'model' as const, parts: [{ text: 'Why did the chicken...' }] },
                { role: 'user' as const, parts: [{ text: 'Another one' }] },
                { role: 'model' as const, parts: [{ text: 'Knock knock...' }] },
            ];
            const messages = convertHistoryToOpenAIMessages(
                history,
                [{ text: 'One more please' }],
                'You are a comedian.',
            );
            expect(messages.length).toBe(6); // system + 4 history + 1 current
            expect(messages[0].role).toBe('system');
            expect(messages[1].role).toBe('user');
            expect(messages[2].role).toBe('assistant');
            expect(messages[3].role).toBe('user');
            expect(messages[4].role).toBe('assistant');
            expect(messages[5].role).toBe('user');
        });
    });

    describe('temperature clamping (via internal clampTemperature)', () => {
        // We can't test clampTemperature directly as it's not exported,
        // but we test it indirectly through the request body construction.
        // These tests verify the behavior through the convertHistoryToOpenAIMessages function
        // which is a prerequisite for the actual API call.

        it('should handle undefined system instruction gracefully', () => {
            const messages = convertHistoryToOpenAIMessages(
                [],
                [{ text: 'Hello' }],
                undefined,
            );
            expect(messages.length).toBe(1);
            expect(messages[0].role).toBe('user');
        });

        it('should handle empty system instruction', () => {
            const messages = convertHistoryToOpenAIMessages(
                [],
                [{ text: 'Hello' }],
                '',
            );
            // Empty string is falsy, should not add system message
            expect(messages.length).toBe(1);
        });
    });
});

describe('openaiCompatApi - streaming integration', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should handle API error responses gracefully', async () => {
        const { sendOpenAICompatMessageStream } = await import('../services/api/openaiCompatApi');

        const mockResponse = new Response(JSON.stringify({ error: { message: 'Invalid API key' } }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
        vi.mocked(fetch).mockResolvedValue(mockResponse);

        const onError = vi.fn();
        const onComplete = vi.fn();
        const onPart = vi.fn();
        const onThought = vi.fn();

        await sendOpenAICompatMessageStream(
            'invalid-key',
            'MiniMax-M2.7',
            [],
            [{ text: 'Hello' }],
            { temperature: 0.7 },
            new AbortController().signal,
            onPart,
            onThought,
            onError,
            onComplete,
        );

        expect(onError).toHaveBeenCalledWith(expect.objectContaining({
            message: expect.stringContaining('Invalid API key'),
        }));
        expect(onComplete).toHaveBeenCalled();
    });

    it('should send correct request to MiniMax endpoint', async () => {
        const { sendOpenAICompatMessageNonStream } = await import('../services/api/openaiCompatApi');

        const mockResponse = new Response(JSON.stringify({
            id: 'test-id',
            object: 'chat.completion',
            choices: [{ message: { role: 'assistant', content: 'Hello!' }, finish_reason: 'stop', index: 0 }],
            usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        vi.mocked(fetch).mockResolvedValue(mockResponse);

        const onError = vi.fn();
        const onComplete = vi.fn();

        await sendOpenAICompatMessageNonStream(
            'test-api-key',
            'MiniMax-M2.7',
            [],
            [{ text: 'Hello' }],
            { temperature: 0.7, systemInstruction: 'Be helpful' },
            new AbortController().signal,
            onError,
            onComplete,
        );

        // Verify fetch was called with correct URL
        expect(fetch).toHaveBeenCalledWith(
            'https://api.minimax.io/v1/chat/completions',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Authorization': 'Bearer test-api-key',
                    'Content-Type': 'application/json',
                }),
            }),
        );

        // Verify the request body
        const callArgs = vi.mocked(fetch).mock.calls[0];
        const body = JSON.parse(callArgs[1]?.body as string);
        expect(body.model).toBe('MiniMax-M2.7');
        expect(body.stream).toBe(false);
        expect(body.temperature).toBe(0.7);
        expect(body.messages).toEqual([
            { role: 'system', content: 'Be helpful' },
            { role: 'user', content: 'Hello' },
        ]);

        // Verify completion was called with proper data
        expect(onError).not.toHaveBeenCalled();
        expect(onComplete).toHaveBeenCalledWith(
            [{ text: 'Hello!' }],
            undefined,
            expect.objectContaining({
                promptTokenCount: 5,
                candidatesTokenCount: 3,
                totalTokenCount: 8,
            }),
            undefined,
            undefined,
        );
    });

    it('should strip thinking tags from response', async () => {
        const { sendOpenAICompatMessageNonStream } = await import('../services/api/openaiCompatApi');

        const content = '<thinking>Let me think about this...</thinking>The answer is 42.';
        const mockResponse = new Response(JSON.stringify({
            id: 'test-id',
            object: 'chat.completion',
            choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop', index: 0 }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        vi.mocked(fetch).mockResolvedValue(mockResponse);

        const onComplete = vi.fn();

        await sendOpenAICompatMessageNonStream(
            'test-key',
            'MiniMax-M2.7',
            [],
            [{ text: 'Question' }],
            { temperature: 0.7 },
            new AbortController().signal,
            vi.fn(),
            onComplete,
        );

        // Should strip thinking tags from main content
        expect(onComplete).toHaveBeenCalledWith(
            [{ text: 'The answer is 42.' }],
            'Let me think about this...',
            undefined,
            undefined,
            undefined,
        );
    });

    it('should clamp temperature to (0, 1] range', async () => {
        const { sendOpenAICompatMessageNonStream } = await import('../services/api/openaiCompatApi');

        // Test with temperature 0 (should be clamped to 0.01)
        const mockResponse1 = new Response(JSON.stringify({
            id: 'test-id',
            object: 'chat.completion',
            choices: [{ message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop', index: 0 }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        vi.mocked(fetch).mockResolvedValue(mockResponse1);

        await sendOpenAICompatMessageNonStream(
            'test-key', 'MiniMax-M2.7', [], [{ text: 'test' }],
            { temperature: 0 },
            new AbortController().signal, vi.fn(), vi.fn(),
        );

        let body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
        expect(body.temperature).toBe(0.01);

        vi.mocked(fetch).mockClear();

        // Test with temperature > 1 (should be clamped to 1.0)
        const mockResponse2 = new Response(JSON.stringify({
            id: 'test-id-2',
            object: 'chat.completion',
            choices: [{ message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop', index: 0 }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        vi.mocked(fetch).mockResolvedValue(mockResponse2);

        await sendOpenAICompatMessageNonStream(
            'test-key', 'MiniMax-M2.7', [], [{ text: 'test' }],
            { temperature: 2.0 },
            new AbortController().signal, vi.fn(), vi.fn(),
        );

        body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
        expect(body.temperature).toBe(1.0);
    });

    it('should handle abort signal', async () => {
        const { sendOpenAICompatMessageNonStream } = await import('../services/api/openaiCompatApi');

        const abortController = new AbortController();
        abortController.abort();

        const mockResponse = new Response(JSON.stringify({
            id: 'test-id',
            object: 'chat.completion',
            choices: [{ message: { role: 'assistant', content: 'test' }, finish_reason: 'stop', index: 0 }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        vi.mocked(fetch).mockRejectedValue(new DOMException('The operation was aborted.', 'AbortError'));

        const onError = vi.fn();
        const onComplete = vi.fn();

        await sendOpenAICompatMessageNonStream(
            'test-key', 'MiniMax-M2.7', [], [{ text: 'test' }],
            { temperature: 0.7 },
            abortController.signal, onError, onComplete,
        );

        // Should not call onError when aborted
        expect(onError).not.toHaveBeenCalled();
        expect(onComplete).toHaveBeenCalledWith([], '', undefined, undefined, undefined);
    });
});

describe('openaiCompatApi - non-streaming integration', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should handle network errors', async () => {
        const { sendOpenAICompatMessageNonStream } = await import('../services/api/openaiCompatApi');

        vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

        const onError = vi.fn();
        const onComplete = vi.fn();

        await sendOpenAICompatMessageNonStream(
            'test-key', 'MiniMax-M2.7', [], [{ text: 'test' }],
            { temperature: 0.7 },
            new AbortController().signal, onError, onComplete,
        );

        expect(onError).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Network error',
        }));
    });

    it('should handle malformed JSON error response', async () => {
        const { sendOpenAICompatMessageNonStream } = await import('../services/api/openaiCompatApi');

        const mockResponse = new Response('Internal Server Error', {
            status: 500,
            headers: { 'Content-Type': 'text/plain' },
        });
        vi.mocked(fetch).mockResolvedValue(mockResponse);

        const onError = vi.fn();
        const onComplete = vi.fn();

        await sendOpenAICompatMessageNonStream(
            'test-key', 'MiniMax-M2.7', [], [{ text: 'test' }],
            { temperature: 0.7 },
            new AbortController().signal, onError, onComplete,
        );

        expect(onError).toHaveBeenCalledWith(expect.objectContaining({
            message: expect.stringContaining('Internal Server Error'),
        }));
    });

    it('should handle empty response choices', async () => {
        const { sendOpenAICompatMessageNonStream } = await import('../services/api/openaiCompatApi');

        const mockResponse = new Response(JSON.stringify({
            id: 'test-id',
            object: 'chat.completion',
            choices: [],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        vi.mocked(fetch).mockResolvedValue(mockResponse);

        const onComplete = vi.fn();

        await sendOpenAICompatMessageNonStream(
            'test-key', 'MiniMax-M2.7', [], [{ text: 'test' }],
            { temperature: 0.7 },
            new AbortController().signal, vi.fn(), onComplete,
        );

        // Should complete with empty parts
        expect(onComplete).toHaveBeenCalledWith(
            [],
            undefined,
            undefined,
            undefined,
            undefined,
        );
    });

    it('should pass topP when provided', async () => {
        const { sendOpenAICompatMessageNonStream } = await import('../services/api/openaiCompatApi');

        const mockResponse = new Response(JSON.stringify({
            id: 'test-id',
            object: 'chat.completion',
            choices: [{ message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop', index: 0 }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        vi.mocked(fetch).mockResolvedValue(mockResponse);

        await sendOpenAICompatMessageNonStream(
            'test-key', 'MiniMax-M2.7', [], [{ text: 'test' }],
            { temperature: 0.7, topP: 0.9 },
            new AbortController().signal, vi.fn(), vi.fn(),
        );

        const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
        expect(body.top_p).toBe(0.9);
    });
});
