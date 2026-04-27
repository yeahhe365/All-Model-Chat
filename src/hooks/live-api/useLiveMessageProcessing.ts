import { useCallback, useRef } from 'react';
import type { LiveServerMessage, Session as LiveSession } from '@google/genai';
import { useLiveTools } from './useLiveTools';
import type { LiveClientFunctions, ThoughtSupportingPart, UploadedFile } from '../../types';
import { createWavBlobFromPCMChunks } from '../../utils/audio/audioProcessing';

interface UseLiveMessageProcessingProps {
  playAudioChunk: (data: string) => Promise<void>;
  stopAudioPlayback: () => void;
  onTranscript?: (
    text: string,
    role: 'user' | 'model',
    isFinal: boolean,
    type?: 'content' | 'thought',
    audioUrl?: string | null,
  ) => void;
  onGoAway?: (goAway: NonNullable<LiveServerMessage['goAway']>) => void;
  onGeneratedFiles?: (files: UploadedFile[]) => void;
  clientFunctions?: LiveClientFunctions;
  sessionRef: React.MutableRefObject<Promise<LiveSession> | null>;
  setSessionHandle: (handle: string | null) => void;
  sessionHandleRef: React.MutableRefObject<string | null>;
}

export const useLiveMessageProcessing = ({
  playAudioChunk,
  stopAudioPlayback,
  onTranscript,
  onGoAway,
  onGeneratedFiles,
  clientFunctions,
  sessionRef,
  setSessionHandle,
  sessionHandleRef,
}: UseLiveMessageProcessingProps) => {
  const { handleToolCall, cancelToolCalls } = useLiveTools({ clientFunctions, sessionRef, onGeneratedFiles });

  // Buffer for audio chunks to create a downloadable file later
  const audioChunksRef = useRef<string[]>([]);

  const finalizeAudio = useCallback(() => {
    if (audioChunksRef.current.length > 0 && onTranscript) {
      const wavUrl = createWavBlobFromPCMChunks(audioChunksRef.current);
      if (wavUrl) {
        // Send the final audio URL to be attached to the message
        onTranscript('', 'model', true, 'content', wavUrl);
      }
      audioChunksRef.current = [];
    }
  }, [onTranscript]);

  const clearBufferedAudio = useCallback(() => {
    audioChunksRef.current = [];
  }, []);

  const handleMessage = useCallback(
    async (msg: LiveServerMessage) => {
      // 1. Handle Text/Code/Audio Content (Gemini 3.1 may return multiple parts per event)
      if (msg.serverContent?.modelTurn?.parts) {
        for (const part of msg.serverContent.modelTurn.parts) {
          const anyPart = part as ThoughtSupportingPart;

          if (part.inlineData?.data) {
            audioChunksRef.current.push(part.inlineData.data);
            await playAudioChunk(part.inlineData.data);
          }

          // Handle thoughts vs content
          if (anyPart.thought && onTranscript) {
            const thoughtText = typeof anyPart.thought === 'string' ? anyPart.thought : anyPart.text || '';
            if (thoughtText) {
              onTranscript(thoughtText, 'model', false, 'thought');
            }
          } else if (part.text && onTranscript) {
            onTranscript(part.text, 'model', false, 'content');
          }

          if (part.executableCode) {
            const language = part.executableCode.language?.toLowerCase() || 'python';
            const codeBlock = `\n\`\`\`${language}\n${part.executableCode.code}\n\`\`\`\n`;
            if (onTranscript) onTranscript(codeBlock, 'model', false, 'content');
          }
          if (part.codeExecutionResult) {
            let resultBlock = `\n> Execution Result: ${part.codeExecutionResult.outcome}\n`;
            if (part.codeExecutionResult.output) {
              resultBlock += `\n\`\`\`\n${part.codeExecutionResult.output}\n\`\`\`\n`;
            }
            if (onTranscript) onTranscript(resultBlock, 'model', false, 'content');
          }
        }
      }

      // 2. Handle Tool Calls (Client-side Function Calling)
      if (msg.toolCall) {
        await handleToolCall(msg.toolCall);
      }

      if (msg.toolCallCancellation?.ids?.length) {
        cancelToolCalls(msg.toolCallCancellation.ids);
      }

      // 3. Handle Interruption
      if (msg.serverContent?.interrupted) {
        stopAudioPlayback();
        // Finalize what we have so far
        finalizeAudio();
        if (onTranscript) {
          onTranscript('', 'user', true, 'content'); // Mark user turn as done
          onTranscript('', 'model', true, 'content'); // Mark model turn as done
        }
      }

      // 4. Handle Transcriptions (ASR for user, TTS transcript for model audio)
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

      // 5. Handle Turn Complete (Finalize transcripts in UI)
      if (msg.serverContent?.turnComplete) {
        finalizeAudio();
        if (onTranscript) {
          onTranscript('', 'user', true, 'content');
          onTranscript('', 'model', true, 'content');
        }
      }

      // 6. Handle GoAway for proactive reconnection
      if (msg.goAway) {
        onGoAway?.(msg.goAway);
      }

      // 7. Handle Session Resumption Update
      if (
        msg.sessionResumptionUpdate &&
        msg.sessionResumptionUpdate.resumable &&
        msg.sessionResumptionUpdate.newHandle
      ) {
        const newHandle = msg.sessionResumptionUpdate.newHandle;
        setSessionHandle(newHandle);
        // sessionHandleRef is updated via Effect in parent, but we update it here too for immediate consistency
        sessionHandleRef.current = newHandle;
      }
    },
    [
      playAudioChunk,
      stopAudioPlayback,
      onTranscript,
      onGoAway,
      handleToolCall,
      cancelToolCalls,
      setSessionHandle,
      sessionHandleRef,
      finalizeAudio,
    ],
  );

  return { handleMessage, clearBufferedAudio };
};
