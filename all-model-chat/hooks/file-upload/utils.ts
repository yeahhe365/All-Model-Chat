import { 
    SUPPORTED_TEXT_MIME_TYPES, 
    TEXT_BASED_EXTENSIONS, 
    EXTENSION_TO_MIME,
    ALL_SUPPORTED_MIME_TYPES,
    SUPPORTED_IMAGE_MIME_TYPES,
    SUPPORTED_PDF_MIME_TYPES,
    SUPPORTED_AUDIO_MIME_TYPES,
    SUPPORTED_VIDEO_MIME_TYPES
} from '../../constants/fileConstants';
import { AppSettings } from '../../types';

export const LARGE_FILE_THRESHOLD = 19 * 1024 * 1024; // 19MB margin for 20MB limit

export const formatSpeed = (bytesPerSecond: number): string => {
    if (!isFinite(bytesPerSecond) || bytesPerSecond < 0) return '';
    if (bytesPerSecond < 1024) return `${Math.round(bytesPerSecond)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
};

export const getEffectiveMimeType = (file: File): string => {
    let effectiveMimeType = file.type;
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;

    // 1. Force text/plain for code/text extensions
    if (TEXT_BASED_EXTENSIONS.includes(fileExtension) || SUPPORTED_TEXT_MIME_TYPES.includes(file.type)) {
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

    let userPrefersFileApi = false;
    if (SUPPORTED_IMAGE_MIME_TYPES.includes(effectiveMimeType)) userPrefersFileApi = appSettings.filesApiConfig.images;
    else if (SUPPORTED_PDF_MIME_TYPES.includes(effectiveMimeType)) userPrefersFileApi = appSettings.filesApiConfig.pdfs;
    else if (SUPPORTED_AUDIO_MIME_TYPES.includes(effectiveMimeType)) userPrefersFileApi = appSettings.filesApiConfig.audio;
    else if (SUPPORTED_VIDEO_MIME_TYPES.includes(effectiveMimeType)) userPrefersFileApi = appSettings.filesApiConfig.video;
    else userPrefersFileApi = appSettings.filesApiConfig.text; // Fallback for text/code

    return userPrefersFileApi || file.size > LARGE_FILE_THRESHOLD;
};

export const checkBatchNeedsApiKey = (files: File[], appSettings: AppSettings): boolean => {
    return files.some(file => shouldUseFileApi(file, appSettings));
};
