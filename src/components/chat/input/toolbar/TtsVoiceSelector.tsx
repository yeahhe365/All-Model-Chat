
import React, { useEffect, useState } from 'react';
import { AudioLines } from 'lucide-react';
import { Select } from '../../../shared/Select';
import type { TtsVoiceOption } from '../../../../constants/voiceOptions';

interface TtsVoiceSelectorProps {
    ttsVoice: string;
    setTtsVoice: (voice: string) => void;
    t: (key: string) => string;
}

export const TtsVoiceSelector: React.FC<TtsVoiceSelectorProps> = ({ ttsVoice, setTtsVoice, t }) => {
    const [voices, setVoices] = useState<TtsVoiceOption[]>([]);

    useEffect(() => {
        let isMounted = true;

        void import('../../../../constants/voiceOptions').then(({ AVAILABLE_TTS_VOICES }) => {
            if (isMounted) {
                setVoices(AVAILABLE_TTS_VOICES);
            }
        });

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <Select
            id="tts-voice-selector"
            label={t('settingsTtsVoice')}
            hideLabel
            value={ttsVoice}
            onChange={(e) => setTtsVoice(e.target.value)}
            className="mb-0"
            wrapperClassName="relative min-w-[160px] w-auto"
            direction="up"
            dropdownClassName="!w-auto !min-w-full max-h-[300px]"
        >
            {voices.map(voice => (
                <option key={voice.id} value={voice.id}>
                    <div className="flex items-center gap-2">
                         <AudioLines size={14} className="text-purple-500 flex-shrink-0" />
                         <span className="whitespace-nowrap">{voice.name} ({t(voice.styleKey)})</span>
                    </div>
                </option>
            ))}
        </Select>
    );
};
