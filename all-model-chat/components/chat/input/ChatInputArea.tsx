
import React from 'react';
import { ChatInputToolbar } from './ChatInputToolbar';
import { ChatInputActions } from './ChatInputActions';
import { SlashCommandMenu, Command } from './SlashCommandMenu';
import { UploadedFile, ChatInputToolbarProps, ChatInputActionsProps } from '../../../types';
import { ALL_SUPPORTED_MIME_TYPES, SUPPORTED_IMAGE_MIME_TYPES } from '../../../constants/fileConstants';
import { translations } from '../../../utils/appUtils';
import { ChatSuggestions } from './area/ChatSuggestions';
import { ChatQuoteDisplay } from './area/ChatQuoteDisplay';
import { ChatFilePreviewList } from './area/ChatFilePreviewList';
import { ChatTextArea } from './area/ChatTextArea';
import { LiveStatusBanner } from './LiveStatusBanner';

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
        onFocus?: () => void;
    };
    quoteProps?: {
        quotes: string[];
        onRemoveQuote: (index: number) => void;
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
        onToggleBBox?: () => void;
        isBBoxModeActive?: boolean;
        onToggleGuide?: () => void;
        isGuideModeActive?: boolean;
    };
    liveStatusProps?: {
        isConnected: boolean;
        isSpeaking: boolean;
        volume: number;
        onDisconnect: () => void;
        error: string | null;
    };
    t: (key: keyof typeof translations) => string;
    themeId: string;
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
    liveStatusProps,
    t,
    themeId,
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

    return (
        <div className={wrapperClass} aria-hidden={isUIBlocked}>
            <div className="mx-auto w-full max-w-4xl px-2 sm:px-3">
                 {suggestionsProps && !isFullscreen && (
                    <ChatSuggestions 
                        show={suggestionsProps.show}
                        onSuggestionClick={suggestionsProps.onSuggestionClick}
                        onOrganizeInfoClick={suggestionsProps.onOrganizeInfoClick}
                        onToggleBBox={suggestionsProps.onToggleBBox}
                        isBBoxModeActive={suggestionsProps.isBBoxModeActive}
                        onToggleGuide={suggestionsProps.onToggleGuide}
                        isGuideModeActive={suggestionsProps.isGuideModeActive}
                        t={t}
                        isFullscreen={isFullscreen}
                    />
                )}
            </div>

            <div className={innerContainerClass}>
                {/* Wrap toolbar in z-indexed container to ensure dropdowns render above status banner */}
                <div className="relative z-50">
                    <ChatInputToolbar {...toolbarProps} />
                </div>
                
                {liveStatusProps && (
                    <LiveStatusBanner {...liveStatusProps} />
                )}
                
                <form onSubmit={formProps.onSubmit} className={formClass}>
                    <SlashCommandMenu
                        isOpen={slashCommandProps.isOpen}
                        commands={slashCommandProps.commands}
                        onSelect={slashCommandProps.onSelect}
                        selectedIndex={slashCommandProps.selectedIndex}
                        className={isFullscreen ? "absolute bottom-[60px] left-0 right-0 mb-2 w-full max-w-6xl mx-auto z-20" : undefined}
                    />
                    <div className={inputContainerClass}>
                        <ChatFilePreviewList 
                            selectedFiles={fileDisplayProps.selectedFiles}
                            onRemove={fileDisplayProps.onRemove}
                            onCancelUpload={fileDisplayProps.onCancelUpload}
                            onConfigure={fileDisplayProps.onConfigure}
                            onPreview={fileDisplayProps.onPreview}
                            isGemini3={fileDisplayProps.isGemini3}
                        />

                        {quoteProps && (
                            <ChatQuoteDisplay 
                                quotes={quoteProps.quotes}
                                onRemoveQuote={quoteProps.onRemoveQuote}
                                themeId={themeId}
                                t={t}
                            />
                        )}
                        
                        <ChatTextArea 
                            textareaRef={inputProps.textareaRef}
                            value={inputProps.value}
                            onChange={inputProps.onChange}
                            onKeyDown={inputProps.onKeyDown}
                            onPaste={inputProps.onPaste}
                            onCompositionStart={inputProps.onCompositionStart}
                            onCompositionEnd={inputProps.onCompositionEnd}
                            onFocus={inputProps.onFocus}
                            placeholder={inputProps.placeholder}
                            disabled={inputProps.disabled}
                            isFullscreen={isFullscreen}
                            isMobile={isMobile}
                            initialTextareaHeight={initialTextareaHeight}
                            isConverting={isConverting}
                        />

                        <div className="flex items-center justify-between w-full flex-shrink-0 mt-auto pt-1 relative z-10">
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
