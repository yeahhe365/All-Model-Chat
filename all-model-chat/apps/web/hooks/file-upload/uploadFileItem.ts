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
    appSettings: any; // Using any to avoid circular dep issues with types if strictly typed, but AppSettings is imported in types
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
            setSelectedFiles(prev => [...prev, { id: fileId, name: file.name, type: effectiveMimeType, size: file.size, isProcessing: false, progress: 0, error: errorMsg, uploadState: 'failed' }]);
            return;
        }
        const controller = new AbortController();

        // Initialize with 'uploading' state to show progress UI immediately
        const initialFileState: UploadedFile = { 
            id: fileId, 
            name: file.name, 
            type: effectiveMimeType, 
            size: file.size, 
            isProcessing: true, 
            progress: 0, 
            rawFile: file, 
            dataUrl: dataUrl, // Add local preview URL
            uploadState: 'uploading', 
            abortController: controller,
            uploadSpeed: 'Starting...',
            mediaResolution: defaultResolution
        };
        
        // Initialize tracking for speed calculation
        uploadStatsRef.current.set(fileId, { lastLoaded: 0, lastTime: Date.now() });
        
        setSelectedFiles(prev => [...prev, initialFileState]);

        const handleProgress = (loaded: number, total: number) => {
            const now = Date.now();
            const stats = uploadStatsRef.current.get(fileId);
            
            let speedStr = '';
            if (stats) {
                const timeDiff = now - stats.lastTime;
                // Only update speed every ~500ms to prevent flickering
                if (timeDiff > 500) {
                    const bytesDiff = loaded - stats.lastLoaded;
                    const speed = bytesDiff / (timeDiff / 1000); // Bytes per second
                    speedStr = formatSpeed(speed);
                    
                    // Update stored stats
                    uploadStatsRef.current.set(fileId, { lastLoaded: loaded, lastTime: now });
                }
            }

            const percent = Math.round((loaded / total) * 100);
            
            setSelectedFiles(prev => prev.map(f => {
                if (f.id === fileId) {
                    return { 
                        ...f, 
                        progress: percent, 
                        uploadSpeed: speedStr || f.uploadSpeed // Keep old speed if not updated this tick
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
                handleProgress // Pass progress callback
            );
            
            logService.info(`File uploaded, initial state: ${uploadedFileInfo.state}`, { fileInfo: uploadedFileInfo });

            const uploadState = uploadedFileInfo.state === 'ACTIVE'
                ? 'active'
                : (uploadedFileInfo.state === 'PROCESSING' ? 'processing_api' : 'failed');

            setSelectedFiles(prev => prev.map(f => f.id === fileId ? {
                ...f,
                isProcessing: uploadState === 'processing_api', // Only false if active or failed
                progress: 100,
                fileUri: uploadedFileInfo.uri,
                fileApiName: uploadedFileInfo.name,
                rawFile: file, // Preserve local file reference for preview
                uploadState: uploadState,
                error: uploadedFileInfo.state === 'FAILED' ? 'File API processing failed' : (f.error || undefined),
                abortController: undefined,
                uploadSpeed: undefined, // Clear speed on complete
            } : f));

        } catch (uploadError) {
            let errorMsg = `Upload failed: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`;
            let uploadStateUpdate: UploadedFile['uploadState'] = 'failed';
            if (uploadError instanceof Error && uploadError.name === 'AbortError') {
                errorMsg = "Upload cancelled by user.";
                uploadStateUpdate = 'cancelled';
                logService.warn(`File upload cancelled by user: ${file.name}`);
            }
            logService.error(`File upload failed for ${file.name}`, { error: uploadError });
            setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, isProcessing: false, error: errorMsg, rawFile: undefined, uploadState: uploadStateUpdate, abortController: undefined, uploadSpeed: undefined } : f));
        } finally {
            uploadStatsRef.current.delete(fileId);
        }
    } else {
        // Inline processing (Base64 or Text content)
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

        // Mark active immediately
        setSelectedFiles(p => p.map(f => f.id === fileId ? { ...f, isProcessing: false, progress: 100, uploadState: 'active' } : f));
    }
};
