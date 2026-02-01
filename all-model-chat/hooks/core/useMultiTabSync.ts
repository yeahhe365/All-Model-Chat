import { useEffect, useCallback, useRef } from 'react';
import { logService } from '../../utils/appUtils';
import { Part } from '@google/genai';

export type SyncMessage =
    | { type: 'SETTINGS_UPDATED' }
    | { type: 'SESSIONS_UPDATED' } 
    | { type: 'GROUPS_UPDATED' }
    | { type: 'SESSION_CONTENT_UPDATED'; sessionId: string } 
    | { type: 'SESSION_LOADING'; sessionId: string; isLoading: boolean }
    | { type: 'ACTIVE_SESSION_CHANGED'; sessionId: string | null }
    | { type: 'STREAM_PART_RECEIVED'; sessionId: string; part: Part; generationStartTime: number }
    | { type: 'STREAM_THOUGHT_RECEIVED'; sessionId: string; thoughtChunk: string; generationStartTime: number };

interface UseMultiTabSyncProps {
    onSettingsUpdated?: () => void;
    onSessionsUpdated?: () => void;
    onGroupsUpdated?: () => void;
    onSessionContentUpdated?: (sessionId: string) => void;
    onSessionLoading?: (sessionId: string, isLoading: boolean) => void;
    onActiveSessionChanged?: (sessionId: string | null) => void;
    onStreamPartReceived?: (sessionId: string, part: Part, startTime: Date) => void;
    onStreamThoughtReceived?: (sessionId: string, thoughtChunk: string, startTime: Date) => void;
}

export const useMultiTabSync = ({
    onSettingsUpdated,
    onSessionsUpdated,
    onGroupsUpdated,
    onSessionContentUpdated,
    onSessionLoading,
    onActiveSessionChanged,
    onStreamPartReceived,
    onStreamThoughtReceived
}: UseMultiTabSyncProps) => {
    const channelRef = useRef<BroadcastChannel | null>(null);
    const originalTitleRef = useRef<string>(document.title);

    useEffect(() => {
        const channel = new BroadcastChannel('all_model_chat_sync_v1');
        channelRef.current = channel;

        channel.onmessage = (event: MessageEvent<SyncMessage>) => {
            const msg = event.data;
            if (msg.type !== 'SESSION_LOADING' && msg.type !== 'STREAM_PART_RECEIVED' && msg.type !== 'STREAM_THOUGHT_RECEIVED') {
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
                case 'ACTIVE_SESSION_CHANGED':
                    onActiveSessionChanged?.(msg.sessionId);
                    break;
                case 'STREAM_PART_RECEIVED':
                    onStreamPartReceived?.(msg.sessionId, msg.part, new Date(msg.generationStartTime));
                    break;
                case 'STREAM_THOUGHT_RECEIVED':
                    onStreamThoughtReceived?.(msg.sessionId, msg.thoughtChunk, new Date(msg.generationStartTime));
                    break;
            }
        };

        return () => {
            channel.close();
        };
    }, [onSettingsUpdated, onSessionsUpdated, onGroupsUpdated, onSessionContentUpdated, onSessionLoading, onActiveSessionChanged, onStreamPartReceived, onStreamThoughtReceived]);

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