
import React, { useState, useRef } from 'react';
import { AudioLines, ChevronDown, Check } from 'lucide-react';
import { useClickOutside } from '../../../../hooks/useClickOutside';
import { AVAILABLE_TTS_VOICES } from '../../../../constants/appConstants';

interface TtsVoiceSelectorProps {
    ttsVoice: string;
    setTtsVoice: (voice: string) => void;
    t: (key: string) => string;
}

export const TtsVoiceSelector: React.FC<TtsVoiceSelectorProps> = ({ ttsVoice, setTtsVoice, t }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useClickOutside(containerRef, () => setIsOpen(false), isOpen);

    const currentVoiceName = AVAILABLE_TTS_VOICES.find(v => v.id === ttsVoice)?.name || ttsVoice;

    return (
        <div className="mb-2 relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)] text-xs font-medium text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]"
                title={t('settingsTtsVoice')}
            >
                <AudioLines size={14} className="text-purple-500" />
                <span>{currentVoiceName}</span>
                <ChevronDown size={14} className={`text-[var(--theme-text-tertiary)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute bottom-full left-0 mb-2 z-[50] bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-xl shadow-premium overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col w-48 max-h-[300px]">
                    <div className="overflow-y-auto custom-scrollbar p-1">
                        {AVAILABLE_TTS_VOICES.map(voice => (
                            <button
                                key={voice.id}
                                onClick={() => { setTtsVoice(voice.id); setIsOpen(false); }}
                                className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-colors ${
                                    ttsVoice === voice.id
                                    ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] font-medium'
                                    : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]/50 hover:text-[var(--theme-text-primary)]'
                                }`}
                            >
                                <span>{voice.name}</span>
                                {ttsVoice === voice.id && <Check size={14} className="text-[var(--theme-text-link)]" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
