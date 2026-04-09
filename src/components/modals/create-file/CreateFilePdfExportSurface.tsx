import React, { useEffect } from 'react';
import { MarkdownRenderer } from '../../message/MarkdownRenderer';
import { translations } from '../../../utils/appUtils';
import { waitForElementToBecomeStable } from '../../../utils/export/pdf';

interface CreateFilePdfExportSurfaceProps {
  content: string;
  printRef: React.RefObject<HTMLDivElement>;
  themeId: string;
  t: (key: keyof typeof translations | string) => string;
  setIsPdfPreviewReady: (ready: boolean) => void;
}

export const CreateFilePdfExportSurface: React.FC<CreateFilePdfExportSurfaceProps> = ({
  content,
  printRef,
  themeId,
  t,
  setIsPdfPreviewReady,
}) => {
  useEffect(() => {
    const target = printRef.current;
    if (!target) {
      setIsPdfPreviewReady(false);
      return;
    }

    let isCancelled = false;
    setIsPdfPreviewReady(false);

    void waitForElementToBecomeStable(target)
      .then(() => {
        if (!isCancelled) {
          setIsPdfPreviewReady(true);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setIsPdfPreviewReady(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [content, printRef, setIsPdfPreviewReady, themeId]);

  return (
    <div className={`theme-${themeId} pointer-events-none absolute left-[-10000px] top-0 w-[800px]`}>
      <div
        ref={printRef}
        className="w-full bg-[var(--theme-bg-primary)] p-6 text-[var(--theme-text-primary)]"
        style={{ fontSize: '16px' }}
      >
        <div className="markdown-body">
          <MarkdownRenderer
            content={content}
            isLoading={false}
            onImageClick={() => {}}
            onOpenHtmlPreview={() => {}}
            onOpenSidePanel={() => {}}
            expandCodeBlocksByDefault={true}
            isMermaidRenderingEnabled={true}
            isGraphvizRenderingEnabled={true}
            allowHtml={true}
            t={t as any}
            themeId={themeId}
            diagramLoadMode="eager"
            diagramRenderDelayMs={0}
          />
        </div>
        <div className="mt-8 border-t border-[var(--theme-border-secondary)] pt-4 text-center text-xs text-[var(--theme-text-tertiary)]">
          {t('createText_generated_with')}
        </div>
      </div>
    </div>
  );
};
