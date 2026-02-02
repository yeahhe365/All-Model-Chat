
import { useCallback, useState } from 'react';
import { ProjectContext, ProjectContextReadState } from '../types';
import { readProjectFile } from '../utils/folderImportUtils';

interface UseFolderToolExecutorProps {
    projectContext: ProjectContext | null;
}

interface UseFolderToolExecutorReturn {
    readState: ProjectContextReadState;
    /** Execute a read_file function call from the AI */
    executeReadFile: (filepath: string) => Promise<string>;
    /** Reset the read state (e.g., when starting a new conversation) */
    resetReadState: () => void;
    /** Client functions registry for tool handling */
    clientFunctions: Record<string, (args: any) => Promise<any>>;
}

/**
 * Hook for executing client-side folder access tools.
 * This is analogous to useLiveTools but for standard chat with folder context.
 * 
 * When AI calls read_file, this hook:
 * 1. Updates the loading state (for UI feedback)
 * 2. Reads the file from the stored ProjectContext
 * 3. Tracks which files have been read
 * 4. Returns the file content to be sent back as function response
 */
export const useFolderToolExecutor = ({ projectContext }: UseFolderToolExecutorProps): UseFolderToolExecutorReturn => {
    const [readState, setReadState] = useState<ProjectContextReadState>({
        readFiles: new Set(),
        loadingFile: null,
    });

    const executeReadFile = useCallback(async (filepath: string): Promise<string> => {
        if (!projectContext) {
            throw new Error('No project context available');
        }

        // Set loading state
        setReadState(prev => ({
            ...prev,
            loadingFile: filepath,
        }));

        try {
            const content = await readProjectFile(projectContext, filepath);

            // Update read state
            setReadState(prev => ({
                readFiles: new Set([...prev.readFiles, filepath]),
                loadingFile: null,
            }));

            return content;
        } catch (error) {
            // Clear loading state on error
            setReadState(prev => ({
                ...prev,
                loadingFile: null,
            }));
            throw error;
        }
    }, [projectContext]);

    const resetReadState = useCallback(() => {
        setReadState({
            readFiles: new Set(),
            loadingFile: null,
        });
    }, []);

    // Client functions registry for use with tool handling
    const clientFunctions = {
        read_file: async (args: { filepath: string }) => {
            return executeReadFile(args.filepath);
        }
    };

    return {
        readState,
        executeReadFile,
        resetReadState,
        clientFunctions,
    };
};

/**
 * Generate the system prompt prefix for agentic folder access.
 * This should be prepended to the user's system instruction.
 */
export const generateProjectContextSystemPrompt = (projectContext: ProjectContext): string => {
    return `You have access to a project with the following file structure:

\`\`\`
${projectContext.fileTree}
\`\`\`

**Important instructions for working with this project:**
1. When the user asks about code, files, or the project structure, use the \`read_file\` tool to read the relevant files.
2. Do NOT guess or assume file contents - always read the file first.
3. Use the filepath exactly as shown in the structure above (e.g., "src/App.tsx", not "./src/App.tsx").
4. You can read multiple files if needed to answer the question.
5. After reading a file, analyze it thoroughly before responding.

`;
};
