import React from 'react';
import { ModelOption } from '../../types';
import { Settings2 } from 'lucide-react';
import { getResponsiveValue } from '../../utils/appUtils';
import { ModelVoiceSettings } from './ModelVoiceSettings';
import { GenerationSettings } from './GenerationSettings';

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
  isTranscriptionThinkingEnabled: boolean;
  setIsTranscriptionThinkingEnabled: (value: boolean) => void;
  thinkingBudget: number;
  setThinkingBudget: (value: number) => void;
  showThoughts: boolean;
  setShowThoughts: (value: boolean) => void;
  t: (key: string) => string;
}

export const ChatBehaviorSection: React.FC<ChatBehaviorSectionProps> = (props) => {
  const { t } = props;
  const iconSize = getResponsiveValue(14, 16);

  return (
    <div>
      <h3 className="text-lg font-semibold text-[var(--theme-text-primary)] flex items-center mb-4">
        {t('settingsModelParameters')}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <div className="space-y-4">
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
        </div>
        <div className="space-y-4 md:pl-8 md:border-l md:border-[var(--theme-border-primary)] md:border-opacity-50 pt-6 md:pt-0 border-t md:border-t-0 border-[var(--theme-border-primary)] border-opacity-50">
            <GenerationSettings
                systemInstruction={props.systemInstruction}
                setSystemInstruction={props.setSystemInstruction}
                temperature={props.temperature}
                setTemperature={props.setTemperature}
                topP={props.topP}
                setTopP={props.setTopP}
                thinkingBudget={props.thinkingBudget}
                setThinkingBudget={props.setThinkingBudget}
                showThoughts={props.showThoughts}
                setShowThoughts={props.setShowThoughts}
                t={t}
            />
        </div>
      </div>
    </div>
  );
};