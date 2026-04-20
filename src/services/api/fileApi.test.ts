import { beforeEach, describe, expect, it, vi } from 'vitest';

type UploadRequestRecord = {
  url: string;
  headers: Record<string, string>;
  bodySize: number;
};

const {
  fetchMock,
  uploadRequests,
  getConfiguredApiClientMock,
  getConfiguredApiBaseUrlMock,
  getConfiguredProxyBaseUrlMock,
} = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  uploadRequests: {
    requests: [] as UploadRequestRecord[],
  },
  getConfiguredApiClientMock: vi.fn(),
  getConfiguredApiBaseUrlMock: vi.fn(),
  getConfiguredProxyBaseUrlMock: vi.fn(),
}));

vi.mock('./baseApi', () => ({
  getConfiguredApiClient: getConfiguredApiClientMock,
  getConfiguredApiBaseUrl: getConfiguredApiBaseUrlMock,
  getConfiguredProxyBaseUrl: getConfiguredProxyBaseUrlMock,
}));

vi.mock('../logService', () => ({
  logService: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), recordTokenUsage: vi.fn() },
}));

import { uploadFileApi } from './fileApi';

const toHeaderRecord = (headers: HeadersInit | undefined): Record<string, string> => {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return { ...headers };
};

describe('uploadFileApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadRequests.requests = [];
    getConfiguredApiBaseUrlMock.mockResolvedValue('https://generativelanguage.googleapis.com');
    getConfiguredProxyBaseUrlMock.mockResolvedValue(null);
    vi.stubGlobal('fetch', fetchMock);
    getConfiguredApiClientMock.mockResolvedValue({
      apiClient: {
        request: async (request: {
          path: string;
          body?: string | Blob;
          httpMethod: 'POST';
          httpOptions?: {
            apiVersion?: string;
            baseUrl?: string;
            headers?: Record<string, string>;
          };
          abortSignal?: AbortSignal;
        }) => {
          const baseUrl = request.httpOptions?.baseUrl ?? '';
          const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
          const url = request.path
            ? `${normalizedBaseUrl}/${request.path.replace(/^\/+/, '')}`
            : normalizedBaseUrl;
          const headers = {
            ...(request.httpOptions?.headers ?? {}),
            'x-goog-api-key': (request.httpOptions?.headers ?? {})['x-goog-api-key'] ?? 'api-key',
          };

          const response = await fetchMock(url, {
            method: request.httpMethod,
            headers,
            body: request.body as BodyInit | undefined,
            signal: request.abortSignal,
          });

          return {
            headers: Object.fromEntries(response.headers.entries()),
            json: () => response.json(),
          };
        },
      },
    });

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes('/upload/v1beta/files')) {
        return new Response(null, {
          status: 200,
          headers: {
            'X-Goog-Upload-URL': 'https://upload.example.com/resumable/session-1',
          },
        });
      }

      const headers = toHeaderRecord(init?.headers);
      const command = headers['X-Goog-Upload-Command'] ?? headers['x-goog-upload-command'] ?? 'upload';
      const isFinalChunk = /finalize/i.test(command);
      const bodyBlob = init?.body as Blob | undefined;

      uploadRequests.requests.push({
        url,
        headers,
        bodySize: bodyBlob?.size ?? 0,
      });

      return new Response(
        isFinalChunk
          ? JSON.stringify({
              file: {
                name: 'files/test-file',
                uri: 'https://generativelanguage.googleapis.com/v1beta/files/test-file',
              },
            })
          : JSON.stringify({}),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'x-goog-upload-status': isFinalChunk ? 'final' : 'active',
          },
        },
      );
    });
  });

  it('starts a resumable upload session and forwards upload progress events', async () => {
    const file = new File(['hello'], 'sample.txt', { type: 'text/plain' });
    const controller = new AbortController();
    const onProgress = vi.fn();

    const uploadedFile = await uploadFileApi(
      'api-key',
      file,
      'text/plain',
      'sample.txt',
      controller.signal,
      onProgress,
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://generativelanguage.googleapis.com/upload/v1beta/files');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        'x-goog-api-key': 'api-key',
      }),
    });
    expect(onProgress).toHaveBeenCalledWith(5, 5);
    expect(uploadRequests.requests).toHaveLength(1);
    expect(uploadRequests.requests[0].url).toBe('https://upload.example.com/resumable/session-1');
    expect(uploadRequests.requests[0].headers['x-goog-api-key']).toBe('api-key');
    expect(uploadedFile).toMatchObject({
      name: 'files/test-file',
      uri: 'https://generativelanguage.googleapis.com/v1beta/files/test-file',
    });
  });

  it('rewrites the upload session through the configured proxy base path', async () => {
    getConfiguredApiBaseUrlMock.mockResolvedValue('https://proxy.example.com/gemini');
    getConfiguredProxyBaseUrlMock.mockResolvedValue('https://proxy.example.com/gemini');

    const file = new File(['hello'], 'sample.txt', { type: 'text/plain' });

    await uploadFileApi(
      'api-key',
      file,
      'text/plain',
      'sample.txt',
      new AbortController().signal,
      vi.fn(),
    );

    expect(uploadRequests.requests).toHaveLength(1);
    expect(uploadRequests.requests[0].url).toBe('https://proxy.example.com/gemini/resumable/session-1');
  });

  it('uploads large files in multiple resumable chunks', async () => {
    const chunkSize = 8 * 1024 * 1024;
    const file = new File([new Uint8Array(chunkSize * 2 + 1024)], 'large.mp4', { type: 'video/mp4' });

    await uploadFileApi(
      'api-key',
      file,
      'video/mp4',
      'large.mp4',
      new AbortController().signal,
      vi.fn(),
    );

    expect(uploadRequests.requests).toHaveLength(3);
    expect(uploadRequests.requests[0].headers['X-Goog-Upload-Offset']).toBe('0');
    expect(uploadRequests.requests[0].headers['X-Goog-Upload-Command']).toBe('upload');
    expect(uploadRequests.requests[0].bodySize).toBe(chunkSize);
    expect(uploadRequests.requests[1].headers['X-Goog-Upload-Offset']).toBe(String(chunkSize));
    expect(uploadRequests.requests[1].headers['X-Goog-Upload-Command']).toBe('upload');
    expect(uploadRequests.requests[1].bodySize).toBe(chunkSize);
    expect(uploadRequests.requests[2].headers['X-Goog-Upload-Offset']).toBe(String(chunkSize * 2));
    expect(uploadRequests.requests[2].headers['X-Goog-Upload-Command']).toBe('upload, finalize');
    expect(uploadRequests.requests[2].bodySize).toBe(1024);
  });
});
