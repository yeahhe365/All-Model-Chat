
import React from 'react';
import { ChatInputToolbar } from './ChatInputToolbar';
import { ChatInputActions } from './ChatInputActions';
import { SlashCommandMenu, Command } from './SlashCommandMenu';
import { SelectedFileDisplay } from '../SelectedFileDisplay';
import { UploadedFile, ChatInputToolbarProps, ChatInputActionsProps } from '../../../types';
import { ALL_SUPPORTED_MIME_TYPES, SUPPORTED_IMAGE_MIME_TYPES } from '../../../constants/fileConstants';
import { translations } from '../../../utils/appUtils';
import { Loader2 } from 'lucide-react';

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
        handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        handleFolderChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        handleZipChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    };
    formProps: {
        onSubmit: (e: React.FormEvent) => void;
    };
    t: (key: keyof typeof translations) => string;
}

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
    toolbarProps,
    actionsProps,
    slashCommandProps,
    fileDisplayProps,
    inputProps,
    layoutProps,
    fileInputRefs,
    formProps,
    t,
}) => {
    const { isFullscreen, isPipActive, isAnimatingSend, isMobile, initialTextareaHeight, isConverting } = layoutProps;
    const { isRecording } = actionsProps;

    // Prevent blocking UI interactions (clicks) during recording so the user can stop it.
    // We only apply opacity/pointer-events-none if disabled AND NOT recording.
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
            <div className={innerContainerClass}>
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
                                    />
                                ))}
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
                            
                            {/* Hidden inputs for file selection, triggered by AttachmentMenu */}
                            <input 
                                type="file" 
                                ref={fileInputRefs.fileInputRef} 
                                onChange={fileInputRefs.handleFileChange} 
                                accept={ALL_SUPPORTED_MIME_TYPES.join(',')} 
                                className="hidden" 
                                aria-hidden="true" 
                                multiple 
                            />
                            <input 
                                type="file" 
                                ref={fileInputRefs.imageInputRef} 
                                onChange={fileInputRefs.handleFileChange} 
                                accept={SUPPORTED_IMAGE_MIME_TYPES.join(',')} 
                                className="hidden" 
                                aria-hidden="true" 
                                multiple 
                            />
                            <input
                                type="file"
                                ref={fileInputRefs.folderInputRef}
                                onChange={fileInputRefs.handleFolderChange}
                                className="hidden"
                                aria-hidden="true"
                                {...({ webkitdirectory: "", directory: "" } as any)}
                                multiple
                            />
                            <input
                                type="file"
                                ref={fileInputRefs.zipInputRef}
                                onChange={fileInputRefs.handleZipChange}
                                accept=".zip"
                                className="hidden"
                                aria-hidden="true"
                            />
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};
