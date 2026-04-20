import type { File as GeminiFile } from "@google/genai";
import { getConfiguredApiBaseUrl, getConfiguredApiClient, getConfiguredProxyBaseUrl } from './baseApi';
import { logService } from "../logService";

const ABORT_ERROR_MESSAGE = "Upload cancelled by user.";
const MAX_UPLOAD_CHUNK_SIZE = 8 * 1024 * 1024;

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

const buildProxiedUploadUrl = (uploadUrl: string, proxyBaseUrl: string): string => {
    const originalUploadUrl = new URL(uploadUrl);
    const fallbackOrigin = typeof window !== 'undefined'
        ? window.location.origin
        : ((globalThis as { location?: { origin?: string } }).location?.origin ?? originalUploadUrl.origin);
    const proxyUrl = new URL(proxyBaseUrl, fallbackOrigin);
    const proxyPathPrefix = proxyUrl.pathname.replace(/\/+$/, '');

    originalUploadUrl.protocol = proxyUrl.protocol;
    originalUploadUrl.host = proxyUrl.host;
    originalUploadUrl.port = proxyUrl.port;

    if (proxyPathPrefix && proxyPathPrefix !== '/') {
        originalUploadUrl.pathname = `${proxyPathPrefix}/${originalUploadUrl.pathname.replace(/^\/+/, '')}`;
    }

    return originalUploadUrl.toString();
};

type HttpResponseLike = {
    headers: Record<string, string>;
    json: () => Promise<unknown>;
};

type InternalApiClientLike = {
    request: (request: {
        path: string;
        body?: string | Blob;
        httpMethod: 'POST';
        httpOptions?: {
            apiVersion?: string;
            baseUrl?: string;
            headers?: Record<string, string>;
        };
        abortSignal?: AbortSignal;
    }) => Promise<HttpResponseLike>;
};

const startResumableUploadSession = async (
    apiClient: InternalApiClientLike,
    file: File,
    mimeType: string,
    displayName: string,
    signal: AbortSignal,
): Promise<string> => {
    const baseUrl = await getConfiguredApiBaseUrl();
    const response = await apiClient.request({
        path: 'upload/v1beta/files',
        body: JSON.stringify({
            file: {
                displayName,
                mimeType,
                sizeBytes: String(file.size),
            },
        }),
        httpMethod: 'POST',
        httpOptions: {
            apiVersion: '',
            baseUrl,
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Upload-Protocol': 'resumable',
                'X-Goog-Upload-Command': 'start',
                'X-Goog-Upload-Header-Content-Length': `${file.size}`,
                'X-Goog-Upload-Header-Content-Type': mimeType,
            },
        },
        abortSignal: signal,
    });

    const uploadUrl = response.headers['x-goog-upload-url'];
    if (!uploadUrl) {
        throw new Error('Upload session did not return a resumable upload URL.');
    }

    return uploadUrl;
};

const uploadFileBytes = async (
    apiClient: InternalApiClientLike,
    uploadUrl: string,
    file: File,
    signal: AbortSignal,
    proxyBaseUrl: string | null,
    onProgress?: (loaded: number, total: number) => void,
): Promise<GeminiFile> => {
    const finalUploadUrl = proxyBaseUrl
        ? buildProxiedUploadUrl(uploadUrl, proxyBaseUrl)
        : uploadUrl;

    let offset = 0;

    while (offset < file.size) {
        const chunkSize = Math.min(MAX_UPLOAD_CHUNK_SIZE, file.size - offset);
        const chunk = file.slice(offset, offset + chunkSize);
        const uploadCommand = offset + chunkSize >= file.size ? 'upload, finalize' : 'upload';

        while (true) {
            if (signal.aborted) {
                throw createAbortError();
            }

            const response = await apiClient.request({
                path: '',
                body: chunk,
                httpMethod: 'POST',
                httpOptions: {
                    apiVersion: '',
                    baseUrl: finalUploadUrl,
                    headers: {
                        'X-Goog-Upload-Offset': String(offset),
                        'X-Goog-Upload-Command': uploadCommand,
                        'Content-Length': String(chunk.size),
                    },
                },
                abortSignal: signal,
            });

            const uploadStatus = response.headers['x-goog-upload-status'] ?? null;
            const payload = await response.json().catch(() => null);
            offset += chunkSize;

            if (onProgress) {
                onProgress(offset, file.size);
            }

            if (uploadStatus !== 'active') {
                return normalizeUploadResult(payload);
            }

            break;
        }
    }

    throw new Error('All content has been uploaded, but the upload status is not finalized.');
};

/**
 * Uploads a file using the Gemini resumable Files API and reports aggregate
 * progress after each completed chunk.
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
        const internalApiClient = (await getConfiguredApiClient(apiKey) as unknown as { apiClient: InternalApiClientLike }).apiClient;
        const uploadUrl = await startResumableUploadSession(internalApiClient, file, mimeType, displayName, signal);
        const proxyBaseUrl = await getConfiguredProxyBaseUrl();
        return await uploadFileBytes(internalApiClient, uploadUrl, file, signal, proxyBaseUrl, onProgress);
    } catch (error) {
        logService.error(`Failed to upload file "${displayName}" to Gemini API:`, error);

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
            return null;
        }
        throw error;
    }
};
