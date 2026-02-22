import React, { useCallback, useRef, useEffect } from 'react';
import { SavedChatSession, ChatMessage, UploadedFile, VideoMetadata, AppSettings, ChatSettings as IndividualChatSettings } from '../../../types';
import { generateUniqueId, logService, createNewSession, createMessage } from '../../../utils/appUtils';
import { MediaResolution } from '../../../types/settings';
import { DEFAULT_CHAT_SETTINGS } from '../../../constants/appConstants';

interface UseMessageUpdatesProps {
    activeSessionId: string | null;
    setActiveSessionId: (id: string) => void;
    appSettings: AppSettings;
    currentChatSettings: IndividualChatSettings;
    updateAndPersistSessions: (updater: (prev: SavedChatSession[]) => SavedChatSession[], options?: { persist?: boolean }) => void;
    userScrolledUp: React.MutableRefObject<boolean>;
}

export const useMessageUpdates = ({
    activeSessionId,
    setActiveSessionId,
    appSettings,
    currentChatSettings,
    updateAndPersistSessions,
    userScrolledUp,
}: UseMessageUpdatesProps) => {
    
    const liveConversationRefs = useRef<{ userId: string|null, modelId: string|null }>({ userId: null, modelId: null });
    
    const pendingSessionIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (activeSessionId && activeSessionId === pendingSessionIdRef.current) {
            pendingSessionIdRef.current = null;
        }
    }, [activeSessionId]);

    const handleUpdateMessageContent = useCallback((messageId: string, newContent: string) => {
        if (!activeSessionId) return;
        logService.info("Tampering message content", { messageId });
        updateAndPersistSessions(prev => prev.map(s => {
            if (s.id === activeSessionId) {
                return {
                    ...s,
                    messages: s.messages.map(m => m.id === messageId ? { ...m, content: newContent, apiParts: undefined } : m)
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
        let currentSessionId = activeSessionId || pendingSessionIdRef.current;

        if (!currentSessionId) {
            const newSession = createNewSession({...DEFAULT_CHAT_SETTINGS, ...appSettings, ...currentChatSettings});
            currentSessionId = newSession.id;
            pendingSessionIdRef.current = currentSessionId;
            setActiveSessionId(currentSessionId);
            
            updateAndPersistSessions(prev => [newSession, ...prev]);
        }
        
        // MEMORY OPTIMIZATION: Strip rawFile
        const optimizedFiles = files.map(f => {
            const { rawFile, abortController, ...rest } = f;
            return rest as UploadedFile;
        });

        const newMessage = createMessage('user', text, { files: optimizedFiles.length > 0 ? optimizedFiles : undefined });

        updateAndPersistSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
                return {
                    ...s,
                    messages: [...s.messages, newMessage],
                    timestamp: Date.now()
                };
            }
            return s;
        }));
        userScrolledUp.current = false;
    }, [activeSessionId, updateAndPersistSessions, userScrolledUp, appSettings, currentChatSettings, setActiveSessionId]);

    const handleLiveTranscript = useCallback((text: string, role: 'user' | 'model', isFinal: boolean, type: 'content' | 'thought' = 'content', audioUrl?: string | null) => {
        let currentSessionId = activeSessionId || pendingSessionIdRef.current;

        if (!currentSessionId && text) {
            const newSession = createNewSession({...DEFAULT_CHAT_SETTINGS, ...appSettings, ...currentChatSettings}, [], "Live Session");
            currentSessionId = newSession.id;
            pendingSessionIdRef.current = currentSessionId;
            setActiveSessionId(currentSessionId);
            
            updateAndPersistSessions(prev => [newSession, ...prev]);
        }

        if (!currentSessionId) return;

        updateAndPersistSessions(prev => prev.map(s => {
            if (s.id !== currentSessionId) return s;

            let currentId = role === 'user' ? liveConversationRefs.current.userId : liveConversationRefs.current.modelId;
            let messages = [...s.messages];
            
            let messageIndex = currentId ? messages.findIndex(m => m.id === currentId) : -1;

            if (text || audioUrl) {
                if (messageIndex === -1) {
                    const newMessage = createMessage(role === 'user' ? 'user' : 'model', type === 'content' ? text : '', {
                         thoughts: type === 'thought' ? text : undefined,
                         isLoading: true, 
                         firstTokenTimeMs: 0, 
                         audioSrc: audioUrl || undefined,
                         audioAutoplay: audioUrl ? false : undefined
                    });
                    
                    messages.push(newMessage);
                    
                    if (role === 'user') liveConversationRefs.current.userId = newMessage.id;
                    else liveConversationRefs.current.modelId = newMessage.id;
                    
                    messageIndex = messages.length - 1;
                } else {
                    const msg = messages[messageIndex];
                    const updates: Partial<ChatMessage> = {};
                    
                    if (text) {
                        if (type === 'thought') {
                            updates.thoughts = (msg.thoughts || '') + text;
                        } else {
                            if (msg.thoughts && !msg.thinkingTimeMs && msg.generationStartTime) {
                                updates.thinkingTimeMs = new Date().getTime() - msg.generationStartTime.getTime();
                            }
                            updates.content = msg.content + text;
                        }
                    }
                    
                    if (audioUrl) {
                        updates.audioSrc = audioUrl;
                        updates.audioAutoplay = false;
                    }
                    
                    messages[messageIndex] = { ...msg, ...updates };
                }
            }
            
            if (isFinal) {
                 if (messageIndex !== -1) {
                     const updatedMsg = messages[messageIndex];
                     
                     let finalThinkingTime = updatedMsg.thinkingTimeMs;
                     if (updatedMsg.thoughts && !finalThinkingTime && updatedMsg.generationStartTime) {
                         finalThinkingTime = new Date().getTime() - updatedMsg.generationStartTime.getTime();
                     }

                     messages[messageIndex] = { 
                         ...updatedMsg, 
                         isLoading: false,
                         generationEndTime: new Date(),
                         thinkingTimeMs: finalThinkingTime
                     };
                 }
                 if (role === 'user') liveConversationRefs.current.userId = null;
                 else liveConversationRefs.current.modelId = null;
            }

            return { 
                ...s, 
                messages,
                timestamp: Date.now() 
            };
        }));
    }, [activeSessionId, updateAndPersistSessions, appSettings, currentChatSettings, setActiveSessionId]);

    return {
        handleUpdateMessageContent,
        handleUpdateMessageFile,
        handleAddUserMessage,
        handleLiveTranscript
    };
};
