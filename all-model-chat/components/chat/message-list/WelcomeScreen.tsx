
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { translations } from '../../../utils/appUtils';
import { Sparkles, Box, BarChart3, Search, Wand2, ArrowRight } from 'lucide-react';

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

const DemoCard: React.FC<{ 
    title: string; 
    description: string; 
    icon: React.ReactNode; 
    color: string;
    onClick: () => void;
}> = ({ title, description, icon, color, onClick }) => (
    <button
        onClick={onClick}
        className="flex flex-col items-start p-5 rounded-2xl bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] hover:border-[var(--theme-border-focus)] transition-all duration-300 group text-left shadow-sm hover:shadow-xl hover:-translate-y-1"
    >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${color}`}>
            {icon}
        </div>
        <h3 className="text-sm font-bold text-[var(--theme-text-primary)] mb-1 group-hover:text-[var(--theme-text-link)] transition-colors">
            {title}
        </h3>
        <p className="text-xs text-[var(--theme-text-tertiary)] leading-relaxed line-clamp-2">
            {description}
        </p>
        <div className="mt-4 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[var(--theme-text-link)] opacity-0 group-hover:opacity-100 transition-opacity">
            Try Demo <ArrowRight size={10} />
        </div>
    </button>
);

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
    t,
    onSuggestionClick,
    onOrganizeInfoClick,
    showSuggestions
}) => {
    const demos = [
        {
            title: "3D Voxel Generator",
            description: "Create an interactive 3D character using Three.js in the Canvas view.",
            icon: <Box size={20} />,
            color: "bg-rose-500/10 text-rose-500",
            prompt: "Using the Canvas system, create an interactive 3D voxel model of a cyber-cat sitting on a neon base. Use Three.js and OrbitControls.",
            isCanvas: true
        },
        {
            title: "Smart Data Insights",
            description: "Turn complex data into an interactive dashboard with charts.",
            icon: <BarChart3 size={20} />,
            color: "bg-blue-500/10 text-blue-500",
            prompt: "Create an interactive sales performance dashboard for a fictional tech company. Include a table of monthly revenue and a pie chart for product categories using pure HTML/CSS or ECharts.",
            isCanvas: true
        },
        {
            title: "Deep Web Research",
            description: "A comprehensive report generated using real-time search grounding.",
            icon: <Search size={20} />,
            color: "bg-emerald-500/10 text-emerald-500",
            prompt: "Perform a deep search on the latest breakthroughs in sustainable energy battery tech from late 2024 to today. Provide a cited report with key companies and tech specs.",
            isCanvas: false
        }
    ];

    const handleDemoClick = (demo: typeof demos[0]) => {
        if (demo.isCanvas && onOrganizeInfoClick) {
            onOrganizeInfoClick(demo.prompt);
        } else if (onSuggestionClick) {
            onSuggestionClick(demo.prompt);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-full w-full max-w-4xl mx-auto px-4 pb-16">
            <div className="w-full">
                <h1 className="text-3xl md:text-4xl font-medium text-center text-[var(--theme-text-primary)] mb-8 sm:mb-12 welcome-message-animate tracking-tight min-h-[3rem] flex items-center justify-center">
                    <TypewriterEffect text={t('welcome_greeting')} />
                </h1>
            </div>

            {showSuggestions && (
                <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                    <div className="col-span-full flex items-center gap-2 mb-2 px-1">
                        <Sparkles size={16} className="text-amber-500" />
                        <span className="text-xs font-bold uppercase tracking-widest text-[var(--theme-text-tertiary)]">
                            Featured Demos
                        </span>
                    </div>
                    {demos.map((demo, i) => (
                        <DemoCard 
                            key={i}
                            {...demo}
                            onClick={() => handleDemoClick(demo)}
                        />
                    ))}
                </div>
            )}
            
            <div className="mt-12 text-center welcome-message-animate delay-500 opacity-60">
                <p className="text-xs text-[var(--theme-text-tertiary)]">
                    Type <code className="bg-[var(--theme-bg-tertiary)] px-1.5 py-0.5 rounded border border-[var(--theme-border-secondary)] font-mono">/help</code> to see all available commands.
                </p>
            </div>
        </div>
    );
};
