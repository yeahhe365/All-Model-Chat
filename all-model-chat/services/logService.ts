// services/logService.ts

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogEntry {
  id: number;
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: any;
}

type LogListener = (logs: LogEntry[]) => void;

class LogServiceImpl {
  private logs: LogEntry[] = [];
  private listeners: Set<LogListener> = new Set();
  private maxLogs = 500;
  private idCounter = 0;

  private addLog(level: LogLevel, message: string, data?: any) {
    const newLog: LogEntry = {
      id: this.idCounter++,
      timestamp: new Date(),
      level,
      message,
      data,
    };

    this.logs.push(newLog);

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.notifyListeners();
  }

  private notifyListeners() {
    // Create a copy to avoid issues if a listener unsubscribes during iteration
    const listenersToNotify = Array.from(this.listeners);
    for (const listener of listenersToNotify) {
      listener([...this.logs]);
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

  public subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    // Immediately provide the current logs to the new subscriber
    listener([...this.logs]);

    return () => {
      this.listeners.delete(listener);
    };
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    this.notifyListeners();
    this.info('Logs cleared.');
  }
}

export const logService = new LogServiceImpl();
