import { useCallback, useRef } from 'react';
import type { LiveServerMessage, Session as LiveSession } from '@google/genai';
import type { LiveClientFunctions, UploadedFile } from '../../types';
import { logService } from '../../services/logService';

interface UseLiveToolsProps {
  clientFunctions?: LiveClientFunctions;
  sessionRef: React.MutableRefObject<Promise<LiveSession> | null>;
  onGeneratedFiles?: (files: UploadedFile[]) => void;
}

export const useLiveTools = ({ clientFunctions, sessionRef, onGeneratedFiles }: UseLiveToolsProps) => {
  const cancelledCallIdsRef = useRef<Set<string>>(new Set());
  const activeControllersRef = useRef<Map<string, AbortController>>(new Map());

  const toStructuredToolResponse = (value: unknown): Record<string, unknown> => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return { result: value };
  };

  const cancelToolCalls = useCallback((ids: string[]) => {
    for (const id of ids) {
      cancelledCallIdsRef.current.add(id);
      activeControllersRef.current.get(id)?.abort();
      activeControllersRef.current.delete(id);
    }
  }, []);

  const handleToolCall = useCallback(
    async (toolCall: NonNullable<LiveServerMessage['toolCall']>) => {
      logService.info('Received Tool Call', toolCall);

      const functionCalls = toolCall.functionCalls ?? [];
      if (functionCalls.length > 0) {
        const functionResponses: Array<{
          id?: string;
          name?: string;
          response: { result?: unknown; error?: string };
        }> = [];

        for (const call of functionCalls) {
          const callId = call.id;
          if (callId && cancelledCallIdsRef.current.has(callId)) {
            cancelledCallIdsRef.current.delete(callId);
            continue;
          }

          const callName = call.name ?? 'unknown';
          const clientFunction = clientFunctions?.[callName];
          if (clientFunction) {
            const abortController = new AbortController();
            if (callId) {
              activeControllersRef.current.set(callId, abortController);
            }

            try {
              const result = await clientFunction.handler(call.args, {
                abortSignal: abortController.signal,
              });
              if (callId) {
                activeControllersRef.current.delete(callId);
              }
              if (callId && cancelledCallIdsRef.current.has(callId)) {
                cancelledCallIdsRef.current.delete(callId);
                continue;
              }
              if (result.generatedFiles?.length) {
                onGeneratedFiles?.(result.generatedFiles);
              }
              functionResponses.push({
                id: callId,
                name: callName,
                response: toStructuredToolResponse(result.response),
              });
            } catch (e) {
              if (callId) {
                activeControllersRef.current.delete(callId);
              }
              if (callId && cancelledCallIdsRef.current.has(callId)) {
                cancelledCallIdsRef.current.delete(callId);
                continue;
              }
              logService.error(`Error executing function ${callName}`, e);
              functionResponses.push({
                id: callId,
                name: callName,
                response: { error: e instanceof Error ? e.message : String(e) },
              });
            }
          } else {
            logService.warn(`Function ${callName} not found in client registry.`);
            functionResponses.push({
              id: callId,
              name: callName,
              response: { error: `Function ${callName} not implemented client-side.` },
            });
          }
        }

        if (functionResponses.length > 0) {
          sessionRef.current?.then((session) => {
            session.sendToolResponse({ functionResponses });
          });
        }
      }
    },
    [clientFunctions, onGeneratedFiles, sessionRef],
  );

  return { handleToolCall, cancelToolCalls };
};
