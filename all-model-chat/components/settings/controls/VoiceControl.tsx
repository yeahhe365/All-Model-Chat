
import React, { useState } from 'react';
import { Mic, Info } from 'lucide-react';
import { AVAILABLE_TRANSCRIPTION_MODELS } from '../../../constants/appConstants';
import { Tooltip } from '../../shared/Tooltip';
import { Select } from '../../shared/Select';

interface VoiceControlProps {
  transcriptionModelId: string;
  setTranscriptionModelId: (value: string) => void;
  t: (key: string) => string;
}

export const VoiceControl: React.FC<VoiceControlProps> = ({
  transcriptionModelId,
  setTranscriptionModelId,
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
        </div>
    </div>
  );
};
