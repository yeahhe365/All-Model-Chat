
import React from 'react';
import { GripVertical, X, Loader2 } from 'lucide-react';
import { getTranslator } from '../../../../utils/appUtils';
import { useSettingsStore } from '../../../../stores/settingsStore';

interface AudioPlayerViewProps {
    audioUrl: string | null;
    isLoading: boolean;
    audioRef: React.RefObject<HTMLAudioElement>;
    onDragStart: (e: React.MouseEvent) => void;
    onClose: (e: React.MouseEvent) => void;
}

export const AudioPlayerView: React.FC<AudioPlayerViewProps> = ({ 
    audioUrl, 
    isLoading, 
    audioRef, 
    onDragStart, 
    onClose 
}) => {
    const language = useSettingsStore((state) => state.language);
    const t = getTranslator(language);

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[var(--theme-text-primary)]">
                <Loader2 size={14} className="animate-spin text-[var(--theme-text-link)]" />
                <span>{t('selection_generating_audio')}</span>
            </div>
        );
    }

    if (!audioUrl) return null;

    return (
        <div className="flex items-center gap-1 pl-1 pr-2 py-1">
            <div 
                onMouseDown={onDragStart}
                className="cursor-grab active:cursor-grabbing p-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors touch-none"
                title={t('selection_drag_to_move')}
            >
                <GripVertical size={14} />
            </div>
            
            <audio 
                ref={audioRef} 
                src={audioUrl} 
                controls 
                autoPlay 
                className="h-8 w-80 rounded-full focus:outline-none"
            />
            <button 
                onClick={onClose}
                title={t('close')}
                aria-label={t('close')}
                className="p-1.5 rounded-full text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] ml-1"
            >
                <X size={16} />
            </button>
        </div>
    );
};
