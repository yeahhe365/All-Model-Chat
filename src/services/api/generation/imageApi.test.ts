import { beforeEach, describe, expect, it, vi } from 'vitest';

const { generateImagesMock, getConfiguredApiClientMock } = vi.hoisted(() => ({
  generateImagesMock: vi.fn(),
  getConfiguredApiClientMock: vi.fn(),
}));

vi.mock('../apiClient', () => ({
  getConfiguredApiClient: getConfiguredApiClientMock,
}));

vi.mock('../../logService', () => ({
  logService: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), recordTokenUsage: vi.fn() },
}));

import { generateImagesApi } from './imageApi';

describe('generateImagesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConfiguredApiClientMock.mockResolvedValue({
      models: {
        generateImages: generateImagesMock,
      },
    });
    generateImagesMock.mockResolvedValue({
      generatedImages: [
        {
          image: {
            imageBytes: 'base64-image',
          },
        },
      ],
    });
  });

  it('omits imageSize for imagen-4.0-fast-generate-001', async () => {
    await generateImagesApi(
      'api-key',
      'imagen-4.0-fast-generate-001',
      'draw a robot',
      '1:1',
      '1K',
      new AbortController().signal,
    );

    expect(generateImagesMock).toHaveBeenCalledWith({
      model: 'imagen-4.0-fast-generate-001',
      prompt: 'draw a robot',
      config: {
        abortSignal: expect.any(AbortSignal),
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: '1:1',
      },
    });
  });

  it('keeps imageSize for imagen-4.0-generate-001', async () => {
    await generateImagesApi(
      'api-key',
      'imagen-4.0-generate-001',
      'draw a robot',
      '1:1',
      '1K',
      new AbortController().signal,
    );

    expect(generateImagesMock).toHaveBeenCalledWith({
      model: 'imagen-4.0-generate-001',
      prompt: 'draw a robot',
      config: {
        abortSignal: expect.any(AbortSignal),
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: '1:1',
        imageSize: '1K',
      },
    });
  });

  it('maps Imagen-specific generation options to API parameter values', async () => {
    await (generateImagesApi as unknown as (
      apiKey: string,
      modelId: string,
      prompt: string,
      aspectRatio: string,
      imageSize: string | undefined,
      abortSignal: AbortSignal,
      options: { numberOfImages: number; personGeneration: string },
    ) => Promise<string[]>)(
      'api-key',
      'imagen-4.0-generate-001',
      'draw a family portrait',
      '16:9',
      '2K',
      new AbortController().signal,
      {
        numberOfImages: 4,
        personGeneration: 'ALLOW_ALL',
      },
    );

    expect(generateImagesMock).toHaveBeenCalledWith({
      model: 'imagen-4.0-generate-001',
      prompt: 'draw a family portrait',
      config: {
        abortSignal: expect.any(AbortSignal),
        numberOfImages: 4,
        outputMimeType: 'image/png',
        aspectRatio: '16:9',
        imageSize: '2K',
        personGeneration: 'allow_all',
      },
    });
  });

  it('normalizes stale aspect ratio and image size values for Imagen standard', async () => {
    await generateImagesApi(
      'api-key',
      'imagen-4.0-generate-001',
      'draw a robot',
      '1:4',
      '4K',
      new AbortController().signal,
    );

    expect(generateImagesMock).toHaveBeenCalledWith({
      model: 'imagen-4.0-generate-001',
      prompt: 'draw a robot',
      config: {
        abortSignal: expect.any(AbortSignal),
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: '1:1',
        imageSize: '1K',
      },
    });
  });
});
