
import React, { useState, useCallback, useEffect, useRef } from 'react';
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

  // Hold-to-Record (Alt Key) Logic
  const isAltRecordingRef = useRef(false);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          // If we are currently recording via Alt, and the user presses another key (e.g., Tab, L, or a character key)
          // We cancel the recording to allow the shortcut or typing to happen without sending a partial audio.
          if (isAltRecordingRef.current && e.key !== 'Alt') {
              cancelRecording();
              isAltRecordingRef.current = false;
              return;
          }

          // Start recording on Alt down
          if (e.key === 'Alt' && !e.repeat && !isRecording && !isTranscribing && !isInitializing) {
              e.preventDefault(); // Prevent menu focus on Windows
              isAltRecordingRef.current = true;
              startRecording();
          }
      };

      const handleKeyUp = (e: KeyboardEvent) => {
          if (e.key === 'Alt' && isAltRecordingRef.current) {
              e.preventDefault();
              isAltRecordingRef.current = false;
              stopRecording();
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      return () => {
          window.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('keyup', handleKeyUp);
      };
  }, [isRecording, isTranscribing, isInitializing, startRecording, stopRecording, cancelRecording]);

  return {
    isRecording,
    isTranscribing,
    isMicInitializing: isInitializing,
    handleVoiceInputClick,
    handleCancelRecording: cancelRecording,
  };
};
