
import React, { useState } from 'react';
import { Mic, Info } from 'lucide-react';
import { AVAILABLE_TTS_VOICES, AVAILABLE_TRANSCRIPTION_MODELS } from '../../constants/appConstants';
import { Tooltip, Select } from '../shared/Tooltip';

interface VoiceControlProps {
  transcriptionModelId: string;
  setTranscriptionModelId: (value: string) => void;
  ttsVoice: string;
  setTtsVoice: (value: string) => void;
  t: (key: string) => string;
}

export const VoiceControl: React.FC<VoiceControlProps> = ({
  transcriptionModelId,
  setTranscriptionModelId,
  ttsVoice,
  setTtsVoice,
  t
}) => {
  return (
    <div className="space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
            <Mic size={14} strokeWidth={1.5} /> Audio & Speech
        </h4>
        
        <div className="space-y-3">
            <Select
                id="transcription-model-select"
                label=""
                layout="horizontal"
                labelContent={
                    <span className='flex items-center'>
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

            <Select
                id="tts-voice-select"
                label={t('settingsTtsVoice')}
                layout="horizontal"
                value={ttsVoice}
                onChange={(e) => setTtsVoice(e.target.value)}
            >
                {AVAILABLE_TTS_VOICES.map((voice) => ( <option key={voice.id} value={voice.id}>{voice.name}</option> ))}
            </Select>
        </div>
    </div>
  );
};
