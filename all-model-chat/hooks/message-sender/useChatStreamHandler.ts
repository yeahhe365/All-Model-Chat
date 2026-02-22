import React, { useCallback } from 'react';
import { AppSettings, SavedChatSession, ChatSettings as IndividualChatSettings, UploadedFile } from '../../types';
import { Part, UsageMetadata } from '@google/genai';
import { useApiErrorHandler } from './useApiErrorHandler';
import { logService, showNotification, calculateTokenStats, playCompletionSound, generateUniqueId, createUploadedFileFromBase64 } from '../../utils/appUtils';
import { APP_LOGO_SVG_DATA_URI } from '../../constants/appConstants';
import { finalizeMessages, appendApiPart } from '../chat-stream/processors';
import { streamingStore } from '../../services/streamingStore';
import { SUPPORTED_GENERATED_MIME_TYPES } from '../../constants/fileConstants';

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
        let firstTokenTime: Date | null = null; // Track first token (thought or content) for TTFT
        let accumulatedText = "";
        let accumulatedThoughts = "";
        let accumulatedApiParts: any[] = [];
        
        // 核心优化：将生成的图片/文件缓存在闭包内，在流期间拒绝任何针对生成媒体的全局重渲染，以防止巨量 GC 卡顿
        let accumulatedFiles: UploadedFile[] = [];

        // Reset store for this new generation
        streamingStore.clear(generationId);
        
        // Helper to record TTFT immediately on first activity
        // 整个流周期只触发一次，更新首字渲染时间
        const recordFirstToken = () => {
            if (!firstTokenTime) {
                firstTokenTime = new Date();
                const ttft = firstTokenTime.getTime() - generationStartTime.getTime();
                
                updateAndPersistSessions(prev => {
                    const sessionIndex = prev.findIndex(s => s.id === currentSessionId);
                    if (sessionIndex === -1) return prev;
                    const newSessions = [...prev];
                    const sessionToUpdate = { ...newSessions[sessionIndex] };
                    
                    // Update only the specific message with TTFT to trigger UI update
                    sessionToUpdate.messages = sessionToUpdate.messages.map(m => {
                        if (m.id === generationId) {
                            return { ...m, firstTokenTimeMs: ttft };
                        }
                        return m;
                    });
                    
                    newSessions[sessionIndex] = sessionToUpdate;
                    return newSessions;
                }, { persist: false });
            }
        };

        const streamOnError = (error: Error) => {
            // Pass accumulated content so it can be saved even on error/abort
            handleApiError(error, currentSessionId, generationId, "Error", accumulatedText, accumulatedThoughts);
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
            // 核心优化：只有在此刻（流完成时），才把在这期间收集的文本、想法、文件一次性合入 React 全局状态
            updateAndPersistSessions(prev => {
                const sessionIndex = prev.findIndex(s => s.id === currentSessionId);
                if (sessionIndex === -1) return prev;

                const newSessions = [...prev];
                const sessionToUpdate = { ...newSessions[sessionIndex] };
                
                let updatedMessages = sessionToUpdate.messages.map(msg => {
                    if (msg.id === generationId) {
                        return {
                            ...msg,
                            content: (msg.content || '') + accumulatedText,
                            thoughts: (msg.thoughts || '') + accumulatedThoughts,
                            // 合并流传输期间生成的文件缓存
                            files: msg.files ? [...msg.files, ...accumulatedFiles] : accumulatedFiles,
                            apiParts: msg.apiParts ? [...msg.apiParts, ...accumulatedApiParts] : accumulatedApiParts
                        };
                    }
                    return msg;
                });
                
                // Finalize (mark loading false, set stats)
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
            recordFirstToken(); // Capture TTFT
            
            accumulatedApiParts = appendApiPart(accumulatedApiParts, part);
            
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
                const toolContent = `\n\n\`\`\`${codePart.language.toLowerCase() || 'python'}\n${codePart.code}\n\`\`\`\n\n`;
                accumulatedText += toolContent;
                streamingStore.updateContent(generationId, toolContent);
            } else if (anyPart.codeExecutionResult) {
                const resultPart = anyPart.codeExecutionResult as { outcome: string, output?: string };
                const escapeHtml = (unsafe: string) => {
                    if (typeof unsafe !== 'string') return '';
                    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
                };
                let toolContent = `\n\n<div class="tool-result outcome-${resultPart.outcome.toLowerCase()}"><strong>Execution Result (${resultPart.outcome}):</strong>`;
                if (resultPart.output) {
                    toolContent += `<pre><code class="language-text">${escapeHtml(resultPart.output)}</code></pre>`;
                }
                toolContent += '</div>\n\n';
                accumulatedText += toolContent;
                streamingStore.updateContent(generationId, toolContent);
            } else if (anyPart.inlineData) {
                const { mimeType, data } = anyPart.inlineData;
                
                const isSupportedFile = 
                    mimeType.startsWith('image/') || 
                    mimeType.startsWith('audio/') ||
                    mimeType.startsWith('video/') ||
                    SUPPORTED_GENERATED_MIME_TYPES.has(mimeType);

                if (isSupportedFile) {
                    // 核心优化：不再在收到文件分块时立刻触发 updateAndPersistSessions 重新克隆并渲染整棵节点树。
                    // 改为创建独立 File 引用并推入局部数组，依靠最后的流完成时统一整合。
                    let baseName = 'generated-file';
                    if (mimeType.startsWith('image/')) {
                        baseName = `generated-plot-${generateUniqueId().slice(-4)}`;
                    }

                    const newFile = createUploadedFileFromBase64(data, mimeType, baseName);
                    accumulatedFiles.push(newFile);
                }
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
            recordFirstToken(); // Capture TTFT (thoughts usually come first)
            
            accumulatedThoughts += thoughtChunk;
            streamingStore.updateThoughts(generationId, thoughtChunk);
        };
        
        return { streamOnError, streamOnComplete, streamOnPart, onThoughtChunk };

    }, [appSettings.isStreamingEnabled, appSettings.isCompletionNotificationEnabled, appSettings.isCompletionSoundEnabled, appSettings.language, updateAndPersistSessions, handleApiError, setSessionLoading, activeJobs]);
    
    return { getStreamHandlers };
};
