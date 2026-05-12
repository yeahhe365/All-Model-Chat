import type React from 'react';
import {
  type AppSettings,
  type ChatMessage,
  type ChatSettings as IndividualChatSettings,
  type SavedChatSession,
  type UploadedFile,
} from '@/types';
import type { Part, UsageMetadata } from '@google/genai';
import type { ImageOutputMode, ImagePersonGeneration } from '@/types/settings';
import type { getTranslator } from '@/i18n/translations';

export type SessionsUpdater = (
  updater: (prev: SavedChatSession[]) => SavedChatSession[],
  options?: { persist?: boolean },
) => void;

export type MessageSenderTranslator = ReturnType<typeof getTranslator>;

export interface StreamHandlerFunctions {
  streamOnError: (error: Error) => void;
  streamOnComplete: (
    usageMetadata?: UsageMetadata,
    groundingMetadata?: unknown,
    urlContextMetadata?: unknown,
    generatedFiles?: UploadedFile[],
  ) => void;
  streamOnPart: (part: Part) => void;
  onThoughtChunk: (thoughtChunk: string) => void;
}

export type GetStreamHandlers = (
  currentSessionId: string,
  generationId: string,
  abortController: AbortController,
  generationStartTime: Date,
  currentChatSettings: IndividualChatSettings,
  requestParts?: Part[],
  onSuccess?: (generationId: string, finalContent: string) => void,
  transformFinalContent?: (finalContent: string) => string,
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

export interface LiveArtifactsGeneratorProps extends BaseSenderProps {
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
  imageOutputMode: ImageOutputMode;
  personGeneration: ImagePersonGeneration;
  userScrolledUpRef: React.MutableRefObject<boolean>;
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  getStreamHandlers: GetStreamHandlers;
  sessionKeyMapRef: React.MutableRefObject<Map<string, string>>;
  handleGenerateLiveArtifacts: (sourceMessageId: string, content: string) => Promise<void>;
}
