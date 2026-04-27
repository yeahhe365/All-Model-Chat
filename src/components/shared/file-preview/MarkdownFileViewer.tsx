import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { UploadedFile } from '../../../types';
import { useI18n } from '../../../contexts/I18nContext';
import { LazyMarkdownRenderer } from '../../message/LazyMarkdownRenderer';

interface MarkdownFileViewerProps {
  file: UploadedFile;
  content?: string | null;
  themeId?: string;
  isEditable?: boolean;
  onChange?: (value: string) => void;
  onLoad?: (content: string) => void;
}

const LARGE_MARKDOWN_LENGTH_THRESHOLD = 50000;
const LARGE_MARKDOWN_LINE_THRESHOLD = 1200;
const LARGE_MARKDOWN_FENCE_THRESHOLD = 12;
const MARKDOWN_VIEW_MODE_STORAGE_PREFIX = 'markdown-preview-mode:';

type MarkdownViewMode = 'preview' | 'source';

const readStoredMarkdownViewMode = (storageKey: string): MarkdownViewMode => {
  try {
    return localStorage.getItem(storageKey) === 'source' ? 'source' : 'preview';
  } catch {
    return 'preview';
  }
};

const shouldDeferMarkdownPreview = (content: string): boolean => {
  if (!content) return false;

  const lineCount = (content.match(/\n/g)?.length ?? 0) + 1;
  const fenceCount = content.match(/```/g)?.length ?? 0;

  return (
    content.length > LARGE_MARKDOWN_LENGTH_THRESHOLD ||
    lineCount > LARGE_MARKDOWN_LINE_THRESHOLD ||
    fenceCount >= LARGE_MARKDOWN_FENCE_THRESHOLD
  );
};

export const MarkdownFileViewer: React.FC<MarkdownFileViewerProps> = ({
  file,
  content,
  themeId = 'pearl',
  isEditable = false,
  onChange,
  onLoad,
}) => {
  const { t } = useI18n();
  const storageKey = useMemo(() => `${MARKDOWN_VIEW_MODE_STORAGE_PREFIX}${file.id}:${file.name}`, [file.id, file.name]);
  const [localContent, setLocalContent] = useState<string | null>(null);
  const [modeState, setModeState] = useState<{ storageKey: string; mode: MarkdownViewMode }>(() => ({
    storageKey,
    mode: readStoredMarkdownViewMode(storageKey),
  }));
  const [forcePreviewState, setForcePreviewState] = useState<{ storageKey: string; value: boolean }>(() => ({
    storageKey,
    value: false,
  }));
  const hasProvidedContent = content !== undefined && content !== null;
  const [isLoading, setIsLoading] = useState(() => !hasProvidedContent && !!file.dataUrl);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mode = modeState.storageKey === storageKey ? modeState.mode : readStoredMarkdownViewMode(storageKey);
  const forcePreview = forcePreviewState.storageKey === storageKey && forcePreviewState.value;

  useEffect(() => {
    if (hasProvidedContent) return;

    let cancelled = false;

    if (file.dataUrl) {
      fetch(file.dataUrl)
        .then((res) => res.text())
        .then((text) => {
          if (cancelled) return;
          setLocalContent(text);
          onLoad?.(text);
          setIsLoading(false);
        })
        .catch((err) => {
          if (cancelled) return;
          console.error('Failed to load markdown content', err);
          setLocalContent(t('filePreview_failed_text_content'));
          setIsLoading(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [file.dataUrl, hasProvidedContent, onLoad, t]);

  useEffect(() => {
    if (isEditable && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditable]);

  const updateMode = (nextMode: MarkdownViewMode) => {
    setModeState({ storageKey, mode: nextMode });
    try {
      localStorage.setItem(storageKey, nextMode);
    } catch {
      // localStorage may be unavailable; keep the in-memory mode change.
    }
  };

  const displayContent = content ?? localContent ?? '';
  const shouldDefer = useMemo(() => shouldDeferMarkdownPreview(displayContent), [displayContent]);
  const showSource = isEditable || mode === 'source' || (shouldDefer && !forcePreview);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--theme-text-tertiary)]">
        <Loader2 className="mr-2 animate-spin" /> {t('filePreview_loading_text_content')}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] px-4 py-3">
        <div className="flex items-center gap-2 rounded-xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)] p-1">
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${!showSource ? 'bg-[var(--theme-bg-accent)] text-white shadow-sm' : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'}`}
            onClick={() => {
              updateMode('preview');
              setForcePreviewState({ storageKey, value: true });
            }}
            disabled={isEditable}
          >
            {t('markdownPreview_preview')}
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${showSource ? 'bg-[var(--theme-bg-accent)] text-white shadow-sm' : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'}`}
            onClick={() => updateMode('source')}
          >
            {t('markdownPreview_source')}
          </button>
        </div>

        {shouldDefer && !forcePreview && !isEditable && (
          <p className="text-sm text-[var(--theme-text-secondary)]">{t('filePreview_large_markdown_notice')}</p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
        {showSource ? (
          isEditable ? (
            <textarea
              ref={textareaRef}
              value={displayContent}
              onChange={(event) => onChange?.(event.target.value)}
              className="h-full min-h-[60vh] w-full resize-none bg-[var(--theme-bg-secondary)] p-5 font-mono text-sm leading-6 text-[var(--theme-text-primary)] outline-none sm:p-8"
              spellCheck={false}
            />
          ) : (
            <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8">
              <pre className="min-h-[60vh] whitespace-pre-wrap break-words rounded-2xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] p-5 font-mono text-sm leading-6 text-[var(--theme-text-primary)] shadow-sm sm:p-8">
                {displayContent}
              </pre>
            </div>
          )
        ) : (
          <article className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
            <div className="markdown-body min-h-[60vh] rounded-2xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] p-6 shadow-sm sm:p-10">
              <LazyMarkdownRenderer
                content={displayContent}
                isLoading={false}
                onImageClick={() => {}}
                onOpenHtmlPreview={() => {}}
                onOpenSidePanel={() => {}}
                expandCodeBlocksByDefault={true}
                isMermaidRenderingEnabled={true}
                isGraphvizRenderingEnabled={true}
                allowHtml={true}
                t={t}
                themeId={themeId}
                interactiveMode="disabled"
                fallbackMode="raw"
              />
            </div>
          </article>
        )}
      </div>
    </div>
  );
};
