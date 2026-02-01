
import React, { Dispatch, SetStateAction } from 'react';
import { AppSettings, ChatMessage, UploadedFile, ChatSettings as IndividualChatSettings, SavedChatSession } from '../../types';
import { UsageMetadata } from '@google/genai';

export type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;

export interface StreamHandlerFunctions {
    streamOnError: (error: Error) => void;
    streamOnComplete: (usageMetadata?: UsageMetadata, groundingMetadata?: any, urlContextMetadata?: any) => void;
    streamOnPart: (part: any) => void;
    onThoughtChunk: (thoughtChunk: string) => void;
}

export type GetStreamHandlers = (
    currentSessionId: string,
    generationId: string,
    abortController: AbortController,
    generationStartTime: Date,
    currentChatSettings: IndividualChatSettings,
    onSuccess?: (generationId: string, finalContent: string) => void
) => StreamHandlerFunctions;

export interface BaseSenderProps {
    appSettings: AppSettings;
    currentChatSettings: IndividualChatSettings;
    updateAndPersistSessions: SessionsUpdater;
    setLoadingSessionIds: Dispatch<SetStateAction<Set<string>>>;
    activeJobs: React.MutableRefObject<Map<string, AbortController>>;
    setAppFileError: (error: string | null) => void;
    language: 'en' | 'zh';
    setSessionLoading?: (sessionId: string, isLoading: boolean) => void; // New optional prop for Stage 1
}

export interface CanvasGeneratorProps extends BaseSenderProps {
    messages: ChatMessage[];
    activeSessionId: string | null;
    getStreamHandlers: GetStreamHandlers;
    aspectRatio: string;
}

export interface StandardChatProps extends BaseSenderProps {
    messages: ChatMessage[];
    selectedFiles: UploadedFile[];
    setSelectedFiles: (files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;
    editingMessageId: string | null;
    setEditingMessageId: (id: string | null) => void;
    aspectRatio: string;
    imageSize?: string;
    userScrolledUp: React.MutableRefObject<boolean>;
    activeSessionId: string | null;
    setActiveSessionId: (id: string | null) => void;
    getStreamHandlers: GetStreamHandlers;
    sessionKeyMapRef: React.MutableRefObject<Map<string, string>>;
    handleGenerateCanvas: (sourceMessageId: string, content: string) => Promise<void>;
}
