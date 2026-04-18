import { ChatMessage, ContentPart, UploadedFile, ChatHistoryItem } from '../../types';
import type { PartMediaResolutionLevel } from '@google/genai';
import { logService } from '../../services/logService';
import { blobToBase64, fileToString, isTextFile } from '../fileHelpers';
import { isGemini3Model } from '../modelHelpers';
import { MediaResolution } from '../../types/settings';

const PART_MEDIA_RESOLUTION_LEVEL = {
  MEDIA_RESOLUTION_UNSPECIFIED: 'MEDIA_RESOLUTION_UNSPECIFIED',
  MEDIA_RESOLUTION_LOW: 'MEDIA_RESOLUTION_LOW',
  MEDIA_RESOLUTION_MEDIUM: 'MEDIA_RESOLUTION_MEDIUM',
  MEDIA_RESOLUTION_HIGH: 'MEDIA_RESOLUTION_HIGH',
  MEDIA_RESOLUTION_ULTRA_HIGH: 'MEDIA_RESOLUTION_ULTRA_HIGH',
} as const;

const toPartMediaResolutionLevel = (resolution: MediaResolution): PartMediaResolutionLevel => {
  switch (resolution) {
    case MediaResolution.MEDIA_RESOLUTION_LOW:
      return PART_MEDIA_RESOLUTION_LEVEL.MEDIA_RESOLUTION_LOW as PartMediaResolutionLevel;
    case MediaResolution.MEDIA_RESOLUTION_MEDIUM:
      return PART_MEDIA_RESOLUTION_LEVEL.MEDIA_RESOLUTION_MEDIUM as PartMediaResolutionLevel;
    case MediaResolution.MEDIA_RESOLUTION_HIGH:
      return PART_MEDIA_RESOLUTION_LEVEL.MEDIA_RESOLUTION_HIGH as PartMediaResolutionLevel;
    case MediaResolution.MEDIA_RESOLUTION_ULTRA_HIGH:
      return PART_MEDIA_RESOLUTION_LEVEL.MEDIA_RESOLUTION_ULTRA_HIGH as PartMediaResolutionLevel;
    default:
      return PART_MEDIA_RESOLUTION_LEVEL.MEDIA_RESOLUTION_UNSPECIFIED as PartMediaResolutionLevel;
  }
};

export const buildContentParts = async (
  text: string, 
  files?: UploadedFile[],
  modelId?: string,
  mediaResolution?: MediaResolution,
  preferCodeExecutionFileInputs: boolean = false
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
    const isTextLike = isTextFile(file);

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
        const urlSource = file.dataUrl;
        
        if (isTextLike) {
            if (preferCodeExecutionFileInputs) {
                let base64DataForApi: string | undefined;

                if (fileSource && fileSource instanceof Blob) {
                    try {
                        base64DataForApi = await blobToBase64(fileSource);
                    } catch (error) {
                        logService.error(`Failed to convert text file to base64 for ${file.name}`, { error });
                    }
                } else if (urlSource) {
                    try {
                        const response = await fetch(urlSource);
                        const blob = await response.blob();
                        base64DataForApi = await blobToBase64(blob);

                        if (!newFile.rawFile) {
                            newFile.rawFile = new File([blob], file.name, { type: file.type || 'text/plain' });
                        }
                    } catch (error) {
                        logService.error(`Failed to fetch text blob and convert to base64 for ${file.name}`, { error });
                    }
                }

                if (base64DataForApi) {
                    part = {
                        inlineData: {
                            mimeType: file.type || 'text/plain',
                            data: base64DataForApi,
                        },
                    };
                }
            }

            if (!part) {
                // Special handling for text/code: Read content and wrap in text part
                let textContent = '';
                if (fileSource && (fileSource instanceof File || fileSource instanceof Blob)) {
                    // If it's a File/Blob, read directly
                    textContent = await fileToString(fileSource as File);
                } else if (urlSource) {
                    // Fallback: Fetch from URL if rawFile is missing
                    const response = await fetch(urlSource);
                    textContent = await response.text();
                }
                if (textContent) {
                    // Format as a pseudo-file block for the model
                    part = { text: `\n--- START OF FILE ${file.name} ---\n${textContent}\n--- END OF FILE ${file.name} ---\n` };
                }
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
                
                // Prioritize rawFile (Blob/File) for conversion
                if (fileSource && fileSource instanceof Blob) {
                    try {
                        base64DataForApi = await blobToBase64(fileSource);
                    } catch (error) {
                        logService.error(`Failed to convert rawFile to base64 for ${file.name}`, { error });
                    }
                } else if (urlSource) {
                    // Fallback: Fetch the blob from the URL (blob: or data:)
                    try {
                        const response = await fetch(urlSource);
                        const blob = await response.blob();
                        base64DataForApi = await blobToBase64(blob);
                        
                        // Self-repair: If we had to fetch because rawFile was missing, recreate it
                        if (!newFile.rawFile) {
                             newFile.rawFile = new File([blob], file.name, { type: file.type });
                        }
                    } catch (error) {
                        logService.error(`Failed to fetch blob and convert to base64 for ${file.name}`, { error });
                    }
                }
                
                if (base64DataForApi) {
                    part = { inlineData: { mimeType: file.type, data: base64DataForApi } };
                }
            } else {
                // Fallback for unsupported binary types
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
      const shouldInject = (part.fileData && !isYoutube) || (part.inlineData && !isTextLike);
      if (shouldInject) {
            part.mediaResolution = { level: toPartMediaResolutionLevel(effectiveResolution) };
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
    stripThinking: boolean = false,
    modelId?: string,
    preferCodeExecutionFileInputs: boolean = false
): Promise<ChatHistoryItem[]> => {
    const historyItems: ChatHistoryItem[] = [];
    
    for (const msg of msgs) {
        if (msg.excludeFromContext) continue;
        if (msg.role !== 'user' && msg.role !== 'model') continue;

        const apiParts = msg.role === 'model' ? msg.apiParts : undefined;
        const hasApiParts = !!apiParts && apiParts.length > 0;
        const parts: ContentPart[] = hasApiParts
            ? await (async () => {
                const generatedFiles = [...(msg.files || [])];
                const hasCodeExecutionArtifacts = apiParts.some(
                    (part) => Boolean(part.executableCode || part.codeExecutionResult)
                );

                const takeGeneratedFile = (mimeType?: string) => {
                    if (generatedFiles.length === 0) return undefined;
                    if (!mimeType) return generatedFiles.shift();

                    const matchingIndex = generatedFiles.findIndex((file) => file.type === mimeType);
                    if (matchingIndex === -1) return generatedFiles.shift();
                    const [file] = generatedFiles.splice(matchingIndex, 1);
                    return file;
                };

                return Promise.all(
                    apiParts
                        .filter(p => !(stripThinking && p.thought))
                        .map(async (p) => {
                            const partCopy = JSON.parse(JSON.stringify(p));

                            if (partCopy.inlineData) {
                                const mimeType = partCopy.inlineData.mimeType || 'unknown';
                                const canRehydrateGeneratedMedia =
                                    hasCodeExecutionArtifacts && mimeType.startsWith('image/');
                                const generatedFile = canRehydrateGeneratedMedia ? takeGeneratedFile(mimeType) : undefined;

                                if (generatedFile?.rawFile instanceof Blob) {
                                    try {
                                        return {
                                            ...partCopy,
                                            inlineData: {
                                                ...partCopy.inlineData,
                                                data: await blobToBase64(generatedFile.rawFile),
                                            },
                                        };
                                    } catch (error) {
                                        logService.error(`Failed to rehydrate generated media for history: ${generatedFile.name}`, { error });
                                    }
                                }

                                return {
                                    text: `[System Note: The model previously generated a media file of type '${mimeType}'. Content omitted from history to preserve memory and context window.]`
                                };
                            }
                            return partCopy;
                        })
                );
            })()
            : await (async () => {
                let contentToUse = msg.content;
                if (stripThinking) {
                    // Remove <thinking> blocks including tags from the content
                    contentToUse = contentToUse.replace(/<thinking>[\s\S]*?<\/[^>]+>/gi, '').trim();
                }
                const { contentParts } = await buildContentParts(
                    contentToUse,
                    msg.files,
                    modelId,
                    undefined,
                    preferCodeExecutionFileInputs
                );
                return contentParts;
            })();

        // Fallback for older sessions that only stored a flat list of signatures.
        if (!hasApiParts && msg.role === 'model' && msg.thoughtSignatures && msg.thoughtSignatures.length > 0 && parts.length > 0) {
            parts[parts.length - 1].thoughtSignature = msg.thoughtSignatures[msg.thoughtSignatures.length - 1];
        }

        const role = msg.role as 'user' | 'model';

        // Merge consecutive messages of the same role to prevent API 400 errors
        const lastHistoryItem = historyItems[historyItems.length - 1];
        if (lastHistoryItem && lastHistoryItem.role === role) {
            lastHistoryItem.parts = lastHistoryItem.parts.concat(parts);
        } else {
            historyItems.push({ role, parts });
        }
    }
    
    return historyItems;
};
