/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useLayoutEffect, useState } from 'react';
import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';
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

type ChatInputViewStore = StoreApi<ChatInputViewModel>;

const ChatInputViewStoreContext = createContext<ChatInputViewStore | null>(null);

interface ChatInputViewProviderProps {
  value: ChatInputViewModel;
  children: React.ReactNode;
}

export const ChatInputViewProvider: React.FC<ChatInputViewProviderProps> = ({ value, children }) => {
  const [store] = useState(() => createStore<ChatInputViewModel>(() => value));

  useLayoutEffect(() => {
    store.setState(value, true);
  }, [store, value]);

  return <ChatInputViewStoreContext.Provider value={store}>{children}</ChatInputViewStoreContext.Provider>;
};

const useRequiredChatInputViewSlice = <T,>(selector: (view: ChatInputViewModel) => T) => {
  const store = useContext(ChatInputViewStoreContext);

  if (!store) {
    throw new Error('ChatInputViewProvider is required before using chat input view hooks');
  }

  return useStore(store, selector);
};

export const useChatInputActionsView = () => useRequiredChatInputViewSlice((view) => view.actionsProps);
export const useChatInputToolbarView = () => useRequiredChatInputViewSlice((view) => view.toolbarProps);
export const useChatInputSlashCommandView = () => useRequiredChatInputViewSlice((view) => view.slashCommandProps);
export const useChatInputFileDisplayView = () => useRequiredChatInputViewSlice((view) => view.fileDisplayProps);
export const useChatInputTextAreaView = () => useRequiredChatInputViewSlice((view) => view.inputProps);
export const useChatInputQuoteView = () => useRequiredChatInputViewSlice((view) => view.quoteProps);
export const useChatInputLayoutView = () => useRequiredChatInputViewSlice((view) => view.layoutProps);
export const useChatInputFileInputsView = () => useRequiredChatInputViewSlice((view) => view.fileInputs);
export const useChatInputFormView = () => useRequiredChatInputViewSlice((view) => view.formProps);
export const useChatInputSuggestionsView = () => useRequiredChatInputViewSlice((view) => view.suggestionsProps);
export const useQueuedSubmissionView = () => useRequiredChatInputViewSlice((view) => view.queuedSubmissionProps);
export const useLiveStatusView = () => useRequiredChatInputViewSlice((view) => view.liveStatusProps);
export const useChatInputLiveVideoView = () => useRequiredChatInputViewSlice((view) => view.liveVideoProps);
export const useChatInputThemeView = () => useRequiredChatInputViewSlice((view) => view.themeId);
