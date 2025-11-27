
import React, { useState, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { UploadedFile, VideoMetadata } from '../../types';
import { translations } from '../../utils/appUtils';
import { Clock, Scissors, Save, X, MonitorPlay, Info } from 'lucide-react';

interface VideoSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    file: UploadedFile | null;
    onSave: (fileId: string, metadata: VideoMetadata) => void;
    t: (key: keyof typeof translations) => string;
}

export const VideoSettingsModal: React.FC<VideoSettingsModalProps> = ({ isOpen, onClose, file, onSave, t }) => {
    const [startOffset, setStartOffset] = useState('');
    const [endOffset, setEndOffset] = useState('');
    const [fps, setFps] = useState('');

    useEffect(() => {
        if (isOpen && file) {
            setStartOffset(file.videoMetadata?.startOffset || '');
            setEndOffset(file.videoMetadata?.endOffset || '');
            setFps(file.videoMetadata?.fps ? String(file.videoMetadata.fps) : '');
        }
    }, [isOpen, file]);

    const handleSave = () => {
        if (!file) return;
        
        const normalize = (val: string) => {
            val = val.trim();
            if (!val) return undefined;
            if (/^\d+$/.test(val)) return `${val}s`; 
            return val;
        };

        const metadata: VideoMetadata = {
            startOffset: normalize(startOffset),
            endOffset: normalize(endOffset)
        };

        const fpsNum = parseFloat(fps);
        if (!isNaN(fpsNum) && fpsNum > 0) {
            metadata.fps = fpsNum;
        }

        onSave(file.id, metadata);
        onClose();
    };

    if (!file) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} contentClassName="bg-[var(--theme-bg-primary)] rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-[var(--theme-border-primary)]">
            <div className="p-4 border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)] flex justify-between items-center">
                <h3 className="font-semibold text-[var(--theme-text-primary)] flex items-center gap-2">
                    <Scissors size={18} />
                    {t('videoSettings_title')}
                </h3>
                <button onClick={onClose} className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]">
                    <X size={20} />
                </button>
            </div>
            
            <div className="p-6 space-y-6">
                {/* Config Section */}
                <div className="space-y-4">
                    
                    {/* Clipping Inputs */}
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

                    {/* FPS Input */}
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
                </div>

                {/* Tips Section */}
                <div className="space-y-3 bg-[var(--theme-bg-tertiary)]/30 p-4 rounded-lg border border-[var(--theme-border-secondary)]/30">
                    <div className="flex items-start gap-2.5 text-xs text-[var(--theme-text-secondary)]">
                        <Info size={14} className="flex-shrink-0 mt-0.5 text-[var(--theme-text-link)]" />
                        <div className="space-y-2">
                            <p className="leading-relaxed">{t('videoSettings_tip_fps')}</p>
                            <p className="leading-relaxed opacity-90">{t('videoSettings_tip_timestamp')}</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors">
                        {t('cancel')}
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] hover:bg-[var(--theme-bg-accent-hover)] rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                        <Save size={16} />
                        {t('videoSettings_save')}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
