
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChatInputToolbar } from './ChatInputToolbar';
import { ChatInputActions } from './ChatInputActions';
import { SlashCommandMenu, Command } from './SlashCommandMenu';
import { SelectedFileDisplay } from '../SelectedFileDisplay';
import { UploadedFile, ChatInputToolbarProps, ChatInputActionsProps } from '../../../types';
import { ALL_SUPPORTED_MIME_TYPES, SUPPORTED_IMAGE_MIME_TYPES } from '../../../constants/fileConstants';
import { translations } from '../../../utils/appUtils';
import { SUGGESTIONS_KEYS } from '../../../constants/appConstants';
import { Layers, Languages, ScanText, AudioWaveform, Captions, Lightbulb, FileText, Sparkles, ChevronLeft, ChevronRight, AppWindow, Reply, X } from 'lucide-react';

const SuggestionIcon = ({ iconName, className }: { iconName?: string, className?: string }) => {
    const size = 16;
    switch(iconName) {
        case 'AppWindow': return <AppWindow className={className} size={size} />;
        case 'Layers': return <Layers className={className} size={size} />;
        case 'Languages': return <Languages className={className} size={size} />;
        case 'ScanText': return <ScanText className={className} size={size} />;
        case 'AudioWaveform': return <AudioWaveform className={className} size={size} />;
        case 'Captions': return <Captions className={className} size={size} />;
        case 'Lightbulb': return <Lightbulb className={className} size={size} />;
        case 'FileText': return <FileText className={className} size={size} />;
        default: return <Sparkles className={className} size={size} />;
    }
};

export interface ChatInputAreaProps {
    toolbarProps: ChatInputToolbarProps;
    actionsProps: ChatInputActionsProps;
    slashCommandProps: {
        isOpen: boolean;
        commands: Command[];
        onSelect: (command: Command) => void;
        selectedIndex: number;
    };
    fileDisplayProps: {
        selectedFiles: UploadedFile[];
        onRemove: (id: string) => void;
        onCancelUpload: (id: string) => void;
        onConfigure: (file: UploadedFile) => void;
        onPreview: (file: UploadedFile) => void;
        isGemini3?: boolean;
    };
    inputProps: {
        value: string;
        onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
        onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
        onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
        textareaRef: React.RefObject<HTMLTextAreaElement>;
        placeholder: string;
        disabled: boolean;
        onCompositionStart: () => void;
        onCompositionEnd: () => void;
        onFocus: () => void;
    };
    quoteProps?: {
        quoteText: string;
        onClearQuote: () => void;
    };
    layoutProps: {
        isFullscreen: boolean;
        isPipActive?: boolean;
        isAnimatingSend: boolean;
        isMobile: boolean;
        initialTextareaHeight: number;
        isConverting: boolean;
    };
    fileInputRefs: {
        fileInputRef: React.RefObject<HTMLInputElement>;
        imageInputRef: React.RefObject<HTMLInputElement>;
        folderInputRef: React.RefObject<HTMLInputElement>;
        zipInputRef: React.RefObject<HTMLInputElement>;
        cameraInputRef: React.RefObject<HTMLInputElement>;
        handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        handleFolderChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        handleZipChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    };
    formProps: {
        onSubmit: (e: React.FormEvent) => void;
    };
    suggestionsProps?: {
        show: boolean;
        onSuggestionClick: (suggestion: string) => void;
        onOrganizeInfoClick: (suggestion: string) => void;
    };
    t: (key: keyof typeof translations) => string;
}

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
    toolbarProps,
    actionsProps,
    slashCommandProps,
    fileDisplayProps,
    inputProps,
    quoteProps,
    layoutProps,
    fileInputRefs,
    formProps,
    suggestionsProps,
    t,
}) => {
    const { isFullscreen, isPipActive, isAnimatingSend, isMobile, initialTextareaHeight, isConverting } = layoutProps;
    const { isRecording } = actionsProps;

    const isUIBlocked = inputProps.disabled && !isAnimatingSend && !isRecording;

    const wrapperClass = isFullscreen 
        ? "fixed inset-0 z-[2000] bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] p-4 sm:p-6 flex flex-col fullscreen-enter-animation" 
        : `bg-transparent ${isUIBlocked ? 'opacity-30 pointer-events-none' : ''}`;

    const innerContainerClass = isFullscreen
        ? "w-full max-w-6xl mx-auto flex flex-col h-full"
        : `mx-auto w-full ${!isPipActive ? 'max-w-4xl' : ''} px-2 sm:px-3 pt-1 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]`;

    const formClass = isFullscreen
        ? "flex-grow flex flex-col relative min-h-0"
        : `relative ${isAnimatingSend ? 'form-send-animate' : ''}`;

    const inputContainerClass = isFullscreen
        ? "flex flex-col gap-2 rounded-none sm:rounded-[26px] border-0 sm:border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-input)] px-4 py-4 shadow-none h-full transition-all duration-200 relative"
        : "flex flex-col gap-2 rounded-[26px] border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-input)] p-3 sm:p-4 shadow-lg transition-all duration-300 focus-within:border-[var(--theme-border-focus)] relative";

    // Scroll logic for suggestions
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);
    const [isSuggestionsHovered, setIsSuggestionsHovered] = useState(false);

    const checkScroll = useCallback(() => {
        if (suggestionsRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = suggestionsRef.current;
            setShowLeftArrow(scrollLeft > 5); // Small threshold
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5);
        }
    }, []);

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [checkScroll, suggestionsProps?.show]);

    const handleScroll = (direction: 'left' | 'right') => {
        if (suggestionsRef.current) {
            const scrollAmount = suggestionsRef.current.clientWidth * 0.6;
            suggestionsRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className={wrapperClass} aria-hidden={isUIBlocked}>
            <div className={innerContainerClass}>
                {/* Suggestions Chips */}
                {suggestionsProps && suggestionsProps.show && !isFullscreen && (
                    <div 
                        className="relative group/suggestions mb-2"
                        onMouseEnter={() => setIsSuggestionsHovered(true)}
                        onMouseLeave={() => setIsSuggestionsHovered(false)}
                    >
                        <div 
                            ref={suggestionsRef}
                            onScroll={checkScroll}
                            className="flex gap-2 overflow-x-auto pb-2 px-1 no-scrollbar fade-mask-x scroll-smooth"
                        >
                            {SUGGESTIONS_KEYS.map((s, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => {
                                        const text = t(s.descKey as any);
                                        if ((s as any).specialAction === 'organize' && suggestionsProps.onOrganizeInfoClick) {
                                            suggestionsProps.onOrganizeInfoClick(text);
                                        } else if (suggestionsProps.onSuggestionClick) {
                                            suggestionsProps.onSuggestionClick(text);
                                        }
                                    }}
                                    className="
                                        flex items-center gap-2 px-4 py-2.5 rounded-xl
                                        bg-[var(--theme-bg-input)] hover:bg-[var(--theme-bg-tertiary)]
                                        border border-[var(--theme-border-secondary)]
                                        text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]
                                        text-sm font-medium whitespace-nowrap
                                        transition-all active:scale-95 shadow-sm
                                    "
                                >
                                    <SuggestionIcon iconName={(s as any).icon} />
                                    <span>{t(s.titleKey as any)}</span>
                                </button>
                            ))}
                        </div>

                        {/* Navigation Arrows (Visible on Hover) */}
                        {showLeftArrow && (
                            <button
                                type="button"
                                onClick={() => handleScroll('left')}
                                className={`absolute left-0 top-1/2 -translate-y-[calc(50%+4px)] z-10 p-1.5 rounded-full bg-[var(--theme-bg-primary)]/80 backdrop-blur-sm border border-[var(--theme-border-secondary)] shadow-md text-[var(--theme-text-primary)] transition-all duration-200 hover:scale-110 active:scale-95 ${isSuggestionsHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                                aria-label="Scroll left"
                            >
                                <ChevronLeft size={16} strokeWidth={2} />
                            </button>
                        )}
                        {showRightArrow && (
                            <button
                                type="button"
                                onClick={() => handleScroll('right')}
                                className={`absolute right-0 top-1/2 -translate-y-[calc(50%+4px)] z-10 p-1.5 rounded-full bg-[var(--theme-bg-primary)]/80 backdrop-blur-sm border border-[var(--theme-border-secondary)] shadow-md text-[var(--theme-text-primary)] transition-all duration-200 hover:scale-110 active:scale-95 ${isSuggestionsHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                                aria-label="Scroll right"
                            >
                                <ChevronRight size={16} strokeWidth={2} />
                            </button>
                        )}
                    </div>
                )}

                <ChatInputToolbar {...toolbarProps} />
                
                <form onSubmit={formProps.onSubmit} className={formClass}>
                    <SlashCommandMenu
                        isOpen={slashCommandProps.isOpen}
                        commands={slashCommandProps.commands}
                        onSelect={slashCommandProps.onSelect}
                        selectedIndex={slashCommandProps.selectedIndex}
                        className={isFullscreen ? "absolute bottom-[60px] left-0 right-0 mb-2 w-full max-w-6xl mx-auto z-20" : undefined}
                    />
                    <div className={inputContainerClass}>
                        {fileDisplayProps.selectedFiles.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-2 mb-1 custom-scrollbar px-1">
                                {fileDisplayProps.selectedFiles.map(file => (
                                    <SelectedFileDisplay 
                                        key={file.id} 
                                        file={file} 
                                        onRemove={fileDisplayProps.onRemove} 
                                        onCancelUpload={fileDisplayProps.onCancelUpload}
                                        onConfigure={fileDisplayProps.onConfigure}
                                        onPreview={fileDisplayProps.onPreview}
                                        isGemini3={fileDisplayProps.isGemini3}
                                    />
                                ))}
                            </div>
                        )}

                        {quoteProps && quoteProps.quoteText && (
                            <div className="flex items-start gap-3 p-3 bg-[var(--theme-bg-tertiary)]/50 rounded-xl relative group/quote mb-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--theme-text-tertiary)] rounded-l-xl opacity-50"></div>
                                <div className="flex-shrink-0 text-[var(--theme-text-tertiary)] mt-0.5 ml-2">
                                    <Reply size={16} className="transform -scale-x-100" />
                                </div>
                                <div className="flex-grow min-w-0 pr-6">
                                    <p className="text-sm text-[var(--theme-text-secondary)] line-clamp-3 leading-relaxed font-medium">
                                        {quoteProps.quoteText}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={quoteProps.onClearQuote}
                                    className="absolute top-2 right-2 p-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-full transition-colors"
                                    aria-label="Remove quote"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                        
                        <textarea
                            ref={inputProps.textareaRef}
                            value={inputProps.value}
                            onChange={inputProps.onChange}
                            onKeyDown={inputProps.onKeyDown}
                            onPaste={inputProps.onPaste}
                            onCompositionStart={inputProps.onCompositionStart}
                            onCompositionEnd={inputProps.onCompositionEnd}
                            placeholder={inputProps.placeholder}
                            className="w-full bg-transparent border-0 resize-none px-1 py-1 text-base placeholder:text-[var(--theme-text-tertiary)] focus:ring-0 focus:outline-none custom-scrollbar flex-grow min-h-[24px]"
                            style={{ height: isFullscreen ? '100%' : `${isMobile ? 24 : initialTextareaHeight}px` }}
                            aria-label="Chat message input"
                            onFocus={inputProps.onFocus}
                            disabled={inputProps.disabled || isConverting}
                            rows={1}
                        />
                        <div className="flex items-center justify-between w-full flex-shrink-0 mt-auto pt-1">
                            <ChatInputActions {...actionsProps} />
                            
                            {/* Hidden inputs */}
                            <input type="file" ref={fileInputRefs.fileInputRef} onChange={fileInputRefs.handleFileChange} accept={ALL_SUPPORTED_MIME_TYPES.join(',')} className="hidden" aria-hidden="true" multiple />
                            <input type="file" ref={fileInputRefs.imageInputRef} onChange={fileInputRefs.handleFileChange} accept={SUPPORTED_IMAGE_MIME_TYPES.join(',')} className="hidden" aria-hidden="true" multiple />
                            <input type="file" ref={fileInputRefs.folderInputRef} onChange={fileInputRefs.handleFolderChange} className="hidden" aria-hidden="true" {...({ webkitdirectory: "", directory: "" } as any)} multiple />
                            <input type="file" ref={fileInputRefs.zipInputRef} onChange={fileInputRefs.handleZipChange} accept=".zip" className="hidden" aria-hidden="true" />
                            <input type="file" ref={fileInputRefs.cameraInputRef} onChange={fileInputRefs.handleFileChange} accept="image/*" capture="environment" className="hidden" aria-hidden="true" />
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};
