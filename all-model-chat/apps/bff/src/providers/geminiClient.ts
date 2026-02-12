import { GoogleGenAI } from '@google/genai';
import { ProviderKeyPool, KeyPoolSnapshot } from './keyPool.js';

export interface GeminiClientContext {
  client: GoogleGenAI;
  keyId: string;
}

export class GeminiProviderClient {
  constructor(private readonly keyPool: ProviderKeyPool) {}

  async withClient<T>(operation: (context: GeminiClientContext) => Promise<T>): Promise<T> {
    const { apiKey, keyId } = this.keyPool.acquireKey();
    const client = new GoogleGenAI({ apiKey });

    try {
      const result = await operation({ client, keyId });
      this.keyPool.reportSuccess(keyId);
      return result;
    } catch (error) {
      this.keyPool.reportFailure(keyId);
      throw error;
    }
  }

  getKeyPoolSnapshot(): KeyPoolSnapshot {
    return this.keyPool.getSnapshot();
  }
}
