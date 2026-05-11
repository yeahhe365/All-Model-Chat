import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../../contexts/I18nContext';
import { useWindowContext } from '../../../contexts/WindowContext';
import {
  buildHtmlPreviewSrcDoc,
  buildStreamingHtmlPreviewSrcDoc,
  HTML_PREVIEW_CLEAR_SELECTION_EVENT,
  HTML_PREVIEW_DIAGNOSTIC_EVENT,
  HTML_PREVIEW_MESSAGE_CHANNEL,
  HTML_PREVIEW_STREAM_RENDER_EVENT,
} from '../../../utils/htmlPreview';
import {
  normalizeLiveArtifactFollowupPayload,
  type LiveArtifactFollowupPayload,
} from '../../../utils/liveArtifactFollowup';
import {
  createRelayedLiveArtifactSelectionDetail,
  dispatchLiveArtifactSelection,
  LIVE_ARTIFACT_CLEAR_SELECTION_EVENT,
} from '../../../hooks/text-selection/liveArtifactSelection';

interface ArtifactFrameProps {
  html: string;
  cacheKey?: string;
  isLoading?: boolean;
  onFollowUp?: (payload: LiveArtifactFollowupPayload) => void;
}

type HtmlPreviewBridgeMessage = {
  channel?: string;
  event?: 'ready' | 'escape' | 'resize' | 'followup' | 'selection' | 'diagnostic';
  height?: number;
  payload?: unknown;
};

const MIN_FRAME_HEIGHT = 120;
const DEFAULT_FRAME_HEIGHT = 320;
const MAX_FRAME_HEIGHT_CACHE_ENTRIES = 200;
const STREAMING_SRC_DOC_THROTTLE_MS = 120;
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
  const { window: targetWindow } = useWindowContext();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const latestStreamingHtmlRef = useRef(html);
  const lastPostedStreamingHtmlRef = useRef<string | null>(null);
  const streamingFlushTimeoutRef = useRef<number | null>(null);
  const contentHeightCacheKey = useMemo(() => getContentFrameHeightCacheKey(html, cacheKey), [cacheKey, html]);
  const streamingHeightCacheKey = useMemo(() => getStreamingFrameHeightCacheKey(cacheKey), [cacheKey]);
  const heightCacheKey = isLoading && streamingHeightCacheKey ? streamingHeightCacheKey : contentHeightCacheKey;
  const [streamingSrcDoc] = useState(() => buildStreamingHtmlPreviewSrcDoc());
  const [frameHeightState, setFrameHeightState] = useState(() => ({
    heightCacheKey,
    height: readCachedFrameHeight(heightCacheKey, streamingHeightCacheKey),
  }));
  const frameHeight =
    frameHeightState.heightCacheKey === heightCacheKey
      ? frameHeightState.height
      : readCachedFrameHeight(heightCacheKey, streamingHeightCacheKey);
  const finalSrcDoc = useMemo(() => buildHtmlPreviewSrcDoc(html), [html]);
  const srcDoc = isLoading ? streamingSrcDoc : finalSrcDoc;

  useLayoutEffect(() => {
    latestStreamingHtmlRef.current = html;
  }, [html]);

  const postStreamingHtml = useCallback(
    (nextHtml: string, force = false) => {
      if (!force && lastPostedStreamingHtmlRef.current === nextHtml) {
        return;
      }

      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow) {
        return;
      }

      iframeWindow.postMessage(
        {
          channel: HTML_PREVIEW_MESSAGE_CHANNEL,
          event: HTML_PREVIEW_STREAM_RENDER_EVENT,
          html: nextHtml,
        },
        '*',
      );
      lastPostedStreamingHtmlRef.current = nextHtml;
    },
    [iframeRef],
  );

  const clearStreamingFlushTimeout = useCallback(() => {
    if (streamingFlushTimeoutRef.current === null) {
      return;
    }

    targetWindow.clearTimeout(streamingFlushTimeoutRef.current);
    streamingFlushTimeoutRef.current = null;
  }, [targetWindow]);

  const scheduleStreamingHtmlFlush = useCallback(() => {
    if (streamingFlushTimeoutRef.current !== null) {
      return;
    }

    streamingFlushTimeoutRef.current = targetWindow.setTimeout(() => {
      streamingFlushTimeoutRef.current = null;
      postStreamingHtml(latestStreamingHtmlRef.current);
    }, STREAMING_SRC_DOC_THROTTLE_MS);
  }, [postStreamingHtml, targetWindow]);

  useEffect(() => {
    if (!isLoading) {
      clearStreamingFlushTimeout();
      lastPostedStreamingHtmlRef.current = null;
      return;
    }

    scheduleStreamingHtmlFlush();
  }, [clearStreamingFlushTimeout, html, isLoading, scheduleStreamingHtmlFlush]);

  useEffect(() => {
    return () => clearStreamingFlushTimeout();
  }, [clearStreamingFlushTimeout]);

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

      if (data.event === 'selection') {
        dispatchLiveArtifactSelection(
          targetWindow,
          createRelayedLiveArtifactSelectionDetail(iframeRef.current, data.payload),
        );
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

      if (data.event === HTML_PREVIEW_DIAGNOSTIC_EVENT) {
        console.warn('Live Artifact preview diagnostic:', data.payload);
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

    targetWindow.addEventListener('message', handleMessage);
    return () => targetWindow.removeEventListener('message', handleMessage);
  }, [contentHeightCacheKey, heightCacheKey, onFollowUp, streamingHeightCacheKey, targetWindow]);

  useEffect(() => {
    const handleClearSelection = () => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          channel: HTML_PREVIEW_MESSAGE_CHANNEL,
          event: HTML_PREVIEW_CLEAR_SELECTION_EVENT,
        },
        '*',
      );
    };

    targetWindow.addEventListener(LIVE_ARTIFACT_CLEAR_SELECTION_EVENT, handleClearSelection);
    return () => targetWindow.removeEventListener(LIVE_ARTIFACT_CLEAR_SELECTION_EVENT, handleClearSelection);
  }, [targetWindow]);

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
          onLoad={() => {
            if (isLoading) {
              postStreamingHtml(html, true);
            }
          }}
        />
      </div>
    </div>
  );
};
