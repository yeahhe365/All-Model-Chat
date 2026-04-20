import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchMock, xhrState } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  xhrState: {
    instances: [] as MockXmlHttpRequest[],
  },
}));

class MockXmlHttpRequest {
  method: string | null = null;
  url: string | null = null;
  headers: Record<string, string> = {};
  status = 0;
  responseText = '';
  upload = {
    onprogress: null as ((event: ProgressEvent<EventTarget>) => void) | null,
  };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  abort = vi.fn(() => {
    this.onabort?.();
  });

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }

  send(_body?: Document | XMLHttpRequestBodyInit | null) {
    this.upload.onprogress?.({
      lengthComputable: true,
      loaded: 5,
      total: 10,
    } as ProgressEvent<EventTarget>);
    this.upload.onprogress?.({
      lengthComputable: true,
      loaded: 10,
      total: 10,
    } as ProgressEvent<EventTarget>);
    this.status = 200;
    this.responseText = JSON.stringify({
      file: {
        name: 'files/test-file',
        uri: 'https://generativelanguage.googleapis.com/v1beta/files/test-file',
      },
    });
    this.onload?.();
  }
}

vi.mock('./baseApi', () => ({
  getConfiguredApiClient: vi.fn(),
  getConfiguredApiBaseUrl: vi.fn(async () => 'https://generativelanguage.googleapis.com'),
}));

vi.mock('../logService', () => ({
  logService: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), recordTokenUsage: vi.fn() },
}));

import { uploadFileApi } from './fileApi';

describe('uploadFileApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    xhrState.instances = [];
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('XMLHttpRequest', class extends MockXmlHttpRequest {
      constructor() {
        super();
        xhrState.instances.push(this);
      }
    });
    fetchMock.mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: {
          'X-Goog-Upload-URL': 'https://upload.example.com/resumable/session-1',
        },
      }),
    );
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
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/upload/v1beta/files');
    expect(onProgress).toHaveBeenNthCalledWith(1, 5, 10);
    expect(onProgress).toHaveBeenNthCalledWith(2, 10, 10);
    expect(xhrState.instances).toHaveLength(1);
    expect(xhrState.instances[0].url).toBe('https://upload.example.com/resumable/session-1');
    expect(uploadedFile).toMatchObject({
      name: 'files/test-file',
      uri: 'https://generativelanguage.googleapis.com/v1beta/files/test-file',
    });
  });
});
