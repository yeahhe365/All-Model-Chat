
import { useState, useCallback } from 'react';
import { pyodideService, PyodideFile } from '../services/pyodideService';

export interface PyodideState {
    isRunning: boolean;
    output: string | null;
    image: string | null;
    files: PyodideFile[];
    error: string | null;
    hasRun: boolean;
}

export const usePyodide = () => {
    const [state, setState] = useState<PyodideState>({
        isRunning: false,
        output: null,
        image: null,
        files: [],
        error: null,
        hasRun: false
    });

    const runCode = useCallback(async (code: string) => {
        setState(prev => ({ ...prev, isRunning: true, error: null, output: null, image: null, files: [] }));
        
        try {
            const result = await pyodideService.runPython(code);
            
            setState({
                isRunning: false,
                output: result.output || result.result || (result.image || (result.files && result.files.length > 0) ? null : "No output"),
                image: result.image || null,
                files: result.files || [],
                error: null,
                hasRun: true
            });
        } catch (err) {
            setState({
                isRunning: false,
                output: null,
                image: null,
                files: [],
                error: err instanceof Error ? err.message : String(err),
                hasRun: true
            });
        }
    }, []);

    const clearOutput = useCallback(() => {
        setState({
            isRunning: false,
            output: null,
            image: null,
            files: [],
            error: null,
            hasRun: false
        });
    }, []);

    // While we can't easily hard-reset the worker without re-initializing the service,
    // we can provide a UI reset to clear the visual state.
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
