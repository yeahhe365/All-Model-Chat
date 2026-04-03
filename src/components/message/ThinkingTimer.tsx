
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
        
        // Initial calculation
        setSeconds(Math.floor((Date.now() - start) / 1000));

        // Use a faster polling interval (100ms) instead of 1000ms.
        // During heavy streaming/rendering, a 1s interval often drifts or gets delayed,
        // causing the timer to appear "stuck" and then jump 2 seconds.
        const interval = setInterval(() => {
            setSeconds(Math.floor((Date.now() - start) / 1000));
        }, 100);
        
        return () => clearInterval(interval);
    }, [startTime]);

    return <span>{t('thinking_text')} ({formatDuration(seconds)})</span>;
};
