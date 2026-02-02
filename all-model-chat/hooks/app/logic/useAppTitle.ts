
import { useState, useMemo, useEffect } from 'react';
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
    const currentGenerationStartTime = useMemo(() => {
        if (!isLoading) return null;
        // Find the loading message (usually near the end)
        for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i];
            if ((m.role === 'model' || m.role === 'error') && m.isLoading) {
                return m.generationStartTime ? new Date(m.generationStartTime).getTime() : Date.now();
            }
        }
        return null;
    }, [messages, isLoading]);

    // Update timer
    useEffect(() => {
        let intervalId: number;
        if (currentGenerationStartTime) {
            const update = () => {
                setGenerationTime(Math.max(0, Math.floor((Date.now() - currentGenerationStartTime) / 1000)));
            };
            update(); // Initial update
            intervalId = window.setInterval(update, 1000);
        } else {
            setGenerationTime(0);
        }
        return () => clearInterval(intervalId);
    }, [currentGenerationStartTime]);

    // Apply to Document Title
    useEffect(() => {
        let statusPrefix = '';
        if (isLoading) {
            const timeDisplay = ` (${generationTime}s)`;
            statusPrefix = (language === 'zh' ? `生成中${timeDisplay}... | ` : `Generating${timeDisplay}... | `);
        }
        document.title = `${statusPrefix}${sessionTitle}`;
    }, [sessionTitle, isLoading, language, generationTime]);
};
