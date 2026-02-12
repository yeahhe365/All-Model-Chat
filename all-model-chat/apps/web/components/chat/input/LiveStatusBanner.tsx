
import React from 'react';
import { Mic, Activity, X } from 'lucide-react';

interface LiveStatusBannerProps {
    isConnected: boolean;
    isSpeaking: boolean;
    volume: number;
    onDisconnect: () => void;
    error: string | null;
}

export const LiveStatusBanner: React.FC<LiveStatusBannerProps> = ({ 
    isConnected, 
    isSpeaking, 
    volume, 
    onDisconnect,
    error
}) => {
    if (error) {
        return (
            <div className="flex items-center justify-between p-3 mb-2 bg-[var(--theme-bg-danger)]/10 border border-[var(--theme-bg-danger)]/20 rounded-xl text-[var(--theme-text-danger)] animate-in fade-in slide-in-from-bottom-2">
                <span className="text-xs font-medium truncate">{error}</span>
                <button onClick={onDisconnect} className="p-1 hover:bg-[var(--theme-bg-danger)]/20 rounded-full">
                    <X size={14} />
                </button>
            </div>
        );
    }

    if (!isConnected) return null;

    return (
        <div className="flex items-center justify-between p-2 mb-2 bg-[var(--theme-bg-accent)]/10 border border-[var(--theme-bg-accent)]/20 rounded-xl animate-in fade-in slide-in-from-bottom-2 backdrop-blur-sm">
            <div className="flex items-center gap-3 pl-2 min-w-0">
                <div className={`relative flex items-center justify-center w-8 h-8 rounded-full ${isSpeaking ? 'bg-blue-500 text-white' : 'bg-[var(--theme-bg-secondary)] text-[var(--theme-text-link)]'}`}>
                    {isSpeaking ? (
                        <Activity size={16} className="animate-pulse" />
                    ) : (
                        <Mic size={16} className={volume > 0.05 ? 'animate-pulse' : ''} />
                    )}
                    {/* Visualizer Ring */}
                    <div 
                        className="absolute inset-0 rounded-full border-2 border-current opacity-30 transition-transform duration-75"
                        style={{ transform: `scale(${1 + Math.min(volume * 2, 0.5)})` }}
                    />
                </div>
                
                <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-[var(--theme-text-primary)]">
                        {isSpeaking ? "Gemini is speaking..." : "Listening..."}
                    </span>
                    <span className="text-[10px] text-[var(--theme-text-secondary)] truncate">
                        Live Session Active • Type to chat
                    </span>
                </div>
            </div>

            <button 
                onClick={onDisconnect}
                className="px-3 py-1.5 text-xs font-medium bg-[var(--theme-bg-input)] hover:bg-[var(--theme-bg-danger)]/10 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-danger)] border border-[var(--theme-border-secondary)] rounded-lg transition-colors"
            >
                End Call
            </button>
        </div>
    );
};
