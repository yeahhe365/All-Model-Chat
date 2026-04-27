import { getConfiguredApiClient } from '../apiClient';
import { logService } from '../../logService';

const SCHEMA_TYPE = {
  OBJECT: 'OBJECT',
  ARRAY: 'ARRAY',
  STRING: 'STRING',
} as const;

type StructuredTextContent = Array<{
  role: 'user';
  parts: Array<{ text: string }>;
}>;

const buildTranslationContents = (text: string, targetLanguage: string): StructuredTextContent => [
  {
    role: 'user',
    parts: [
      {
        text: `Translate the following user text to ${targetLanguage}. Only return the translated text, without any additional explanation or formatting.`,
      },
      { text: 'User text to translate:' },
      { text },
    ],
  },
];

const buildSuggestionContents = (
  userContent: string,
  modelContent: string,
  language: 'en' | 'zh',
  fallback = false,
): StructuredTextContent => {
  const instruction =
    language === 'zh'
      ? `作为对话专家，请基于后续独立内容片段中的对话上下文，预测用户接下来最可能发送的 3 条简短回复。

规则：
1. 如果助手最后在提问，建议必须是针对该问题的回答。
2. 建议应简练（20字以内），涵盖不同角度（如：追问细节、请求示例、或提出质疑）。
3. 语气自然，符合人类对话习惯。`
      : `As a conversation expert, predict the 3 most likely short follow-up messages the USER would send based on the conversation context in the following separate content parts.`;

  return [
    {
      role: 'user',
      parts: [
        {
          text: fallback
            ? `${instruction}\n\nReturn the three suggestions as a numbered list, one per line. Do not include any other text or formatting.`
            : instruction,
        },
        { text: language === 'zh' ? '用户上一条消息:' : 'USER message:' },
        { text: userContent },
        { text: language === 'zh' ? '助手上一条回复:' : 'ASSISTANT message:' },
        { text: modelContent },
      ],
    },
  ];
};

const buildTitleContents = (
  userContent: string,
  modelContent: string,
  language: 'en' | 'zh',
): StructuredTextContent => [
  {
    role: 'user',
    parts: [
      {
        text:
          language === 'zh'
            ? '根据后续独立内容片段中的对话，创建一个非常简短、简洁的标题（最多4-6个词）。不要使用引号或任何其他格式。只返回标题文本。'
            : 'Based on the conversation in the following separate content parts, create a very short, concise title (4-6 words max). Do not use quotes or any other formatting. Just return the text of the title.',
      },
      { text: language === 'zh' ? '用户消息:' : 'USER message:' },
      { text: userContent },
      { text: language === 'zh' ? '助手消息:' : 'ASSISTANT message:' },
      { text: modelContent },
    ],
  },
];

export const translateTextApi = async (
  apiKey: string,
  text: string,
  targetLanguage: string = 'English',
): Promise<string> => {
  logService.info(`Translating text to ${targetLanguage}...`);
  const contents = buildTranslationContents(text, targetLanguage);

  try {
    const ai = await getConfiguredApiClient(apiKey);
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents,
      config: {
        temperature: 0.1,
        topP: 0.95,
        thinkingConfig: { thinkingBudget: -1 },
      },
    });

    const translatedText = response.text?.trim();
    if (translatedText) {
      return translatedText;
    } else {
      throw new Error('Translation failed. The model returned an empty response.');
    }
  } catch (error) {
    logService.error('Error during text translation:', error);
    throw error;
  }
};

export const generateSuggestionsApi = async (
  apiKey: string,
  userContent: string,
  modelContent: string,
  language: 'en' | 'zh',
): Promise<string[]> => {
  logService.info(`Generating suggestions in ${language}...`);
  const contents = buildSuggestionContents(userContent, modelContent, language);

  try {
    const ai = await getConfiguredApiClient(apiKey);
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents,
      config: {
        thinkingConfig: { thinkingBudget: -1 }, // auto
        temperature: 0.8,
        topP: 0.95,
        responseMimeType: 'application/json',
        responseSchema: {
          type: SCHEMA_TYPE.OBJECT,
          properties: {
            suggestions: {
              type: SCHEMA_TYPE.ARRAY,
              items: {
                type: SCHEMA_TYPE.STRING,
                description: 'A short, relevant suggested reply or follow-up question.',
              },
              description: 'An array of exactly three suggested replies.',
            },
          },
        },
      },
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) {
      throw new Error('Suggestions generation returned an empty response.');
    }
    const parsed = JSON.parse(jsonStr);
    if (
      parsed.suggestions &&
      Array.isArray(parsed.suggestions) &&
      parsed.suggestions.every((suggestion: unknown) => typeof suggestion === 'string')
    ) {
      return parsed.suggestions.slice(0, 3); // Ensure only 3
    } else {
      throw new Error('Suggestions generation returned an invalid format.');
    }
  } catch (error) {
    logService.error('Error during suggestions generation:', error);
    // Fallback to a non-JSON approach in case the model struggles with the schema
    try {
      const ai = await getConfiguredApiClient(apiKey); // Re-get client
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: buildSuggestionContents(userContent, modelContent, language, true),
        config: {
          thinkingConfig: { thinkingBudget: -1 },
          temperature: 0.8,
          topP: 0.95,
        },
      });
      const fallbackText = fallbackResponse.text?.trim();
      if (fallbackText) {
        return fallbackText
          .split('\n')
          .map((s) => s.replace(/^\d+\.\s*/, '').trim())
          .filter(Boolean)
          .slice(0, 3);
      }
    } catch (fallbackError) {
      logService.error('Fallback suggestions generation also failed:', fallbackError);
    }
    return []; // Return empty array on failure
  }
};

export const generateTitleApi = async (
  apiKey: string,
  userContent: string,
  modelContent: string,
  language: 'en' | 'zh',
): Promise<string> => {
  logService.info(`Generating title in ${language}...`);
  const contents = buildTitleContents(userContent, modelContent, language);

  try {
    const ai = await getConfiguredApiClient(apiKey);
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents,
      config: {
        thinkingConfig: { thinkingBudget: -1 },
        temperature: 0.3,
        topP: 0.9,
      },
    });

    const titleText = response.text?.trim();
    if (titleText) {
      // Clean up the title: remove quotes, trim whitespace
      let title = titleText;
      if ((title.startsWith('"') && title.endsWith('"')) || (title.startsWith("'") && title.endsWith("'"))) {
        title = title.substring(1, title.length - 1);
      }
      return title;
    } else {
      throw new Error('Title generation failed. The model returned an empty response.');
    }
  } catch (error) {
    logService.error('Error during title generation:', error);
    throw error;
  }
};
