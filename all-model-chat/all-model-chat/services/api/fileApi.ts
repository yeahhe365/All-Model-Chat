import { File as GeminiFile, UploadFileConfig } from "@google/genai";
import { getApiClient, POLLING_INTERVAL_MS, MAX_POLLING_DURATION_MS } from './baseApi';
import { logService } from "../logService";

export const uploadFileApi = async (apiKey: string, file: File, mimeType: string, displayName: string, signal: AbortSignal): Promise<GeminiFile> => {
    logService.info(`Uploading file: ${displayName}`, { mimeType, size: file.size });
    const ai = getApiClient(apiKey);
    if (signal.aborted) {
        logService.warn(`Upload for "${displayName}" cancelled before starting.`);
        const abortError = new Error("Upload cancelled by user.");
        abortError.name = "AbortError";
        throw abortError;
    }

    try {
        const uploadConfig: UploadFileConfig = { mimeType, displayName };
        
        const uploadedFile = await ai.files.upload({
            file: file,
            config: uploadConfig,
        });
        
        // Polling logic has been removed from this service function
        // and is now handled at the application/hook level to give
        // the UI more control over the file state.
        return uploadedFile;

    } catch (error) {
        logService.error(`Failed to upload file "${displayName}" to Gemini API:`, error);
        throw error;
    }
};

export const getFileMetadataApi = async (apiKey: string, fileApiName: string): Promise<GeminiFile | null> => {
    const ai = getApiClient(apiKey);
    if (!fileApiName || !fileApiName.startsWith('files/')) {
        logService.error(`Invalid fileApiName format: ${fileApiName}. Must start with "files/".`);
        throw new Error('Invalid file ID format. Expected "files/your_file_id".');
    }
    try {
        logService.info(`Fetching metadata for file: ${fileApiName}`);
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
