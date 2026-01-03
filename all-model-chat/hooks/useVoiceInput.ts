
import React, { useState, useCallback, useEffect } from 'react';
import { compressAudioToMp3 } from '../utils/audioCompression';
import { useRecorder } from './core/useRecorder';
import { checkShortcut } from '../utils/shortcutUtils';
import { ShortcutMap } from '../types';

interface UseVoiceInputProps {
  onTranscribeAudio: (file: File) => Promise<string | null>;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  adjustTextareaHeight: () => void;
  isAudioCompressionEnabled?: boolean;
  isSystemAudioRecordingEnabled?: boolean;
  customShortcuts?: ShortcutMap;
}

export const useVoiceInput = ({
  onTranscribeAudio,
  setInputText,
  textareaRef,
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
            // Create a File object with the correct MIME type (WebM) immediately.
            // This ensures downstream logic knows what container format this is.
            const timestamp = Date.now();
            const rawFile = new File([audioBlob], `voice-input-${timestamp}.webm`, { type: 'audio/webm' });
            
            let fileToTranscribe: File;
            
            if (isAudioCompressionEnabled) {
                try {
                    fileToTranscribe = await compressAudioToMp3(rawFile);
                } catch (error) {
                    console.error("Error compressing audio, falling back to original:", error);
                    fileToTranscribe = rawFile;
                }
            } else {
                fileToTranscribe = rawFile;
            }

            const transcribedText = await onTranscribeAudio(fileToTranscribe);
            
            if (transcribedText) {
                const textToInsert = transcribedText.trim();
                
                if (textToInsert) {
                    const textarea = textareaRef.current;
                    if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const currentVal = textarea.value;
                        
                        const prefix = currentVal.substring(0, start);
                        const suffix = currentVal.substring(end);
                        
                        // Intelligent spacing: Add space if preceding char is not whitespace and prefix isn't empty
                        const needsSpace = prefix.length > 0 && !/\s$/.test(prefix);
                        const finalInsert = (needsSpace ? ' ' : '') + textToInsert;
                        
                        const newVal = prefix + finalInsert + suffix;
                        setInputText(newVal);
                        
                        // Update cursor position and height
                        requestAnimationFrame(() => {
                            textarea.focus();
                            const newCursorPos = start + finalInsert.length;
                            textarea.setSelectionRange(newCursorPos, newCursorPos);
                            adjustTextareaHeight();
                        });
                    } else {
                        // Fallback behavior
                        setInputText(prev => (prev ? `${prev.trim()} ${textToInsert}` : textToInsert).trim());
                        setTimeout(() => adjustTextareaHeight(), 0);
                    }
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
