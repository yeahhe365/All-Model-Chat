import type { Content, Part, UsageMetadata, FunctionDeclaration } from '@google/genai';
import type { ImageOutputMode, ImagePersonGeneration, SafetySetting } from './settings';
import type { UploadedFile } from './chat';

export type ChatHistoryItem = Content & {
  parts: Part[];
  role: 'user' | 'model';
};

export type StreamMessageCompleteHandler = (
  usageMetadata?: UsageMetadata,
  groundingMetadata?: unknown,
  urlContextMetadata?: unknown,
) => void;

export type NonStreamMessageCompleteHandler = (
  parts: Part[],
  thoughtsText?: string,
  usageMetadata?: UsageMetadata,
  groundingMetadata?: unknown,
  urlContextMetadata?: unknown,
) => void;

export type StreamMessageSender = (
  apiKey: string,
  modelId: string,
  history: ChatHistoryItem[],
  parts: Part[],
  config: unknown,
  abortSignal: AbortSignal,
  onPart: (part: Part) => void,
  onThoughtChunk: (chunk: string) => void,
  onError: (error: Error) => void,
  onComplete: StreamMessageCompleteHandler,
  role?: 'user' | 'model',
) => Promise<void>;

export type NonStreamMessageSender = (
  apiKey: string,
  modelId: string,
  history: ChatHistoryItem[],
  parts: Part[],
  config: unknown,
  abortSignal: AbortSignal,
  onError: (error: Error) => void,
  onComplete: NonStreamMessageCompleteHandler,
  role?: 'user' | 'model',
) => Promise<void>;

export interface LiveClientFunction {
  declaration: FunctionDeclaration;
  handler: (args: unknown, options?: { abortSignal?: AbortSignal }) => Promise<LiveClientFunctionExecutionResult>;
}

export type LiveClientFunctions = Record<string, LiveClientFunction>;

export interface LiveClientFunctionExecutionResult {
  response: unknown;
  generatedFiles?: UploadedFile[];
}

export interface StandardClientFunctionExecutionResult {
  response: unknown;
  generatedFiles?: UploadedFile[];
}

export interface StandardClientFunction {
  declaration: FunctionDeclaration;
  handler: (args: unknown) => Promise<StandardClientFunctionExecutionResult>;
}

export type StandardClientFunctions = Record<string, StandardClientFunction>;

export interface EditImageRequestConfig {
  systemInstruction?: string;
  showThoughts?: boolean;
  thinkingBudget?: number;
  thinkingLevel?: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';
  isGoogleSearchEnabled?: boolean;
  isDeepSearchEnabled?: boolean;
  safetySettings?: SafetySetting[];
  imageOutputMode?: ImageOutputMode;
  personGeneration?: ImagePersonGeneration;
}

export interface GenerateImagesRequestOptions {
  numberOfImages?: number;
  personGeneration?: ImagePersonGeneration;
}

export interface ThoughtSupportingPart extends Part {
  thought?: boolean;
}
