import type { ModalityTokenCount, Part, UsageMetadata } from '@google/genai';
import type { UploadedFile } from '../../types';
import { SUPPORTED_GENERATED_MIME_TYPES } from '../../constants/fileConstants';
import { createUploadedFileFromBase64 } from '../../utils/chat/parsing';
import { generateUniqueId } from '../../utils/chat/ids';
import { isAudioMimeType, isImageMimeType, isVideoMimeType } from '../../utils/fileTypeUtils';

type MessageStreamEvent =
  | { type: 'part'; part: Part; receivedAt?: Date }
  | { type: 'thought'; text: string; receivedAt?: Date }
  | { type: 'files'; files: UploadedFile[]; receivedAt?: Date }
  | {
      type: 'complete';
      usage?: UsageMetadata;
      grounding?: unknown;
      urlContext?: unknown;
      generatedFiles?: UploadedFile[];
      aborted?: boolean;
      receivedAt?: Date;
    };

export interface MessageStreamState {
  generationId: string;
  generationStartTime: Date;
  content: string;
  thoughts: string;
  apiParts: Part[];
  files: UploadedFile[];
  firstTokenTimeMs?: number;
  firstContentPartTime: Date | null;
  usage?: UsageMetadata;
  grounding?: MetadataWithCitations;
  urlContext?: unknown;
  aborted: boolean;
}

export type MetadataWithCitations = {
  citations?: Array<{ uri?: string }>;
} & Record<string, unknown>;

type UrlContextItem = {
  retrievedUrl?: string;
  retrieved_url?: string;
  urlRetrievalStatus?: string;
  url_retrieval_status?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const dedupeArray = (values: unknown[]): unknown[] => {
  const seen = new Set<string>();
  const merged: unknown[] = [];

  for (const value of values) {
    const key = JSON.stringify(value);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(value);
  }

  return merged;
};

const mergeMetadata = (existing: unknown, incoming: unknown): unknown => {
  if (incoming === undefined || incoming === null) {
    return existing;
  }

  if (existing === undefined || existing === null) {
    return incoming;
  }

  if (Array.isArray(existing) && Array.isArray(incoming)) {
    return dedupeArray([...existing, ...incoming]);
  }

  if (isRecord(existing) && isRecord(incoming)) {
    const merged: Record<string, unknown> = { ...existing };

    for (const [key, value] of Object.entries(incoming)) {
      merged[key] = mergeMetadata(merged[key], value);
    }

    return merged;
  }

  return incoming;
};

export const createMessageStreamState = ({
  generationId,
  generationStartTime,
}: {
  generationId: string;
  generationStartTime: Date;
}): MessageStreamState => ({
  generationId,
  generationStartTime,
  content: '',
  thoughts: '',
  apiParts: [],
  files: [],
  firstContentPartTime: null,
  aborted: false,
});

const hasThoughtSignature = (part: Part) =>
  Boolean(
    (part as Part & { thoughtSignature?: string; thought_signature?: string }).thoughtSignature ||
    (part as Part & { thoughtSignature?: string; thought_signature?: string }).thought_signature,
  );

const isPlainTextOnlyPart = (part: Part) => Object.keys(part).every((key) => key === 'text');

export const appendApiPart = (parts: Part[] = [], newPart: Part) => {
  const newParts = [...parts];

  if ('text' in newPart && typeof newPart.text === 'string') {
    const lastPart = newParts[newParts.length - 1];
    if (
      lastPart &&
      'text' in lastPart &&
      typeof lastPart.text === 'string' &&
      !('thought' in lastPart && lastPart.thought) &&
      !hasThoughtSignature(lastPart) &&
      !hasThoughtSignature(newPart) &&
      isPlainTextOnlyPart(lastPart) &&
      isPlainTextOnlyPart(newPart)
    ) {
      newParts[newParts.length - 1] = { ...lastPart, text: lastPart.text + newPart.text } as Part;
      return newParts;
    }
  }

  newParts.push({ ...newPart });
  return newParts;
};

const escapeHtml = (unsafe: string) =>
  unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const getContentDeltaFromPart = (part: Part): string => {
  const anyPart = part as Part & {
    text?: string;
    executableCode?: { language?: string; code?: string };
    codeExecutionResult?: { outcome?: string; output?: string };
  };

  if (anyPart.text) {
    return anyPart.text;
  }

  if (anyPart.executableCode) {
    const language = anyPart.executableCode.language?.toLowerCase() || 'python';
    return `\n\n\`\`\`${language}\n${anyPart.executableCode.code || ''}\n\`\`\`\n\n`;
  }

  if (anyPart.codeExecutionResult) {
    const outcome = anyPart.codeExecutionResult.outcome || 'UNKNOWN';
    let toolContent = `\n\n<div class="tool-result outcome-${outcome.toLowerCase()}"><strong>Execution Result (${outcome}):</strong>`;
    if (anyPart.codeExecutionResult.output) {
      toolContent += `<pre><code class="language-text">${escapeHtml(anyPart.codeExecutionResult.output)}</code></pre>`;
    }
    toolContent += '</div>\n\n';
    return toolContent;
  }

  return '';
};

const getGeneratedFileFromPart = (part: Part): UploadedFile | undefined => {
  const partWithInlineData = part as Part & { inlineData?: { mimeType?: string; data?: string } };
  const mimeType = partWithInlineData.inlineData?.mimeType;
  const data = partWithInlineData.inlineData?.data;

  if (!mimeType || !data) {
    return undefined;
  }

  const isSupportedFile =
    isImageMimeType(mimeType) ||
    isAudioMimeType(mimeType) ||
    isVideoMimeType(mimeType) ||
    SUPPORTED_GENERATED_MIME_TYPES.has(mimeType);

  if (!isSupportedFile) {
    return undefined;
  }

  return createUploadedFileFromBase64(
    data,
    mimeType,
    isImageMimeType(mimeType) ? `generated-plot-${generateUniqueId().slice(-4)}` : 'generated-file',
  );
};

export const mergeUniqueFiles = (existing: UploadedFile[] = [], incoming: UploadedFile[] = []) => {
  const files = [...existing];
  const seen = new Set(files.map((file) => file.id));

  for (const file of incoming) {
    if (!seen.has(file.id)) {
      files.push(file);
      seen.add(file.id);
    }
  }

  return files;
};

const isMeaningfulPart = (part: Part) => {
  const anyPart = part as Part & {
    text?: string;
    executableCode?: unknown;
    codeExecutionResult?: unknown;
    inlineData?: unknown;
  };

  return Boolean(
    (anyPart.text && anyPart.text.trim().length > 0) ||
    anyPart.executableCode ||
    anyPart.codeExecutionResult ||
    anyPart.inlineData,
  );
};

const recordFirstToken = (state: MessageStreamState, receivedAt?: Date): MessageStreamState => {
  if (state.firstTokenTimeMs !== undefined) {
    return state;
  }

  const now = receivedAt ?? new Date();
  return {
    ...state,
    firstTokenTimeMs: now.getTime() - state.generationStartTime.getTime(),
  };
};

const recordFirstContentPart = (state: MessageStreamState, receivedAt?: Date): MessageStreamState => {
  if (state.firstContentPartTime) {
    return state;
  }

  return {
    ...state,
    firstContentPartTime: receivedAt ?? new Date(),
  };
};

const mergeTokenDetails = (
  existing: ModalityTokenCount[] | undefined,
  incoming: ModalityTokenCount[] | undefined,
): ModalityTokenCount[] | undefined => {
  const totals = new Map<string, number>();

  for (const detail of [...(existing ?? []), ...(incoming ?? [])]) {
    const modality = detail.modality;
    if (!modality) continue;
    totals.set(modality, (totals.get(modality) ?? 0) + (detail.tokenCount ?? 0));
  }

  if (totals.size === 0) {
    return undefined;
  }

  return Array.from(totals.entries()).map(([modality, tokenCount]) => ({
    modality: modality as ModalityTokenCount['modality'],
    tokenCount,
  }));
};

const sumTokenDetails = (details: ModalityTokenCount[] | undefined): number | undefined => {
  if (!details?.length) {
    return undefined;
  }

  const total = details.reduce((sum, detail) => sum + (detail.tokenCount ?? 0), 0);
  return total > 0 ? total : undefined;
};

const mergeOptionalCounts = (existing?: number, incoming?: number): number | undefined => {
  const hasExisting = typeof existing === 'number' && existing > 0;
  const hasIncoming = typeof incoming === 'number' && incoming > 0;

  if (!hasExisting && !hasIncoming) {
    return undefined;
  }

  return (existing ?? 0) + (incoming ?? 0);
};

export const mergeUsageMetadata = (
  existing: UsageMetadata | undefined,
  incoming: UsageMetadata | undefined,
): UsageMetadata | undefined => {
  if (!incoming) {
    return existing;
  }

  if (!existing) {
    return incoming;
  }

  const promptTokensDetails = mergeTokenDetails(existing.promptTokensDetails, incoming.promptTokensDetails);
  const cacheTokensDetails = mergeTokenDetails(existing.cacheTokensDetails, incoming.cacheTokensDetails);
  const responseTokensDetails = mergeTokenDetails(existing.responseTokensDetails, incoming.responseTokensDetails);
  const toolUsePromptTokensDetails = mergeTokenDetails(
    existing.toolUsePromptTokensDetails,
    incoming.toolUsePromptTokensDetails,
  );

  return {
    promptTokenCount: mergeOptionalCounts(
      existing.promptTokenCount ?? sumTokenDetails(existing.promptTokensDetails),
      incoming.promptTokenCount ?? sumTokenDetails(incoming.promptTokensDetails),
    ),
    cachedContentTokenCount: mergeOptionalCounts(
      existing.cachedContentTokenCount ?? sumTokenDetails(existing.cacheTokensDetails),
      incoming.cachedContentTokenCount ?? sumTokenDetails(incoming.cacheTokensDetails),
    ),
    responseTokenCount: mergeOptionalCounts(
      existing.responseTokenCount ?? sumTokenDetails(existing.responseTokensDetails),
      incoming.responseTokenCount ?? sumTokenDetails(incoming.responseTokensDetails),
    ),
    toolUsePromptTokenCount: mergeOptionalCounts(
      existing.toolUsePromptTokenCount ?? sumTokenDetails(existing.toolUsePromptTokensDetails),
      incoming.toolUsePromptTokenCount ?? sumTokenDetails(incoming.toolUsePromptTokensDetails),
    ),
    thoughtsTokenCount: mergeOptionalCounts(existing.thoughtsTokenCount, incoming.thoughtsTokenCount),
    totalTokenCount: mergeOptionalCounts(existing.totalTokenCount, incoming.totalTokenCount),
    promptTokensDetails,
    cacheTokensDetails,
    responseTokensDetails,
    toolUsePromptTokensDetails,
    trafficType: incoming.trafficType ?? existing.trafficType,
  };
};

const mergeUniqueStrings = (existing: unknown, incoming: unknown): string[] | undefined => {
  const existingValues = Array.isArray(existing)
    ? existing.filter((value): value is string => typeof value === 'string')
    : [];
  const incomingValues = Array.isArray(incoming)
    ? incoming.filter((value): value is string => typeof value === 'string')
    : [];

  if (existingValues.length === 0 && incomingValues.length === 0) {
    return undefined;
  }

  return Array.from(new Set([...existingValues, ...incomingValues]));
};

const mergeUniqueItems = <T>(existing: unknown, incoming: unknown, getKey: (item: T) => string): T[] | undefined => {
  const existingValues = Array.isArray(existing)
    ? existing.filter((value): value is T => value !== null && value !== undefined)
    : [];
  const incomingValues = Array.isArray(incoming)
    ? incoming.filter((value): value is T => value !== null && value !== undefined)
    : [];

  if (existingValues.length === 0 && incomingValues.length === 0) {
    return undefined;
  }

  const merged = new Map<string, T>();
  for (const item of [...existingValues, ...incomingValues]) {
    merged.set(getKey(item), item);
  }

  return Array.from(merged.values());
};

export const mergeGroundingMetadata = (
  existing: MetadataWithCitations | undefined,
  incoming: unknown,
): MetadataWithCitations | undefined => {
  if (!isRecord(incoming)) {
    return existing;
  }

  const merged: MetadataWithCitations = existing ? { ...existing } : {};

  for (const [key, value] of Object.entries(incoming)) {
    switch (key) {
      case 'webSearchQueries':
      case 'imageSearchQueries': {
        const mergedStrings = mergeUniqueStrings(merged[key], value);
        if (mergedStrings) {
          merged[key] = mergedStrings;
        }
        break;
      }
      case 'groundingChunks':
      case 'groundingSupports': {
        const mergedItems = mergeUniqueItems<Record<string, unknown>>(merged[key], value, (item) =>
          JSON.stringify(item),
        );
        if (mergedItems) {
          merged[key] = mergedItems;
        }
        break;
      }
      case 'citations': {
        const mergedCitations = mergeUniqueItems<Record<string, unknown>>(merged.citations, value, (item) => {
          const uri = typeof item.uri === 'string' ? item.uri : '';
          return uri || JSON.stringify(item);
        }) as Array<{ uri?: string }> | undefined;
        if (mergedCitations) {
          merged.citations = mergedCitations;
        }
        break;
      }
      default: {
        if (isRecord(value) && isRecord(merged[key])) {
          merged[key] = { ...(merged[key] as Record<string, unknown>), ...value };
        } else {
          merged[key] = value;
        }
      }
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
};

const extractUrlContextItems = (metadata: unknown): UrlContextItem[] => {
  if (!isRecord(metadata)) {
    return [];
  }

  const urlMetadata = metadata.urlMetadata;
  const snakeCaseUrlMetadata = metadata.url_metadata;
  const items = Array.isArray(urlMetadata)
    ? urlMetadata
    : Array.isArray(snakeCaseUrlMetadata)
      ? snakeCaseUrlMetadata
      : [];

  return items.filter((item): item is UrlContextItem => isRecord(item));
};

export const mergeUrlContextMetadata = (existing: unknown, incoming: unknown): unknown => {
  if (incoming === undefined || incoming === null) {
    return existing;
  }

  if (existing === undefined || existing === null) {
    return incoming;
  }

  if (!isRecord(existing) || !isRecord(incoming)) {
    return mergeMetadata(existing, incoming);
  }

  const mergedItems = new Map<string, UrlContextItem>();
  const addItems = (items: UrlContextItem[]) => {
    for (const item of items) {
      const url = item.retrievedUrl || item.retrieved_url;
      const key = url || JSON.stringify(item);
      if (!key) continue;
      mergedItems.set(key, item);
    }
  };

  addItems(extractUrlContextItems(existing));
  addItems(extractUrlContextItems(incoming));

  const merged = mergeMetadata(existing, incoming) as Record<string, unknown>;

  delete merged.url_metadata;

  if (mergedItems.size > 0) {
    merged.urlMetadata = Array.from(mergedItems.values());
  }

  return merged;
};

export const reduceMessageStreamEvent = (state: MessageStreamState, event: MessageStreamEvent): MessageStreamState => {
  switch (event.type) {
    case 'thought':
      return {
        ...recordFirstToken(state, event.receivedAt),
        thoughts: state.thoughts + event.text,
      };
    case 'part': {
      let nextState = recordFirstToken(state, event.receivedAt);
      if (isMeaningfulPart(event.part)) {
        nextState = recordFirstContentPart(nextState, event.receivedAt);
      }

      const generatedFile = getGeneratedFileFromPart(event.part);

      return {
        ...nextState,
        content: nextState.content + getContentDeltaFromPart(event.part),
        apiParts: appendApiPart(nextState.apiParts, event.part),
        files: generatedFile ? mergeUniqueFiles(nextState.files, [generatedFile]) : nextState.files,
      };
    }
    case 'files':
      return {
        ...state,
        files: mergeUniqueFiles(state.files, event.files),
      };
    case 'complete':
      return {
        ...state,
        usage: mergeUsageMetadata(state.usage, event.usage),
        grounding: mergeGroundingMetadata(state.grounding, event.grounding),
        urlContext: mergeUrlContextMetadata(state.urlContext, event.urlContext),
        files: event.generatedFiles ? mergeUniqueFiles(state.files, event.generatedFiles) : state.files,
        aborted: state.aborted || !!event.aborted,
      };
  }
};
