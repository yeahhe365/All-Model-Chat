import React, { useState, useEffect } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { formatDuration } from '@/utils/dateHelpers';

interface ThinkingTimerProps {
  startTime: Date;
}

export const ThinkingTimer: React.FC<ThinkingTimerProps> = ({ startTime }) => {
  const { t } = useI18n();
  const [seconds, setSeconds] = useState(() => Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));

  useEffect(() => {
    const start = new Date(startTime).getTime();

    // Use a faster polling interval (100ms) instead of 1000ms.
    // During heavy streaming/rendering, a 1s interval often drifts or gets delayed,
    // causing the timer to appear "stuck" and then jump 2 seconds.
    const interval = setInterval(() => {
      setSeconds(Math.floor((Date.now() - start) / 1000));
    }, 100);

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <span>
      {t('thinking_text')} ({formatDuration(seconds)})
    </span>
  );
};
