
import { useCallback } from 'react';
import { LiveServerMessage, Session } from '@google/genai';
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
            const functionResponses: Array<{
                id?: string;
                name?: string;
                response: { result?: unknown; error?: string };
            }> = [];

            for (const call of functionCalls) {
                const fn = call.name ? clientFunctions?.[call.name] : undefined;
                if (fn) {
                    try {
                        const result = await fn(call.args);
                        functionResponses.push({
                            id: call.id,
                            name: call.name,
                            response: { result: result }
                        });
                    } catch (e: any) {
                        console.error(`Error executing function ${call.name}`, e);
                        functionResponses.push({
                            id: call.id,
                            name: call.name,
                            response: { error: e.message }
                        });
                    }
                } else {
                    console.warn(`Function ${call.name || 'unknown'} not found in client registry.`);
                    functionResponses.push({
                        id: call.id,
                        name: call.name,
                        response: { error: `Function ${call.name || 'unknown'} not implemented client-side.` }
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
