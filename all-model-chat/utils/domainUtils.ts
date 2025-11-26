
import { ChatMessage, ContentPart, UploadedFile, ChatHistoryItem, SavedChatSession, ModelOption } from '../types';
import { SUPPORTED_IMAGE_MIME_TYPES } from '../constants/fileConstants';
import { logService } from '../services/logService';

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            if (base64Data) {
                resolve(base64Data);
            } else {
                reject(new Error("Failed to extract base64 data from file."));
            }
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
};


export const fileToBlobUrl = (file: File): string => {
    return URL.createObjectURL(file);
};

export const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
};

export const base64ToBlobUrl = (base64: string, mimeType: string): string => {
    const blob = base64ToBlob(base64, mimeType);
    return URL.createObjectURL(blob);
};

export const generateUniqueId = () => `chat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const generateSessionTitle = (messages: ChatMessage[]): string => {
    const firstUserMessage = messages.find(msg => msg.role === 'user' && msg.content.trim() !== '');
    if (firstUserMessage) {
      return firstUserMessage.content.split(/\s+/).slice(0, 7).join(' ') + (firstUserMessage.content.split(/\s+/).length > 7 ? '...' : '');
    }
    const firstModelMessage = messages.find(msg => msg.role === 'model' && msg.content.trim() !== '');
     if (firstModelMessage) {
      return "Model: " + firstModelMessage.content.split(/\s+/).slice(0, 5).join(' ') + (firstModelMessage.content.split(/\s+/).length > 5 ? '...' : '');
    }
    const firstFile = messages.find(msg => msg.files && msg.files.length > 0)?.files?.[0];
    if (firstFile) {
        return `Chat with ${firstFile.name}`;
    }
    return 'New Chat';
};

export const buildContentParts = async (
  text: string, 
  files: UploadedFile[] | undefined
): Promise<{
  contentParts: ContentPart[];
  enrichedFiles: UploadedFile[];
}> => {
  const filesToProcess = files || [];
  
  const processedResults = await Promise.all(filesToProcess.map(async (file) => {
    // Create a shallow copy to avoid direct mutation of state objects.
    // We will be careful not to add large data to this object.
    const newFile = { ...file };
    let part: ContentPart | null = null;
    
    if (file.isProcessing || file.error || file.uploadState !== 'active') {
      return { file: newFile, part };
    }
    
    const isVideo = file.type.startsWith('video/');

    if (SUPPORTED_IMAGE_MIME_TYPES.includes(file.type) && !file.fileUri) {
      // Base64 data is generated on-the-fly for the API call,
      // but NOT stored back into the `newFile` object that goes into React state.
      let base64DataForApi: string | undefined;
      
      const fileSource = file.rawFile;
      const urlSource = file.dataUrl?.startsWith('blob:') ? file.dataUrl : undefined;

      if (fileSource && fileSource instanceof File) {
        try {
          base64DataForApi = await fileToBase64(fileSource);
        } catch (error) {
          logService.error(`Failed to convert rawFile to base64 for ${file.name}`, { error });
        }
      } else if (urlSource) {
        try {
          const response = await fetch(urlSource);
          const blob = await response.blob();
          const tempFile = new File([blob], file.name, { type: file.type });
          base64DataForApi = await fileToBase64(tempFile);
        } catch (error) {
          logService.error(`Failed to fetch blob and convert to base64 for ${file.name}`, { error });
        }
      }
      
      if (base64DataForApi) {
        part = { inlineData: { mimeType: file.type, data: base64DataForApi } };
      }
    } else if (file.fileUri && file.type === 'video/youtube-link') {
        part = { fileData: { mimeType: 'video/youtube', fileUri: file.fileUri } };
    } else if (file.fileUri) {
      part = { fileData: { mimeType: file.type, fileUri: file.fileUri } };
    }
    
    // Inject video metadata if present and it's a video
    if (part && isVideo && file.videoMetadata) {
        part.videoMetadata = {
            startOffset: file.videoMetadata.startOffset,
            endOffset: file.videoMetadata.endOffset,
        };
    }
    
    return { file: newFile, part };
  }));

  const enrichedFiles = processedResults.map(r => r.file);
  const dataParts = processedResults.map(r => r.part).filter((p): p is ContentPart => p !== null);

  const userTypedText = text.trim();
  const contentPartsResult: ContentPart[] = [];
  if (userTypedText) {
    contentPartsResult.push({ text: userTypedText });
  }
  contentPartsResult.push(...dataParts);

  return { contentParts: contentPartsResult, enrichedFiles };
};

export const createChatHistoryForApi = async (msgs: ChatMessage[]): Promise<ChatHistoryItem[]> => {
    const historyItemsPromises = msgs
      .filter(msg => msg.role === 'user' || msg.role === 'model')
      .map(async (msg) => {
        // Use buildContentParts for both user and model messages to handle text and files consistently.
        const { contentParts } = await buildContentParts(msg.content, msg.files);
        return { role: msg.role as 'user' | 'model', parts: contentParts };
      });
      
    return Promise.all(historyItemsPromises);
};

export const sortModels = (models: ModelOption[]): ModelOption[] => {
    const getCategoryWeight = (id: string) => {
        const lower = id.toLowerCase();
        if (lower.includes('tts')) return 4;
        if (lower.includes('imagen')) return 3;
        if (lower.includes('image')) return 2;
        return 1;
    };

    return [...models].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        
        if (a.isPinned && b.isPinned) {
            const weightA = getCategoryWeight(a.id);
            const weightB = getCategoryWeight(b.id);
            if (weightA !== weightB) return weightA - weightB;

            const isA3 = a.id.includes('gemini-3');
            const isB3 = b.id.includes('gemini-3');
            if (isA3 && !isB3) return -1;
            if (!isA3 && isB3) return 1;
        }

        return a.name.localeCompare(b.name);
    });
};
