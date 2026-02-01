
import React, { useState, useCallback } from 'react';
import { compressAudioToMp3 } from '../utils/audioCompression';
import { useRecorder } from './core/useRecorder';
import { useTextAreaInsert } from './useTextAreaInsert';

interface UseVoiceInputProps {
  onTranscribeAudio: (file: File) => Promise<string | null>;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  isAudioCompressionEnabled?: boolean;
  isSystemAudioRecordingEnabled?: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export const useVoiceInput = ({
  onTranscribeAudio,
  setInputText,
  isAudioCompressionEnabled = true,
  isSystemAudioRecordingEnabled = false,
  textareaRef,
}: UseVoiceInputProps) => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const insertText = useTextAreaInsert(textareaRef, setInputText);

  const handleRecordingComplete = useCallback(async (audioBlob: Blob) => {
    if (audioBlob.size > 0) {
        setIsTranscribing(true);
        try {
            let fileToTranscribe: File;
            
            if (isAudioCompressionEnabled) {
                try {
                    fileToTranscribe = await compressAudioToMp3(audioBlob);
                } catch (error) {
                    console.error("Error compressing audio, falling back to original:", error);
                    fileToTranscribe = new File([audioBlob], `voice-input-${Date.now()}.webm`, { type: 'audio/webm' });
                }
            } else {
                fileToTranscribe = new File([audioBlob], `voice-input-${Date.now()}.webm`, { type: 'audio/webm' });
            }

            const transcribedText = await onTranscribeAudio(fileToTranscribe);
            
            if (transcribedText) {
                // Use the shared hook with padding enabled for voice input
                insertText(transcribedText.trim(), { ensurePadding: true });
            }
        } catch (error) {
            console.error("Error processing/transcribing audio:", error);
        } finally {
            setIsTranscribing(false);
        }
    }
  }, [onTranscribeAudio, isAudioCompressionEnabled, insertText]);

  const { 
      status, 
      isInitializing, 
      startRecording, 
      stopRecording, 
      cancelRecording 
  } = useRecorder({
      onStop: handleRecordingComplete
  });

  const isRecording = status === 'recording';

  const handleVoiceInputClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording({ captureSystemAudio: isSystemAudioRecordingEnabled });
    }
  };

  return {
    isRecording,
    isTranscribing,
    isMicInitializing: isInitializing,
    handleVoiceInputClick,
    handleCancelRecording: cancelRecording,
  };
};
