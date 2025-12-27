
export const isLikelyHtml = (textContent: string): boolean => {
  if (!textContent) return false;
  const s = textContent.trim().toLowerCase();
  return s.startsWith('<!doctype html>') || (s.includes('<html') && s.includes('</html>')) || (s.startsWith('<svg') && s.includes('</svg>'));
};

export const isLikelyReact = (textContent: string, language: string): boolean => {
    const lang = language.toLowerCase();
    if (['jsx', 'tsx'].includes(lang)) return true;
    
    // For JS/TS, check for React signatures
    if (['js', 'javascript', 'ts', 'typescript'].includes(lang)) {
        return (
            (textContent.includes('import React') || textContent.includes('from "react"') || textContent.includes("from 'react'")) &&
            (textContent.includes('export default') || textContent.includes('return (') || textContent.includes('className='))
        );
    }
    return false;
};

export const generateReactPreview = (code: string): string => {
    // Basic transformation to make the code run in a browser standalone environment
    let processedCode = code;

    // Remove imports that won't work in browser without import maps (we provide React globally)
    processedCode = processedCode.replace(/import\s+React.*?from\s+['"]react['"];?/g, '');
    processedCode = processedCode.replace(/import\s+.*?from\s+['"]react-dom\/client['"];?/g, '');
    processedCode = processedCode.replace(/import\s+.*?from\s+['"]lucide-react['"];?/g, ''); // Lucide icons not available in this simple harness

    // Handle export default
    // We want to capture the component name or class to mount it
    // Strategy: Replace 'export default function App' with 'function App', then mount App.
    // Or 'export default App' -> mount App.
    
    const componentNameMatch = processedCode.match(/export\s+default\s+(?:function|class)\s+([A-Z][a-zA-Z0-9]*)/);
    let componentName = 'App'; // Default assumption

    if (componentNameMatch) {
        componentName = componentNameMatch[1];
        // Remove 'export default' but keep 'function Name'
        processedCode = processedCode.replace(/export\s+default\s+/, '');
    } else {
        // Check for 'export default Name;' at the end
        const exportMatch = processedCode.match(/export\s+default\s+([A-Z][a-zA-Z0-9]*);?/);
        if (exportMatch) {
            componentName = exportMatch[1];
            processedCode = processedCode.replace(/export\s+default\s+[A-Z][a-zA-Z0-9]*;?/, '');
        }
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
        body { background-color: #ffffff; color: #1f2937; margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
        #root { width: 100%; height: 100%; }
        /* Error Overlay */
        #error-overlay { display: none; background: #fee2e2; color: #b91c1c; padding: 20px; border-radius: 8px; border: 1px solid #f87171; white-space: pre-wrap; font-family: monospace; }
    </style>
</head>
<body>
    <div id="error-overlay"></div>
    <div id="root"></div>

    <script type="text/babel">
        window.onerror = function(message, source, lineno, colno, error) {
            const el = document.getElementById('error-overlay');
            el.style.display = 'block';
            el.innerText = 'Runtime Error:\\n' + message;
        };

        try {
            const { useState, useEffect, useRef, useMemo, useCallback, useReducer, useContext, createContext } = React;
            
            // --- User Code Start ---
            ${processedCode}
            // --- User Code End ---

            // Mount logic
            const container = document.getElementById('root');
            const root = ReactDOM.createRoot(container);
            
            // Check if the inferred component exists
            if (typeof ${componentName} !== 'undefined') {
                root.render(<${componentName} />);
            } else if (typeof App !== 'undefined') {
                root.render(<App />);
            } else {
                throw new Error("Could not find a component to render. Ensure you export a component named 'App' or use 'export default'.");
            }
        } catch (err) {
            const el = document.getElementById('error-overlay');
            el.style.display = 'block';
            el.innerText = 'Render Error:\\n' + err.message;
        }
    </script>
</body>
</html>`;
};
