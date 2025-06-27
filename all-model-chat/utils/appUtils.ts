import { ChatMessage, ContentPart, UploadedFile, ChatHistoryItem } from '../types';
import { ThemeColors } from '../constants/themeConstants';
import { ALL_SUPPORTED_MIME_TYPES } from '../constants/fileConstants';

export const translations = {
    // Settings Modal
    settingsTitle: { en: 'App Settings', zh: '应用设置' },
    settingsApiConfig: { en: 'API Configuration', zh: 'API 配置' },
    settingsUseCustomApi: { en: 'Use Custom API Configuration', zh: '使用自定义 API 配置' },
    settingsApiKey: { en: 'Gemini API Key(s)', zh: 'Gemini API 密钥' },
    settingsApiKeyHelpText: { en: 'You can enter multiple keys, one per line. A random key will be used for each new chat session.', zh: '您可以输入多个密钥，每行一个。每个新聊天会话将随机使用一个密钥。' },
    settingsApiUrl: { en: 'Gemini API URL (Optional)', zh: 'Gemini API URL (可选)' },
    settingsAppearance: { en: 'Appearance', zh: '外观' },
    settingsTheme: { en: 'Theme (Global)', zh: '主题 (全局)' },
    settingsFontSize: { en: 'Base Font Size', zh: '基础字号' },
    settingsLanguage: { en: 'Language', zh: '语言' },
    settingsLanguageSystem: { en: 'System Default', zh: '跟随系统' },
    settingsLanguageEn: { en: 'English', zh: 'English' },
    settingsLanguageZh: { en: 'Chinese', zh: '中文' },
    settingsChatBehavior: { en: 'Chat Behavior (for New Chats)', zh: '聊天行为 (用于新对话)' },
    settingsModel: { en: 'AI Model', zh: 'AI 模型' },
    settingsTtsVoice: { en: 'TTS Voice', zh: 'TTS 语音' },
    settingsSystemPrompt: { en: 'System Prompt', zh: '系统提示' },
    settingsTemperature: { en: 'Temperature', zh: '温度' },
    settingsTopP: { en: 'Top P', zh: 'Top P' },
    settingsShowThoughts: { en: "Show Assistant's Thoughts", zh: '显示助手思考过程' },
    settingsReset: { en: 'Reset', zh: '重置' },
    settingsClearCache: { en: 'Clear Cache', zh: '清除缓存' },
    settingsCancel: { en: 'Cancel', zh: '取消' },
    settingsSave: { en: 'Save', zh: '保存' },

    // ChatInput
    chatInputPlaceholder: { en: 'Ask anything...', zh: '询问任何问题' },
    
    // Header
    headerTitle: { en: 'All Model Chat', zh: 'All Model Chat' },
    headerNewChat: { en: 'New Chat', zh: '新对话' },
    headerStream: { en: 'Stream', zh: '流式' },
};

export const getTranslator = (lang: 'en' | 'zh') => (key: keyof typeof translations, fallback?: string): string => {
    return translations[key]?.[lang] ?? fallback ?? translations[key]?.['en'] ?? key;
};

export const generateUniqueId = () => `chat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const generateSessionTitle = (messages: ChatMessage[]): string => {
    const firstUserMessage = messages.find(msg => msg.role === 'user' && msg.content.trim() !== '');
    if (firstUserMessage) {
      return firstUserMessage.content.split(/\s+/).slice(0, 7).join(' ') + (firstUserMessage.content.split(/\s+/).length > 7 ? '...' : '');
    }
    const firstModelMessage = messages.find(msg => msg.role === 'model' && msg.content.trim() !== '');
     if (firstModelMessage) {
      return "Model: " + firstModelMessage.content.split(/\s+/).slice(0, 5).join(' ') + (firstModelMessage.content.split(/\s+/).length > 5 ? '...' : '');
    }
    const firstFile = messages.find(msg => msg.files && msg.files.length > 0)?.files?.[0];
    if (firstFile) {
        return `Chat with ${firstFile.name}`;
    }
    return 'New Chat';
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

export const buildContentParts = (text: string, files: UploadedFile[] | undefined): ContentPart[] => {
  const dataParts: ContentPart[] = [];

  if (files) {
    files.forEach(file => {
      // Only include successfully uploaded files with a fileUri
      if (!file.isProcessing && !file.error && file.fileUri && file.uploadState === 'active' && ALL_SUPPORTED_MIME_TYPES.includes(file.type)) {
        dataParts.push({ fileData: { mimeType: file.type, fileUri: file.fileUri } });
      }
    });
  }

  const userTypedText = text.trim();
  const contentPartsResult: ContentPart[] = [];

  if (userTypedText) {
    contentPartsResult.push({ text: userTypedText });
  }
  contentPartsResult.push(...dataParts);

  return contentPartsResult;
};

export const createChatHistoryForApi = (msgs: ChatMessage[]): ChatHistoryItem[] => {
    return msgs
      .filter(msg => msg.role === 'user' || msg.role === 'model')
      .map(msg => {
        let apiParts: ContentPart[];
        if (msg.role === 'user') {
          apiParts = buildContentParts(msg.content, msg.files);
        } else {
          apiParts = [{ text: msg.content || "" }];
        }
        return { role: msg.role as 'user' | 'model', parts: apiParts };
      });
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