import type { StandardClientFunctions, UploadedFile } from '../../types';
import type { ExecutionResult } from '@/features/local-python/pyodideService';
import { createLocalPythonToolDeclaration, createLocalPythonToolHandler } from '../local-python/clientFunctionTool';

interface CreateStandardClientFunctionsOptions {
  isLocalPythonEnabled: boolean;
  inputFiles: UploadedFile[];
  runPython: (code: string, options?: { files?: UploadedFile[] }) => Promise<Omit<ExecutionResult, 'status'>>;
}

export const createStandardClientFunctions = ({
  isLocalPythonEnabled,
  inputFiles,
  runPython,
}: CreateStandardClientFunctionsOptions): StandardClientFunctions => {
  if (!isLocalPythonEnabled) {
    return {};
  }

  return {
    run_local_python: {
      declaration: createLocalPythonToolDeclaration(),
      handler: createLocalPythonToolHandler({
        getRunOptions: () => ({ files: inputFiles }),
        runPython,
      }),
    },
  };
};
