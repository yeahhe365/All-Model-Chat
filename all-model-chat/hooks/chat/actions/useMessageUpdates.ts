
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
    
    // Track active message IDs for the live session within the closure of the hook instance
    const liveConversationRefs = useRef<{ userId: string|null, modelId: string|null }>({ userId: null, modelId: null });
    
    // Track pending session ID creation to prevent duplicates during async state updates
    const pendingSessionIdRef = useRef<string | null>(null);

    // Reset pending ref when activeSessionId matches (state caught up)
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
        let currentSessionId = activeSessionId || pendingSessionIdRef.current;

        // Auto-create session if sending message from New Chat state
        if (!currentSessionId) {
            const newSession = createNewSession({...DEFAULT_CHAT_SETTINGS, ...appSettings, ...currentChatSettings});
            currentSessionId = newSession.id;
            pendingSessionIdRef.current = currentSessionId;
            setActiveSessionId(currentSessionId);
            
            updateAndPersistSessions(prev => [newSession, ...prev]);
        }
        
        const newMessage = createMessage('user', text, { files });

        updateAndPersistSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
                return {
                    ...s,
                    messages: [...s.messages, newMessage],
                    timestamp: Date.now() // Update timestamp to move to top
                };
            }
            return s;
        }));
        userScrolledUp.current = false;
    }, [activeSessionId, updateAndPersistSessions, userScrolledUp, appSettings, currentChatSettings, setActiveSessionId]);

    const handleLiveTranscript = useCallback((text: string, role: 'user' | 'model', isFinal: boolean, type: 'content' | 'thought' = 'content', audioUrl?: string | null) => {
        let currentSessionId = activeSessionId || pendingSessionIdRef.current;

        // Auto-create session if receiving transcript in New Chat state
        if (!currentSessionId && text) {
            const newSession = createNewSession({...DEFAULT_CHAT_SETTINGS, ...appSettings, ...currentChatSettings}, [], "Live Session");
            currentSessionId = newSession.id;
            pendingSessionIdRef.current = currentSessionId;
            setActiveSessionId(currentSessionId);
            
            // Inject new session immediately
            updateAndPersistSessions(prev => [newSession, ...prev]);
        }

        if (!currentSessionId) return;

        updateAndPersistSessions(prev => prev.map(s => {
            if (s.id !== currentSessionId) return s;

            // Determine which ID we are currently tracking for this role
            let currentId = role === 'user' ? liveConversationRefs.current.userId : liveConversationRefs.current.modelId;
            let messages = [...s.messages];
            
            // Find the index of the existing message, if any
            let messageIndex = currentId ? messages.findIndex(m => m.id === currentId) : -1;

            // Only create or update if there is actual text content (or thoughts)
            // OR if there is an audioUrl to attach (e.g. at the end of a turn even if no text change)
            if (text || audioUrl) {
                if (messageIndex === -1) {
                    // Start a new message for this turn
                    const newMessage = createMessage(role === 'user' ? 'user' : 'model', type === 'content' ? text : '', {
                         thoughts: type === 'thought' ? text : undefined,
                         isLoading: true, // Mark as loading to indicate active stream/live status
                         firstTokenTimeMs: 0, // Initialize TTFT to 0 for Live API
                         audioSrc: audioUrl || undefined,
                         audioAutoplay: audioUrl ? false : undefined
                    });
                    
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
                    
                    if (text) {
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
                         thinkingTimeMs: finalThinkingTime
                     };
                 }
                 // Reset tracking ref for this role so next transcript starts a new message bubble
                 if (role === 'user') liveConversationRefs.current.userId = null;
                 else liveConversationRefs.current.modelId = null;
            }

            return { 
                ...s, 
                messages,
                timestamp: Date.now() // Update timestamp on live activity to keep session active/top
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
