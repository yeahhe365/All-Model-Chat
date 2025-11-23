
import { ThemeColors } from '../constants/themeConstants';
import { AppSettings } from '../types';
import { Theme, AVAILABLE_THEMES } from '../constants/themeConstants';

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
