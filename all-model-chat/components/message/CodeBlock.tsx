
import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { Check, ClipboardCopy, Maximize, ExternalLink, ChevronDown, ChevronUp, FileCode2 } from 'lucide-react';

const isLikelyHtml = (textContent: string): boolean => {
  if (!textContent) return false;
  const s = textContent.trim().toLowerCase();
  return s.startsWith('<!doctype html>') || (s.includes('<html') && s.includes('</html>')) || (s.startsWith('<svg') && s.includes('</svg>'));
};

const LanguageIcon: React.FC<{ language: string }> = ({ language }) => {
    const lang = language.toLowerCase();

    const colorMap: { [key: string]: string } = {
        'html': '#E34F26',
        'css': '#1572B6',
        'js': '#F0DB4F',
        'javascript': '#F0DB4F',
        'ts': '#3178C6',
        'typescript': '#3178C6',
        'python': '#3776AB',
        'py': '#3776AB',
        'bash': '#4EAA25',
        'shell': '#4EAA25',
        'sh': '#4EAA25',
        'json': '#F16C2E',
        'md': '#087ea4',
        'markdown': '#087ea4',
        'txt': '#858585',
        'jsx': '#61DAFB',
        'tsx': '#3178C6',
        'sql': '#e38c00',
        'java': '#b07219',
        'c': '#555555',
        'cpp': '#f34b7d',
        'go': '#00ADD8',
        'rust': '#dea584',
    };

    const color = colorMap[lang] || '#858585';

    return (
        <div className="flex items-center gap-2 select-none">
            <span className="text-xs font-bold tracking-wide uppercase text-[var(--theme-text-secondary)] font-mono">
                {lang}
            </span>
        </div>
    );
};


interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
  onOpenHtmlPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void;
  expandCodeBlocksByDefault: boolean;
}

const COLLAPSE_THRESHOLD_PX = 150;

export const CodeBlock: React.FC<CodeBlockProps> = ({ children, className, onOpenHtmlPreview, expandCodeBlocksByDefault }) => {
    const preRef = useRef<HTMLPreElement>(null);
    const codeText = useRef<string>('');
    const [isOverflowing, setIsOverflowing] = useState(false);
    
    const hasUserInteracted = useRef(false);
    const [isExpanded, setIsExpanded] = useState(expandCodeBlocksByDefault);

    // Effect to sync with global prop if user has not interacted
    useEffect(() => {
        if (!hasUserInteracted.current) {
            setIsExpanded(expandCodeBlocksByDefault);
        }
    }, [expandCodeBlocksByDefault]);
    
    const [copied, setCopied] = useState(false);

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
        const shouldBeCollapsed = isCurrentlyOverflowing && !isExpanded;
        const newMaxHeight = shouldBeCollapsed ? `${COLLAPSE_THRESHOLD_PX}px` : '';

        if (preElement.style.maxHeight !== newMaxHeight) {
            preElement.style.maxHeight = newMaxHeight;
        }

        if (shouldBeCollapsed) {
            preElement.scrollTop = preElement.scrollHeight;
        }
    }, [children, isExpanded, isOverflowing]);

    const handleToggleExpand = () => {
        hasUserInteracted.current = true;
        setIsExpanded(prev => !prev);
    };
    
    const handleCopy = async () => {
        if (!codeText.current || copied) return;
        try {
            await navigator.clipboard.writeText(codeText.current);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const codeElement = React.Children.toArray(children).find(
        (child): child is React.ReactElement => React.isValidElement(child) && child.type === 'code'
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
        <div className="code-block-container group relative border border-[var(--theme-border-primary)] rounded-lg overflow-hidden bg-[var(--markdown-pre-bg)] my-3 shadow-sm transition-all duration-200 hover:border-[var(--theme-border-secondary)]">
            <div className='code-block-header flex items-center justify-between h-9 px-3 bg-[var(--theme-bg-code-block-header)] border-b border-[var(--theme-border-secondary)]'>
                
                <div className="flex items-center gap-2">
                    <LanguageIcon language={finalLanguage} />
                </div>
                
                <div className='flex items-center gap-1'>
                    {likelyHTML && (
                        <>
                            <button className="code-block-utility-button rounded-md hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]" title="True Fullscreen Preview" onClick={() => onOpenHtmlPreview(codeText.current, { initialTrueFullscreen: true })}> <ExternalLink size={14} strokeWidth={1.5} /> </button>
                            <button className="code-block-utility-button rounded-md hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]" title="Modal Preview" onClick={() => onOpenHtmlPreview(codeText.current)}> <Maximize size={14} strokeWidth={1.5} /> </button>
                        </>
                    )}
                    <button className="code-block-utility-button rounded-md hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]" title={`Download ${finalLanguage.toUpperCase()}`} onClick={() => {
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
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    }}> <FileCode2 size={14} strokeWidth={1.5} /> </button>
                     <button className="code-block-utility-button rounded-md hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]" title={copied ? "Copied!" : "Copy code"} onClick={handleCopy}>
                        {copied ? <Check size={14} className="text-[var(--theme-text-success)]" strokeWidth={2} /> : <ClipboardCopy size={14} strokeWidth={1.5} />}
                    </button>
                    {isOverflowing && (
                        <button onClick={handleToggleExpand} className="code-block-utility-button rounded-md hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]" aria-expanded={isExpanded} title={isExpanded ? 'Collapse' : 'Expand'}>
                            {isExpanded ? <ChevronUp size={14} strokeWidth={1.5} /> : <ChevronDown size={14} strokeWidth={1.5} />}
                        </button>
                    )}
                </div>
            </div>
            <pre 
                ref={preRef} 
                className={`${className} group !m-0 !p-0 !border-none !rounded-none !bg-transparent custom-scrollbar`}
                style={{
                    transition: 'max-height 0.3s ease-in-out',
                    overflowY: 'auto',
                }}
            >
                {codeElement ? (
                    React.cloneElement(codeElement, {
                        // This is a bit of a hack to ensure the inner `code` gets padding
                        // since we removed it from the `pre` tag.
                        className: `${codeElement.props.className || ''} !p-3 sm:!p-4 !block`,
                    })
                ) : (
                    children
                )}
            </pre>
            {isOverflowing && !isExpanded && (
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[var(--markdown-pre-bg)] to-transparent pointer-events-none flex items-end justify-center pb-2">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--theme-text-tertiary)] opacity-50 bg-[var(--markdown-pre-bg)] px-2 py-0.5 rounded-full mb-1 shadow-sm border border-[var(--theme-border-secondary)]/50">Expand to see more</span>
                </div>
            )}
        </div>
    );
};
