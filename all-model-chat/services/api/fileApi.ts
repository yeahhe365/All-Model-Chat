
import { File as GeminiFile } from "@google/genai";
import { getApiClient } from './baseApi';
import { logService } from "../logService";

export const uploadFileApi = async (
    apiKey: string, 
    file: File, 
    mimeType: string, 
    displayName: string, 
    signal: AbortSignal,
    baseUrl?: string,
    onProgress?: (loaded: number, total: number) => void
): Promise<GeminiFile> => {
    logService.info(`Uploading file (SDK): ${displayName}`, { mimeType, size: file.size });
    
    if (signal.aborted) {
        const abortError = new Error("Upload cancelled by user.");
        abortError.name = "AbortError";
        throw abortError;
    }

    try {
        const ai = getApiClient(apiKey, baseUrl);

        // Use official SDK for upload, which is more stable for Auth and CORS
        const uploadResult = await ai.files.upload({
            file: file,
            config: {
                displayName: displayName,
                mimeType: mimeType,
            },
        });

        // Since SDK doesn't provide progress, call 100% on completion to satisfy UI
        if (onProgress) {
            onProgress(file.size, file.size);
        }

        return uploadResult;

    } catch (error) {
        logService.error(`Failed to upload file "${displayName}" to Gemini API:`, error);
        
        if (signal.aborted) {
            const abortError = new Error("Upload cancelled by user.");
            abortError.name = "AbortError";
            throw abortError;
        }
        
        throw error;
    }
};

export const getFileMetadataApi = async (apiKey: string, fileApiName: string, baseUrl?: string): Promise<GeminiFile | null> => {
    if (!fileApiName || !fileApiName.startsWith('files/')) {
        logService.error(`Invalid fileApiName format: ${fileApiName}. Must start with "files/".`);
        throw new Error('Invalid file ID format. Expected "files/your_file_id".');
    }
    try {
        logService.info(`Fetching metadata for file: ${fileApiName}`);
        const ai = getApiClient(apiKey, baseUrl);
        const file = await ai.files.get({ name: fileApiName });
        return file;
    } catch (error) {
        logService.error(`Failed to get metadata for file "${fileApiName}" from Gemini API:`, error);
        if (error instanceof Error && (error.message.includes('NOT_FOUND') || error.message.includes('404'))) {
            return null; // File not found is a valid outcome we want to handle
        }
        throw error; // Re-throw other errors
    }
};
