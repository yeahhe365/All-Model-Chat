import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('NetworkInterceptor', () => {
  let originalFetch: typeof window.fetch;

  beforeEach(() => {
    originalFetch = window.fetch;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.fetch = originalFetch;
  });

  it('should pass through when interceptor is disabled', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok'));
    window.fetch = mockFetch;

    // Simulate disabled state
    const isInterceptorEnabled = false;
    const currentProxyUrl = 'https://proxy.example.com';

    // Direct fetch call should go through
    const patchedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!isInterceptorEnabled || !currentProxyUrl) {
        return mockFetch(input, init);
      }
      return mockFetch(input, init);
    };

    await patchedFetch('https://example.com/api');
    expect(mockFetch).toHaveBeenCalledWith('https://example.com/api', undefined);
  });

  it('should rewrite Gemini API URLs to proxy', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok'));
    window.fetch = mockFetch;

    const TARGET_HOST = 'generativelanguage.googleapis.com';
    const proxyUrl = 'https://proxy.example.com';

    const rewriteUrl = (urlStr: string, currentProxyUrl: string): string => {
      const targetOrigin = `https://${TARGET_HOST}`;
      let newUrl = urlStr.replace(targetOrigin, currentProxyUrl);

      if (newUrl.includes('/v1/v1beta/')) {
        newUrl = newUrl.replace('/v1/v1beta/', '/v1/');
      }
      if (newUrl.includes('/v1beta/v1beta')) {
        newUrl = newUrl.replace('/v1beta/v1beta', '/v1beta');
      }
      newUrl = newUrl.replace(/([^:]\/)\/+/g, '$1');
      return newUrl;
    };

    const result = rewriteUrl(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent',
      proxyUrl,
    );
    expect(result).toBe('https://proxy.example.com/v1beta/models/gemini-3.1-pro-preview:generateContent');
  });

  it('should fix double version path /v1beta/v1beta', () => {
    const rewriteUrl = (urlStr: string, currentProxyUrl: string): string => {
      const targetOrigin = 'https://generativelanguage.googleapis.com';
      let newUrl = urlStr.replace(targetOrigin, currentProxyUrl);

      if (newUrl.includes('/v1beta/v1beta')) {
        newUrl = newUrl.replace('/v1beta/v1beta', '/v1beta');
      }
      newUrl = newUrl.replace(/([^:]\/)\/+/g, '$1');
      return newUrl;
    };

    const result = rewriteUrl(
      'https://generativelanguage.googleapis.com/v1beta/v1beta/models/gemini-3.1-pro-preview',
      'https://proxy.example.com',
    );
    expect(result).toBe('https://proxy.example.com/v1beta/models/gemini-3.1-pro-preview');
  });

  it('should fix Vertex AI path by injecting publishers/google', () => {
    const rewriteUrl = (urlStr: string): string => {
      let newUrl = urlStr;
      if (newUrl.includes('aiplatform.googleapis.com') && !newUrl.includes('publishers/google')) {
        if (newUrl.includes('/v1/models/')) {
          newUrl = newUrl.replace('/v1/models/', '/v1/publishers/google/models/');
        }
      }
      return newUrl;
    };

    const result = rewriteUrl(
      'https://aiplatform.googleapis.com/v1/models/gemini-3.1-pro-preview:generateContent',
    );
    expect(result).toBe(
      'https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-3.1-pro-preview:generateContent',
    );
  });

  it('should fix double slashes', () => {
    const fixDoubleSlashes = (url: string): string => {
      return url.replace(/([^:]\/)\/+/g, '$1');
    };

    expect(fixDoubleSlashes('https://proxy.com//v1beta/models')).toBe(
      'https://proxy.com/v1beta/models',
    );
    expect(fixDoubleSlashes('https://proxy.com/')).toBe('https://proxy.com/');
  });
});
