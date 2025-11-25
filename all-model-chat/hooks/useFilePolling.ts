
import { useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { AppSettings, ChatSettings as IndividualChatSettings, UploadedFile } from '../types';
import { getKeyForRequest } from '../utils/appUtils';
import { geminiServiceInstance } from '../services/geminiService';
import { logService } from '../services/logService';
import { POLLING_INTERVAL_MS, MAX_POLLING_DURATION_MS } from '../services/api/baseApi';

interface UseFilePollingProps {
    appSettings: AppSettings;
    selectedFiles: UploadedFile[];
    setSelectedFiles: Dispatch<SetStateAction<UploadedFile[]>>;
    currentChatSettings: IndividualChatSettings;
}

export const useFilePolling = ({
    appSettings,
    selectedFiles,
    setSelectedFiles,
    currentChatSettings,
}: UseFilePollingProps) => {
    const pollingIntervals = useRef<Map<string, number>>(new Map());

    useEffect(() => {
        const filesCurrentlyPolling = new Set(pollingIntervals.current.keys());
        const filesThatShouldPoll = new Set(
            selectedFiles.filter(f => f.uploadState === 'processing_api' && !f.error).map(f => f.id)
        );

        // Stop polling for files that are no longer in the 'processing_api' state
        for (const fileId of filesCurrentlyPolling) {
            if (!filesThatShouldPoll.has(fileId)) {
                clearInterval(pollingIntervals.current.get(fileId));
                pollingIntervals.current.delete(fileId);
                logService.info(`Stopped polling for file ${fileId} as it is no longer in a processing state.`);
            }
        }

        // Start polling for new files that entered the 'processing_api' state
        for (const fileId of filesThatShouldPoll) {
            if (!filesCurrentlyPolling.has(fileId)) {
                const fileToPoll = selectedFiles.find(f => f.id === fileId);
                if (!fileToPoll || !fileToPoll.fileApiName) continue;

                logService.info(`Starting polling for file ${fileId} (${fileToPoll.fileApiName})`);

                const startTime = Date.now();
                const fileApiName = fileToPoll.fileApiName;

                const poll = async () => {
                    if ((Date.now() - startTime) > MAX_POLLING_DURATION_MS) {
                        logService.error(`Polling timed out for file ${fileApiName}`);
                        setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, error: 'File processing timed out.', uploadState: 'failed', isProcessing: false } : f));
                        return;
                    }

                    // Optimize polling by not rotating keys unnecessarily.
                    // We reuse the current index/key to avoid burning through rotation turns on poll ticks.
                    const keyResult = getKeyForRequest(appSettings, currentChatSettings, { skipIncrement: true });
                    if ('error' in keyResult) {
                        logService.error(`Polling for ${fileApiName} stopped: ${keyResult.error}`);
                        setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, error: keyResult.error, uploadState: 'failed', isProcessing: false } : f));
                        return;
                    }

                    try {
                        const metadata = await geminiServiceInstance.getFileMetadata(keyResult.key, fileApiName);
                        if (metadata?.state === 'ACTIVE') {
                            logService.info(`File ${fileApiName} is now ACTIVE.`);
                            setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, uploadState: 'active', isProcessing: false } : f));
                        } else if (metadata?.state === 'FAILED') {
                            logService.error(`File ${fileApiName} processing FAILED on backend.`);
                            setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, error: 'Backend processing failed.', uploadState: 'failed', isProcessing: false } : f));
                        }
                    } catch (error) {
                        logService.warn(`Polling for ${fileApiName} failed with a key, will retry.`, { error });
                    }
                };

                const intervalId = window.setInterval(poll, POLLING_INTERVAL_MS);
                pollingIntervals.current.set(fileId, intervalId);
                poll(); // Run immediately once
            }
        }

        // Cleanup on unmount
        return () => {
            pollingIntervals.current.forEach(intervalId => clearInterval(intervalId));
        };
    }, [selectedFiles, appSettings, currentChatSettings, setSelectedFiles]);
};
