import {
  buildImportContextFile,
  generateZipContext as generateZipImportContext,
  type ImportContextBuildOptions,
  type PathFileInput,
} from './import-context/importContextBuilder';

export const generateFolderContext = async (
  files: FileList | File[] | PathFileInput[],
  options: ImportContextBuildOptions = {},
): Promise<File> => buildImportContextFile(files, options);

export const generateZipContext = async (zipFile: File, options: ImportContextBuildOptions = {}): Promise<File> =>
  generateZipImportContext(zipFile, options);
