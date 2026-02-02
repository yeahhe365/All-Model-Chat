
import React from 'react';
import { AudioLines } from 'lucide-react';
import { AVAILABLE_TTS_VOICES } from '../../../../constants/appConstants';
import { Select } from '../../../shared/Select';

interface TtsVoiceSelectorProps {
    ttsVoice: string;
    setTtsVoice: (voice: string) => void;
    t: (key: string) => string;
}

export const TtsVoiceSelector: React.FC<TtsVoiceSelectorProps> = ({ ttsVoice, setTtsVoice, t }) => {
    return (
        <Select
            id="tts-voice-selector"
            label={t('settingsTtsVoice')}
            hideLabel
            value={ttsVoice}
            onChange={(e) => setTtsVoice(e.target.value)}
            className="mb-0"
            wrapperClassName="relative min-w-[160px] w-auto"
        >
            {AVAILABLE_TTS_VOICES.map(voice => (
                <option key={voice.id} value={voice.id}>
                    <div className="flex items-center gap-2">
                         <AudioLines size={14} className="text-purple-500" />
                         <span>{voice.name}</span>
                    </div>
                </option>
            ))}
        </Select>
    );
};
