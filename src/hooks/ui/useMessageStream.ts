import { useCallback, useSyncExternalStore } from 'react';
import { streamingStore } from '../../services/streamingStore';

const EMPTY_STREAM = {
    streamContent: '',
    streamThoughts: '',
};

export const useMessageStream = (messageId: string, isStreaming: boolean) => {
    const subscribe = useCallback((onStoreChange: () => void) => {
        if (!isStreaming || !messageId) {
            return () => {};
        }

        return streamingStore.subscribe(messageId, onStoreChange);
    }, [isStreaming, messageId]);

    const getSnapshot = useCallback(() => {
        if (!isStreaming || !messageId) {
            return EMPTY_STREAM;
        }

        return {
            streamContent: streamingStore.getContent(messageId),
            streamThoughts: streamingStore.getThoughts(messageId),
        };
    }, [isStreaming, messageId]);

    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};
