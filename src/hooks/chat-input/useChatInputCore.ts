import { useRef } from 'react';
import { useChatAreaInput } from '../../contexts/ChatAreaContext';
import { useI18n } from '../../contexts/I18nContext';
import { useWindowContext } from '../../contexts/WindowContext';
import { getCachedModelCapabilities } from '../../stores/modelCapabilitiesStore';
import { useLiveAPI } from '../useLiveAPI';
import { useTextAreaInsert } from '../useTextAreaInsert';
import { useChatInputState } from './useChatInputState';

export const useChatInputCore = () => {
  const { t } = useI18n();
  const chatInput = useChatAreaInput();
  const inputState = useChatInputState(chatInput.activeSessionId, chatInput.isEditing);
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
