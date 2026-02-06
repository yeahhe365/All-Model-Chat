

import { useCallback, Dispatch, SetStateAction } from 'react';
import { AppSettings, UploadedFile } from '../../types';
import { generateUniqueId, logService, isTextFile } from '../../utils/appUtils';
import { generateZipContext } from '../../utils/folderImportUtils';
import { compressAudioToMp3 } from '../../utils/audioCompression';
import mammoth from 'mammoth';

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
            
            // Expanded audio detection
            const isAudio = file.type.startsWith('audio/') || 
                ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac', '.webm', '.wma', '.aiff'].some(ext => fileNameLower.endsWith(ext));
            
            const isText = isTextFile(file);

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
            } else if (fileNameLower.endsWith('.docx')) {
                const tempId = generateUniqueId();
                setSelectedFiles(prev => [...prev, {
                    id: tempId,
                    name: `Extracting text from ${file.name}...`,
                    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    size: file.size,
                    isProcessing: true,
                    uploadState: 'pending'
                }]);

                try {
                    logService.info(`Extracting text from Word file: ${file.name}`);
                    const arrayBuffer = await file.arrayBuffer();
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    
                    if (result.messages && result.messages.length > 0) {
                        logService.warn("Mammoth extraction warnings:", { messages: result.messages });
                    }

                    const textContent = result.value;
                    const newFileName = file.name.replace(/\.docx$/i, '.txt');
                    const textFile = new File([textContent], newFileName, { type: 'text/plain' });
                    
                    processedFiles.push(textFile);
                } catch (error) {
                    logService.error(`Failed to extract text from docx ${file.name}`, { error });
                    // Fallback: send original file (might fail if not supported by API directly, but safer than crashing)
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