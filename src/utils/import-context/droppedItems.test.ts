import { describe, expect, it } from 'vitest';

import { processDroppedItems } from './droppedItems';

function createFileEntry(fullPath: string, file: File): FileSystemFileEntry {
  return {
    isFile: true,
    isDirectory: false,
    name: file.name,
    fullPath,
    file(successCallback: (value: File) => void) {
      successCallback(file);
    },
  } as unknown as FileSystemFileEntry;
}

function createDirectoryEntry(
  name: string,
  fullPath: string,
  children: FileSystemEntry[],
): FileSystemDirectoryEntry {
  return {
    isFile: false,
    isDirectory: true,
    name,
    fullPath,
    createReader() {
      let consumed = false;
      return {
        readEntries(successCallback) {
          if (consumed) {
            successCallback([]);
            return;
          }

          consumed = true;
          successCallback(children);
        },
      } as FileSystemDirectoryReader;
    },
  } as unknown as FileSystemDirectoryEntry;
}

function createDataTransferItems(entries: FileSystemEntry[]): DataTransferItemList {
  return entries.map((entry) => ({
    kind: 'file',
    webkitGetAsEntry: () => entry,
    getAsFile: () => (entry.isFile ? new File([''], entry.name) : null),
  })) as unknown as DataTransferItemList;
}

describe('processDroppedItems', () => {
  it('attaches relative paths for dropped file entries', async () => {
    const file = new File(['export const app = true;\n'], 'app.ts', { type: 'text/plain' });
    const items = createDataTransferItems([createFileEntry('/demo/src/app.ts', file)]);

    const result = await processDroppedItems(items);

    expect(result.files).toHaveLength(1);
    expect(result.files[0].webkitRelativePath).toBe('demo/src/app.ts');
  });

  it('returns empty directories discovered during drag and drop', async () => {
    const appFile = new File(['export const app = true;\n'], 'app.ts', { type: 'text/plain' });
    const srcEntry = createDirectoryEntry('src', '/demo/src', [
      createFileEntry('/demo/src/app.ts', appFile),
    ]);
    const emptyEntry = createDirectoryEntry('empty', '/demo/empty', []);
    const rootEntry = createDirectoryEntry('demo', '/demo', [srcEntry, emptyEntry]);
    const items = createDataTransferItems([rootEntry]);

    const result = await processDroppedItems(items);

    expect(result.files.map((file) => file.webkitRelativePath)).toEqual(['demo/src/app.ts']);
    expect(result.emptyDirectoryPaths).toEqual(['demo/empty']);
  });
});
