import React, { useMemo } from 'react';
import { ChevronDown, ChevronUp, X, Terminal, AlertTriangle, FileOutput, RotateCcw } from 'lucide-react';
import { SideViewContent } from '../../../types';
import { useCodeBlock } from '../../../hooks/ui/useCodeBlock';
import { usePyodide } from '@/features/local-python/usePyodide';
import { CodeHeader } from './parts/CodeHeader';
import { ArtifactFrame } from './ArtifactFrame';
import { extractTextFromNode } from '../../../utils/uiUtils';
import { isImageMimeType } from '../../../utils/fileTypeUtils';
import { FileDisplay } from '../FileDisplay';
import { useI18n } from '../../../contexts/I18nContext';
import { isLikelyHtml, isLiveArtifactInteractionLanguage, isLiveArtifactLanguage } from '../../../utils/codeUtils';
import type { LiveArtifactFollowupPayload } from '../../../utils/liveArtifactFollowup';
import { parseLiveArtifactInteractionSpec } from '../../../utils/liveArtifactInteraction';
import { LiveArtifactInteractionFrame } from './LiveArtifactInteractionFrame';

interface CodeBlockProps {
  children: React.ReactNode;
  cacheKey?: string;
  className?: string;
  onOpenHtmlPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void;
  expandCodeBlocksByDefault: boolean;
  onOpenSidePanel: (content: SideViewContent) => void;
  showPreviewControls?: boolean;
  isLoading?: boolean;
  onLiveArtifactFollowUp?: (payload: LiveArtifactFollowupPayload) => void;
}

export const CodeBlock: React.FC<CodeBlockProps> = (props) => {
  const { t } = useI18n();
  const {
    preRef,
    isExpanded,
    isOverflowing,
    isCopied,
    sourceLanguage,
    finalLanguage,
    showPreview,
    handleToggleExpand,
    handleCopy,
    handleOpenSide,
    handleFullscreenPreview,
    handleDownload,
    codeElement,
    resolvedCodeText,
    previewMarkupType,
    COLLAPSE_THRESHOLD_PX,
  } = useCodeBlock(props);

  const isPython = finalLanguage.toLowerCase() === 'python' || finalLanguage.toLowerCase() === 'py';

  // Extract raw code for execution
  const rawCode = useMemo(() => {
    if (!isPython) return '';
    if (codeElement) {
      return extractTextFromNode(codeElement.props.children);
    }
    return extractTextFromNode(props.children);
  }, [codeElement, props.children, isPython]);

  // Pyodide Execution Logic
  const { isRunning, output, image, files, error, hasRun, runCode, clearOutput, resetState } = usePyodide(
    props.cacheKey,
  );

  const handleRun = () => {
    if (rawCode) runCode(rawCode);
  };

  const generatedFiles = useMemo(() => {
    return files.map((f, i) => {
      const dataUrl = `data:${f.type};base64,${f.data}`;
      // Construct a temporary UploadedFile object for compatibility with FileDisplay
      return {
        id: `generated-file-${i}`,
        name: f.name,
        type: f.type,
        size: 0, // Size not critical here
        dataUrl: dataUrl,
        uploadState: 'active' as const,
      };
    });
  }, [files]);

  const displayInlineImage = image && !generatedFiles.some((file) => isImageMimeType(file.type));
  const isInteractive = props.showPreviewControls ?? true;
  const showPreviewControls = isInteractive && showPreview;
  const interactionSpec = useMemo(
    () =>
      isLiveArtifactInteractionLanguage(sourceLanguage) ? parseLiveArtifactInteractionSpec(resolvedCodeText) : null,
    [resolvedCodeText, sourceLanguage],
  );
  const showInlineHtmlPreview =
    showPreviewControls &&
    isLiveArtifactLanguage(sourceLanguage) &&
    previewMarkupType === 'html' &&
    isLikelyHtml(resolvedCodeText);

  if (isInteractive && interactionSpec) {
    return <LiveArtifactInteractionFrame spec={interactionSpec} onFollowUp={props.onLiveArtifactFollowUp} />;
  }

  if (showInlineHtmlPreview) {
    return (
      <ArtifactFrame
        html={resolvedCodeText}
        cacheKey={props.cacheKey}
        isLoading={props.isLoading}
        onFollowUp={props.onLiveArtifactFollowUp}
      />
    );
  }

  return (
    <div className="group relative my-3 rounded-lg border border-[var(--theme-border-primary)] bg-[var(--theme-bg-code-block)] shadow-sm">
      <CodeHeader
        language={finalLanguage}
        showPreview={showPreviewControls}
        isOverflowing={isOverflowing}
        isExpanded={isExpanded}
        isCopied={isCopied}
        onToggleExpand={handleToggleExpand}
        onCopy={handleCopy}
        onDownload={handleDownload}
        onOpenSide={handleOpenSide}
        onFullscreen={handleFullscreenPreview}
        // Execution Props
        canRun={isPython}
        isRunning={isRunning}
        onRun={handleRun}
      />

      <div className="relative">
        <pre
          ref={preRef}
          className={`${props.className} group !m-0 !p-0 !border-none !rounded-none !bg-transparent custom-scrollbar !overflow-x-auto`}
          style={{
            transition: 'max-height 0.3s ease-out',
            overflowY: isExpanded || !isOverflowing ? 'visible' : 'hidden',
            maxHeight: isExpanded || !isOverflowing ? 'none' : `${COLLAPSE_THRESHOLD_PX}px`,
          }}
        >
          {codeElement ? (
            React.cloneElement(codeElement as React.ReactElement, {
              className: `${codeElement.props.className || ''} !p-4 ${isOverflowing ? '!pb-14' : ''} !block font-mono text-[13px] sm:text-sm leading-relaxed !cursor-text`,
              onClick: undefined,
              title: undefined,
            })
          ) : (
            <span className={`block p-4 font-mono text-sm ${isOverflowing ? 'pb-14' : ''}`}>{props.children}</span>
          )}
        </pre>

        {isOverflowing && !isExpanded && (
          <div
            className="absolute bottom-0 left-0 right-0 h-20 select-none bg-gradient-to-t from-[var(--theme-bg-code-block)] to-transparent cursor-pointer flex items-end justify-center pb-2 group/expand code-block-expand-overlay"
            onClick={handleToggleExpand}
          >
            <span className="text-xs font-medium text-[var(--theme-text-tertiary)] group-hover/expand:text-[var(--theme-text-primary)] flex items-center gap-1 bg-[var(--theme-bg-primary)] px-3 py-1 rounded-full shadow-sm border border-[var(--theme-border-secondary)] transition-colors">
              <ChevronDown size={12} /> {t('code_show_more')}
            </span>
          </div>
        )}
        {isOverflowing && isExpanded && (
          <div className="absolute bottom-4 left-0 right-0 flex select-none justify-center pointer-events-none z-10 code-block-expand-overlay">
            <button
              onClick={handleToggleExpand}
              className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 bg-[var(--theme-bg-primary)] hover:bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-secondary)] rounded-full text-xs font-medium text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] shadow-sm transition-colors"
              title={t('code_collapse_block')}
            >
              <ChevronUp size={12} strokeWidth={2} /> {t('code_show_less')}
            </button>
          </div>
        )}
      </div>

      {/* Execution Console */}
      {hasRun && (
        <div className="border-t border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] rounded-b-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex select-none items-center justify-between px-3 py-1.5 bg-[var(--theme-bg-tertiary)]/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-1.5">
              <Terminal size={12} /> {t('code_local_python_output')}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={resetState}
                className="p-1 rounded-md text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-secondary)] transition-colors"
                title={t('code_reset_view')}
              >
                <RotateCcw size={12} />
              </button>
              <button
                onClick={clearOutput}
                className="p-1 rounded-md text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-secondary)] transition-colors"
                title={t('code_close_console')}
              >
                <X size={12} />
              </button>
            </div>
          </div>

          <div className="p-3 max-h-[400px] overflow-auto custom-scrollbar">
            {error && (
              <div className="text-red-500 text-xs font-mono whitespace-pre-wrap mb-2 flex gap-2">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {output && (
              <div className="text-[var(--theme-text-primary)] text-xs font-mono whitespace-pre-wrap leading-relaxed opacity-90 mb-2">
                {output}
              </div>
            )}

            {displayInlineImage && (
              <div className="mt-2 mb-2 rounded-lg overflow-hidden border border-[var(--theme-border-secondary)] inline-block bg-white">
                <img
                  src={`data:image/png;base64,${displayInlineImage}`}
                  alt={t('code_plot_alt')}
                  className="max-w-full h-auto block"
                />
              </div>
            )}

            {generatedFiles.length > 0 && (
              <div className="mt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex select-none items-center gap-1.5 mb-2">
                  <FileOutput size={12} /> {t('code_generated_files')}
                </span>
                <div className="flex flex-wrap gap-2">
                  {generatedFiles.map((file) => (
                    <FileDisplay
                      key={file.id}
                      file={file}
                      isFromMessageList={true}
                      isGemini3={false} // Disable extra edit controls for generated files
                    />
                  ))}
                </div>
              </div>
            )}

            {!error && !output && !displayInlineImage && generatedFiles.length === 0 && !isRunning && (
              <div className="text-[var(--theme-text-tertiary)] text-xs italic">{t('code_executed_no_output')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
