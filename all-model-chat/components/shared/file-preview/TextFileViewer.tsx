
import React, { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { UploadedFile } from '../../../types';

interface TextFileViewerProps {
    file: UploadedFile;
    content?: string | null;
    isEditable?: boolean;
    onChange?: (value: string) => void;
    onLoad?: (content: string) => void;
}

export const TextFileViewer: React.FC<TextFileViewerProps> = ({ 
    file, 
    content, 
    isEditable = false, 
    onChange,
    onLoad
}) => {
    const [localContent, setLocalContent] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        // If content is provided (e.g. from parent state during edit), use it
        if (content !== undefined && content !== null) {
            setLocalContent(content);
            return;
        }

        // Otherwise fetch from dataUrl
        if (file.dataUrl) {
            setIsLoading(true);
            fetch(file.dataUrl)
                .then(res => res.text())
                .then(text => {
                    setLocalContent(text);
                    if (onLoad) onLoad(text);
                    setIsLoading(false);
                })
                .catch(err => {
                    console.error("Failed to load text content", err);
                    setLocalContent("Failed to load file content.");
                    setIsLoading(false);
                });
        }
    }, [file, content, onLoad]);

    useEffect(() => {
        if (isEditable && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [isEditable]);

    const displayContent = content ?? localContent;

    return (
        <div className="w-full h-full relative group">
            {isLoading ? (
                <div className="flex items-center justify-center h-full text-white/50">
                    <Loader2 className="animate-spin mr-2" /> Loading content...
                </div>
            ) : isEditable ? (
                <textarea
                    ref={textareaRef}
                    value={displayContent || ''}
                    onChange={(e) => onChange && onChange(e.target.value)}
                    className="w-full h-full p-4 sm:p-8 pt-24 pb-24 bg-transparent text-sm font-mono text-white/90 whitespace-pre-wrap break-all outline-none resize-none custom-scrollbar"
                    spellCheck={false}
                />
            ) : (
                <div className="w-full h-full p-4 sm:p-8 pt-24 pb-24 overflow-auto custom-scrollbar select-text cursor-text">
                    <div className="max-w-4xl mx-auto bg-white/5 rounded-lg p-6 backdrop-blur-md border border-white/10 shadow-xl min-h-[50vh]">
                        <pre className="text-sm font-mono text-white/90 whitespace-pre-wrap break-all">
                            {displayContent}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};
