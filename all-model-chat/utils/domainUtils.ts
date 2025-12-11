
import { ChatMessage, ContentPart, UploadedFile, ChatHistoryItem, SavedChatSession, ModelOption, ChatSettings } from '../types';
import { SUPPORTED_IMAGE_MIME_TYPES, SUPPORTED_TEXT_MIME_TYPES, TEXT_BASED_EXTENSIONS, MIME_TO_EXTENSION_MAP } from '../constants/fileConstants';
import { logService } from '../services/logService';
import { TAB_CYCLE_MODELS, STATIC_TTS_MODELS, STATIC_IMAGEN_MODELS, GEMINI_3_RO_MODELS } from '../constants/appConstants';
import { MediaResolution } from '../types/settings';

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

export const fileToString = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
        reader.readAsText(file);
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

export const getExtensionFromMimeType = (mimeType: string): string => {
    if (MIME_TO_EXTENSION_MAP[mimeType]) return MIME_TO_EXTENSION_MAP[mimeType];
    
    // Fallback logic for generic types (image/xyz -> .xyz)
    if (mimeType.startsWith('image/') || mimeType.startsWith('audio/') || mimeType.startsWith('video/')) {
        const subtype = mimeType.split('/')[1];
        if (subtype) return `.${subtype}`;
    }
    
    return '.file';
};

export const formatFileSize = (sizeInBytes: number): string => {
    if (!sizeInBytes) return '';
    if (sizeInBytes < 1024) return `${Math.round(sizeInBytes)} B`;
    const sizeInKb = sizeInBytes / 1024;
    if (sizeInKb < 1024) return `${sizeInKb.toFixed(1)} KB`;
    const sizeInMb = sizeInKb / 1024;
    return `${sizeInMb.toFixed(2)} MB`;
};

export const generateUniqueId = () => `chat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const createNewSession = (
    settings: ChatSettings,
    messages: ChatMessage[] = [],
    title: string = "New Chat",
    groupId: string | null = null
): SavedChatSession => ({
    id: generateUniqueId(),
    title,
    messages,
    settings,
    timestamp: Date.now(),
    groupId,
});

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

export const parseThoughtProcess = (thoughts: string | undefined) => {
    if (!thoughts) return null;

    const lines = thoughts.trim().split('\n');
    let lastHeadingIndex = -1;
    let lastHeading = '';

    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        // Check for ## or ### headings
        if (line.startsWith('## ') || line.startsWith('### ')) {
            lastHeadingIndex = i;
            lastHeading = line.replace(/^[#]+\s*/, '').trim();
            break;
        }
        // Check for lines that are entirely bolded (e.g., **Title**)
        if ((line.startsWith('**') && line.endsWith('**') && !line.slice(2, -2).includes('**')) || 
            (line.startsWith('__') && line.endsWith('__') && !line.slice(2, -2).includes('__'))) {
            lastHeadingIndex = i;
            // Remove the bold markers from the start and end
            lastHeading = line.substring(2, line.length - 2).trim();
            break;
        }
    }

    if (lastHeadingIndex === -1) {
            const content = lines.slice(-5).join('\n').trim();
            return { title: 'Latest thought', content, isFallback: true };
    }
    
    const contentLines = lines.slice(lastHeadingIndex + 1);
    const content = contentLines.filter(l => l.trim() !== '').join('\n').trim();

    return { title: lastHeading, content, isFallback: false };
};

export const buildContentParts = async (
  text: string, 
  files: UploadedFile[] | undefined,
  modelId?: string,
  mediaResolution?: MediaResolution
): Promise<{
  contentParts: ContentPart[];
  enrichedFiles: UploadedFile[];
}> => {
  const filesToProcess = files || [];
  
  // Check if model supports per-part resolution (Gemini 3 family)
  const isGemini3 = modelId && (
      GEMINI_3_RO_MODELS.some(m => modelId.toLowerCase().includes(m)) || 
      modelId.toLowerCase().includes('gemini-3-pro')
  );
  
  const processedResults = await Promise.all(filesToProcess.map(async (file) => {
    const newFile = { ...file };
    let part: ContentPart | null = null;
    
    if (file.isProcessing || file.error || file.uploadState !== 'active') {
      return { file: newFile, part };
    }
    
    const isVideo = file.type.startsWith('video/');
    const isYoutube = file.type === 'video/youtube-link';
    // Check if file should be treated as text content (not base64 inlineData)
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    const isTextLike = SUPPORTED_TEXT_MIME_TYPES.includes(file.type) || TEXT_BASED_EXTENSIONS.includes(fileExtension) || file.type === 'text/plain';

    if (file.fileUri) {
        // 1. Files uploaded via API (or YouTube links)
        if (isYoutube) {
            // For YouTube URLs, do NOT send mimeType, just fileUri.
            part = { fileData: { fileUri: file.fileUri } };
        } else {
            part = { fileData: { mimeType: file.type, fileUri: file.fileUri } };
        }
    } else {
        // 2. Files NOT uploaded via API (Inline handling)
        const fileSource = file.rawFile;
        const urlSource = file.dataUrl?.startsWith('blob:') ? file.dataUrl : undefined;
        
        if (isTextLike) {
            // Special handling for text/code: Read content and wrap in text part
            let textContent = '';
            if (fileSource && fileSource instanceof File) {
                textContent = await fileToString(fileSource);
            } else if (urlSource) {
                const response = await fetch(urlSource);
                textContent = await response.text();
            }
            if (textContent) {
                // Format as a pseudo-file block for the model
                part = { text: `\n--- START OF FILE ${file.name} ---\n${textContent}\n--- END OF FILE ${file.name} ---\n` };
            }
        } else {
            // Standard Inline Data (Images, PDFs, Audio, Video if small enough)
            let base64DataForApi: string | undefined;
            
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
        }
    }
    
    // Inject video metadata if present and it's a video (works for both inline and fileUri video/youtube)
    if (part && (isVideo || isYoutube) && file.videoMetadata) {
        part.videoMetadata = { ...part.videoMetadata }; // Ensure object exists
        
        if (file.videoMetadata.startOffset) {
            part.videoMetadata.startOffset = file.videoMetadata.startOffset;
        }
        if (file.videoMetadata.endOffset) {
            part.videoMetadata.endOffset = file.videoMetadata.endOffset;
        }
        if (file.videoMetadata.fps) {
            part.videoMetadata.fps = file.videoMetadata.fps;
        }
    }

    // Inject Per-Part Media Resolution (Gemini 3 feature)
    // Only apply to supported media types (images, videos, pdfs) not text/code
    // Prioritize file-level resolution, then global resolution
    const effectiveResolution = file.mediaResolution || mediaResolution;
    
    if (part && isGemini3 && effectiveResolution && effectiveResolution !== MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED && !isTextLike && !isYoutube) {
        // Only apply if it has inlineData or fileData
        if (part.inlineData || part.fileData) {
            part.mediaResolution = { level: effectiveResolution };
        }
    }
    
    return { file: newFile, part };
  }));

  const enrichedFiles = processedResults.map(r => r.file);
  const dataParts = processedResults.map(r => r.part).filter((p): p is ContentPart => p !== null);

  const userTypedText = text.trim();
  const contentPartsResult: ContentPart[] = [];
  
  // Optimize: Place media parts first as recommended by Gemini documentation for better multimodal performance
  contentPartsResult.push(...dataParts);

  if (userTypedText) {
    contentPartsResult.push({ text: userTypedText });
  }

  return { contentParts: contentPartsResult, enrichedFiles };
};

export const createChatHistoryForApi = async (msgs: ChatMessage[]): Promise<ChatHistoryItem[]> => {
    const historyItemsPromises = msgs
      .filter(msg => msg.role === 'user' || msg.role === 'model')
      .map(async (msg) => {
        // Use buildContentParts for both user and model messages to handle text and files consistently.
        const { contentParts } = await buildContentParts(msg.content, msg.files);
        
        // Attach Thought Signatures if present (Crucial for Gemini 3 Pro)
        if (msg.role === 'model' && msg.thoughtSignatures && msg.thoughtSignatures.length > 0) {
            if (contentParts.length > 0) {
                const lastPart = contentParts[contentParts.length - 1];
                lastPart.thoughtSignature = msg.thoughtSignatures[msg.thoughtSignatures.length - 1];
            }
        }

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

export const getDefaultModelOptions = (): ModelOption[] => {
    const pinnedInternalModels: ModelOption[] = TAB_CYCLE_MODELS.map(id => {
        let name;
        if (id.toLowerCase().includes('gemma')) {
             name = id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        } else {
             name = id.includes('/') 
                ? `Gemini ${id.split('/')[1]}`.replace('gemini-','').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                : `Gemini ${id.replace('gemini-','').replace(/-/g, ' ')}`.replace(/\b\w/g, l => l.toUpperCase());
        }
        return { id, name, isPinned: true };
    });
    return sortModels([...pinnedInternalModels, ...STATIC_TTS_MODELS, ...STATIC_IMAGEN_MODELS]);
};

// --- Model Settings Cache ---
const MODEL_SETTINGS_CACHE_KEY = 'model_settings_cache';

export interface CachedModelSettings {
    mediaResolution?: MediaResolution;
    thinkingBudget?: number;
    thinkingLevel?: 'LOW' | 'HIGH';
}

export const getCachedModelSettings = (modelId: string): CachedModelSettings | undefined => {
    try {
        const cache = JSON.parse(localStorage.getItem(MODEL_SETTINGS_CACHE_KEY) || '{}');
        return cache[modelId];
    } catch {
        return undefined;
    }
};

export const cacheModelSettings = (modelId: string, settings: CachedModelSettings) => {
    if (!modelId) return;
    try {
        const cache = JSON.parse(localStorage.getItem(MODEL_SETTINGS_CACHE_KEY) || '{}');
        cache[modelId] = { ...cache[modelId], ...settings };
        localStorage.setItem(MODEL_SETTINGS_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.error("Failed to cache model settings", e);
    }
};