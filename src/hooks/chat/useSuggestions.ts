// hooks/chat/useSuggestions.ts
import React, { useEffect, useRef, useCallback } from 'react';
import { AppSettings, SavedChatSession, ChatSettings as IndividualChatSettings } from '../../types';
import { logService } from '../../services/logService';
import { getGeminiKeyForRequest } from '../../utils/apiUtils';
import { getModelCapabilities } from '../../utils/modelHelpers';
import { generateSuggestionsApi } from '../../services/api/generation/textApi';
import { getVisibleChatMessages } from '../../utils/chat/visibility';
import { isOpenAICompatibleApiActive } from '../../utils/openaiCompatibleMode';

type MessageUpdater = (
  sessionId: string,
  messageId: string,
  updates: Partial<SavedChatSession['messages'][number]>,
) => void;

interface SuggestionsProps {
  appSettings: AppSettings;
  activeChat: SavedChatSession | undefined;
  isLoading: boolean;
  updateMessageInSession: MessageUpdater;
  language: 'en' | 'zh';
  sessionKeyMapRef?: React.MutableRefObject<Map<string, string>>;
}

export const useSuggestions = ({
  appSettings,
  activeChat,
  isLoading,
  updateMessageInSession,
  language,
  sessionKeyMapRef,
}: SuggestionsProps) => {
  const prevIsLoadingRef = useRef(isLoading);

  const generateAndAttachSuggestions = useCallback(
    async (
      sessionId: string,
      messageId: string,
      userContent: string,
      modelContent: string,
      sessionSettings: IndividualChatSettings,
    ) => {
      // Show loading state
      updateMessageInSession(sessionId, messageId, { isGeneratingSuggestions: true });

      // Sticky Key Logic: Prefer key used in the last turn
      const stickyKey = isOpenAICompatibleApiActive(appSettings) ? undefined : sessionKeyMapRef?.current?.get(sessionId);
      let keyToUse: string;

      if (stickyKey) {
        keyToUse = stickyKey;
      } else {
        // Use skipIncrement: true to avoid rotating API keys for background suggestions
        const keyResult = getGeminiKeyForRequest(appSettings, sessionSettings, { skipIncrement: true });
        if ('error' in keyResult) {
          logService.error('Cannot generate suggestions: API key not configured.');
          // Hide loading state on error
          updateMessageInSession(sessionId, messageId, { isGeneratingSuggestions: false });
          return;
        }
        keyToUse = keyResult.key;
      }

      try {
        const suggestions = await generateSuggestionsApi(keyToUse, userContent, modelContent, language);
        if (suggestions && suggestions.length > 0) {
          updateMessageInSession(sessionId, messageId, { suggestions, isGeneratingSuggestions: false });
        } else {
          // Hide loading state if no suggestions are returned
          updateMessageInSession(sessionId, messageId, { isGeneratingSuggestions: false });
        }
      } catch (error) {
        logService.error('Suggestion generation failed in handler', { error });
        // Hide loading state on error
        updateMessageInSession(sessionId, messageId, { isGeneratingSuggestions: false });
      }
    },
    [appSettings, language, updateMessageInSession, sessionKeyMapRef],
  );

  useEffect(() => {
    // Trigger condition: loading just finished for the active chat
    if (prevIsLoadingRef.current && !isLoading && appSettings.isSuggestionsEnabled && activeChat) {
      const { id: sessionId, settings } = activeChat;
      const messages = getVisibleChatMessages(activeChat.messages);

      // Filter out non-text models (Imagen, TTS, Audio, etc.)
      const capabilities = getModelCapabilities(settings.modelId);

      if (!capabilities.permissions.canGenerateSuggestions) {
        prevIsLoadingRef.current = isLoading;
        return;
      }

      if (messages.length < 2) return;

      const lastMessage = messages[messages.length - 1];
      const secondLastMessage = messages[messages.length - 2];

      // Condition: The last turn was a user message followed by a model response,
      // and we haven't already fetched suggestions for it.
      if (
        lastMessage.role === 'model' &&
        !lastMessage.isLoading &&
        !lastMessage.stoppedByUser && // Check if stopped by user
        secondLastMessage.role === 'user' &&
        !lastMessage.suggestions &&
        lastMessage.isGeneratingSuggestions === undefined // Check undefined to prevent re-triggering
      ) {
        // Generate suggestions for the completed turn
        generateAndAttachSuggestions(
          sessionId,
          lastMessage.id,
          secondLastMessage.content,
          lastMessage.content,
          settings,
        );
      }
    }
    prevIsLoadingRef.current = isLoading;
  }, [isLoading, activeChat, appSettings.isSuggestionsEnabled, generateAndAttachSuggestions]);
};
