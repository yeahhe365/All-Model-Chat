
import React, { useState, useRef } from 'react';
import { Settings2, ChevronDown, Check, Zap } from 'lucide-react';
import { useClickOutside } from '../../../../hooks/useClickOutside';
import { MediaResolution } from '../../../../types/settings';

interface MediaResolutionSelectorProps {
    mediaResolution: MediaResolution;
    setMediaResolution: (resolution: MediaResolution) => void;
    t: (key: string) => string;
    isNativeAudioModel?: boolean;
}

export const MediaResolutionSelector: React.FC<MediaResolutionSelectorProps> = ({ mediaResolution, setMediaResolution, t, isNativeAudioModel }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useClickOutside(containerRef, () => setIsOpen(false), isOpen);

    const standardOptions = [
        { value: MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED, label: t('mediaResolution_unspecified') },
        { value: MediaResolution.MEDIA_RESOLUTION_LOW, label: t('mediaResolution_low') },
        { value: MediaResolution.MEDIA_RESOLUTION_MEDIUM, label: t('mediaResolution_medium') },
        { value: MediaResolution.MEDIA_RESOLUTION_HIGH, label: t('mediaResolution_high') },
        { value: MediaResolution.MEDIA_RESOLUTION_ULTRA_HIGH, label: t('mediaResolution_ultra_high') },
    ];

    const liveOptions = [
        { value: MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED, label: "258 tokens / image" },
        { value: MediaResolution.MEDIA_RESOLUTION_LOW, label: "66 tokens / image" },
    ];

    const options = isNativeAudioModel ? liveOptions : standardOptions;
    const currentOption = options.find(o => o.value === mediaResolution) || options[0];

    return (
        <div className="mb-2 relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] ${
                    isNativeAudioModel 
                    ? 'bg-[var(--theme-bg-secondary)] border-[var(--theme-border-secondary)] text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]'
                    : 'bg-[var(--theme-bg-secondary)] border-[var(--theme-border-secondary)] text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]'
                }`}
                title={t('settingsMediaResolution')}
            >
                {isNativeAudioModel ? <Zap size={14} className="text-amber-500" /> : <Settings2 size={14} className="text-blue-500" />}
                <span>{currentOption.label}</span>
                <ChevronDown size={14} className={`text-[var(--theme-text-tertiary)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute bottom-full left-0 mb-2 z-[50] bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-xl shadow-premium overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col w-48 max-h-[300px]">
                    {isNativeAudioModel && (
                        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-tertiary)] border-b border-[var(--theme-border-secondary)]/50">
                            Media Resolution
                        </div>
                    )}
                    <div className="overflow-y-auto custom-scrollbar p-1">
                        {options.map(option => (
                            <button
                                key={option.value}
                                onClick={() => { setMediaResolution(option.value); setIsOpen(false); }}
                                className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-colors ${
                                    mediaResolution === option.value
                                    ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] font-medium'
                                    : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]/50 hover:text-[var(--theme-text-primary)]'
                                }`}
                            >
                                <span>{option.label}</span>
                                {mediaResolution === option.value && <Check size={14} className="text-[var(--theme-text-link)]" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
