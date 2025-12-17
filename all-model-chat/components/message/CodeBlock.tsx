
import React, { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react';
import { Check, Copy, Maximize2, ChevronDown, ChevronUp, Download, Expand, Sidebar } from 'lucide-react';
import { translations } from '../../utils/appUtils';
import { triggerDownload } from '../../utils/exportUtils';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { MESSAGE_BLOCK_BUTTON_CLASS } from '../../constants/appConstants';
import { extractTextFromNode } from '../../utils/uiUtils';
import { SideViewContent } from '../../types';

const isLikelyHtml = (textContent: string): boolean => {
  if (!textContent) return false;
  const s = textContent.trim().toLowerCase();
  return s.startsWith('<!doctype html>') || (s.includes('<html') && s.includes('</html>')) || (s.startsWith('<svg') && s.includes('</svg>'));
};

const isLikelyReact = (textContent: string, language: string): boolean => {
    const lang = language.toLowerCase();
    if (['jsx', 'tsx'].includes(lang)) return true;
    
    // For JS/TS, check for React signatures
    if (['js', 'javascript', 'ts', 'typescript'].includes(lang)) {
        return (
            (textContent.includes('import React') || textContent.includes('from "react"') || textContent.includes("from 'react'")) &&
            (textContent.includes('export default') || textContent.includes('return (') || textContent.includes('className='))
        );
    }
    return false;
};

const generateReactPreview = (code: string): string => {
    // Basic transformation to make the code run in a browser standalone environment
    let processedCode = code;

    // Remove imports that won't work in browser without import maps (we provide React globally)
    processedCode = processedCode.replace(/import\s+React.*?from\s+['"]react['"];?/g, '');
    processedCode = processedCode.replace(/import\s+.*?from\s+['"]react-dom\/client['"];?/g, '');
    processedCode = processedCode.replace(/import\s+.*?from\s+['"]lucide-react['"];?/g, ''); // Lucide icons not available in this simple harness

    // Handle export default
    // We want to capture the component name or class to mount it
    // Strategy: Replace 'export default function App' with 'function App', then mount App.
    // Or 'export default App' -> mount App.
    
    const componentNameMatch = processedCode.match(/export\s+default\s+(?:function|class)\s+([A-Z][a-zA-Z0-9]*)/);
    let componentName = 'App'; // Default assumption

    if (componentNameMatch) {
        componentName = componentNameMatch[1];
        // Remove 'export default' but keep 'function Name'
        processedCode = processedCode.replace(/export\s+default\s+/, '');
    } else {
        // Check for 'export default Name;' at the end
        const exportMatch = processedCode.match(/export\s+default\s+([A-Z][a-zA-Z0-9]*);?/);
        if (exportMatch) {
            componentName = exportMatch[1];
            processedCode = processedCode.replace(/export\s+default\s+[A-Z][a-zA-Z0-9]*;?/, '');
        }
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
        body { background-color: #ffffff; color: #1f2937; margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
        #root { width: 100%; height: 100%; }
        /* Error Overlay */
        #error-overlay { display: none; background: #fee2e2; color: #b91c1c; padding: 20px; border-radius: 8px; border: 1px solid #f87171; white-space: pre-wrap; font-family: monospace; }
    </style>
</head>
<body>
    <div id="error-overlay"></div>
    <div id="root"></div>

    <script type="text/babel">
        window.onerror = function(message, source, lineno, colno, error) {
            const el = document.getElementById('error-overlay');
            el.style.display = 'block';
            el.innerText = 'Runtime Error:\\n' + message;
        };

        try {
            const { useState, useEffect, useRef, useMemo, useCallback, useReducer, useContext, createContext } = React;
            
            // --- User Code Start ---
            ${processedCode}
            // --- User Code End ---

            // Mount logic
            const container = document.getElementById('root');
            const root = ReactDOM.createRoot(container);
            
            // Check if the inferred component exists
            if (typeof ${componentName} !== 'undefined') {
                root.render(<${componentName} />);
            } else if (typeof App !== 'undefined') {
                root.render(<App />);
            } else {
                throw new Error("Could not find a component to render. Ensure you export a component named 'App' or use 'export default'.");
            }
        } catch (err) {
            const el = document.getElementById('error-overlay');
            el.style.display = 'block';
            el.innerText = 'Render Error:\\n' + err.message;
        }
    </script>
</body>
</html>`;
};

const LanguageIcon: React.FC<{ language: string }> = ({ language }) => {
    const lang = language ? language.toLowerCase() : 'text';
    
    const getIcon = (l: string) => {
        // Web / Scripting
        if (['js', 'javascript', 'node', 'nodejs'].includes(l)) return 'fa-brands fa-js text-yellow-400';
        if (['ts', 'typescript'].includes(l)) return 'fa-solid fa-code text-blue-400'; // No FA brand for TS yet, use generic code
        if (['py', 'python', 'py3'].includes(l)) return 'fa-brands fa-python text-blue-500';
        if (['php'].includes(l)) return 'fa-brands fa-php text-indigo-400';
        if (['rb', 'ruby', 'rails'].includes(l)) return 'fa-solid fa-gem text-red-500';
        if (['lua'].includes(l)) return 'fa-solid fa-moon text-blue-300';
        if (['pl', 'perl'].includes(l)) return 'fa-solid fa-code text-indigo-500';

        // Frontend
        if (['html', 'htm', 'xml', 'svg'].includes(l)) return 'fa-brands fa-html5 text-orange-600';
        if (['css'].includes(l)) return 'fa-brands fa-css3-alt text-blue-600';
        if (['scss', 'sass', 'less'].includes(l)) return 'fa-brands fa-sass text-pink-500';
        if (['react', 'jsx', 'tsx'].includes(l)) return 'fa-brands fa-react text-cyan-400';
        if (['vue', 'vuejs'].includes(l)) return 'fa-brands fa-vuejs text-emerald-500';
        if (['angular', 'ng'].includes(l)) return 'fa-brands fa-angular text-red-600';
        if (['bootstrap'].includes(l)) return 'fa-brands fa-bootstrap text-purple-600';

        // Compiled / Backend
        if (['java', 'jvm'].includes(l)) return 'fa-brands fa-java text-red-500';
        if (['c', 'cpp', 'c++', 'h', 'hpp'].includes(l)) return 'fa-solid fa-microchip text-blue-600';
        if (['cs', 'csharp', 'c#'].includes(l)) return 'fa-brands fa-microsoft text-purple-500';
        if (['go', 'golang'].includes(l)) return 'fa-brands fa-golang text-cyan-600';
        if (['rust', 'rs'].includes(l)) return 'fa-brands fa-rust text-orange-600';
        if (['swift'].includes(l)) return 'fa-brands fa-swift text-orange-500';
        if (['r'].includes(l)) return 'fa-brands fa-r-project text-blue-400';

        // Mobile / System
        if (['android', 'kotlin', 'kt'].includes(l)) return 'fa-brands fa-android text-green-500';
        if (['apple', 'ios', 'macos', 'objectivec', 'mm'].includes(l)) return 'fa-brands fa-apple text-gray-300';
        if (['linux', 'ubuntu', 'debian', 'arch'].includes(l)) return 'fa-brands fa-linux text-yellow-200';
        if (['windows', 'powershell', 'ps1', 'batch', 'cmd'].includes(l)) return 'fa-brands fa-windows text-blue-400';
        if (['docker', 'dockerfile'].includes(l)) return 'fa-brands fa-docker text-blue-500';
        
        // Data / Config
        if (['sql', 'mysql', 'postgres', 'postgresql', 'sqlite', 'plsql'].includes(l)) return 'fa-solid fa-database text-blue-300';
        if (['json', 'json5'].includes(l)) return 'fa-solid fa-brackets-curly text-yellow-500'; // Valid FA? Use file-code if not
        if (['yaml', 'yml', 'toml', 'ini', 'config'].includes(l)) return 'fa-solid fa-file-code text-purple-400';
        if (['md', 'markdown'].includes(l)) return 'fa-brands fa-markdown text-[var(--theme-text-primary)]';
        if (['csv', 'txt', 'text', 'log'].includes(l)) return 'fa-solid fa-file-lines text-gray-400';
        
        // Tools / Devops
        if (['git', 'diff'].includes(l)) return 'fa-brands fa-git-alt text-orange-500';
        if (['aws'].includes(l)) return 'fa-brands fa-aws text-orange-400';
        if (['jenkins'].includes(l)) return 'fa-brands fa-jenkins text-gray-300';
        if (['npm', 'yarn', 'pnpm'].includes(l)) return 'fa-brands fa-npm text-red-500';
        if (['sh', 'bash', 'zsh', 'shell', 'terminal'].includes(l)) return 'fa-solid fa-terminal text-green-400';
        
        // Visual
        if (['mermaid', 'graphviz', 'dot'].includes(l)) return 'fa-solid fa-project-diagram text-pink-400';
        
        // Fallback
        return 'fa-solid fa-code text-gray-400';
    };

    return (
        <div className="flex items-center gap-2 select-none">
            <i className={`${getIcon(lang)} text-lg w-5 text-center`} aria-hidden="true" />
            <span className="text-[10px] font-bold text-[var(--theme-text-secondary)] uppercase tracking-wider font-sans opacity-90">
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
  t: (key: keyof typeof translations) => string;
  onOpenSidePanel: (content: SideViewContent) => void;
}

const COLLAPSE_THRESHOLD_PX = 320;

export const CodeBlock: React.FC<CodeBlockProps> = ({ children, className, onOpenHtmlPreview, expandCodeBlocksByDefault, t, onOpenSidePanel }) => {
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
                
                // Use scrollTop assignment. Removed 'scroll-smooth' from CSS to ensure instant update.
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

    // Determine if HTML/React features should be active
    const contentLooksLikeHtml = isLikelyHtml(codeText.current);
    const contentLooksLikeReact = isLikelyReact(codeText.current, language);
    const isExplicitHtmlLanguage = ['html', 'xml', 'svg'].includes(language.toLowerCase());
    
    // Show preview if content looks like HTML/React OR if the block is explicitly tagged as such
    const showPreview = contentLooksLikeHtml || contentLooksLikeReact || isExplicitHtmlLanguage;

    const downloadMimeType = mimeType !== 'text/plain' ? mimeType : (showPreview ? 'text/html' : 'text/plain');
    
    // Adjust final language display
    let finalLanguage = language;
    if (language === 'txt' && contentLooksLikeHtml) finalLanguage = 'html';
    else if (language === 'xml' && contentLooksLikeHtml) finalLanguage = 'html';
    else if (contentLooksLikeReact) finalLanguage = 'react';

    const preparePreviewContent = () => {
        if (contentLooksLikeReact || finalLanguage === 'react' || finalLanguage === 'jsx' || finalLanguage === 'tsx') {
            return {
                content: generateReactPreview(codeText.current),
                title: 'React Preview',
                isReact: true
            };
        }
        return {
            content: codeText.current,
            title: 'HTML Preview',
            isReact: false
        };
    };

    const handleOpenSide = () => {
        const { content, title, isReact } = preparePreviewContent();
        
        let displayTitle = title;
        if (!isReact && finalLanguage === 'html') {
            const titleMatch = codeText.current.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
                displayTitle = titleMatch[1];
            }
        }
        
        onOpenSidePanel({
            type: 'html', // SidePanel uses 'html' type which renders inside an iframe
            content: content,
            language: finalLanguage,
            title: displayTitle
        });
    };

    const handleFullscreenPreview = (trueFullscreen: boolean) => {
        const { content } = preparePreviewContent();
        onOpenHtmlPreview(content, { initialTrueFullscreen: trueFullscreen });
    };

    return (
        <div className="group relative my-3 rounded-lg border border-[var(--theme-border-primary)] bg-[var(--theme-bg-code-block)] overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--theme-border-secondary)]/30 bg-[var(--theme-bg-code-block)]/50 backdrop-blur-sm">
                
                <div className="flex items-center gap-2 pl-1 min-w-0">
                    <LanguageIcon language={finalLanguage} />
                </div>
                
                <div className="flex items-center gap-0.5 flex-shrink-0">
                    {showPreview && (
                        <>
                            <button className={`${MESSAGE_BLOCK_BUTTON_CLASS} hidden md:block`} title="Open in Side Panel" onClick={handleOpenSide}>
                                <Sidebar size={14} strokeWidth={2} />
                            </button>
                            <button className={MESSAGE_BLOCK_BUTTON_CLASS} title={t('code_fullscreen_monitor')} onClick={() => handleFullscreenPreview(true)}> 
                                <Expand size={14} strokeWidth={2} /> 
                            </button>
                            <button className={MESSAGE_BLOCK_BUTTON_CLASS} title={t('code_fullscreen_modal')} onClick={() => handleFullscreenPreview(false)}> 
                                <Maximize2 size={14} strokeWidth={2} /> 
                            </button>
                        </>
                    )}
                    <button className={MESSAGE_BLOCK_BUTTON_CLASS} title={`Download ${finalLanguage.toUpperCase()}`} onClick={() => {
                        let filename = `snippet.${finalLanguage === 'react' ? 'tsx' : finalLanguage}`;
                        if (downloadMimeType === 'text/html' && !contentLooksLikeReact) {
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
                    className={`${className} group !m-0 !p-0 !border-none !rounded-none !bg-transparent custom-scrollbar !overflow-x-auto`}
                    style={{
                        transition: 'max-height 0.3s ease-out',
                        overflowY: 'auto',
                        maxHeight: isExpanded || !isOverflowing ? 'none' : `${COLLAPSE_THRESHOLD_PX}px`,
                    }}
                >
                    {codeElement ? (
                        React.cloneElement(codeElement as React.ReactElement, {
                            // Add !cursor-text to override the pointer cursor from InlineCode
                            className: `${codeElement.props.className || ''} !p-4 !block font-mono text-[13px] sm:text-sm leading-relaxed !cursor-text`,
                            // Disable the click-to-copy behavior for code blocks
                            onClick: undefined,
                            // Remove the "Click to copy" tooltip
                            title: undefined,
                        } as any)
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
