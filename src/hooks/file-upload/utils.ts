

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

export const LARGE_FILE_THRESHOLD = 19 * 1024 * 1024; // 19MB margin for 20MB limit
export const FILES_API_TOTAL_REQUEST_THRESHOLD = 100 * 1024 * 1024;
export const INLINE_PDF_MAX_BYTES = 50 * 1024 * 1024;

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

    const exceedsPdfInlineLimit = SUPPORTED_PDF_MIME_TYPES.includes(effectiveMimeType) && file.size > INLINE_PDF_MAX_BYTES;
    const exceedsTotalRequestLimitByItself = file.size > FILES_API_TOTAL_REQUEST_THRESHOLD;

    return userPrefersFileApi || exceedsPdfInlineLimit || exceedsTotalRequestLimitByItself;
};

export const getFileApiUploadDecisions = (files: File[], appSettings: AppSettings): boolean[] => {
    const initialDecisions = files.map(file => shouldUseFileApi(file, appSettings));
    const inlinePayloadSize = files.reduce((total, file, index) => {
        if (initialDecisions[index]) return total;

        const effectiveMimeType = getEffectiveMimeType(file);
        if (!ALL_SUPPORTED_MIME_TYPES.includes(effectiveMimeType)) return total;

        return total + file.size;
    }, 0);

    if (inlinePayloadSize <= FILES_API_TOTAL_REQUEST_THRESHOLD) {
        return initialDecisions;
    }

    return files.map((file, index) => {
        if (initialDecisions[index]) return true;
        const effectiveMimeType = getEffectiveMimeType(file);
        return ALL_SUPPORTED_MIME_TYPES.includes(effectiveMimeType);
    });
};

export const checkBatchNeedsApiKey = (files: File[], appSettings: AppSettings): boolean => {
    return getFileApiUploadDecisions(files, appSettings).some(Boolean);
};
