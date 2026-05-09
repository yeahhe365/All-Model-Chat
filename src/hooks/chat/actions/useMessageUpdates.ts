import React, { useCallback, useRef, useEffect } from 'react';
import type { Part } from '@google/genai';
import {
  SavedChatSession,
  ChatMessage,
  UploadedFile,
  VideoMetadata,
  AppSettings,
  ChatSettings as IndividualChatSettings,
} from '../../../types';
import { logService } from '../../../services/logService';
import { createNewSession, createMessage } from '../../../utils/chat/session';
import { updateFileInMessage, updateMessageInSession, updateSessionById } from '../../../utils/chat/sessionMutations';
import { MediaResolution } from '../../../types/settings';
import { DEFAULT_CHAT_SETTINGS } from '../../../constants/appConstants';
import {
  createMessageStreamState,
  mergeUniqueFiles,
  reduceMessageStreamEvent,
  type MessageStreamState,
} from '@/features/chat-streaming/messageStreamReducer';

interface UseMessageUpdatesProps {
  activeSessionId: string | null;
  setActiveSessionId: (id: string) => void;
  appSettings: AppSettings;
  currentChatSettings: IndividualChatSettings;
  updateAndPersistSessions: (
    updater: (prev: SavedChatSession[]) => SavedChatSession[],
    options?: { persist?: boolean },
  ) => void;
  updateMessageInActiveSession?: (
    messageId: string,
    updater: Partial<ChatMessage> | ((message: ChatMessage) => ChatMessage),
    options?: { persist?: boolean },
  ) => void;
  appendMessageToSession?: (sessionId: string, message: ChatMessage, options?: { persist?: boolean }) => void;
  userScrolledUpRef: React.MutableRefObject<boolean>;
}

interface LiveModelStreamInput {
  apiPart?: Part;
  generatedFiles?: UploadedFile[];
  text: string;
  type: 'content' | 'thought';
}

const reduceLiveModelStreamInput = (
  streamState: MessageStreamState,
  { apiPart, generatedFiles, text, type }: LiveModelStreamInput,
): MessageStreamState => {
  let nextState = streamState;

  if (apiPart) {
    nextState = reduceMessageStreamEvent(nextState, { type: 'part', part: apiPart });
  } else if (text) {
    nextState =
      type === 'thought'
        ? reduceMessageStreamEvent(nextState, { type: 'thought', text })
        : reduceMessageStreamEvent(nextState, { type: 'part', part: { text } as Part });
  }

  if (generatedFiles?.length) {
    nextState = reduceMessageStreamEvent(nextState, { type: 'files', files: generatedFiles });
  }

  return nextState;
};

const getMessageUpdatesFromStreamState = (
  streamState: MessageStreamState,
  fallbackFirstTokenTimeMs?: number,
): Partial<ChatMessage> => ({
  content: streamState.content,
  thoughts: streamState.thoughts || undefined,
  files: streamState.files.length ? streamState.files : undefined,
  apiParts: streamState.apiParts.length ? streamState.apiParts : undefined,
  firstTokenTimeMs: streamState.firstTokenTimeMs ?? fallbackFirstTokenTimeMs,
});

export const useMessageUpdates = ({
  activeSessionId,
  setActiveSessionId,
  appSettings,
  currentChatSettings,
  updateAndPersistSessions,
  updateMessageInActiveSession,
  appendMessageToSession,
  userScrolledUpRef,
}: UseMessageUpdatesProps) => {
  // Track active message IDs for the live session within the closure of the hook instance
  const liveConversationRefs = useRef<{ userId: string | null; modelId: string | null }>({
    userId: null,
    modelId: null,
  });
  const liveStreamStateRefs = useRef<{ user: MessageStreamState | null; model: MessageStreamState | null }>({
    user: null,
    model: null,
  });

  // Track pending session ID creation to prevent duplicates during async state updates
  const pendingSessionIdRef = useRef<string | null>(null);

  // Reset pending ref when activeSessionId matches (state caught up)
  useEffect(() => {
    if (activeSessionId && activeSessionId === pendingSessionIdRef.current) {
      pendingSessionIdRef.current = null;
    }
  }, [activeSessionId]);

  const handleUpdateMessageContent = useCallback(
    (messageId: string, newContent: string) => {
      if (!activeSessionId) return;
      logService.info('Tampering message content', { messageId });
      const updateActiveMessage =
        updateMessageInActiveSession ??
        ((id: string, updater: Partial<ChatMessage> | ((message: ChatMessage) => ChatMessage)) =>
          updateAndPersistSessions((prev) => updateMessageInSession(prev, activeSessionId, id, updater)));

      updateActiveMessage(messageId, (message) => ({ ...message, content: newContent, apiParts: undefined }));
    },
    [activeSessionId, updateAndPersistSessions, updateMessageInActiveSession],
  );

  const handleUpdateMessageFile = useCallback(
    (
      messageId: string,
      fileId: string,
      updates: { videoMetadata?: VideoMetadata; mediaResolution?: MediaResolution },
    ) => {
      if (!activeSessionId) return;
      if (updateMessageInActiveSession) {
        updateMessageInActiveSession(messageId, (message) =>
          message.files
            ? {
                ...message,
                files: message.files.map((file) => (file.id === fileId ? { ...file, ...updates } : file)),
              }
            : message,
        );
        return;
      }

      updateAndPersistSessions((prev) =>
        updateFileInMessage(prev, activeSessionId, messageId, fileId, updates as Partial<UploadedFile>),
      );
    },
    [activeSessionId, updateAndPersistSessions, updateMessageInActiveSession],
  );

  const handleAddUserMessage = useCallback(
    (text: string, files: UploadedFile[] = []) => {
      let currentSessionId = activeSessionId || pendingSessionIdRef.current;

      // Auto-create session if sending message from New Chat state
      if (!currentSessionId) {
        const newSession = createNewSession({ ...DEFAULT_CHAT_SETTINGS, ...appSettings, ...currentChatSettings });
        currentSessionId = newSession.id;
        pendingSessionIdRef.current = currentSessionId;
        setActiveSessionId(currentSessionId);

        updateAndPersistSessions((prev) => [newSession, ...prev]);
      }

      const newMessage = createMessage('user', text, { files });

      if (appendMessageToSession) {
        appendMessageToSession(currentSessionId, newMessage);
      } else {
        updateAndPersistSessions((prev) =>
          updateSessionById(prev, currentSessionId, (s) => ({
            ...s,
            messages: [...s.messages, newMessage],
            timestamp: Date.now(), // Update timestamp to move to top
          })),
        );
      }
      userScrolledUpRef.current = false;
    },
    [
      activeSessionId,
      updateAndPersistSessions,
      userScrolledUpRef,
      appSettings,
      currentChatSettings,
      setActiveSessionId,
      appendMessageToSession,
    ],
  );

  const handleLiveTranscript = useCallback(
    (
      text: string,
      role: 'user' | 'model',
      isFinal: boolean,
      type: 'content' | 'thought' = 'content',
      audioUrl?: string | null,
      generatedFiles?: UploadedFile[],
      apiPart?: Part,
    ) => {
      let currentSessionId = activeSessionId || pendingSessionIdRef.current;

      // Auto-create session if receiving any live output in New Chat state.
      if (!currentSessionId && (text || audioUrl || (generatedFiles && generatedFiles.length > 0) || apiPart)) {
        const newSession = createNewSession(
          { ...DEFAULT_CHAT_SETTINGS, ...appSettings, ...currentChatSettings },
          [],
          'Live Session',
        );
        currentSessionId = newSession.id;
        pendingSessionIdRef.current = currentSessionId;
        setActiveSessionId(currentSessionId);

        // Inject new session immediately
        updateAndPersistSessions((prev) => [newSession, ...prev]);
      }

      if (!currentSessionId) return;

      updateAndPersistSessions((prev) =>
        updateSessionById(prev, currentSessionId, (s) => {
          // Determine which ID we are currently tracking for this role
          const currentId =
            role === 'user' ? liveConversationRefs.current.userId : liveConversationRefs.current.modelId;
          const messages = [...s.messages];

          // Find the index of the existing message, if any
          let messageIndex = currentId ? messages.findIndex((m) => m.id === currentId) : -1;

          // Only create or update if there is actual text content (or thoughts)
          // OR if there is an audioUrl to attach (e.g. at the end of a turn even if no text change)
          if (text || audioUrl || (generatedFiles && generatedFiles.length > 0) || apiPart) {
            if (messageIndex === -1) {
              const generationStartTime = new Date();
              // Start a new message for this turn
              const newMessage = createMessage(role === 'user' ? 'user' : 'model', '', {
                isLoading: true, // Mark as loading to indicate active stream/live status
                firstTokenTimeMs: 0, // Initialize TTFT to 0 for Live API
                generationStartTime,
                audioSrc: audioUrl || undefined,
                audioAutoplay: audioUrl ? false : undefined,
              });

              if (role === 'model') {
                let streamState = createMessageStreamState({
                  generationId: newMessage.id,
                  generationStartTime,
                });
                streamState = reduceLiveModelStreamInput(streamState, { apiPart, generatedFiles, text, type });
                liveStreamStateRefs.current.model = streamState;
                Object.assign(newMessage, getMessageUpdatesFromStreamState(streamState, 0));
              } else {
                newMessage.content = type === 'content' ? text : '';
                newMessage.thoughts = type === 'thought' ? text : undefined;
                newMessage.files = generatedFiles?.length ? generatedFiles : undefined;
              }

              messages.push(newMessage);

              // Update ref to track this new message
              if (role === 'user') liveConversationRefs.current.userId = newMessage.id;
              else liveConversationRefs.current.modelId = newMessage.id;

              // Update index so we can finalize it below if needed
              messageIndex = messages.length - 1;
            } else {
              // Update existing message content
              const msg = messages[messageIndex];
              const updates: Partial<ChatMessage> = {};

              if (role === 'model' && (apiPart || text || generatedFiles?.length)) {
                let streamState =
                  liveStreamStateRefs.current.model ??
                  createMessageStreamState({
                    generationId: msg.id,
                    generationStartTime: msg.generationStartTime || msg.timestamp,
                  });

                if (!liveStreamStateRefs.current.model) {
                  streamState = {
                    ...streamState,
                    content: msg.content || '',
                    thoughts: msg.thoughts || '',
                    apiParts: msg.apiParts || [],
                    files: msg.files || [],
                    firstTokenTimeMs: msg.firstTokenTimeMs,
                  };
                }

                streamState = reduceLiveModelStreamInput(streamState, { apiPart, generatedFiles, text, type });

                liveStreamStateRefs.current.model = streamState;
                Object.assign(updates, getMessageUpdatesFromStreamState(streamState, msg.firstTokenTimeMs));

                if (streamState.thoughts && !msg.thinkingTimeMs && streamState.firstContentPartTime) {
                  updates.thinkingTimeMs =
                    streamState.firstContentPartTime.getTime() - (msg.generationStartTime || msg.timestamp).getTime();
                }
              } else if (text) {
                if (type === 'thought') {
                  updates.thoughts = (msg.thoughts || '') + text;
                } else {
                  // If we are switching to content from thoughts, and thinkingTimeMs isn't set yet
                  // This effectively "stops" the thinking timer
                  if (msg.thoughts && !msg.thinkingTimeMs && msg.generationStartTime) {
                    updates.thinkingTimeMs = new Date().getTime() - msg.generationStartTime.getTime();
                  }
                  updates.content = msg.content + text;
                }
              }

              if (audioUrl) {
                updates.audioSrc = audioUrl;
                updates.audioAutoplay = false; // Disable autoplay for Live API generated audio
              }
              if (generatedFiles?.length) {
                updates.files = mergeUniqueFiles(updates.files || msg.files, generatedFiles);
              }

              messages[messageIndex] = { ...msg, ...updates };
            }
          }

          // If the turn is complete (isFinal=true), mark the message as not loading and clear the ref
          if (isFinal) {
            if (messageIndex !== -1) {
              const updatedMsg = messages[messageIndex];

              // Finalize thinking time if not already set (e.g. if the message was ONLY thoughts)
              let finalThinkingTime = updatedMsg.thinkingTimeMs;
              if (updatedMsg.thoughts && !finalThinkingTime && updatedMsg.generationStartTime) {
                finalThinkingTime = new Date().getTime() - updatedMsg.generationStartTime.getTime();
              }

              messages[messageIndex] = {
                ...updatedMsg,
                isLoading: false,
                generationEndTime: new Date(),
                thinkingTimeMs: finalThinkingTime,
              };
            }
            // Reset tracking ref for this role so next transcript starts a new message bubble
            if (role === 'user') liveConversationRefs.current.userId = null;
            else {
              liveConversationRefs.current.modelId = null;
              liveStreamStateRefs.current.model = null;
            }
          }

          return {
            ...s,
            messages,
            timestamp: Date.now(), // Update timestamp on live activity to keep session active/top
          };
        }),
      );
    },
    [activeSessionId, updateAndPersistSessions, appSettings, currentChatSettings, setActiveSessionId],
  );

  return {
    handleUpdateMessageContent,
    handleUpdateMessageFile,
    handleAddUserMessage,
    handleLiveTranscript,
  };
};
