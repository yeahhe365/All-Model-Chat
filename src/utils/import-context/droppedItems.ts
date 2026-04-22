import { IGNORED_DIRS } from './shared';

export interface DroppedItemsResult {
  files: File[];
  emptyDirectoryPaths: string[];
}

interface ProcessDroppedItemsOptions {
  skipDefaultIgnoredDirectories?: boolean;
}

export async function processDroppedItems(
  items: DataTransferItemList,
  signal?: AbortSignal,
  options: ProcessDroppedItemsOptions = {},
): Promise<DroppedItemsResult> {
  const allFiles: File[] = [];
  const emptyDirectoryPaths: string[] = [];
  const entries: FileSystemEntry[] = [];

  for (const item of Array.from(items)) {
    if (item.kind !== 'file') {
      continue;
    }

    const entry = item.webkitGetAsEntry?.();
    if (entry) {
      entries.push(entry);
      continue;
    }

    const file = item.getAsFile();
    if (file) {
      allFiles.push(file);
    }
  }

  const readEntries = async (entry: FileSystemEntry): Promise<DroppedItemsResult> => {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    if (entry.isFile) {
      return new Promise((resolve, reject) => {
        (entry as FileSystemFileEntry).file(
          (file) => {
            if (!file.webkitRelativePath) {
              Object.defineProperty(file, 'webkitRelativePath', {
                configurable: true,
                value: entry.fullPath.startsWith('/') ? entry.fullPath.slice(1) : entry.fullPath,
                writable: true,
              });
            }
            resolve({ files: [file], emptyDirectoryPaths: [] });
          },
          (error) => reject(error),
        );
      });
    }

    if (entry.isDirectory) {
      if (options.skipDefaultIgnoredDirectories !== false && IGNORED_DIRS.has(entry.name)) {
        return { files: [], emptyDirectoryPaths: [] };
      }

      const dirReader = (entry as FileSystemDirectoryEntry).createReader();
      const directoryFiles: File[] = [];
      const directoryEmptyPaths: string[] = [];

      return new Promise((resolve, reject) => {
        const readBatch = () => {
          dirReader.readEntries(
            async (batch) => {
              if (signal?.aborted) {
                reject(new DOMException('Aborted', 'AbortError'));
                return;
              }

              if (batch.length === 0) {
                if (directoryFiles.length === 0) {
                  const dirPath = entry.fullPath.startsWith('/') ? entry.fullPath.slice(1) : entry.fullPath;
                  directoryEmptyPaths.push(dirPath);
                }
                resolve({ files: directoryFiles, emptyDirectoryPaths: directoryEmptyPaths });
                return;
              }

              try {
                const batchResults = await Promise.all(batch.map(readEntries));
                directoryFiles.push(...batchResults.flatMap((result) => result.files));
                directoryEmptyPaths.push(...batchResults.flatMap((result) => result.emptyDirectoryPaths));
                readBatch();
              } catch (error) {
                reject(error);
              }
            },
            (error) => reject(error),
          );
        };

        readBatch();
      });
    }

    return { files: [], emptyDirectoryPaths: [] };
  };

  const filesFromEntries = await Promise.all(entries.map(readEntries));
  allFiles.push(...filesFromEntries.flatMap((result) => result.files));
  emptyDirectoryPaths.push(...filesFromEntries.flatMap((result) => result.emptyDirectoryPaths));

  return {
    files: allFiles,
    emptyDirectoryPaths,
  };
}
