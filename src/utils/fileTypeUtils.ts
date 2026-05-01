import {
  SUPPORTED_AUDIO_MIME_TYPES,
  SUPPORTED_IMAGE_MIME_TYPES,
  SUPPORTED_PDF_MIME_TYPES,
  SUPPORTED_SPREADSHEET_MIME_TYPES,
  SUPPORTED_VIDEO_MIME_TYPES,
} from '../constants/fileConstants';

export type FileCategory =
  | 'image'
  | 'audio'
  | 'video'
  | 'pdf'
  | 'youtube'
  | 'code'
  | 'spreadsheet'
  | 'doc'
  | 'presentation'
  | 'archive'
  | 'error';

export interface FileKindInput {
  name?: string;
  type?: string;
  error?: string | null;
}

export interface FileKindFlags {
  category: FileCategory;
  isImage: boolean;
  isAudio: boolean;
  isVideo: boolean;
  isYoutube: boolean;
  isPdf: boolean;
  isInlineData: boolean;
  isTextFallback: boolean;
}

const normalizeMimeType = (mimeType?: string): string => (mimeType || '').trim().toLowerCase();

const normalizeFileName = (name?: string): string => (name || '').trim().toLowerCase();

export const isYoutubeMimeType = (mimeType?: string): boolean => normalizeMimeType(mimeType) === 'video/youtube-link';

export const isImageMimeType = (mimeType?: string): boolean => {
  const normalized = normalizeMimeType(mimeType);
  return normalized.startsWith('image/') || SUPPORTED_IMAGE_MIME_TYPES.includes(normalized);
};

export const isAudioMimeType = (mimeType?: string): boolean => {
  const normalized = normalizeMimeType(mimeType);
  return normalized.startsWith('audio/') || SUPPORTED_AUDIO_MIME_TYPES.includes(normalized);
};

export const isVideoMimeType = (mimeType?: string): boolean => {
  const normalized = normalizeMimeType(mimeType);
  return (
    !isYoutubeMimeType(normalized) &&
    (normalized.startsWith('video/') || SUPPORTED_VIDEO_MIME_TYPES.includes(normalized))
  );
};

export const isPdfMimeType = (mimeType?: string): boolean =>
  SUPPORTED_PDF_MIME_TYPES.includes(normalizeMimeType(mimeType));

export const isPdfFile = (file: FileKindInput): boolean =>
  isPdfMimeType(file.type) || normalizeFileName(file.name).endsWith('.pdf');

export const isInlineDataMimeType = (mimeType?: string): boolean =>
  isImageMimeType(mimeType) || isAudioMimeType(mimeType) || isVideoMimeType(mimeType) || isPdfMimeType(mimeType);

export const getFileTypeCategory = (mimeType: string, error?: string): FileCategory => {
  const normalized = normalizeMimeType(mimeType);

  if (error) return 'error';
  if (isYoutubeMimeType(normalized)) return 'youtube';
  if (isAudioMimeType(normalized)) return 'audio';
  if (isVideoMimeType(normalized)) return 'video';
  if (isPdfMimeType(normalized)) return 'pdf';
  if (isImageMimeType(normalized)) return 'image';
  if (
    SUPPORTED_SPREADSHEET_MIME_TYPES.includes(normalized) ||
    normalized === 'text/csv' ||
    normalized === 'application/vnd.ms-excel'
  )
    return 'spreadsheet';

  if (
    normalized === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    normalized === 'application/msword'
  )
    return 'doc';
  if (
    normalized === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    normalized === 'application/vnd.ms-powerpoint'
  )
    return 'presentation';
  if (
    normalized === 'application/zip' ||
    normalized === 'application/x-zip-compressed' ||
    normalized === 'application/x-7z-compressed' ||
    normalized === 'application/x-tar' ||
    normalized === 'application/gzip'
  )
    return 'archive';

  return 'code';
};

export const getFileKindFlags = (file: FileKindInput): FileKindFlags => {
  const category = getFileTypeCategory(file.type || '', file.error || undefined);
  const isPdf = category === 'pdf' || isPdfFile(file);
  const isYoutube = category === 'youtube';
  const isVideo = category === 'video';
  const isAudio = category === 'audio';
  const isImage = category === 'image';

  return {
    category,
    isImage,
    isAudio,
    isVideo,
    isYoutube,
    isPdf,
    isInlineData: isInlineDataMimeType(file.type),
    isTextFallback: !isImage && !isPdf && !isVideo && !isYoutube && !isAudio,
  };
};
