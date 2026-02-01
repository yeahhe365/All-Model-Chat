import { useEffect, useCallback, useRef } from 'react';
import { logService } from '../../utils/appUtils';

export type SyncMessage =
    | { type: 'SETTINGS_UPDATED' }
    | { type: 'SESSIONS_UPDATED' } 
    | { type: 'GROUPS_UPDATED' }
    | { type: 'SESSION_CONTENT_UPDATED'; sessionId: string } 
    | { type: 'SESSION_LOADING'; sessionId: string; isLoading: boolean }
    | { 
        type: 'SESSION_PART'; 
        sessionId: string; 
        generationId: string; 
        generationStartTime: string; 
        part: any; 
        firstContentPartTime: string | null 
      }
    | { 
        type: 'SESSION_THOUGHT'; 
        sessionId: string; 
        generationId: string; 
        generationStartTime: string; 
        thoughtChunk: string 
      };

interface UseMultiTabSyncProps {
    onSettingsUpdated?: () => void;
    onSessionsUpdated?: () => void;
    onGroupsUpdated?: () => void;
    onSessionContentUpdated?: (sessionId: string) => void;
    onSessionLoading?: (sessionId: string, isLoading: boolean) => void;
    onSessionPart?: (data: { sessionId: string; generationId: string; generationStartTime: Date; part: any; firstContentPartTime: Date | null }) => void;
    onSessionThought?: (data: { sessionId: string; generationId: string; generationStartTime: Date; thoughtChunk: string }) => void;
}

export const useMultiTabSync = ({
    onSettingsUpdated,
    onSessionsUpdated,
    onGroupsUpdated,
    onSessionContentUpdated,
    onSessionLoading,
    onSessionPart,
    onSessionThought
}: UseMultiTabSyncProps) => {
    const channelRef = useRef<BroadcastChannel | null>(null);
    const originalTitleRef = useRef<string>(document.title);

    useEffect(() => {
        const channel = new BroadcastChannel('all_model_chat_sync_v1');
        channelRef.current = channel;

        channel.onmessage = (event: MessageEvent<SyncMessage>) => {
            const msg = event.data;
            
            // Debug logging for non-verbose events
            if (msg.type !== 'SESSION_LOADING' && msg.type !== 'SESSION_PART' && msg.type !== 'SESSION_THOUGHT') {
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
                case 'SESSION_PART':
                    onSessionPart?.({
                        sessionId: msg.sessionId,
                        generationId: msg.generationId,
                        generationStartTime: new Date(msg.generationStartTime),
                        part: msg.part,
                        firstContentPartTime: msg.firstContentPartTime ? new Date(msg.firstContentPartTime) : null
                    });
                    break;
                case 'SESSION_THOUGHT':
                    onSessionThought?.({
                        sessionId: msg.sessionId,
                        generationId: msg.generationId,
                        generationStartTime: new Date(msg.generationStartTime),
                        thoughtChunk: msg.thoughtChunk
                    });
                    break;
            }
        };

        return () => {
            channel.close();
        };
    }, [onSettingsUpdated, onSessionsUpdated, onGroupsUpdated, onSessionContentUpdated, onSessionLoading, onSessionPart, onSessionThought]);

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