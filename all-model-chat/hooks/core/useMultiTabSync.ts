import { useEffect, useCallback, useRef } from 'react';
import { logService } from '../../utils/appUtils';

export type SyncMessage =
    | { type: 'SETTINGS_UPDATED' }
    | { type: 'SESSIONS_UPDATED' } 
    | { type: 'GROUPS_UPDATED' }
    | { type: 'SESSION_CONTENT_UPDATED'; sessionId: string } 
    | { type: 'SESSION_LOADING'; sessionId: string; isLoading: boolean };

interface UseMultiTabSyncProps {
    onSettingsUpdated?: () => void;
    onSessionsUpdated?: () => void;
    onGroupsUpdated?: () => void;
    onSessionContentUpdated?: (sessionId: string) => void;
    onSessionLoading?: (sessionId: string, isLoading: boolean) => void;
}

export const useMultiTabSync = ({
    onSettingsUpdated,
    onSessionsUpdated,
    onGroupsUpdated,
    onSessionContentUpdated,
    onSessionLoading
}: UseMultiTabSyncProps) => {
    const channelRef = useRef<BroadcastChannel | null>(null);
    const originalTitleRef = useRef<string>(document.title);

    useEffect(() => {
        const channel = new BroadcastChannel('all_model_chat_sync_v1');
        channelRef.current = channel;

        channel.onmessage = (event: MessageEvent<SyncMessage>) => {
            const msg = event.data;
            if (msg.type !== 'SESSION_LOADING') {
                logService.debug(`[Sync] Received: ${msg.type}`, { category: 'SYSTEM', data: msg });
            }

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
                case 'SESSION_LOADING':
                    onSessionLoading?.(msg.sessionId, msg.isLoading);
                    break;
            }
        };

        return () => {
            channel.close();
        };
    }, [onSettingsUpdated, onSessionsUpdated, onGroupsUpdated, onSessionContentUpdated, onSessionLoading]);

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

    const broadcast = useCallback((message: SyncMessage) => {
        if (channelRef.current) {
            channelRef.current.postMessage(message);
        }
    }, []);

    return { broadcast };
};