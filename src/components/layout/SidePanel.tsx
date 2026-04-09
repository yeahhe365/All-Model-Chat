
import React, { Suspense, lazy, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Code, Eye, Download, FileCode2, LucideIcon } from 'lucide-react';
import { SideViewContent } from '../../types';
import { triggerDownload, sanitizeFilename } from '../../utils/exportUtils';
import { CodeEditor } from '../shared/CodeEditor';
import { useIsMobile } from '../../hooks/useDevice';
import { getTranslator } from '../../utils/appUtils';
import { useSettingsStore } from '../../stores/settingsStore';

const MermaidBlock = lazy(async () => {
    const module = await import('../message/blocks/MermaidBlock');
    return { default: module.MermaidBlock };
});

const GraphvizBlock = lazy(async () => {
    const module = await import('../message/blocks/GraphvizBlock');
    return { default: module.GraphvizBlock };
});

interface SidePanelProps {
    content: SideViewContent | null;
    onClose: () => void;
    themeId: string;
}

type SidePanelTab = 'code' | 'preview';

interface SidePanelTabButtonProps {
    id: SidePanelTab;
    icon: LucideIcon;
    label: string;
    activeTab: SidePanelTab;
    onSelect: (tab: SidePanelTab) => void;
}

const SidePanelTabButton: React.FC<SidePanelTabButtonProps> = ({ id, icon: Icon, label, activeTab, onSelect }) => (
    <button
        type="button"
        onClick={() => onSelect(id)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            activeTab === id
                ? 'bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] shadow-sm'
                : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-secondary)]/50'
        }`}
        title={label}
        aria-label={label}
    >
        <Icon size={14} strokeWidth={1.5} />
        <span className="hidden sm:inline">{label}</span>
    </button>
);

export const SidePanel: React.FC<SidePanelProps> = ({ content, onClose, themeId }) => {
    // Initialize with content immediately to ensure iframe has srcDoc on first render
    const [localCode, setLocalCode] = useState(content?.content || '');
    const [debouncedCode, setDebouncedCode] = useState(content?.content || '');
    const [activeTab, setActiveTab] = useState<SidePanelTab>('preview');
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Resizing State
    const [width, setWidth] = useState(600);
    const [isResizing, setIsResizing] = useState(false);
    const isResizingRef = useRef(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

    const isMobile = useIsMobile();
    const language = useSettingsStore(s => s.language);
    const t = useMemo(() => getTranslator(language), [language]);
    
    // Debounce code updates for preview to avoid excessive rendering during edits
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedCode(localCode);
        }, 1000);
        return () => clearTimeout(timer);
    }, [localCode]);

    // Resizing Logic
    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
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
            document.body.style.userSelect = 'none';
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

    const handleDownload = () => {
        const ext = content.type === 'html' ? 'html' : content.type === 'mermaid' ? 'mmd' : 'txt';
        const blob = new Blob([localCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        triggerDownload(url, `${sanitizeFilename(content.title || 'snippet')}.${ext}`);
    };

    const renderPreview = () => {
        if (content.type === 'html') {
            return (
                <div className="w-full h-full relative bg-[var(--theme-bg-primary)]">
                    <iframe
                        ref={iframeRef}
                        className="w-full h-full border-0 block"
                        // SECURITY: Removed allow-same-origin to prevent access to localStorage/parent DOM
                        // Added allow-downloads to match main preview capabilities
                        sandbox="allow-scripts allow-forms allow-popups allow-modals allow-downloads"
                        title={t('sidepanel_live_preview_title')}
                        srcDoc={debouncedCode}
                    />
                </div>
            );
        }
        if (content.type === 'mermaid') {
            return (
                <div className="w-full h-full overflow-auto bg-[var(--theme-bg-primary)] p-4 flex items-center justify-center">
                    <Suspense fallback={<div className="w-full" />}>
                        <div className="w-full flex justify-center">
                            <MermaidBlock 
                                code={debouncedCode} 
                                onImageClick={() => {}} 
                                isLoading={false} 
                                themeId={themeId} 
                                onOpenSidePanel={() => {}} 
                            />
                        </div>
                    </Suspense>
                </div>
            );
        }
        if (content.type === 'graphviz') {
            return (
                <div className="w-full h-full overflow-auto bg-[var(--theme-bg-primary)] p-4 flex items-center justify-center">
                    <Suspense fallback={<div className="w-full" />}>
                        <div className="w-full flex justify-center">
                            <GraphvizBlock 
                                code={debouncedCode} 
                                onImageClick={() => {}} 
                                isLoading={false} 
                                themeId={themeId} 
                                onOpenSidePanel={() => {}} 
                            />
                        </div>
                    </Suspense>
                </div>
            );
        }
        return <div className="p-4 text-[var(--theme-text-tertiary)] flex items-center justify-center h-full">{t('sidepanel_preview_unsupported')}</div>;
    };

    const editorLanguage = content.language || (
        content.type === 'html' ? 'html' :
        content.type === 'mermaid' ? 'mermaid' :
        content.type === 'graphviz' ? 'dot' :
        content.type === 'svg' ? 'xml' : 'plaintext'
    );

    // Determine preview label and icon
    const isHtml = content.type === 'html';

    const PreviewIcon = isHtml ? FileCode2 : Eye;
    const previewLabel = isHtml ? "HTML" : t('preview');
    const codeLabel = t('code');

    return (
        <>
            {isResizing && (
                <div 
                    className="fixed inset-0 z-[9999] bg-transparent cursor-col-resize"
                    style={{ touchAction: 'none' }}
                />
            )}

            <div 
                ref={sidebarRef}
                className={`
                    h-full flex flex-col bg-[var(--theme-bg-secondary)] border-l border-[var(--theme-border-primary)] shadow-2xl relative transition-none flex-shrink-0 z-40 slide-in-right-animate
                    ${isMobile ? 'fixed inset-0 w-full z-[3000]' : ''} 
                `}
                style={{ width: isMobile ? '100%' : `${width}px` }}
            >
                {/* Resize Handle - Desktop Only */}
                {!isMobile && (
                    <div
                        onMouseDown={startResizing}
                        className={`
                            absolute left-0 top-0 bottom-0 w-1.5 -ml-0.5 z-50 cursor-col-resize 
                            flex items-center justify-center group transition-colors hover:bg-[var(--theme-bg-accent)]
                            ${isResizing ? 'bg-[var(--theme-bg-accent)]' : 'bg-transparent'}
                        `}
                        title={t('sidepanel_resize_title')}
                        aria-label={t('sidepanel_resize_title')}
                    />
                )}

                {/* Unified Header */}
                <div className="flex items-center justify-between px-4 h-14 border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] flex-shrink-0">
                    {/* Left: Tabs */}
                    <div className="flex bg-[var(--theme-bg-input)] p-1 rounded-lg border border-[var(--theme-border-secondary)] flex-shrink-0">
                        <SidePanelTabButton id="preview" icon={PreviewIcon} label={previewLabel} activeTab={activeTab} onSelect={setActiveTab} />
                        <SidePanelTabButton id="code" icon={Code} label={codeLabel} activeTab={activeTab} onSelect={setActiveTab} />
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button type="button" onClick={handleDownload} className="p-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors" title={t('sidepanel_download_title')} aria-label={t('sidepanel_download_title')}>
                            <Download size={16} strokeWidth={1.5} />
                        </button>
                        <button type="button" onClick={onClose} className="p-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors" title={t('sidepanel_close_title')} aria-label={t('sidepanel_close_title')}>
                            <X size={18} strokeWidth={1.5} />
                        </button>
                    </div>
                </div>

                {/* Content Body */}
                <div className="flex-grow flex flex-col min-h-0 bg-[var(--theme-bg-primary)] relative">
                    <div className={`absolute inset-0 transition-opacity duration-200 ${activeTab === 'code' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                        <CodeEditor 
                            value={localCode}
                            onChange={setLocalCode}
                            language={editorLanguage}
                        />
                    </div>
                    <div className={`absolute inset-0 transition-opacity duration-200 ${activeTab === 'preview' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                        {renderPreview()}
                    </div>
                </div>
            </div>
        </>
    );
};
