import { Dispatch, SetStateAction } from 'react';
import { AppSettings, ChatMessage, UploadedFile, ChatSettings as IndividualChatSettings, SavedChatSession } from '../types';
import { useMessageSender } from './useMessageSender';
import { useMessageActions } from './useMessageActions';
import { useTextToSpeechHandler } from './useTextToSpeechHandler';
import { Chat } from '@google/genai';

type CommandedInputSetter = Dispatch<SetStateAction<{ text: string; id: number; } | null>>;
type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;

interface MessageHandlerProps {
    appSettings: AppSettings;
    messages: ChatMessage[];
    isLoading: boolean;
    currentChatSettings: IndividualChatSettings;
    selectedFiles: UploadedFile[];
    setSelectedFiles: (files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;
    editingMessageId: string | null;
    setEditingMessageId: (id: string | null) => void;
    setAppFileError: (error: string | null) => void;
    aspectRatio: string;
    userScrolledUp: React.MutableRefObject<boolean>;
    ttsMessageId: string | null;
    setTtsMessageId: (id: string | null) => void;
    activeSessionId: string | null;
    setActiveSessionId: (id: string | null) => void;
    setCommandedInput: CommandedInputSetter;
    activeJobs: React.MutableRefObject<Map<string, AbortController>>;
    loadingSessionIds: Set<string>;
    setLoadingSessionIds: Dispatch<SetStateAction<Set<string>>>;
    updateAndPersistSessions: SessionsUpdater;
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    chat: Chat | null;
}

export const useMessageHandler = (props: MessageHandlerProps) => {
    const { 
        messages, 
        isLoading, 
        activeSessionId, 
        editingMessageId, 
        activeJobs,
        setCommandedInput,
        setSelectedFiles,
        setEditingMessageId,
        setAppFileError,
        updateAndPersistSessions,
        userScrolledUp,
        setLoadingSessionIds
    } = props;
    
    const { handleSendMessage } = useMessageSender(props);
    
    const messageActions = useMessageActions({
        messages,
        isLoading,
        activeSessionId,
        editingMessageId,
        activeJobs,
        setCommandedInput,
        setSelectedFiles,
        setEditingMessageId,
        setAppFileError,
        updateAndPersistSessions,
        userScrolledUp,
        handleSendMessage,
        setLoadingSessionIds,
    });
    
    const { handleTextToSpeech } = useTextToSpeechHandler(props);

    return {
        handleSendMessage,
        ...messageActions,
        handleTextToSpeech,
    };
};
