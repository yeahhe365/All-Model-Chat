import { dbService, type ApiUsageExactPricing } from '@/services/db/dbService';
import type { LogCategory, LogEntry, LogLevel, TokenUsageStats } from '@/types/logging';

type LogListener = (newLogs: LogEntry[]) => void;
type ApiKeyListener = (usage: Map<string, number>) => void;
type TokenUsageListener = (usage: Map<string, TokenUsageStats>) => void;

interface LogOptions {
  category?: LogCategory;
  data?: unknown;
}

interface ErrorLogOptions extends LogOptions {
  error?: unknown;
}

const API_USAGE_STORAGE_KEY = 'chatApiUsageData';
const TOKEN_USAGE_STORAGE_KEY = 'chatTokenUsageData';
const LOG_RETENTION_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
const FLUSH_INTERVAL_MS = 2000; // 2 seconds
const FLUSH_THRESHOLD = 50; // Flush if 50 items accumulate

class LogServiceImpl {
  private listeners: Set<LogListener> = new Set();
  private apiKeyUsage: Map<string, number> = new Map();
  private apiKeyListeners: Set<ApiKeyListener> = new Set();

  private tokenUsage: Map<string, TokenUsageStats> = new Map();
  private tokenUsageListeners: Set<TokenUsageListener> = new Set();

  // Batching Buffer
  private logBuffer: LogEntry[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private activeFlushPromise: Promise<void> | null = null;
  private isClearing = false;

  constructor() {
    this.loadApiKeyUsage();
    this.loadTokenUsage();
    this.pruneOldLogs();
    this.info('Log service initialized (IndexedDB Batched Mode).', { category: 'SYSTEM' });
  }

  // --- Core Logging Logic ---

  private createLogEntry(level: LogLevel, category: LogCategory, message: string, data?: unknown): LogEntry {
    return {
      timestamp: new Date(),
      level,
      category,
      message,
      data: this.safeSerialize(data),
    };
  }

  private safeSerialize(data: unknown): unknown {
    if (data === undefined || data === null) return undefined;
    try {
      // Simple circular reference handler
      const seen = new WeakSet<object>();
      return JSON.parse(
        JSON.stringify(data, (_key: string, value: unknown) => {
          if (value instanceof Error) {
            return this.serializeError(value);
          }
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) return '[Circular]';
            seen.add(value);
          }
          // Truncate extremely long strings to save DB space
          if (typeof value === 'string' && value.length > 5000) {
            return value.substring(0, 5000) + '...[TRUNCATED]';
          }
          return value;
        }),
      );
    } catch {
      return '[Serialization Failed]';
    }
  }

  private isLogOptions(value: unknown): value is LogOptions {
    return typeof value === 'object' && value !== null && ('category' in value || 'data' in value);
  }

  private isErrorLogOptions(value: unknown): value is ErrorLogOptions {
    return typeof value === 'object' && value !== null && ('error' in value || 'category' in value || 'data' in value);
  }

  private inferCategory(message: string, data?: unknown): LogCategory {
    const dataText = typeof data === 'string' ? data : data instanceof Error ? `${data.name} ${data.message}` : '';
    const haystack = `${message} ${dataText}`.toLowerCase();

    if (
      /\buser\b|\bclearing\b|\bdeleting\b|\brenaming\b|\bmoving\b|\bretrying\b|\brequested\b|\bcancelled\b|\bstopped\b|\bstarting new chat\b|\bmessage edit\b|\btoggling pin\b|\badding new group\b/.test(
        haystack,
      )
    ) {
      return 'USER';
    }
    if (
      /\bapi key\b|\bauth\b|\bcredential\b|\bproxy\b|\btoken endpoint\b|\bephemeral token\b|\blocked key\b/.test(
        haystack,
      )
    ) {
      return 'AUTH';
    }
    if (
      /\bfile\b|\bupload\b|\bdownload\b|\bexport\b|\bimport\b|\bpdf\b|\bdocx\b|\bzip\b|\baudio\b|\bimage\b|\bpreview\b/.test(
        haystack,
      )
    ) {
      return 'FILE';
    }
    if (
      /\bindexeddb\b|\bdb\b|\bdatabase\b|\bpersist\b|\bstorage\b|\bsession\b|\bhistory\b|\bgroup\b|\bscenario\b|\bsettings\b|\bsync\b/.test(
        haystack,
      )
    ) {
      return 'DB';
    }
    if (
      /\bstream(?:ing)?\b|\bconnect(?:ed|ion)?\b|\breconnect(?:ing|ion)?\b|\bdisconnect(?:ed|ion)?\b|\bfetch\b|\bnetwork\b|\bpoll(?:ing)?\b|\blive api\b|\bwebsocket\b|\bhttp\b/.test(
        haystack,
      )
    ) {
      return 'NETWORK';
    }
    if (
      /\bmodel\b|\btoken(?:s)?\b|\btranslate|translation\b|\bsuggestions?\b|\btitle generation\b|\btts\b|\bspeech\b|\btranscrib(?:e|ing|ed)\b|\bgeneratecontent\b|\bgemini\b|\bimagen\b|\bpyodide\b|\blocalpython\b|\blive artifacts\b/.test(
        haystack,
      )
    ) {
      return 'MODEL';
    }

    return 'SYSTEM';
  }

  private resolveCategory(message: string, options: unknown): LogCategory {
    if (this.isLogOptions(options) && options.category) {
      return options.category;
    }

    return this.inferCategory(message, this.resolveData(options));
  }

  private resolveData(options: unknown): unknown {
    return this.isLogOptions(options) ? options.data : options;
  }

  private scheduleFlush() {
    if (this.isClearing || this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      void this.flush();
    }, FLUSH_INTERVAL_MS);
  }

  private queueLog(entry: LogEntry) {
    if (this.isClearing) return;

    this.logBuffer.push(entry);

    // Notify listeners immediately for "live" feeling, even if not persisted yet
    this.notifyListeners([entry]);

    if (this.logBuffer.length >= FLUSH_THRESHOLD) {
      void this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  private async flush() {
    if (this.logBuffer.length === 0) return;

    if (this.activeFlushPromise) {
      await this.activeFlushPromise;
      if (this.logBuffer.length === 0) return;
    }

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    const logsToSave = [...this.logBuffer];
    this.logBuffer = []; // Clear buffer immediately
    let flushSucceeded = false;

    let flushPromise: Promise<void> | null = null;
    flushPromise = (async () => {
      try {
        await dbService.addLogs(logsToSave);
        flushSucceeded = true;
      } catch (e) {
        console.error('Failed to flush logs to DB:', e);
        if (!this.isClearing) {
          this.logBuffer = [...logsToSave, ...this.logBuffer];
          this.scheduleFlush();
        }
      }
    })().finally(() => {
      if (this.activeFlushPromise === flushPromise) {
        this.activeFlushPromise = null;
      }
    });

    this.activeFlushPromise = flushPromise;
    await flushPromise;

    if (flushSucceeded && this.logBuffer.length > 0 && !this.isClearing) {
      await this.flush();
    }
  }

  private notifyListeners(newLogs: LogEntry[]) {
    const listenersToNotify = Array.from(this.listeners);
    for (const listener of listenersToNotify) {
      listener(newLogs);
    }
  }

  private async pruneOldLogs() {
    try {
      const cutoff = Date.now() - LOG_RETENTION_MS;
      await dbService.pruneLogs(cutoff);
    } catch (e) {
      console.error('Failed to prune old logs:', e);
    }
  }

  // --- API Usage Tracking (Kept in LocalStorage for speed/simplicity) ---

  private loadApiKeyUsage() {
    try {
      const storedUsage = localStorage.getItem(API_USAGE_STORAGE_KEY);
      if (storedUsage) {
        const parsed = JSON.parse(storedUsage);
        if (Array.isArray(parsed)) {
          this.apiKeyUsage = new Map(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load API key usage:', e);
    }
  }

  private saveApiKeyUsage() {
    try {
      const usageArray = Array.from(this.apiKeyUsage.entries());
      localStorage.setItem(API_USAGE_STORAGE_KEY, JSON.stringify(usageArray));
    } catch (e) {
      console.error(e);
    }
  }

  private notifyApiKeyListeners() {
    const listenersToNotify = Array.from(this.apiKeyListeners);
    for (const listener of listenersToNotify) {
      listener(new Map(this.apiKeyUsage));
    }
  }

  // --- Token Usage Tracking ---

  private normalizeTokenUsageStats(stats: unknown): TokenUsageStats {
    if (!stats || typeof stats !== 'object') {
      return { input: 0, output: 0 };
    }

    const usage = stats as {
      input?: number;
      output?: number;
      prompt?: number;
      completion?: number;
    };

    return {
      input: usage.input ?? usage.prompt ?? 0,
      output: usage.output ?? usage.completion ?? 0,
    };
  }

  private loadTokenUsage() {
    try {
      const storedUsage = localStorage.getItem(TOKEN_USAGE_STORAGE_KEY);
      if (storedUsage) {
        const parsed = JSON.parse(storedUsage);
        if (Array.isArray(parsed)) {
          this.tokenUsage = new Map(parsed.map(([modelId, stats]) => [modelId, this.normalizeTokenUsageStats(stats)]));
        }
      }
    } catch (e) {
      console.error('Failed to load token usage:', e);
    }
  }

  private saveTokenUsage() {
    try {
      const usageArray = Array.from(this.tokenUsage.entries());
      localStorage.setItem(TOKEN_USAGE_STORAGE_KEY, JSON.stringify(usageArray));
    } catch (e) {
      console.error(e);
    }
  }

  private notifyTokenUsageListeners() {
    const listenersToNotify = Array.from(this.tokenUsageListeners);
    for (const listener of listenersToNotify) {
      listener(new Map(this.tokenUsage));
    }
  }

  public recordTokenUsage(
    modelId: string,
    usage: {
      promptTokens: number;
      cachedPromptTokens?: number;
      completionTokens: number;
      thoughtTokens?: number;
      toolUsePromptTokens?: number;
      totalTokens?: number;
    },
    exactPricing?: ApiUsageExactPricing,
  ) {
    if (!modelId) return;
    const current = this.tokenUsage.get(modelId) || { input: 0, output: 0 };
    const inputTokens =
      Math.max(usage.promptTokens - (usage.cachedPromptTokens ?? 0), 0) + (usage.toolUsePromptTokens ?? 0);
    const outputTokens = usage.completionTokens + (usage.thoughtTokens ?? 0);
    this.tokenUsage.set(modelId, {
      input: current.input + inputTokens,
      output: current.output + outputTokens,
    });
    this.saveTokenUsage();
    this.notifyTokenUsageListeners();
    void dbService
      .addApiUsageRecord({
        timestamp: Date.now(),
        modelId,
        promptTokens: usage.promptTokens,
        cachedPromptTokens: usage.cachedPromptTokens ?? 0,
        completionTokens: usage.completionTokens,
        thoughtTokens: usage.thoughtTokens ?? 0,
        toolUsePromptTokens: usage.toolUsePromptTokens ?? 0,
        totalTokens: usage.totalTokens ?? inputTokens + outputTokens,
        ...(exactPricing ? { exactPricing } : {}),
      })
      .catch((error) => {
        console.error('Failed to persist API usage record:', error);
      });
  }

  // --- Public Interface ---

  /**
   * Standard log methods.
   * Data argument is optional.
   * Category defaults to SYSTEM if not specified in options or inferred.
   */
  public info(message: string, options?: LogOptions | unknown) {
    const category = this.resolveCategory(message, options);
    const data = this.resolveData(options);
    this.queueLog(this.createLogEntry('INFO', category, message, data));
  }

  public warn(message: string, options?: LogOptions | unknown) {
    const category = this.resolveCategory(message, options);
    const data = this.resolveData(options);
    this.queueLog(this.createLogEntry('WARN', category, message, data));
  }

  public error(message: string, options?: ErrorLogOptions | unknown) {
    const category = this.resolveCategory(message, options);
    // Extract 'error' object if passed explicitly for better stack tracing
    const dataCandidate = this.resolveData(options);
    let data = dataCandidate instanceof Error ? this.serializeError(dataCandidate) : dataCandidate;

    if (this.isErrorLogOptions(options) && options.error !== undefined) {
      const serializedError = this.serializeError(options.error);
      data =
        typeof data === 'object' && data !== null && !Array.isArray(data)
          ? { ...(data as Record<string, unknown>), error: serializedError }
          : { error: serializedError, data };
    }
    this.queueLog(this.createLogEntry('ERROR', category, message, data));
  }

  public debug(message: string, options?: LogOptions | unknown) {
    const category = this.resolveCategory(message, options);
    const data = this.resolveData(options);
    this.queueLog(this.createLogEntry('DEBUG', category, message, data));
  }

  // Helper to extract stack traces
  private serializeError(error: unknown): unknown {
    if (error instanceof Error) {
      const normalizedError = error as Error & { cause?: unknown };
      return {
        message: error.message,
        name: error.name,
        stack: error.stack,
        cause: normalizedError.cause,
      };
    }
    return error;
  }

  public recordApiKeyUsage(apiKey: string) {
    if (!apiKey) return;
    const currentCount = this.apiKeyUsage.get(apiKey) || 0;
    this.apiKeyUsage.set(apiKey, currentCount + 1);
    this.saveApiKeyUsage();
    this.notifyApiKeyListeners();
  }

  // --- Subscription & Retrieval ---

  /**
   * Subscribes to NEW logs as they happen (for live view).
   */
  public subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public subscribeToApiKeys(listener: ApiKeyListener): () => void {
    this.apiKeyListeners.add(listener);
    listener(new Map(this.apiKeyUsage));
    return () => this.apiKeyListeners.delete(listener);
  }

  public subscribeToTokenUsage(listener: TokenUsageListener): () => void {
    this.tokenUsageListeners.add(listener);
    listener(new Map(this.tokenUsage));
    return () => this.tokenUsageListeners.delete(listener);
  }

  /**
   * Async fetch logs from DB with pagination.
   */
  public async getRecentLogs(limit = 200, offset = 0): Promise<LogEntry[]> {
    // Ensure buffer is flushed before reading to get latest state
    await this.flush();
    return dbService.getLogs(limit, offset);
  }

  public async clearLogs() {
    this.isClearing = true;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.logBuffer = [];
    try {
      if (this.activeFlushPromise) {
        await this.activeFlushPromise;
      }
      await dbService.clearLogs();
      await dbService.clearApiUsage();
      this.apiKeyUsage.clear();
      this.tokenUsage.clear();
      this.saveApiKeyUsage();
      this.saveTokenUsage();
      this.notifyApiKeyListeners();
      this.notifyTokenUsageListeners();
    } finally {
      this.isClearing = false;
    }
  }
}

export const logService = new LogServiceImpl();
