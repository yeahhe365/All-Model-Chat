
import { useState, useEffect } from 'react';
import { streamingStore } from '../../services/streamingStore';

export const useMessageStream = (messageId: string, isStreaming: boolean) => {
    const [streamContent, setStreamContent] = useState<string>('');
    const [streamThoughts, setStreamThoughts] = useState<string>('');

    useEffect(() => {
        if (!isStreaming || !messageId) {
            setStreamContent('');
            setStreamThoughts('');
            return;
        }

        // Initialize with current store value
        setStreamContent(streamingStore.getContent(messageId));
        setStreamThoughts(streamingStore.getThoughts(messageId));

        const unsubscribe = streamingStore.subscribe(messageId, () => {
            setStreamContent(streamingStore.getContent(messageId));
            setStreamThoughts(streamingStore.getThoughts(messageId));
        });

        return () => {
            unsubscribe();
        };
    }, [messageId, isStreaming]);

    return { streamContent, streamThoughts };
};
