
import React from 'react';
import { Settings2, Zap } from 'lucide-react';
import { MediaResolution } from '../../../../types/settings';
import { Select } from '../../../shared/Select';

interface MediaResolutionSelectorProps {
    mediaResolution: MediaResolution;
    setMediaResolution: (resolution: MediaResolution) => void;
    t: (key: string) => string;
    isNativeAudioModel?: boolean;
}

export const MediaResolutionSelector: React.FC<MediaResolutionSelectorProps> = ({ mediaResolution, setMediaResolution, t, isNativeAudioModel }) => {
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

    return (
        <Select
            id="media-resolution-selector"
            label={t('settingsMediaResolution')}
            hideLabel
            value={mediaResolution}
            onChange={(e) => setMediaResolution(e.target.value as MediaResolution)}
            className="mb-0"
            wrapperClassName="relative min-w-[180px] w-auto"
        >
            {options.map(option => (
                <option key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                        {isNativeAudioModel ? <Zap size={14} className="text-amber-500" /> : <Settings2 size={14} className="text-blue-500" />}
                        <span>{option.label}</span>
                    </div>
                </option>
            ))}
        </Select>
    );
};
