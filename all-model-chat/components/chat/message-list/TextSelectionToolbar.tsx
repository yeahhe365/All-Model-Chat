
import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { Quote, Copy, Check, CornerRightDown, Volume2, X, Loader2, GripVertical, Search } from 'lucide-react';
import { createPortal } from 'react-dom';
import { convertHtmlToMarkdown } from '../../../utils/htmlToMarkdown';
import { translations } from '../../../../utils/appUtils';
import { IconGoogle } from '../../icons/CustomIcons';

interface TextSelectionToolbarProps {
    onQuote: (text: string) => void;
    onInsert?: (text: string) => void;
    onTTS?: (text: string) => Promise<string | null>;
    containerRef: React.RefObject<HTMLElement>;
    t?: (key: keyof typeof translations) => string;
}

export const TextSelectionToolbar: React.FC<TextSelectionToolbarProps> = ({ onQuote, onInsert, onTTS, containerRef, t }) => {
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
    const [selectedText, setSelectedText] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    
    // Store selection bounds for smart positioning (flipping)
    const selectionBoundsRef = useRef<DOMRect | null>(null);
    
    // Audio Player State
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Dragging State refs (using refs for performance/no-lag)
    const toolbarRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const rafRef = useRef<number | null>(null);

    // Cleanup audio URL on unmount or new selection
    useEffect(() => {
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    // Bounds checking / Auto-repositioning
    useLayoutEffect(() => {
        if (!position || !toolbarRef.current) return;

        const toolbar = toolbarRef.current;
        const { width, height } = toolbar.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const padding = 10;

        let correctedLeft = position.left;
        let correctedTop = position.top;

        // Horizontal Constraint (accounting for translateX(-50%))
        // The 'left' style positions the center of the element
        const halfWidth = width / 2;
        
        // Ensure left edge is inside
        if (correctedLeft - halfWidth < padding) {
            correctedLeft = padding + halfWidth;
        }
        // Ensure right edge is inside
        if (correctedLeft + halfWidth > viewportWidth - padding) {
            correctedLeft = viewportWidth - padding - halfWidth;
        }

        // Vertical Constraint
        // Check top edge
        if (correctedTop < padding) {
            // If hitting top, try to flip to below selection if we have bounds
            if (selectionBoundsRef.current) {
                const belowPos = selectionBoundsRef.current.bottom + 10;
                // Check if below pos fits in viewport
                if (belowPos + height < viewportHeight - padding) {
                    correctedTop = belowPos;
                } else {
                    // If neither fits perfectly, clamp to top padding
                    correctedTop = padding;
                }
            } else {
                correctedTop = padding;
            }
        }
        // Check bottom edge
        if (correctedTop + height > viewportHeight - padding) {
            correctedTop = viewportHeight - padding - height;
        }

        // Only update state if correction is significant to avoid loops
        if (Math.abs(correctedLeft - position.left) > 1 || Math.abs(correctedTop - position.top) > 1) {
            setPosition({ left: correctedLeft, top: correctedTop });
        }
    }, [position, selectedText]);

    // Drag Handlers
    const handleDragStart = (e: React.MouseEvent) => {
        if (e.button !== 0 || !position || !toolbarRef.current) return; // Only left click
        e.preventDefault();
        e.stopPropagation();
        
        isDragging.current = true;
        
        // CRITICAL: Disable transitions during drag to prevent "rubber banding" lag
        toolbarRef.current.style.transition = 'none';
        
        dragOffset.current = {
            x: e.clientX - position.left,
            y: e.clientY - position.top
        };
        
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
    };

    const handleDragMove = useCallback((e: MouseEvent) => {
        if (!isDragging.current || !toolbarRef.current) return;
        
        // Use requestAnimationFrame to throttle updates to the screen refresh rate
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        
        rafRef.current = requestAnimationFrame(() => {
            if (!isDragging.current || !toolbarRef.current) return;
            
            const toolbar = toolbarRef.current;
            const { width, height } = toolbar.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const padding = 10;

            let newLeft = e.clientX - dragOffset.current.x;
            let newTop = e.clientY - dragOffset.current.y;
            
            // Clamp Dragging
            const halfWidth = width / 2;
            newLeft = Math.max(padding + halfWidth, Math.min(newLeft, viewportWidth - padding - halfWidth));
            newTop = Math.max(padding, Math.min(newTop, viewportHeight - padding - height));

            // Direct DOM update for zero latency
            toolbarRef.current.style.left = `${newLeft}px`;
            toolbarRef.current.style.top = `${newTop}px`;
        });
    }, []);

    const handleDragEnd = useCallback((e: MouseEvent) => {
        if (!isDragging.current || !toolbarRef.current) return;
        isDragging.current = false;
        document.body.style.userSelect = '';
        
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
        
        // Calculate clamped final position to sync state
        const toolbar = toolbarRef.current;
        const { width, height } = toolbar.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const padding = 10;

        let newLeft = e.clientX - dragOffset.current.x;
        let newTop = e.clientY - dragOffset.current.y;

        const halfWidth = width / 2;
        newLeft = Math.max(padding + halfWidth, Math.min(newLeft, viewportWidth - padding - halfWidth));
        newTop = Math.max(padding, Math.min(newTop, viewportHeight - padding - height));
        
        setPosition({ top: newTop, left: newLeft });
        
        // Restore transition if needed
        if (toolbarRef.current) {
            toolbarRef.current.style.transition = '';
        }
    }, []);

    // Cleanup drag listeners on unmount
    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleDragMove);
            document.removeEventListener('mouseup', handleDragEnd);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [handleDragMove, handleDragEnd]);

    useEffect(() => {
        const handleSelectionChange = () => {
            // If playing audio or loading, do not clear selection toolbar on click
            if (isPlayingAudio || isLoadingAudio) return;

            const selection = window.getSelection();
            if (!selection || selection.isCollapsed || !selection.rangeCount) {
                setPosition(null);
                selectionBoundsRef.current = null;
                setSelectedText('');
                setIsCopied(false);
                return;
            }

            const range = selection.getRangeAt(0);
            const commonAncestor = range.commonAncestorContainer;
            
            // Handle valid container context
            const containerEl = containerRef.current;
            if (containerEl && !containerEl.contains(commonAncestor)) {
                setPosition(null);
                selectionBoundsRef.current = null;
                return;
            }

            // Avoid showing inside inputs/textareas
            const targetElement = commonAncestor.nodeType === 1 ? commonAncestor as HTMLElement : commonAncestor.parentElement;
            if (targetElement && (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA')) {
                setPosition(null);
                selectionBoundsRef.current = null;
                return;
            }

            // Extract HTML content from selection
            const container = document.createElement('div');
            container.appendChild(range.cloneContents());
            const html = container.innerHTML;

            // Convert to Markdown to preserve formatting (Code blocks, LaTeX, Bolding)
            const text = convertHtmlToMarkdown(html).trim();

            if (!text) {
                setPosition(null);
                selectionBoundsRef.current = null;
                setSelectedText('');
                return;
            }

            const rect = range.getBoundingClientRect();
            selectionBoundsRef.current = rect;
            
            // Calculate initial position (centered above selection)
            // Correction logic in useLayoutEffect will fix overflow
            setPosition({
                top: rect.top - 50, 
                left: rect.left + (rect.width / 2)
            });
            setSelectedText(text);
        };

        // Use document events to catch selection changes globally but filter inside handler
        document.addEventListener('selectionchange', handleSelectionChange);
        document.addEventListener('mouseup', handleSelectionChange);
        document.addEventListener('keyup', handleSelectionChange);

        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            document.removeEventListener('mouseup', handleSelectionChange);
            document.removeEventListener('keyup', handleSelectionChange);
        };
    }, [containerRef, isPlayingAudio, isLoadingAudio]);

    const handleQuoteClick = (e: React.MouseEvent) => {
        e.preventDefault(); 
        e.stopPropagation();
        onQuote(selectedText);
        // Clear selection
        window.getSelection()?.removeAllRanges();
        setPosition(null);
    };

    const handleInsertClick = (e: React.MouseEvent) => {
        e.preventDefault(); 
        e.stopPropagation();
        if (onInsert) {
            onInsert(selectedText);
        }
        // Clear selection
        window.getSelection()?.removeAllRanges();
        setPosition(null);
    };

    const handleCopyClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(selectedText).then(() => {
            setIsCopied(true);
            setTimeout(() => {
                 window.getSelection()?.removeAllRanges();
                 setPosition(null);
                 setIsCopied(false);
            }, 1000);
        });
    };
    
    const handleSearchClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(`https://www.google.com/search?q=${encodeURIComponent(selectedText)}`, '_blank', 'noopener,noreferrer');
        window.getSelection()?.removeAllRanges();
        setPosition(null);
    };

    const handleTTSClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!onTTS || !selectedText) return;
        
        setIsLoadingAudio(true);
        try {
            const url = await onTTS(selectedText);
            if (url) {
                if (audioUrl) URL.revokeObjectURL(audioUrl);
                setAudioUrl(url);
                setIsPlayingAudio(true);
            }
        } catch (err) {
            console.error("TTS Failed:", err);
        } finally {
            setIsLoadingAudio(false);
        }
    };

    const handleCloseAudio = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsPlayingAudio(false);
        setAudioUrl(null);
        // Clear selection
        window.getSelection()?.removeAllRanges();
        setPosition(null);
    };

    if (!position) return null;

    return createPortal(
        <div 
            ref={toolbarRef}
            className="fixed z-[9999] flex items-center p-0.5 gap-0 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)] rounded-full shadow-lg pointer-events-auto animate-in fade-in zoom-in"
            style={{ 
                top: position.top, 
                left: position.left, 
                transform: 'translateX(-50%)',
                // Ensure no transition interferes with dragging
                transition: isDragging.current ? 'none' : 'opacity 0.2s, transform 0.2s'
            }}
        >
            {isPlayingAudio && audioUrl ? (
                <div className="flex items-center gap-1 pl-1 pr-2 py-1">
                    {/* Drag Handle */}
                    <div 
                        onMouseDown={handleDragStart}
                        className="cursor-grab active:cursor-grabbing p-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors touch-none"
                        title="Drag to move"
                    >
                        <GripVertical size={14} />
                    </div>
                    
                    <audio 
                        ref={audioRef} 
                        src={audioUrl} 
                        controls 
                        autoPlay 
                        className="h-8 w-80 rounded-full focus:outline-none"
                    />
                    <button 
                        onClick={handleCloseAudio}
                        className="p-1.5 rounded-full text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] ml-1"
                    >
                        <X size={16} />
                    </button>
                </div>
            ) : isLoadingAudio ? (
                <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[var(--theme-text-primary)]">
                    <Loader2 size={14} className="animate-spin text-[var(--theme-text-link)]" />
                    <span>Generating Audio...</span>
                </div>
            ) : (
                <>
                    <button
                        onMouseDown={handleQuoteClick}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-[var(--theme-bg-tertiary)] rounded-full transition-all active:scale-95 text-xs font-medium text-[var(--theme-text-primary)]"
                        title="Quote Selection"
                    >
                        <Quote size={14} className="text-[var(--theme-text-link)]" />
                        <span>Quote</span>
                    </button>
                    
                    {onInsert && (
                        <>
                            <div className="w-px h-4 bg-[var(--theme-border-secondary)] mx-0.5" />
                            <button
                                onMouseDown={handleInsertClick}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-[var(--theme-bg-tertiary)] rounded-full transition-all active:scale-95 text-xs font-medium text-[var(--theme-text-primary)]"
                                title={t ? t('fill_input') : "Fill Input"}
                            >
                                <CornerRightDown size={14} className="text-[var(--theme-text-secondary)]" />
                                <span>{t ? t('fill_input') : "Fill Input"}</span>
                            </button>
                        </>
                    )}

                    <div className="w-px h-4 bg-[var(--theme-border-secondary)] mx-0.5" />
                    
                    <button
                        onMouseDown={handleCopyClick}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-[var(--theme-bg-tertiary)] rounded-full transition-all active:scale-95 text-xs font-medium text-[var(--theme-text-primary)]"
                        title="Copy Raw Text"
                    >
                        {isCopied ? (
                            <Check size={14} className="text-[var(--theme-text-success)]" />
                        ) : (
                            <Copy size={14} className="text-[var(--theme-text-tertiary)]" />
                        )}
                        <span>{isCopied ? 'Copied' : 'Copy'}</span>
                    </button>

                    <div className="w-px h-4 bg-[var(--theme-border-secondary)] mx-0.5" />

                    <button
                        onMouseDown={handleSearchClick}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-[var(--theme-bg-tertiary)] rounded-full transition-all active:scale-95 text-xs font-medium text-[var(--theme-text-primary)]"
                        title="Search"
                    >
                        <IconGoogle size={14} />
                        <span>Search</span>
                    </button>

                    {onTTS && (
                        <>
                            <div className="w-px h-4 bg-[var(--theme-border-secondary)] mx-0.5" />
                            <button
                                onMouseDown={handleTTSClick}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-[var(--theme-bg-tertiary)] rounded-full transition-all active:scale-95 text-xs font-medium text-[var(--theme-text-primary)]"
                                title="Read Aloud (TTS)"
                            >
                                <Volume2 size={14} className="text-purple-500" />
                                <span>TTS</span>
                            </button>
                        </>
                    )}
                </>
            )}
        </div>,
        document.body
    );
};
