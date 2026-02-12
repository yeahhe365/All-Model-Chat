
import { useCallback, useRef } from 'react';
import { LiveServerMessage, LiveSession } from '@google/genai';
import { useLiveTools } from './useLiveTools';
import { logService } from '../../utils/appUtils';
import { ThoughtSupportingPart } from '../../types';
import { createWavBlobFromPCMChunks } from '../../utils/audio/audioProcessing';

interface UseLiveMessageProcessingProps {
    playAudioChunk: (data: string) => Promise<void>;
    stopAudioPlayback: () => void;
    onTranscript?: (text: string, role: 'user' | 'model', isFinal: boolean, type?: 'content' | 'thought', audioUrl?: string | null) => void;
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
    
    // Buffer for audio chunks to create a downloadable file later
    const audioChunksRef = useRef<string[]>([]);

    const finalizeAudio = useCallback(() => {
        if (audioChunksRef.current.length > 0 && onTranscript) {
            const wavUrl = createWavBlobFromPCMChunks(audioChunksRef.current);
            if (wavUrl) {
                // Send the final audio URL to be attached to the message
                onTranscript("", 'model', true, 'content', wavUrl);
            }
            audioChunksRef.current = [];
        }
    }, [onTranscript]);

    const handleMessage = useCallback(async (msg: LiveServerMessage) => {
        // 1. Handle Audio Output
        const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (audioData) {
            // Buffer the audio data for saving
            audioChunksRef.current.push(audioData);
            // Play immediately
            await playAudioChunk(audioData);
        }

        // 2. Handle Text/Code Content (e.g., Code Execution, Search results, Thoughts, or direct text)
        // The model might generate code or text along with audio
        if (msg.serverContent?.modelTurn?.parts) {
            for (const part of msg.serverContent.modelTurn.parts) {
                const anyPart = part as ThoughtSupportingPart;

                // Handle thoughts vs content
                if (anyPart.thought && onTranscript) {
                    const thoughtText = typeof anyPart.thought === 'string' ? anyPart.thought : (anyPart.text || "");
                    if (thoughtText) {
                        onTranscript(thoughtText, 'model', false, 'thought');
                    }
                } else if (part.text && onTranscript) {
                    onTranscript(part.text, 'model', false, 'content');
                }

                if (part.executableCode) {
                    const codeBlock = `\n\`\`\`${part.executableCode.language.toLowerCase()}\n${part.executableCode.code}\n\`\`\`\n`;
                    if (onTranscript) onTranscript(codeBlock, 'model', false, 'content');
                }
                if (part.codeExecutionResult) {
                    const resultBlock = `\n> Execution Result: ${part.codeExecutionResult.outcome}\n`;
                    if (onTranscript) onTranscript(resultBlock, 'model', false, 'content');
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
            // Finalize what we have so far
            finalizeAudio();
            if (onTranscript) {
                onTranscript("", 'user', true, 'content'); // Mark user turn as done
                onTranscript("", 'model', true, 'content'); // Mark model turn as done
            }
        }

        // 5. Handle Transcriptions (ASR for user, TTS transcript for model audio)
        if (msg.serverContent?.inputTranscription && onTranscript) {
            const text = msg.serverContent.inputTranscription.text;
            if (text) {
                onTranscript(text, 'user', false, 'content');
            }
        }
        if (msg.serverContent?.outputTranscription && onTranscript) {
            const text = msg.serverContent.outputTranscription.text;
            if (text) {
                onTranscript(text, 'model', false, 'content');
            }
        }

        // 6. Handle Turn Complete (Finalize transcripts in UI)
        if (msg.serverContent?.turnComplete) {
            finalizeAudio();
            if (onTranscript) {
                onTranscript("", 'user', true, 'content');
                onTranscript("", 'model', true, 'content');
            }
        }

        // 7. Handle Session Resumption Update
        if (msg.sessionResumptionUpdate && msg.sessionResumptionUpdate.resumable && msg.sessionResumptionUpdate.newHandle) {
            const newHandle = msg.sessionResumptionUpdate.newHandle;
            setSessionHandle(newHandle);
            // sessionHandleRef is updated via Effect in parent, but we update it here too for immediate consistency
            sessionHandleRef.current = newHandle;
        }
    }, [playAudioChunk, stopAudioPlayback, onTranscript, handleToolCall, setSessionHandle, sessionHandleRef, finalizeAudio]);

    return { handleMessage };
};
