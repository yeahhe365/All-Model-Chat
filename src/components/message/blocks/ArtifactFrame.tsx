import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, Expand, Maximize2, Sidebar } from 'lucide-react';
import { MESSAGE_BLOCK_BUTTON_CLASS } from '../../../constants/appConstants';
import { useI18n } from '../../../contexts/I18nContext';
import { buildHtmlPreviewSrcDoc, HTML_PREVIEW_MESSAGE_CHANNEL } from '../../../utils/htmlPreview';

interface ArtifactFrameProps {
  html: string;
  cacheKey?: string;
  isCopied: boolean;
  onCopy: () => void;
  onDownload: () => void;
  onOpenSide: () => void;
  onFullscreen: (trueFullscreen: boolean) => void;
}

type HtmlPreviewBridgeMessage = {
  channel?: string;
  event?: 'ready' | 'escape' | 'resize';
  height?: number;
};

const MIN_FRAME_HEIGHT = 120;
const DEFAULT_FRAME_HEIGHT = 320;
const MAX_FRAME_HEIGHT_CACHE_ENTRIES = 200;
const frameHeightCache = new Map<string, number>();

const normalizeFrameHeight = (height: number) => Math.max(MIN_FRAME_HEIGHT, Math.ceil(height));

const hashString = (value: string): string => {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }

  return (hash >>> 0).toString(36);
};

const getFrameHeightCacheKey = (html: string, cacheKey?: string): string => {
  const contentHash = `${html.length}:${hashString(html)}`;
  return cacheKey ? `${cacheKey}:${contentHash}` : `html:${contentHash}`;
};

const readCachedFrameHeight = (heightCacheKey: string): number => {
  return frameHeightCache.get(heightCacheKey) ?? DEFAULT_FRAME_HEIGHT;
};

const cacheFrameHeight = (heightCacheKey: string, height: number) => {
  if (frameHeightCache.has(heightCacheKey)) {
    frameHeightCache.delete(heightCacheKey);
  }

  frameHeightCache.set(heightCacheKey, height);

  if (frameHeightCache.size > MAX_FRAME_HEIGHT_CACHE_ENTRIES) {
    const oldestKey = frameHeightCache.keys().next().value;
    if (oldestKey) {
      frameHeightCache.delete(oldestKey);
    }
  }
};

export const ArtifactFrame: React.FC<ArtifactFrameProps> = ({
  html,
  cacheKey,
  isCopied,
  onCopy,
  onDownload,
  onOpenSide,
  onFullscreen,
}) => {
  const { t } = useI18n();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const heightCacheKey = useMemo(() => getFrameHeightCacheKey(html, cacheKey), [cacheKey, html]);
  const [frameHeightState, setFrameHeightState] = useState(() => ({
    heightCacheKey,
    height: readCachedFrameHeight(heightCacheKey),
  }));
  const frameHeight =
    frameHeightState.heightCacheKey === heightCacheKey
      ? frameHeightState.height
      : readCachedFrameHeight(heightCacheKey);
  const srcDoc = useMemo(() => buildHtmlPreviewSrcDoc(html), [html]);
  const buttonClass = `${MESSAGE_BLOCK_BUTTON_CLASS} !min-h-9 !min-w-9 !rounded-md !p-0 !bg-white/85 !opacity-95 hover:!bg-white shadow-sm backdrop-blur`;

  useEffect(() => {
    const handleMessage = (event: MessageEvent<HtmlPreviewBridgeMessage>) => {
      const data = event.data;
      if (!data || data.channel !== HTML_PREVIEW_MESSAGE_CHANNEL || data.event !== 'resize') {
        return;
      }

      const iframeWindow = iframeRef.current?.contentWindow;
      if (iframeWindow && event.source !== iframeWindow) {
        return;
      }

      if (typeof data.height === 'number' && Number.isFinite(data.height)) {
        const nextHeight = normalizeFrameHeight(data.height);
        cacheFrameHeight(heightCacheKey, nextHeight);
        setFrameHeightState((currentState) =>
          currentState.heightCacheKey === heightCacheKey && currentState.height === nextHeight
            ? currentState
            : { heightCacheKey, height: nextHeight },
        );
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [heightCacheKey]);

  return (
    <div data-live-artifact-frame="true" className="group/artifact relative my-3 w-full overflow-visible">
      <div
        data-live-artifact-viewport="true"
        className="relative overflow-hidden rounded-lg bg-transparent"
        style={{ height: frameHeight }}
      >
        <iframe
          ref={iframeRef}
          srcDoc={srcDoc}
          title={t('htmlPreview_title')}
          className="h-full w-full border-0 bg-transparent"
          sandbox="allow-scripts allow-forms"
          allow="clipboard-write"
          scrolling="no"
        />
      </div>

      <div className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover/artifact:opacity-100 group-focus-within/artifact:opacity-100">
        <button className={`${buttonClass} pointer-events-auto`} title={t('diagram_open_side_panel')} onClick={onOpenSide}>
          <Sidebar size={15} strokeWidth={2} />
        </button>
        <button
          className={`${buttonClass} pointer-events-auto`}
          title={t('code_fullscreen_monitor')}
          onClick={() => onFullscreen(true)}
        >
          <Expand size={15} strokeWidth={2} />
        </button>
        <button
          className={`${buttonClass} pointer-events-auto`}
          title={t('code_fullscreen_modal')}
          onClick={() => onFullscreen(false)}
        >
          <Maximize2 size={15} strokeWidth={2} />
        </button>
        <button
          className={`${buttonClass} pointer-events-auto`}
          title={t('code_download_language').replace('{language}', 'HTML')}
          onClick={onDownload}
        >
          <Download size={15} strokeWidth={2} />
        </button>
        <button
          className={`${buttonClass} pointer-events-auto`}
          title={isCopied ? t('copied_button_title') : t('copy_button_title')}
          onClick={onCopy}
        >
          {isCopied ? (
            <Check size={15} className="text-[var(--theme-text-success)] icon-animate-pop" strokeWidth={2} />
          ) : (
            <Copy size={15} strokeWidth={2} />
          )}
        </button>
      </div>
    </div>
  );
};
