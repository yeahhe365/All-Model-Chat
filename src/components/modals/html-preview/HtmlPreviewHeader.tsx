
import React from 'react';
import { Loader2, Download, Minimize, X, ZoomIn, ZoomOut, RotateCw, Image as ImageIcon, Expand, Atom } from 'lucide-react';
import { IconHtml5 } from '../../icons/CustomIcons';
import { translations } from '../../../utils/translations';

interface HtmlPreviewHeaderProps {
    title: string;
    scale: number;
    isTrueFullscreen: boolean;
    isPreviewReady: boolean;
    isScreenshotting: boolean;
    minZoom: number;
    maxZoom: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onRefresh: () => void;
    onDownload: () => void;
    onScreenshot: () => void;
    onToggleFullscreen: () => void;
    onClose: () => void;
    t: (key: keyof typeof translations | string, fallback?: string) => string;
}

export const HtmlPreviewHeader: React.FC<HtmlPreviewHeaderProps> = ({
    title,
    scale,
    isTrueFullscreen,
    isPreviewReady,
    isScreenshotting,
    minZoom,
    maxZoom,
    onZoomIn,
    onZoomOut,
    onRefresh,
    onDownload,
    onScreenshot,
    onToggleFullscreen,
    onClose,
    t
}) => {
    const isReactPreview = title.toLowerCase().includes('react');
    const HeaderIcon = isReactPreview ? Atom : IconHtml5;
    const iconBgClass = isReactPreview ? 'bg-cyan-500/10 text-cyan-500' : 'bg-orange-500/10';
    const subtitle = isReactPreview ? t('htmlPreview_react_app') : t('htmlPreview_title');
    const iconBtnClass = "p-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed";

    return (
        <header className="h-14 px-4 flex items-center justify-between gap-4 bg-[var(--theme-bg-primary)] border-b border-[var(--theme-border-secondary)] z-10 select-none">
            <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBgClass}`}>
                    <HeaderIcon size={20} />
                </div>
                <div className="flex flex-col min-w-0">
                    <h2 id="html-preview-modal-title" className="text-sm font-semibold text-[var(--theme-text-primary)] truncate" title={title}>
                        {title}
                    </h2>
                    <span className="text-[10px] text-[var(--theme-text-tertiary)] truncate">
                        {subtitle}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-1">
                {/* Zoom Controls */}
                <div className="hidden sm:flex items-center">
                    <button onClick={onZoomOut} className={iconBtnClass} disabled={scale <= minZoom} title={t('htmlPreview_zoom_out')}>
                        <ZoomOut size={18} strokeWidth={1.5} />
                    </button>
                    <span className="text-xs font-mono font-medium text-[var(--theme-text-secondary)] w-10 text-center select-none tabular-nums">
                        {Math.round(scale * 100)}%
                    </span>
                    <button onClick={onZoomIn} className={iconBtnClass} disabled={scale >= maxZoom} title={t('htmlPreview_zoom_in')}>
                        <ZoomIn size={18} strokeWidth={1.5} />
                    </button>
                </div>

                <div className="hidden sm:block w-px h-4 bg-[var(--theme-border-secondary)] mx-2" />

                {/* Action Controls */}
                <button onClick={onRefresh} className={iconBtnClass} title={t('htmlPreview_reload')}>
                    <RotateCw size={18} strokeWidth={1.5} />
                </button>
                <button onClick={onDownload} className={iconBtnClass} title={t('htmlPreview_download_html')}>
                    <Download size={18} strokeWidth={1.5} />
                </button>
                <button onClick={onScreenshot} className={iconBtnClass} disabled={!isPreviewReady || isScreenshotting} title={t('htmlPreview_screenshot')}>
                    {isScreenshotting ? <Loader2 size={18} className="animate-spin" strokeWidth={1.5} /> : <ImageIcon size={18} strokeWidth={1.5} />}
                </button>

                <div className="w-px h-4 bg-[var(--theme-border-secondary)] mx-2" />

                {/* Screen Mode Controls */}
                <button 
                    onClick={onToggleFullscreen} 
                    className={iconBtnClass}
                    title={isTrueFullscreen ? t('htmlPreview_exit_fullscreen') : t('htmlPreview_fullscreen')}
                >
                    {isTrueFullscreen ? <Minimize size={18} strokeWidth={1.5} /> : <Expand size={18} strokeWidth={1.5} />}
                </button>
                
                {!isTrueFullscreen && (
                    <button onClick={onClose} className="p-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-danger)]/10 hover:text-[var(--theme-text-danger)] rounded-lg transition-colors ml-1" title={t('htmlPreview_close')}>
                        <X size={20} strokeWidth={1.5} />
                    </button>
                )}
            </div>
        </header>
    );
};
