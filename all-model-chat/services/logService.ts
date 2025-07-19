// services/logService.ts

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogEntry {
  id: number;
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: any;
}

export type ApiKeyUsage = {
  total: number;
  failures: number;
};

type LogListener = (logs: LogEntry[]) => void;
type ApiKeyListener = (usage: Map<string, ApiKeyUsage>) => void;

const LOG_STORAGE_KEY = 'chatLogEntries';
const API_USAGE_STORAGE_KEY = 'chatApiUsageData';
const LOG_RETENTION_MS = 2 * 24 * 60 * 60 * 1000; // 2 days

class LogServiceImpl {
  private logs: LogEntry[] = [];
  private listeners: Set<LogListener> = new Set();
  private apiKeyUsage: Map<string, ApiKeyUsage> = new Map();
  private apiKeyListeners: Set<ApiKeyListener> = new Set();
  private idCounter = 0;

  constructor() {
    this.loadLogs();
    this.loadApiKeyUsage();
    this.addLog('INFO', 'Log service initialized.');
  }

  private loadLogs() {
    try {
      const storedLogs = localStorage.getItem(LOG_STORAGE_KEY);
      if (storedLogs) {
        const parsed = JSON.parse(storedLogs, (key, value) => {
          if (key === 'timestamp' && typeof value === 'string') {
            return new Date(value);
          }
          return value;
        });
        if (Array.isArray(parsed)) {
          const twoDaysAgo = Date.now() - LOG_RETENTION_MS;
          this.logs = parsed.filter((log: LogEntry) => log.timestamp && log.timestamp.getTime() >= twoDaysAgo);
          this.idCounter = this.logs.length > 0 ? Math.max(...this.logs.map(l => l.id)) + 1 : 0;
          this.saveLogs(); // Save back to prune any old logs from storage
        }
      }
    } catch (e) {
      console.error("Failed to load logs:", e);
      this.logs = [];
    }
  }

  private saveLogs() {
    try {
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(this.logs));
    } catch (e) {
      console.error("Failed to save logs:", e);
    }
  }

  private loadApiKeyUsage() {
      try {
          const storedUsage = localStorage.getItem(API_USAGE_STORAGE_KEY);
          if (storedUsage) {
              const parsed = JSON.parse(storedUsage);
              if (Array.isArray(parsed)) {
                  this.apiKeyUsage = new Map(parsed.map(([key, value]) => {
                      if (typeof value === 'number') {
                          return [key, { total: value, failures: 0 }];
                      }
                      return [key, value];
                  }));
              }
          }
      } catch (e) {
          console.error("Failed to load API key usage data:", e);
          this.apiKeyUsage = new Map();
      }
  }

  private saveApiKeyUsage() {
      try {
          const usageArray = Array.from(this.apiKeyUsage.entries());
          localStorage.setItem(API_USAGE_STORAGE_KEY, JSON.stringify(usageArray));
      } catch (e) {
          console.error("Failed to save API key usage data:", e);
      }
  }

  private addLog(level: LogLevel, message: string, data?: any) {
    const newLog: LogEntry = {
      id: this.idCounter++,
      timestamp: new Date(),
      level,
      message,
      data,
    };
    this.logs.push(newLog);

    // Prune logs older than retention period.
    const twoDaysAgo = Date.now() - LOG_RETENTION_MS;
    this.logs = this.logs.filter(log => log.timestamp.getTime() >= twoDaysAgo);
    
    this.saveLogs();
    this.notifyListeners();
  }

  private notifyListeners() {
    // Create a copy to avoid issues if a listener unsubscribes during iteration
    const listenersToNotify = Array.from(this.listeners);
    for (const listener of listenersToNotify) {
      listener([...this.logs]);
    }
  }

  private notifyApiKeyListeners() {
    const listenersToNotify = Array.from(this.apiKeyListeners);
    for (const listener of listenersToNotify) {
      listener(new Map(this.apiKeyUsage));
    }
  }
  
  public info(message: string, data?: any) {
    this.addLog('INFO', message, data);
  }

  public warn(message: string, data?: any) {
    this.addLog('WARN', message, data);
  }

  public error(message: string, data?: any) {
    this.addLog('ERROR', message, data);
  }
  
  public debug(message: string, data?: any) {
    this.addLog('DEBUG', message, data);
  }

  public logApiKeyAttempt(apiKey: string) {
    if (!apiKey) return;
    const usage = this.apiKeyUsage.get(apiKey) || { total: 0, failures: 0 };
    usage.total += 1;
    this.apiKeyUsage.set(apiKey, usage);
    this.saveApiKeyUsage();
    this.notifyApiKeyListeners();
  }

  public logApiKeyFailure(apiKey: string) {
    if (!apiKey) return;
    const usage = this.apiKeyUsage.get(apiKey) || { total: 0, failures: 0 };
    usage.failures = (usage.failures || 0) + 1;
    this.apiKeyUsage.set(apiKey, usage);
    this.saveApiKeyUsage();
    this.notifyApiKeyListeners();
  }

  public subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    // Immediately provide the current logs to the new subscriber
    listener([...this.logs]);

    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeToApiKeys(listener: ApiKeyListener): () => void {
    this.apiKeyListeners.add(listener);
    listener(new Map(this.apiKeyUsage)); // Immediately provide current usage

    return () => {
      this.apiKeyListeners.delete(listener);
    };
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    this.apiKeyUsage.clear();
    this.saveLogs();
    this.saveApiKeyUsage();
    this.notifyListeners();
    this.notifyApiKeyListeners();
    this.info('Logs and stats cleared.');
  }
}

export const logService = new LogServiceImpl();