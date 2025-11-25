
import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { ChatMessage } from '../../types';
import { translations } from '../../utils/appUtils';

interface PerformanceMetricsProps {
    message: ChatMessage;
    t: (key: keyof typeof translations) => string;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ message, t }) => {
    const { 
        promptTokens, 
        completionTokens, 
        totalTokens, 
        generationStartTime, 
        generationEndTime, 
        isLoading 
    } = message;

    const [elapsedTime, setElapsedTime] = useState<number>(0);

    useEffect(() => {
        if (!generationStartTime) return;
        const startTime = new Date(generationStartTime).getTime();
        
        if (isLoading) {
            const updateTimer = () => setElapsedTime((Date.now() - startTime) / 1000);
            updateTimer();
            const intervalId = setInterval(updateTimer, 100);
            return () => clearInterval(intervalId);
        } else if (generationEndTime) {
            const endTime = new Date(generationEndTime).getTime();
            setElapsedTime((endTime - startTime) / 1000);
        }
    }, [generationStartTime, generationEndTime, isLoading]);

    // Calculate tokens per second
    const tokensPerSecond = (completionTokens && elapsedTime > 0) 
        ? completionTokens / elapsedTime 
        : 0;

    const showTokens = typeof promptTokens === 'number' || typeof completionTokens === 'number' || typeof totalTokens === 'number';
    const showTimer = isLoading || (generationStartTime && generationEndTime);

    if (!showTokens && !showTimer) return null;

    return (
        <div className="mt-2 flex justify-end items-center flex-wrap gap-x-3 gap-y-1 text-[10px] sm:text-[11px] text-[var(--theme-text-tertiary)] font-mono select-none opacity-80">
            {showTokens && (
                <div className="flex items-center gap-1.5 bg-[var(--theme-bg-tertiary)]/30 px-2 py-0.5 rounded-md border border-[var(--theme-border-secondary)]/30" title="Token Usage">
                    <span className="flex items-center gap-2">
                        <span>Input: {promptTokens ?? 0}</span>
                        <span className="w-px h-3 bg-[var(--theme-text-tertiary)]/20"></span>
                        <span>Output: {completionTokens ?? 0}</span>
                        <span className="w-px h-3 bg-[var(--theme-text-tertiary)]/20"></span>
                        <span className="font-semibold text-[var(--theme-text-secondary)]">Total: {totalTokens ?? ((promptTokens||0) + (completionTokens||0))}</span>
                    </span>
                </div>
            )}

            {tokensPerSecond > 0 && (
                <div className="flex items-center gap-1 text-[var(--theme-text-secondary)]/90" title="Generation Speed">
                    <Zap size={11} className="text-amber-400 fill-amber-400/20" strokeWidth={2} />
                    <span>{tokensPerSecond.toFixed(1)} t/s</span>
                </div>
            )}

            {showTimer && (
                <div className="tabular-nums opacity-80" title="Generation Time">
                    {elapsedTime.toFixed(1)}s
                </div>
            )}
        </div>
    );
};
