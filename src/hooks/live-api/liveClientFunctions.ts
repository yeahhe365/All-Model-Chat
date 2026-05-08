import type { LiveClientFunctions, UploadedFile } from '../../types';
import type { ExecutionResult } from '@/features/local-python/pyodideService';
import { createLocalPythonToolDeclaration, createLocalPythonToolHandler } from '@/features/local-python/clientFunctionTool';

interface CreateLiveClientFunctionsOptions {
  isLocalPythonEnabled: boolean;
  selectedFiles: UploadedFile[];
  runPython: (
    code: string,
    options?: { files?: UploadedFile[]; abortSignal?: AbortSignal },
  ) => Promise<Omit<ExecutionResult, 'status'>>;
}

export const createLiveClientFunctions = ({
  isLocalPythonEnabled,
  selectedFiles,
  runPython,
}: CreateLiveClientFunctionsOptions): LiveClientFunctions => {
  if (!isLocalPythonEnabled) {
    return {};
  }

  return {
    run_local_python: {
      declaration: createLocalPythonToolDeclaration(),
      handler: createLocalPythonToolHandler({
        getRunOptions: (options) => ({
          files: selectedFiles,
          abortSignal: options?.abortSignal,
        }),
        runPython,
      }),
    },
  };
};
