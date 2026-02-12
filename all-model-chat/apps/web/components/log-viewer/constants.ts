import { LogLevel, LogCategory } from '../../services/logService';

export const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  INFO: 'text-blue-400',
  WARN: 'text-yellow-400',
  ERROR: 'text-red-400',
  DEBUG: 'text-gray-500',
};

export const CATEGORY_COLORS: Record<LogCategory, string> = {
    SYSTEM: 'bg-gray-700 text-gray-200',
    NETWORK: 'bg-purple-900/50 text-purple-200',
    USER: 'bg-green-900/50 text-green-200',
    MODEL: 'bg-blue-900/50 text-blue-200',
    DB: 'bg-indigo-900/50 text-indigo-200',
    AUTH: 'bg-orange-900/50 text-orange-200',
    FILE: 'bg-teal-900/50 text-teal-200',
};
