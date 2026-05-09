import { useCallback, Dispatch, SetStateAction, useEffect, useRef } from 'react';
import {
  AppSettings,
  SavedChatSession,
  ChatGroup,
  UploadedFile,
  ChatSettings,
  ChatMessage,
  InputCommand,
} from '../../../types';
import {
  ACTIVE_CHAT_SESSION_ID_KEY,
  CHAT_INPUT_TEXTAREA_SELECTOR,
  DEFAULT_CHAT_SETTINGS,
} from '../../../constants/appConstants';
import { logService } from '../../../services/logService';
import { createNewSession, rehydrateSessionFiles } from '../../../utils/chat/session';
import { cleanupFilePreviewUrls } from '../../../utils/fileHelpers';
import { resolveSupportedModelId } from '../../../utils/modelHelpers';
import { dbService } from '@/services/db/dbService';
import { useChatStore, type SetActiveSessionOptions } from '../../../stores/chatStore';

type SessionLoaderHistoryOptions = Pick<SetActiveSessionOptions, 'history'>;

interface UseSessionLoaderProps {
  appSettings: AppSettings;
  setSavedSessions: Dispatch<SetStateAction<SavedChatSession[]>>;
  setSavedGroups: Dispatch<SetStateAction<ChatGroup[]>>;
  setActiveSessionId: (value: SetStateAction<string | null>, options?: SetActiveSessionOptions) => void;
  setActiveMessages: Dispatch<SetStateAction<ChatMessage[]>>; // Added setter
  setSelectedFiles: Dispatch<SetStateAction<UploadedFile[]>>;
  setEditingMessageId: Dispatch<SetStateAction<string | null>>;
  setCommandedInput: Dispatch<SetStateAction<InputCommand | null>>;
  setAppFileError?: Dispatch<SetStateAction<string | null>>;
  updateAndPersistSessions: (
    updater: (prev: SavedChatSession[]) => SavedChatSession[],
    options?: { persist?: boolean },
  ) => void | Promise<void>;
  activeChat: SavedChatSession | undefined;
  userScrolledUpRef: React.MutableRefObject<boolean>;
  selectedFiles: UploadedFile[];
  fileDraftsRef: React.MutableRefObject<Record<string, UploadedFile[]>>;
  activeSessionId: string | null;
  savedSessions: SavedChatSession[];
}

export const useSessionLoader = ({
  appSettings,
  setSavedSessions,
  setSavedGroups,
  setActiveSessionId,
  setActiveMessages,
  setSelectedFiles,
  setEditingMessageId,
  setCommandedInput,
  setAppFileError = () => undefined,
  updateAndPersistSessions,
  activeChat,
  userScrolledUpRef,
  selectedFiles,
  fileDraftsRef,
  activeSessionId,
  savedSessions,
}: UseSessionLoaderProps) => {
  const sessionViewRequestIdRef = useRef(0);

  const sortSessionsByPinnedAndTimestamp = useCallback(
    (sessions: SavedChatSession[]) =>
      [...sessions].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.timestamp - a.timestamp;
      }),
    [],
  );

  const sanitizeSessionModel = useCallback(
    (session: SavedChatSession): SavedChatSession => ({
      ...session,
      settings: {
        ...session.settings,
        modelId: resolveSupportedModelId(session.settings?.modelId, DEFAULT_CHAT_SETTINGS.modelId),
      },
    }),
    [],
  );

  const getMostRecentTemplateSession = useCallback(
    (excludeSessionId?: string | null) => {
      return [...savedSessions]
        .filter((session) => session.id !== excludeSessionId)
        .sort((a, b) => b.timestamp - a.timestamp)[0];
    },
    [savedSessions],
  );

  const createSettingsForNewChat = useCallback(
    (
      explicitTemplateSession?: SavedChatSession,
      options?: { excludeTemplateSessionId?: string | null },
    ): ChatSettings => {
      let settingsForNewChat: ChatSettings = {
        ...DEFAULT_CHAT_SETTINGS,
        ...appSettings,
        lockedApiKey: null,
      };

      const templateSession =
        explicitTemplateSession || getMostRecentTemplateSession(options?.excludeTemplateSessionId);

      if (templateSession) {
        const sanitizedTemplate = sanitizeSessionModel(templateSession);
        settingsForNewChat = {
          ...settingsForNewChat,
          modelId: sanitizedTemplate.settings.modelId,
          isGoogleSearchEnabled: sanitizedTemplate.settings.isGoogleSearchEnabled,
          isCodeExecutionEnabled: sanitizedTemplate.settings.isCodeExecutionEnabled,
          isUrlContextEnabled: sanitizedTemplate.settings.isUrlContextEnabled,
          isDeepSearchEnabled: sanitizedTemplate.settings.isDeepSearchEnabled,
          thinkingBudget: sanitizedTemplate.settings.thinkingBudget,
          thinkingLevel: sanitizedTemplate.settings.thinkingLevel,
          ttsVoice: sanitizedTemplate.settings.ttsVoice,
        };
      }

      return settingsForNewChat;
    },
    [appSettings, getMostRecentTemplateSession, sanitizeSessionModel],
  );

  const retainOutgoingSessionRuntime = useCallback(() => {
    if (!activeSessionId || !activeChat || activeChat.messages.length === 0) {
      return;
    }

    const runtimeSession = sanitizeSessionModel(activeChat);
    setSavedSessions((prev) => {
      const exists = prev.some((session) => session.id === activeSessionId);

      if (exists) {
        return prev.map((session) =>
          session.id === activeSessionId
            ? { ...session, ...runtimeSession, messages: runtimeSession.messages }
            : session,
        );
      }

      return [runtimeSession, ...prev];
    });
  }, [activeChat, activeSessionId, sanitizeSessionModel, setSavedSessions]);

  const startNewChat = useCallback(
    (explicitTemplateSession?: SavedChatSession, options?: SessionLoaderHistoryOptions) => {
      sessionViewRequestIdRef.current += 1;
      const history = options?.history ?? 'push';
      setAppFileError(null);
      useChatStore.getState().invalidateFileOperations();

      // If we are already on an empty chat, just focus input and don't create a duplicate
      if (activeChat && activeChat.messages.length === 0 && !activeChat.settings.systemInstruction) {
        logService.info('Already on an empty chat, reusing session.');
        userScrolledUpRef.current = false;
        const settingsForReusedChat = createSettingsForNewChat(explicitTemplateSession, {
          excludeTemplateSessionId: activeSessionId,
        });
        if (!explicitTemplateSession) {
          const currentEmptyChatSettings = sanitizeSessionModel(activeChat).settings;
          settingsForReusedChat.modelId = currentEmptyChatSettings.modelId;
          settingsForReusedChat.thinkingBudget = currentEmptyChatSettings.thinkingBudget;
          settingsForReusedChat.thinkingLevel = currentEmptyChatSettings.thinkingLevel;
          settingsForReusedChat.ttsVoice = currentEmptyChatSettings.ttsVoice;
          settingsForReusedChat.mediaResolution = currentEmptyChatSettings.mediaResolution;
        }

        // Clear input text, files, and editing state to ensure a "fresh" start visual
        setCommandedInput({ text: '', id: Date.now(), mode: 'replace' });
        setSelectedFiles([]);
        setEditingMessageId(null);
        setActiveMessages([]);
        if (activeSessionId) {
          fileDraftsRef.current[activeSessionId] = [];
          updateAndPersistSessions((prev) =>
            prev.map((session) =>
              session.id === activeSessionId
                ? {
                    ...session,
                    title: 'New Chat',
                    timestamp: Date.now(),
                    messages: [],
                    settings: settingsForReusedChat,
                  }
                : session,
            ),
          );
        }

        setTimeout(() => {
          document.querySelector<HTMLTextAreaElement>(CHAT_INPUT_TEXTAREA_SELECTOR)?.focus();
        }, 0);
        return;
      }

      logService.info('Starting new chat session.');
      userScrolledUpRef.current = false;

      // Save current files to draft before switching
      if (activeSessionId) {
        retainOutgoingSessionRuntime();
        fileDraftsRef.current[activeSessionId] = selectedFiles;

        // --- MEMORY OPTIMIZATION ---
        // Actively release Blob URLs mapped to the outgoing session to prevent memory leaks
        if (activeChat && activeChat.messages) {
          activeChat.messages.forEach((msg) => cleanupFilePreviewUrls(msg.files));
        }
      }

      const settingsForNewChat = createSettingsForNewChat(explicitTemplateSession);

      const newSession = createNewSession(settingsForNewChat);

      // Update state: Set Active Messages to empty, Add new session metadata to list
      setActiveMessages([]);
      setActiveSessionId(newSession.id, { history });

      updateAndPersistSessions((prev) => [newSession, ...prev]);

      // Clear files for new chat
      setSelectedFiles([]);

      setEditingMessageId(null);

      setTimeout(() => {
        document.querySelector<HTMLTextAreaElement>(CHAT_INPUT_TEXTAREA_SELECTOR)?.focus();
      }, 0);
    },
    [
      activeChat,
      updateAndPersistSessions,
      setActiveSessionId,
      setActiveMessages,
      setSelectedFiles,
      setEditingMessageId,
      userScrolledUpRef,
      activeSessionId,
      selectedFiles,
      fileDraftsRef,
      setCommandedInput,
      setAppFileError,
      createSettingsForNewChat,
      retainOutgoingSessionRuntime,
      sanitizeSessionModel,
    ],
  );

  const loadChatSession = useCallback(
    async (sessionId: string, options?: SessionLoaderHistoryOptions) => {
      const requestId = sessionViewRequestIdRef.current + 1;
      sessionViewRequestIdRef.current = requestId;
      const history = options?.history ?? 'push';

      logService.info(`Loading chat session: ${sessionId}`);
      userScrolledUpRef.current = false;

      // Save current files to draft before switching
      if (activeSessionId && activeSessionId !== sessionId) {
        retainOutgoingSessionRuntime();
        fileDraftsRef.current[activeSessionId] = selectedFiles;

        // --- MEMORY OPTIMIZATION ---
        // Actively release Blob URLs mapped to the outgoing session to prevent memory leaks
        if (activeChat && activeChat.messages) {
          activeChat.messages.forEach((msg) => cleanupFilePreviewUrls(msg.files));
        }
      }

      try {
        const sessionToLoad = await dbService.getSession(sessionId);

        if (requestId !== sessionViewRequestIdRef.current) {
          return;
        }

        if (sessionToLoad) {
          const rehydrated = rehydrateSessionFiles(sanitizeSessionModel(sessionToLoad));

          // Set Active Messages and ID
          setActiveMessages(rehydrated.messages);
          setActiveSessionId(rehydrated.id, { history });

          // Ensure metadata list contains this session (metadata only)
          setSavedSessions((prev) => {
            const exists = prev.some((s) => s.id === sessionId);
            if (exists) {
              // Update metadata if needed, but strip messages
              const metadata = { ...rehydrated, messages: [] };
              return prev.map((s) => (s.id === sessionId ? { ...s, ...metadata, messages: [] } : s));
            } else {
              // Add if missing (rare case of direct load)
              const metadata = { ...rehydrated, messages: [] };
              return [{ ...metadata, messages: [] } as SavedChatSession, ...prev];
            }
          });

          // Restore files from draft for the target session
          const draftFiles = fileDraftsRef.current[sessionId] || [];
          setSelectedFiles(draftFiles);

          setEditingMessageId(null);
          setTimeout(() => {
            document.querySelector<HTMLTextAreaElement>(CHAT_INPUT_TEXTAREA_SELECTOR)?.focus();
          }, 0);
        } else {
          logService.warn(`Session ${sessionId} not found. Starting new chat.`);
          startNewChat(undefined, { history });
        }
      } catch (error) {
        if (requestId !== sessionViewRequestIdRef.current) {
          return;
        }
        logService.error('Error loading chat session:', error);
        startNewChat(undefined, { history });
      }
    },
    [
      setActiveSessionId,
      setActiveMessages,
      setSelectedFiles,
      setEditingMessageId,
      startNewChat,
      userScrolledUpRef,
      activeSessionId,
      selectedFiles,
      fileDraftsRef,
      setSavedSessions,
      activeChat,
      sanitizeSessionModel,
      retainOutgoingSessionRuntime,
    ],
  );

  const loadInitialData = useCallback(async () => {
    try {
      logService.info('Attempting to load chat history metadata from IndexedDB.');

      // 1. Fetch metadata only for the list
      const [metadataList, groups] = await Promise.all([dbService.getAllSessionMetadata(), dbService.getAllGroups()]);

      // Determine Active Session ID
      let initialActiveId: string | null = null;
      const urlMatch = window.location.pathname.match(/^\/chat\/([^/]+)$/);
      const urlSessionId = urlMatch ? urlMatch[1] : null;

      if (urlSessionId && metadataList.some((s) => s.id === urlSessionId)) {
        initialActiveId = urlSessionId;
      } else {
        const storedActiveId = sessionStorage.getItem(ACTIVE_CHAT_SESSION_ID_KEY);
        if (storedActiveId && metadataList.some((s) => s.id === storedActiveId)) {
          initialActiveId = storedActiveId;
        }
      }

      // 2. Fetch Active Session Full Data if exists
      if (initialActiveId) {
        const fullActiveSession = await dbService.getSession(initialActiveId);
        if (fullActiveSession) {
          logService.info(`Loaded full content for active session: ${initialActiveId}`);
          const rehydrated = rehydrateSessionFiles(sanitizeSessionModel(fullActiveSession));
          setActiveMessages(rehydrated.messages);
          setActiveSessionId(initialActiveId, { history: 'replace' });

          // Restore files draft
          const draftFiles = fileDraftsRef.current[initialActiveId] || [];
          setSelectedFiles(draftFiles);
        } else {
          // Fallback if ID invalid
          initialActiveId = null;
        }
      }

      // 3. Set List State (Metadata only)
      const sortedList = sortSessionsByPinnedAndTimestamp(metadataList.map(sanitizeSessionModel));

      setSavedSessions((prev) => {
        if (prev.length === 0) {
          return sortedList;
        }

        const prevById = new Map(prev.map((session) => [session.id, session]));
        const merged = sortedList.map((session) => {
          const existing = prevById.get(session.id);

          if (!existing) {
            return session;
          }

          prevById.delete(session.id);
          return {
            ...session,
            ...existing,
            settings: {
              ...session.settings,
              ...existing.settings,
            },
            messages: existing.messages ?? session.messages,
          };
        });

        return sortSessionsByPinnedAndTimestamp([...merged, ...prevById.values()]);
      });
      setSavedGroups(groups.map((g) => ({ ...g, isExpanded: g.isExpanded ?? true })));

      if (!initialActiveId) {
        // Check if the most recent session is empty. If so, reuse it.
        const mostRecent = sortedList[0];
        let reused = false;

        if (mostRecent) {
          // We need to verify if it's truly empty. Metadata has messages stripped.
          // Also check systemInstruction: if it's a specific scenario, don't reuse it as a generic "New Chat"
          const fullSession = await dbService.getSession(mostRecent.id);
          if (fullSession && fullSession.messages.length === 0 && !fullSession.settings.systemInstruction) {
            logService.info(`Reusing empty recent session: ${mostRecent.id}`);
            const rehydrated = rehydrateSessionFiles(sanitizeSessionModel(fullSession));
            setActiveMessages(rehydrated.messages);
            setActiveSessionId(rehydrated.id, { history: 'replace' });

            // Restore files draft
            const draftFiles = fileDraftsRef.current[rehydrated.id] || [];
            setSelectedFiles(draftFiles);

            reused = true;
          }
        }

        if (!reused) {
          // Fallback: New Chat
          logService.info('No active session found or empty session to reuse, starting fresh chat.');
          // Pass the top session (if any) as template for inheritance
          startNewChat(sortedList.length > 0 ? sortedList[0] : undefined, { history: 'replace' });
        }
      }
    } catch (error) {
      logService.error('Error loading chat history:', error);
      startNewChat(undefined, { history: 'replace' });
    }
  }, [
    setSavedSessions,
    setSavedGroups,
    startNewChat,
    setActiveSessionId,
    setActiveMessages,
    setSelectedFiles,
    fileDraftsRef,
    sanitizeSessionModel,
    sortSessionsByPinnedAndTimestamp,
  ]);

  // Handle Browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const match = window.location.pathname.match(/^\/chat\/([^/]+)$/);
      const sessionId = match ? match[1] : null;

      if (sessionId) {
        loadChatSession(sessionId, { history: 'none' });
      } else if (window.location.pathname === '/') {
        startNewChat(undefined, { history: 'none' });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [loadChatSession, startNewChat]);

  return {
    startNewChat,
    loadChatSession,
    loadInitialData,
  };
};
