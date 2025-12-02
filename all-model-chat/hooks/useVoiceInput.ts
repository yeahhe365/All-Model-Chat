import { useState, useRef, useCallback } from 'react';

interface UseVoiceInputProps {
  onTranscribeAudio: (file: File) => Promise<string | null>;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  adjustTextareaHeight: () => void;
}

export const useVoiceInput = ({
  onTranscribeAudio,
  setInputText,
  adjustTextareaHeight,
}: UseVoiceInputProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isMicInitializing, setIsMicInitializing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingCancelledRef = useRef(false);

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      recordingCancelledRef.current = false;
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleCancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      recordingCancelledRef.current = true;
      mediaRecorderRef.current.stop();
    }
    audioChunksRef.current = [];
    setIsRecording(false);
  };

  const handleStartRecording = useCallback(async () => {
    try {
      if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
        alert("Your browser does not support audio recording.");
        return;
      }
      recordingCancelledRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (recordingCancelledRef.current) {
          return;
        }
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 0) {
          const audioFile = new File([audioBlob], `voice-input-${Date.now()}.webm`, { type: 'audio/webm' });
          setIsTranscribing(true);
          const transcribedText = await onTranscribeAudio(audioFile);
          if (transcribedText) {
            setInputText(prev => (prev ? `${prev.trim()} ${transcribedText.trim()}` : transcribedText.trim()).trim());
            setTimeout(() => adjustTextareaHeight(), 0);
          }
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    } finally {
      setIsMicInitializing(false);
    }
  }, [onTranscribeAudio, setInputText, adjustTextareaHeight]);

  const handleVoiceInputClick = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      setIsMicInitializing(true);
      handleStartRecording();
    }
  };

  return {
    isRecording,
    isTranscribing,
    isMicInitializing,
    handleVoiceInputClick,
    handleCancelRecording,
  };
};
