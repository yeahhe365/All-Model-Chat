import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { Check, ClipboardCopy, Maximize, ExternalLink, ChevronDown, ChevronUp, FileCode2 } from 'lucide-react';

const isLikelyHtml = (textContent: string): boolean => {
  if (!textContent) return false;
  const s = textContent.trim().toLowerCase();
  return s.startsWith('<!doctype html>') || (s.includes('<html') && s.includes('</html>')) || (s.startsWith('<svg') && s.includes('</svg>'));
};

const LanguageIcon: React.FC<{ language: string }> = ({ language }) => {
    const lang = language.toLowerCase();

    const styleMap: { [key: string]: React.CSSProperties } = {
        'html': { color: '#E34F26', backgroundColor: 'rgba(227, 79, 38, 0.1)', borderColor: 'rgba(227, 79, 38, 0.2)' },
        'css': { color: '#1572B6', backgroundColor: 'rgba(21, 114, 182, 0.1)', borderColor: 'rgba(21, 114, 182, 0.2)' },
        'js': { color: '#323330', backgroundColor: '#F0DB4F', borderColor: '#C8B438' },
        'javascript': { color: '#323330', backgroundColor: '#F0DB4F', borderColor: '#C8B438' },
        'ts': { color: '#FFFFFF', backgroundColor: '#3178C6', borderColor: '#265E9D' },
        'typescript': { color: '#FFFFFF', backgroundColor: '#3178C6', borderColor: '#265E9D' },
        'python': { color: '#3776AB', backgroundColor: 'rgba(55, 118, 171, 0.1)', borderColor: 'rgba(55, 118, 171, 0.2)' },
        'py': { color: '#3776AB', backgroundColor: 'rgba(55, 118, 171, 0.1)', borderColor: 'rgba(55, 118, 171, 0.2)' },
        'bash': { color: '#4EAA25', backgroundColor: 'rgba(78, 170, 37, 0.1)', borderColor: 'rgba(78, 170, 37, 0.2)' },
        'shell': { color: '#4EAA25', backgroundColor: 'rgba(78, 170, 37, 0.1)', borderColor: 'rgba(78, 170, 37, 0.2)' },
        'sh': { color: '#4EAA25', backgroundColor: 'rgba(78, 170, 37, 0.1)', borderColor: 'rgba(78, 170, 37, 0.2)' },
        'json': { color: '#F16C2E', backgroundColor: 'rgba(241, 108, 46, 0.1)', borderColor: 'rgba(241, 108, 46, 0.2)' },
        'md': { color: '#087ea4', backgroundColor: 'rgba(8, 126, 164, 0.1)', borderColor: 'rgba(8, 126, 164, 0.2)' },
        'markdown': { color: '#087ea4', backgroundColor: 'rgba(8, 126, 164, 0.1)', borderColor: 'rgba(8, 126, 164, 0.2)' },
        'txt': { color: '#6c757d', backgroundColor: 'rgba(108, 117, 125, 0.1)', borderColor: 'rgba(108, 117, 125, 0.2)' },
    };

    const style = styleMap[lang];

    if (style) {
        return (
            <span style={style} className="language-icon-badge">
                {lang}
            </span>
        );
    }

    return (
        <span className="text-xs text-[var(--theme-text-tertiary)] select-none font-mono uppercase">
            {lang}
        </span>
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

    const codeContent = React.Children.only(children) as React.ReactElement;
    
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
        <div className="code-block-container group relative border border-[var(--theme-border-primary)] rounded-md overflow-hidden bg-[var(--markdown-pre-bg)] my-2">
            <div className='code-block-header flex items-center justify-between'>
                <LanguageIcon language={finalLanguage} />
                
                <div className='flex items-center gap-1 sm:gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200'>
                    {likelyHTML && (
                        <>
                            <button className="code-block-utility-button rounded-md" title="True Fullscreen Preview" onClick={() => onOpenHtmlPreview(codeText.current, { initialTrueFullscreen: true })}> <ExternalLink size={14} /> </button>
                            <button className="code-block-utility-button rounded-md" title="Modal Preview" onClick={() => onOpenHtmlPreview(codeText.current)}> <Maximize size={14} /> </button>
                        </>
                    )}
                    <button className="code-block-utility-button rounded-md" title={`Download ${finalLanguage.toUpperCase()}`} onClick={() => {
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
                    }}> <FileCode2 size={14} /> </button>
                     <button className="code-block-utility-button rounded-md" title={copied ? "Copied!" : "Copy code"} onClick={handleCopy}>
                        {copied ? <Check size={14} className="text-[var(--theme-text-success)]" /> : <ClipboardCopy size={14} />}
                    </button>
                    {isOverflowing && (
                        <button onClick={handleToggleExpand} className="code-block-utility-button rounded-md" aria-expanded={isExpanded} title={isExpanded ? 'Collapse' : 'Expand'}>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
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
                {React.cloneElement(codeContent, {
                    // This is a bit of a hack to ensure the inner `code` gets padding
                    // since we removed it from the `pre` tag.
                    className: `${codeContent.props.className || ''} !p-3 sm:!p-4 !block`,
                })}
            </pre>
            {isOverflowing && !isExpanded && (
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[var(--markdown-pre-bg)] to-transparent pointer-events-none"></div>
            )}
        </div>
    );
};