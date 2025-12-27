import { SUPPORTED_TEXT_MIME_TYPES, TEXT_BASED_EXTENSIONS, EXTENSION_TO_MIME } from '../../constants/fileConstants';

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