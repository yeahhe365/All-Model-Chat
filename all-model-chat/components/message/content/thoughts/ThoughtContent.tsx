
import React from 'react';
import { MarkdownRenderer } from '../../MarkdownRenderer';
import { SideViewContent, UploadedFile } from '../../../../types';

interface ThoughtContentProps {
    isLoading: boolean;
    lastThought: { title: string; content: string; isFallback: boolean } | null;
    thinkingTimeMs?: number;
    content: string;
    onImageClick: (file: UploadedFile) => void;
    onOpenHtmlPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void;
    expandCodeBlocksByDefault: boolean;
    isMermaidRenderingEnabled: boolean;
    isGraphvizRenderingEnabled: boolean;
    t: (key: any, fallback?: string) => string;
    themeId: string;
    onOpenSidePanel: (content: SideViewContent) => void;
}

export const ThoughtContent: React.FC<ThoughtContentProps> = ({
    isLoading,
    lastThought,
    thinkingTimeMs,
    content,
    onImageClick,
    onOpenHtmlPreview,
    expandCodeBlocksByDefault,
    isMermaidRenderingEnabled,
    isGraphvizRenderingEnabled,
    t,
    themeId,
    onOpenSidePanel
}) => {
    return (
        <div className="px-3 pb-3 pt-2 border-t border-[var(--theme-border-secondary)]/50 animate-in fade-in slide-in-from-top-2 duration-300 text-xs relative">
            {isLoading && lastThought && thinkingTimeMs === undefined && (
                <div className="mb-2 p-2 rounded-md bg-[var(--theme-bg-input)]/50 border border-[var(--theme-border-secondary)]/50 flex items-start gap-2">
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--theme-text-success)] text-[var(--theme-text-success)] animate-pulse flex-shrink-0 shadow-[0_0_8px_currentColor]" />
                    <div className="min-w-0">
                        <span className="block text-xs font-semibold text-[var(--theme-text-primary)] mb-0.5">{lastThought.title}</span>
                        <span className="block text-[11px] text-[var(--theme-text-tertiary)] line-clamp-2 leading-normal">{lastThought.content}</span>
                    </div>
                </div>
            )}

            <div className="prose prose-sm max-w-none dark:prose-invert text-[var(--theme-text-secondary)] leading-relaxed markdown-body thought-process-content opacity-90">
                <MarkdownRenderer
                    content={content}
                    isLoading={isLoading}
                    onImageClick={onImageClick}
                    onOpenHtmlPreview={onOpenHtmlPreview}
                    expandCodeBlocksByDefault={expandCodeBlocksByDefault}
                    isMermaidRenderingEnabled={isMermaidRenderingEnabled}
                    isGraphvizRenderingEnabled={isGraphvizRenderingEnabled}
                    allowHtml={true}
                    t={t}
                    themeId={themeId}
                    onOpenSidePanel={onOpenSidePanel}
                />
            </div>
        </div>
    );
};
