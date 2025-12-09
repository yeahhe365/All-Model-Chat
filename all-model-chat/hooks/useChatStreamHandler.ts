import { Dispatch, SetStateAction, useCallback } from 'react';
import { AppSettings, ChatMessage, SavedChatSession, ChatSettings as IndividualChatSettings, UploadedFile } from '../types';
import { Part, UsageMetadata } from '@google/genai';
import { useApiErrorHandler } from './useApiErrorHandler';
import { generateUniqueId, logService, showNotification, getTranslator, base64ToBlobUrl, getExtensionFromMimeType } from '../utils/appUtils';
import { APP_LOGO_SVG_DATA_URI } from '../constants/appConstants';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[], options?: { persist?: boolean }) => void;

interface ChatStreamHandlerProps {
    appSettings: AppSettings;
    updateAndPersistSessions: SessionsUpdater;
    setLoadingSessionIds: Dispatch<SetStateAction<Set<string>>>;
    activeJobs: React.MutableRefObject<Map<string, AbortController>>;
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

const SUPPORTED_GENERATED_MIME_TYPES = new Set([
    // Images
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    // Docs
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'text/plain',
    'application/json',
    'text/html',
    'text/xml',
    'text/markdown',
    'text/x-python',
    // Media
    'audio/wav',
    'audio/mp3',
    'video/mp4',
    // Other
    'application/zip',
    'application/x-zip-compressed',
    'application/x-7z-compressed',
    'application/octet-stream'
]);

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
                let promptTokens = usageMetadata.promptTokenCount || 0;
                let completionTokens = usageMetadata.candidatesTokenCount || 0;
                const totalTokens = usageMetadata.totalTokenCount || 0;

                // Fallback: If candidatesTokenCount is missing (0/undefined) but we have total and prompt, calculate it
                if (!completionTokens && totalTokens > 0 && promptTokens > 0) {
                    completionTokens = totalTokens - promptTokens;
                }

                logService.recordTokenUsage(
                    currentChatSettings.modelId,
                    promptTokens,
                    completionTokens
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
                            
                            // Token Extraction Logic
                            const totalTokenCount = isLastMessageOfRun ? (usageMetadata?.totalTokenCount || 0) : 0;
                            const promptTokens = isLastMessageOfRun ? (usageMetadata?.promptTokenCount) : undefined;
                            
                            // Prioritize explicit candidatesTokenCount (Output) if available
                            let completionTokens = isLastMessageOfRun ? usageMetadata?.candidatesTokenCount : undefined;
                            
                            // Fallback: If candidatesTokenCount is missing but we have total and prompt, calculate it
                            if (completionTokens === undefined && promptTokens !== undefined && totalTokenCount > 0) {
                                completionTokens = totalTokenCount - promptTokens;
                            }

                            // @ts-ignore - SDK types might be partial depending on version, but runtime provides it
                            const thoughtTokens = usageMetadata?.thoughtsTokenCount;
                            
                            cumulativeTotal += totalTokenCount;
                            
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
                                totalTokens: totalTokenCount,
                                thoughtTokens, // Store thought token count
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
            const now = Date.now();
            let isFirstContentPart = false;
            
            const hasMeaningfulContent = 
                (anyPart.text && anyPart.text.trim().length > 0) || 
                anyPart.executableCode || 
                anyPart.codeExecutionResult || 
                anyPart.inlineData;

            // Check for thoughtSignature in the part (Gemini 3 Pro feature)
            const thoughtSignature = anyPart.thoughtSignature || anyPart.thought_signature;

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
                    return { 
                        id, 
                        role: 'model', 
                        content, 
                        timestamp: new Date(), 
                        isLoading: true, 
                        generationStartTime: generationStartTime,
                        firstTokenTimeMs: now - generationStartTime.getTime() // TTFT for new messages
                    };
                };
        
                // Update existing message if possible, and capture TTFT if missing
                if (lastMessage && lastMessage.role === 'model' && lastMessage.isLoading && !isToolMessage(lastMessage)) {
                    const updates: Partial<ChatMessage> = {};
                    if (anyPart.text) {
                        updates.content = lastMessage.content + anyPart.text;
                    }
                    if (lastMessage.firstTokenTimeMs === undefined) {
                        updates.firstTokenTimeMs = now - generationStartTime.getTime();
                    }
                    
                    if (anyPart.text || Object.keys(updates).length > 0) {
                        messages[lastMessageIndex] = { ...lastMessage, ...updates };
                    }
                } else if (anyPart.text) {
                    messages.push(createNewMessage(anyPart.text));
                }

                // Handle other parts
                if (anyPart.executableCode) {
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
                    
                    const isSupportedFile = 
                        mimeType.startsWith('image/') || 
                        mimeType.startsWith('audio/') ||
                        mimeType.startsWith('video/') ||
                        SUPPORTED_GENERATED_MIME_TYPES.has(mimeType);

                    if (isSupportedFile) {
                        const dataUrl = base64ToBlobUrl(data, mimeType);
                        
                        let fileName = 'Generated File';
                        // Use centralized utility for extension resolution
                        const ext = getExtensionFromMimeType(mimeType);
                        if (ext) {
                            fileName = `generated_file_${generateUniqueId().slice(-4)}${ext}`;
                        } else if (mimeType.startsWith('image/')) {
                            fileName = `generated-image-${generateUniqueId().slice(-4)}.png`;
                        }

                        const newFile: UploadedFile = {
                            id: generateUniqueId(),
                            name,
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

                // Capture thought signatures and append to the latest message
                if (thoughtSignature) {
                    // Re-fetch latest message reference as it might have been newly created above
                    const currentLastMsg = messages[messages.length - 1];
                    if (currentLastMsg && currentLastMsg.role === 'model' && currentLastMsg.isLoading) {
                        const newSignatures = [...(currentLastMsg.thoughtSignatures || [])];
                        // Avoid duplicates if streams overlap or send same sig (unlikely but safe)
                        if (!newSignatures.includes(thoughtSignature)) {
                            newSignatures.push(thoughtSignature);
                            messages[messages.length - 1] = { ...currentLastMsg, thoughtSignatures: newSignatures };
                        }
                    }
                }
                
                return newSessions;
            }, { persist: false });
        };
        

        const onThoughtChunk = (thoughtChunk: string) => {
            const now = Date.now();
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
                        const updates: Partial<ChatMessage> = {
                            thoughts: (lastMessage.thoughts || '') + thoughtChunk,
                        };
                        if (lastMessage.firstTokenTimeMs === undefined) {
                            updates.firstTokenTimeMs = now - generationStartTime.getTime();
                        }
                        messages[lastMessageIndex] = { ...lastMessage, ...updates };
                    }
                }
                
                return newSessions;
            }, { persist: false });
        };
        
        return { streamOnError, streamOnComplete, streamOnPart, onThoughtChunk };

    }, [appSettings.isStreamingEnabled, appSettings.isCompletionNotificationEnabled, appSettings.language, updateAndPersistSessions, handleApiError, setLoadingSessionIds, activeJobs]);
    
    return { getStreamHandlers };
};