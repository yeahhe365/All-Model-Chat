

import { 
    EXTENSION_TO_MIME,
    ALL_SUPPORTED_MIME_TYPES,
    SUPPORTED_IMAGE_MIME_TYPES,
    SUPPORTED_PDF_MIME_TYPES,
    SUPPORTED_AUDIO_MIME_TYPES,
    SUPPORTED_VIDEO_MIME_TYPES
} from '../../constants/fileConstants';
import { AppSettings } from '../../types';
import { isTextFile } from '../../utils/appUtils';

const INLINE_MAX_REQUEST_BYTES = 100 * 1024 * 1024;
const INLINE_MAX_PDF_BYTES = 50 * 1024 * 1024;

export const formatSpeed = (bytesPerSecond: number): string => {
    if (!isFinite(bytesPerSecond) || bytesPerSecond < 0) return '';
    if (bytesPerSecond < 1024) return `${Math.round(bytesPerSecond)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
};

export const getEffectiveMimeType = (file: File): string => {
    const effectiveMimeType = file.type;
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;

    // 1. Force text/plain for code/text extensions
    if (isTextFile(file)) {
        return 'text/plain';
    }

    // 2. Fallback for missing MIME types based on extension
    if (!effectiveMimeType && EXTENSION_TO_MIME[fileExtension]) {
        return EXTENSION_TO_MIME[fileExtension];
    }

    return effectiveMimeType || 'application/octet-stream';
};

export const shouldUseFileApi = (file: File, appSettings: AppSettings): boolean => {
    const effectiveMimeType = getEffectiveMimeType(file);
    if (!ALL_SUPPORTED_MIME_TYPES.includes(effectiveMimeType)) return false;

    const userPrefersFileApi =
        SUPPORTED_IMAGE_MIME_TYPES.includes(effectiveMimeType) ? appSettings.filesApiConfig.images :
        SUPPORTED_PDF_MIME_TYPES.includes(effectiveMimeType) ? appSettings.filesApiConfig.pdfs :
        SUPPORTED_AUDIO_MIME_TYPES.includes(effectiveMimeType) ? appSettings.filesApiConfig.audio :
        SUPPORTED_VIDEO_MIME_TYPES.includes(effectiveMimeType) ? appSettings.filesApiConfig.video :
        appSettings.filesApiConfig.text;

    const inlineLimitBytes = SUPPORTED_PDF_MIME_TYPES.includes(effectiveMimeType)
        ? INLINE_MAX_PDF_BYTES
        : INLINE_MAX_REQUEST_BYTES;

    return userPrefersFileApi || file.size > inlineLimitBytes;
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
        inlinePayloadBytes += file.size;
    }

    if (inlinePayloadBytes > INLINE_MAX_REQUEST_BYTES) {
        inlineCandidates.forEach((file) => filesRequiringApi.add(file));
    }

    return filesRequiringApi;
};

export const checkBatchNeedsApiKey = (files: File[], appSettings: AppSettings): boolean => {
    return getFilesRequiringFileApi(files, appSettings).size > 0;
};
