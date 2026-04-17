import { useEffect } from 'react';
import { ChatMessage, AppSettings, SavedChatSession, ChatSettings } from '../../types';
import { logService, createUploadedFileFromBase64 } from '../../utils/appUtils';
import { pyodideService, type PyodideFile } from '../../services/pyodideService';
import {
    collectLocalPythonInputFiles,
    getLatestLocalPythonExecutionCandidate,
    hasGeneratedImageFile,
} from '../../features/local-python/helpers';

// Track the last executed code signature for each model message so that
// continue-generation can re-run only when a new Python block appears.
const processedMessageSignatures = new Map<string, string>();

interface UseLocalPythonAgentProps {
    messages: ChatMessage[];
    appSettings: AppSettings;
    currentChatSettings: ChatSettings;
    isLoading: boolean;
    activeSessionId: string | null;
    onContinueGeneration: (messageId: string) => void;
    updateAndPersistSessions: (updater: (prev: SavedChatSession[]) => SavedChatSession[], options?: { persist?: boolean }) => void;
}

export const useLocalPythonAgent = ({
    messages,
    appSettings,
    currentChatSettings,
    isLoading,
    activeSessionId,
    onContinueGeneration,
    updateAndPersistSessions
}: UseLocalPythonAgentProps) => {
    const isLocalPythonEnabled = currentChatSettings.isLocalPythonEnabled || appSettings.isLocalPythonEnabled;

    useEffect(() => {
        if (!isLocalPythonEnabled || isLoading || !activeSessionId || messages.length === 0) return;

        const lastMessage = messages[messages.length - 1];

        // 1. Target Condition: Last message is from Model, not loading, and contains Python code
        if (lastMessage.role === 'model' && !lastMessage.isLoading && !lastMessage.stoppedByUser) {
            const candidate = getLatestLocalPythonExecutionCandidate({
                messageId: lastMessage.id,
                content: lastMessage.content || '',
                processedSignatures: processedMessageSignatures,
            });

            if (candidate) {
                const { code, signature } = candidate;
                const inputFiles = collectLocalPythonInputFiles(messages, lastMessage.id);
                
                logService.info('[LocalPython] Auto-executing Python code...', { messageId: lastMessage.id });
                processedMessageSignatures.set(lastMessage.id, signature);

                pyodideService.runPython(code, { files: inputFiles }).then((result) => {
                    // Construct HTML result block
                    const outputFiles = result.files || [];
                    const displayInlineImage = !!result.image && !hasGeneratedImageFile(outputFiles);
                    const outcomeClass = 'outcome-ok';
                    const label = 'Execution Result';
                    
                    let resultHtml = `\n\n<div class="tool-result ${outcomeClass}">`;
                    resultHtml += `<strong>${label}:</strong>\n`;
                    
                    if (result.output) {
                        // Simple escaping
                        const safeOutput = result.output.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                        resultHtml += `<pre>${safeOutput}</pre>`;
                    }
                    if (!result.output && !displayInlineImage && outputFiles.length === 0) {
                        resultHtml += `<span class="text-xs italic opacity-70">(Code executed successfully with no output)</span>`;
                    }

                    resultHtml += `</div>\n\n`;

                    const newFiles = [...(lastMessage.files || [])];

                    if (displayInlineImage && result.image) {
                        newFiles.push(createUploadedFileFromBase64(result.image, 'image/png', `generated-plot-${Date.now()}`));
                    }
                    
                    if (outputFiles.length > 0) {
                        outputFiles.forEach((f: PyodideFile) => {
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
                    const errorMessage = err instanceof Error ? err.message : String(err);
                    logService.error('[LocalPython] Execution failed catastrophically', err);

                    const safeError = errorMessage.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    const resultHtml = `\n\n<div class="tool-result outcome-failed"><strong>Execution Error:</strong>\n<pre class="text-red-500">${safeError}</pre></div>\n\n`;
                    const newContent = (lastMessage.content || '') + resultHtml;

                    updateAndPersistSessions(prev => prev.map(s => {
                        if (s.id === activeSessionId) {
                            return {
                                ...s,
                                messages: s.messages.map(m => m.id === lastMessage.id ? { ...m, content: newContent, apiParts: undefined } : m)
                            };
                        }
                        return s;
                    }));
                });
            }
        }
    }, [messages, isLoading, isLocalPythonEnabled, activeSessionId, onContinueGeneration, updateAndPersistSessions]);
};
