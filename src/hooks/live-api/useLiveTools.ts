import { useCallback } from 'react';
import type { LiveServerMessage, Session } from '@google/genai';
import { logService } from '../../utils/appUtils';

interface UseLiveToolsProps {
    clientFunctions?: Record<string, (args: any) => Promise<any>>;
    sessionRef: React.MutableRefObject<Promise<Session> | null>;
}

export const useLiveTools = ({ clientFunctions, sessionRef }: UseLiveToolsProps) => {
    const handleToolCall = useCallback(async (toolCall: NonNullable<LiveServerMessage['toolCall']>) => {
        logService.info("Received Tool Call", toolCall);
        const functionCalls = toolCall.functionCalls ?? [];
        
        if (functionCalls.length > 0) {
            const functionResponses: Array<{ id?: string; name?: string; response: { result?: unknown; error?: string } }> = [];
            
            for (const call of functionCalls) {
                const callName = call.name;
                const fn = callName ? clientFunctions?.[callName] : undefined;
                if (fn) {
                    try {
                        const result = await fn(call.args);
                        functionResponses.push({
                            id: call.id,
                            name: callName,
                            response: { result: result }
                        });
                    } catch (e: any) {
                        console.error(`Error executing function ${callName}`, e);
                        functionResponses.push({
                            id: call.id,
                            name: callName,
                            response: { error: e instanceof Error ? e.message : String(e) }
                        });
                    }
                } else {
                    console.warn(`Function ${callName ?? 'unknown'} not found in client registry.`);
                    functionResponses.push({
                        id: call.id,
                        name: callName,
                        response: { error: `Function ${callName ?? 'unknown'} not implemented client-side.` }
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
