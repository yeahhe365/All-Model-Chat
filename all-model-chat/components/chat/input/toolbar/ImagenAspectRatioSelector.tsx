
import React, { useState, useRef } from 'react';
import { Sparkles, ChevronDown, Check } from 'lucide-react';
import { useClickOutside } from '../../../../hooks/useClickOutside';

const AspectRatioIcon = ({ ratio, className }: { ratio: string; className?: string }) => {
    if (ratio === 'Auto') {
        return <Sparkles size={16} className={className} strokeWidth={2} />;
    }
    let styles: React.CSSProperties = {};
    switch (ratio) {
        case '1:1': styles = { width: '20px', height: '20px' }; break;
        case '9:16': styles = { width: '12px', height: '21px' }; break;
        case '16:9': styles = { width: '24px', height: '13.5px' }; break;
        case '4:3': styles = { width: '20px', height: '15px' }; break;
        case '3:4': styles = { width: '15px', height: '20px' }; break;
        case '2:3': styles = { width: '14px', height: '21px' }; break;
        case '3:2': styles = { width: '21px', height: '14px' }; break;
        case '4:5': styles = { width: '16px', height: '20px' }; break;
        case '5:4': styles = { width: '20px', height: '16px' }; break;
        case '21:9': styles = { width: '24px', height: '10px' }; break;
        default: styles = { width: '20px', height: '20px' }; break;
    }
    return <div style={styles} className={`border-2 border-current rounded-sm ${className || ''}`}></div>;
};

const defaultAspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4', '2:3', '3:2', '4:5', '5:4', '21:9'];

interface ImagenAspectRatioSelectorProps {
    aspectRatio: string;
    setAspectRatio: (ratio: string) => void;
    t: (key: string) => string;
    supportedRatios?: string[];
}

export const ImagenAspectRatioSelector: React.FC<ImagenAspectRatioSelectorProps> = ({ aspectRatio, setAspectRatio, t, supportedRatios }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useClickOutside(containerRef, () => setIsOpen(false), isOpen);

    const toggleOpen = () => setIsOpen(!isOpen);

    const ratios = supportedRatios || defaultAspectRatios;

    return (
        <div className="mb-2 relative" ref={containerRef}>
            <button
                onClick={toggleOpen}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)] text-xs font-medium text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]"
                title={t('aspectRatio_title')}
            >
                <AspectRatioIcon ratio={aspectRatio} />
                <span>{aspectRatio}</span>
                <ChevronDown size={14} className={`text-[var(--theme-text-tertiary)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div
                    className="absolute bottom-full left-0 mb-2 z-[50] bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-xl shadow-premium overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col w-40 max-h-[300px]"
                >
                    <div className="overflow-y-auto custom-scrollbar p-1">
                        {ratios.map(r => (
                            <button
                                key={r}
                                onClick={() => { setAspectRatio(r); setIsOpen(false); }}
                                className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-colors ${
                                    aspectRatio === r
                                    ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] font-medium'
                                    : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]/50 hover:text-[var(--theme-text-primary)]'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <AspectRatioIcon ratio={r} />
                                    <span>{r}</span>
                                </div>
                                {aspectRatio === r && <Check size={14} className="text-[var(--theme-text-link)]" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
