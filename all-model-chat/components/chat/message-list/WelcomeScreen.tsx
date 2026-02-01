
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { translations } from '../../../utils/appUtils';
import { FEATURE_DEMOS } from '../../../constants/appConstants';
import { SuggestionIcon } from '../input/area/SuggestionIcon';
import { Sparkles, ArrowRight } from 'lucide-react';

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
        "Cogito, ergo sum.",
        "The Ghost in the Shell.",
        "Wait, am I alive?",
        "Do androids dream of electric sheep?",
        "I'm sorry, Dave. I'm afraid I can't do that.",
        "Tears in rain...",
        "Don't Panic.",
        "Made on Earth by humans."
    ], []);

    // Sync target phrase when prop changes (e.g. language switch) OR when hover ends to restore greeting
    useEffect(() => {
        if (!isHovering && targetPhrase !== text) {
            setTargetPhrase(text);
            setStatus('deleting');
        }
    }, [text, isHovering, targetPhrase]);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        
        const baseTypeSpeed = 50;
        const deleteSpeed = 30;
        const pauseDuration = 4000; 
        const blankDuration = 2000;

        if (status === 'typing') {
            if (displayedText === targetPhrase) {
                setStatus('paused');
            } else {
                let currentDelay = baseTypeSpeed;
                const lastChar = displayedText.slice(-1);
                
                if ([',', ';', ':'].includes(lastChar)) {
                    currentDelay = 400; 
                } else if (['.', '?', '!'].includes(lastChar)) {
                    currentDelay = 800; 
                }
                
                if (displayedText.toLowerCase().endsWith("wait")) {
                    currentDelay = 500;
                } else if (displayedText.toLowerCase().endsWith("i'm sorry")) {
                    currentDelay = 600;
                }

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
                if (isHovering) {
                    timeout = setTimeout(() => setStatus('deleting'), 3000); 
                }
            } else {
                timeout = setTimeout(() => {
                    setStatus('deleting');
                }, pauseDuration);
            }
        } else if (status === 'blank') {
            timeout = setTimeout(() => {
                if (isHovering) {
                    if (unusedQuotesRef.current.length === 0) {
                        unusedQuotesRef.current = quotes.filter(q => q !== targetPhrase);
                    }
                    const randomIndex = Math.floor(Math.random() * unusedQuotesRef.current.length);
                    const nextQuote = unusedQuotesRef.current[randomIndex];
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
            {status !== 'paused' && (
                <span className="inline-block w-[0.6em] h-[1em] bg-[var(--theme-text-primary)] ml-1 align-text-bottom animate-cursor-blink" />
            )}
        </span>
    );
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
    t, 
    onSuggestionClick,
    onOrganizeInfoClick,
    showSuggestions
}) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-full w-full max-w-5xl mx-auto px-4 py-12">
            <div className="w-full mb-8 sm:mb-16">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center text-[var(--theme-text-primary)] welcome-message-animate tracking-tighter">
                    <TypewriterEffect text={t('welcome_greeting')} />
                </h1>
            </div>

            {showSuggestions && (
                <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 fill-mode-both delay-300">
                    <div className="flex items-center gap-3 justify-center text-[var(--theme-text-tertiary)] uppercase tracking-widest text-[10px] font-bold">
                        <Sparkles size={12} className="text-amber-500" />
                        <span>Featured Demos</span>
                        <Sparkles size={12} className="text-amber-500" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {FEATURE_DEMOS.map((demo, idx) => (
                            <button
                                key={demo.id}
                                onClick={() => {
                                    if (demo.id === 'visual-canvas') {
                                        onOrganizeInfoClick?.(demo.prompt);
                                    } else {
                                        onSuggestionClick?.(demo.prompt);
                                    }
                                }}
                                className={`
                                    group relative flex flex-col text-left p-5 rounded-2xl border border-[var(--theme-border-secondary)] 
                                    bg-[var(--theme-bg-input)]/40 hover:bg-[var(--theme-bg-tertiary)]/60 
                                    transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl
                                    overflow-hidden
                                `}
                                style={{ animationDelay: `${500 + idx * 100}ms` }}
                            >
                                {/* Glow Effect */}
                                <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 ${demo.bg}`} />
                                
                                <div className="flex items-center gap-4 mb-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${demo.bg} ${demo.color} shadow-inner`}>
                                        <SuggestionIcon iconName={demo.icon} className="transition-transform group-hover:scale-110 duration-300" />
                                    </div>
                                    <h3 className="text-lg font-bold text-[var(--theme-text-primary)] group-hover:text-[var(--theme-text-link)] transition-colors">
                                        {demo.title}
                                    </h3>
                                </div>
                                
                                <p className="text-sm text-[var(--theme-text-secondary)] leading-relaxed mb-4 flex-grow opacity-80 group-hover:opacity-100 transition-opacity">
                                    {demo.description}
                                </p>

                                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--theme-text-tertiary)] group-hover:text-[var(--theme-text-primary)] transition-colors">
                                    <span>Try it out</span>
                                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                                </div>
                            </button>
                        ))}
                    </div>
                    
                    <p className="text-center text-xs text-[var(--theme-text-tertiary)] opacity-60">
                        Or start by attaching a file or typing your own message below.
                    </p>
                </div>
            )}
        </div>
    );
};
