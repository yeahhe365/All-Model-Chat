
import React from 'react';
import { ModelOption, SafetySetting } from '../../types';
import { ModelVoiceSettings } from './ModelVoiceSettings';
import { SafetySection } from './SafetySection';

interface ChatBehaviorSectionProps {
  modelId: string;
  setModelId: (value: string) => void;
  isModelsLoading: boolean;
  modelsLoadingError: string | null;
  availableModels: ModelOption[];
  transcriptionModelId: string;
  setTranscriptionModelId: (value: string) => void;
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
  safetySettings?: SafetySetting[];
  setSafetySettings: (settings: SafetySetting[]) => void;
  t: (key: string) => string;
}

export const ChatBehaviorSection: React.FC<ChatBehaviorSectionProps> = (props) => {
  const { t } = props;

  return (
    <div className="max-w-3xl mx-auto space-y-10">
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
            temperature={props.temperature}
            setTemperature={props.setTemperature}
            topP={props.topP}
            setTopP={props.setTopP}
            t={t}
        />
        
        <div className="pt-6 border-t border-[var(--theme-border-secondary)]">
            <SafetySection 
                safetySettings={props.safetySettings}
                setSafetySettings={props.setSafetySettings}
                t={t}
            />
        </div>
    </div>
  );
};
