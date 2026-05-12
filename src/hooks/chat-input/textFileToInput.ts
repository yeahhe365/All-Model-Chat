import type { UploadedFile } from '@/types';
import { fileToString } from '@/utils/fileHelpers';

export const readUploadedTextFileContent = async (
  file: Pick<UploadedFile, 'name' | 'textContent' | 'rawFile' | 'dataUrl'>,
): Promise<string> => {
  if (typeof file.textContent === 'string') {
    return file.textContent;
  }

  if (file.rawFile instanceof File) {
    return fileToString(file.rawFile);
  }

  if (file.rawFile instanceof Blob) {
    return file.rawFile.text();
  }

  if (file.dataUrl) {
    const response = await fetch(file.dataUrl);
    return response.text();
  }

  throw new Error(`No readable text content available for ${file.name}.`);
};
