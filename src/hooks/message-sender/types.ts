
import React from 'react';
import { AppSettings, ChatMessage, ChatSettings as IndividualChatSettings, SavedChatSession } from '../../types';
import type { UsageMetadata } from '@google/genai';

export type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;

export interface StreamHandlerFunctions {
    streamOnError: (error: Error) => void;
    streamOnComplete: (usageMetadata?: UsageMetadata, groundingMetadata?: unknown, urlContextMetadata?: unknown) => void;
    streamOnPart: (part: Part) => void;
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
    setSessionLoading: (sessionId: string, isLoading: boolean) => void;
    activeJobs: React.MutableRefObject<Map<string, AbortController>>;
    setAppFileError: (error: string | null) => void;
    language: 'en' | 'zh';
}

export interface CanvasGeneratorProps extends BaseSenderProps {
    messages: ChatMessage[];
    activeSessionId: string | null;
    getStreamHandlers: GetStreamHandlers;
    aspectRatio: string;
}

export interface StandardChatProps extends BaseSenderProps {
    messages: ChatMessage[];
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
