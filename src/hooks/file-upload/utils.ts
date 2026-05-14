import {
  EXTENSION_TO_MIME,
  ALL_SUPPORTED_MIME_TYPES,
  SUPPORTED_IMAGE_MIME_TYPES,
  SUPPORTED_PDF_MIME_TYPES,
  SUPPORTED_AUDIO_MIME_TYPES,
  SUPPORTED_VIDEO_MIME_TYPES,
} from '@/constants/fileConstants';
import { type AppSettings, type UploadedFile } from '@/types';
import { isTextFile } from '@/utils/fileTypeUtils';
import { getTranslator } from '@/i18n/translations';

type Translator = ReturnType<typeof getTranslator>;

const INLINE_MAX_REQUEST_PAYLOAD_BYTES = 100 * 1024 * 1024;
const INLINE_MAX_PDF_PAYLOAD_BYTES = 50 * 1024 * 1024;
const INLINE_MAX_CODE_EXECUTION_TEXT_PAYLOAD_BYTES = 2 * 1024 * 1024;
const INLINE_PART_JSON_OVERHEAD_BYTES = 512;

const getFileSignature = (file: Pick<File, 'name' | 'size'>) => `${file.name.toLowerCase()}::${file.size}`;

type ProcessingPlaceholderFileInput = Pick<UploadedFile, 'id' | 'name' | 'type' | 'size'> &
  Partial<Omit<UploadedFile, 'id' | 'name' | 'type' | 'size'>>;

export const createProcessingPlaceholderFile = ({
  id,
  name,
  type,
  size,
  ...overrides
}: ProcessingPlaceholderFileInput): UploadedFile => ({
  id,
  name,
  type,
  size,
  isProcessing: true,
  uploadState: 'pending',
  ...overrides,
});

export const formatSpeed = (bytesPerSecond: number): string => {
  if (!isFinite(bytesPerSecond) || bytesPerSecond < 0) return '';
  if (bytesPerSecond < 1024) return `${Math.round(bytesPerSecond)} B/s`;
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
};

export const getEffectiveMimeType = (file: File): string => {
  const effectiveMimeType = file.type;
  const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
  const mappedMimeType = EXTENSION_TO_MIME[fileExtension];
  const shouldPreferMappedTextMime =
    isTextFile(file) &&
    !!mappedMimeType &&
    (!effectiveMimeType || effectiveMimeType === 'text/plain' || effectiveMimeType === 'application/octet-stream');

  if (shouldPreferMappedTextMime) {
    return mappedMimeType;
  }

  if (effectiveMimeType && ALL_SUPPORTED_MIME_TYPES.includes(effectiveMimeType)) {
    return effectiveMimeType;
  }

  // 1. Fall back to generic text/plain for text/code extensions when no more specific MIME is available
  if (isTextFile(file)) {
    return 'text/plain';
  }

  // 2. Fallback for missing MIME types based on extension
  if (!effectiveMimeType && mappedMimeType) {
    return mappedMimeType;
  }

  return effectiveMimeType || 'application/octet-stream';
};

const estimateBase64PayloadBytes = (rawBytes: number): number => {
  return Math.ceil(rawBytes / 3) * 4 + INLINE_PART_JSON_OVERHEAD_BYTES;
};

const estimateTextPayloadBytes = (rawBytes: number): number => {
  return rawBytes + INLINE_PART_JSON_OVERHEAD_BYTES;
};

const getEstimatedInlinePayloadBytes = (file: File, appSettings: AppSettings): number => {
  const isServerCodeExecutionEnabled = !!appSettings.isCodeExecutionEnabled && !appSettings.isLocalPythonEnabled;
  const textLike = isTextFile(file);

  if (textLike && !isServerCodeExecutionEnabled) {
    return estimateTextPayloadBytes(file.size);
  }

  return estimateBase64PayloadBytes(file.size);
};

export const getUploadLifecycleForGeminiState = (
  state: string | null | undefined,
): Pick<UploadedFile, 'uploadState' | 'isProcessing'> => {
  if (state === 'ACTIVE') {
    return { uploadState: 'active', isProcessing: false };
  }

  if (state === 'FAILED') {
    return { uploadState: 'failed', isProcessing: false };
  }

  // Gemini can omit state immediately after upload/get; keep polling until it settles.
  return { uploadState: 'processing_api', isProcessing: true };
};

export const shouldUseFileApi = (file: File, appSettings: AppSettings): boolean => {
  const effectiveMimeType = getEffectiveMimeType(file);
  if (!ALL_SUPPORTED_MIME_TYPES.includes(effectiveMimeType)) return false;
  const isServerCodeExecutionEnabled = !!appSettings.isCodeExecutionEnabled && !appSettings.isLocalPythonEnabled;
  const isTextLike = isTextFile(file);

  const userPrefersFileApi = SUPPORTED_IMAGE_MIME_TYPES.includes(effectiveMimeType)
    ? appSettings.filesApiConfig.images
    : SUPPORTED_PDF_MIME_TYPES.includes(effectiveMimeType)
      ? appSettings.filesApiConfig.pdfs
      : SUPPORTED_AUDIO_MIME_TYPES.includes(effectiveMimeType)
        ? appSettings.filesApiConfig.audio
        : SUPPORTED_VIDEO_MIME_TYPES.includes(effectiveMimeType)
          ? appSettings.filesApiConfig.video
          : appSettings.filesApiConfig.text;

  const inlineLimitBytes = SUPPORTED_PDF_MIME_TYPES.includes(effectiveMimeType)
    ? INLINE_MAX_PDF_PAYLOAD_BYTES
    : isServerCodeExecutionEnabled && isTextLike
      ? INLINE_MAX_CODE_EXECUTION_TEXT_PAYLOAD_BYTES
      : INLINE_MAX_REQUEST_PAYLOAD_BYTES;

  return userPrefersFileApi || getEstimatedInlinePayloadBytes(file, appSettings) > inlineLimitBytes;
};

export const getFilesRequiringFileApi = (files: File[], appSettings: AppSettings): Set<File> => {
  const filesRequiringApi = new Set<File>();
  const inlineCandidates: File[] = [];
  let inlinePayloadBytes = 0;

  for (const file of files) {
    const effectiveMimeType = getEffectiveMimeType(file);
    if (!ALL_SUPPORTED_MIME_TYPES.includes(effectiveMimeType)) continue;

    if (shouldUseFileApi(file, appSettings)) {
      filesRequiringApi.add(file);
      continue;
    }

    inlineCandidates.push(file);
    inlinePayloadBytes += getEstimatedInlinePayloadBytes(file, appSettings);
  }

  if (inlinePayloadBytes > INLINE_MAX_REQUEST_PAYLOAD_BYTES) {
    inlineCandidates.forEach((file) => filesRequiringApi.add(file));
  }

  return filesRequiringApi;
};

export const checkBatchNeedsApiKey = (files: File[], appSettings: AppSettings): boolean => {
  return getFilesRequiringFileApi(files, appSettings).size > 0;
};

interface FileUploadPreflightResult {
  filesToUpload: File[];
  notice: string | null;
}

export const buildFileUploadPreflight = (
  files: File[],
  _appSettings: AppSettings,
  existingFiles: Array<Pick<UploadedFile, 'name' | 'size'>> = [],
  t: Translator = getTranslator('en'),
): FileUploadPreflightResult => {
  const seenSignatures = new Set(existingFiles.map(getFileSignature));
  const filesToUpload: File[] = [];
  const duplicateNames: string[] = [];
  const unsupportedNames: string[] = [];

  for (const file of files) {
    const signature = getFileSignature(file);
    if (seenSignatures.has(signature)) {
      duplicateNames.push(file.name);
      continue;
    }

    seenSignatures.add(signature);
    filesToUpload.push(file);

    const effectiveMimeType = getEffectiveMimeType(file);
    if (!ALL_SUPPORTED_MIME_TYPES.includes(effectiveMimeType)) {
      unsupportedNames.push(file.name);
    }
  }

  const noticeParts: string[] = [];
  if (duplicateNames.length > 0) {
    noticeParts.push(t('upload_skipped_duplicates').replace('{filenames}', duplicateNames.join(', ')));
  }

  if (unsupportedNames.length > 0) {
    noticeParts.push(t('upload_unsupported_types').replace('{filenames}', unsupportedNames.join(', ')));
  }

  return {
    filesToUpload,
    notice: noticeParts.length > 0 ? noticeParts.join(' ') : null,
  };
};
