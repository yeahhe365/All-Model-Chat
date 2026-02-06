
import { useState, useRef, useEffect } from 'react';
import { SavedChatSession, ChatGroup, ChatMessage } from '../../../types';
import { ACTIVE_CHAT_SESSION_ID_KEY } from '../../../constants/appConstants';

export const useSessionData = () => {
    // Session Metadata List (messages field is usually empty in this array to save memory)
    const [savedSessions, setSavedSessions] = useState<SavedChatSession[]>([]);
    const [savedGroups, setSavedGroups] = useState<ChatGroup[]>([]);
    
    // Active Session State
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([]);
    
    // Refs to access latest state inside heavy updaters without adding dependencies
    const activeMessagesRef = useRef<ChatMessage[]>([]);
    const activeSessionIdRef = useRef<string | null>(null);

    useEffect(() => { activeMessagesRef.current = activeMessages; }, [activeMessages]);
    useEffect(() => { activeSessionIdRef.current = activeSessionId; }, [activeSessionId]);

    // Sync active session ID to sessionStorage and URL history
    useEffect(() => {
        if (activeSessionId) {
            try {
                sessionStorage.setItem(ACTIVE_CHAT_SESSION_ID_KEY, activeSessionId);
            } catch (e) {}
            
            const targetPath = `/chat/${activeSessionId}`;
            try {
                if (window.location.pathname !== targetPath) {
                    if (window.location.pathname.startsWith('/chat/')) {
                        window.history.replaceState({ sessionId: activeSessionId }, '', targetPath);
                    } else {
                        window.history.pushState({ sessionId: activeSessionId }, '', targetPath);
                    }
                }
            } catch (e) {
                console.warn('Unable to update URL history:', e);
            }
        } else {
            try {
                sessionStorage.removeItem(ACTIVE_CHAT_SESSION_ID_KEY);
            } catch (e) {}
            
            try {
                if (window.location.pathname !== '/' && !window.location.pathname.startsWith('/chat/')) {
                     window.history.pushState({}, '', '/');
                }
            } catch (e) {
                console.warn('Unable to update URL history:', e);
            }
        }
    }, [activeSessionId]);

    return {
        savedSessions, setSavedSessions,
        savedGroups, setSavedGroups,
        activeSessionId, setActiveSessionId,
        activeMessages, setActiveMessages,
        activeSessionIdRef,
        activeMessagesRef
    };
};
