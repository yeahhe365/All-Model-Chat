import { Box, Volume2, Image as ImageIcon, Sparkles, MessageSquareText, AudioWaveform } from 'lucide-react';
import { ModelOption } from '../../types';
import { isLiveAudioModel } from '../../utils/appUtils';

export const getModelIcon = (model: ModelOption | undefined) => {
    if (!model) return <Box size={15} className="text-[var(--theme-text-tertiary)]" strokeWidth={1.5} />;
    const { id, isPinned } = model;
    const lowerId = id.toLowerCase();

    if (isLiveAudioModel(id)) return <AudioWaveform size={15} className="text-amber-500 dark:text-amber-400 flex-shrink-0" strokeWidth={1.5} />;

    if (lowerId.includes('tts')) return <Volume2 size={15} className="text-purple-500 dark:text-purple-400 flex-shrink-0" strokeWidth={1.5} />;
    if (lowerId.includes('imagen') || lowerId.includes('image')) return <ImageIcon size={15} className="text-rose-500 dark:text-rose-400 flex-shrink-0" strokeWidth={1.5} />;
    if (lowerId.includes('gemini')) return <MessageSquareText size={15} className="text-sky-500 dark:text-sky-400 flex-shrink-0" strokeWidth={1.5} />;

    if (isPinned) return <Sparkles size={15} className="text-sky-500 dark:text-sky-400 flex-shrink-0" strokeWidth={1.5} />;
    return <Box size={15} className="text-[var(--theme-text-tertiary)] opacity-70 flex-shrink-0" strokeWidth={1.5} />;
};
