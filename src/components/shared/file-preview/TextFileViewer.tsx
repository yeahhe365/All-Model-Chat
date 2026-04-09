
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { UploadedFile } from '../../../types';
import { translations } from '../../../utils/appUtils';

interface TextFileViewerProps {
    file: UploadedFile;
    content?: string | null;
    isEditable?: boolean;
    onChange?: (value: string) => void;
    onLoad?: (content: string) => void;
    t: (key: keyof typeof translations) => string;
}

const ROW_HEIGHT = 21; // 14px font size * 1.5 line height
const PADDING_Y = 96; // 24 * 4 = 96px (pt-24 equivalent)

const VirtualTextViewer: React.FC<{ content: string }> = ({ content }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(600);

    // Split content into lines. Memoize to prevent expensive splits on re-renders.
    const lines = useMemo(() => content.split(/\r\n|\r|\n/), [content]);
    const widestLineChars = useMemo(
        () => lines.reduce((max, line) => Math.max(max, line.length), 0),
        [lines]
    );
    const totalHeight = lines.length * ROW_HEIGHT + PADDING_Y * 2;

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

    const buffer = 15;
    // Calculate start index based on scroll position minus top padding
    const effectiveScrollTop = Math.max(0, scrollTop - PADDING_Y);
    const startIndex = Math.max(0, Math.floor(effectiveScrollTop / ROW_HEIGHT) - buffer);
    const endIndex = Math.min(lines.length - 1, Math.ceil((effectiveScrollTop + viewportHeight) / ROW_HEIGHT) + buffer);

    const visibleLines = [];
    for (let i = startIndex; i <= endIndex; i++) {
        visibleLines.push(
            <div 
                key={i} 
                className="absolute left-0 px-8 whitespace-pre font-mono text-sm leading-[21px] text-white/90 min-w-full w-max"
                style={{ top: PADDING_Y + i * ROW_HEIGHT, height: ROW_HEIGHT }}
            >
                {lines[i]}
            </div>
        );
    }

    return (
        <div 
            ref={containerRef}
            className="w-full h-full overflow-auto custom-scrollbar relative"
            onScroll={onScroll}
        >
            <div
                style={{
                    height: totalHeight,
                    minWidth: '100%',
                    width: `max(100%, calc(${Math.max(widestLineChars, 1)}ch + 4rem))`,
                }}
                className="relative"
            >
                {visibleLines}
            </div>
        </div>
    );
};

export const TextFileViewer: React.FC<TextFileViewerProps> = ({ 
    file,
    content,
    isEditable = false,
    onChange,
    onLoad,
    t
}) => (
    <TextFileViewerContent
        key={file.id}
        file={file}
        content={content}
        isEditable={isEditable}
        onChange={onChange}
        onLoad={onLoad}
        t={t}
    />
);

const TextFileViewerContent: React.FC<TextFileViewerProps> = ({
    file, 
    content, 
    isEditable = false, 
    onChange,
    onLoad,
    t
}) => {
    const [localContent, setLocalContent] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (content !== undefined && content !== null) return;

        // Otherwise fetch from dataUrl
        if (file.dataUrl) {
            fetch(file.dataUrl)
                .then(res => res.text())
                .then(text => {
                    setLocalContent(text);
                    if (onLoad) onLoad(text);
                })
                .catch(err => {
                    console.error("Failed to load text content", err);
                    setLocalContent(t('textViewer_load_error'));
                });
        }
    }, [file, content, onLoad, t]);

    useEffect(() => {
        if (isEditable && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [isEditable]);

    const displayContent = content ?? localContent;
    const isLoading = content === undefined || content === null
        ? localContent === null && !!file.dataUrl
        : false;
    // Use virtualization for files larger than ~50KB to prevent freezing
    const isLargeFile = (displayContent?.length || 0) > 50000;

    return (
        <div className="w-full h-full relative group">
            {isLoading ? (
                <div className="flex items-center justify-center h-full text-white/50">
                    <Loader2 className="animate-spin mr-2" /> {t('textViewer_loading')}
                </div>
            ) : isEditable ? (
                <textarea
                    ref={textareaRef}
                    value={displayContent || ''}
                    onChange={(e) => onChange && onChange(e.target.value)}
                    className="w-full h-full p-4 sm:p-8 pt-24 pb-24 bg-transparent text-sm font-mono text-white/90 outline-none resize-none custom-scrollbar overflow-auto"
                    spellCheck={false}
                    wrap="off"
                />
            ) : isLargeFile ? (
                <VirtualTextViewer content={displayContent || ''} />
            ) : (
                <div className="w-full h-full p-4 sm:p-8 pt-24 pb-24 overflow-auto custom-scrollbar select-text cursor-text">
                    <div className="inline-block min-w-full w-max bg-white/5 rounded-lg p-6 backdrop-blur-md border border-white/10 shadow-xl min-h-[50vh] align-top">
                        <pre className="text-sm font-mono text-white/90 whitespace-pre min-w-full w-max m-0">
                            {displayContent}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};
