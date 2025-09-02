import { Dispatch, SetStateAction, useCallback, useRef } from 'react';
import { AppSettings, ChatMessage, SavedChatSession, UploadedFile, ChatSettings as IndividualChatSettings, ModelResponseVersion } from '../types';
import { Part, UsageMetadata, Chat } from '@google/genai';
import { useApiErrorHandler } from './useApiErrorHandler';
import { generateUniqueId, logService, showNotification, getTranslator, base64ToBlobUrl } from '../utils/appUtils';
import { APP_LOGO_SVG_DATA_URI, APP_SETTINGS_KEY } from '../constants/appConstants';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;

interface ChatStreamHandlerProps {
    appSettings: AppSettings;
    updateAndPersistSessions: SessionsUpdater;
    setLoadingSessionIds: Dispatch<SetStateAction<Set<string>>>;
    activeJobs: React.MutableRefObject<Map<string, AbortController>>;
    chat: Chat | null;
}

const isToolMessage = (msg: ChatMessage | ModelResponseVersion): boolean => {
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
    const firstContentPartTimeRef = useRef<Date | null>(null);

    const getStreamHandlers = useCallback((
        currentSessionId: string,
        generationId: string,
        abortController: AbortController,
        generationStartTimeRef: React.MutableRefObject<Date | null>,
        currentChatSettings: IndividualChatSettings,
        retryOfMessageId?: string,
    ) => {
        const newModelMessageIds = new Set<string>([generationId]);

        const streamOnError = (error: Error) => {
            const targetMessageId = retryOfMessageId || generationId;
            handleApiError(error, currentSessionId, targetMessageId);
            setLoadingSessionIds(prev => { const next = new Set(prev); next.delete(currentSessionId); return next; });
            activeJobs.current.delete(generationId);
        };

        const streamOnComplete = (usageMetadata?: UsageMetadata, groundingMetadata?: any) => {
            const getLang = () => {
                try {
                    const stored = localStorage.getItem(APP_SETTINGS_KEY);
                    const settings = stored ? JSON.parse(stored) : {};
                    const langSetting = settings.language || 'system';
                    if (langSetting === 'system') {
                        return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
                    }
                    return langSetting;
                } catch {
                    return 'en';
                }
            };
            const t = getTranslator(getLang());

            if (appSettings.isStreamingEnabled && !firstContentPartTimeRef.current) {
                firstContentPartTimeRef.current = new Date();
            }

            updateAndPersistSessions(prev => prev.map(s => {
                if (s.id !== currentSessionId) return s;
                
                let cumulativeTotal = [...s.messages].reverse().find(m => m.cumulativeTotalTokens !== undefined && m.generationStartTime !== generationStartTimeRef.current)?.cumulativeTotalTokens || 0;
                let completedMessageForNotification: ChatMessage | null = null;

                const finalMessages = s.messages.map(m => {
                    let targetMessageId: string | undefined;
                    if (retryOfMessageId && m.id === retryOfMessageId) {
                        targetMessageId = m.id;
                    } else if (!retryOfMessageId && m.isLoading && m.generationStartTime === generationStartTimeRef.current) {
                        targetMessageId = m.id;
                    }

                    if (targetMessageId) {
                        let thinkingTime = m.thinkingTimeMs;
                        if (thinkingTime === undefined && firstContentPartTimeRef.current && generationStartTimeRef.current) {
                            thinkingTime = firstContentPartTimeRef.current.getTime() - generationStartTimeRef.current.getTime();
                        }
                        const isLastMessageOfRun = m.id === (retryOfMessageId || Array.from(newModelMessageIds).pop());
                        const turnTokens = isLastMessageOfRun ? (usageMetadata?.totalTokenCount || 0) : 0;
                        const promptTokens = isLastMessageOfRun ? (usageMetadata?.promptTokenCount) : undefined;
                        const completionTokens = (promptTokens !== undefined && turnTokens > 0) ? turnTokens - promptTokens : undefined;
                        cumulativeTotal += turnTokens;
                        
                        const completedMessage = { ...m };
                        
                        if (retryOfMessageId) {
                            const activeIndex = completedMessage.activeVersionIndex ?? 0;
                            if (completedMessage.versions && completedMessage.versions[activeIndex]) {
                                const finalVersion = { 
                                    ...completedMessage.versions[activeIndex],
                                    content: completedMessage.versions[activeIndex].content + (abortController.signal.aborted ? "\n\n[Stopped by user]" : ""),
                                    generationEndTime: new Date(),
                                    thinkingTimeMs: thinkingTime,
                                    groundingMetadata: isLastMessageOfRun ? groundingMetadata : undefined,
                                    promptTokens, completionTokens, totalTokens: turnTokens, cumulativeTotalTokens: cumulativeTotal,
                                };
                                completedMessage.versions[activeIndex] = finalVersion;
                                // Copy final version to top level
                                Object.assign(completedMessage, { ...finalVersion, isLoading: false });
                            }
                        } else {
                           Object.assign(completedMessage, {
                                isLoading: false,
                                content: m.content + (abortController.signal.aborted ? "\n\n[Stopped by user]" : ""),
                                thoughts: currentChatSettings.showThoughts ? m.thoughts : undefined,
                                generationEndTime: new Date(),
                                thinkingTimeMs: thinkingTime,
                                groundingMetadata: isLastMessageOfRun ? groundingMetadata : undefined,
                                promptTokens, completionTokens, totalTokens: turnTokens, cumulativeTotalTokens: cumulativeTotal,
                           });
                        }
                        
                        const isEmpty = !completedMessage.content.trim() && !completedMessage.files?.length && !completedMessage.audioSrc;
                        if (isEmpty) {
                            completedMessage.role = 'error';
                            completedMessage.content = t('empty_response_error');
                        }

                        if (isLastMessageOfRun) completedMessageForNotification = completedMessage;
                        return completedMessage;
                    }
                    return m;
                }).filter(m => m.role !== 'model' || m.content.trim() !== '' || (m.files && m.files.length > 0) || m.audioSrc);
                
                if (appSettings.isCompletionNotificationEnabled && completedMessageForNotification && document.hidden) {
                    const notificationBody = (completedMessageForNotification.content || "Media or tool response received").substring(0, 150) + (completedMessageForNotification.content && completedMessageForNotification.content.length > 150 ? '...' : '');
                    showNotification('Response Ready', { body: notificationBody, icon: APP_LOGO_SVG_DATA_URI });
                }

                return {...s, messages: finalMessages, settings: s.settings};
            }));
            setLoadingSessionIds(prev => { const next = new Set(prev); next.delete(currentSessionId); return next; });
            activeJobs.current.delete(generationId);
        };

        const streamOnPart = (part: Part) => {
            let isFirstContentPart = false;
            if (appSettings.isStreamingEnabled && !firstContentPartTimeRef.current) {
                firstContentPartTimeRef.current = new Date();
                isFirstContentPart = true;
            }
            updateAndPersistSessions(prev => prev.map(s => {
                if (s.id !== currentSessionId) return s;
                let messages = [...s.messages];
                
                let targetMessage: ChatMessage | undefined;
                if (retryOfMessageId) {
                    targetMessage = messages.find(m => m.id === retryOfMessageId);
                } else {
                    targetMessage = [...messages].reverse().find(m => m.isLoading && m.generationStartTime === generationStartTimeRef.current);
                }

                if (isFirstContentPart && targetMessage) {
                    const thinkingTime = generationStartTimeRef.current ? (firstContentPartTimeRef.current!.getTime() - generationStartTimeRef.current.getTime()) : null;
                    if (thinkingTime !== null) {
                        if (retryOfMessageId && targetMessage.versions && targetMessage.activeVersionIndex !== undefined) {
                            targetMessage.versions[targetMessage.activeVersionIndex].thinkingTimeMs = thinkingTime;
                        } else {
                           targetMessage.thinkingTimeMs = thinkingTime;
                        }
                    }
                }

                let lastContentHolder: ChatMessage | ModelResponseVersion | null | undefined = targetMessage;
                if (retryOfMessageId && targetMessage?.versions && targetMessage.activeVersionIndex !== undefined) {
                    lastContentHolder = targetMessage.versions[targetMessage.activeVersionIndex];
                }

                const createNewMessage = (content: string): ChatMessage => {
                    const id = generateUniqueId();
                    newModelMessageIds.add(id);
                    return { id, role: 'model', content, timestamp: new Date(), isLoading: true, generationStartTime: generationStartTimeRef.current! };
                };
                
                const anyPart = part as any;
                if (anyPart.text) {
                     if (lastContentHolder && !isToolMessage(lastContentHolder)) {
                        lastContentHolder.content += anyPart.text;
                    } else if (!retryOfMessageId) {
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
                        toolContent += `<pre><code>${escapeHtml(resultPart.output)}</code></pre>`;
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
                        
                        if (lastContentHolder) {
                            lastContentHolder.files = [...(lastContentHolder.files || []), newFile];
                        } else if (!retryOfMessageId) {
                            const newMessage = createNewMessage('');
                            newMessage.files = [newFile];
                            messages.push(newMessage);
                        }
                    }
                }
                return { ...s, messages };
            }));
        };

        const onThoughtChunk = (thoughtChunk: string) => {
            updateAndPersistSessions(prev => prev.map(s => {
                if (s.id !== currentSessionId) return s;
                let messages = [...s.messages];
                
                let targetMessage: ChatMessage | undefined;
                if (retryOfMessageId) {
                    targetMessage = messages.find(m => m.id === retryOfMessageId);
                } else {
                    targetMessage = [...messages].reverse().find(m => m.isLoading && m.generationStartTime === generationStartTimeRef.current);
                }
                
                if (targetMessage) {
                    if (retryOfMessageId && targetMessage.versions && targetMessage.activeVersionIndex !== undefined) {
                        targetMessage.versions[targetMessage.activeVersionIndex].thoughts = (targetMessage.versions[targetMessage.activeVersionIndex].thoughts || '') + thoughtChunk;
                    } else {
                        targetMessage.thoughts = (targetMessage.thoughts || '') + thoughtChunk;
                    }
                }
                return { ...s, messages };
            }));
        };
        
        firstContentPartTimeRef.current = null;
        return { streamOnError, streamOnComplete, streamOnPart, onThoughtChunk };

    }, [appSettings.isStreamingEnabled, appSettings.isCompletionNotificationEnabled, updateAndPersistSessions, handleApiError, setLoadingSessionIds, activeJobs]);
    
    return { getStreamHandlers };
};