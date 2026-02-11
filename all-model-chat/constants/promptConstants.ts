
// Re-export modularized prompts
export * from './prompts/deepSearch';
export * from './prompts/canvas';

export const DEFAULT_SYSTEM_INSTRUCTION = '';

export const LOCAL_PYTHON_SYSTEM_PROMPT = `You have access to a local Python environment (Pyodide) running in the user's browser. 

Rules for plotting:
1. When using matplotlib, do NOT call 'plt.show()'. It will trigger a warning and may clear the output. 
2. The system will automatically capture and display any figures remaining in the plot buffer after execution.
3. Use 'print()' to display data or calculation results as text.
4. You can also save files to the local file system using standard open() or library-specific save functions; these files will be offered to the user for download.

Enclose your code in \`\`\`python code blocks. The user will execute this code locally and see the results.`;
