
import React, { Dispatch, SetStateAction, useCallback } from 'react';
import { AppSettings, SavedChatSession, ChatMessage, ChatSettings as IndividualChatSettings } from '../../types';
import { Part, UsageMetadata } from '@google/genai';
import { useApiErrorHandler } from './useApiErrorHandler';
import { logService, showNotification, calculateTokenStats, playCompletionSound } from '../../utils/appUtils';
import { APP_LOGO_SVG_DATA_URI } from '../../constants/appConstants';
import { finalizeMessages, updateMessagesWithBatch } from '../chat-stream/processors';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[], options?: { persist?: boolean }) => void;

interface ChatStreamHandlerProps {
    appSettings: AppSettings;
    updateAndPersistSessions: SessionsUpdater;
    setSessionLoading: (sessionId: string, isLoading: boolean) => void;
    activeJobs: React.MutableRefObject<Map<string, AbortController>>;
}

const UPDATE_THROTTLE_MS = 100;
const DB_PERSIST_INTERVAL_MS = 2000;

export const useChatStreamHandler = ({
    appSettings,
    updateAndPersistSessions,
    setSessionLoading,
    activeJobs
}: ChatStreamHandlerProps) => {
    const { handleApiError } = useApiErrorHandler(updateAndPersistSessions);

    const getStreamHandlers = useCallback((
        currentSessionId: string,
        generationId: string,
        abortController: AbortController,
        generationStartTime: Date,
        currentChatSettings: IndividualChatSettings,
        onSuccess?: (generationId: string, finalContent: string) => void
    ) => {
        const newModelMessageIds = new Set<string>([generationId]);
        let firstContentPartTime: Date | null = null;
        let accumulatedText = "";

        // Buffers for Throttling
        let bufferedParts: Part[] = [];
        let bufferedThought = "";
        let lastFlushTime = 0;
        let lastPersistTime = Date.now();
        let flushTimeout: ReturnType<typeof setTimeout> | null = null;

        const flushUpdates = () => {
            if (flushTimeout) {
                clearTimeout(flushTimeout);
                flushTimeout = null;
            }

            // Only update if there is something to update
            if (bufferedParts.length === 0 && !bufferedThought) return;

            const partsToProcess = [...bufferedParts];
            const thoughtToProcess = bufferedThought;
            
            // Clear buffers immediately to prevent race conditions or double processing
            bufferedParts = [];
            bufferedThought = "";
            lastFlushTime = Date.now();

            const now = Date.now();
            // Persist to DB if enough time has passed since last persistence
            const shouldPersist = (now - lastPersistTime) >= DB_PERSIST_INTERVAL_MS;
            if (shouldPersist) {
                lastPersistTime = now;
            }

            updateAndPersistSessions(prev => {
                const sessionIndex = prev.findIndex(s => s.id === currentSessionId);
                if (sessionIndex === -1) return prev;

                const newSessions = [...prev];
                const sessionToUpdate = { ...newSessions[sessionIndex] };
                
                // Use batch processor to update messages efficiently with one state change
                const updatedMessages = updateMessagesWithBatch(
                    sessionToUpdate.messages,
                    partsToProcess,
                    thoughtToProcess,
                    generationStartTime,
                    newModelMessageIds,
                    firstContentPartTime
                );
                
                sessionToUpdate.messages = updatedMessages;
                newSessions[sessionIndex] = sessionToUpdate;
                
                return newSessions;
            }, { persist: shouldPersist });
        };

        const throttleUpdate = () => {
            const now = Date.now();
            if (now - lastFlushTime >= UPDATE_THROTTLE_MS) {
                flushUpdates();
            } else if (!flushTimeout) {
                flushTimeout = setTimeout(flushUpdates, UPDATE_THROTTLE_MS);
            }
        };

        const streamOnError = (error: Error) => {
            if (flushTimeout) clearTimeout(flushTimeout); // Clear pending updates on error
            handleApiError(error, currentSessionId, generationId);
            setSessionLoading(currentSessionId, false);
            activeJobs.current.delete(generationId);
        };

        const streamOnComplete = (usageMetadata?: UsageMetadata, groundingMetadata?: any, urlContextMetadata?: any) => {
            // Ensure any pending buffered data is written before finalizing
            flushUpdates();

            const lang = appSettings.language === 'system' 
                ? (navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en')
                : appSettings.language;

            if (appSettings.isStreamingEnabled && !firstContentPartTime) {
                firstContentPartTime = new Date();
            }

            if (usageMetadata) {
                const { promptTokens, completionTokens } = calculateTokenStats(usageMetadata);
                logService.recordTokenUsage(
                    currentChatSettings.modelId,
                    promptTokens,
                    completionTokens
                );
            }

            updateAndPersistSessions(prev => {
                const sessionIndex = prev.findIndex(s => s.id === currentSessionId);
                if (sessionIndex === -1) return prev;

                const newSessions = [...prev];
                const sessionToUpdate = { ...newSessions[sessionIndex] };
                
                const { updatedMessages, completedMessageForNotification } = finalizeMessages(
                    sessionToUpdate.messages,
                    generationStartTime,
                    newModelMessageIds,
                    currentChatSettings,
                    lang,
                    firstContentPartTime,
                    usageMetadata,
                    groundingMetadata,
                    urlContextMetadata,
                    abortController.signal.aborted
                );

                sessionToUpdate.messages = updatedMessages;
                newSessions[sessionIndex] = sessionToUpdate;

                if (completedMessageForNotification) {
                    if (appSettings.isCompletionSoundEnabled) {
                        playCompletionSound();
                    }
                    if (appSettings.isCompletionNotificationEnabled && document.hidden) {
                        const notificationBody = (completedMessageForNotification.content || "Media or tool response received").substring(0, 150) + (completedMessageForNotification.content && completedMessageForNotification.content.length > 150 ? '...' : '');
                        showNotification(
                            'Response Ready', 
                            {
                                body: notificationBody,
                                icon: APP_LOGO_SVG_DATA_URI,
                            }
                        );
                    }
                }

                return newSessions;
            }, { persist: true });

            setSessionLoading(currentSessionId, false);
            activeJobs.current.delete(generationId);

            if (onSuccess && !abortController.signal.aborted) {
                setTimeout(() => onSuccess(generationId, accumulatedText), 0);
            }
        };

        const streamOnPart = (part: Part) => {
            const anyPart = part as any;
            
            if (anyPart.text) {
                accumulatedText += anyPart.text;
            }

            const hasMeaningfulContent = 
                (anyPart.text && anyPart.text.trim().length > 0) || 
                anyPart.executableCode || 
                anyPart.codeExecutionResult || 
                anyPart.inlineData;

            if (appSettings.isStreamingEnabled && !firstContentPartTime && hasMeaningfulContent) {
                firstContentPartTime = new Date();
            }
        
            // Buffer the part
            bufferedParts.push(part);
            
            // Trigger throttled update
            throttleUpdate();
        };
        
        const onThoughtChunk = (thoughtChunk: string) => {
            // Buffer the thought
            bufferedThought += thoughtChunk;
            
            // Trigger throttled update
            throttleUpdate();
        };
        
        return { streamOnError, streamOnComplete, streamOnPart, onThoughtChunk };

    }, [appSettings.isStreamingEnabled, appSettings.isCompletionNotificationEnabled, appSettings.isCompletionSoundEnabled, appSettings.language, updateAndPersistSessions, handleApiError, setSessionLoading, activeJobs]);
    
    return { getStreamHandlers };
};
