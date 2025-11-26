
import { Dispatch, SetStateAction, useCallback } from 'react';
import { AppSettings, ChatMessage, SavedChatSession, ChatSettings as IndividualChatSettings } from '../types';
import { Part, UsageMetadata, Chat } from '@google/genai';
import { useApiErrorHandler } from './useApiErrorHandler';
import { generateUniqueId, logService, showNotification, getTranslator, base64ToBlobUrl } from '../utils/appUtils';
import { APP_LOGO_SVG_DATA_URI } from '../constants/appConstants';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[], options?: { persist?: boolean }) => void;

interface ChatStreamHandlerProps {
    appSettings: AppSettings;
    updateAndPersistSessions: SessionsUpdater;
    setLoadingSessionIds: Dispatch<SetStateAction<Set<string>>>;
    activeJobs: React.MutableRefObject<Map<string, AbortController>>;
    chat: Chat | null;
}

const isToolMessage = (msg: ChatMessage): boolean => {
    if (!msg) return false;
    if (!msg.content) return false;
    const content = msg.content.trim();
    // A "tool message" is one that contains a code block or execution result.
    // A message with just files is content, not a tool, so text should be appendable.
    return (content.startsWith('```') && content.endsWith('```')) ||
           content.startsWith('<div class="tool-result');
};

export const useChatStreamHandler = ({
    appSettings,
    updateAndPersistSessions,
    setLoadingSessionIds,
    activeJobs
}: ChatStreamHandlerProps) => {
    const { handleApiError } = useApiErrorHandler(updateAndPersistSessions);

    const getStreamHandlers = useCallback((
        currentSessionId: string,
        generationId: string,
        abortController: AbortController,
        generationStartTime: Date,
        currentChatSettings: IndividualChatSettings,
    ) => {
        const newModelMessageIds = new Set<string>([generationId]);
        // Local state for this specific generation stream instance
        // This ensures concurrent streams don't overwrite each other's timing
        let firstContentPartTime: Date | null = null;

        const streamOnError = (error: Error) => {
            handleApiError(error, currentSessionId, generationId);
            setLoadingSessionIds(prev => { const next = new Set(prev); next.delete(currentSessionId); return next; });
            activeJobs.current.delete(generationId);
        };

        const streamOnComplete = (usageMetadata?: UsageMetadata, groundingMetadata?: any, urlContextMetadata?: any) => {
            // Use correct language from state, falling back to system logic if needed
            const lang = appSettings.language === 'system' 
                ? (navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en')
                : appSettings.language;
            
            const t = getTranslator(lang);

            if (appSettings.isStreamingEnabled && !firstContentPartTime) {
                firstContentPartTime = new Date();
            }

            // Record Token Usage Statistics
            if (usageMetadata) {
                logService.recordTokenUsage(
                    currentChatSettings.modelId,
                    usageMetadata.promptTokenCount || 0,
                    usageMetadata.candidatesTokenCount || 0
                );
            }

            updateAndPersistSessions(prev => prev.map(s => {
                if (s.id !== currentSessionId) return s;
                let cumulativeTotal = [...s.messages].reverse().find(m => m.cumulativeTotalTokens !== undefined && m.generationStartTime !== generationStartTime)?.cumulativeTotalTokens || 0;
                
                let completedMessageForNotification: ChatMessage | null = null;
                
                let finalMessages = s.messages
                    .map(m => {
                        // Identify message by exact object match on timestamp to ensure we update the correct one in concurrent scenarios
                        // Note: comparing Date objects requires .getTime()
                        if (m.generationStartTime && m.generationStartTime.getTime() === generationStartTime.getTime() && m.isLoading) {
                            let thinkingTime = m.thinkingTimeMs;
                            if (thinkingTime === undefined && firstContentPartTime) {
                                thinkingTime = firstContentPartTime.getTime() - generationStartTime.getTime();
                            }
                            const isLastMessageOfRun = m.id === Array.from(newModelMessageIds).pop();
                            const turnTokens = isLastMessageOfRun ? (usageMetadata?.totalTokenCount || 0) : 0;
                            const promptTokens = isLastMessageOfRun ? (usageMetadata?.promptTokenCount) : undefined;
                            const completionTokens = (promptTokens !== undefined && turnTokens > 0) ? turnTokens - promptTokens : undefined;
                            cumulativeTotal += turnTokens;
                            
                            const completedMessage = {
                                ...m,
                                isLoading: false,
                                content: m.content,
                                thoughts: currentChatSettings.showThoughts ? m.thoughts : undefined,
                                generationEndTime: new Date(),
                                thinkingTimeMs: thinkingTime,
                                groundingMetadata: isLastMessageOfRun ? groundingMetadata : undefined,
                                urlContextMetadata: isLastMessageOfRun ? urlContextMetadata : undefined,
                                promptTokens,
                                completionTokens,
                                totalTokens: turnTokens,
                                cumulativeTotalTokens: cumulativeTotal,
                            };
                            
                            const isEmpty = !completedMessage.content.trim() && !completedMessage.files?.length && !completedMessage.audioSrc && !completedMessage.thoughts?.trim();
                            
                            if (isEmpty && !abortController.signal.aborted) {
                                completedMessage.role = 'error';
                                completedMessage.content = t('empty_response_error');
                            }

                            if (isLastMessageOfRun) {
                                completedMessageForNotification = completedMessage;
                            }
                            return completedMessage;
                        }
                        return m;
                    });
                
                if (!abortController.signal.aborted) {
                    finalMessages = finalMessages.filter(m => m.role !== 'model' || m.content.trim() !== '' || (m.files && m.files.length > 0) || m.audioSrc || (m.thoughts && m.thoughts.trim() !== ''));
                }
                
                if (appSettings.isCompletionNotificationEnabled && completedMessageForNotification && document.hidden) {
                    const notificationBody = (completedMessageForNotification.content || "Media or tool response received").substring(0, 150) + (completedMessageForNotification.content && completedMessageForNotification.content.length > 150 ? '...' : '');
                    showNotification(
                        'Response Ready', 
                        {
                            body: notificationBody,
                            icon: APP_LOGO_SVG_DATA_URI,
                        }
                    );
                }

                return {...s, messages: finalMessages, settings: s.settings};
            }), { persist: true });
            setLoadingSessionIds(prev => { const next = new Set(prev); next.delete(currentSessionId); return next; });
            activeJobs.current.delete(generationId);
        };

        const streamOnPart = (part: Part) => {
            const anyPart = part as any;
            let isFirstContentPart = false;
            
            const hasMeaningfulContent = 
                (anyPart.text && anyPart.text.trim().length > 0) || 
                anyPart.executableCode || 
                anyPart.codeExecutionResult || 
                anyPart.inlineData;

            if (appSettings.isStreamingEnabled && !firstContentPartTime && hasMeaningfulContent) {
                firstContentPartTime = new Date();
                isFirstContentPart = true;
            }
        
            updateAndPersistSessions(prev => {
                const sessionIndex = prev.findIndex(s => s.id === currentSessionId);
                if (sessionIndex === -1) return prev;
        
                const newSessions = [...prev];
                const sessionToUpdate = { ...newSessions[sessionIndex] };
                newSessions[sessionIndex] = sessionToUpdate;
        
                let messages = [...sessionToUpdate.messages];
                sessionToUpdate.messages = messages;
        
                // Update thinking time on the first content part
                if (isFirstContentPart) {
                    const thinkingTime = (firstContentPartTime!.getTime() - generationStartTime.getTime());
                    for (let i = messages.length - 1; i >= 0; i--) {
                        const msg = messages[i];
                        if (msg.isLoading && msg.role === 'model' && msg.generationStartTime && msg.generationStartTime.getTime() === generationStartTime.getTime()) {
                            messages[i] = { ...msg, thinkingTimeMs: thinkingTime ?? msg.thinkingTimeMs };
                            break;
                        }
                    }
                }
        
                let lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
                const lastMessageIndex = messages.length - 1;
        
                const createNewMessage = (content: string): ChatMessage => {
                    const id = generateUniqueId();
                    newModelMessageIds.add(id);
                    return { id, role: 'model', content, timestamp: new Date(), isLoading: true, generationStartTime: generationStartTime };
                };
        
                if (anyPart.text) {
                    if (lastMessage && lastMessage.role === 'model' && lastMessage.isLoading && !isToolMessage(lastMessage)) {
                        messages[lastMessageIndex] = { ...lastMessage, content: lastMessage.content + anyPart.text };
                    } else {
                        messages.push(createNewMessage(anyPart.text));
                    }
                } else if (anyPart.executableCode) {
                    const codePart = anyPart.executableCode as { language: string, code: string };
                    const toolContent = `\`\`\`${codePart.language.toLowerCase() || 'python'}\n${codePart.code}\n\`\`\``;
                    messages.push(createNewMessage(toolContent));
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
                    messages.push(createNewMessage(toolContent));
                } else if (anyPart.inlineData) {
                    const { mimeType, data } = anyPart.inlineData;
                    if (mimeType.startsWith('image/')) {
                        const dataUrl = base64ToBlobUrl(data, mimeType);
                        const newFile: UploadedFile = {
                            id: generateUniqueId(),
                            name: 'Generated Image',
                            type: mimeType,
                            size: data.length,
                            dataUrl: dataUrl,
                            uploadState: 'active'
                        };
                        
                        if (lastMessage && lastMessage.role === 'model' && lastMessage.isLoading) {
                            messages[lastMessageIndex] = { ...lastMessage, files: [...(lastMessage.files || []), newFile] };
                        } else {
                            const newMessage = createNewMessage('');
                            newMessage.files = [newFile];
                            messages.push(newMessage);
                        }
                    }
                }
                
                return newSessions;
            }, { persist: false });
        };
        

        const onThoughtChunk = (thoughtChunk: string) => {
            updateAndPersistSessions(prev => {
                const sessionIndex = prev.findIndex(s => s.id === currentSessionId);
                if (sessionIndex === -1) return prev;
        
                const newSessions = [...prev];
                const sessionToUpdate = { ...newSessions[sessionIndex] };
                newSessions[sessionIndex] = sessionToUpdate;
        
                const messages = [...sessionToUpdate.messages];
                sessionToUpdate.messages = messages;
                
                const lastMessageIndex = messages.length - 1;
                if (lastMessageIndex >= 0) {
                    const lastMessage = messages[lastMessageIndex];
                    // Identify message by matching start time
                    if (lastMessage.role === 'model' && lastMessage.isLoading && lastMessage.generationStartTime && lastMessage.generationStartTime.getTime() === generationStartTime.getTime()) {
                        const updatedMessage = {
                            ...lastMessage,
                            thoughts: (lastMessage.thoughts || '') + thoughtChunk,
                        };
                        messages[lastMessageIndex] = updatedMessage;
                    }
                }
                
                return newSessions;
            }, { persist: false });
        };
        
        return { streamOnError, streamOnComplete, streamOnPart, onThoughtChunk };

    }, [appSettings.isStreamingEnabled, appSettings.isCompletionNotificationEnabled, appSettings.language, updateAndPersistSessions, handleApiError, setLoadingSessionIds, activeJobs]);
    
    return { getStreamHandlers };
};
