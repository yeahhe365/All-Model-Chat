import { ThinkingLevel, type GenerateContentConfig, type ThinkingConfig } from '@google/genai';
import { executeConfiguredApiRequest } from '@/services/api/apiExecutor';
import { logService } from '@/services/logService';
import type { Part } from '@google/genai';
import { blobToBase64 } from '@/utils/fileHelpers';
import { calculateTokenStats, getModelCapabilities } from '@/utils/modelHelpers';
import { buildExactPricingFromUsageMetadata } from '@/utils/usagePricingTelemetry';
import { AVAILABLE_TTS_VOICES } from '@/constants/voiceOptions';

const SUPPORTED_TTS_VOICE_NAMES = new Set(AVAILABLE_TTS_VOICES.map((voice) => voice.id));
const SPEAKER_VOICES_HEADER_REGEX = /^#{1,6}\s*SPEAKER VOICES(?:\s*\(.*\))?\s*$/i;
const MARKDOWN_HEADER_REGEX = /^#{1,6}\s+\S/;
const SPEAKER_VOICE_LINE_REGEX = /^(?:[-*]\s*)?([^:]+?)\s*:\s*([A-Za-z][\w-]*)\s*$/;

const buildSingleSpeakerSpeechConfig = (voice: string) => ({
  voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
});

const extractMultiSpeakerVoiceConfig = (text: string) => {
  const lines = text.split('\n');
  const speakerVoiceConfigs: Array<{
    speaker: string;
    voiceConfig: { prebuiltVoiceConfig: { voiceName: string } };
  }> = [];
  const seenSpeakers = new Set<string>();

  for (let index = 0; index < lines.length; index++) {
    if (!SPEAKER_VOICES_HEADER_REGEX.test(lines[index].trim())) {
      continue;
    }

    for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex++) {
      const line = lines[nextIndex].trim();

      if (!line) {
        continue;
      }

      if (MARKDOWN_HEADER_REGEX.test(line)) {
        break;
      }

      const match = line.match(SPEAKER_VOICE_LINE_REGEX);
      if (!match) {
        continue;
      }

      const speaker = match[1].trim();
      const voiceName = match[2].trim();

      if (!speaker || seenSpeakers.has(speaker) || !SUPPORTED_TTS_VOICE_NAMES.has(voiceName)) {
        continue;
      }

      speakerVoiceConfigs.push({
        speaker,
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      });
      seenSpeakers.add(speaker);

      if (speakerVoiceConfigs.length > 2) {
        logService.warn('Ignoring multi-speaker TTS config because more than two speakers were declared.');
        return null;
      }
    }

    return speakerVoiceConfigs.length === 2 ? { speakerVoiceConfigs } : null;
  }

  return null;
};

export const generateSpeechApi = async (
  apiKey: string,
  modelId: string,
  text: string,
  voice: string,
  abortSignal: AbortSignal,
): Promise<string> => {
  if (!text.trim()) {
    throw new Error('TTS input text cannot be empty.');
  }

  return executeConfiguredApiRequest({
    apiKey,
    label: `Generating speech with model ${modelId}`,
    errorLabel: `Failed to generate speech with model ${modelId}:`,
    abortSignal,
    run: async ({ client: ai }) => {
      logService.debug('TTS request payload details', { textLength: text.length, voice });
      const multiSpeakerVoiceConfig = extractMultiSpeakerVoiceConfig(text);
      const response = await ai.models.generateContent({
        model: modelId,
        // TTS models do not support chat history roles, just plain content parts
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: multiSpeakerVoiceConfig ? { multiSpeakerVoiceConfig } : buildSingleSpeakerSpeechConfig(voice),
        },
      });

      if (abortSignal.aborted) {
        const abortError = new Error('Speech generation cancelled by user.');
        abortError.name = 'AbortError';
        throw abortError;
      }

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (typeof audioData === 'string' && audioData.length > 0) {
        if (response.usageMetadata) {
          const {
            promptTokens,
            cachedPromptTokens,
            completionTokens,
            thoughtTokens,
            toolUsePromptTokens,
            totalTokens,
          } = calculateTokenStats(response.usageMetadata);
          logService.recordTokenUsage(
            modelId,
            {
              promptTokens,
              cachedPromptTokens,
              completionTokens,
              thoughtTokens,
              toolUsePromptTokens,
              totalTokens,
            },
            buildExactPricingFromUsageMetadata('tts', response.usageMetadata),
          );
        }
        return audioData;
      }

      const candidate = response.candidates?.[0];
      if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
        throw new Error(`TTS generation failed with reason: ${candidate.finishReason}`);
      }

      logService.error('TTS response did not contain expected audio data structure:', { response });

      // Fallback to checking text error if any, though unlikely with AUDIO modality
      const textError = response.text;
      if (textError) {
        throw new Error(`TTS generation failed: ${textError}`);
      }

      throw new Error('No audio data found in TTS response.');
    },
  });
};

export const transcribeAudioApi = async (apiKey: string, audioFile: File, modelId: string): Promise<string> => {
  return executeConfiguredApiRequest({
    apiKey,
    label: `Transcribing audio with model ${modelId}`,
    errorLabel: 'Error during audio transcription:',
    run: async ({ client: ai }) => {
      logService.debug('Audio transcription request file details', { fileName: audioFile.name, size: audioFile.size });
      // Use blobToBase64 which is efficient and handles Blobs/Files
      const audioBase64 = await blobToBase64(audioFile);

      const audioPart: Part = {
        inlineData: {
          mimeType: audioFile.type,
          data: audioBase64,
        },
      };

      const textPart: Part = {
        text: 'Transcribe voice input exactly.',
      };

      const config: GenerateContentConfig = {
        systemInstruction:
          '你是语音输入转写器，只做 ASR。请将音频中实际说出的语音转写为将插入聊天输入框的纯文本。保持原始语言和混合语言，不要翻译、总结、回答、解释或描述音频。尽量保留原词、语气词、代码、命令、URL、邮箱、数字、单位和专有名词；不要补写音频中不存在的内容。可以在不改变措辞和原意的前提下补充基础标点。若没有可辨识语音，请返回空字符串。',
      };

      const thinkingConfig: ThinkingConfig = {};

      const capabilities = getModelCapabilities(modelId);
      if (capabilities.isGemini3) {
        thinkingConfig.includeThoughts = false;
        thinkingConfig.thinkingLevel = capabilities.isFlashModel ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW;
      } else if (capabilities.isFlashModel) {
        thinkingConfig.thinkingBudget = 512;
      } else {
        thinkingConfig.thinkingBudget = 0;
      }

      config.thinkingConfig = thinkingConfig;

      const response = await ai.models.generateContent({
        model: modelId,
        contents: { parts: [textPart, audioPart] },
        config,
      });

      if (typeof response.text === 'string') {
        if (response.usageMetadata) {
          const {
            promptTokens,
            cachedPromptTokens,
            completionTokens,
            thoughtTokens,
            toolUsePromptTokens,
            totalTokens,
          } = calculateTokenStats(response.usageMetadata);
          logService.recordTokenUsage(
            modelId,
            {
              promptTokens,
              cachedPromptTokens,
              completionTokens,
              thoughtTokens,
              toolUsePromptTokens,
              totalTokens,
            },
            buildExactPricingFromUsageMetadata('transcription', response.usageMetadata),
          );
        }
        return response.text;
      } else {
        const safetyFeedback = response.candidates?.[0]?.finishReason;
        if (safetyFeedback && safetyFeedback !== 'STOP') {
          throw new Error(`Transcription failed due to safety settings: ${safetyFeedback}`);
        }
        throw new Error('Transcription failed. The model returned an empty response.');
      }
    },
  });
};
