
import { useState, useEffect } from 'react';
import { ChatMessage } from '../../../types';

interface UseAppTitleProps {
    isLoading: boolean;
    messages: ChatMessage[];
    language: 'en' | 'zh';
    sessionTitle: string;
}

export const useAppTitle = ({ isLoading, messages, language, sessionTitle }: UseAppTitleProps) => {
    const [generationTime, setGenerationTime] = useState(0);

    // Determine the start time of the current generation for accurate timing across renders/tabs
    const currentGenerationStartTime = (() => {
        if (!isLoading) return null;
        // Find the loading message (usually near the end)
        for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i];
            if ((m.role === 'model' || m.role === 'error') && m.isLoading) {
                if (m.generationStartTime) return new Date(m.generationStartTime).getTime();
                if (m.timestamp) return new Date(m.timestamp).getTime();
                return null;
            }
        }
        return null;
    })();

    // Update timer
    useEffect(() => {
        let intervalId: number;
        if (currentGenerationStartTime) {
            const update = () => {
                setGenerationTime(Math.max(0, Math.floor((Date.now() - currentGenerationStartTime) / 1000)));
            };
            update(); // Initial update
            intervalId = window.setInterval(update, 1000);
        }
        return () => clearInterval(intervalId);
    }, [currentGenerationStartTime]);

    const activeGenerationTime = currentGenerationStartTime ? generationTime : 0;

    // Apply to Document Title
    useEffect(() => {
        const updateTitle = () => {
            let statusPrefix = '';
            if (isLoading) {
                const timeDisplay = ` (${activeGenerationTime}s)`;
                statusPrefix = (language === 'zh' ? `生成中${timeDisplay}... | ` : `Generating${timeDisplay}... | `);
            }
            
            // If the title is generic or empty, append app name for context
            const suffix = sessionTitle === 'All Model Chat' ? '' : ' • All Model Chat';
            const cleanTitle = sessionTitle || 'New Chat';
            
            document.title = `${statusPrefix}${cleanTitle}${suffix}`;
        };

        updateTitle();

        // Restore title when user returns to the tab (fixing issues where notifications overwrote it)
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                updateTitle();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [sessionTitle, isLoading, language, activeGenerationTime]);
};
