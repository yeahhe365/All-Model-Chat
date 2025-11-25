import React, { useState } from 'react';
import { Mic, Info } from 'lucide-react';
import { AVAILABLE_TTS_VOICES, AVAILABLE_TRANSCRIPTION_MODELS } from '../../constants/appConstants';
import { Tooltip, Select, Toggle } from '../shared/Tooltip';

interface VoiceControlProps {
  transcriptionModelId: string;
  setTranscriptionModelId: (value: string) => void;
  isTranscriptionThinkingEnabled: boolean;
  setIsTranscriptionThinkingEnabled: (value: boolean) => void;
  ttsVoice: string;
  setTtsVoice: (value: string) => void;
  t: (key: string) => string;
}

export const VoiceControl: React.FC<VoiceControlProps> = ({
  transcriptionModelId,
  setTranscriptionModelId,
  isTranscriptionThinkingEnabled,
  setIsTranscriptionThinkingEnabled,
  ttsVoice,
  setTtsVoice,
  t
}) => {
  return (
    <div className="space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
            <Mic size={14} strokeWidth={1.5} /> Audio & Speech
        </h4>
        
        <div className="space-y-5">
            <Select
            id="transcription-model-select"
            label=""
            labelContent={
                <span className='flex items-center text-sm font-medium text-[var(--theme-text-primary)]'>
                    {t('chatBehavior_voiceModel_label')}
                <Tooltip text={t('chatBehavior_voiceModel_tooltip')}>
                    <Info size={14} className="ml-2 text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
                </Tooltip>
                </span>
            }
            value={transcriptionModelId}
            onChange={(e) => setTranscriptionModelId(e.target.value)}
            >
            {AVAILABLE_TRANSCRIPTION_MODELS.map((model) => ( <option key={model.id} value={model.id}>{model.name}</option>))}
            </Select>

            <div style={{ animation: 'fadeIn 0.3s ease-out both' }}>
                <label htmlFor="transcription-thinking-toggle" className="flex items-center justify-between py-2 cursor-pointer">
                <span className="text-sm text-[var(--theme-text-secondary)] flex items-center">
                    {t('settingsTranscriptionThinking')}
                    <Tooltip text={t('chatBehavior_transcriptionThinking_tooltip')}>
                    <Info size={14} className="ml-2 text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
                    </Tooltip>
                </span>
                <Toggle id="transcription-thinking-toggle" checked={isTranscriptionThinkingEnabled} onChange={setIsTranscriptionThinkingEnabled} />
                </label>
            </div>

            <Select
            id="tts-voice-select"
            label=""
            labelContent={
                <span className="flex items-center text-sm font-medium text-[var(--theme-text-primary)]">
                {t('settingsTtsVoice')}
                </span>
            }
            value={ttsVoice}
            onChange={(e) => setTtsVoice(e.target.value)}
            >
            {AVAILABLE_TTS_VOICES.map((voice) => ( <option key={voice.id} value={voice.id}>{voice.name}</option> ))}
            </Select>
        </div>
    </div>
  );
};