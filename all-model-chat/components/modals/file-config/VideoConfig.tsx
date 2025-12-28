
import React from 'react';
import { Clock, MonitorPlay, Info } from 'lucide-react';

interface VideoConfigProps {
    startOffset: string;
    setStartOffset: (val: string) => void;
    endOffset: string;
    setEndOffset: (val: string) => void;
    fps: string;
    setFps: (val: string) => void;
    t: (key: string) => string;
}

export const VideoConfig: React.FC<VideoConfigProps> = ({
    startOffset, setStartOffset, endOffset, setEndOffset, fps, setFps, t
}) => {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-[var(--theme-text-tertiary)]">{t('videoSettings_start')}</label>
                    <div className="relative">
                        <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-tertiary)]" />
                        <input 
                            type="text" 
                            value={startOffset}
                            onChange={(e) => setStartOffset(e.target.value)}
                            placeholder={t('videoSettings_placeholder')}
                            className="w-full bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--theme-text-primary)] focus:ring-2 focus:ring-[var(--theme-border-focus)] outline-none"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-[var(--theme-text-tertiary)]">{t('videoSettings_end')}</label>
                    <div className="relative">
                        <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-tertiary)]" />
                        <input 
                            type="text" 
                            value={endOffset}
                            onChange={(e) => setEndOffset(e.target.value)}
                            placeholder={t('videoSettings_placeholder')}
                            className="w-full bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--theme-text-primary)] focus:ring-2 focus:ring-[var(--theme-border-focus)] outline-none"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-[var(--theme-text-tertiary)]">{t('videoSettings_fps')}</label>
                <div className="relative">
                    <MonitorPlay size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-tertiary)]" />
                    <input 
                        type="number"
                        min="0.1" 
                        step="0.1"
                        value={fps}
                        onChange={(e) => setFps(e.target.value)}
                        placeholder={t('videoSettings_fps_placeholder')}
                        className="w-full bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--theme-text-primary)] focus:ring-2 focus:ring-[var(--theme-border-focus)] outline-none"
                    />
                </div>
            </div>

            <div className="space-y-3 bg-[var(--theme-bg-tertiary)]/30 p-4 rounded-lg border border-[var(--theme-border-secondary)]/30">
                <div className="flex items-start gap-2.5 text-xs text-[var(--theme-text-secondary)]">
                    <Info size={14} className="flex-shrink-0 mt-0.5 text-[var(--theme-text-link)]" />
                    <div className="space-y-2">
                        <p className="leading-relaxed">{t('videoSettings_tip_fps')}</p>
                        <p className="leading-relaxed opacity-90">{t('videoSettings_tip_timestamp')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
