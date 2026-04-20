import type { File as GeminiFile } from "@google/genai";
import { DEFAULT_GEMINI_API_VERSION } from '../../utils/apiProxyUrl';
import { getConfiguredApiBaseUrl, getConfiguredApiClient } from './baseApi';
import { logService } from "../logService";

const ABORT_ERROR_MESSAGE = "Upload cancelled by user.";

const createAbortError = () => {
    const abortError = new Error(ABORT_ERROR_MESSAGE);
    abortError.name = "AbortError";
    return abortError;
};

const normalizeUploadResult = (payload: unknown): GeminiFile => {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Unexpected upload response payload.');
    }

    const typedPayload = payload as { file?: GeminiFile };
    return typedPayload.file ?? (payload as GeminiFile);
};

const startResumableUploadSession = async (
    apiKey: string,
    file: File,
    mimeType: string,
    displayName: string,
    signal: AbortSignal,
): Promise<string> => {
    const baseUrl = await getConfiguredApiBaseUrl();
    const response = await fetch(`${baseUrl}/upload/${DEFAULT_GEMINI_API_VERSION}/files?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        signal,
        headers: {
            'X-Goog-Upload-Protocol': 'resumable',
            'X-Goog-Upload-Command': 'start',
            'X-Goog-Upload-Header-Content-Length': `${file.size}`,
            'X-Goog-Upload-Header-Content-Type': mimeType,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            file: {
                display_name: displayName,
            },
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to start upload session (${response.status}).`);
    }

    const uploadUrl = response.headers.get('X-Goog-Upload-URL');
    if (!uploadUrl) {
        throw new Error('Upload session did not return a resumable upload URL.');
    }

    return uploadUrl;
};

const uploadFileBytes = (
    uploadUrl: string,
    file: File,
    signal: AbortSignal,
    onProgress?: (loaded: number, total: number) => void,
): Promise<GeminiFile> => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        const cleanup = () => {
            signal.removeEventListener('abort', handleAbortSignal);
        };

        const rejectAbort = () => {
            cleanup();
            reject(createAbortError());
        };

        const handleAbortSignal = () => {
            xhr.abort();
        };

        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('X-Goog-Upload-Offset', '0');
        xhr.setRequestHeader('X-Goog-Upload-Command', 'upload, finalize');

        xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable || !onProgress) {
                return;
            }
            onProgress(event.loaded, event.total);
        };

        xhr.onload = () => {
            cleanup();

            if (xhr.status < 200 || xhr.status >= 300) {
                reject(new Error(`File upload failed (${xhr.status}).`));
                return;
            }

            try {
                const payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
                resolve(normalizeUploadResult(payload));
            } catch (error) {
                reject(error instanceof Error ? error : new Error(String(error)));
            }
        };

        xhr.onerror = () => {
            cleanup();
            reject(new Error('File upload failed due to a network error.'));
        };

        xhr.onabort = rejectAbort;

        if (signal.aborted) {
            rejectAbort();
            return;
        }

        signal.addEventListener('abort', handleAbortSignal, { once: true });
        xhr.send(file);
    });
};

/**
 * Uploads a file using the Gemini resumable Files API so the browser can emit
 * real byte-level upload progress updates.
 */
export const uploadFileApi = async (
    apiKey: string, 
    file: File, 
    mimeType: string, 
    displayName: string, 
    signal: AbortSignal,
    onProgress?: (loaded: number, total: number) => void
): Promise<GeminiFile> => {
    logService.info(`Uploading file (resumable): ${displayName}`, { mimeType, size: file.size });
    
    if (signal.aborted) {
        throw createAbortError();
    }

    try {
        const uploadUrl = await startResumableUploadSession(apiKey, file, mimeType, displayName, signal);
        return await uploadFileBytes(uploadUrl, file, signal, onProgress);
    } catch (error) {
        logService.error(`Failed to upload file "${displayName}" to Gemini API:`, error);
        
        // If it's an abort, ensure we throw a specific error for UI handling
        if (signal.aborted) {
            throw createAbortError();
        }
        
        throw error;
    }
};

export const getFileMetadataApi = async (apiKey: string, fileApiName: string): Promise<GeminiFile | null> => {
    if (!fileApiName || !fileApiName.startsWith('files/')) {
        logService.error(`Invalid fileApiName format: ${fileApiName}. Must start with "files/".`);
        throw new Error('Invalid file ID format. Expected "files/your_file_id".');
    }
    try {
        logService.info(`Fetching metadata for file: ${fileApiName}`);
        const ai = await getConfiguredApiClient(apiKey);
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
