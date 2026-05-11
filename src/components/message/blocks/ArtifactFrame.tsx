import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../../contexts/I18nContext';
import { buildHtmlPreviewSrcDoc, HTML_PREVIEW_MESSAGE_CHANNEL } from '../../../utils/htmlPreview';
import {
  normalizeLiveArtifactFollowupPayload,
  type LiveArtifactFollowupPayload,
} from '../../../utils/liveArtifactFollowup';

interface ArtifactFrameProps {
  html: string;
  cacheKey?: string;
  isLoading?: boolean;
  onFollowUp?: (payload: LiveArtifactFollowupPayload) => void;
}

type HtmlPreviewBridgeMessage = {
  channel?: string;
  event?: 'ready' | 'escape' | 'resize' | 'followup';
  height?: number;
  payload?: unknown;
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

const getContentFrameHeightCacheKey = (html: string, cacheKey?: string): string => {
  const contentHash = `${html.length}:${hashString(html)}`;
  return cacheKey ? `${cacheKey}:${contentHash}` : `html:${contentHash}`;
};

const getStreamingFrameHeightCacheKey = (cacheKey?: string): string | undefined => {
  return cacheKey ? `stream:${cacheKey}` : undefined;
};

const readCachedFrameHeight = (heightCacheKey: string, fallbackHeightCacheKey?: string): number => {
  return (
    frameHeightCache.get(heightCacheKey) ??
    (fallbackHeightCacheKey ? frameHeightCache.get(fallbackHeightCacheKey) : undefined) ??
    DEFAULT_FRAME_HEIGHT
  );
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

export const ArtifactFrame: React.FC<ArtifactFrameProps> = ({ html, cacheKey, isLoading = false, onFollowUp }) => {
  const { t } = useI18n();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const contentHeightCacheKey = useMemo(() => getContentFrameHeightCacheKey(html, cacheKey), [cacheKey, html]);
  const streamingHeightCacheKey = useMemo(() => getStreamingFrameHeightCacheKey(cacheKey), [cacheKey]);
  const heightCacheKey = isLoading && streamingHeightCacheKey ? streamingHeightCacheKey : contentHeightCacheKey;
  const [frameHeightState, setFrameHeightState] = useState(() => ({
    heightCacheKey,
    height: readCachedFrameHeight(heightCacheKey, streamingHeightCacheKey),
  }));
  const frameHeight =
    frameHeightState.heightCacheKey === heightCacheKey
      ? frameHeightState.height
      : readCachedFrameHeight(heightCacheKey, streamingHeightCacheKey);
  const srcDoc = useMemo(() => buildHtmlPreviewSrcDoc(html), [html]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<HtmlPreviewBridgeMessage>) => {
      const data = event.data;
      if (!data || data.channel !== HTML_PREVIEW_MESSAGE_CHANNEL) {
        return;
      }

      const iframeWindow = iframeRef.current?.contentWindow;
      if (iframeWindow && event.source !== iframeWindow) {
        return;
      }

      if (data.event === 'followup') {
        const payload = normalizeLiveArtifactFollowupPayload(data.payload);
        if (!payload) {
          console.warn('Ignored invalid Live Artifact follow-up payload.');
          return;
        }

        onFollowUp?.(payload);
        return;
      }

      if (data.event !== 'resize') {
        return;
      }

      if (typeof data.height === 'number' && Number.isFinite(data.height)) {
        const nextHeight = normalizeFrameHeight(data.height);
        cacheFrameHeight(heightCacheKey, nextHeight);
        if (heightCacheKey !== contentHeightCacheKey) {
          cacheFrameHeight(contentHeightCacheKey, nextHeight);
        }
        if (streamingHeightCacheKey && heightCacheKey !== streamingHeightCacheKey) {
          cacheFrameHeight(streamingHeightCacheKey, nextHeight);
        }
        setFrameHeightState((currentState) =>
          currentState.heightCacheKey === heightCacheKey && currentState.height === nextHeight
            ? currentState
            : { heightCacheKey, height: nextHeight },
        );
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [contentHeightCacheKey, heightCacheKey, onFollowUp, streamingHeightCacheKey]);

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
    </div>
  );
};
