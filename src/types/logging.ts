export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export type LogCategory = 'SYSTEM' | 'NETWORK' | 'USER' | 'MODEL' | 'DB' | 'AUTH' | 'FILE';

export interface LogEntry {
  id?: number;
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: unknown;
}

export interface TokenUsageStats {
  input: number;
  output: number;
}
