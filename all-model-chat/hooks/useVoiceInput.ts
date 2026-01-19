
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { compressAudioToMp3 } from '../utils/audioCompression';
import { useRecorder } from './core/useRecorder';

interface UseVoiceInputProps {
  onTranscribeAudio: (file: File) => Promise<string | null>;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  adjustTextareaHeight: () => void;
  isAudioCompressionEnabled?: boolean;
  isSystemAudioRecordingEnabled?: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export const useVoiceInput = ({
  onTranscribeAudio,
  setInputText,
  adjustTextareaHeight,
  isAudioCompressionEnabled = true,
  isSystemAudioRecordingEnabled = false,
  textareaRef,
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
                const textToInsert = transcribedText.trim();
                const textarea = textareaRef.current;

                if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const currentValue = textarea.value;

                    const before = currentValue.substring(0, start);
                    const after = currentValue.substring(end);

                    let prefix = "";
                    let suffix = "";

                    // Add space before if not at start and previous char is not whitespace
                    if (start > 0 && !/\s$/.test(before)) {
                        prefix = " ";
                    }
                    // Add space after if not at end and next char is not whitespace
                    if (after.length > 0 && !/^\s/.test(after)) {
                        suffix = " ";
                    }

                    const newValue = before + prefix + textToInsert + suffix + after;

                    setInputText(newValue);

                    // Restore cursor position after the inserted text
                    requestAnimationFrame(() => {
                        textarea.focus();
                        const newCursorPos = start + prefix.length + textToInsert.length;
                        textarea.setSelectionRange(newCursorPos, newCursorPos);
                        adjustTextareaHeight();
                    });
                } else {
                    // Fallback if ref is missing
                    setInputText(prev => (prev ? `${prev.trim()} ${textToInsert}` : textToInsert).trim());
                    setTimeout(() => adjustTextareaHeight(), 0);
                }
            }
        } catch (error) {
            console.error("Error processing/transcribing audio:", error);
        } finally {
            setIsTranscribing(false);
        }
    }
  }, [onTranscribeAudio, setInputText, adjustTextareaHeight, isAudioCompressionEnabled, textareaRef]);

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