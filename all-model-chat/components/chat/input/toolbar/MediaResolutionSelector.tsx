
import React, { useState, useRef } from 'react';
import { Settings2, ChevronDown, Check } from 'lucide-react';
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

    const options = [
        { value: MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED, labelKey: 'mediaResolution_unspecified' },
        { value: MediaResolution.MEDIA_RESOLUTION_LOW, labelKey: 'mediaResolution_low' },
        { value: MediaResolution.MEDIA_RESOLUTION_MEDIUM, labelKey: 'mediaResolution_medium' },
        { value: MediaResolution.MEDIA_RESOLUTION_HIGH, labelKey: 'mediaResolution_high' },
        { value: MediaResolution.MEDIA_RESOLUTION_ULTRA_HIGH, labelKey: 'mediaResolution_ultra_high' },
    ];

    const filteredOptions = isNativeAudioModel 
        ? options.filter(o => o.value === MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED || o.value === MediaResolution.MEDIA_RESOLUTION_LOW)
        : options;

    const currentLabel = t(options.find(o => o.value === mediaResolution)?.labelKey || 'mediaResolution_unspecified');

    return (
        <div className="mb-2 relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)] text-xs font-medium text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]"
                title={t('settingsMediaResolution')}
            >
                <Settings2 size={14} className="text-blue-500" />
                <span>{currentLabel}</span>
                <ChevronDown size={14} className={`text-[var(--theme-text-tertiary)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute bottom-full left-0 mb-2 z-[50] bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-xl shadow-premium overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col w-48 max-h-[300px]">
                    <div className="overflow-y-auto custom-scrollbar p-1">
                        {filteredOptions.map(option => (
                            <button
                                key={option.value}
                                onClick={() => { setMediaResolution(option.value); setIsOpen(false); }}
                                className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-colors ${
                                    mediaResolution === option.value
                                    ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] font-medium'
                                    : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]/50 hover:text-[var(--theme-text-primary)]'
                                }`}
                            >
                                <span>{t(option.labelKey)}</span>
                                {mediaResolution === option.value && <Check size={14} className="text-[var(--theme-text-link)]" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
