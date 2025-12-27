export const SUPPORTED_GENERATED_MIME_TYPES = new Set([
    // Images
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    // Docs
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'text/plain',
    'application/json',
    'text/html',
    'text/xml',
    'text/markdown',
    'text/x-python',
    // Media
    'audio/wav',
    'audio/mp3',
    'video/mp4',
    // Other
    'application/zip',
    'application/x-zip-compressed',
    'application/x-7z-compressed',
    'application/octet-stream'
]);
