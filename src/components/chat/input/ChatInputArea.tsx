
/* eslint-disable react-hooks/refs */
import React from 'react';
import { ChatInputToolbar } from './ChatInputToolbar';
import { ChatInputActions } from './ChatInputActions';
import { SlashCommandMenu } from './SlashCommandMenu';
import { ALL_SUPPORTED_MIME_TYPES, SUPPORTED_IMAGE_MIME_TYPES } from '../../../constants/fileConstants';
import { ChatSuggestions } from './area/ChatSuggestions';
import { ChatQuoteDisplay } from './area/ChatQuoteDisplay';
import { ChatFilePreviewList } from './area/ChatFilePreviewList';
import { ChatTextArea } from './area/ChatTextArea';
import { LiveStatusBanner } from './LiveStatusBanner';
import { QueuedSubmissionCard } from './QueuedSubmissionCard';
import { useChatInputView } from './ChatInputViewContext';

export const ChatInputArea: React.FC = () => {
    const {
        toolbarProps,
        actionsProps,
        slashCommandProps,
        fileDisplayProps,
        inputProps,
        quoteProps,
        queuedSubmissionProps,
        layoutProps,
        fileInputs,
        formProps,
        suggestionsProps,
        liveStatusProps,
        themeId,
    } = useChatInputView();
    const { isFullscreen, isPipActive, isAnimatingSend, isMobile, initialTextareaHeight, isConverting } = layoutProps;
    const { isRecording } = actionsProps;

    const isUIBlocked = inputProps.disabled && !isAnimatingSend && !isRecording;

    const wrapperClass = isFullscreen 
        ? "fixed inset-0 z-[2000] bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] p-4 sm:p-6 flex flex-col fullscreen-enter-animation" 
        : `bg-transparent ${isUIBlocked ? 'opacity-30 pointer-events-none' : ''}`;

    const innerContainerClass = isFullscreen
        ? "w-full max-w-6xl mx-auto flex flex-col h-full"
        : `mx-auto w-full ${!isPipActive ? 'max-w-4xl' : ''} px-2 sm:px-3 pt-0 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]`;

    const formClass = isFullscreen
        ? "flex-grow flex flex-col relative min-h-0"
        : `relative ${isAnimatingSend ? 'form-send-animate' : ''}`;

    const inputContainerClass = isFullscreen
        ? "flex flex-col gap-2 rounded-none sm:rounded-[26px] border-0 sm:border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-input)] px-4 py-4 shadow-none h-full transition-all duration-200 relative"
        : "flex flex-col gap-2 rounded-[26px] border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-input)] p-3 sm:p-4 shadow-lg transition-all duration-300 focus-within:border-[var(--theme-border-focus)] relative";

    const hiddenFileInputs = (
        <>
            <input type="file" ref={fileInputs.fileInputRef} onChange={fileInputs.handleFileChange} accept={ALL_SUPPORTED_MIME_TYPES.join(',')} className="hidden" aria-hidden="true" multiple />
            <input type="file" ref={fileInputs.imageInputRef} onChange={fileInputs.handleFileChange} accept={SUPPORTED_IMAGE_MIME_TYPES.join(',')} className="hidden" aria-hidden="true" multiple />
            <input type="file" ref={fileInputs.folderInputRef} onChange={fileInputs.handleFolderChange} className="hidden" aria-hidden="true" {...({ webkitdirectory: "", directory: "" } as { webkitdirectory: string; directory: string })} multiple />
            <input type="file" ref={fileInputs.zipInputRef} onChange={fileInputs.handleZipChange} accept=".zip" className="hidden" aria-hidden="true" />
            <input type="file" ref={fileInputs.cameraInputRef} onChange={fileInputs.handleFileChange} accept="image/*" capture="environment" className="hidden" aria-hidden="true" />
        </>
    );

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
                            />
                        )}

                        {queuedSubmissionProps && (
                            <QueuedSubmissionCard
                                title={queuedSubmissionProps.title}
                                previewText={queuedSubmissionProps.previewText}
                                fileCount={queuedSubmissionProps.fileCount}
                                onEdit={queuedSubmissionProps.onEdit}
                                onRemove={queuedSubmissionProps.onRemove}
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
                            {hiddenFileInputs}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};
