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

const ChatInputViewContext = createContext<ChatInputViewModel | null>(null);

interface ChatInputViewProviderProps {
  value: ChatInputViewModel;
  children: React.ReactNode;
}

export const ChatInputViewProvider: React.FC<ChatInputViewProviderProps> = ({ value, children }) => (
  <ChatInputViewContext.Provider value={value}>{children}</ChatInputViewContext.Provider>
);

export const useChatInputView = () => {
  const value = useContext(ChatInputViewContext);

  if (!value) {
    throw new Error('useChatInputView must be used within ChatInputViewProvider');
  }

  return value;
};

export const useChatInputActionsView = () => useChatInputView().actionsProps;
export const useChatInputLayoutView = () => useChatInputView().layoutProps;
