
import React, { useCallback } from 'react';
import { AppSettings, ChatMessage, ChatSettings as IndividualChatSettings, SavedChatSession, UploadedFile } from '../../../types';
import { generateUniqueId, generateSessionTitle, performOptimisticSessionUpdate, createMessage } from '../../../utils/appUtils';
import { DEFAULT_CHAT_SETTINGS } from '../../../constants/appConstants';

interface UseSessionUpdateProps {
    appSettings: AppSettings;
    updateAndPersistSessions: (updater: (prev: SavedChatSession[]) => SavedChatSession[], options?: { persist?: boolean }) => void;
    setActiveSessionId: (id: string | null) => void;
    setEditingMessageId: (id: string | null) => void;
    sessionKeyMapRef: React.MutableRefObject<Map<string, string>>;
}

export const useSessionUpdate = ({
    appSettings,
    updateAndPersistSessions,
    setActiveSessionId,
    setEditingMessageId,
    sessionKeyMapRef
}: UseSessionUpdateProps) => {

    const updateSessionState = useCallback((params: {
        activeSessionId: string | null;
        finalSessionId: string;
        textToUse: string;
        enrichedFiles: UploadedFile[];
        effectiveEditingId: string | null;
        generationId: string;
        generationStartTime: Date;
        isContinueMode: boolean;
        isRawMode: boolean;
        sessionToUpdate: IndividualChatSettings;
        keyToUse: string;
        shouldLockKey: boolean;
    }) => {
        const {
            activeSessionId, finalSessionId, textToUse, enrichedFiles,
            effectiveEditingId, generationId, generationStartTime,
            isContinueMode, isRawMode, sessionToUpdate, keyToUse, shouldLockKey
        } = params;

        updateAndPersistSessions(prev => {
            if (isContinueMode) {
                // Continue Mode: Update status of existing message
                return prev.map(s => {
                    if (s.id === finalSessionId) {
                        return {
                            ...s,
                            messages: s.messages.map(m =>
                                m.id === effectiveEditingId
                                    ? { ...m, isLoading: true, generationEndTime: undefined, stoppedByUser: false }
                                    : m
                            )
                        };
                    }
                    return s;
                });
            } else {
                // Standard Flow: Add User + Model messages
                
                // Carry forward cumulative token count if possible
                const existingSession = prev.find(s => s.id === activeSessionId);
                let cumulativeTotalTokens = 0;
                if (existingSession && existingSession.messages.length > 0) {
                    const lastMsg = existingSession.messages[existingSession.messages.length - 1];
                    cumulativeTotalTokens = lastMsg.cumulativeTotalTokens || 0;
                }

                const userMessageContent = createMessage('user', textToUse.trim(), {
                    files: enrichedFiles.length ? enrichedFiles : undefined,
                    cumulativeTotalTokens: cumulativeTotalTokens > 0 ? cumulativeTotalTokens : undefined
                });

                const initialContent = isRawMode ? '<thinking>' : '';
                const modelMessageContent = createMessage('model', initialContent, {
                    id: generationId,
                    isLoading: true,
                    generationStartTime: generationStartTime
                });

                let newTitle = undefined;
                // If it's a new session or the title is generic "New Chat", generate a temporary one from content
                if (!activeSessionId || existingSession?.title === 'New Chat') {
                    newTitle = generateSessionTitle([userMessageContent, modelMessageContent]);
                }

                return performOptimisticSessionUpdate(prev, {
                    activeSessionId,
                    newSessionId: finalSessionId,
                    newMessages: [userMessageContent, modelMessageContent],
                    settings: { ...DEFAULT_CHAT_SETTINGS, ...appSettings, ...sessionToUpdate },
                    editingMessageId: effectiveEditingId,
                    appSettings,
                    title: newTitle,
                    shouldLockKey,
                    keyToLock: keyToUse
                });
            }
        });

        // Side Effects
        if (!activeSessionId) {
            setActiveSessionId(finalSessionId);
        }

        sessionKeyMapRef.current.set(finalSessionId, keyToUse);

        if (effectiveEditingId) {
            setEditingMessageId(null);
        }

    }, [appSettings, updateAndPersistSessions, setActiveSessionId, setEditingMessageId, sessionKeyMapRef]);

    return { updateSessionState };
};
