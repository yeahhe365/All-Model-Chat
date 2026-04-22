import type { FunctionCall, Part, UsageMetadata } from '@google/genai';
import type {
  ChatHistoryItem,
  StandardClientFunctions,
  UploadedFile,
} from '../../types';

interface StandardToolTurnResult {
  modelContent: ChatHistoryItem;
  parts: Part[];
  thoughts?: string;
  functionCalls?: FunctionCall[];
  usage?: UsageMetadata;
  grounding?: unknown;
  urlContext?: unknown;
}

interface StandardToolLoopMessagePair {
  modelContent: ChatHistoryItem;
  functionResponseParts: Part[];
}

interface RunStandardToolLoopOptions {
  initialContents: ChatHistoryItem[];
  clientFunctions: StandardClientFunctions;
  runTurn: (contents: ChatHistoryItem[]) => Promise<StandardToolTurnResult>;
  maxIterations?: number;
}

export const runStandardToolLoop = async ({
  initialContents,
  clientFunctions,
  runTurn,
  maxIterations = 8,
}: RunStandardToolLoopOptions): Promise<{
  finalTurn: StandardToolTurnResult;
  toolMessages: StandardToolLoopMessagePair[];
  generatedFiles: UploadedFile[];
}> => {
  const toolMessages: StandardToolLoopMessagePair[] = [];
  const generatedFiles: UploadedFile[] = [];
  let contents = [...initialContents];

  const toStructuredToolResponse = (value: unknown): Record<string, unknown> => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return { result: value };
  };

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const turn = await runTurn(contents);
    const functionCalls = turn.functionCalls ?? [];

    if (functionCalls.length === 0) {
      return { finalTurn: turn, toolMessages, generatedFiles };
    }

    const functionResponseParts: Part[] = [];

    for (const call of functionCalls) {
      const clientFunction = call.name ? clientFunctions[call.name] : undefined;

      if (!clientFunction) {
        functionResponseParts.push({
          functionResponse: {
            id: call.id,
            name: call.name || 'unknown',
            response: {
              error: `Function ${call.name || 'unknown'} not implemented client-side.`,
            },
          },
        });
        continue;
      }

      try {
        const result = await clientFunction.handler(call.args);
        if (result.generatedFiles?.length) {
          generatedFiles.push(...result.generatedFiles);
        }
        functionResponseParts.push({
          functionResponse: {
            id: call.id,
            name: call.name,
            response: toStructuredToolResponse(result.response),
          },
        });
      } catch (error) {
        functionResponseParts.push({
          functionResponse: {
            id: call.id,
            name: call.name,
            response: {
              error: error instanceof Error ? error.message : String(error),
            },
          },
        });
      }
    }

    toolMessages.push({
      modelContent: turn.modelContent,
      functionResponseParts,
    });

    contents = [
      ...contents,
      turn.modelContent,
      {
        role: 'user',
        parts: functionResponseParts,
      },
    ];
  }

  throw new Error(`Exceeded maximum tool loop iterations (${maxIterations}).`);
};
