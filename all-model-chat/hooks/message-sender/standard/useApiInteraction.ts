
import React, { useCallback, Dispatch, SetStateAction } from 'react';
import { AppSettings, ChatMessage, ChatSettings as IndividualChatSettings, UploadedFile, ProjectContext } from '../../../types';
import { createChatHistoryForApi, isGemini3Model, logService } from '../../../utils/appUtils';
import { buildGenerationConfig } from '../../../services/api/baseApi';
import { geminiServiceInstance } from '../../../services/geminiService';
import { isLikelyHtml } from '../../../utils/codeUtils';
import { GetStreamHandlers } from '../types';
import { ContentPart } from '../../../types/chat';
import { generateProjectContextSystemPrompt } from '../../useFolderToolExecutor';
import { readProjectFile } from '../../../utils/folderImportUtils';

interface UseApiInteractionProps {
    appSettings: AppSettings;
    messages: ChatMessage[];
    getStreamHandlers: GetStreamHandlers;
    handleGenerateCanvas: (sourceMessageId: string, content: string) => Promise<void>;
    setSessionLoading: (sessionId: string, isLoading: boolean) => void;
    activeJobs: React.MutableRefObject<Map<string, AbortController>>;
    /** Active project context for agentic folder access */
    projectContext?: ProjectContext | null;
    onAutoContinue?: (params: { generationId: string; activeModelId: string; effectiveEditingId: string | null }) => void;
}

export const useApiInteraction = ({
    appSettings,
    messages,
    getStreamHandlers,
    handleGenerateCanvas,
    setSessionLoading,
    activeJobs,
    projectContext,
    onAutoContinue,
}: UseApiInteractionProps) => {

    const performApiCall = useCallback(async (params: {
        finalSessionId: string;
        generationId: string;
        generationStartTime: Date;
        keyToUse: string;
        activeModelId: string;
        promptParts: ContentPart[];
        effectiveEditingId: string | null;
        isContinueMode: boolean;
        isRawMode: boolean;
        sessionToUpdate: IndividualChatSettings;
        aspectRatio: string;
        imageSize: string | undefined;
        newAbortController: AbortController;
        textToUse: string;
        enrichedFiles: UploadedFile[];
    }) => {
        const {
            finalSessionId, generationId, generationStartTime, keyToUse, activeModelId,
            promptParts, effectiveEditingId, isContinueMode, isRawMode,
            sessionToUpdate, aspectRatio, imageSize, newAbortController,
            textToUse, enrichedFiles
        } = params;

        let baseMessagesForApi: ChatMessage[] = messages;

        if (effectiveEditingId) {
            const index = messages.findIndex(m => m.id === effectiveEditingId);
            if (index !== -1) {
                baseMessagesForApi = messages.slice(0, index);
            }
        }

        let finalRole: 'user' | 'model' = 'user';
        let finalParts = promptParts;

        if (isContinueMode) {
            finalRole = 'model';
            const targetMsg = messages.find(m => m.id === effectiveEditingId);
            const currentContent = targetMsg?.content || '';
            const isG3 = isGemini3Model(activeModelId);

            let prefillContent = currentContent;
            if (!prefillContent.trim()) {
                prefillContent = isG3 ? "<thinking>I have finished reasoning</thinking>" : " ";
            }
            finalParts = [{ text: prefillContent }];

        } else if (isRawMode) {
            const tempUserMsg: ChatMessage = {
                id: 'temp-raw-user',
                role: 'user',
                content: textToUse.trim(),
                files: enrichedFiles,
                timestamp: new Date()
            };
            baseMessagesForApi = [...baseMessagesForApi, tempUserMsg];

            finalRole = 'model';
            finalParts = [{ text: '<thinking>' }];

        } else if (promptParts.length === 0) {
            setSessionLoading(finalSessionId, false);
            activeJobs.current.delete(generationId);
            return;
        }

        const shouldStripThinking = sessionToUpdate.hideThinkingInContext ?? appSettings.hideThinkingInContext;
        const historyForChat = await createChatHistoryForApi(baseMessagesForApi, shouldStripThinking);

        // Prepare system instruction - inject project context if available
        let effectiveSystemInstruction = sessionToUpdate.systemInstruction;
        if (projectContext) {
            const projectPromptPrefix = generateProjectContextSystemPrompt(projectContext);
            effectiveSystemInstruction = projectPromptPrefix + (effectiveSystemInstruction ? `\n\n${effectiveSystemInstruction}` : '');
        }

        const config = buildGenerationConfig(
            activeModelId,
            effectiveSystemInstruction,
            { temperature: sessionToUpdate.temperature, topP: sessionToUpdate.topP },
            sessionToUpdate.showThoughts,
            sessionToUpdate.thinkingBudget,
            !!sessionToUpdate.isGoogleSearchEnabled,
            !!sessionToUpdate.isCodeExecutionEnabled,
            !!sessionToUpdate.isUrlContextEnabled,
            sessionToUpdate.thinkingLevel,
            aspectRatio,
            sessionToUpdate.isDeepSearchEnabled,
            imageSize,
            sessionToUpdate.safetySettings,
            sessionToUpdate.mediaResolution,
            projectContext?.fileTree, // Pass file tree to enable read_file tool
        );

        const shouldAutoContinueOnEmpty = !isContinueMode && activeModelId.includes('gemini-3') && activeModelId.includes('flash');

        const { streamOnError, streamOnComplete, streamOnPart, onThoughtChunk } = getStreamHandlers(
            finalSessionId,
            generationId,
            newAbortController,
            generationStartTime,
            sessionToUpdate,
            {
                onSuccess: (msgId, content) => {
                if (!isContinueMode && appSettings.autoCanvasVisualization && content && content.length > 50 && !isLikelyHtml(content)) {
                    const trimmed = content.trim();
                    if (trimmed.startsWith('```') && trimmed.endsWith('```')) return;
                    logService.info("Auto-triggering Canvas visualization for message", { msgId });
                    handleGenerateCanvas(msgId, content);
                }
                },
                onEmptyResponse: shouldAutoContinueOnEmpty
                    ? (msgId) => onAutoContinue?.({ generationId: msgId, activeModelId, effectiveEditingId })
                    : undefined,
                suppressEmptyResponseError: shouldAutoContinueOnEmpty,
            }
        );

        setSessionLoading(finalSessionId, true);
        activeJobs.current.set(generationId, newAbortController);

        // Wrapper to handle function calls (ReAct-style loop)
        // IMPORTANT: We now receive the complete Part object which includes thoughtSignature
        const handleFunctionCallResponse = async (
            usageMetadata: any,
            groundingMetadata: any,
            urlContextMetadata: any,
            functionCallPart?: any // Part object containing functionCall and thoughtSignature
        ) => {
            const normalizedFunctionCallPart = (() => {
                if (!functionCallPart) return functionCallPart;
                const anyPart = functionCallPart as any;
                const thoughtSignature =
                    anyPart.thoughtSignature ||
                    anyPart.thought_signature ||
                    anyPart.functionCall?.thoughtSignature ||
                    anyPart.functionCall?.thought_signature;

                if (!thoughtSignature) return functionCallPart;

                return {
                    ...functionCallPart,
                    thoughtSignature,
                    thought_signature: thoughtSignature,
                } as any;
            })();

            const functionCall = normalizedFunctionCallPart?.functionCall;
            if (functionCall && functionCall.name === 'read_file' && projectContext) {
                logService.info(`Executing function call: ${functionCall.name}`, {
                    args: functionCall.args,
                    hasThoughtSignature: !!(normalizedFunctionCallPart?.thoughtSignature || normalizedFunctionCallPart?.thought_signature)
                });

                try {
                    const filepath = functionCall.args?.filepath;
                    if (!filepath) {
                        throw new Error('Missing filepath argument');
                    }

                    // Read the file content
                    const fileContent = await readProjectFile(projectContext, filepath);
                    logService.info(`File read successfully: ${filepath}`, { length: fileContent.length });

                    // Build new history with function call and result
                    // CRITICAL: Use the COMPLETE Part object (with thoughtSignature) for model's turn
                    const updatedHistory = [
                        ...historyForChat,
                        { role: 'user' as const, parts: finalParts },
                        {
                            role: 'model' as const,
                            parts: [normalizedFunctionCallPart] // Use complete Part with thoughtSignature
                        },
                        {
                            role: 'user' as const,
                            parts: [{
                                functionResponse: {
                                    name: functionCall.name,
                                    response: { content: fileContent }
                                }
                            }]
                        }
                    ];

                    // Continue the conversation with function result
                    await geminiServiceInstance.sendMessageStream(
                        keyToUse,
                        activeModelId,
                        updatedHistory,
                        [], // Empty parts since context is in history
                        config, // Keep original config (thinking enabled)
                        newAbortController.signal,
                        streamOnPart,
                        onThoughtChunk,
                        streamOnError,
                        handleFunctionCallResponse, // Recursive for multi-turn
                        'model' // Continue from model
                    );
                } catch (error) {
                    logService.error('Function call execution failed:', error);
                    // Continue with error message in response
                    const errorPart = { text: `\n\n[Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}]` };
                    streamOnPart(errorPart);
                    streamOnComplete(usageMetadata, groundingMetadata, urlContextMetadata);
                }
            } else {
                // No function call, complete normally
                streamOnComplete(usageMetadata, groundingMetadata, urlContextMetadata);
            }
        };

        if (appSettings.isStreamingEnabled) {
            await geminiServiceInstance.sendMessageStream(
                keyToUse,
                activeModelId,
                historyForChat,
                finalParts,
                config,
                newAbortController.signal,
                streamOnPart,
                onThoughtChunk,
                streamOnError,
                handleFunctionCallResponse,
                finalRole
            );
        } else {
            await geminiServiceInstance.sendMessageNonStream(
                keyToUse,
                activeModelId,
                historyForChat,
                finalParts,
                config,
                newAbortController.signal,
                streamOnError,
                (parts, thoughts, usage, grounding) => {
                    for (const part of parts) streamOnPart(part);
                    if (thoughts) onThoughtChunk(thoughts);
                    streamOnComplete(usage, grounding);
                }
            );
        }
    }, [appSettings, messages, getStreamHandlers, handleGenerateCanvas, setSessionLoading, activeJobs, projectContext]);

    return { performApiCall };
};
