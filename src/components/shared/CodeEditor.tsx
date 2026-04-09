
import React, { useRef, useEffect } from 'react';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import plaintext from 'highlight.js/lib/languages/plaintext';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('css', css);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('md', markdown);
hljs.registerLanguage('plaintext', plaintext);
hljs.registerLanguage('text', plaintext);
hljs.registerLanguage('txt', plaintext);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);

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
        if (preRef.current) {
            // Handle trailing newlines for visualization consistency
            const content = value.endsWith('\n') ? value + ' ' : value;
            
            try {
                const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
                const result = hljs.highlight(content, { language: validLanguage });
                preRef.current.innerHTML = result.value;
            } catch (_error) {
                preRef.current.textContent = content;
            }
        }
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
