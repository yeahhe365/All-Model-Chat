
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
  // Additional common text-based file types
  'text/csv',
  'application/rtf',
  'text/rtf',
  'text/x-python',
  'application/x-python-code',
  'text/x-java-source',
  'text/x-script.sh',
  'application/x-sh',
  'text/yaml',
  'application/yaml',
  'text/x-c',
  'text/x-csrc',
  'text/x-c++src',
  'text/x-sql',
  'application/sql',
  'application/x-httpd-php',
  'text/x-ruby',
  'text/x-perl',
  'application/vnd.ms-powershell',
  'text/x-go',
  'text/x-scala',
  'text/x-swift',
];
export const SUPPORTED_AUDIO_MIME_TYPES = [
  'audio/mpeg', 
  'audio/mp3', // Added for broader compatibility
  'audio/ogg',
  'audio/wav',
  'audio/aac',
  'audio/webm', 
  'audio/flac',
  'audio/mp4',
  'audio/aiff',
  'audio/x-aiff',
];
export const SUPPORTED_PDF_MIME_TYPES = ['application/pdf'];

export const SUPPORTED_VIDEO_MIME_TYPES = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/avi',
    'video/x-flv',
    'video/mpg',
    'video/mpegs',
    'video/webm',
    'video/wmv',
    'video/x-ms-wmv',
    'video/3gpp',
];

export const SUPPORTED_SPREADSHEET_MIME_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.oasis.opendocument.spreadsheet',
    'text/csv',
];

export const SUPPORTED_DOC_MIME_TYPES = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
];

export const TEXT_BASED_EXTENSIONS = [
  '.txt', '.md', '.markdown', '.json', '.xml', '.csv', '.tsv', '.log', '.rtf',
  '.js', '.ts', '.jsx', '.tsx', '.html', '.htm', '.css', '.scss', '.less',
  '.py', '.rb', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.php',
  '.sh', '.bash', '.ps1', '.bat', '.zsh',
  '.yaml', '.yml', '.ini', '.cfg', '.toml',
  '.sql', '.sub', '.srt', '.vtt'
];

export const ALL_SUPPORTED_MIME_TYPES = [
    ...SUPPORTED_IMAGE_MIME_TYPES, 
    ...SUPPORTED_TEXT_MIME_TYPES,
    ...SUPPORTED_AUDIO_MIME_TYPES,
    ...SUPPORTED_PDF_MIME_TYPES,
    ...SUPPORTED_VIDEO_MIME_TYPES,
    ...SUPPORTED_SPREADSHEET_MIME_TYPES,
    ...SUPPORTED_DOC_MIME_TYPES,
];

export const EXTENSION_TO_MIME: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/avi',
    '.wmv': 'video/x-ms-wmv',
    '.mpg': 'video/mpeg',
    '.mpeg': 'video/mpeg',
    '.webm': 'video/webm',
    '.flv': 'video/x-flv',
    '.3gp': 'video/3gpp',
    '.pdf': 'application/pdf',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.aac': 'audio/aac',
    '.ogg': 'audio/ogg',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
};

// Centralized map for generating file extensions from MIME types
// Used for file generation downloads and stream processing
export const MIME_TO_EXTENSION_MAP: Record<string, string> = {
    'application/pdf': '.pdf',
    'text/csv': '.csv',
    'text/plain': '.txt',
    'application/json': '.json',
    'text/html': '.html',
    'text/xml': '.xml',
    'text/markdown': '.md',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/zip': '.zip',
    'application/x-zip-compressed': '.zip',
    'application/x-7z-compressed': '.7z',
    'application/x-tar': '.tar',
    'application/gzip': '.gz',
    'application/octet-stream': '.bin',
    'text/x-python': '.py',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'video/mp4': '.mp4',
};
