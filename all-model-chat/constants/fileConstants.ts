export const SUPPORTED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
export const SUPPORTED_TEXT_MIME_TYPES = [
  'text/html',
  'text/plain',
  'application/javascript',
  'text/javascript', 
  'text/css',
  'application/json',
  'application/xml',
  'text/xml', 
  'text/markdown',
];
export const SUPPORTED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/mpeg',
  'video/webm',
  'video/ogg',
  'video/quicktime', 
  'video/x-msvideo', 
  'video/x-matroska', 
  'video/flv',
];
export const SUPPORTED_AUDIO_MIME_TYPES = [
  'audio/mpeg', 
  'audio/ogg',
  'audio/wav',
  'audio/aac',
  'audio/webm', 
  'audio/flac',
  'audio/mp4', 
];
export const SUPPORTED_PDF_MIME_TYPES = ['application/pdf'];

export const ALL_SUPPORTED_MIME_TYPES = [
    ...SUPPORTED_IMAGE_MIME_TYPES, 
    ...SUPPORTED_TEXT_MIME_TYPES,
    ...SUPPORTED_VIDEO_MIME_TYPES,
    ...SUPPORTED_AUDIO_MIME_TYPES,
    ...SUPPORTED_PDF_MIME_TYPES,
];
