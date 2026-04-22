import { IGNORED_DIRS } from './shared';

interface DirectoryReadResult {
  files: File[];
  emptyDirectoryPaths: string[];
}

interface ReadDirectoryHandleOptions {
  skipDefaultIgnoredDirectories?: boolean;
}

function attachRelativePath(file: File, relativePath: string): File {
  Object.defineProperty(file, 'webkitRelativePath', {
    configurable: true,
    value: relativePath,
  });
  return file;
}

async function readDirectory(
  handle: FileSystemDirectoryHandle,
  relativePath: string,
  files: File[],
  emptyDirectoryPaths: string[],
  options: ReadDirectoryHandleOptions,
): Promise<boolean> {
  let sawAnySupportedEntries = false;

  for await (const entry of handle.values()) {
    if (entry.kind === 'directory') {
      const directoryEntry = entry as FileSystemDirectoryHandle;
      if (options.skipDefaultIgnoredDirectories !== false && IGNORED_DIRS.has(directoryEntry.name)) {
        continue;
      }

      sawAnySupportedEntries = true;
      await readDirectory(directoryEntry, `${relativePath}/${directoryEntry.name}`, files, emptyDirectoryPaths, options);
      continue;
    }

    sawAnySupportedEntries = true;
    const file = await (entry as FileSystemFileHandle).getFile();
    files.push(attachRelativePath(file, `${relativePath}/${file.name}`));
  }

  if (!sawAnySupportedEntries) {
    emptyDirectoryPaths.push(relativePath);
  }

  return sawAnySupportedEntries;
}

export async function readDirectoryHandle(
  handle: FileSystemDirectoryHandle,
  options: ReadDirectoryHandleOptions = {},
): Promise<DirectoryReadResult> {
  const files: File[] = [];
  const emptyDirectoryPaths: string[] = [];

  await readDirectory(handle, handle.name, files, emptyDirectoryPaths, options);

  return {
    files,
    emptyDirectoryPaths,
  };
}
