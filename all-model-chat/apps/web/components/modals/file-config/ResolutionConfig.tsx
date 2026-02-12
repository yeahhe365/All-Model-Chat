
import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { MediaResolution } from '../../../types/settings';
import { Select } from '../../shared/Select';

interface ResolutionConfigProps {
    mediaResolution: MediaResolution | '';
    setMediaResolution: (value: MediaResolution) => void;
    t: (key: string) => string;
}

export const ResolutionConfig: React.FC<ResolutionConfigProps> = ({ mediaResolution, setMediaResolution, t }) => (
    <div className="space-y-3 pb-4 border-b border-[var(--theme-border-secondary)]/50">
        <Select
            id="file-media-resolution"
            label={t('fileSettings_resolution') || 'Token Resolution'}
            layout="horizontal"
            value={mediaResolution}
            onChange={(e) => setMediaResolution(e.target.value as MediaResolution)}
            labelContent={
                <div className="flex items-center gap-2">
                    <ImageIcon size={14} className="text-[var(--theme-text-secondary)]" />
                    <span>{t('fileSettings_resolution') || 'Resolution'}</span>
                </div>
            }
        >
            <option value="">{t('mediaResolution_unspecified')}</option>
            <option value={MediaResolution.MEDIA_RESOLUTION_LOW}>{t('mediaResolution_low')}</option>
            <option value={MediaResolution.MEDIA_RESOLUTION_MEDIUM}>{t('mediaResolution_medium')}</option>
            <option value={MediaResolution.MEDIA_RESOLUTION_HIGH}>{t('mediaResolution_high')}</option>
            <option value={MediaResolution.MEDIA_RESOLUTION_ULTRA_HIGH}>{t('mediaResolution_ultra_high')}</option>
        </Select>
        <p className="text-[10px] text-[var(--theme-text-tertiary)] italic">
            {t('fileSettings_resolution_help') || 'Specific resolution for this file. Overrides global settings.'}
        </p>
    </div>
);
