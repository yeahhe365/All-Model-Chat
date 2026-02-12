import { GoogleGenAI } from '@google/genai';
import { ProviderKeyPool, KeyPoolSnapshot } from './keyPool.js';

export interface GeminiClientContext {
  client: GoogleGenAI;
  keyId: string;
}

export interface GeminiProviderClientOptions {
  useVertexAi: boolean;
  baseUrl?: string;
  apiVersion?: string;
}

export class GeminiProviderClient {
  constructor(
    private readonly keyPool: ProviderKeyPool,
    private readonly options: GeminiProviderClientOptions
  ) {}

  async withClient<T>(operation: (context: GeminiClientContext) => Promise<T>): Promise<T> {
    const { apiKey, keyId } = this.keyPool.acquireKey();
    const clientOptions: Record<string, unknown> = {
      apiKey,
      vertexai: this.options.useVertexAi,
    };

    if (this.options.apiVersion) {
      clientOptions.apiVersion = this.options.apiVersion;
    }

    if (this.options.baseUrl) {
      clientOptions.httpOptions = {
        baseUrl: this.options.baseUrl,
      };
    }

    const client = new GoogleGenAI(clientOptions as any);

    try {
      const result = await operation({ client, keyId });
      this.keyPool.reportSuccess(keyId);
      return result;
    } catch (error) {
      if (this.shouldReportKeyFailure(error)) {
        this.keyPool.reportFailure(keyId);
      }
      throw error;
    }
  }

  getKeyPoolSnapshot(): KeyPoolSnapshot {
    return this.keyPool.getSnapshot();
  }

  getProviderConfigSnapshot(): {
    useVertexAi: boolean;
    baseUrl: string | null;
    apiVersion: string | null;
  } {
    return {
      useVertexAi: this.options.useVertexAi,
      baseUrl: this.options.baseUrl || null,
      apiVersion: this.options.apiVersion || null,
    };
  }

  private shouldReportKeyFailure(error: unknown): boolean {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('does not support uploading files')) {
      return false;
    }
    if (message.includes('only supported by the Gemini Developer API')) {
      return false;
    }

    const status = this.readNumericStatus(error);
    if (status === 400 || status === 404) {
      return false;
    }

    return true;
  }

  private readNumericStatus(error: unknown): number | null {
    if (!error || typeof error !== 'object') return null;

    const status = (error as Record<string, unknown>).status;
    if (typeof status === 'number' && Number.isFinite(status)) return status;

    const statusCode = (error as Record<string, unknown>).statusCode;
    if (typeof statusCode === 'number' && Number.isFinite(statusCode)) return statusCode;

    return null;
  }
}
