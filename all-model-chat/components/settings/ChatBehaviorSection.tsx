import React from 'react';
import { ModelOption } from '../../types';
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
  useFilesApiForImages: boolean;
  setUseFilesApiForImages: (value: boolean) => void;
  generateQuadImages: boolean;
  setGenerateQuadImages: (value: boolean) => void;
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
  thinkingLevel?: 'LOW' | 'HIGH';
  setThinkingLevel?: (value: 'LOW' | 'HIGH') => void;
  showThoughts: boolean;
  setShowThoughts: (value: boolean) => void;
  t: (key: string) => string;
}

export const ChatBehaviorSection: React.FC<ChatBehaviorSectionProps> = (props) => {
  const { t } = props;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <div className="space-y-8">
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
                useFilesApiForImages={props.useFilesApiForImages}
                setUseFilesApiForImages={props.setUseFilesApiForImages}
                generateQuadImages={props.generateQuadImages}
                setGenerateQuadImages={props.setGenerateQuadImages}
                ttsVoice={props.ttsVoice}
                setTtsVoice={props.setTtsVoice}
                systemInstruction={props.systemInstruction}
                setSystemInstruction={props.setSystemInstruction}
                thinkingBudget={props.thinkingBudget}
                setThinkingBudget={props.setThinkingBudget}
                thinkingLevel={props.thinkingLevel}
                setThinkingLevel={props.setThinkingLevel}
                showThoughts={props.showThoughts}
                setShowThoughts={props.setShowThoughts}
                t={t}
            />
        </div>
        <div className="space-y-8 lg:pl-8 lg:border-l lg:border-[var(--theme-border-primary)]/50">
            <GenerationSettings
                temperature={props.temperature}
                setTemperature={props.setTemperature}
                topP={props.topP}
                setTopP={props.setTopP}
                t={t}
            />
        </div>
    </div>
  );
};