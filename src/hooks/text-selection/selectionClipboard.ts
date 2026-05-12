import { logService } from '@/services/logService';
export const copySelectionTextToClipboardEvent = (event: ClipboardEvent, text: string): boolean => {
  if (!text || !event.clipboardData) {
    return false;
  }

  event.preventDefault();
  event.clipboardData.setData('text/plain', text);
  return true;
};

export const writeSelectionTextToClipboard = async (text: string): Promise<boolean> => {
  if (!text) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    logService.error('Failed to copy selected text:', err);
    return false;
  }
};
