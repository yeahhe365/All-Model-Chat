
import React from 'react';
import { ModelOption, SafetySetting } from '../../../types';
import { ModelVoiceSettings } from '../ModelVoiceSettings';
import { SafetySection } from './SafetySection';
import { MediaResolution } from '../../../types/settings';
import { ToggleItem } from '../../shared/ToggleItem';
import { Select } from '../../shared/Select';
import { Wand2 } from 'lucide-react';

interface ChatBehaviorSectionProps {
  modelId: string;
  setModelId: (id: string) => void;
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
  thinkingBudget: number;
  setThinkingBudget: (value: number) => void;
  thinkingLevel?: 'LOW' | 'HIGH';
  setThinkingLevel?: (value: 'LOW' | 'HIGH') => void;
  showThoughts: boolean;
  setShowThoughts: (value: boolean) => void;
  safetySettings?: SafetySetting[];
  setSafetySettings: (settings: SafetySetting[]) => void;
  t: (key: string) => string;
  setAvailableModels: (models: ModelOption[]) => void;
  mediaResolution?: MediaResolution;
  setMediaResolution?: (resolution: MediaResolution) => void;
  autoCanvasVisualization: boolean;
  setAutoCanvasVisualization: (value: boolean) => void;
  autoCanvasModelId: string;
  setAutoCanvasModelId: (value: string) => void;
}

export const ChatBehaviorSection: React.FC<ChatBehaviorSectionProps> = (props) => {
  const { t } = props;

  return (
    <div className="max-w-3xl mx-auto space-y-10">
        <ModelVoiceSettings
            modelId={props.modelId}
            setModelId={props.setModelId}
            availableModels={props.availableModels}
            setAvailableModels={props.setAvailableModels}
            transcriptionModelId={props.transcriptionModelId}
            setTranscriptionModelId={props.setTranscriptionModelId}
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
            mediaResolution={props.mediaResolution}
            setMediaResolution={props.setMediaResolution}
        />

        {/* Canvas Visualization Settings */}
        <div className="pt-6 border-t border-[var(--theme-border-secondary)] space-y-4">
             <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
                <Wand2 size={14} strokeWidth={1.5} />
                Canvas Visualization
            </h4>
            <div className="space-y-1">
                 <ToggleItem 
                    label={t('settings_autoCanvasVisualization_label')} 
                    checked={props.autoCanvasVisualization} 
                    onChange={props.setAutoCanvasVisualization} 
                    tooltip={t('settings_autoCanvasVisualization_tooltip')} 
                 />
                 
                 <Select
                      id="canvas-model-select"
                      label=""
                      layout="horizontal"
                      labelContent={
                          <div className="flex items-center gap-2 text-sm font-medium text-[var(--theme-text-primary)]">
                              {t('settings_autoCanvasModel_label')}
                          </div>
                      }
                      value={props.autoCanvasModelId}
                      onChange={(e) => props.setAutoCanvasModelId(e.target.value)}
                      className="py-3"
                  >
                      <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                      <option value="gemini-3-pro-preview">Gemini 3 Pro</option>
                  </Select>
            </div>
        </div>
        
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