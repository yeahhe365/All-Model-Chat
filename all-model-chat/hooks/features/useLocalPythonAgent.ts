import { useEffect } from 'react';
import { ChatMessage, AppSettings, SavedChatSession } from '../../types';
import { usePyodide } from '../usePyodide';
import { logService, createUploadedFileFromBase64 } from '../../utils/appUtils';

// Global Set to persist processed message IDs across React component remounts 
// (e.g., when toggling Picture-in-Picture or resizing triggering re-renders)
const globalProcessedMessageIds = new Set<string>();

interface UseLocalPythonAgentProps {
    messages: ChatMessage[];
    appSettings: AppSettings;
    currentChatSettings: any; // ChatSettings type
    isLoading: boolean;
    activeSessionId: string | null;
    updateMessageContent: (messageId: string, content: string) => void;
    onContinueGeneration: (messageId: string) => void;
    updateAndPersistSessions: (updater: (prev: SavedChatSession[]) => SavedChatSession[], options?: { persist?: boolean }) => void;
}

export const useLocalPythonAgent = ({
    messages,
    appSettings,
    currentChatSettings,
    isLoading,
    activeSessionId,
    updateMessageContent,
    onContinueGeneration,
    updateAndPersistSessions
}: UseLocalPythonAgentProps) => {
    const { runCode } = usePyodide();

    const isLocalPythonEnabled = currentChatSettings.isLocalPythonEnabled || appSettings.isLocalPythonEnabled;

    useEffect(() => {
        if (!isLocalPythonEnabled || isLoading || !activeSessionId || messages.length === 0) return;

        const lastMessage = messages[messages.length - 1];

        // 1. Target Condition: Last message is from Model, not loading, and contains Python code
        if (lastMessage.role === 'model' && !lastMessage.isLoading && !lastMessage.stoppedByUser) {
            
            // Check if we already processed this message globally
            if (globalProcessedMessageIds.has(lastMessage.id)) return;

            // Check content for Python block
            // We match ```python or ```py. 
            // We also check that the message DOES NOT already have an Execution Result (to handle re-renders)
            const pythonRegex = /```(?:python|py)\s*([\s\S]*?)\s*```/i;
            const match = lastMessage.content?.match(pythonRegex);
            const alreadyHasResult = lastMessage.content?.includes('class="tool-result"');

            if (match && !alreadyHasResult) {
                const code = match[1];
                
                logService.info('[LocalPython] Auto-executing Python code...', { messageId: lastMessage.id });
                globalProcessedMessageIds.add(lastMessage.id);

                runCode(code).then((result) => {
                    // Construct HTML result block
                    const isError = !!result.error;
                    const outcomeClass = isError ? 'outcome-failed' : 'outcome-ok';
                    const label = isError ? 'Execution Error' : 'Execution Result';
                    
                    let resultHtml = `\n\n<div class="tool-result ${outcomeClass}">`;
                    resultHtml += `<strong>${label}:</strong>\n`;
                    
                    if (result.output) {
                        // Simple escaping
                        const safeOutput = result.output.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                        resultHtml += `<pre>${safeOutput}</pre>`;
                    }
                    if (result.error) {
                        const safeError = result.error.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                        resultHtml += `<pre class="text-red-500">${safeError}</pre>`;
                    }
                    
                    if (!result.output && !result.image && !result.error) {
                        resultHtml += `<span class="text-xs italic opacity-70">(Code executed successfully with no output)</span>`;
                    }

                    resultHtml += `</div>\n\n`;

                    const newFiles = [...(lastMessage.files || [])];

                    if (result.image) {
                        newFiles.push(createUploadedFileFromBase64(result.image, 'image/png', `generated-plot-${Date.now()}`));
                    }
                    
                    if (result.files && result.files.length > 0) {
                        result.files.forEach((f: any) => {
                            newFiles.push(createUploadedFileFromBase64(f.data, f.type, f.name));
                        });
                    }

                    const newContent = (lastMessage.content || '') + resultHtml;
                    
                    updateAndPersistSessions(prev => prev.map(s => {
                        if (s.id === activeSessionId) {
                            return {
                                ...s,
                                messages: s.messages.map(m => m.id === lastMessage.id ? { ...m, content: newContent, files: newFiles, apiParts: undefined } : m)
                            };
                        }
                        return s;
                    }));
                    
                    // Small delay to ensure state update propagates before continue triggers
                    setTimeout(() => {
                        onContinueGeneration(lastMessage.id);
                    }, 100);
                }).catch((err) => {
                    logService.error('[LocalPython] Execution failed catastrophically', err);
                    // On complete failure, we still leave it in the processed set to avoid infinite loops
                });
            }
        }
    }, [messages, isLoading, isLocalPythonEnabled, activeSessionId, runCode, updateMessageContent, onContinueGeneration, updateAndPersistSessions]);
};
