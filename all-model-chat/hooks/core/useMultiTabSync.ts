
import { useEffect, useCallback, useRef } from 'react';
import { logService } from '../../utils/appUtils';

export type SyncMessage =
    | { type: 'SETTINGS_UPDATED' }
    | { type: 'SESSIONS_UPDATED' } // For list additions/deletions
    | { type: 'GROUPS_UPDATED' }
    | { type: 'SESSION_CONTENT_UPDATED'; sessionId: string; timestamp?: number } // For specific message updates
    | { type: 'SESSION_LOADING'; sessionId: string; isLoading: boolean; senderTabId: string }; 

interface UseMultiTabSyncProps {
    onSettingsUpdated?: () => void;
    onSessionsUpdated?: () => void;
    onGroupsUpdated?: () => void;
    onSessionContentUpdated?: (sessionId: string) => void;
    onSessionLoading?: (sessionId: string, isLoading: boolean) => void;
}

// Unique ID for this tab instance
const TAB_ID = Math.random().toString(36).substring(2, 11);

export const useMultiTabSync = ({
    onSettingsUpdated,
    onSessionsUpdated,
    onGroupsUpdated,
    onSessionContentUpdated,
    onSessionLoading
}: UseMultiTabSyncProps) => {
    const channelRef = useRef<BroadcastChannel | null>(null);
    const originalTitleRef = useRef<string>(document.title);
    const lastProcessedContentUpdateRef = useRef<Record<string, number>>({});

    // Initialize Channel
    useEffect(() => {
        const channel = new BroadcastChannel('all_model_chat_sync_v1');
        channelRef.current = channel;

        channel.onmessage = (event: MessageEvent<SyncMessage>) => {
            const msg = event.data;
            
            // Optimization: Ignore messages from self (though BroadcastChannel usually doesn't send to self)
            // but explicitly useful for loading states tracking sender.

            switch (msg.type) {
                case 'SETTINGS_UPDATED':
                    onSettingsUpdated?.();
                    break;
                case 'SESSIONS_UPDATED':
                    onSessionsUpdated?.();
                    break;
                case 'GROUPS_UPDATED':
                    onGroupsUpdated?.();
                    break;
                case 'SESSION_CONTENT_UPDATED':
                    // Debounce/Sequence protection for content updates
                    const lastTs = lastProcessedContentUpdateRef.current[msg.sessionId] || 0;
                    if (msg.timestamp && msg.timestamp <= lastTs) return;
                    if (msg.timestamp) lastProcessedContentUpdateRef.current[msg.sessionId] = msg.timestamp;

                    onSessionContentUpdated?.(msg.sessionId);
                    handleTitleNotification();
                    break;
                case 'SESSION_LOADING':
                    if (msg.senderTabId === TAB_ID) return;
                    onSessionLoading?.(msg.sessionId, msg.isLoading);
                    break;
            }
        };

        return () => {
            channel.close();
        };
    }, [onSettingsUpdated, onSessionsUpdated, onGroupsUpdated, onSessionContentUpdated, onSessionLoading]);

    // Handle Document Title Flashing for Background Tabs
    const handleTitleNotification = useCallback(() => {
        if (document.hidden) {
            originalTitleRef.current = document.title;
            // Short-lived title notification
            document.title = "New Message! • All Model Chat";
            
            const restoreTitle = () => {
                document.title = originalTitleRef.current;
                document.removeEventListener('visibilitychange', restoreTitle);
            };
            document.addEventListener('visibilitychange', restoreTitle);
        }
    }, []);

    // Broadcast Function with tab ID and timestamp for better ordering
    const broadcast = useCallback((message: Omit<SyncMessage, 'senderTabId' | 'timestamp'>) => {
        if (channelRef.current) {
            const enrichedMessage = {
                ...message,
                senderTabId: TAB_ID,
                timestamp: Date.now()
            } as SyncMessage;
            channelRef.current.postMessage(enrichedMessage);
        }
    }, []);

    return { broadcast };
};
