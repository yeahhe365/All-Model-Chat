
import React from 'react';
import { Languages, ScanText, AudioWaveform, Captions, Lightbulb, FileText, Sparkles, AppWindow, Scan } from 'lucide-react';

export const SuggestionIcon = ({ iconName, className }: { iconName?: string, className?: string }) => {
    const size = 16;
    switch(iconName) {
        case 'AppWindow': return <AppWindow className={className} size={size} />;
        case 'Languages': return <Languages className={className} size={size} />;
        case 'ScanText': return <ScanText className={className} size={size} />;
        case 'Scan': return <Scan className={className} size={size} />;
        case 'AudioWaveform': return <AudioWaveform className={className} size={size} />;
        case 'Captions': return <Captions className={className} size={size} />;
        case 'Lightbulb': return <Lightbulb className={className} size={size} />;
        case 'FileText': return <FileText className={className} size={size} />;
        default: return <Sparkles className={className} size={size} />;
    }
};