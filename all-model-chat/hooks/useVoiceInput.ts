
import React, { useState, useCallback, useEffect } from 'react';
import { compressAudioToMp3 } from '../utils/audioCompression';
import { useRecorder } from './core/useRecorder';
import { checkShortcut } from '../utils/shortcutUtils';
import { ShortcutMap } from '../types';

interface UseVoiceInputProps {
  onTranscribeAudio: (file: File) => Promise<string | null>;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  adjustTextareaHeight: () => void;
  isAudioCompressionEnabled?: boolean;
  isSystemAudioRecordingEnabled?: boolean;
  customShortcuts?: ShortcutMap;
}

export const useVoiceInput = ({
  onTranscribeAudio,
  setInputText,
  adjustTextareaHeight,
  isAudioCompressionEnabled = true,
  isSystemAudioRecordingEnabled = false,
  customShortcuts,
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
      startRecording: startCore, 
      stopRecording, 
      cancelRecording 
  } = useRecorder({
      onStop: handleRecordingComplete
  });

  const isRecording = status === 'recording';

  const startRecording = useCallback(() => {
      startCore(isSystemAudioRecordingEnabled);
  }, [startCore, isSystemAudioRecordingEnabled]);

  const handleVoiceInputClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Toggle Record Logic with Custom Shortcuts
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          const shortcuts = customShortcuts;
          if (!shortcuts) return;

          if (checkShortcut(e, shortcuts.toggleVoice) && !e.repeat) {
              e.preventDefault(); // Prevent browser history / hide window
              
              if (isTranscribing || isInitializing) return;

              if (isRecording) {
                  stopRecording();
              } else {
                  startRecording();
              }
          }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
          window.removeEventListener('keydown', handleKeyDown);
      };
  }, [isRecording, isTranscribing, isInitializing, startRecording, stopRecording, customShortcuts]);

  return {
    isRecording,
    isTranscribing,
    isMicInitializing: isInitializing,
    handleVoiceInputClick,
    handleCancelRecording: cancelRecording,
  };
};
