
import { ChatMessage, UploadedFile, ChatSettings } from '../../types';
import { Part, UsageMetadata } from '@google/genai';
import { generateUniqueId, calculateTokenStats, createMessage, createUploadedFileFromBase64, getTranslator } from '../../utils/appUtils';
import { isToolMessage } from './utils';
import { SUPPORTED_GENERATED_MIME_TYPES } from '../../constants/fileConstants';

export const updateMessagesWithPart = (
    messages: ChatMessage[],
    part: Part,
    generationStartTime: Date,
    newModelMessageIds: Set<string>,
    firstContentPartTime: Date | null
): ChatMessage[] => {
    const anyPart = part as any;
    const now = Date.now();
    const newMessages = [...messages];

    // Check if this part triggered the "First Content" logic in the hook
    // We assume the hook passes a valid firstContentPartTime if it was set
    const isFirstContentPart = !!firstContentPartTime && (now - firstContentPartTime.getTime() < 100); // Heuristic: very recent

    // Update thinking time on the first content part if applicable
    if (firstContentPartTime) {
        const thinkingTime = (firstContentPartTime.getTime() - generationStartTime.getTime());
        // Find the loading message for this generation to update its thinking time
        for (let i = newMessages.length - 1; i >= 0; i--) {
            const msg = newMessages[i];
            if (msg.isLoading && msg.role === 'model' && msg.generationStartTime && msg.generationStartTime.getTime() === generationStartTime.getTime()) {
                // Only set if not already set
                if (msg.thinkingTimeMs === undefined) {
                    newMessages[i] = { ...msg, thinkingTimeMs: thinkingTime };
                }
                break;
            }
        }
    }

    let lastMessage = newMessages.length > 0 ? newMessages[newMessages.length - 1] : null;
    const lastMessageIndex = newMessages.length - 1;

    const createNewModelMessage = (content: string): ChatMessage => {
        const id = generateUniqueId();
        newModelMessageIds.add(id);
        return createMessage('model', content, {
            id,
            isLoading: true,
            generationStartTime: generationStartTime,
            firstTokenTimeMs: now - generationStartTime.getTime() // TTFT for new messages
        });
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
            newMessages[lastMessageIndex] = { ...lastMessage, ...updates };
        }
    } else if (anyPart.text) {
        newMessages.push(createNewModelMessage(anyPart.text));
    }

    // Handle other parts
    if (anyPart.executableCode) {
        const codePart = anyPart.executableCode as { language: string, code: string };
        const toolContent = `\`\`\`${codePart.language.toLowerCase() || 'python'}\n${codePart.code}\n\`\`\``;
        newMessages.push(createNewModelMessage(toolContent));
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
        newMessages.push(createNewModelMessage(toolContent));
    } else if (anyPart.inlineData) {
        const { mimeType, data } = anyPart.inlineData;
        
        const isSupportedFile = 
            mimeType.startsWith('image/') || 
            mimeType.startsWith('audio/') ||
            mimeType.startsWith('video/') ||
            SUPPORTED_GENERATED_MIME_TYPES.has(mimeType);

        if (isSupportedFile) {
            let baseName = 'generated-file';
            if (mimeType.startsWith('image/')) {
                baseName = 'generated-image';
            }

            const newFile = createUploadedFileFromBase64(data, mimeType, baseName);
            
            // Refetch last message as it might have changed in previous steps
            const currentLastMessage = newMessages[newMessages.length - 1];
            if (currentLastMessage && currentLastMessage.role === 'model' && currentLastMessage.isLoading) {
                newMessages[newMessages.length - 1] = { ...currentLastMessage, files: [...(currentLastMessage.files || []), newFile] };
            } else {
                const newMessage = createNewModelMessage('');
                newMessage.files = [newFile];
                newMessages.push(newMessage);
            }
        }
    }

    // Capture thought signatures
    const thoughtSignature = anyPart.thoughtSignature || anyPart.thought_signature;
    if (thoughtSignature) {
        const currentLastMsg = newMessages[newMessages.length - 1];
        if (currentLastMsg && currentLastMsg.role === 'model' && currentLastMsg.isLoading) {
            const newSignatures = [...(currentLastMsg.thoughtSignatures || [])];
            if (!newSignatures.includes(thoughtSignature)) {
                newSignatures.push(thoughtSignature);
                newMessages[newMessages.length - 1] = { ...currentLastMsg, thoughtSignatures: newSignatures };
            }
        }
    }

    return newMessages;
};

export const updateMessagesWithThought = (
    messages: ChatMessage[],
    thoughtChunk: string,
    generationStartTime: Date
): ChatMessage[] => {
    const now = Date.now();
    const newMessages = [...messages];
    const lastMessageIndex = newMessages.length - 1;
    
    if (lastMessageIndex >= 0) {
        const lastMessage = newMessages[lastMessageIndex];
        // Identify message by matching start time
        if (lastMessage.role === 'model' && lastMessage.isLoading && lastMessage.generationStartTime && lastMessage.generationStartTime.getTime() === generationStartTime.getTime()) {
            const updates: Partial<ChatMessage> = {
                thoughts: (lastMessage.thoughts || '') + thoughtChunk,
            };
            if (lastMessage.firstTokenTimeMs === undefined) {
                updates.firstTokenTimeMs = now - generationStartTime.getTime();
            }
            newMessages[lastMessageIndex] = { ...lastMessage, ...updates };
        }
    }
    return newMessages;
};

export const finalizeMessages = (
    messages: ChatMessage[],
    generationStartTime: Date,
    newModelMessageIds: Set<string>,
    currentChatSettings: ChatSettings,
    language: 'en' | 'zh',
    firstContentPartTime: Date | null,
    usageMetadata?: UsageMetadata,
    groundingMetadata?: any,
    urlContextMetadata?: any,
    isAborted?: boolean
): { updatedMessages: ChatMessage[], completedMessageForNotification: ChatMessage | null } => {
    const t = getTranslator(language);
    let cumulativeTotal = [...messages].reverse().find(m => m.cumulativeTotalTokens !== undefined && m.generationStartTime !== generationStartTime)?.cumulativeTotalTokens || 0;
    
    let completedMessageForNotification: ChatMessage | null = null;
    
    let finalMessages = messages.map(m => {
        // Identify message by exact object match on timestamp
        if (m.generationStartTime && m.generationStartTime.getTime() === generationStartTime.getTime() && m.isLoading) {
            let thinkingTime = m.thinkingTimeMs;
            if (thinkingTime === undefined && firstContentPartTime) {
                thinkingTime = firstContentPartTime.getTime() - generationStartTime.getTime();
            }
            const isLastMessageOfRun = m.id === Array.from(newModelMessageIds).pop();
            
            // Token Extraction Logic using helper
            const { promptTokens, completionTokens, totalTokens, thoughtTokens } = calculateTokenStats(isLastMessageOfRun ? usageMetadata : undefined);
            
            if (isLastMessageOfRun) {
                cumulativeTotal += totalTokens;
            }
            
            const completedMessage = {
                ...m,
                isLoading: false,
                content: m.content,
                thoughts: m.thoughts, // Data preservation: Always save thoughts regardless of display setting
                generationEndTime: new Date(),
                thinkingTimeMs: thinkingTime,
                groundingMetadata: isLastMessageOfRun ? groundingMetadata : undefined,
                urlContextMetadata: isLastMessageOfRun ? urlContextMetadata : undefined,
                promptTokens: isLastMessageOfRun ? promptTokens : undefined,
                completionTokens: isLastMessageOfRun ? completionTokens : undefined,
                totalTokens: isLastMessageOfRun ? totalTokens : undefined,
                thoughtTokens: isLastMessageOfRun ? thoughtTokens : undefined, 
                cumulativeTotalTokens: isLastMessageOfRun ? cumulativeTotal : undefined,
            };
            
            const isEmpty = !completedMessage.content.trim() && !completedMessage.files?.length && !completedMessage.audioSrc && !completedMessage.thoughts?.trim();
            
            if (isEmpty && !isAborted) {
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

    if (!isAborted) {
        finalMessages = finalMessages.filter(m => m.role !== 'model' || m.content.trim() !== '' || (m.files && m.files.length > 0) || m.audioSrc || (m.thoughts && m.thoughts.trim() !== ''));
    }

    return { updatedMessages: finalMessages, completedMessageForNotification };
};
