export const LIVE_ARTIFACT_SELECTION_EVENT = 'amc-live-artifact-selection';
export const LIVE_ARTIFACT_CLEAR_SELECTION_EVENT = 'amc-live-artifact-clear-selection';

interface LiveArtifactSelectionRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
}

interface LiveArtifactSelectionDetail {
  text: string;
  copyText?: string;
  rect: LiveArtifactSelectionRect;
}

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const isLiveArtifactSelectionRect = (value: unknown): value is LiveArtifactSelectionRect => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const rect = value as Record<string, unknown>;
  return (
    isFiniteNumber(rect.top) &&
    isFiniteNumber(rect.left) &&
    isFiniteNumber(rect.width) &&
    isFiniteNumber(rect.height) &&
    isFiniteNumber(rect.bottom)
  );
};

export const isLiveArtifactSelectionDetail = (value: unknown): value is LiveArtifactSelectionDetail => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const detail = value as Record<string, unknown>;
  return (
    typeof detail.text === 'string' &&
    detail.text.trim().length > 0 &&
    (detail.copyText === undefined || typeof detail.copyText === 'string') &&
    isLiveArtifactSelectionRect(detail.rect)
  );
};

export const dispatchLiveArtifactSelection = (
  targetWindow: Window,
  detail: LiveArtifactSelectionDetail | null,
) => {
  targetWindow.dispatchEvent(
    new CustomEvent(LIVE_ARTIFACT_SELECTION_EVENT, {
      detail,
    }),
  );
};

export const dispatchLiveArtifactClearSelection = (targetWindow: Window) => {
  targetWindow.dispatchEvent(new CustomEvent(LIVE_ARTIFACT_CLEAR_SELECTION_EVENT));
};

export const createRelayedLiveArtifactSelectionDetail = (
  iframe: HTMLIFrameElement | null,
  payload: unknown,
  scale = 1,
): LiveArtifactSelectionDetail | null => {
  if (!iframe || !isLiveArtifactSelectionDetail(payload)) {
    return null;
  }

  const iframeRect = iframe.getBoundingClientRect();
  const effectiveScale = Number.isFinite(scale) && scale > 0 ? scale : 1;

  return {
    text: payload.text,
    copyText: payload.copyText,
    rect: {
      top: iframeRect.top + payload.rect.top * effectiveScale,
      left: iframeRect.left + payload.rect.left * effectiveScale,
      width: payload.rect.width * effectiveScale,
      height: payload.rect.height * effectiveScale,
      bottom: iframeRect.top + payload.rect.bottom * effectiveScale,
    },
  };
};
