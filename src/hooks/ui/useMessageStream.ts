
import { useCallback, useSyncExternalStore } from 'react';
import { streamingStore } from '../../services/streamingStore';

export const useMessageStream = (messageId: string, isStreaming: boolean) => {
    const subscribe = useCallback((onStoreChange: () => void) => {
        if (!isStreaming || !messageId) {
            return () => {};
        }

        return streamingStore.subscribe(messageId, onStoreChange);
    }, [isStreaming, messageId]);

    const getContentSnapshot = useCallback(() => {
        if (!isStreaming || !messageId) return '';
        return streamingStore.getContent(messageId);
    }, [isStreaming, messageId]);

    const getThoughtsSnapshot = useCallback(() => {
        if (!isStreaming || !messageId) return '';
        return streamingStore.getThoughts(messageId);
    }, [isStreaming, messageId]);

    const streamContent = useSyncExternalStore(subscribe, getContentSnapshot, () => '');
    const streamThoughts = useSyncExternalStore(subscribe, getThoughtsSnapshot, () => '');

    return { streamContent, streamThoughts };
};
