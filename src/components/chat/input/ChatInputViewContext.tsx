/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext } from 'react';
import { UploadedFile, ChatInputToolbarProps, ChatInputActionsProps } from '../../../types';
import type { SlashCommand as Command } from '../../../types/slashCommands';

export interface ChatInputViewModel {
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
    onMoveTextToInput: (file: UploadedFile) => Promise<void>;
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
  queuedSubmissionProps?: {
    title: string;
    previewText: string;
    fileCount: number;
    onEdit: () => void;
    onRemove: () => void;
  };
  layoutProps: {
    isFullscreen: boolean;
    isPipActive?: boolean;
    isAnimatingSend: boolean;
    isMobile: boolean;
    initialTextareaHeight: number;
    isConverting: boolean;
  };
  fileInputs: {
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
    isReconnecting: boolean;
    volume: number;
    onDisconnect: () => void;
    error: string | null;
  };
  liveVideoProps?: {
    videoRef: React.RefObject<HTMLVideoElement>;
  };
  themeId: string;
}

const missingChatInputViewSlice = Symbol('missingChatInputViewSlice');
type MissingChatInputViewSlice = typeof missingChatInputViewSlice;
type ChatInputViewSliceContext<T> = React.Context<T | MissingChatInputViewSlice>;

const createChatInputViewSliceContext = <T,>() =>
  createContext<T | MissingChatInputViewSlice>(missingChatInputViewSlice);

const ChatInputToolbarViewContext = createChatInputViewSliceContext<ChatInputViewModel['toolbarProps']>();
const ChatInputActionsViewContext = createChatInputViewSliceContext<ChatInputViewModel['actionsProps']>();
const ChatInputSlashCommandViewContext = createChatInputViewSliceContext<ChatInputViewModel['slashCommandProps']>();
const ChatInputFileDisplayViewContext = createChatInputViewSliceContext<ChatInputViewModel['fileDisplayProps']>();
const ChatInputTextAreaViewContext = createChatInputViewSliceContext<ChatInputViewModel['inputProps']>();
const ChatInputQuoteViewContext = createChatInputViewSliceContext<ChatInputViewModel['quoteProps']>();
const ChatInputLayoutViewContext = createChatInputViewSliceContext<ChatInputViewModel['layoutProps']>();
const ChatInputFileInputsViewContext = createChatInputViewSliceContext<ChatInputViewModel['fileInputs']>();
const ChatInputFormViewContext = createChatInputViewSliceContext<ChatInputViewModel['formProps']>();
const ChatInputSuggestionsViewContext = createChatInputViewSliceContext<ChatInputViewModel['suggestionsProps']>();
const QueuedSubmissionViewContext = createChatInputViewSliceContext<ChatInputViewModel['queuedSubmissionProps']>();
const LiveStatusViewContext = createChatInputViewSliceContext<ChatInputViewModel['liveStatusProps']>();
const ChatInputLiveVideoViewContext = createChatInputViewSliceContext<ChatInputViewModel['liveVideoProps']>();
const ChatInputThemeViewContext = createChatInputViewSliceContext<ChatInputViewModel['themeId']>();

interface ChatInputViewProviderProps {
  value: ChatInputViewModel;
  children: React.ReactNode;
}

export const ChatInputViewProvider: React.FC<ChatInputViewProviderProps> = ({ value, children }) => (
  <ChatInputToolbarViewContext.Provider value={value.toolbarProps}>
    <ChatInputActionsViewContext.Provider value={value.actionsProps}>
      <ChatInputSlashCommandViewContext.Provider value={value.slashCommandProps}>
        <ChatInputFileDisplayViewContext.Provider value={value.fileDisplayProps}>
          <ChatInputTextAreaViewContext.Provider value={value.inputProps}>
            <ChatInputQuoteViewContext.Provider value={value.quoteProps}>
              <ChatInputLayoutViewContext.Provider value={value.layoutProps}>
                <ChatInputFileInputsViewContext.Provider value={value.fileInputs}>
                  <ChatInputFormViewContext.Provider value={value.formProps}>
                    <ChatInputSuggestionsViewContext.Provider value={value.suggestionsProps}>
                      <QueuedSubmissionViewContext.Provider value={value.queuedSubmissionProps}>
                        <LiveStatusViewContext.Provider value={value.liveStatusProps}>
                          <ChatInputLiveVideoViewContext.Provider value={value.liveVideoProps}>
                            <ChatInputThemeViewContext.Provider value={value.themeId}>
                              {children}
                            </ChatInputThemeViewContext.Provider>
                          </ChatInputLiveVideoViewContext.Provider>
                        </LiveStatusViewContext.Provider>
                      </QueuedSubmissionViewContext.Provider>
                    </ChatInputSuggestionsViewContext.Provider>
                  </ChatInputFormViewContext.Provider>
                </ChatInputFileInputsViewContext.Provider>
              </ChatInputLayoutViewContext.Provider>
            </ChatInputQuoteViewContext.Provider>
          </ChatInputTextAreaViewContext.Provider>
        </ChatInputFileDisplayViewContext.Provider>
      </ChatInputSlashCommandViewContext.Provider>
    </ChatInputActionsViewContext.Provider>
  </ChatInputToolbarViewContext.Provider>
);

const useRequiredChatInputViewSlice = <T,>(context: ChatInputViewSliceContext<T>) => {
  const value = useContext(context);

  if (value === missingChatInputViewSlice) {
    throw new Error('ChatInputViewProvider is required before using chat input view hooks');
  }

  return value;
};

export const useChatInputActionsView = () => useRequiredChatInputViewSlice(ChatInputActionsViewContext);
export const useChatInputToolbarView = () => useRequiredChatInputViewSlice(ChatInputToolbarViewContext);
export const useChatInputSlashCommandView = () => useRequiredChatInputViewSlice(ChatInputSlashCommandViewContext);
export const useChatInputFileDisplayView = () => useRequiredChatInputViewSlice(ChatInputFileDisplayViewContext);
export const useChatInputTextAreaView = () => useRequiredChatInputViewSlice(ChatInputTextAreaViewContext);
export const useChatInputQuoteView = () => useRequiredChatInputViewSlice(ChatInputQuoteViewContext);
export const useChatInputLayoutView = () => useRequiredChatInputViewSlice(ChatInputLayoutViewContext);
export const useChatInputFileInputsView = () => useRequiredChatInputViewSlice(ChatInputFileInputsViewContext);
export const useChatInputFormView = () => useRequiredChatInputViewSlice(ChatInputFormViewContext);
export const useChatInputSuggestionsView = () => useRequiredChatInputViewSlice(ChatInputSuggestionsViewContext);
export const useQueuedSubmissionView = () => useRequiredChatInputViewSlice(QueuedSubmissionViewContext);
export const useLiveStatusView = () => useRequiredChatInputViewSlice(LiveStatusViewContext);
export const useChatInputLiveVideoView = () => useRequiredChatInputViewSlice(ChatInputLiveVideoViewContext);
export const useChatInputThemeView = () => useRequiredChatInputViewSlice(ChatInputThemeViewContext);
