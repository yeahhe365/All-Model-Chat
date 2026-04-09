
import React, { useState, useRef, useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
import { useCopyToClipboard } from '../useCopyToClipboard';
import { extractTextFromNode } from '../../utils/uiUtils';
import { isLikelyHtml } from '../../utils/codeUtils';
import { triggerDownload, sanitizeFilename } from '../../utils/exportUtils';
import { SideViewContent } from '../../types';
import { translations } from '../../utils/appUtils';

const COLLAPSE_THRESHOLD_PX = 320;

const LANGUAGE_EXTENSION_MAP: Record<string, string> = {
    'javascript': 'js', 'js': 'js', 'node': 'js',
    'typescript': 'ts', 'ts': 'ts',
    'python': 'py', 'py': 'py', 'py3': 'py',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp', 'c++': 'cpp',
    'csharp': 'cs', 'cs': 'cs', 'c#': 'cs',
    'go': 'go', 'golang': 'go',
    'rust': 'rs', 'rs': 'rs',
    'php': 'php',
    'ruby': 'rb', 'rb': 'rb',
    'swift': 'swift',
    'kotlin': 'kt', 'kt': 'kt',
    'html': 'html', 'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'json': 'json',
    'xml': 'xml',
    'svg': 'svg',
    'yaml': 'yaml', 'yml': 'yaml',
    'sql': 'sql',
    'shell': 'sh', 'bash': 'sh', 'sh': 'sh', 'zsh': 'sh',
    'markdown': 'md', 'md': 'md',
    'react': 'jsx', 'jsx': 'jsx',
    'tsx': 'tsx',
    'vue': 'vue',
    'lua': 'lua',
    'r': 'r',
    'dart': 'dart',
    'perl': 'pl', 'pl': 'pl',
    'powershell': 'ps1', 'ps1': 'ps1',
    'dockerfile': 'dockerfile', 'docker': 'dockerfile',
    'batch': 'bat', 'bat': 'bat',
    'text': 'txt', 'txt': 'txt', 'plaintext': 'txt'
};

interface UseCodeBlockProps {
    children: React.ReactNode;
    className?: string;
    expandCodeBlocksByDefault: boolean;
    onOpenHtmlPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void;
    onOpenSidePanel: (content: SideViewContent) => void;
    t: (key: keyof typeof translations, fallback?: string) => string;
}

export const useCodeBlock = ({
    children,
    className,
    expandCodeBlocksByDefault,
    onOpenHtmlPreview,
    onOpenSidePanel,
    t
}: UseCodeBlockProps) => {
    const preRef = useRef<HTMLPreElement>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const [userExpandedPreference, setUserExpandedPreference] = useState<boolean | null>(null);
    
    const { isCopied, copyToClipboard } = useCopyToClipboard();

    // Auto-scroll logic state
    const userHasScrolledUp = useRef(false);
    const isAutoScrolling = useRef(false);
    const prevTextLength = useRef(0);

    // Find the code element
    const codeElement = React.Children.toArray(children).find(
        (child): child is React.ReactElement => React.isValidElement(child)
    );

    const codeText = useMemo(() => {
        if (codeElement) {
            return extractTextFromNode(codeElement.props.children);
        }
        return extractTextFromNode(children);
    }, [children, codeElement]);

    const isExpanded = userExpandedPreference ?? expandCodeBlocksByDefault;

    // Scroll handler
    const handleScroll = useCallback(() => {
        if (isAutoScrolling.current) return;

        const el = preRef.current;
        if (!el) return;
        
        const isAtBottom = Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop) < 25;
        userHasScrolledUp.current = !isAtBottom;
    }, []);

    useEffect(() => {
        const el = preRef.current;
        if (el) {
            el.addEventListener('scroll', handleScroll);
            return () => el.removeEventListener('scroll', handleScroll);
        }

        return undefined;
    }, [handleScroll]);

    // Layout effect for overflow and auto-scroll
    useLayoutEffect(() => {
        const preElement = preRef.current;
        if (!preElement) return;

        const isCurrentlyOverflowing = preElement.scrollHeight > COLLAPSE_THRESHOLD_PX;
        
        if (isCurrentlyOverflowing !== isOverflowing) {
            setIsOverflowing(isCurrentlyOverflowing);
            if (isCurrentlyOverflowing) {
                userHasScrolledUp.current = false;
            }
            return;
        }

        // Auto-scroll Logic
        const currentLength = codeText.length;
        if (!isExpanded && prevTextLength.current > 0 && currentLength > prevTextLength.current) {
            if (!userHasScrolledUp.current) {
                const scrollToBottom = () => {
                    if (preElement) preElement.scrollTop = preElement.scrollHeight;
                };

                isAutoScrolling.current = true;
                scrollToBottom();
                
                requestAnimationFrame(() => {
                    scrollToBottom();
                    setTimeout(() => {
                        isAutoScrolling.current = false;
                    }, 100);
                });
            }
        }
        
        prevTextLength.current = currentLength;

    }, [children, codeText, isExpanded, isOverflowing]);

    const handleToggleExpand = () => {
        setUserExpandedPreference(prev => !(prev ?? expandCodeBlocksByDefault));
    };
    
    const handleCopy = () => {
        if (codeText && !isCopied) {
            copyToClipboard(codeText);
        }
    };

    // Language processing
    const langMatch = className?.match(/language-(\S+)/);
    const language = langMatch ? langMatch[1].toLowerCase() : 'txt';

    let mimeType = 'text/plain';
    if (['html', 'xml', 'svg'].includes(language)) mimeType = 'text/html';
    else if (['javascript', 'js', 'typescript', 'ts'].includes(language)) mimeType = 'application/javascript';
    else if (language === 'css') mimeType = 'text/css';
    else if (language === 'json') mimeType = 'application/json';
    else if (['markdown', 'md'].includes(language)) mimeType = 'text/markdown';

    const contentLooksLikeHtml = isLikelyHtml(codeText);
    const isExplicitHtmlLanguage = ['html', 'xml', 'svg'].includes(language);
    
    const showPreview = contentLooksLikeHtml || isExplicitHtmlLanguage;
    const downloadMimeType = mimeType !== 'text/plain' ? mimeType : (showPreview ? 'text/html' : 'text/plain');
    
    let finalLanguage = language;
    if (language === 'txt' && contentLooksLikeHtml) finalLanguage = 'html';
    else if (language === 'xml' && contentLooksLikeHtml) finalLanguage = 'html';

    const handleOpenSide = () => {
        let displayTitle = t('htmlPreview_subtitle_html', 'HTML Preview');
        if (finalLanguage === 'html') {
            const titleMatch = codeText.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
                displayTitle = titleMatch[1];
            }
        }
        
        onOpenSidePanel({
            type: 'html',
            content: codeText,
            language: finalLanguage,
            title: displayTitle
        });
    };

    const handleFullscreenPreview = (trueFullscreen: boolean) => {
        onOpenHtmlPreview(codeText, { initialTrueFullscreen: trueFullscreen });
    };

    const handleDownload = () => {
        const ext = LANGUAGE_EXTENSION_MAP[finalLanguage.toLowerCase()] || finalLanguage;
        let filename = `snippet.${ext}`;
        
        if (downloadMimeType === 'text/html' || ext === 'html') {
            const titleMatch = codeText.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
                const saneTitle = sanitizeFilename(titleMatch[1].trim());
                if (saneTitle) filename = `${saneTitle}.html`;
            }
        }
        const blob = new Blob([codeText], { type: downloadMimeType });
        const url = URL.createObjectURL(blob);
        triggerDownload(url, filename);
    };

    return {
        preRef,
        isExpanded,
        isOverflowing,
        isCopied,
        finalLanguage,
        showPreview,
        handleToggleExpand,
        handleCopy,
        handleOpenSide,
        handleFullscreenPreview,
        handleDownload,
        codeElement,
        COLLAPSE_THRESHOLD_PX
    };
};
