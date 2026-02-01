
import { useEffect, useCallback, useRef } from 'react';
import { logService } from '../../utils/appUtils';

export type SyncMessage =
    | { type: 'SETTINGS_UPDATED' }
    | { type: 'SESSIONS_UPDATED' } // For list additions/deletions
    | { type: 'GROUPS_UPDATED' }
    | { type: 'SESSION_CONTENT_UPDATED'; sessionId: string }; // For specific message updates

interface UseMultiTabSyncProps {
    onSettingsUpdated?: () => void;
    onSessionsUpdated?: () => void;
    onGroupsUpdated?: () => void;
    onSessionContentUpdated?: (sessionId: string) => void;
}

export const useMultiTabSync = ({
    onSettingsUpdated,
    onSessionsUpdated,
    onGroupsUpdated,
    onSessionContentUpdated
}: UseMultiTabSyncProps) => {
    const channelRef = useRef<BroadcastChannel | null>(null);
    const originalTitleRef = useRef<string>(document.title);

    // Initialize Channel
    useEffect(() => {
        const channel = new BroadcastChannel('all_model_chat_sync_v1');
        channelRef.current = channel;

        channel.onmessage = (event: MessageEvent<SyncMessage>) => {
            const msg = event.data;
            logService.debug(`[Sync] Received: ${msg.type}`, { category: 'SYSTEM', data: msg });

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
                    onSessionContentUpdated?.(msg.sessionId);
                    handleTitleNotification();
                    break;
            }
        };

        return () => {
            channel.close();
        };
    }, [onSettingsUpdated, onSessionsUpdated, onGroupsUpdated, onSessionContentUpdated]);

    // Handle Document Title Flashing for Background Tabs
    const handleTitleNotification = useCallback(() => {
        if (document.hidden) {
            originalTitleRef.current = document.title;
            document.title = "New Message! • All Model Chat";
            
            const restoreTitle = () => {
                document.title = originalTitleRef.current;
                document.removeEventListener('visibilitychange', restoreTitle);
            };
            document.addEventListener('visibilitychange', restoreTitle);
        }
    }, []);

    // Broadcast Function
    const broadcast = useCallback((message: SyncMessage) => {
        if (channelRef.current) {
            channelRef.current.postMessage(message);
        }
    }, []);

    return { broadcast };
};
