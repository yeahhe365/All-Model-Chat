
import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { UploadedFile } from '../../../types';

interface TextFileViewerProps {
    file: UploadedFile;
}

export const TextFileViewer: React.FC<TextFileViewerProps> = ({ file }) => {
    const [textContent, setTextContent] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (file.dataUrl) {
            setIsLoading(true);
            fetch(file.dataUrl)
                .then(res => res.text())
                .then(text => {
                    setTextContent(text);
                    setIsLoading(false);
                })
                .catch(err => {
                    console.error("Failed to load text content", err);
                    setTextContent("Failed to load file content.");
                    setIsLoading(false);
                });
        }
    }, [file]);

    return (
        <div className="w-full h-full p-4 sm:p-8 pt-24 pb-24 overflow-auto custom-scrollbar select-text cursor-text">
            <div className="max-w-4xl mx-auto bg-white/5 rounded-lg p-6 backdrop-blur-md border border-white/10 shadow-xl min-h-[50vh]">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40 text-white/50">
                        <Loader2 className="animate-spin mr-2" /> Loading content...
                    </div>
                ) : (
                    <pre className="text-sm font-mono text-white/90 whitespace-pre-wrap break-all">
                        {textContent}
                    </pre>
                )}
            </div>
        </div>
    );
};
