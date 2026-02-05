
import React, { Dispatch, SetStateAction, useCallback } from 'react';
import { AppSettings, SavedChatSession, ChatMessage, ChatSettings as IndividualChatSettings } from '../../types';
import { Part, UsageMetadata } from '@google/genai';
import { useApiErrorHandler } from './useApiErrorHandler';
import { logService, showNotification, calculateTokenStats, playCompletionSound } from '../../utils/appUtils';
import { APP_LOGO_SVG_DATA_URI } from '../../constants/appConstants';
import { finalizeMessages, updateMessagesWithBatch } from '../chat-stream/processors';
import { streamingStore } from '../../services/streamingStore';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[], options?: { persist?: boolean }) => void;

interface ChatStreamHandlerProps {
    appSettings: AppSettings;
    updateAndPersistSessions: SessionsUpdater;
    setSessionLoading: (sessionId: string, isLoading: boolean) => void;
    activeJobs: React.MutableRefObject<Map<string, AbortController>>;
}

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
        let accumulatedThoughts = "";

        // Reset store for this new generation
        streamingStore.clear(generationId);

        const streamOnError = (error: Error) => {
            handleApiError(error, currentSessionId, generationId);
            setSessionLoading(currentSessionId, false);
            activeJobs.current.delete(generationId);
            streamingStore.clear(generationId);
        };

        const streamOnComplete = (usageMetadata?: UsageMetadata, groundingMetadata?: any, urlContextMetadata?: any) => {
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

            // Perform the Final Update to State (and DB)
            updateAndPersistSessions(prev => {
                const sessionIndex = prev.findIndex(s => s.id === currentSessionId);
                if (sessionIndex === -1) return prev;

                const newSessions = [...prev];
                const sessionToUpdate = { ...newSessions[sessionIndex] };
                
                // Construct a virtual "final" part containing the full text from the store
                // We use updateMessagesWithBatch but we manually inject the accumulated text
                // because the state messages haven't been updating with text during the stream.
                
                // 1. First, make sure the message exists and has basic structure (it was created at start)
                // 2. Update its content with accumulatedText and accumulatedThoughts
                
                let updatedMessages = sessionToUpdate.messages.map(msg => {
                    if (msg.id === generationId) {
                        return {
                            ...msg,
                            content: (msg.content || '') + accumulatedText,
                            thoughts: (msg.thoughts || '') + accumulatedThoughts
                        };
                    }
                    return msg;
                });
                
                // 3. Finalize (mark loading false, set stats)
                const finalizationResult = finalizeMessages(
                    updatedMessages,
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

                sessionToUpdate.messages = finalizationResult.updatedMessages;
                newSessions[sessionIndex] = sessionToUpdate;

                if (finalizationResult.completedMessageForNotification) {
                    if (appSettings.isCompletionSoundEnabled) {
                        playCompletionSound();
                    }
                    if (appSettings.isCompletionNotificationEnabled && document.hidden) {
                        const msg = finalizationResult.completedMessageForNotification;
                        const notificationBody = (msg.content || "Media or tool response received").substring(0, 150) + (msg.content && msg.content.length > 150 ? '...' : '');
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
            streamingStore.clear(generationId);

            if (onSuccess && !abortController.signal.aborted) {
                setTimeout(() => onSuccess(generationId, accumulatedText), 0);
            }
        };

        const streamOnPart = (part: Part) => {
            const anyPart = part as any;
            
            // 1. Accumulate plain text
            let chunkText = "";
            if (anyPart.text) {
                chunkText = anyPart.text;
                accumulatedText += chunkText;
                streamingStore.updateContent(generationId, chunkText);
            }

            // 2. Handle Tools / Code (Convert to text representation for the store)
            if (anyPart.executableCode) {
                const codePart = anyPart.executableCode as { language: string, code: string };
                const toolContent = `\`\`\`${codePart.language.toLowerCase() || 'python'}\n${codePart.code}\n\`\`\``;
                accumulatedText += toolContent;
                streamingStore.updateContent(generationId, toolContent);
            } else if (anyPart.codeExecutionResult) {
                const resultPart = anyPart.codeExecutionResult as { outcome: string, output?: string };
                const escapeHtml = (unsafe: string) => {
                    if (typeof unsafe !== 'string') return '';
                    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
                };
                let toolContent = `<div class="tool-result outcome-${resultPart.outcome.toLowerCase()}"><strong>Execution Result (${resultPart.outcome}):</strong>`;
                if (resultPart.output) {
                    toolContent += `<pre><code class="language-text">${escapeHtml(resultPart.output)}</code></pre>`;
                }
                toolContent += '</div>';
                accumulatedText += toolContent;
                streamingStore.updateContent(generationId, toolContent);
            } else if (anyPart.inlineData) {
                // For files, we still MUST update the session state because they are objects, not just text string.
                // We use a simplified update that ONLY targets the file array for this message.
                // This will trigger a React update, but it's infrequent (once per image generation usually).
                updateAndPersistSessions(prev => {
                     const sessionIndex = prev.findIndex(s => s.id === currentSessionId);
                     if (sessionIndex === -1) return prev;
                     const newSessions = [...prev];
                     const sessionToUpdate = { ...newSessions[sessionIndex] };
                     // Only apply parts to messages, assume no thought here
                     sessionToUpdate.messages = updateMessagesWithBatch(
                         sessionToUpdate.messages,
                         [part], 
                         "", 
                         generationStartTime, 
                         newModelMessageIds, 
                         firstContentPartTime
                     );
                     newSessions[sessionIndex] = sessionToUpdate;
                     return newSessions;
                }, { persist: false });
            }

            const hasMeaningfulContent = 
                (anyPart.text && anyPart.text.trim().length > 0) || 
                anyPart.executableCode || 
                anyPart.codeExecutionResult || 
                anyPart.inlineData;

            if (appSettings.isStreamingEnabled && !firstContentPartTime && hasMeaningfulContent) {
                firstContentPartTime = new Date();
            }
        };
        
        const onThoughtChunk = (thoughtChunk: string) => {
            accumulatedThoughts += thoughtChunk;
            streamingStore.updateThoughts(generationId, thoughtChunk);
        };
        
        return { streamOnError, streamOnComplete, streamOnPart, onThoughtChunk };

    }, [appSettings.isStreamingEnabled, appSettings.isCompletionNotificationEnabled, appSettings.isCompletionSoundEnabled, appSettings.language, updateAndPersistSessions, handleApiError, setSessionLoading, activeJobs]);
    
    return { getStreamHandlers };
};
