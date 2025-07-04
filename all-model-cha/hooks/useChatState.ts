import { useState, useRef } from 'react';
import { ChatMessage, UploadedFile, ChatSettings as IndividualChatSettings } from '../types';
import { DEFAULT_CHAT_SETTINGS } from '../constants/appConstants';
import { Chat } from '@google/genai';

export const useChatState = () => {
    // Core state
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [currentChatSettings, setCurrentChatSettings] = useState<IndividualChatSettings>(DEFAULT_CHAT_SETTINGS);
    const [inputText, setInputText] = useState<string>('');
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<string>('16:9');
    const [ttsMessageId, setTtsMessageId] = useState<string | null>(null);

    // File state
    const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
    const [appFileError, setAppFileError] = useState<string | null>(null);

    // Processing/loading state
    const [isAppProcessingFile, setIsAppProcessingFile] = useState<boolean>(false);
    const [isSwitchingModel, setIsSwitchingModel] = useState<boolean>(false);
    
    // Refs for managing UI behavior and async operations
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const userScrolledUp = useRef<boolean>(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const sessionSaveTimeoutRef = useRef<number | null>(null);

    return {
        messages, setMessages,
        isLoading, setIsLoading,
        currentChatSettings, setCurrentChatSettings,
        inputText, setInputText,
        editingMessageId, setEditingMessageId,
        aspectRatio, setAspectRatio,
        ttsMessageId, setTtsMessageId,
        selectedFiles, setSelectedFiles,
        appFileError, setAppFileError,
        isAppProcessingFile, setIsAppProcessingFile,
        isSwitchingModel, setIsSwitchingModel,
        messagesEndRef,
        scrollContainerRef,
        userScrolledUp,
        abortControllerRef,
        sessionSaveTimeoutRef
    };
};