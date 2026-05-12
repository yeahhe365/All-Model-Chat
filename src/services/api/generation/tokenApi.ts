import { getHttpOptionsForContents } from '@/services/api/apiClient';
import { executeConfiguredApiRequest } from '@/services/api/apiExecutor';
import { logService } from '@/services/logService';
import type { ContentListUnion, CountTokensConfig, CountTokensResponse, Part } from '@google/genai';

const sanitizeCountTokensConfig = (config?: CountTokensConfig): CountTokensConfig | undefined => {
  if (!config) {
    return undefined;
  }

  const rest = { ...config };
  delete (rest as { generationConfig?: CountTokensConfig['generationConfig'] }).generationConfig;
  return Object.keys(rest).length > 0 ? rest : undefined;
};

const isUnsupportedCountTokensConfigError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return /not supported in gemini api|unknown name|invalid json payload/i.test(error.message);
};

const isRetryableCountTokensArgumentError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return /invalid_argument|request contains an invalid argument|unknown name|invalid json payload/i.test(error.message);
};

const extractSingleTextPrompt = (parts: Part[]): string | null => {
  if (parts.length !== 1) {
    return null;
  }

  const candidate = parts[0] as Part & { text?: unknown };
  return typeof candidate.text === 'string' ? candidate.text : null;
};

export const countTokensApi = async (
  apiKey: string,
  modelId: string,
  parts: Part[],
  config?: CountTokensConfig,
): Promise<number> => {
  return executeConfiguredApiRequest({
    apiKey,
    label: `Counting tokens for model ${modelId}...`,
    errorLabel: 'Error counting tokens:',
    run: async ({ client: ai }) => {
      // Sanitize parts to remove custom internal properties.
      // We MUST retain mediaResolution and videoMetadata as they significantly affect token counts
      // for Gemini 3.0 models (resolution) and video inputs (cropping).
      const sanitizedParts = parts.map((p) => {
        const sanitized = { ...(p as Record<string, unknown>) };
        delete (sanitized as { thoughtSignature?: unknown }).thoughtSignature;
        return sanitized as Part;
      });
      const contents = [{ role: 'user', parts: sanitizedParts }];
      const sanitizedConfig = sanitizeCountTokensConfig(config);
      const plainTextPrompt = extractSingleTextPrompt(sanitizedParts);
      const requestTokenCount = async (
        requestContents: ContentListUnion,
        requestConfig?: CountTokensConfig,
      ): Promise<CountTokensResponse> => {
        return ai.models.countTokens({
          model: modelId,
          contents: requestContents,
          ...(requestConfig ? { config: requestConfig } : {}),
        });
      };

      let response: CountTokensResponse;
      try {
        response = await requestTokenCount(contents, sanitizedConfig);
      } catch (error) {
        if (sanitizedConfig && isUnsupportedCountTokensConfigError(error)) {
          const originalErrorMessage = error instanceof Error ? error.message : String(error);

          logService.warn('Retrying token count without unsupported Gemini Developer API config.', {
            category: 'MODEL',
            data: {
              modelId,
              originalError: originalErrorMessage,
              droppedConfigKeys: Object.keys(sanitizedConfig),
            },
          });

          try {
            response = await requestTokenCount(contents);
          } catch (retryError) {
            if (!plainTextPrompt || !isRetryableCountTokensArgumentError(retryError)) {
              throw retryError;
            }

            logService.warn('Retrying token count with plain-text contents after INVALID_ARGUMENT.', {
              category: 'MODEL',
              data: {
                modelId,
                originalError: retryError instanceof Error ? retryError.message : String(retryError),
              },
            });

            response = await requestTokenCount(plainTextPrompt);
          }
        } else if (plainTextPrompt && isRetryableCountTokensArgumentError(error)) {
          logService.warn('Retrying token count with plain-text contents after INVALID_ARGUMENT.', {
            category: 'MODEL',
            data: {
              modelId,
              originalError: error instanceof Error ? error.message : String(error),
            },
          });

          response = await requestTokenCount(plainTextPrompt);
        } else {
          throw error;
        }
      }

      return response.totalTokens || 0;
    },
    httpOptions: getHttpOptionsForContents([{ parts }]),
  });
};
