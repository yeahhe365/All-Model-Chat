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
        
        let uploadedFile = await ai.files.upload({
            file: file,
            config: uploadConfig,
        });

        const startTime = Date.now();
        while (uploadedFile.state === 'PROCESSING' && (Date.now() - startTime) < MAX_POLLING_DURATION_MS) {
            if (signal.aborted) {
                logService.warn(`Polling for "${displayName}" cancelled by user.`);
                const abortError = new Error("Upload polling cancelled by user.");
                abortError.name = "AbortError";
                throw abortError;
            }
            logService.debug(`File "${displayName}" is PROCESSING. Polling again in ${POLLING_INTERVAL_MS / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));
            
            if (signal.aborted) { // Check again after timeout
                 const abortError = new Error("Upload polling cancelled by user after timeout.");
                 abortError.name = "AbortError";
                 throw abortError;
            }

            try {
                uploadedFile = await ai.files.get({ name: uploadedFile.name });
            } catch (pollError) {
                logService.error(`Error polling for file status "${displayName}":`, pollError);
                throw new Error(`Polling failed for file ${displayName}. Original error: ${pollError instanceof Error ? pollError.message : String(pollError)}`);
            }
        }

        if (uploadedFile.state === 'PROCESSING') {
            logService.warn(`File "${displayName}" is still PROCESSING after ${MAX_POLLING_DURATION_MS / 1000}s. Returning current state.`);
        }
        
        return uploadedFile;
    } catch (error) {
        logService.error(`Failed to upload and process file "${displayName}" to Gemini API:`, error);
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
