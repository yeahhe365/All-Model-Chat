
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Code, Eye, Download } from 'lucide-react';
import { SideViewContent } from '../../types';
import { MermaidBlock } from '../message/MermaidBlock';
import { GraphvizBlock } from '../message/GraphvizBlock';
import { triggerDownload, sanitizeFilename } from '../../utils/exportUtils';
import { CodeEditor } from '../shared/CodeEditor';

interface SidePanelProps {
    content: SideViewContent | null;
    onClose: () => void;
    themeId: string;
}

export const SidePanel: React.FC<SidePanelProps> = ({ content, onClose, themeId }) => {
    const [localCode, setLocalCode] = useState('');
    const [activeTab, setActiveTab] = useState<'code' | 'preview'>('preview');
    const [renderKey, setRenderKey] = useState(0); // Force re-render of preview
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Resizing State
    const [width, setWidth] = useState(500);
    const [isResizing, setIsResizing] = useState(false);
    const isResizingRef = useRef(false); // Ref for event handler to avoid stale closures
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Sync local code when content prop changes
    useEffect(() => {
        if (content) {
            setLocalCode(content.content);
            setRenderKey(prev => prev + 1);
        }
    }, [content]);

    // Handle HTML updates in Iframe
    useEffect(() => {
        if (content?.type === 'html' && iframeRef.current) {
            const doc = iframeRef.current.contentDocument;
            if (doc) {
                doc.open();
                doc.write(localCode);
                doc.close();
            }
        }
    }, [localCode, renderKey, content?.type]);

    // Resizing Logic
    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault(); // Prevent text selection
        setIsResizing(true);
        isResizingRef.current = true;
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
        isResizingRef.current = false;
    }, []);

    const resize = useCallback((mouseEvent: MouseEvent) => {
        if (isResizingRef.current) {
            const newWidth = window.innerWidth - mouseEvent.clientX;
            // Constraints: Min 300px, Max 90% of screen
            if (newWidth > 300 && newWidth < window.innerWidth * 0.9) {
                setWidth(newWidth);
            }
        }
    }, []);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none'; // Prevent text selection
        } else {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing, resize, stopResizing]);

    if (!content) return null;

    const handleRun = () => {
        setRenderKey(prev => prev + 1);
    };

    const handleDownload = () => {
        const ext = content.type === 'html' ? 'html' : content.type === 'mermaid' ? 'mmd' : 'txt';
        const blob = new Blob([localCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        triggerDownload(url, `${sanitizeFilename(content.title || 'snippet')}.${ext}`);
    };

    const renderPreview = () => {
        if (content.type === 'html') {
            return (
                <div className="w-full h-full relative">
                    <iframe
                        ref={iframeRef}
                        className="w-full h-full bg-white border-0"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                        title="Live Preview"
                    />
                </div>
            );
        }
        if (content.type === 'mermaid') {
            return (
                <div className="w-full h-full overflow-auto bg-white dark:bg-[#0d1117] p-4 flex items-center justify-center">
                    <div className="w-full">
                        <MermaidBlock 
                            key={renderKey} // Force remount on run
                            code={localCode} 
                            onImageClick={() => {}} 
                            isLoading={false} 
                            themeId={themeId} 
                            onOpenSidePanel={() => {}} // No-op to prevent recursion
                        />
                    </div>
                </div>
            );
        }
        if (content.type === 'graphviz') {
            return (
                <div className="w-full h-full overflow-auto bg-white dark:bg-[#0d1117] p-4 flex items-center justify-center">
                    <div className="w-full">
                        <GraphvizBlock 
                            key={renderKey}
                            code={localCode} 
                            onImageClick={() => {}} 
                            isLoading={false} 
                            themeId={themeId} 
                            onOpenSidePanel={() => {}} // No-op to prevent recursion
                        />
                    </div>
                </div>
            );
        }
        return <div className="p-4 text-[var(--theme-text-tertiary)]">Preview not supported for this type.</div>;
    };

    const TabButton = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === id 
                ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)]' 
                : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]'
            }`}
        >
            <Icon size={14} />
            <span className="hidden xl:inline">{label}</span>
        </button>
    );

    const editorLanguage = content.language || (
        content.type === 'html' ? 'html' :
        content.type === 'mermaid' ? 'mermaid' :
        content.type === 'graphviz' ? 'dot' :
        content.type === 'svg' ? 'xml' : 'plaintext'
    );

    return (
        <>
            {/* Global Overlay to trap events during resize anywhere on screen */}
            {isResizing && (
                <div 
                    className="fixed inset-0 z-[9999] bg-transparent cursor-col-resize"
                    style={{ touchAction: 'none' }}
                />
            )}

            <div 
                ref={sidebarRef}
                className="h-full flex flex-col bg-[var(--theme-bg-secondary)] border-l border-[var(--theme-border-primary)] shadow-xl relative transition-none flex-shrink-0"
                style={{ width: `${width}px` }}
            >
                {/* Resize Handle */}
                <div
                    onMouseDown={startResizing}
                    className={`
                        absolute left-0 top-0 bottom-0 w-4 -ml-2 z-50 cursor-col-resize 
                        flex items-center justify-center group
                        bg-transparent hover:bg-transparent
                    `}
                    title="Drag to resize"
                >
                    {/* Visual Line */}
                    <div className={`h-full w-[1px] bg-[var(--theme-border-primary)] group-hover:bg-[var(--theme-bg-accent)] transition-colors ${isResizing ? 'bg-[var(--theme-bg-accent)]' : ''}`} />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)]">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-sm font-semibold text-[var(--theme-text-primary)] truncate" title={content.title}>
                            {content.title || 'Workbench'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] uppercase tracking-wider font-bold">
                            {content.type}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={handleDownload} className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors" title="Download Code">
                            <Download size={16} />
                        </button>
                        <button onClick={onClose} className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex items-center justify-between p-2 border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)]">
                    <div className="flex gap-1 bg-[var(--theme-bg-input)] p-1 rounded-lg border border-[var(--theme-border-secondary)]">
                        <TabButton id="code" icon={Code} label="Code" />
                        <TabButton id="preview" icon={Eye} label="Preview" />
                    </div>
                    <button 
                        onClick={handleRun}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-sm active:scale-95"
                    >
                        <Play size={14} fill="currentColor" />
                        Run / Update
                    </button>
                </div>

                {/* Content Body */}
                <div className="flex-grow flex flex-col min-h-0 bg-[var(--theme-bg-primary)]">
                    {activeTab === 'code' ? (
                        <CodeEditor 
                            value={localCode}
                            onChange={setLocalCode}
                            language={editorLanguage}
                        />
                    ) : (
                        <div className="w-full h-full relative">
                            {renderPreview()}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
