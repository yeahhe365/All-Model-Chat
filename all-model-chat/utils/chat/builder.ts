import { ChatMessage, ContentPart, UploadedFile, ChatHistoryItem } from '../../types';
import { SUPPORTED_TEXT_MIME_TYPES, TEXT_BASED_EXTENSIONS } from '../../constants/fileConstants';
import { logService } from '../../services/logService';
import { fileToBase64, fileToString } from '../fileHelpers';
import { isGemini3Model } from '../modelHelpers';
import { MediaResolution } from '../../types/settings';

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
  const isGemini3 = modelId && isGemini3Model(modelId);
  
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
            
            // STRICT ALLOWLIST for Inline Data to prevent API 400 errors (e.g. for .xlsx)
            const isSupportedInlineType = 
                file.type.startsWith('image/') || 
                file.type.startsWith('audio/') || 
                file.type.startsWith('video/') || 
                file.type === 'application/pdf';

            if (isSupportedInlineType) {
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
            } else {
                // Fallback for unsupported binary types that aren't text-readable (e.g. Excel, Zip without extraction)
                // This prevents the API from rejecting the request with "Unsupported MIME type"
                part = { text: `[Attachment: ${file.name} (Binary content not supported for direct reading)]` };
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
    
    if (part && isGemini3 && effectiveResolution && effectiveResolution !== MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED) {
        // Logic update: 
        // 1. If it's fileData (File API), we always inject resolution (unless it's YouTube link which uses fileUri but is special).
        // 2. If it's inlineData, we ensure it's not text-like.
        const shouldInject = (part.fileData && !isYoutube) || (part.inlineData && !isTextLike);

        if (shouldInject) {
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

export const createChatHistoryForApi = async (
    msgs: ChatMessage[],
    stripThinking: boolean = false
): Promise<ChatHistoryItem[]> => {
    const historyItemsPromises = msgs
      .filter(msg => (msg.role === 'user' || msg.role === 'model') && !msg.excludeFromContext)
      .map(async (msg) => {
        let contentToUse = msg.content;
        
        if (stripThinking) {
            // Remove <thinking> blocks including tags from the content
            // Matches <thinking> ... </any-tag> to handle variations and potential hallucinated closing tags
            contentToUse = contentToUse.replace(/<thinking>[\s\S]*?<\/[^>]+>/gi, '').trim();
        }

        // Use buildContentParts for both user and model messages to handle text and files consistently.
        const { contentParts } = await buildContentParts(contentToUse, msg.files);
        
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