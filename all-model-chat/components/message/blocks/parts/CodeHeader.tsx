
import React from 'react';
import { Check, Copy, Maximize2, ChevronDown, ChevronUp, Download, Expand, Sidebar, Play, Loader2 } from 'lucide-react';
import { MESSAGE_BLOCK_BUTTON_CLASS } from '../../../../constants/appConstants';
import { LanguageIcon } from '../../code-block/LanguageIcon';
import { translations } from '../../../../utils/appUtils';

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
    return (
        <div className="sticky top-0 z-30 flex items-center justify-between px-3 py-2 bg-[var(--theme-bg-code-block)]/95 backdrop-blur-md rounded-t-lg transition-all border-b border-[var(--theme-border-primary)]/50">
            <div className="flex items-center gap-2 pl-1 min-w-0">
                <LanguageIcon language={language} />
            </div>
            
            <div className="flex items-center gap-1 flex-shrink-0">
                {canRun && onRun && (
                    <button 
                        className={`
                            ${MESSAGE_BLOCK_BUTTON_CLASS} 
                            ${isRunning ? 'text-[var(--theme-text-link)]' : 'text-green-500 hover:text-green-600'}
                            bg-[var(--theme-bg-tertiary)]/50 mr-2
                        `} 
                        title="Run Python Code" 
                        onClick={onRun}
                        disabled={isRunning}
                    > 
                        {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} strokeWidth={2.5} fill="currentColor" />} 
                    </button>
                )}
                
                {showPreview && (
                    <>
                        <button className={MESSAGE_BLOCK_BUTTON_CLASS} title="Open in Side Panel" onClick={onOpenSide}>
                            <Sidebar size={14} strokeWidth={2} />
                        </button>
                        <button className={MESSAGE_BLOCK_BUTTON_CLASS} title={t('code_fullscreen_monitor')} onClick={() => onFullscreen(true)}> 
                            <Expand size={14} strokeWidth={2} /> 
                        </button>
                        <button className={MESSAGE_BLOCK_BUTTON_CLASS} title={t('code_fullscreen_modal')} onClick={() => onFullscreen(false)}> 
                            <Maximize2 size={14} strokeWidth={2} /> 
                        </button>
                    </>
                )}
                <button className={MESSAGE_BLOCK_BUTTON_CLASS} title={`Download ${language.toUpperCase()}`} onClick={onDownload}> 
                    <Download size={14} strokeWidth={2} /> 
                </button>
                 <button className={MESSAGE_BLOCK_BUTTON_CLASS} title={isCopied ? t('copied_button_title') : t('copy_button_title')} onClick={onCopy}>
                    {isCopied ? <Check size={14} className="text-[var(--theme-text-success)] icon-animate-pop" strokeWidth={2} /> : <Copy size={14} strokeWidth={2} />}
                </button>
                {isOverflowing && (
                    <button onClick={onToggleExpand} className={MESSAGE_BLOCK_BUTTON_CLASS} aria-expanded={isExpanded} title={isExpanded ? 'Collapse' : 'Expand'}>
                        {isExpanded ? <ChevronUp size={14} strokeWidth={2} /> : <ChevronDown size={14} strokeWidth={2} />}
                    </button>
                )}
            </div>
        </div>
    );
};
