

import { useState, useCallback } from 'react';
import { pyodideService, PyodideFile } from '../services/pyodideService';

interface PyodideState {
    isRunning: boolean;
    output: string | null;
    image: string | null;
    files: PyodideFile[];
    error: string | null;
    hasRun: boolean;
}

// Global cache to persist manual execution results across virtual list unmounts
const pyodideResultCache = new Map<string, PyodideState>();

export const usePyodide = (codeKey?: string) => {
    const [state, setState] = useState<PyodideState>(() => {
        if (codeKey && pyodideResultCache.has(codeKey)) {
            return pyodideResultCache.get(codeKey)!;
        }
        return {
            isRunning: false,
            output: null,
            image: null,
            files: [],
            error: null,
            hasRun: false
        };
    });

    const runCode = useCallback(async (code: string) => {
        const runningState: PyodideState = { isRunning: true, error: null, output: null, image: null, files: [], hasRun: false };
        setState(runningState);
        if (codeKey) {
            pyodideResultCache.set(codeKey, runningState);
        }
        
        try {
            const result = await pyodideService.runPython(code);
            
            const finalState: PyodideState = {
                isRunning: false,
                output: result.output || result.result || (result.image || (result.files && result.files.length > 0) ? null : "No output"),
                image: result.image || null,
                files: result.files || [],
                error: null,
                hasRun: true
            };
            setState(finalState);
            if (codeKey) {
                pyodideResultCache.set(codeKey, finalState);
            }
            return finalState;
        } catch (err) {
            const errorState: PyodideState = {
                isRunning: false,
                output: null,
                image: null,
                files: [],
                error: err instanceof Error ? err.message : String(err),
                hasRun: true
            };
            setState(errorState);
            if (codeKey) {
                pyodideResultCache.set(codeKey, errorState);
            }
            return errorState;
        }
    }, [codeKey]);

    const clearOutput = useCallback(() => {
        const clearedState: PyodideState = {
            isRunning: false,
            output: null,
            image: null,
            files: [],
            error: null,
            hasRun: false
        };
        setState(clearedState);
        if (codeKey) {
            pyodideResultCache.delete(codeKey);
        }
    }, [codeKey]);

    const resetState = useCallback(() => {
        clearOutput();
    }, [clearOutput]);

    return {
        ...state,
        runCode,
        clearOutput,
        resetState
    };
};
