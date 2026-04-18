
import { useCallback } from 'react';
import type { LiveServerMessage, Session as LiveSession } from '@google/genai';
import type { LiveClientFunctions } from '../../types';
import { logService } from '../../utils/appUtils';

interface UseLiveToolsProps {
    clientFunctions?: LiveClientFunctions;
    sessionRef: React.MutableRefObject<Promise<LiveSession> | null>;
}

export const useLiveTools = ({ clientFunctions, sessionRef }: UseLiveToolsProps) => {
    const handleToolCall = useCallback(async (toolCall: NonNullable<LiveServerMessage['toolCall']>) => {
        logService.info("Received Tool Call", toolCall);
        
        const functionCalls = toolCall.functionCalls ?? [];
        if (functionCalls.length > 0) {
            const functionResponses: Array<{
                id?: string;
                name?: string;
                response: { result?: unknown; error?: string };
            }> = [];
            
            for (const call of functionCalls) {
                const callName = call.name ?? 'unknown';
                const clientFunction = clientFunctions?.[callName];
                if (clientFunction) {
                    try {
                        const result = await clientFunction.handler(call.args);
                        functionResponses.push({
                            id: call.id,
                            name: callName,
                            response: { result: result }
                        });
                    } catch (e) {
                        console.error(`Error executing function ${callName}`, e);
                        functionResponses.push({
                            id: call.id,
                            name: callName,
                            response: { error: e instanceof Error ? e.message : String(e) }
                        });
                    }
                } else {
                    console.warn(`Function ${callName} not found in client registry.`);
                    functionResponses.push({
                        id: call.id,
                        name: callName,
                        response: { error: `Function ${callName} not implemented client-side.` }
                    });
                }
            }

            if (functionResponses.length > 0) {
                sessionRef.current?.then(session => {
                    session.sendToolResponse({ functionResponses });
                });
            }
        }
    }, [clientFunctions, sessionRef]);

    return { handleToolCall };
};
