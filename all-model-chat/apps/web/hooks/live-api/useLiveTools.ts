
import { useCallback } from 'react';
import { LiveServerMessage, LiveSession } from '@google/genai';
import { logService } from '../../utils/appUtils';

interface UseLiveToolsProps {
    clientFunctions?: Record<string, (args: any) => Promise<any>>;
    sessionRef: React.MutableRefObject<Promise<LiveSession> | null>;
}

export const useLiveTools = ({ clientFunctions, sessionRef }: UseLiveToolsProps) => {
    const handleToolCall = useCallback(async (toolCall: NonNullable<LiveServerMessage['toolCall']>) => {
        logService.info("Received Tool Call", toolCall);
        
        if (toolCall.functionCalls.length > 0) {
            const functionResponses = [];
            
            for (const call of toolCall.functionCalls) {
                const fn = clientFunctions?.[call.name];
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
                    console.warn(`Function ${call.name} not found in client registry.`);
                    functionResponses.push({
                        id: call.id,
                        name: call.name,
                        response: { error: `Function ${call.name} not implemented client-side.` }
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
