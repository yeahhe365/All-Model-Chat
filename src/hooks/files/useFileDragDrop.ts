import React, { useState, useCallback } from 'react';
import { buildImportContextFile } from '../../utils/import-context/importContextBuilder';
import { processDroppedItems } from '../../utils/import-context/droppedItems';
import { UploadedFile } from '../../types';
import { generateUniqueId } from '../../utils/chat/ids';
import { useI18n } from '../../contexts/I18nContext';

interface UseFileDragDropProps {
  onFilesDropped: (files: FileList | File[]) => Promise<void>;
  onAddTempFile: (file: UploadedFile) => void;
  onRemoveTempFile: (id: string) => void;
}

export const useFileDragDrop = ({ onFilesDropped, onAddTempFile, onRemoveTempFile }: UseFileDragDropProps) => {
  const { t } = useI18n();
  const [isAppDraggingOver, setIsAppDraggingOver] = useState<boolean>(false);
  const [isProcessingDrop, setIsProcessingDrop] = useState<boolean>(false);

  const handleAppDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsAppDraggingOver(true);
    }
  }, []);

  const handleAppDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.types.includes('Files')) {
        e.dataTransfer.dropEffect = 'copy';
        if (!isAppDraggingOver) {
          setIsAppDraggingOver(true);
        }
      } else {
        e.dataTransfer.dropEffect = 'none';
      }
    },
    [isAppDraggingOver],
  );

  const handleAppDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only reset if leaving the main container, not entering a child
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsAppDraggingOver(false);
  }, []);

  const handleAppDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsAppDraggingOver(false);
      setIsProcessingDrop(true);

      try {
        const items = e.dataTransfer.items;
        let hasDirectory = false;

        // Check if any dropped item is a directory
        if (items) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file' && typeof item.webkitGetAsEntry === 'function') {
              const entry = item.webkitGetAsEntry();
              if (entry && entry.isDirectory) {
                hasDirectory = true;
                break;
              }
            }
          }
        }

        if (hasDirectory) {
          const tempId = generateUniqueId();
          onAddTempFile({
            id: tempId,
            name: t('fileProcessing_dropped'),
            type: 'application/x-directory', // Dummy type for icon
            size: 0,
            isProcessing: true,
            uploadState: 'pending',
          });

          const dropped = await processDroppedItems(items);

          if (dropped.files.length > 0 || dropped.emptyDirectoryPaths.length > 0) {
            const contextFile = await buildImportContextFile(dropped.files, {
              emptyDirectoryPaths: dropped.emptyDirectoryPaths,
            });
            await onFilesDropped([contextFile]);
          }

          onRemoveTempFile(tempId);
        } else {
          // Standard file drop
          const files = e.dataTransfer.files;
          if (files?.length) {
            await onFilesDropped(files);
          }
        }
      } catch (error) {
        console.error('Error processing dropped files:', error);
      } finally {
        setIsProcessingDrop(false);
      }
    },
    [onFilesDropped, onAddTempFile, onRemoveTempFile, t],
  );

  return {
    isAppDraggingOver,
    isProcessingDrop,
    handleAppDragEnter,
    handleAppDragOver,
    handleAppDragLeave,
    handleAppDrop,
  };
};
