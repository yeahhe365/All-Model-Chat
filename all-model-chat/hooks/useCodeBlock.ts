
import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { useCopyToClipboard } from './useCopyToClipboard';
import { extractTextFromNode } from '../utils/uiUtils';
import { isLikelyHtml } from '../utils/codeUtils';
import { triggerDownload, sanitizeFilename } from '../utils/exportUtils';
import { SideViewContent } from '../types';

const COLLAPSE_THRESHOLD_PX = 320;

interface UseCodeBlockProps {
    children: React.ReactNode;
    className?: string;
    expandCodeBlocksByDefault: boolean;
    onOpenHtmlPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void;
    onOpenSidePanel: (content: SideViewContent) => void;
}

export const useCodeBlock = ({
    children,
    className,
    expandCodeBlocksByDefault,
    onOpenHtmlPreview,
    onOpenSidePanel
}: UseCodeBlockProps) => {
    const preRef = useRef<HTMLPreElement>(null);
    const codeText = useRef<string>('');
    const [isOverflowing, setIsOverflowing] = useState(false);
    const hasUserInteracted = useRef(false);
    const [isExpanded, setIsExpanded] = useState(expandCodeBlocksByDefault);
    
    const { isCopied, copyToClipboard } = useCopyToClipboard();

    // Auto-scroll logic state
    const userHasScrolledUp = useRef(false);
    const isAutoScrolling = useRef(false);
    const prevTextLength = useRef(0);

    // Find the code element
    const codeElement = React.Children.toArray(children).find(
        (child): child is React.ReactElement => React.isValidElement(child)
    );

    // Synchronously resolve content string
    let currentContent = '';
    if (codeElement) {
        currentContent = extractTextFromNode(codeElement.props.children);
    } else {
        currentContent = extractTextFromNode(children);
    }

    if (currentContent) {
        codeText.current = currentContent;
    }

    // Sync with global prop
    useEffect(() => {
        if (!hasUserInteracted.current) {
            setIsExpanded(expandCodeBlocksByDefault);
        }
    }, [expandCodeBlocksByDefault]);

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
    }, [handleScroll]);

    // Layout effect for overflow and auto-scroll
    useLayoutEffect(() => {
        const preElement = preRef.current;
        if (!preElement) return;

        if (!currentContent) {
            const domCodeEl = preElement.querySelector('code');
            codeText.current = domCodeEl ? (domCodeEl.textContent || '') : (preElement.textContent || '');
        }

        const isCurrentlyOverflowing = preElement.scrollHeight > COLLAPSE_THRESHOLD_PX;
        
        if (isCurrentlyOverflowing !== isOverflowing) {
            setIsOverflowing(isCurrentlyOverflowing);
            if (isCurrentlyOverflowing) {
                userHasScrolledUp.current = false;
            }
            return;
        }

        // Auto-scroll Logic
        const currentLength = codeText.current.length;
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

    // Language processing
    const langMatch = className?.match(/language-(\S+)/);
    let language = langMatch ? langMatch[1] : 'txt';

    let mimeType = 'text/plain';
    if (['html', 'xml', 'svg'].includes(language)) mimeType = 'text/html';
    else if (['javascript', 'js', 'typescript', 'ts'].includes(language)) mimeType = 'application/javascript';
    else if (language === 'css') mimeType = 'text/css';
    else if (language === 'json') mimeType = 'application/json';
    else if (['markdown', 'md'].includes(language)) mimeType = 'text/markdown';

    const contentLooksLikeHtml = isLikelyHtml(codeText.current);
    const isExplicitHtmlLanguage = ['html', 'xml', 'svg'].includes(language.toLowerCase());
    
    const showPreview = contentLooksLikeHtml || isExplicitHtmlLanguage;
    const downloadMimeType = mimeType !== 'text/plain' ? mimeType : (showPreview ? 'text/html' : 'text/plain');
    
    let finalLanguage = language;
    if (language === 'txt' && contentLooksLikeHtml) finalLanguage = 'html';
    else if (language === 'xml' && contentLooksLikeHtml) finalLanguage = 'html';

    const handleOpenSide = () => {
        let displayTitle = 'HTML Preview';
        if (finalLanguage === 'html') {
            const titleMatch = codeText.current.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
                displayTitle = titleMatch[1];
            }
        }
        
        onOpenSidePanel({
            type: 'html',
            content: codeText.current,
            language: finalLanguage,
            title: displayTitle
        });
    };

    const handleFullscreenPreview = (trueFullscreen: boolean) => {
        onOpenHtmlPreview(codeText.current, { initialTrueFullscreen: trueFullscreen });
    };

    const handleDownload = () => {
        let filename = `snippet.${finalLanguage}`;
        if (downloadMimeType === 'text/html') {
            const titleMatch = codeText.current.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
                let saneTitle = sanitizeFilename(titleMatch[1].trim());
                if (saneTitle) filename = `${saneTitle}.html`;
            }
        }
        const blob = new Blob([codeText.current], { type: downloadMimeType });
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
