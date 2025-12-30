
import { useCallback } from 'react';
import { LiveServerMessage, LiveSession } from '@google/genai';
import { useLiveTools } from './useLiveTools';

interface UseLiveMessageProcessingProps {
    playAudioChunk: (data: string) => Promise<void>;
    stopAudioPlayback: () => void;
    onTranscript?: (text: string, role: 'user' | 'model', isFinal: boolean) => void;
    clientFunctions?: Record<string, (args: any) => Promise<any>>;
    sessionRef: React.MutableRefObject<Promise<LiveSession> | null>;
    setSessionHandle: (handle: string | null) => void;
    sessionHandleRef: React.MutableRefObject<string | null>;
}

export const useLiveMessageProcessing = ({
    playAudioChunk,
    stopAudioPlayback,
    onTranscript,
    clientFunctions,
    sessionRef,
    setSessionHandle,
    sessionHandleRef
}: UseLiveMessageProcessingProps) => {
    
    const { handleToolCall } = useLiveTools({ clientFunctions, sessionRef });

    const handleMessage = useCallback(async (msg: LiveServerMessage) => {
        // 1. Handle Audio Output
        const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (audioData) {
            await playAudioChunk(audioData);
        }

        // 2. Handle Text/Code Content (e.g., Code Execution, Search results, or direct text)
        // The model might generate code or text along with audio
        if (msg.serverContent?.modelTurn?.parts) {
            for (const part of msg.serverContent.modelTurn.parts) {
                // Handle text parts (thoughts, tool outputs, or mixed modality text)
                if (part.text && onTranscript) {
                    onTranscript(part.text, 'model', false);
                }

                if (part.executableCode) {
                    const codeBlock = `\n\`\`\`${part.executableCode.language.toLowerCase()}\n${part.executableCode.code}\n\`\`\`\n`;
                    if (onTranscript) onTranscript(codeBlock, 'model', false);
                }
                if (part.codeExecutionResult) {
                    const resultBlock = `\n> Execution Result: ${part.codeExecutionResult.outcome}\n`;
                    if (onTranscript) onTranscript(resultBlock, 'model', false);
                }
            }
        }

        // 3. Handle Tool Calls (Client-side Function Calling)
        if (msg.toolCall) {
            await handleToolCall(msg.toolCall);
        }

        // 4. Handle Interruption
        if (msg.serverContent?.interrupted) {
            stopAudioPlayback();
        }

        // 5. Handle Transcriptions (ASR for user, TTS transcript for model audio)
        if (msg.serverContent?.inputTranscription && onTranscript) {
            onTranscript(msg.serverContent.inputTranscription.text, 'user', false);
        }
        if (msg.serverContent?.outputTranscription && onTranscript) {
            onTranscript(msg.serverContent.outputTranscription.text, 'model', false);
        }

        // 6. Handle Turn Complete (Finalize transcripts in UI)
        if (msg.serverContent?.turnComplete && onTranscript) {
            onTranscript("", 'user', true);
            onTranscript("", 'model', true);
        }

        // 7. Handle Session Resumption Update
        if (msg.sessionResumptionUpdate && msg.sessionResumptionUpdate.resumable && msg.sessionResumptionUpdate.newHandle) {
            const newHandle = msg.sessionResumptionUpdate.newHandle;
            setSessionHandle(newHandle);
            // sessionHandleRef is updated via Effect in parent, but we update it here too for immediate consistency
            sessionHandleRef.current = newHandle;
        }
    }, [playAudioChunk, stopAudioPlayback, onTranscript, handleToolCall, setSessionHandle, sessionHandleRef]);

    return { handleMessage };
};
