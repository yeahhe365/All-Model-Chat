
import React, { useRef, useEffect } from 'react';

interface CodeEditorProps {
    value: string;
    onChange: (value: string) => void;
    language: string;
    className?: string;
    readOnly?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, language, className, readOnly }) => {
    const preRef = useRef<HTMLElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleScroll = () => {
        if (textareaRef.current && preRef.current) {
            preRef.current.scrollTop = textareaRef.current.scrollTop;
            preRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };

    useEffect(() => {
        let isMounted = true;
        
        const highlight = async () => {
            if (!preRef.current) return;
            
            // Handle trailing newlines for visualization consistency
            const content = value.endsWith('\n') ? value + ' ' : value;

            try {
                // Dynamic import
                const { default: hljs } = await import('highlight.js');
                
                if (!isMounted) return;

                const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
                const result = hljs.highlight(content, { language: validLanguage });
                preRef.current.innerHTML = result.value;
            } catch (e) {
                if (isMounted && preRef.current) {
                    preRef.current.textContent = content;
                }
            }
        };

        highlight();

        return () => {
            isMounted = false;
        };
    }, [value, language]);

    return (
        <div className={`relative w-full h-full overflow-hidden bg-[var(--theme-bg-code-block)] ${className || ''}`}>
            {/* Syntax Highlight Layer */}
            <pre
                ref={preRef as any}
                aria-hidden="true"
                className="absolute inset-0 m-0 p-4 font-mono text-sm leading-relaxed pointer-events-none overflow-hidden whitespace-pre hljs !bg-transparent"
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}
            />
            
            {/* Input Layer */}
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onScroll={handleScroll}
                readOnly={readOnly}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                className="absolute inset-0 w-full h-full m-0 p-4 font-mono text-sm leading-relaxed bg-transparent text-transparent caret-[var(--theme-text-primary)] outline-none resize-none whitespace-pre overflow-auto custom-scrollbar"
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}
            />
        </div>
    );
};
