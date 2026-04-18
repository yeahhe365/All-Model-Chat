import type { ModalityTokenCount, UsageMetadata } from '@google/genai';
import type { ApiUsageExactPricing, ApiUsageModalityTokenCount, ApiUsageRequestKind } from './db';

const normalizeDetail = (detail: ModalityTokenCount): ApiUsageModalityTokenCount | null => {
  const modality = detail.modality;
  const tokenCount = detail.tokenCount ?? 0;

  if (!modality || tokenCount <= 0) {
    return null;
  }

  if (modality !== 'TEXT' && modality !== 'IMAGE' && modality !== 'AUDIO') {
    return null;
  }

  return {
    modality,
    tokenCount,
  };
};

const normalizeDetails = (details: ModalityTokenCount[] | undefined) =>
  details?.map(normalizeDetail).filter((detail): detail is ApiUsageModalityTokenCount => detail !== null);

export const buildExactPricingFromUsageMetadata = (
  requestKind: ApiUsageRequestKind,
  usageMetadata?: UsageMetadata,
): ApiUsageExactPricing | undefined => {
  if (!usageMetadata) {
    return undefined;
  }

  const promptTokensDetails = normalizeDetails(usageMetadata.promptTokensDetails);
  const cacheTokensDetails = normalizeDetails(usageMetadata.cacheTokensDetails);
  const responseTokensDetails = normalizeDetails(usageMetadata.responseTokensDetails);
  const toolUsePromptTokensDetails = normalizeDetails(usageMetadata.toolUsePromptTokensDetails);

  if (!promptTokensDetails?.length && !cacheTokensDetails?.length && !responseTokensDetails?.length && !toolUsePromptTokensDetails?.length) {
    return undefined;
  }

  return {
    version: 1,
    requestKind,
    ...(promptTokensDetails?.length ? { promptTokensDetails } : {}),
    ...(cacheTokensDetails?.length ? { cacheTokensDetails } : {}),
    ...(responseTokensDetails?.length ? { responseTokensDetails } : {}),
    ...(toolUsePromptTokensDetails?.length ? { toolUsePromptTokensDetails } : {}),
  };
};

export const buildExactImageGenerationPricing = (generatedImageCount: number): ApiUsageExactPricing | undefined => {
  if (generatedImageCount <= 0) {
    return undefined;
  }

  return {
    version: 1,
    requestKind: 'image_generate',
    generatedImageCount,
  };
};
