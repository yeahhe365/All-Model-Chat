import React, { useState, useCallback } from 'react';
import { compressAudioToMp3 } from '@/features/audio/audioCompression';
import { useRecorder } from './core/useRecorder';
import { useTextAreaInsert } from './useTextAreaInsert';

interface UseVoiceInputProps {
  onTranscribeAudio: (file: File) => Promise<string | null>;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  setAppFileError?: (error: string | null) => void;
  isAudioCompressionEnabled?: boolean;
  isSystemAudioRecordingEnabled?: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export const useVoiceInput = ({
  onTranscribeAudio,
  setInputText,
  setAppFileError,
  isAudioCompressionEnabled = true,
  textareaRef,
}: UseVoiceInputProps) => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isFinalizingRecording, setIsFinalizingRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [systemAudioWarning, setSystemAudioWarning] = useState<string | null>(null);
  const insertText = useTextAreaInsert(textareaRef, setInputText);

  const reportError = useCallback(
    (message: string | null) => {
      setError(message);
      setAppFileError?.(message);
    },
    [setAppFileError],
  );

  const reportSystemAudioWarning = useCallback(
    (warning: string | null) => {
      setSystemAudioWarning(warning);
      setAppFileError?.(warning);
    },
    [setAppFileError],
  );

  const handleRecordingComplete = useCallback(
    async (audioBlob: Blob) => {
      if (audioBlob.size > 0) {
        setIsTranscribing(true);
        try {
          let fileToTranscribe: File;

          if (isAudioCompressionEnabled) {
            try {
              fileToTranscribe = await compressAudioToMp3(audioBlob);
            } catch (error) {
              console.error('Error compressing audio, falling back to original:', error);
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
          console.error('Error processing/transcribing audio:', error);
          const message = error instanceof Error ? error.message : 'Voice input failed.';
          reportError(`Voice input failed: ${message}`);
        } finally {
          setIsTranscribing(false);
          setIsFinalizingRecording(false);
        }
      } else {
        setIsFinalizingRecording(false);
      }
    },
    [onTranscribeAudio, isAudioCompressionEnabled, insertText, reportError],
  );

  const { status, isInitializing, startRecording, stopRecording, cancelRecording } = useRecorder({
    onStop: handleRecordingComplete,
    onError: reportError,
    onSystemAudioWarning: reportSystemAudioWarning,
  });

  const isRecording = status === 'recording';
  const isBusy = isTranscribing || isFinalizingRecording;

  const handleVoiceInputClick = () => {
    if (isRecording) {
      setIsFinalizingRecording(true);
      stopRecording();
    } else {
      reportError(null);
      reportSystemAudioWarning(null);
      startRecording({ captureSystemAudio: false });
    }
  };

  const handleCancelRecording = () => {
    setIsFinalizingRecording(false);
    reportSystemAudioWarning(null);
    cancelRecording();
  };

  return {
    isRecording,
    isTranscribing: isBusy,
    isMicInitializing: isInitializing,
    error,
    systemAudioWarning,
    handleVoiceInputClick,
    handleCancelRecording,
  };
};
