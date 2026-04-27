import type { LiveClientFunction, LiveClientFunctions, UploadedFile } from '../../types';
import type { ExecutionResult } from '../../services/pyodideService';
import { createUploadedFileFromBase64 } from '../../utils/chat/parsing';
import { hasGeneratedImageFile } from '../../features/local-python/helpers';

interface CreateLiveClientFunctionsOptions {
  isLocalPythonEnabled: boolean;
  selectedFiles: UploadedFile[];
  runPython: (
    code: string,
    options?: { files?: UploadedFile[]; abortSignal?: AbortSignal },
  ) => Promise<Omit<ExecutionResult, 'status'>>;
}

type FunctionParameterType = NonNullable<NonNullable<LiveClientFunction['declaration']['parameters']>['type']>;

const FUNCTION_PARAMETER_TYPE = {
  OBJECT: 'OBJECT' as FunctionParameterType,
  STRING: 'STRING' as FunctionParameterType,
} as const;

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
      declaration: {
        name: 'run_local_python',
        description:
          'Execute Python code locally in the browser with Pyodide. Use this for calculations, data analysis, CSV inspection, and lightweight plots.',
        parameters: {
          type: FUNCTION_PARAMETER_TYPE.OBJECT,
          properties: {
            code: {
              type: FUNCTION_PARAMETER_TYPE.STRING,
              description: 'The Python code to execute locally.',
            },
          },
          required: ['code'],
        },
      },
      handler: async (args: unknown, options?: { abortSignal?: AbortSignal }) => {
        const code = typeof args === 'object' && args !== null ? (args as { code?: unknown }).code : undefined;

        if (typeof code !== 'string' || !code.trim()) {
          throw new Error('run_local_python requires a non-empty "code" string.');
        }

        const result = await runPython(code, {
          files: selectedFiles,
          abortSignal: options?.abortSignal,
        });
        const outputFiles = result.files || [];
        const generatedFiles = [...outputFiles].map((file) =>
          createUploadedFileFromBase64(file.data, file.type, file.name),
        );

        if (result.image && !hasGeneratedImageFile(outputFiles)) {
          generatedFiles.unshift(
            createUploadedFileFromBase64(result.image, 'image/png', `generated-plot-${Date.now()}`),
          );
        }

        return {
          response: {
            output: result.output || null,
            result: result.result || null,
            imageGenerated: !!result.image,
            generatedFiles: outputFiles.map(({ name, type }) => ({ name, type })),
          },
          generatedFiles,
        };
      },
    },
  };
};
