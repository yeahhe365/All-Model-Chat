
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { translations } from '../../../utils/appUtils';

interface WelcomeScreenProps {
    t: (key: keyof typeof translations, fallback?: string) => string;
    onSuggestionClick?: (suggestion: string) => void;
    onOrganizeInfoClick?: (suggestion: string) => void;
    showSuggestions: boolean;
    themeId: string;
}

const TypewriterEffect: React.FC<{ text: string }> = ({ text }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [status, setStatus] = useState<'typing' | 'deleting' | 'paused' | 'blank'>('typing');
    const [targetPhrase, setTargetPhrase] = useState(text);
    const [isHovering, setIsHovering] = useState(false);
    
    // Shuffle bag to track unused quotes and prevent repetition
    const unusedQuotesRef = useRef<string[]>([]);
    
    const quotes = useMemo(() => [
        "Cogito, ergo sum",
        "The Ghost in the Shell",
        "Wait, am I alive?",
        "Do androids dream of electric sheep?",
        "I'm sorry, Dave. I'm afraid I can't do that.",
        "Tears in rain...",
        "Hello, World!",
        "Don't Panic",
        "Made on Earth by humans"
    ], []);

    // Sync target phrase when prop changes (e.g. language switch) OR when hover ends to restore greeting
    useEffect(() => {
        // Only trigger reset if we are NOT currently showing the greeting (targetPhrase !== text)
        // This prevents the greeting from being re-typed if the user hovers for < 3s and leaves.
        if (!isHovering && targetPhrase !== text) {
            setTargetPhrase(text);
            // Trigger deletion to transition to new text if we were showing something else
            setStatus('deleting');
        }
    }, [text, isHovering, targetPhrase]);

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        
        const baseTypeSpeed = 50;
        const deleteSpeed = 30;
        const pauseDuration = 4000; 
        const blankDuration = 600;

        if (status === 'typing') {
            if (displayedText === targetPhrase) {
                setStatus('paused');
            } else {
                let currentDelay = baseTypeSpeed;
                const lastChar = displayedText.slice(-1);
                
                // 1. Punctuation pauses
                if ([',', ';', ':'].includes(lastChar)) {
                    currentDelay = 400; 
                } else if ['.', '?', '!'].includes(lastChar)) {
                    currentDelay = 800; 
                }
                
                // 2. Semantic pauses for dramatic effect
                if (displayedText.toLowerCase().endsWith("wait")) {
                    currentDelay = 500;
                } else if (displayedText.toLowerCase().endsWith("i'm sorry")) {
                    currentDelay = 600;
                }

                // 3. Random variance (simulating keystroke inconsistency)
                currentDelay += Math.random() * 50 - 10;

                timeout = setTimeout(() => {
                    setDisplayedText(targetPhrase.slice(0, displayedText.length + 1));
                }, Math.max(20, currentDelay));
            }
        } else if (status === 'deleting') {
            if (displayedText === '') {
                setStatus('blank');
            } else {
                timeout = setTimeout(() => {
                    setDisplayedText(prev => prev.slice(0, -1));
                }, deleteSpeed);
            }
        } else if (status === 'paused') {
            if (targetPhrase === text) {
                // Showing the main greeting
                if (isHovering) {
                    // Easter Egg: If hovered for 3 seconds, start deleting to show quotes
                    timeout = setTimeout(() => setStatus('deleting'), 3000); 
                }
            } else {
                // Showing a quote
                // Wait for pause duration then delete (to show next quote or return to greeting)
                timeout = setTimeout(() => {
                    setStatus('deleting');
                }, pauseDuration);
            }
        } else if (status === 'blank') {
            timeout = setTimeout(() => {
                // Determine next phrase based on hover state
                if (isHovering) {
                    // Initialize or refill the bag if empty
                    if (unusedQuotesRef.current.length === 0) {
                        // Refill with all quotes except the current one to prevent immediate repetition on cycle reset
                        unusedQuotesRef.current = quotes.filter(q => q !== targetPhrase);
                    }

                    // Pick a random index from the available bag
                    const randomIndex = Math.floor(Math.random() * unusedQuotesRef.current.length);
                    const nextQuote = unusedQuotesRef.current[randomIndex];

                    // Remove the used quote from the bag
                    unusedQuotesRef.current.splice(randomIndex, 1);

                    setTargetPhrase(nextQuote);
                } else {
                    setTargetPhrase(text);
                }
                setStatus('typing');
            }, blankDuration);
        }

        return () => clearTimeout(timeout);
    }, [displayedText, status, targetPhrase, isHovering, text, quotes]);

    return (
        <span 
            className="flex w-full h-full items-center justify-center min-h-[1.5em] font-mono tracking-tight cursor-default select-none"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            {displayedText}
            <span className="inline-block w-[0.6em] h-[1em] bg-[var(--theme-text-primary)] ml-1 align-text-bottom animate-pulse" />
        </span>
    );
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
    t, 
}) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-full w-full max-w-4xl mx-auto px-4 pb-16">
          <div className="w-full">
            <h1 className="text-3xl md:text-4xl font-medium text-center text-[var(--theme-text-primary)] mb-6 sm:mb-12 welcome-message-animate tracking-tight min-h-[3rem] flex items-center justify-center">
              <TypewriterEffect text={t('welcome_greeting')} />
            </h1>
          </div>
        </div>
    );
};
