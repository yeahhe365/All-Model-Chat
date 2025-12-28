
import React, { useCallback, useRef } from 'react';
import { SavedChatSession, ChatMessage, UploadedFile, VideoMetadata } from '../../../types';
import { generateUniqueId, logService } from '../../../utils/appUtils';
import { MediaResolution } from '../../../types/settings';

interface UseMessageUpdatesProps {
    activeSessionId: string | null;
    updateAndPersistSessions: (updater: (prev: SavedChatSession[]) => SavedChatSession[], options?: { persist?: boolean }) => void;
    userScrolledUp: React.MutableRefObject<boolean>;
}

export const useMessageUpdates = ({
    activeSessionId,
    updateAndPersistSessions,
    userScrolledUp,
}: UseMessageUpdatesProps) => {
    
    const liveConversationRefs = useRef<{ userId: string|null, modelId: string|null }>({ userId: null, modelId: null });

    const handleUpdateMessageContent = useCallback((messageId: string, newContent: string) => {
        if (!activeSessionId) return;
        logService.info("Tampering message content", { messageId });
        updateAndPersistSessions(prev => prev.map(s => {
            if (s.id === activeSessionId) {
                return {
                    ...s,
                    messages: s.messages.map(m => m.id === messageId ? { ...m, content: newContent } : m)
                };
            }
            return s;
        }));
    }, [activeSessionId, updateAndPersistSessions]);

    const handleUpdateMessageFile = useCallback((messageId: string, fileId: string, updates: { videoMetadata?: VideoMetadata, mediaResolution?: MediaResolution }) => {
        if (!activeSessionId) return;
        updateAndPersistSessions(prev => prev.map(s => {
            if (s.id === activeSessionId) {
                return {
                    ...s,
                    messages: s.messages.map(m => {
                        if (m.id === messageId && m.files) {
                            return {
                                ...m,
                                files: m.files.map(f => f.id === fileId ? { ...f, ...updates } : f)
                            };
                        }
                        return m;
                    })
                };
            }
            return s;
        }));
    }, [activeSessionId, updateAndPersistSessions]);

    const handleAddUserMessage = useCallback((text: string, files: UploadedFile[] = []) => {
        if (!activeSessionId) return;
        
        const newMessage: ChatMessage = {
            id: generateUniqueId(),
            role: 'user',
            content: text,
            files,
            timestamp: new Date()
        };

        updateAndPersistSessions(prev => prev.map(s => {
            if (s.id === activeSessionId) {
                return {
                    ...s,
                    messages: [...s.messages, newMessage]
                };
            }
            return s;
        }));
        userScrolledUp.current = false;
    }, [activeSessionId, updateAndPersistSessions, userScrolledUp]);

    const handleLiveTranscript = useCallback((text: string, role: 'user' | 'model', isFinal: boolean) => {
        if (!activeSessionId) return;

        updateAndPersistSessions(prev => prev.map(s => {
            if (s.id !== activeSessionId) return s;

            let currentId = role === 'user' ? liveConversationRefs.current.userId : liveConversationRefs.current.modelId;
            let messages = [...s.messages];

            // If we don't have a current ID for this role, or the message is not found, create new
            let messageIndex = currentId ? messages.findIndex(m => m.id === currentId) : -1;

            if (messageIndex === -1) {
                // New message needed
                const newMessage: ChatMessage = {
                    id: generateUniqueId(),
                    role: role === 'user' ? 'user' : 'model',
                    content: text,
                    timestamp: new Date(),
                    // For model, we can treat it as 'isLoading' if needed, but for Live it's continuous.
                    // We'll mark it loading=true to show it's active, but we don't have a strict generationStartTime
                    // that matches the standard streaming logic.
                    isLoading: true 
                };
                messages.push(newMessage);
                if (role === 'user') liveConversationRefs.current.userId = newMessage.id;
                else liveConversationRefs.current.modelId = newMessage.id;
            } else {
                // Update existing
                const msg = messages[messageIndex];
                messages[messageIndex] = { ...msg, content: msg.content + text };
            }
            
            // If final or turn changed (implicit), we reset ref.
            // Note: `isFinal` from useLiveAPI might be triggered on turnComplete.
            if (isFinal) {
                 // Finalize the message
                 const index = role === 'user' ? liveConversationRefs.current.userId : liveConversationRefs.current.modelId;
                 const finalIndex = index ? messages.findIndex(m => m.id === index) : -1;
                 if (finalIndex !== -1) {
                     messages[finalIndex] = { ...messages[finalIndex], isLoading: false };
                 }

                 if (role === 'user') liveConversationRefs.current.userId = null;
                 else liveConversationRefs.current.modelId = null;
            }

            return { ...s, messages };
        }));
    }, [activeSessionId, updateAndPersistSessions]);

    return {
        handleUpdateMessageContent,
        handleUpdateMessageFile,
        handleAddUserMessage,
        handleLiveTranscript
    };
};
