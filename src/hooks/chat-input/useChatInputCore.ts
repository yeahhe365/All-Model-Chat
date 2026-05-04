import { useRef } from 'react';
import { useChatAreaInput } from '../../contexts/ChatAreaContext';
import { useI18n } from '../../contexts/I18nContext';
import { useWindowContext } from '../../contexts/WindowContext';
import { getCachedModelCapabilities } from '../../stores/modelCapabilitiesStore';
import { useLiveAPI } from '../useLiveAPI';
import { useTextAreaInsert } from '../useTextAreaInsert';
import { useChatInputState } from './useChatInputState';
import { useChatStore } from '../../stores/chatStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChatInputToolStates } from './useChatInputToolStates';

export const useChatInputCore = () => {
  const { t } = useI18n();
  const chatInputContext = useChatAreaInput();
  const legacyInput = chatInputContext as typeof chatInputContext & Record<string, unknown>;
  const storeAppSettings = useSettingsStore((state) => state.appSettings);
  const storeThemeId = useSettingsStore((state) => state.currentTheme.id);
  const storeActiveSessionId = useChatStore((state) => state.activeSessionId);
  const storeCommandedInput = useChatStore((state) => state.commandedInput);
  const storeSelectedFiles = useChatStore((state) => state.selectedFiles);
  const storeSetSelectedFiles = useChatStore((state) => state.setSelectedFiles);
  const storeSetAppFileError = useChatStore((state) => state.setAppFileError);
  const storeEditMode = useChatStore((state) => state.editMode);
  const storeEditingMessageId = useChatStore((state) => state.editingMessageId);
  const storeSetEditingMessageId = useChatStore((state) => state.setEditingMessageId);
  const storeIsProcessingFile = useChatStore((state) => state.isAppProcessingFile);
  const storeFileError = useChatStore((state) => state.appFileError);
  const storeAspectRatio = useChatStore((state) => state.aspectRatio);
  const storeSetAspectRatio = useChatStore((state) => state.setAspectRatio);
  const storeImageSize = useChatStore((state) => state.imageSize);
  const storeSetImageSize = useChatStore((state) => state.setImageSize);
  const storeImageOutputMode = useChatStore((state) => state.imageOutputMode);
  const storeSetImageOutputMode = useChatStore((state) => state.setImageOutputMode);
  const storePersonGeneration = useChatStore((state) => state.personGeneration);
  const storeSetPersonGeneration = useChatStore((state) => state.setPersonGeneration);
  const appSettings = (legacyInput.appSettings ?? storeAppSettings) as typeof storeAppSettings;
  const activeSessionId = (legacyInput.activeSessionId ?? storeActiveSessionId) as typeof storeActiveSessionId;
  const isEditing = (legacyInput.isEditing ?? chatInputContext.isEditing) as boolean;
  const inputState = useChatInputState(activeSessionId, isEditing);
  const storeBackedToolStates = useChatInputToolStates({
    currentChatSettings: chatInputContext.currentChatSettings,
    isLoading: chatInputContext.isLoading,
    onStopGenerating: chatInputContext.onStopGenerating,
  });
  const chatInput = {
    ...chatInputContext,
    appSettings,
    activeSessionId,
    isEditing,
    toolStates: (legacyInput.toolStates ?? storeBackedToolStates) as typeof storeBackedToolStates,
    commandedInput: (legacyInput.commandedInput ?? storeCommandedInput) as typeof storeCommandedInput,
    selectedFiles: (legacyInput.selectedFiles ?? storeSelectedFiles) as typeof storeSelectedFiles,
    setSelectedFiles: (legacyInput.setSelectedFiles ?? storeSetSelectedFiles) as typeof storeSetSelectedFiles,
    setAppFileError: (legacyInput.setAppFileError ?? storeSetAppFileError) as typeof storeSetAppFileError,
    editMode: (legacyInput.editMode ?? storeEditMode) as typeof storeEditMode,
    editingMessageId: (legacyInput.editingMessageId ?? storeEditingMessageId) as typeof storeEditingMessageId,
    setEditingMessageId: (legacyInput.setEditingMessageId ??
      storeSetEditingMessageId) as typeof storeSetEditingMessageId,
    isProcessingFile: (legacyInput.isProcessingFile ?? storeIsProcessingFile) as typeof storeIsProcessingFile,
    fileError: (legacyInput.fileError ?? storeFileError) as typeof storeFileError,
    aspectRatio: (legacyInput.aspectRatio ?? storeAspectRatio) as typeof storeAspectRatio,
    setAspectRatio: (legacyInput.setAspectRatio ?? storeSetAspectRatio) as typeof storeSetAspectRatio,
    imageSize: (legacyInput.imageSize ?? storeImageSize) as typeof storeImageSize,
    setImageSize: (legacyInput.setImageSize ?? storeSetImageSize) as typeof storeSetImageSize,
    imageOutputMode: (legacyInput.imageOutputMode ?? storeImageOutputMode) as typeof storeImageOutputMode,
    setImageOutputMode: (legacyInput.setImageOutputMode ?? storeSetImageOutputMode) as typeof storeSetImageOutputMode,
    personGeneration: (legacyInput.personGeneration ?? storePersonGeneration) as typeof storePersonGeneration,
    setPersonGeneration: (legacyInput.setPersonGeneration ??
      storeSetPersonGeneration) as typeof storeSetPersonGeneration,
    themeId: (legacyInput.themeId ?? storeThemeId) as typeof storeThemeId,
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { document: targetDocument } = useWindowContext();
  const insertText = useTextAreaInsert(inputState.textareaRef, inputState.setInputText);

  const capabilities = getCachedModelCapabilities(chatInput.currentChatSettings.modelId);

  const liveAPI = useLiveAPI({
    appSettings: chatInput.appSettings,
    chatSettings: chatInput.currentChatSettings,
    modelId: chatInput.currentChatSettings.modelId,
    onClose: undefined,
    onTranscript: chatInput.onLiveTranscript,
    onGeneratedFiles: chatInput.onLiveTranscript
      ? (files) => chatInput.onLiveTranscript?.('', 'model', false, 'content', undefined, files)
      : undefined,
    clientFunctions: chatInput.liveClientFunctions,
  });

  return {
    t,
    chatInput,
    inputState,
    fileRefs: {
      fileInputRef,
      imageInputRef,
      folderInputRef,
      zipInputRef,
      cameraInputRef,
    },
    targetDocument,
    insertText,
    capabilities,
    liveAPI,
  };
};
