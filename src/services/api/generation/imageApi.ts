import type { GenerateImagesConfig } from '@google/genai';
import type { GenerateImagesRequestOptions } from '../../../types';
import { executeConfiguredApiRequest } from '../apiExecutor';
import { buildExactImageGenerationPricing } from '../../../utils/usagePricingTelemetry';
import { normalizeAspectRatioForModel, normalizeImageSizeForModel } from '../../../utils/modelHelpers';
import { logService } from '../../logService';

const mapPersonGenerationForApi = (
  personGeneration: GenerateImagesRequestOptions['personGeneration'],
): GenerateImagesConfig['personGeneration'] | undefined => {
  switch (personGeneration) {
    case 'DONT_ALLOW':
      return 'dont_allow' as GenerateImagesConfig['personGeneration'];
    case 'ALLOW_ADULT':
      return 'allow_adult' as GenerateImagesConfig['personGeneration'];
    case 'ALLOW_ALL':
      return 'allow_all' as GenerateImagesConfig['personGeneration'];
    default:
      return personGeneration as GenerateImagesConfig['personGeneration'] | undefined;
  }
};

export const generateImagesApi = async (
  apiKey: string,
  modelId: string,
  prompt: string,
  aspectRatio: string,
  imageSize: string | undefined,
  abortSignal: AbortSignal,
  options: GenerateImagesRequestOptions = {},
): Promise<string[]> => {
  if (!prompt.trim()) {
    throw new Error('Image generation prompt cannot be empty.');
  }

  return executeConfiguredApiRequest({
    apiKey,
    label: `Generating image with model ${modelId}`,
    errorLabel: `Failed to generate images with model ${modelId}:`,
    abortSignal,
    run: async ({ client: ai }) => {
      logService.debug('Image generation request details', { prompt, aspectRatio, imageSize });
      const normalizedAspectRatio = normalizeAspectRatioForModel(modelId, aspectRatio) || '1:1';
      const normalizedImageSize = normalizeImageSizeForModel(modelId, imageSize);
      const config: GenerateImagesConfig = {
        abortSignal,
        numberOfImages: options.numberOfImages ?? 1,
        outputMimeType: 'image/png',
        aspectRatio: normalizedAspectRatio,
      };

      if (normalizedImageSize) {
        config.imageSize = normalizedImageSize;
      }

      const personGeneration = mapPersonGenerationForApi(options.personGeneration);
      if (personGeneration) {
        config.personGeneration = personGeneration;
      }

      const response = await ai.models.generateImages({
        model: modelId,
        prompt: prompt,
        config: config,
      });

      if (abortSignal.aborted) {
        const abortError = new Error('Image generation cancelled by user.');
        abortError.name = 'AbortError';
        throw abortError;
      }

      const images =
        response.generatedImages
          ?.map((img) => img.image?.imageBytes)
          .filter((imageBytes): imageBytes is string => typeof imageBytes === 'string' && imageBytes.length > 0) ?? [];
      if (images.length === 0) {
        throw new Error('No images generated. The prompt may have been blocked or the model failed to respond.');
      }

      logService.recordTokenUsage(
        modelId,
        {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        buildExactImageGenerationPricing(images.length),
      );

      return images;
    },
  });
};
