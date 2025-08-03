// components/settings/ChatBehaviorSection.tsx (Refactored)
import React from 'react';
import { ModelOption } from '../../types';
import { Settings2 } from 'lucide-react';
import { getResponsiveValue } from '../../utils/appUtils';
import { ModelVoiceSettings } from './ModelVoiceSettings';
import { GenerationSettings } from './GenerationSettings';
import { FeatureFlags } from './FeatureFlags';

interface ChatBehaviorSectionProps {
  modelId: string;
  setModelId: (value: string) => void;
  isModelsLoading: boolean;
  modelsLoadingError: string | null;
  availableModels: ModelOption[];
  transcriptionModelId: string;
  setTranscriptionModelId: (value: string) => void;
  ttsVoice: string;
  setTtsVoice: (value: string) => void;
  systemInstruction: string;
  setSystemInstruction: (value: string) => void;
  temperature: number;
  setTemperature: (value: number) => void;
  topP: number;
  setTopP: (value: number) => void;
  showThoughts: boolean;
  setShowThoughts: (value: boolean) => void;
  thinkingBudget: number;
  setThinkingBudget: (value: number) => void;
  isStreamingEnabled: boolean;
  setIsStreamingEnabled: (value: boolean) => void;
  isTranscriptionThinkingEnabled: boolean;
  setIsTranscriptionThinkingEnabled: (value: boolean) => void;
  useFilesApiForImages: boolean;
  setUseFilesApiForImages: (value: boolean) => void;
  expandCodeBlocksByDefault: boolean;
  setExpandCodeBlocksByDefault: (value: boolean) => void;
  isAutoTitleEnabled: boolean;
  setIsAutoTitleEnabled: (value: boolean) => void;
  isMermaidRenderingEnabled: boolean;
  setIsMermaidRenderingEnabled: (value: boolean) => void;
  isGraphvizRenderingEnabled: boolean;
  setIsGraphvizRenderingEnabled: (value: boolean) => void;
  isCompletionNotificationEnabled: boolean;
  setIsCompletionNotificationEnabled: (value: boolean) => void;
  isSuggestionsEnabled: boolean;
  setIsSuggestionsEnabled: (value: boolean) => void;
  isAutoSendOnSuggestionClick: boolean;
  setIsAutoSendOnSuggestionClick: (value: boolean) => void;
  isAutoScrollOnSendEnabled?: boolean;
  setIsAutoScrollOnSendEnabled: (value: boolean) => void;
  t: (key: string) => string;
}

export const ChatBehaviorSection: React.FC<ChatBehaviorSectionProps> = (props) => {
  const { t } = props;
  const iconSize = getResponsiveValue(14, 16);

  return (
    <div className="space-y-4 p-3 sm:p-4 border border-[var(--theme-border-secondary)] rounded-lg bg-[var(--theme-bg-secondary)]">
      <h3 className="text-sm font-semibold text-[var(--theme-text-primary)] flex items-center mb-1">
        <Settings2 size={iconSize} className="mr-2 text-[var(--theme-text-link)] opacity-80" />
        {t('settingsChatBehavior')}
      </h3>
      
      <ModelVoiceSettings
        modelId={props.modelId}
        setModelId={props.setModelId}
        isModelsLoading={props.isModelsLoading}
        modelsLoadingError={props.modelsLoadingError}
        availableModels={props.availableModels}
        transcriptionModelId={props.transcriptionModelId}
        setTranscriptionModelId={props.setTranscriptionModelId}
        isTranscriptionThinkingEnabled={props.isTranscriptionThinkingEnabled}
        setIsTranscriptionThinkingEnabled={props.setIsTranscriptionThinkingEnabled}
        ttsVoice={props.ttsVoice}
        setTtsVoice={props.setTtsVoice}
        t={t}
      />
      
      <div className="pt-4 mt-4 border-t border-[var(--theme-border-primary)] border-opacity-50">
        <GenerationSettings
          systemInstruction={props.systemInstruction}
          setSystemInstruction={props.setSystemInstruction}
          temperature={props.temperature}
          setTemperature={props.setTemperature}
          topP={props.topP}
          setTopP={props.setTopP}
          t={t}
        />
      </div>

      <div className="pt-4 mt-4 border-t border-[var(--theme-border-primary)] border-opacity-50">
        <FeatureFlags
          showThoughts={props.showThoughts}
          setShowThoughts={props.setShowThoughts}
          thinkingBudget={props.thinkingBudget}
          setThinkingBudget={props.setThinkingBudget}
          isStreamingEnabled={props.isStreamingEnabled}
          setIsStreamingEnabled={props.setIsStreamingEnabled}
          isAutoTitleEnabled={props.isAutoTitleEnabled}
          setIsAutoTitleEnabled={props.setIsAutoTitleEnabled}
          useFilesApiForImages={props.useFilesApiForImages}
          setUseFilesApiForImages={props.setUseFilesApiForImages}
          expandCodeBlocksByDefault={props.expandCodeBlocksByDefault}
          setExpandCodeBlocksByDefault={props.setExpandCodeBlocksByDefault}
          isMermaidRenderingEnabled={props.isMermaidRenderingEnabled}
          setIsMermaidRenderingEnabled={props.setIsMermaidRenderingEnabled}
          isGraphvizRenderingEnabled={props.isGraphvizRenderingEnabled}
          setIsGraphvizRenderingEnabled={props.setIsGraphvizRenderingEnabled}
          isCompletionNotificationEnabled={props.isCompletionNotificationEnabled}
          setIsCompletionNotificationEnabled={props.setIsCompletionNotificationEnabled}
          isSuggestionsEnabled={props.isSuggestionsEnabled}
          setIsSuggestionsEnabled={props.setIsSuggestionsEnabled}
          isAutoSendOnSuggestionClick={props.isAutoSendOnSuggestionClick}
          setIsAutoSendOnSuggestionClick={props.setIsAutoSendOnSuggestionClick}
          isAutoScrollOnSendEnabled={props.isAutoScrollOnSendEnabled ?? true}
          setIsAutoScrollOnSendEnabled={props.setIsAutoScrollOnSendEnabled}
          t={t}
        />
      </div>
    </div>
  );
};