
import { File as GeminiFile } from "@google/genai";
import { getConfiguredApiClient } from './baseApi';
import { logService } from "../logService";
import { dbService } from "../../utils/db";

/**
 * Uploads a file using the Google Resumable Upload Protocol via XHR.
 * This allows for real-time progress tracking, unlike the SDK's abstraction.
 */
export const uploadFileApi = async (
    apiKey: string, 
    file: File, 
    mimeType: string, 
    displayName: string, 
    signal: AbortSignal,
    onProgress?: (loaded: number, total: number) => void
): Promise<GeminiFile> => {
    logService.info(`Uploading file (XHR): ${displayName}`, { mimeType, size: file.size });
    
    if (signal.aborted) {
        const abortError = new Error("Upload cancelled by user.");
        abortError.name = "AbortError";
        throw abortError;
    }

    // 1. Determine Base URL (Respect Proxy Settings)
    let baseUrl = 'https://generativelanguage.googleapis.com';
    try {
        const settings = await dbService.getAppSettings();
        if (settings?.useCustomApiConfig && settings?.useApiProxy && settings?.apiProxyUrl) {
            baseUrl = settings.apiProxyUrl.replace(/\/+$/, ''); // Remove trailing slash
            // If proxy url ends in /v1beta, strip it to append /upload/v1beta correctly if needed
            // Or assume proxy serves as direct base. 
            // Standard generic handling:
            if (baseUrl.endsWith('/v1beta')) {
                baseUrl = baseUrl.substring(0, baseUrl.length - 7);
            }
        }
    } catch (e) {
        // Fallback to default
    }

    const uploadUrl = `${baseUrl}/upload/v1beta/files?key=${apiKey}`;

    // 2. Start Resumable Upload Session
    return new Promise((resolve, reject) => {
        const xhrStart = new XMLHttpRequest();
        xhrStart.open('POST', uploadUrl, true);
        
        xhrStart.setRequestHeader('X-Goog-Upload-Protocol', 'resumable');
        xhrStart.setRequestHeader('X-Goog-Upload-Command', 'start');
        xhrStart.setRequestHeader('X-Goog-Upload-Header-Content-Length', file.size.toString());
        xhrStart.setRequestHeader('X-Goog-Upload-Header-Content-Type', mimeType);
        xhrStart.setRequestHeader('Content-Type', 'application/json');

        // Handle cancellation
        signal.addEventListener('abort', () => {
            xhrStart.abort();
            const err = new Error("Upload cancelled by user.");
            err.name = "AbortError";
            reject(err);
        });

        xhrStart.onload = () => {
            if (xhrStart.status === 200) {
                const sessionUri = xhrStart.getResponseHeader('x-goog-upload-url');
                if (!sessionUri) {
                    reject(new Error("Failed to retrieve upload session URL."));
                    return;
                }
                
                // 3. Perform Actual Upload
                const xhrUpload = new XMLHttpRequest();
                xhrUpload.open('PUT', sessionUri, true);
                
                // Headers for the chunk (whole file in one go here)
                xhrUpload.setRequestHeader('Content-Length', file.size.toString());
                xhrUpload.setRequestHeader('X-Goog-Upload-Offset', '0');
                xhrUpload.setRequestHeader('X-Goog-Upload-Command', 'upload, finalize');
                
                // Track Progress
                if (xhrUpload.upload && onProgress) {
                    xhrUpload.upload.onprogress = (e) => {
                        if (e.lengthComputable) {
                            onProgress(e.loaded, e.total);
                        }
                    };
                }

                // Handle cancellation for the data phase
                signal.addEventListener('abort', () => {
                    xhrUpload.abort();
                    const err = new Error("Upload cancelled by user.");
                    err.name = "AbortError";
                    reject(err);
                });

                xhrUpload.onload = () => {
                    if (xhrUpload.status === 200) {
                        try {
                            const responseData = JSON.parse(xhrUpload.responseText);
                            const uploadedFile = responseData.file;
                            if (uploadedFile) {
                                resolve(uploadedFile as GeminiFile);
                            } else {
                                reject(new Error("Upload completed but returned invalid file metadata."));
                            }
                        } catch (e) {
                            reject(new Error("Failed to parse upload response JSON."));
                        }
                    } else {
                        reject(new Error(`Upload failed with status ${xhrUpload.status}: ${xhrUpload.responseText}`));
                    }
                };

                xhrUpload.onerror = () => reject(new Error("Network error during file data transfer."));
                
                xhrUpload.send(file);

            } else {
                reject(new Error(`Failed to initiate upload session (Status ${xhrStart.status}): ${xhrStart.responseText}`));
            }
        };

        xhrStart.onerror = () => reject(new Error("Network error during upload initialization."));
        
        // Send metadata to start session
        xhrStart.send(JSON.stringify({ file: { displayName: displayName } }));
    });
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
