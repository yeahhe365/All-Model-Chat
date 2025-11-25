
import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { Check, Copy, Maximize2, ChevronDown, ChevronUp, Download, Expand } from 'lucide-react';
import { translations } from '../../utils/appUtils';
import { triggerDownload } from '../../utils/exportUtils';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { MESSAGE_BLOCK_BUTTON_CLASS } from '../../constants/appConstants';

const isLikelyHtml = (textContent: string): boolean => {
  if (!textContent) return false;
  const s = textContent.trim().toLowerCase();
  return s.startsWith('<!doctype html>') || (s.includes('<html') && s.includes('</html>')) || (s.startsWith('<svg') && s.includes('</svg>'));
};

const LanguageIcon: React.FC<{ language: string }> = ({ language }) => {
    const lang = language ? language.toLowerCase() : 'text';
    return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] select-none uppercase tracking-wider font-sans opacity-90">
            {lang}
        </span>
    );
};


interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
  onOpenHtmlPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void;
  expandCodeBlocksByDefault: boolean;
  t: (key: keyof typeof translations) => string;
}

const COLLAPSE_THRESHOLD_PX = 320;

export const CodeBlock: React.FC<CodeBlockProps> = ({ children, className, onOpenHtmlPreview, expandCodeBlocksByDefault, t }) => {
    const preRef = useRef<HTMLPreElement>(null);
    const codeText = useRef<string>('');
    const [isOverflowing, setIsOverflowing] = useState(false);
    
    const hasUserInteracted = useRef(false);
    const [isExpanded, setIsExpanded] = useState(expandCodeBlocksByDefault);
    
    const { isCopied, copyToClipboard } = useCopyToClipboard();

    // Effect to sync with global prop if user has not interacted
    useEffect(() => {
        if (!hasUserInteracted.current) {
            setIsExpanded(expandCodeBlocksByDefault);
        }
    }, [expandCodeBlocksByDefault]);
    
    useLayoutEffect(() => {
        const preElement = preRef.current;
        if (!preElement) return;

        const codeElement = preElement.querySelector('code');
        if (codeElement) {
            codeText.current = codeElement.innerText;
        }

        const isCurrentlyOverflowing = preElement.scrollHeight > COLLAPSE_THRESHOLD_PX;
        
        if (isCurrentlyOverflowing !== isOverflowing) {
            setIsOverflowing(isCurrentlyOverflowing);
        }

        // Apply style directly to prevent flicker.
        // We control max-height via style prop in render now for smoother transitions
    }, [children, isExpanded, isOverflowing]);

    const handleToggleExpand = () => {
        hasUserInteracted.current = true;
        setIsExpanded(prev => !prev);
    };
    
    const handleCopy = () => {
        if (codeText.current && !isCopied) {
            copyToClipboard(codeText.current);
        }
    };

    // Find the code element. It might be an InlineCode component instance now.
    const codeElement = React.Children.toArray(children).find(
        (child): child is React.ReactElement => React.isValidElement(child)
    );
    
    const langMatch = className?.match(/language-(\S+)/);
    let language = langMatch ? langMatch[1] : 'txt';

    let mimeType = 'text/plain';
    if (language === 'html' || language === 'xml' || language === 'svg') mimeType = 'text/html';
    else if (language === 'javascript' || language === 'js' || language === 'typescript' || language === 'ts') mimeType = 'application/javascript';
    else if (language === 'css') mimeType = 'text/css';
    else if (language === 'json') mimeType = 'application/json';
    else if (language === 'markdown' || language === 'md') mimeType = 'text/markdown';

    const likelyHTML = isLikelyHtml(codeText.current);
    const downloadMimeType = mimeType !== 'text/plain' ? mimeType : (likelyHTML ? 'text/html' : 'text/plain');
    const finalLanguage = language === 'txt' && likelyHTML ? 'html' : (language === 'xml' && likelyHTML ? 'html' : language);

    return (
        <div className="group relative my-3 rounded-lg border border-[var(--theme-border-primary)] bg-[var(--theme-bg-code-block)] overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--theme-border-secondary)]/30 bg-[var(--theme-bg-code-block)]/50 backdrop-blur-sm">
                
                <div className="flex items-center gap-2 pl-1">
                    <LanguageIcon language={finalLanguage} />
                </div>
                
                <div className="flex items-center gap-0.5">
                    {likelyHTML && (
                        <>
                            <button className={MESSAGE_BLOCK_BUTTON_CLASS} title={t('code_fullscreen_monitor')} onClick={() => onOpenHtmlPreview(codeText.current, { initialTrueFullscreen: true })}> 
                                <Expand size={14} strokeWidth={2} /> 
                            </button>
                            <button className={MESSAGE_BLOCK_BUTTON_CLASS} title={t('code_fullscreen_modal')} onClick={() => onOpenHtmlPreview(codeText.current)}> 
                                <Maximize2 size={14} strokeWidth={2} /> 
                            </button>
                        </>
                    )}
                    <button className={MESSAGE_BLOCK_BUTTON_CLASS} title={`Download ${finalLanguage.toUpperCase()}`} onClick={() => {
                        let filename = `snippet.${finalLanguage}`;
                        if (downloadMimeType === 'text/html') {
                            const titleMatch = codeText.current.match(/<title[^>]*>([^<]+)<\/title>/i);
                            if (titleMatch && titleMatch[1]) {
                                let saneTitle = titleMatch[1].trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/, '');
                                if (saneTitle.length > 100) saneTitle = saneTitle.substring(0, 100);
                                if (saneTitle) filename = `${saneTitle}.html`;
                            }
                        }
                        const blob = new Blob([codeText.current], { type: downloadMimeType });
                        const url = URL.createObjectURL(blob);
                        triggerDownload(url, filename);
                    }}> 
                        <Download size={14} strokeWidth={2} /> 
                    </button>
                     <button className={MESSAGE_BLOCK_BUTTON_CLASS} title={isCopied ? t('copied_button_title') : t('copy_button_title')} onClick={handleCopy}>
                        {isCopied ? <Check size={14} className="text-[var(--theme-text-success)]" strokeWidth={2} /> : <Copy size={14} strokeWidth={2} />}
                    </button>
                    {isOverflowing && (
                        <button onClick={handleToggleExpand} className={MESSAGE_BLOCK_BUTTON_CLASS} aria-expanded={isExpanded} title={isExpanded ? 'Collapse' : 'Expand'}>
                            {isExpanded ? <ChevronUp size={14} strokeWidth={2} /> : <ChevronDown size={14} strokeWidth={2} />}
                        </button>
                    )}
                </div>
            </div>
            <div className="relative">
                <pre 
                    ref={preRef} 
                    className={`${className} group !m-0 !p-0 !border-none !rounded-none !bg-transparent custom-scrollbar scroll-smooth`}
                    style={{
                        transition: 'max-height 0.3s ease-out',
                        overflowY: 'auto',
                        maxHeight: isExpanded || !isOverflowing ? 'none' : `${COLLAPSE_THRESHOLD_PX}px`,
                    }}
                >
                    {codeElement ? (
                        React.cloneElement(codeElement, {
                            // Add !cursor-text to override the pointer cursor from InlineCode
                            className: `${codeElement.props.className || ''} !p-4 !block font-mono text-[13px] sm:text-sm leading-relaxed !cursor-text`,
                            // Disable the click-to-copy behavior for code blocks
                            onClick: undefined,
                            // Remove the "Click to copy" tooltip
                            title: undefined,
                        })
                    ) : (
                        children
                    )}
                </pre>
                {isOverflowing && !isExpanded && (
                    <div 
                        className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[var(--theme-bg-code-block)] to-transparent cursor-pointer flex items-end justify-center pb-2 group/expand"
                        onClick={handleToggleExpand}
                    >
                        <span className="text-xs font-medium text-[var(--theme-text-tertiary)] group-hover/expand:text-[var(--theme-text-primary)] flex items-center gap-1 bg-[var(--theme-bg-primary)]/80 px-3 py-1 rounded-full shadow-sm border border-[var(--theme-border-secondary)] backdrop-blur-md transition-all transform group-hover/expand:scale-105">
                            <ChevronDown size={12} /> Show more
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
