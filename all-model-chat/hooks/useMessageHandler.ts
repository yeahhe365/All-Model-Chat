import React, { Dispatch, SetStateAction } from 'react';
import { AppSettings, ChatMessage, UploadedFile, ChatSettings as IndividualChatSettings, SavedChatSession, InputCommand } from '../types';
import { useMessageSender } from './useMessageSender';
import { useMessageActions } from './useMessageActions';
import { useTextToSpeechHandler } from './useTextToSpeechHandler';

type CommandedInputSetter = Dispatch<SetStateAction<InputCommand | null>>;
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
    setEditMode: (mode: 'update' | 'resend') => void;
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
    sessionKeyMapRef: React.MutableRefObject<Map<string, string>>;
    language: 'en' | 'zh';
    setSessionLoading: (sessionId: string, isLoading: boolean) => void;
    broadcast?: any;
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
        setEditMode,
        setAppFileError,
        updateAndPersistSessions,
        userScrolledUp,
    } = props;
    
    const { handleSendMessage, handleGenerateCanvas } = useMessageSender(props);
    
    const messageActions = useMessageActions({
        messages,
        isLoading,
        activeSessionId,
        editingMessageId,
        activeJobs,
        setCommandedInput,
        setSelectedFiles,
        setEditingMessageId,
        setEditMode,
        setAppFileError,
        updateAndPersistSessions,
        userScrolledUp,
        handleSendMessage,
        setLoadingSessionIds: (v: any) => {
            if (typeof v === 'function' && activeSessionId) {
                // Compatibility for stop logic
                props.setSessionLoading(activeSessionId, false);
            }
        },
    });
    
    const { handleTextToSpeech, handleQuickTTS } = useTextToSpeechHandler(props);

    return {
        handleSendMessage,
        handleGenerateCanvas,
        ...messageActions,
        handleTextToSpeech,
        handleQuickTTS,
    };
};