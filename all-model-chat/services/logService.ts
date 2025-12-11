
import { dbService } from "../utils/db";

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
export type LogCategory = 'SYSTEM' | 'NETWORK' | 'USER' | 'MODEL' | 'DB' | 'AUTH' | 'FILE';

export interface LogEntry {
  id?: number; // Auto-incremented by IndexedDB
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
}

export interface TokenUsageStats {
    prompt: number;
    completion: number;
}

type LogListener = (newLogs: LogEntry[]) => void;
type ApiKeyListener = (usage: Map<string, number>) => void;
type TokenUsageListener = (usage: Map<string, TokenUsageStats>) => void;

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
  private flushTimer: any = null;

  constructor() {
    this.loadApiKeyUsage();
    this.loadTokenUsage();
    this.pruneOldLogs();
    this.info('Log service initialized (IndexedDB Batched Mode).', { category: 'SYSTEM' });
  }

  // --- Core Logging Logic ---

  private createLogEntry(level: LogLevel, category: LogCategory, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date(),
      level,
      category,
      message,
      data: this.safeSerialize(data),
    };
  }

  private safeSerialize(data: any): any {
    if (data === undefined || data === null) return undefined;
    try {
      // Simple circular reference handler
      const seen = new WeakSet();
      return JSON.parse(JSON.stringify(data, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) return '[Circular]';
          seen.add(value);
        }
        // Truncate extremely long strings to save DB space
        if (typeof value === 'string' && value.length > 5000) {
            return value.substring(0, 5000) + '...[TRUNCATED]';
        }
        return value;
      }));
    } catch (e) {
      return '[Serialization Failed]';
    }
  }

  private queueLog(entry: LogEntry) {
    this.logBuffer.push(entry);
    
    // Notify listeners immediately for "live" feeling, even if not persisted yet
    this.notifyListeners([entry]);

    if (this.logBuffer.length >= FLUSH_THRESHOLD) {
      this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), FLUSH_INTERVAL_MS);
    }
  }

  private async flush() {
    if (this.logBuffer.length === 0) return;
    
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    const logsToSave = [...this.logBuffer];
    this.logBuffer = []; // Clear buffer immediately

    try {
      await dbService.addLogs(logsToSave);
    } catch (e) {
      console.error("Failed to flush logs to DB:", e);
      // In a critical system we might retry, but for logs we prefer not to block/explode
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
      console.error("Failed to prune old logs:", e);
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
          console.error("Failed to load API key usage:", e);
      }
  }

  private saveApiKeyUsage() {
      try {
          const usageArray = Array.from(this.apiKeyUsage.entries());
          localStorage.setItem(API_USAGE_STORAGE_KEY, JSON.stringify(usageArray));
      } catch (e) { console.error(e); }
  }

  private notifyApiKeyListeners() {
    const listenersToNotify = Array.from(this.apiKeyListeners);
    for (const listener of listenersToNotify) {
      listener(new Map(this.apiKeyUsage));
    }
  }

  // --- Token Usage Tracking ---

  private loadTokenUsage() {
      try {
          const storedUsage = localStorage.getItem(TOKEN_USAGE_STORAGE_KEY);
          if (storedUsage) {
              const parsed = JSON.parse(storedUsage);
              if (Array.isArray(parsed)) {
                  this.tokenUsage = new Map(parsed);
              }
          }
      } catch (e) {
          console.error("Failed to load token usage:", e);
      }
  }

  private saveTokenUsage() {
      try {
          const usageArray = Array.from(this.tokenUsage.entries());
          localStorage.setItem(TOKEN_USAGE_STORAGE_KEY, JSON.stringify(usageArray));
      } catch (e) { console.error(e); }
  }

  private notifyTokenUsageListeners() {
    const listenersToNotify = Array.from(this.tokenUsageListeners);
    for (const listener of listenersToNotify) {
      listener(new Map(this.tokenUsage));
    }
  }

  public recordTokenUsage(modelId: string, prompt: number, completion: number) {
    if (!modelId) return;
    const current = this.tokenUsage.get(modelId) || { prompt: 0, completion: 0 };
    this.tokenUsage.set(modelId, {
        prompt: current.prompt + prompt,
        completion: current.completion + completion
    });
    this.saveTokenUsage();
    this.notifyTokenUsageListeners();
  }

  // --- Public Interface ---

  /**
   * Standard log methods. 
   * Data argument is optional. 
   * Category defaults to SYSTEM if not specified in options or inferred.
   */
  public info(message: string, options?: { category?: LogCategory, data?: any } | any) {
    // Backwards compatibility: if options is just data object
    const category = options?.category || 'SYSTEM';
    const data = options?.category ? options.data : options;
    this.queueLog(this.createLogEntry('INFO', category, message, data));
  }

  public warn(message: string, options?: { category?: LogCategory, data?: any } | any) {
    const category = options?.category || 'SYSTEM';
    const data = options?.category ? options.data : options;
    this.queueLog(this.createLogEntry('WARN', category, message, data));
  }

  public error(message: string, options?: { category?: LogCategory, data?: any, error?: any } | any) {
    const category = options?.category || 'SYSTEM';
    // Extract 'error' object if passed explicitly for better stack tracing
    let data = options?.category ? options.data : options;
    if (options?.error) {
        data = { ...data, error: this.serializeError(options.error) };
    }
    this.queueLog(this.createLogEntry('ERROR', category, message, data));
  }

  public debug(message: string, options?: { category?: LogCategory, data?: any } | any) {
    const category = options?.category || 'SYSTEM';
    const data = options?.category ? options.data : options;
    this.queueLog(this.createLogEntry('DEBUG', category, message, data));
  }

  // Helper to extract stack traces
  private serializeError(error: any) {
      if (error instanceof Error) {
          return {
              message: error.message,
              name: error.name,
              stack: error.stack,
              cause: (error as any).cause
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
    this.logBuffer = [];
    await dbService.clearLogs();
    this.apiKeyUsage.clear();
    this.tokenUsage.clear(); // Clear token usage
    this.saveApiKeyUsage();
    this.saveTokenUsage();
    // Notify listeners of clear by sending empty or a system event (optional)
    this.info('Logs and stats cleared by user.', { category: 'USER' });
    this.notifyApiKeyListeners();
    this.notifyTokenUsageListeners();
  }
}

export const logService = new LogServiceImpl();
