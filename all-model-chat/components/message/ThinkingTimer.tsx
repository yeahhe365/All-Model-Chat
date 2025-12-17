
import React, { useState, useEffect } from 'react';
import { translations, formatDuration } from '../../utils/appUtils';

interface ThinkingTimerProps {
    startTime: Date;
    t: (key: keyof typeof translations) => string;
}

export const ThinkingTimer: React.FC<ThinkingTimerProps> = ({ startTime, t }) => {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        const start = new Date(startTime).getTime();
        const interval = setInterval(() => {
            setSeconds(Math.floor((Date.now() - start) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    return <span>{t('thinking_text')} ({formatDuration(seconds)})</span>;
};
