import { beforeEach, describe, expect, it, vi } from 'vitest';

const { generateImagesMock, getConfiguredApiClientMock, recordTokenUsageMock } = vi.hoisted(() => ({
  generateImagesMock: vi.fn(),
  getConfiguredApiClientMock: vi.fn(),
  recordTokenUsageMock: vi.fn(),
}));

vi.mock('@/services/api/apiClient', () => ({
  getConfiguredApiClient: getConfiguredApiClientMock,
}));

vi.mock('@/services/logService', async () => {
  const { createLogServiceMockModule } = await import('@/test/moduleMockDoubles');

  return createLogServiceMockModule({ recordTokenUsage: recordTokenUsageMock });
});

import { generateImagesApi } from './imageApi';

describe('image pricing usage logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConfiguredApiClientMock.mockResolvedValue({
      models: {
        generateImages: generateImagesMock,
      },
    });
    generateImagesMock.mockResolvedValue({
      generatedImages: [{ image: { imageBytes: 'base64-image-1' } }, { image: { imageBytes: 'base64-image-2' } }],
    });
  });

  it('records exact Imagen pricing metadata from generated image counts', async () => {
    await generateImagesApi(
      'api-key',
      'imagen-4.0-generate-001',
      'draw a robot',
      '1:1',
      '1K',
      new AbortController().signal,
    );

    expect(recordTokenUsageMock).toHaveBeenCalledWith(
      'imagen-4.0-generate-001',
      expect.objectContaining({
        promptTokens: 0,
        completionTokens: 0,
      }),
      expect.objectContaining({
        requestKind: 'image_generate',
        generatedImageCount: 2,
      }),
    );
  });
});
