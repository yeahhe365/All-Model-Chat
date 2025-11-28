
import React, { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react';
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

// Helper to recursively extract text from React children (handles string, array, elements)
const extractTextFromNode = (node: React.ReactNode): string => {
    if (!node) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(extractTextFromNode).join('');
    if (React.isValidElement(node)) return extractTextFromNode(node.props.children);
    return '';
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

    // Auto-scroll logic state
    const userHasScrolledUp = useRef(false);
    const isAutoScrolling = useRef(false); // Flag to ignore programmatic scrolls
    const prevTextLength = useRef(0);

    // Find the code element (InlineCode or standard code tag)
    const codeElement = React.Children.toArray(children).find(
        (child): child is React.ReactElement => React.isValidElement(child)
    );

    // Synchronously resolve content string using robust extraction
    let currentContent = '';
    if (codeElement) {
        currentContent = extractTextFromNode(codeElement.props.children);
    } else {
        // Fallback if no code element found (direct pre content)
        currentContent = extractTextFromNode(children);
    }

    // Update ref for handlers
    if (currentContent) {
        codeText.current = currentContent;
    }

    // Effect to sync with global prop if user has not interacted
    useEffect(() => {
        if (!hasUserInteracted.current) {
            setIsExpanded(expandCodeBlocksByDefault);
        }
    }, [expandCodeBlocksByDefault]);

    // Handle scroll event to detect user interaction
    const handleScroll = useCallback(() => {
        // If we are currently auto-scrolling, ignore this event to prevent disabling the feature
        if (isAutoScrolling.current) return;

        const el = preRef.current;
        if (!el) return;
        
        // Check if user is at the bottom (with increased tolerance for smooth scroll/sub-pixels)
        // Note: scrollHeight - scrollTop === clientHeight when at bottom
        // We use 25px tolerance to be safer against zoom levels and animation lags
        const isAtBottom = Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop) < 25;
        
        // If not at bottom, user has scrolled up
        userHasScrolledUp.current = !isAtBottom;
    }, []);

    useEffect(() => {
        const el = preRef.current;
        if (el) {
            el.addEventListener('scroll', handleScroll);
            return () => el.removeEventListener('scroll', handleScroll);
        }
    }, [handleScroll]);
    
    useLayoutEffect(() => {
        const preElement = preRef.current;
        if (!preElement) return;

        // Fallback extraction if props extraction yielded nothing (e.g. purely dangerous HTML prop)
        // We verify against innerText to ensure we have the visible text
        if (!currentContent) {
            const domCodeEl = preElement.querySelector('code');
            if (domCodeEl) {
                codeText.current = domCodeEl.textContent || '';
            } else {
                codeText.current = preElement.textContent || '';
            }
        }

        const isCurrentlyOverflowing = preElement.scrollHeight > COLLAPSE_THRESHOLD_PX;
        
        if (isCurrentlyOverflowing !== isOverflowing) {
            setIsOverflowing(isCurrentlyOverflowing);
        }

        // Auto-scroll Logic
        const currentLength = codeText.current.length;
        // Only scroll if:
        // 1. Not expanded (if expanded, window scroll handles it)
        // 2. Content is growing (streaming)
        // 3. We are not treating this as initial history load (prevLength > 0 check)
        // 4. User hasn't manually scrolled up
        if (!isExpanded && prevTextLength.current > 0 && currentLength > prevTextLength.current) {
            if (!userHasScrolledUp.current) {
                // Set flag to true so the scroll handler knows this is programmatic
                isAutoScrolling.current = true;
                
                // Use scrollTop assignment which is instant/smooth based on CSS 'scroll-smooth'
                preElement.scrollTop = preElement.scrollHeight;
                
                // Reset the flag after a short delay to allow the scroll event(s) to fire and be ignored.
                // 100ms is usually enough to cover the immediate DOM update and scroll event dispatch.
                setTimeout(() => {
                    isAutoScrolling.current = false;
                }, 100);
            }
        }
        
        prevTextLength.current = currentLength;

    }, [children, isExpanded, isOverflowing, currentContent]);

    const handleToggleExpand = () => {
        hasUserInteracted.current = true;
        setIsExpanded(prev => !prev);
    };
    
    const handleCopy = () => {
        if (codeText.current && !isCopied) {
            copyToClipboard(codeText.current);
        }
    };
    
    const langMatch = className?.match(/language-(\S+)/);
    let language = langMatch ? langMatch[1] : 'txt';

    let mimeType = 'text/plain';
    if (language === 'html' || language === 'xml' || language === 'svg') mimeType = 'text/html';
    else if (language === 'javascript' || language === 'js' || language === 'typescript' || language === 'ts') mimeType = 'application/javascript';
    else if (language === 'css') mimeType = 'text/css';
    else if (language === 'json') mimeType = 'application/json';
    else if (language === 'markdown' || language === 'md') mimeType = 'text/markdown';

    // Determine if HTML features should be active based on current content OR language tag
    const contentLooksLikeHtml = isLikelyHtml(codeText.current);
    const isExplicitHtmlLanguage = ['html', 'xml', 'svg'].includes(language.toLowerCase());
    
    // Show preview if content looks like HTML OR if the block is explicitly tagged as html/xml/svg
    const showPreview = contentLooksLikeHtml || isExplicitHtmlLanguage;

    const downloadMimeType = mimeType !== 'text/plain' ? mimeType : (showPreview ? 'text/html' : 'text/plain');
    // Adjust final language display if content looks like HTML but was typed as txt
    const finalLanguage = language === 'txt' && contentLooksLikeHtml ? 'html' : (language === 'xml' && contentLooksLikeHtml ? 'html' : language);

    return (
        <div className="group relative my-3 rounded-lg border border-[var(--theme-border-primary)] bg-[var(--theme-bg-code-block)] overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--theme-border-secondary)]/30 bg-[var(--theme-bg-code-block)]/50 backdrop-blur-sm">
                
                <div className="flex items-center gap-2 pl-1 min-w-0">
                    <LanguageIcon language={finalLanguage} />
                </div>
                
                <div className="flex items-center gap-0.5 flex-shrink-0">
                    {showPreview && (
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
                    className={`${className} group !m-0 !p-0 !border-none !rounded-none !bg-transparent custom-scrollbar scroll-smooth !overflow-x-auto`}
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
