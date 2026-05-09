// hooks/file-upload/useFilePreProcessing.ts
import { useCallback, Dispatch, SetStateAction } from 'react';
import { AppSettings, UploadedFile } from '../../types';
import { logService } from '../../services/logService';
import { generateUniqueId } from '../../utils/chat/ids';
import { isAudioMimeType, isTextFile } from '../../utils/fileTypeUtils';
import { generateZipContext } from '../../utils/folderImportUtils';
import { compressAudioToMp3 } from '@/features/audio/audioCompression';
import { extractDocxText, isDocxFile } from '../../utils/docxPreview';
import { useI18n } from '../../contexts/I18nContext';

interface UseFilePreProcessingProps {
  appSettings: AppSettings;
  setSelectedFiles: Dispatch<SetStateAction<UploadedFile[]>>;
}

export const useFilePreProcessing = ({ appSettings, setSelectedFiles }: UseFilePreProcessingProps) => {
  const { t } = useI18n();
  const processFiles = useCallback(
    async (
      files: FileList | File[],
      options: { setSelectedFiles?: Dispatch<SetStateAction<UploadedFile[]>> } = {},
    ): Promise<File[]> => {
      const rawFilesArray = Array.isArray(files) ? files : Array.from(files);
      const processedFiles: File[] = [];
      const writeSelectedFiles = options.setSelectedFiles ?? setSelectedFiles;

      for (const file of rawFilesArray) {
        const fileNameLower = file.name.toLowerCase();
        const mimeTypeLower = file.type.toLowerCase();

        // Expanded audio detection
        const isAudio =
          !mimeTypeLower.startsWith('video/') &&
          (isAudioMimeType(file.type) ||
            ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac', '.webm', '.wma', '.aiff'].some((ext) =>
              fileNameLower.endsWith(ext),
            ));

        const isText = isTextFile(file);

        if (fileNameLower.endsWith('.zip')) {
          const tempId = generateUniqueId();
          writeSelectedFiles((prev) => [
            ...prev,
            {
              id: tempId,
              name: t('fileProcessing_zip').replace('{filename}', file.name),
              type: 'application/zip',
              size: file.size,
              isProcessing: true,
              uploadState: 'pending',
            },
          ]);

          try {
            logService.info(`Auto-converting ZIP file: ${file.name}`);
            // generateZipContext now internally offloads to a Web Worker
            const contextFile = await generateZipContext(file);
            processedFiles.push(contextFile);
          } catch (error) {
            logService.error(`Failed to auto-convert zip file ${file.name}`, { error });
            processedFiles.push(file);
          } finally {
            writeSelectedFiles((prev) => prev.filter((f) => f.id !== tempId));
          }
        } else if (isDocxFile(file)) {
          const tempId = generateUniqueId();
          writeSelectedFiles((prev) => [
            ...prev,
            {
              id: tempId,
              name: t('fileProcessing_docx').replace('{filename}', file.name),
              type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              size: file.size,
              isProcessing: true,
              uploadState: 'pending',
            },
          ]);

          try {
            logService.info(`Extracting text from Word file via Worker: ${file.name}`);
            const { text: textContent, messages } = await extractDocxText(file);

            if (messages.length > 0) {
              logService.warn('Mammoth extraction warnings:', { messages });
            }

            const newFileName = file.name.replace(/\.docx$/i, '.txt');
            const textFile = new File([textContent], newFileName, { type: 'text/plain' });

            processedFiles.push(textFile);
          } catch (error) {
            logService.error(`Failed to extract text from docx ${file.name}`, { error });
            // Fallback: send original file (might fail if not supported by API directly, but safer than crashing)
            processedFiles.push(file);
          } finally {
            writeSelectedFiles((prev) => prev.filter((f) => f.id !== tempId));
          }
        } else if (isAudio) {
          if (appSettings.isAudioCompressionEnabled) {
            const tempId = generateUniqueId();
            const abortController = new AbortController();

            writeSelectedFiles((prev) => [
              ...prev,
              {
                id: tempId,
                name: t('fileProcessing_audio').replace('{filename}', file.name),
                type: file.type || 'audio/mpeg',
                size: file.size,
                isProcessing: true,
                uploadState: 'pending',
                abortController: abortController,
              },
            ]);

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
              writeSelectedFiles((prev) => prev.filter((f) => f.id !== tempId));
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
    },
    [appSettings.isAudioCompressionEnabled, setSelectedFiles, t],
  );

  return { processFiles };
};
