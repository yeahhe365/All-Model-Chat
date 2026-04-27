import { beforeEach, describe, expect, it, vi } from 'vitest';

type UploadRequestRecord = {
  url: string;
  headers: Record<string, string>;
  bodySize: number;
};

type UploadResponseScenario = {
  status?: number;
  responseText?: string;
  responseHeaders?: Record<string, string>;
  progressFractions?: number[];
};

const {
  fetchMock,
  uploadRequests,
  uploadResponseScenarios,
  getConfiguredApiClientMock,
  getConfiguredApiBaseUrlMock,
  getConfiguredProxyBaseUrlMock,
} = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  uploadRequests: {
    requests: [] as UploadRequestRecord[],
  },
  uploadResponseScenarios: {
    scenarios: [] as UploadResponseScenario[],
  },
  getConfiguredApiClientMock: vi.fn(),
  getConfiguredApiBaseUrlMock: vi.fn(),
  getConfiguredProxyBaseUrlMock: vi.fn(),
}));

vi.mock('./apiClient', () => ({
  getConfiguredApiClient: getConfiguredApiClientMock,
  getConfiguredApiBaseUrl: getConfiguredApiBaseUrlMock,
  getConfiguredProxyBaseUrl: getConfiguredProxyBaseUrlMock,
}));

vi.mock('../logService', () => ({
  logService: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), recordTokenUsage: vi.fn() },
}));

import { uploadFileApi } from './fileApi';

class FakeUploadEventTarget {
  private listeners = new Set<(event: ProgressEvent) => void>();

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (type !== 'progress') return;
    this.listeners.add(listener as (event: ProgressEvent) => void);
  }

  dispatchProgress(loaded: number, total: number) {
    const event = new ProgressEvent('progress', {
      lengthComputable: true,
      loaded,
      total,
    });
    this.listeners.forEach((listener) => listener(event));
  }
}

class FakeXMLHttpRequest {
  upload = new FakeUploadEventTarget();
  status = 0;
  responseText = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  private requestHeaders: Record<string, string> = {};
  private responseHeaders: Record<string, string> = {};
  private requestUrl = '';

  open(_method: string, url: string) {
    this.requestUrl = url;
  }

  setRequestHeader(header: string, value: string) {
    this.requestHeaders[header] = value;
  }

  getAllResponseHeaders() {
    return Object.entries(this.responseHeaders)
      .map(([header, value]) => `${header}: ${value}`)
      .join('\r\n');
  }

  send(body?: XMLHttpRequestBodyInit | null) {
    const blob = body instanceof Blob ? body : undefined;
    uploadRequests.requests.push({
      url: this.requestUrl,
      headers: { ...this.requestHeaders },
      bodySize: blob?.size ?? 0,
    });

    const command =
      this.requestHeaders['X-Goog-Upload-Command'] ?? this.requestHeaders['x-goog-upload-command'] ?? 'upload';
    const isFinalChunk = /finalize/i.test(command);
    const scenario = uploadResponseScenarios.scenarios.shift() ?? {};

    queueMicrotask(() => {
      const total = blob?.size ?? 0;
      const progressFractions = scenario.progressFractions ?? [0.5, 1];
      progressFractions.forEach((fraction) => {
        this.upload.dispatchProgress(Math.round(total * fraction), total);
      });

      this.status = scenario.status ?? 200;
      this.responseText =
        scenario.responseText ??
        (isFinalChunk
          ? JSON.stringify({
              file: {
                name: 'files/test-file',
                uri: 'https://generativelanguage.googleapis.com/v1beta/files/test-file',
              },
            })
          : JSON.stringify({}));
      this.responseHeaders = scenario.responseHeaders ?? {
        'content-type': 'application/json',
        'x-goog-upload-status': isFinalChunk ? 'final' : 'active',
      };

      this.onload?.();
    });
  }

  abort() {
    this.onabort?.();
  }
}

describe('uploadFileApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadRequests.requests = [];
    uploadResponseScenarios.scenarios = [];
    getConfiguredApiBaseUrlMock.mockResolvedValue('https://generativelanguage.googleapis.com');
    getConfiguredProxyBaseUrlMock.mockResolvedValue(null);
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest);
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
          const url = request.path ? `${normalizedBaseUrl}/${request.path.replace(/^\/+/, '')}` : normalizedBaseUrl;
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

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/upload/v1beta/files')) {
        return new Response(null, {
          status: 200,
          headers: {
            'X-Goog-Upload-URL': 'https://upload.example.com/resumable/session-1',
          },
        });
      }

      return new Response(JSON.stringify({}), { status: 500 });
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

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://generativelanguage.googleapis.com/upload/v1beta/files');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        'x-goog-api-key': 'api-key',
      }),
    });
    expect(onProgress).toHaveBeenCalledWith(3, 5);
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

    await uploadFileApi('api-key', file, 'text/plain', 'sample.txt', new AbortController().signal, vi.fn());

    expect(uploadRequests.requests).toHaveLength(1);
    expect(uploadRequests.requests[0].url).toBe('https://proxy.example.com/gemini/resumable/session-1');
  });

  it('uploads large files in multiple resumable chunks', async () => {
    const chunkSize = 8 * 1024 * 1024;
    const file = new File([new Uint8Array(chunkSize * 2 + 1024)], 'large.mp4', { type: 'video/mp4' });

    await uploadFileApi('api-key', file, 'video/mp4', 'large.mp4', new AbortController().signal, vi.fn());

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

  it('retries transient byte upload failures before giving up on the chunk', async () => {
    uploadResponseScenarios.scenarios = [
      {
        status: 503,
        responseText: JSON.stringify({ error: { message: 'try again' } }),
        responseHeaders: { 'content-type': 'application/json' },
      },
      {
        status: 200,
        responseHeaders: {
          'content-type': 'application/json',
          'x-goog-upload-status': 'final',
        },
        responseText: JSON.stringify({
          file: {
            name: 'files/test-file',
            uri: 'https://generativelanguage.googleapis.com/v1beta/files/test-file',
          },
        }),
      },
    ];
    const file = new File(['hello'], 'sample.txt', { type: 'text/plain' });

    const uploadedFile = await uploadFileApi(
      'api-key',
      file,
      'text/plain',
      'sample.txt',
      new AbortController().signal,
      vi.fn(),
    );

    expect(uploadRequests.requests).toHaveLength(2);
    expect(uploadRequests.requests[0].headers['X-Goog-Upload-Offset']).toBe('0');
    expect(uploadRequests.requests[1].headers['X-Goog-Upload-Offset']).toBe('0');
    expect(uploadedFile.name).toBe('files/test-file');
  });
});
