import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { AppSettings, ChatSettings as IndividualChatSettings, UploadedFile } from '../../types';
import { getKeyForRequest } from '../../utils/apiUtils';
import { geminiServiceInstance } from '../../services/geminiService';
import { logService } from '../../services/logService';
import { POLLING_INTERVAL_MS, MAX_POLLING_DURATION_MS } from '../../services/api/baseApi';

const MAX_POLLING_BACKOFF_MULTIPLIER = 8;

export const getFilePollingDelayMs = (failureCount: number): number => {
  const multiplier = Math.min(MAX_POLLING_BACKOFF_MULTIPLIER, Math.pow(2, Math.max(0, failureCount)));
  return POLLING_INTERVAL_MS * multiplier;
};

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
  const pollingInFlight = useRef<Set<string>>(new Set());
  const pollingFailures = useRef<Map<string, number>>(new Map());
  const lastPollingAttempt = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const intervals = pollingIntervals.current;
    const filesCurrentlyPolling = new Set(pollingIntervals.current.keys());
    const filesThatShouldPoll = new Set(
      selectedFiles.filter((f) => f.uploadState === 'processing_api' && !f.error).map((f) => f.id),
    );

    // Stop polling for files that are no longer in the 'processing_api' state
    for (const fileId of filesCurrentlyPolling) {
      if (!filesThatShouldPoll.has(fileId)) {
        window.clearInterval(pollingIntervals.current.get(fileId));
        intervals.delete(fileId);
        pollingInFlight.current.delete(fileId);
        pollingFailures.current.delete(fileId);
        lastPollingAttempt.current.delete(fileId);
        logService.info(`Stopped polling for file ${fileId} as it is no longer in a processing state.`);
      }
    }

    // Start polling for new files that entered the 'processing_api' state
    for (const fileId of filesThatShouldPoll) {
      if (!filesCurrentlyPolling.has(fileId)) {
        const fileToPoll = selectedFiles.find((f) => f.id === fileId);
        if (!fileToPoll || !fileToPoll.fileApiName) continue;

        logService.info(`Starting polling for file ${fileId} (${fileToPoll.fileApiName})`);

        const startTime = Date.now();
        const fileApiName = fileToPoll.fileApiName;

        const poll = async () => {
          if (pollingInFlight.current.has(fileId)) {
            return;
          }

          const failureCount = pollingFailures.current.get(fileId) ?? 0;
          const lastAttempt = lastPollingAttempt.current.get(fileId) ?? 0;
          const now = Date.now();
          if (lastAttempt > 0 && now - lastAttempt < getFilePollingDelayMs(failureCount)) {
            return;
          }

          if (Date.now() - startTime > MAX_POLLING_DURATION_MS) {
            logService.error(`Polling timed out for file ${fileApiName}`);
            setSelectedFiles((prev) =>
              prev.map((f) =>
                f.id === fileId
                  ? { ...f, error: 'File processing timed out.', uploadState: 'failed', isProcessing: false }
                  : f,
              ),
            );
            return;
          }

          pollingInFlight.current.add(fileId);
          lastPollingAttempt.current.set(fileId, now);

          // Optimize polling by not rotating keys unnecessarily.
          // We reuse the current index/key to avoid burning through rotation turns on poll ticks.
          const keyResult = getKeyForRequest(appSettings, currentChatSettings, { skipIncrement: true });
          if ('error' in keyResult) {
            logService.error(`Polling for ${fileApiName} stopped: ${keyResult.error}`);
            setSelectedFiles((prev) =>
              prev.map((f) =>
                f.id === fileId ? { ...f, error: keyResult.error, uploadState: 'failed', isProcessing: false } : f,
              ),
            );
            pollingInFlight.current.delete(fileId);
            return;
          }

          try {
            const metadata = await geminiServiceInstance.getFileMetadata(keyResult.key, fileApiName);
            if (metadata?.state === 'ACTIVE') {
              logService.info(`File ${fileApiName} is now ACTIVE.`);
              pollingFailures.current.delete(fileId);
              setSelectedFiles((prev) =>
                prev.map((f) => (f.id === fileId ? { ...f, uploadState: 'active', isProcessing: false } : f)),
              );
            } else if (metadata?.state === 'FAILED') {
              logService.error(`File ${fileApiName} processing FAILED on backend.`);
              pollingFailures.current.delete(fileId);
              setSelectedFiles((prev) =>
                prev.map((f) =>
                  f.id === fileId
                    ? { ...f, error: 'Backend processing failed.', uploadState: 'failed', isProcessing: false }
                    : f,
                ),
              );
            } else {
              pollingFailures.current.delete(fileId);
            }
          } catch (error) {
            const nextFailureCount = (pollingFailures.current.get(fileId) ?? 0) + 1;
            pollingFailures.current.set(fileId, nextFailureCount);
            logService.warn(`Polling for ${fileApiName} failed with a key, will retry.`, { error });
          } finally {
            pollingInFlight.current.delete(fileId);
          }
        };

        const intervalId = window.setInterval(poll, POLLING_INTERVAL_MS);
        intervals.set(fileId, intervalId);
        poll(); // Run immediately once
      }
    }

    // Cleanup on unmount
    return () => {
      intervals.forEach((intervalId) => window.clearInterval(intervalId));
    };
  }, [selectedFiles, appSettings, currentChatSettings, setSelectedFiles]);
};
