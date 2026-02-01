
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
    setSessionLoading: (sessionId: string, isLoading: boolean) => void;
    updateAndPersistSessions: SessionsUpdater;
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    sessionKeyMapRef: React.MutableRefObject<Map<string, string>>;
    language: 'en' | 'zh';
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
        setSessionLoading
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
        setSessionLoading,
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
