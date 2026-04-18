import { useState, useMemo, useEffect } from 'react';
import { ChatMessage } from '../../types';

interface UseAppTitleProps {
  isLoading: boolean;
  messages: ChatMessage[];
  language: 'en' | 'zh';
  sessionTitle: string;
}

export const useAppTitle = ({
  isLoading,
  messages,
  language,
  sessionTitle,
}: UseAppTitleProps) => {
  const [generationTime, setGenerationTime] = useState(0);

  const currentGenerationStartTime = useMemo(() => {
    if (!isLoading) {
      return null;
    }

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if ((message.role === 'model' || message.role === 'error') && message.isLoading) {
        return message.generationStartTime
          ? new Date(message.generationStartTime).getTime()
          : null;
      }
    }

    return null;
  }, [messages, isLoading]);

  useEffect(() => {
    let intervalId: number;

    if (currentGenerationStartTime) {
      const update = () => {
        setGenerationTime(
          Math.max(0, Math.floor((Date.now() - currentGenerationStartTime) / 1000))
        );
      };
      update();
      intervalId = window.setInterval(update, 1000);
    }

    return () => clearInterval(intervalId);
  }, [currentGenerationStartTime]);

  useEffect(() => {
    const updateTitle = () => {
      let statusPrefix = '';
      if (isLoading) {
        const timeDisplay = ` (${currentGenerationStartTime ? generationTime : 0}s)`;
        statusPrefix =
          language === 'zh'
            ? `生成中${timeDisplay}... | `
            : `Generating${timeDisplay}... | `;
      }

      const suffix = sessionTitle === 'All Model Chat' ? '' : ' • All Model Chat';
      const cleanTitle = sessionTitle || 'New Chat';
      document.title = `${statusPrefix}${cleanTitle}${suffix}`;
    };

    updateTitle();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateTitle();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [sessionTitle, isLoading, language, generationTime, currentGenerationStartTime]);
};
