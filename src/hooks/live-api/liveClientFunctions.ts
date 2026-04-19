import type { LiveClientFunction, LiveClientFunctions, UploadedFile } from '../../types';
import type { ExecutionResult } from '../../services/pyodideService';

interface CreateLiveClientFunctionsOptions {
  isLocalPythonEnabled: boolean;
  selectedFiles: UploadedFile[];
  runPython: (
    code: string,
    options?: { files?: UploadedFile[] },
  ) => Promise<Omit<ExecutionResult, 'status'>>;
}

type FunctionParameterType = NonNullable<
  NonNullable<LiveClientFunction['declaration']['parameters']>['type']
>;

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
      handler: async (args: unknown) => {
        const code = typeof args === 'object' && args !== null ? (args as { code?: unknown }).code : undefined;

        if (typeof code !== 'string' || !code.trim()) {
          throw new Error('run_local_python requires a non-empty "code" string.');
        }

        const result = await runPython(code, { files: selectedFiles });

        return {
          output: result.output || null,
          result: result.result || null,
          imageGenerated: !!result.image,
          generatedFiles: (result.files ?? []).map(({ name, type }) => ({ name, type })),
        };
      },
    },
  };
};
