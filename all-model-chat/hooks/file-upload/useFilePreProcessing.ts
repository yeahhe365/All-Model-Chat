import { useCallback, Dispatch, SetStateAction } from 'react';
import { AppSettings, UploadedFile } from '../../types';
import { generateUniqueId, logService, fileToString } from '../../utils/appUtils';
import { generateZipContext } from '../../utils/folderImportUtils';
import { compressAudioToMp3 } from '../../utils/audioCompression';
import { SUPPORTED_TEXT_MIME_TYPES, TEXT_BASED_EXTENSIONS } from '../../constants/fileConstants';

interface UseFilePreProcessingProps {
    appSettings: AppSettings;
    setSelectedFiles: Dispatch<SetStateAction<UploadedFile[]>>;
}

export const useFilePreProcessing = ({ appSettings, setSelectedFiles }: UseFilePreProcessingProps) => {
    const processFiles = useCallback(async (files: FileList | File[]): Promise<File[]> => {
        const rawFilesArray = Array.isArray(files) ? files : Array.from(files);
        const processedFiles: File[] = [];

        for (const file of rawFilesArray) {
            const fileNameLower = file.name.toLowerCase();
            const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
            
            // Expanded audio detection
            const isAudio = file.type.startsWith('audio/') || 
                ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac', '.webm', '.wma', '.aiff'].some(ext => fileNameLower.endsWith(ext));
            
            const isText = SUPPORTED_TEXT_MIME_TYPES.includes(file.type) || TEXT_BASED_EXTENSIONS.includes(fileExtension) || file.type === 'text/plain';

            if (fileNameLower.endsWith('.zip')) {
                const tempId = generateUniqueId();
                setSelectedFiles(prev => [...prev, {
                    id: tempId,
                    name: `Processing ${file.name}...`,
                    type: 'application/zip',
                    size: file.size,
                    isProcessing: true,
                    uploadState: 'pending'
                }]);

                try {
                    logService.info(`Auto-converting ZIP file: ${file.name}`);
                    const contextFile = await generateZipContext(file);
                    processedFiles.push(contextFile);
                } catch (error) {
                    logService.error(`Failed to auto-convert zip file ${file.name}`, { error });
                    processedFiles.push(file);
                } finally {
                    setSelectedFiles(prev => prev.filter(f => f.id !== tempId));
                }
            } else if (isAudio) {
                if (appSettings.isAudioCompressionEnabled) {
                    const tempId = generateUniqueId();
                    const abortController = new AbortController();

                    setSelectedFiles(prev => [...prev, {
                        id: tempId,
                        name: `Compressing ${file.name}...`,
                        type: file.type || 'audio/mpeg',
                        size: file.size,
                        isProcessing: true,
                        uploadState: 'pending',
                        abortController: abortController
                    }]);

                    try {
                        logService.info(`Compressing audio file: ${file.name}`);
                        const compressedFile = await compressAudioToMp3(file, abortController.signal);
                        processedFiles.push(compressedFile);
                    } catch (error) {
                        const isAbort = (error instanceof Error || error instanceof DOMException) && error.name === 'AbortError';
                        if (isAbort) {
                             logService.info(`Compression cancelled for ${file.name}`);
                        } else {
                            logService.error(`Failed to compress audio file ${file.name}`, { error });
                            processedFiles.push(file); 
                        }
                    } finally {
                        setSelectedFiles(prev => prev.filter(f => f.id !== tempId));
                    }
                } else {
                    processedFiles.push(file);
                }
            } else if (isText) {
                // Ensure text files have their content read early for editing support
                // We don't block the UI here, but we ensure it's available.
                // Note: useFileUpload will also handle reading this if it's sent inline.
                processedFiles.push(file);
            } else {
                processedFiles.push(file);
            }
        }
        
        return processedFiles;
    }, [appSettings.isAudioCompressionEnabled, setSelectedFiles]);

    return { processFiles };
};