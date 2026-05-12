import type { ChatMessage, UploadedFile } from '@/types';
import { isImageMimeType } from '@/utils/fileTypeUtils';

export const collectLocalPythonInputFiles = (messages: ChatMessage[], targetMessageId: string) => {
  const targetIndex = messages.findIndex((message) => message.id === targetMessageId);
  const contextMessages = targetIndex === -1 ? messages : messages.slice(0, targetIndex);
  const inputFiles = new Map<string, UploadedFile>();

  for (const message of contextMessages) {
    if (message.role !== 'user' || !message.files?.length) {
      continue;
    }

    for (const file of message.files) {
      const isGeneratedOutput = file.name.startsWith('generated-') || file.name.startsWith('edited-');
      const isActive = file.uploadState === undefined || file.uploadState === 'active';
      if (!file.rawFile || !isActive || file.error || isGeneratedOutput) {
        continue;
      }

      inputFiles.set(file.id, file);
    }
  }

  return Array.from(inputFiles.values());
};

export const hasGeneratedImageFile = (files: Array<{ type: string }>) =>
  files.some((file) => isImageMimeType(file.type));
