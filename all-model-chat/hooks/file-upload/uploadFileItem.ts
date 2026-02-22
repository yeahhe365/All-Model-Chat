import React from 'react';
import { UploadedFile, MediaResolution } from '../../types';
import { ALL_SUPPORTED_MIME_TYPES } from '../../constants/fileConstants';
import { generateUniqueId, fileToBlobUrl, logService } from '../../utils/appUtils';
import { geminiServiceInstance } from '../../services/geminiService';
import { formatSpeed, getEffectiveMimeType, shouldUseFileApi } from './utils';

interface UploadFileItemParams {
    file: File;
    keyToUse: string | null;
    defaultResolution: MediaResolution | undefined;
    appSettings: any; 
    setSelectedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
    uploadStatsRef: React.MutableRefObject<Map<string, { lastLoaded: number; lastTime: number }>>;
}

export const uploadFileItem = async ({
    file,
    keyToUse,
    defaultResolution,
    appSettings,
    setSelectedFiles,
    uploadStatsRef
}: UploadFileItemParams) => {
    const fileId = generateUniqueId();
    const effectiveMimeType = getEffectiveMimeType(file);

    if (!ALL_SUPPORTED_MIME_TYPES.includes(effectiveMimeType)) {
        logService.warn(`Unsupported file type skipped: ${file.name}`, { type: file.type, effectiveType: effectiveMimeType });
        setSelectedFiles(prev => [...prev, { id: fileId, name: file.name, type: file.type || 'unknown', size: file.size, isProcessing: false, progress: 0, error: `Unsupported file type: ${file.name}`, uploadState: 'failed' }]);
        return;
    }

    const shouldUploadFile = shouldUseFileApi(file, appSettings);
    
    // Generate a blob URL immediately for local preview, regardless of upload method
    const dataUrl = fileToBlobUrl(file);

    if (shouldUploadFile) {
        if (!keyToUse) {
            const errorMsg = 'API key was not available for file upload.';
            logService.error(errorMsg);
            if (dataUrl.startsWith('blob:')) URL.revokeObjectURL(dataUrl);
            setSelectedFiles(prev => [...prev, { id: fileId, name: file.name, type: effectiveMimeType, size: file.size, isProcessing: false, progress: 0, error: errorMsg, uploadState: 'failed' }]);
            return;
        }
        const controller = new AbortController();

        const initialFileState: UploadedFile = { 
            id: fileId, 
            name: file.name, 
            type: effectiveMimeType, 
            size: file.size, 
            isProcessing: true, 
            progress: 0, 
            rawFile: file, 
            dataUrl: dataUrl, 
            uploadState: 'uploading', 
            abortController: controller,
            uploadSpeed: 'Starting...',
            mediaResolution: defaultResolution
        };
        
        uploadStatsRef.current.set(fileId, { lastLoaded: 0, lastTime: Date.now() });
        
        setSelectedFiles(prev => [...prev, initialFileState]);

        const handleProgress = (loaded: number, total: number) => {
            const now = Date.now();
            const stats = uploadStatsRef.current.get(fileId);
            
            let speedStr = '';
            if (stats) {
                const timeDiff = now - stats.lastTime;
                if (timeDiff > 500) {
                    const bytesDiff = loaded - stats.lastLoaded;
                    const speed = bytesDiff / (timeDiff / 1000); 
                    speedStr = formatSpeed(speed);
                    uploadStatsRef.current.set(fileId, { lastLoaded: loaded, lastTime: now });
                }
            }

            const percent = Math.round((loaded / total) * 100);
            
            setSelectedFiles(prev => prev.map(f => {
                if (f.id === fileId) {
                    return { 
                        ...f, 
                        progress: percent, 
                        uploadSpeed: speedStr || f.uploadSpeed 
                    };
                }
                return f;
            }));
        };

        try {
            const uploadedFileInfo = await geminiServiceInstance.uploadFile(
                keyToUse, 
                file, 
                effectiveMimeType, 
                file.name, 
                controller.signal,
                handleProgress 
            );
            
            logService.info(`File uploaded, initial state: ${uploadedFileInfo.state}`, { fileInfo: uploadedFileInfo });

            const uploadState = uploadedFileInfo.state === 'ACTIVE'
                ? 'active'
                : (uploadedFileInfo.state === 'PROCESSING' ? 'processing_api' : 'failed');

            setSelectedFiles(prev => prev.map(f => f.id === fileId ? {
                ...f,
                isProcessing: uploadState === 'processing_api', 
                progress: 100,
                fileUri: uploadedFileInfo.uri,
                fileApiName: uploadedFileInfo.name,
                // MEMORY OPTIMIZATION: File is in Google Cloud now. Free local memory!
                rawFile: undefined, 
                uploadState: uploadState,
                error: uploadedFileInfo.state === 'FAILED' ? 'File API processing failed' : (f.error || undefined),
                abortController: undefined,
                uploadSpeed: undefined, 
            } : f));

        } catch (uploadError) {
            let errorMsg = `Upload failed: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`;
            let uploadStateUpdate: UploadedFile['uploadState'] = 'failed';
            
            if (uploadError instanceof Error && uploadError.name === 'AbortError') {
                errorMsg = "Upload cancelled by user.";
                uploadStateUpdate = 'cancelled';
                logService.warn(`File upload cancelled by user: ${file.name}`);
            } else {
                logService.error(`File upload failed for ${file.name}`, { error: uploadError });
            }

            if (dataUrl.startsWith('blob:')) {
                URL.revokeObjectURL(dataUrl);
            }

            setSelectedFiles(prev => prev.map(f => f.id === fileId ? { 
                ...f, 
                isProcessing: false, 
                error: errorMsg, 
                uploadState: uploadStateUpdate, 
                abortController: undefined, 
                uploadSpeed: undefined,
                dataUrl: undefined, 
                rawFile: undefined  
            } : f));
        } finally {
            uploadStatsRef.current.delete(fileId);
        }
    } else {
        // Inline processing
        const initialFileState: UploadedFile = { 
            id: fileId, 
            name: file.name, 
            type: effectiveMimeType, 
            size: file.size, 
            isProcessing: true, 
            progress: 0, 
            uploadState: 'pending', 
            rawFile: file, 
            dataUrl: dataUrl,
            mediaResolution: defaultResolution
        };
        setSelectedFiles(prev => [...prev, initialFileState]);

        setSelectedFiles(p => p.map(f => f.id === fileId ? { ...f, isProcessing: false, progress: 100, uploadState: 'active' } : f));
    }
};