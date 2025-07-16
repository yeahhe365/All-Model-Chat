import { ThemeColors } from '../constants/themeConstants';

export const getResponsiveValue = <T>(mobileValue: T, desktopValue: T, breakpoint: number = 640): T => {
    if (typeof window !== 'undefined' && window.innerWidth < breakpoint) {
        return mobileValue;
    }
    return desktopValue;
};

export const generateThemeCssVariables = (colors: ThemeColors): string => {
  let css = ':root {\n';
  for (const [key, value] of Object.entries(colors)) {
    const cssVarName = `--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    css += `  ${cssVarName}: ${value};\n`;
  }
  css += `  --markdown-code-bg: ${colors.bgCodeBlock || colors.bgInput };\n`;
  css += `  --markdown-code-text: ${colors.textCode};\n`;
  css += `  --markdown-pre-bg: ${colors.bgCodeBlock || colors.bgSecondary};\n`;
  css += `  --markdown-link-text: ${colors.textLink};\n`;
  css += `  --markdown-blockquote-text: ${colors.textTertiary};\n`;
  css += `  --markdown-blockquote-border: ${colors.borderSecondary};\n`;
  css += `  --markdown-hr-bg: ${colors.borderSecondary};\n`;
  css += `  --markdown-table-border: ${colors.borderSecondary};\n`;
  css += '}';
  return css;
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

export const formatTimestamp = (timestamp: number, lang: 'en' | 'zh'): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);

  // Intl.RelativeTimeFormat expects a non-zero value.
  if (Math.abs(diffSeconds) < 1) {
    return new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }).format(0, 'second');
  }

  if (Math.abs(diffSeconds) < 60) {
    return new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }).format(-diffSeconds, 'second');
  }
  
  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }).format(-diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }).format(-diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
     return new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }).format(-diffDays, 'day');
  }
  
  return date.toLocaleDateString(lang, { month: 'short', day: 'numeric' });
};
