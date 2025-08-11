import { File as GeminiFile, UploadFileConfig } from "@google/genai";
import { getApiClient } from './baseApi';
import { logService } from "../logService";
import { APP_SETTINGS_KEY } from "../../constants/appConstants";

/**
 * 上传文件到 Gemini Files API
 */
export const uploadFileApi = async (
  apiKey: string,
  file: File,
  mimeType: string,
  displayName: string,
  signal: AbortSignal
): Promise<GeminiFile> => {
  logService.info(`Uploading file: ${displayName}`, { mimeType, size: file.size });

  // ✅ 正确读取 app 设置（chatAppSettings），拿到 apiProxyUrl
  const storedSettings = localStorage.getItem(APP_SETTINGS_KEY);
  const apiProxyUrl = storedSettings ? JSON.parse(storedSettings).apiProxyUrl : null;

  const ai = getApiClient(apiKey, apiProxyUrl);

  if (signal.aborted) {
    logService.warn(`Upload for "${displayName}" cancelled before starting.`);
    const abortError = new Error("Upload cancelled by user.");
    (abortError as any).name = "AbortError";
    throw abortError;
  }

  try {
    const uploadConfig: UploadFileConfig = { mimeType, displayName };
    const uploadedFile = await ai.files.upload({ file, config: uploadConfig });
    return uploadedFile;
  } catch (error) {
    logService.error(`Failed to upload file "${displayName}" to Gemini API:`, error);
    throw error;
  }
};

/**
 * 按 ID 获取文件元数据（files/xxx）
 */
export const getFileMetadataApi = async (apiKey: string, fileApiName: string): Promise<GeminiFile | null> => {
  const storedSettings = localStorage.getItem(APP_SETTINGS_KEY); // ✅ 用统一 key
  const apiProxyUrl = storedSettings ? JSON.parse(storedSettings).apiProxyUrl : null;
  const ai = getApiClient(apiKey, apiProxyUrl);

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
      return null;
    }
    throw error;
  }
};
