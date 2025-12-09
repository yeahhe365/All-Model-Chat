
import React from 'react';
import { ThemeColors } from '../constants/themeConstants';
import { AppSettings } from '../types';
import { Theme, AVAILABLE_THEMES } from '../constants/themeConstants';
import { 
  SUPPORTED_IMAGE_MIME_TYPES, 
  SUPPORTED_AUDIO_MIME_TYPES, 
  SUPPORTED_VIDEO_MIME_TYPES, 
  SUPPORTED_PDF_MIME_TYPES,
  SUPPORTED_SPREADSHEET_MIME_TYPES
} from '../constants/fileConstants';
import { 
  ImageIcon, 
  FileAudio, 
  FileVideo, 
  Youtube, 
  FileText, 
  Presentation, 
  FileSpreadsheet, 
  Archive, 
  FileCode2, 
  AlertTriangle 
} from 'lucide-react';

export const generateThemeCssVariables = (colors: ThemeColors): string => {
  let css = ':root {\n';
  for (const [key, value] of Object.entries(colors)) {
    const cssVarName = `--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    css += `  ${cssVarName}: ${value};\n`;
  }
  css += '}';
  return css;
};

export const applyThemeToDocument = (doc: Document, theme: Theme, settings: AppSettings) => {
  const themeVariablesStyleTag = doc.getElementById('theme-variables');
  if (themeVariablesStyleTag) {
    themeVariablesStyleTag.innerHTML = generateThemeCssVariables(theme.colors);
  }

  const bodyClassList = doc.body.classList;
  AVAILABLE_THEMES.forEach(t => bodyClassList.remove(`theme-${t.id}`));
  bodyClassList.add(`theme-${theme.id}`, 'antialiased');

  const markdownDarkTheme = doc.getElementById('markdown-dark-theme') as HTMLLinkElement;
  const markdownLightTheme = doc.getElementById('markdown-light-theme') as HTMLLinkElement;
  const hljsDarkTheme = doc.getElementById('hljs-dark-theme') as HTMLLinkElement;
  const hljsLightTheme = doc.getElementById('hljs-light-theme') as HTMLLinkElement;

  const isDark = theme.id === 'onyx';

  if (markdownDarkTheme) markdownDarkTheme.disabled = !isDark;
  if (markdownLightTheme) markdownLightTheme.disabled = isDark;
  if (hljsDarkTheme) hljsDarkTheme.disabled = !isDark;
  if (hljsLightTheme) hljsLightTheme.disabled = isDark;

  doc.body.style.fontSize = `${settings.baseFontSize}px`;
};

export function pcmBase64ToWavUrl(
  base64: string,
  sampleRate = 24_000,
  numChannels = 1,
): string {
  const pcm = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  // Write WAV header
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const wav = new ArrayBuffer(44 + pcm.length);
  const dv = new DataView(wav);

  let p = 0;
  const writeStr = (s: string) => [...s].forEach(ch => dv.setUint8(p++, ch.charCodeAt(0)));

  writeStr('RIFF');
  dv.setUint32(p, 36 + pcm.length, true); p += 4;
  writeStr('WAVEfmt ');
  dv.setUint32(p, 16, true); p += 4;        // fmt length
  dv.setUint16(p, 1, true);  p += 2;        // PCM
  dv.setUint16(p, numChannels, true); p += 2;
  dv.setUint32(p, sampleRate, true); p += 4;
  dv.setUint32(p, sampleRate * blockAlign, true); p += 4;
  dv.setUint16(p, blockAlign, true); p += 2;
  dv.setUint16(p, bytesPerSample * 8, true); p += 2;
  writeStr('data');
  dv.setUint32(p, pcm.length, true); p += 4;

  new Uint8Array(wav, 44).set(pcm);
  return URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
}

export const showNotification = async (title: string, options?: NotificationOptions) => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notification');
    return;
  }

  const show = () => {
    // Use a tag to prevent multiple notifications from stacking up.
    // The 'renotify' property ensures that even with the same tag, the user is alerted.
    const notification = new Notification(title, { ...options, tag: 'all-model-chat-response', renotify: true });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto-close notification after a few seconds
    setTimeout(() => {
      notification.close();
    }, 7000);
  };

  if (Notification.permission === 'granted') {
    show();
  } else if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      show();
    }
  }
};

export type FileCategory = 'image' | 'audio' | 'video' | 'pdf' | 'youtube' | 'code' | 'spreadsheet' | 'doc' | 'presentation' | 'archive' | 'error';

export const getFileTypeCategory = (mimeType: string, error?: string): FileCategory => {
    if (error) return 'error';
    if (mimeType === 'video/youtube-link') return 'youtube';
    if (SUPPORTED_AUDIO_MIME_TYPES.includes(mimeType)) return 'audio';
    if (SUPPORTED_VIDEO_MIME_TYPES.includes(mimeType)) return 'video';
    if (SUPPORTED_PDF_MIME_TYPES.includes(mimeType)) return 'pdf';
    if (SUPPORTED_IMAGE_MIME_TYPES.includes(mimeType) || mimeType === 'image/svg+xml') return 'image';
    if (SUPPORTED_SPREADSHEET_MIME_TYPES.includes(mimeType) || mimeType === 'text/csv' || mimeType === 'application/vnd.ms-excel') return 'spreadsheet';
    
    // Expanded mappings for code execution outputs
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/msword') return 'doc';
    if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || mimeType === 'application/vnd.ms-powerpoint') return 'presentation';
    if (mimeType === 'application/zip' || mimeType === 'application/x-zip-compressed' || mimeType === 'application/x-7z-compressed' || mimeType === 'application/x-tar' || mimeType === 'application/gzip') return 'archive';

    return 'code';
};

export const CATEGORY_STYLES: Record<FileCategory, { Icon: React.ElementType, colorClass: string, bgClass: string }> = {
    image: { Icon: ImageIcon, colorClass: "text-blue-500 dark:text-blue-400", bgClass: "bg-blue-500/10 dark:bg-blue-400/10" },
    audio: { Icon: FileAudio, colorClass: "text-purple-500 dark:text-purple-400", bgClass: "bg-purple-500/10 dark:bg-purple-400/10" },
    video: { Icon: FileVideo, colorClass: "text-pink-500 dark:text-pink-400", bgClass: "bg-pink-500/10 dark:bg-pink-400/10" },
    youtube: { Icon: Youtube, colorClass: "text-red-600 dark:text-red-500", bgClass: "bg-red-600/10 dark:bg-red-500/10" },
    pdf: { Icon: FileText, colorClass: "text-red-500 dark:text-red-400", bgClass: "bg-red-500/10 dark:bg-red-400/10" },
    doc: { Icon: FileText, colorClass: "text-blue-600 dark:text-blue-500", bgClass: "bg-blue-600/10 dark:bg-blue-500/10" },
    presentation: { Icon: Presentation, colorClass: "text-orange-600 dark:text-orange-500", bgClass: "bg-orange-600/10 dark:bg-orange-500/10" },
    spreadsheet: { Icon: FileSpreadsheet, colorClass: "text-emerald-600 dark:text-emerald-500", bgClass: "bg-emerald-600/10 dark:bg-emerald-500/10" },
    archive: { Icon: Archive, colorClass: "text-yellow-600 dark:text-yellow-500", bgClass: "bg-yellow-600/10 dark:bg-yellow-500/10" },
    code: { Icon: FileCode2, colorClass: "text-slate-500 dark:text-slate-400", bgClass: "bg-slate-500/10 dark:bg-slate-400/10" },
    error: { Icon: AlertTriangle, colorClass: "text-[var(--theme-text-danger)]", bgClass: "bg-[var(--theme-bg-danger)]/10" },
};

/**
 * Helper to recursively extract text from React children (handles string, array, elements)
 */
export const extractTextFromNode = (node: React.ReactNode): string => {
    if (!node) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(extractTextFromNode).join('');
    if (React.isValidElement(node)) return extractTextFromNode(node.props.children);
    return '';
};
