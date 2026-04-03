
import React, { useState, useRef } from 'react';
import { translations } from '../../../utils/appUtils';

// Hooks
import { useSelectionPosition } from '../../../hooks/text-selection/useSelectionPosition';
import { useSelectionDrag } from '../../../hooks/text-selection/useSelectionDrag';
import { useSelectionAudio } from '../../../hooks/text-selection/useSelectionAudio';

// Components
import { ToolbarContainer } from './text-selection/ToolbarContainer';
import { AudioPlayerView } from './text-selection/AudioPlayerView';
import { StandardActionsView } from './text-selection/StandardActionsView';

interface TextSelectionToolbarProps {
    onQuote: (text: string) => void;
    onInsert?: (text: string) => void;
    onTTS?: (text: string) => Promise<string | null>;
    containerRef: React.RefObject<HTMLElement>;
    t?: (key: keyof typeof translations) => string;
}

export const TextSelectionToolbar: React.FC<TextSelectionToolbarProps> = ({ onQuote, onInsert, onTTS, containerRef, t }) => {
    const toolbarRef = useRef<HTMLDivElement>(null);
    const [isCopied, setIsCopied] = useState(false);

    // 1. Audio Logic
    const audioState = useSelectionAudio();

    // 2. Position Logic
    const { position, setPosition, selectedText, clearSelection } = useSelectionPosition({
        containerRef,
        isAudioActive: audioState.isPlaying || audioState.isLoading,
        toolbarRef
    });

    // 3. Drag Logic
    const { handleDragStart, isDragging } = useSelectionDrag({
        toolbarRef,
        position,
        onPositionChange: setPosition
    });

    // --- Actions Handlers ---

    const handleQuoteClick = (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        onQuote(selectedText);
        clearSelection();
    };

    const handleInsertClick = (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (onInsert) onInsert(selectedText);
        clearSelection();
    };

    const handleCopyClick = (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        navigator.clipboard.writeText(selectedText).then(() => {
            setIsCopied(true);
            setTimeout(() => {
                 clearSelection();
                 setIsCopied(false);
            }, 1000);
        });
    };
    
    const handleSearchClick = (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        window.open(`https://www.google.com/search?q=${encodeURIComponent(selectedText)}`, '_blank', 'noopener,noreferrer');
        clearSelection();
    };

    const handleTTSClick = async (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (!onTTS || !selectedText) return;
        
        audioState.setIsLoading(true);
        try {
            const url = await onTTS(selectedText);
            if (url) {
                audioState.play(url);
            }
        } catch (err) {
            console.error("TTS Failed:", err);
        } finally {
            audioState.setIsLoading(false);
        }
    };

    const handleCloseAudio = (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        audioState.stop();
        clearSelection();
    };

    if (!position) return null;

    return (
        <ToolbarContainer ref={toolbarRef} position={position} isDragging={isDragging.current}>
            {(audioState.isPlaying || audioState.isLoading) ? (
                <AudioPlayerView 
                    audioUrl={audioState.audioUrl}
                    isLoading={audioState.isLoading}
                    audioRef={audioState.audioRef}
                    onDragStart={handleDragStart}
                    onClose={handleCloseAudio}
                />
            ) : (
                <StandardActionsView 
                    onQuote={handleQuoteClick}
                    onInsert={onInsert ? handleInsertClick : undefined}
                    onCopy={handleCopyClick}
                    onSearch={handleSearchClick}
                    onTTS={onTTS ? handleTTSClick : undefined}
                    isCopied={isCopied}
                    t={t}
                />
            )}
        </ToolbarContainer>
    );
};
