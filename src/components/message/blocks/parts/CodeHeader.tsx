import React from 'react';
import { Check, Copy, Maximize2, ChevronDown, ChevronUp, Download, Expand, Sidebar, Play, Loader2 } from 'lucide-react';
import { MESSAGE_BLOCK_BUTTON_CLASS } from '../../../../constants/appConstants';
import { LanguageIcon } from '../../code-block/LanguageIcon';
import { translations } from '../../../../utils/translations';

interface CodeHeaderProps {
    language: string;
    showPreview: boolean;
    isOverflowing: boolean;
    isExpanded: boolean;
    isCopied: boolean;
    onToggleExpand: () => void;
    onCopy: () => void;
    onDownload: () => void;
    onOpenSide: () => void;
    onFullscreen: (trueFullscreen: boolean) => void;
    t: (key: keyof typeof translations) => string;
    // New props for execution
    canRun?: boolean;
    isRunning?: boolean;
    onRun?: () => void;
}

export const CodeHeader: React.FC<CodeHeaderProps> = ({
    language,
    showPreview,
    isOverflowing,
    isExpanded,
    isCopied,
    onToggleExpand,
    onCopy,
    onDownload,
    onOpenSide,
    onFullscreen,
    t,
    canRun,
    isRunning,
    onRun
}) => {
    const headerButtonClass = `${MESSAGE_BLOCK_BUTTON_CLASS} !min-h-10 !min-w-10 !rounded-md !p-0 !opacity-90 hover:!opacity-100 hover:bg-[var(--theme-bg-tertiary)]/40`;
    const runButtonClass = `${headerButtonClass} ${isRunning ? 'text-[var(--theme-text-link)]' : 'text-emerald-500 hover:text-emerald-400'} !bg-transparent`;

    return (
        <div className="sticky top-0 z-30 flex items-center justify-between gap-2 rounded-t-lg border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-code-block-header)]/95 px-3 py-0 backdrop-blur-md transition-all">
            <div className="flex min-w-0 items-center gap-1 pl-0.5">
                <LanguageIcon language={language} />
            </div>
            
            <div
                data-code-header-toolbar
                className="flex flex-shrink-0 items-center gap-0.5"
            >
                {canRun && onRun && (
                    <button 
                        className={runButtonClass}
                        title="Run Python Code" 
                        onClick={onRun}
                        disabled={isRunning}
                    > 
                        {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} strokeWidth={2.5} fill="currentColor" />} 
                    </button>
                )}
                
                {showPreview && (
                    <>
                        <button className={headerButtonClass} title="Open in Side Panel" onClick={onOpenSide}>
                            <Sidebar size={16} strokeWidth={2} />
                        </button>
                        <button className={headerButtonClass} title={t('code_fullscreen_monitor')} onClick={() => onFullscreen(true)}> 
                            <Expand size={16} strokeWidth={2} /> 
                        </button>
                        <button className={headerButtonClass} title={t('code_fullscreen_modal')} onClick={() => onFullscreen(false)}> 
                            <Maximize2 size={16} strokeWidth={2} /> 
                        </button>
                    </>
                )}
                <button className={headerButtonClass} title={`Download ${language.toUpperCase()}`} onClick={onDownload}> 
                    <Download size={16} strokeWidth={2} /> 
                </button>
                 <button className={headerButtonClass} title={isCopied ? t('copied_button_title') : t('copy_button_title')} onClick={onCopy}>
                    {isCopied ? <Check size={16} className="text-[var(--theme-text-success)] icon-animate-pop" strokeWidth={2} /> : <Copy size={16} strokeWidth={2} />}
                </button>
                {isOverflowing && (
                    <button onClick={onToggleExpand} className={headerButtonClass} aria-expanded={isExpanded} title={isExpanded ? 'Collapse' : 'Expand'}>
                        {isExpanded ? <ChevronUp size={16} strokeWidth={2} /> : <ChevronDown size={16} strokeWidth={2} />}
                    </button>
                )}
            </div>
        </div>
    );
};
