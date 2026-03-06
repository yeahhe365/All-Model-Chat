
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { UploadedFile } from '../../../types';

interface TextFileViewerProps {
    file: UploadedFile;
    content?: string | null;
    isEditable?: boolean;
    onChange?: (value: string) => void;
    onLoad?: (content: string) => void;
}

const ROW_HEIGHT = 21; // 14px font size * 1.5 line height
const PADDING_Y = 96; // 24 * 4 = 96px (pt-24 equivalent)

const VirtualTextViewer: React.FC<{ file: UploadedFile; content?: string }> = ({ file, content }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(600);
    const [lineOffsets, setLineOffsets] = useState<number[]>([]);
    const [visibleLines, setVisibleLines] = useState<string[]>([]);
    const [blob, setBlob] = useState<Blob | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const init = async () => {
            setIsLoading(true);
            let targetBlob: Blob;
            if (content) {
                targetBlob = new Blob([content]);
            } else if (file.rawFile) {
                targetBlob = file.rawFile;
            } else if (file.dataUrl) {
                try {
                    targetBlob = await fetch(file.dataUrl).then(r => r.blob());
                } catch (e) {
                    console.error("Failed to fetch blob", e);
                    if (isMounted) setIsLoading(false);
                    return;
                }
            } else {
                if (isMounted) setIsLoading(false);
                return;
            }
            
            if (!isMounted) return;
            setBlob(targetBlob);

            // Build line index
            const offsets = [0];
            const CHUNK_SIZE = 1024 * 1024 * 10; // 10MB chunks
            let offset = 0;
            while (offset < targetBlob.size) {
                const chunk = targetBlob.slice(offset, offset + CHUNK_SIZE);
                const buffer = await chunk.arrayBuffer();
                const view = new Uint8Array(buffer);
                for (let i = 0; i < view.length; i++) {
                    if (view[i] === 10) { // \n
                        offsets.push(offset + i + 1);
                    }
                }
                offset += CHUNK_SIZE;
            }
            if (!isMounted) return;
            setLineOffsets(offsets);
            setIsLoading(false);
        };
        init();
        return () => { isMounted = false; };
    }, [file, content]);

    useEffect(() => {
        if (!containerRef.current) return;
        
        const updateHeight = () => {
             if (containerRef.current) setViewportHeight(containerRef.current.clientHeight);
        };
        
        updateHeight();
        
        const observer = new ResizeObserver(updateHeight);
        observer.observe(containerRef.current);
        
        return () => observer.disconnect();
    }, []);

    const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    const totalLines = lineOffsets.length > 0 ? lineOffsets.length : 0;
    const totalHeight = totalLines * ROW_HEIGHT + PADDING_Y * 2;

    const buffer = 15;
    const effectiveScrollTop = Math.max(0, scrollTop - PADDING_Y);
    const startIndex = Math.max(0, Math.floor(effectiveScrollTop / ROW_HEIGHT) - buffer);
    const endIndex = Math.min(Math.max(0, totalLines - 1), Math.ceil((effectiveScrollTop + viewportHeight) / ROW_HEIGHT) + buffer);

    useEffect(() => {
        if (!blob || lineOffsets.length === 0) return;
        let isMounted = true;

        const startByte = lineOffsets[startIndex];
        const endByte = endIndex + 1 < lineOffsets.length ? lineOffsets[endIndex + 1] : blob.size;

        blob.slice(startByte, endByte).text().then(text => {
            if (!isMounted) return;
            const lines = text.split(/\r\n|\r|\n/);
            const expectedLength = endIndex - startIndex + 1;
            if (lines.length > expectedLength) {
                lines.length = expectedLength;
            }
            setVisibleLines(lines);
        });

        return () => { isMounted = false; };
    }, [blob, lineOffsets, startIndex, endIndex]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center w-full h-full text-white/50">
                <Loader2 className="animate-spin mr-2" /> Indexing large file...
            </div>
        );
    }

    const visibleLinesElements = [];
    for (let i = startIndex; i <= endIndex; i++) {
        visibleLinesElements.push(
            <div 
                key={i} 
                className="absolute left-1/2 -translate-x-1/2 w-full max-w-5xl px-8 whitespace-pre font-mono text-sm leading-[21px] text-white/90"
                style={{ top: PADDING_Y + i * ROW_HEIGHT, height: ROW_HEIGHT }}
            >
                {visibleLines[i - startIndex] || ''}
            </div>
        );
    }

    return (
        <div 
            ref={containerRef}
            className="w-full h-full overflow-auto custom-scrollbar relative"
            onScroll={onScroll}
        >
            <div style={{ height: totalHeight, minWidth: '100%' }} className="relative">
                {visibleLinesElements}
            </div>
        </div>
    );
};

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

    // Use virtualization for files larger than ~50KB to prevent freezing
    const isLargeFile = file.size > 50000 || (content?.length || 0) > 50000;

    useEffect(() => {
        // If content is provided (e.g. from parent state during edit), use it
        if (content !== undefined && content !== null) {
            setLocalContent(content);
            return;
        }

        if (isLargeFile) {
            // Don't fetch the whole text into memory for large files.
            // VirtualTextViewer will handle it.
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
    }, [file, content, onLoad, isLargeFile]);

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
            ) : isLargeFile ? (
                <VirtualTextViewer file={file} content={displayContent || undefined} />
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
