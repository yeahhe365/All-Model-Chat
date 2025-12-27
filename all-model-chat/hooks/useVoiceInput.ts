
import React, { useState, useCallback } from 'react';
import { compressAudioToMp3 } from '../utils/audioCompression';
import { useRecorder } from './core/useRecorder';

interface UseVoiceInputProps {
  onTranscribeAudio: (file: File) => Promise<string | null>;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  adjustTextareaHeight: () => void;
  isAudioCompressionEnabled?: boolean;
}

export const useVoiceInput = ({
  onTranscribeAudio,
  setInputText,
  adjustTextareaHeight,
  isAudioCompressionEnabled = true,
}: UseVoiceInputProps) => {
  const [isTranscribing, setIsTranscribing] = useState(false);

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
              setInputText(prev => (prev ? `${prev.trim()} ${transcribedText.trim()}` : transcribedText.trim()).trim());
              setTimeout(() => adjustTextareaHeight(), 0);
            }
        } catch (error) {
            console.error("Error processing/transcribing audio:", error);
        } finally {
            setIsTranscribing(false);
        }
    }
  }, [onTranscribeAudio, setInputText, adjustTextareaHeight, isAudioCompressionEnabled]);

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
      startRecording();
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
