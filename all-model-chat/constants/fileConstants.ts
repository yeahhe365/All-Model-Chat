
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
    'video/3gpp',
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
];