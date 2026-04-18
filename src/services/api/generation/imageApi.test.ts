import { beforeEach, describe, expect, it, vi } from 'vitest';

const { generateImagesMock, getConfiguredApiClientMock } = vi.hoisted(() => ({
  generateImagesMock: vi.fn(),
  getConfiguredApiClientMock: vi.fn(),
}));

vi.mock('../baseApi', () => ({
  getConfiguredApiClient: getConfiguredApiClientMock,
}));

vi.mock('../../logService', () => ({
  logService: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
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
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: '1:1',
        imageSize: '1K',
      },
    });
  });
});
