// components/LogViewer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { LogEntry, LogLevel, logService } from '../services/logService';
import { AppSettings, ChatSettings } from '../types';
import { X, Trash2, ChevronDown, CheckCircle } from 'lucide-react';

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  INFO: 'text-blue-400',
  WARN: 'text-yellow-400',
  ERROR: 'text-red-400',
  DEBUG: 'text-gray-500',
};

const ObfuscatedApiKey: React.FC<{ apiKey: string }> = ({ apiKey }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  
  if (!apiKey) return null;
  
  const prefix = apiKey.slice(0, -6);
  const suffix = apiKey.slice(-6);

  return (
    <span 
      className="inline-flex items-center cursor-pointer group"
      onMouseDown={() => setIsRevealed(true)}
      onMouseUp={() => setIsRevealed(false)}
      onMouseLeave={() => setIsRevealed(false)}
      onTouchStart={() => setIsRevealed(true)}
      onTouchEnd={() => setIsRevealed(false)}
      title="Click and hold to reveal full key"
    >
      <span className={`transition-all duration-200 ${isRevealed ? 'blur-none' : 'blur-sm'}`}>
        {prefix}
      </span>
      <span>{suffix}</span>
    </span>
  );
};


const LogRow: React.FC<{ log: LogEntry }> = React.memo(({ log }) => {
  const [isDataExpanded, setIsDataExpanded] = useState(false);
  const hasData = log.data !== undefined;

  return (
    <div className="border-b border-[var(--theme-border-secondary)] hover:bg-[var(--theme-bg-tertiary)] font-mono text-xs">
      <div 
        className={`flex items-start p-1.5 ${hasData ? 'cursor-pointer' : ''}`}
        onClick={hasData ? () => setIsDataExpanded(!isDataExpanded) : undefined}
      >
        <span className="w-24 text-[var(--theme-text-tertiary)] flex-shrink-0">
          {log.timestamp.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}
        </span>
        <span className={`w-16 font-semibold flex-shrink-0 ${LOG_LEVEL_COLORS[log.level]}`}>
          {log.level}
        </span>
        <span className="flex-grow break-words whitespace-pre-wrap text-[var(--theme-text-primary)]">
          {log.message}
        </span>
        {hasData && <ChevronDown size={16} className={`ml-2 text-[var(--theme-text-tertiary)] transition-transform ${isDataExpanded ? 'rotate-180' : ''}`} />}
      </div>
      {hasData && isDataExpanded && (
        <div className="bg-[var(--theme-bg-code-block)] p-2 mx-2 mb-2 rounded-md overflow-x-auto custom-scrollbar">
          <pre className="text-xs text-[var(--theme-text-secondary)]">
            {JSON.stringify(log.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
});

interface LogViewerProps {
  isOpen: boolean;
  onClose: () => void;
  appSettings: AppSettings;
  currentChatSettings: ChatSettings;
}

export const LogViewer: React.FC<LogViewerProps> = ({ isOpen, onClose, appSettings, currentChatSettings }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [apiKeyUsage, setApiKeyUsage] = useState<Map<string, number>>(new Map());
  const [filterText, setFilterText] = useState('');
  const [visibleLevels, setVisibleLevels] = useState<Record<LogLevel, boolean>>({
    INFO: true,
    WARN: true,
    ERROR: true,
    DEBUG: true,
  });
  const [autoScroll, setAutoScroll] = useState(true);
  const [isActuallyOpen, setIsActuallyOpen] = useState(isOpen);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsActuallyOpen(true);
      const timer = setTimeout(() => closeButtonRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setIsActuallyOpen(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const unsubscribe = logService.subscribe(setLogs);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOpen && appSettings.useCustomApiConfig) {
        const unsubscribe = logService.subscribeToApiKeys(setApiKeyUsage);
        return () => unsubscribe();
    } else if (!isOpen) {
        setApiKeyUsage(new Map());
    }
  }, [isOpen, appSettings.useCustomApiConfig]);

  useEffect(() => {
    if (autoScroll) {
      logContainerRef.current?.scrollTo({ top: logContainerRef.current.scrollHeight });
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    const container = logContainerRef.current;
    if (container) {
      const isScrolledToBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 20;
      if (!isScrolledToBottom && autoScroll) {
        setAutoScroll(false);
      } else if (isScrolledToBottom && !autoScroll) {
        setAutoScroll(true);
      }
    }
  };

  const handleClose = () => {
    if (isOpen) onClose();
  };
  
  const handleClear = () => {
    logService.clearLogs();
  };

  const toggleLevel = (level: LogLevel) => {
    setVisibleLevels(prev => ({ ...prev, [level]: !prev[level] }));
  };

  const filteredLogs = logs.filter(log => {
    if (!visibleLevels[log.level]) return false;
    if (filterText.trim() === '') return true;
    const lowerFilter = filterText.toLowerCase();
    return log.message.toLowerCase().includes(lowerFilter) || 
           (log.data && JSON.stringify(log.data).toLowerCase().includes(lowerFilter));
  });

  if (!isActuallyOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-2 sm:p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-viewer-title"
      onClick={handleClose}
    >
      <div
        className={`bg-[var(--theme-bg-primary)] w-full h-full max-w-4xl shadow-2xl flex flex-col overflow-hidden rounded-xl border border-[var(--theme-border-primary)] ${isOpen ? 'modal-enter-animation' : 'modal-exit-animation'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="py-2 px-4 border-b border-[var(--theme-border-secondary)] flex justify-between items-center flex-shrink-0 bg-[var(--theme-bg-secondary)]">
          <h2 id="log-viewer-title" className="text-lg font-semibold text-[var(--theme-text-link)]">
            Application Logs
          </h2>
          <button ref={closeButtonRef} onClick={handleClose} className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] rounded-full transition-colors">
            <X size={22} />
          </button>
        </header>
        
        {appSettings.useCustomApiConfig && apiKeyUsage.size > 0 && (
          <div className="p-3 border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)] text-xs flex-shrink-0">
            <h4 className="font-semibold text-sm mb-2 text-[var(--theme-text-primary)]">API Key Usage</h4>
            <div className="max-h-28 overflow-y-auto custom-scrollbar pr-2 -mr-2">
              <ul className="space-y-1">
                {Array.from(apiKeyUsage.entries())
                  .sort(([, a], [, b]) => b - a)
                  .map(([key, count]) => (
                  <li key={key} className={`flex justify-between items-center p-1.5 rounded-md ${currentChatSettings.lockedApiKey === key ? 'bg-[var(--theme-bg-accent)] bg-opacity-20' : ''}`}>
                    <code className="text-sm text-[var(--theme-text-secondary)] font-mono flex items-center">
                        <ObfuscatedApiKey apiKey={key} />
                        {currentChatSettings.lockedApiKey === key && 
                          <span className="text-xs font-bold text-[var(--theme-text-success)] ml-2 flex items-center gap-1">
                            <CheckCircle size={12}/>
                            (Active)
                          </span>
                        }
                    </code>
                    <span className="font-semibold text-sm text-[var(--theme-text-primary)]">{count} calls</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        <div className="p-2 sm:p-3 border-b border-[var(--theme-border-secondary)] flex flex-wrap items-center gap-x-4 gap-y-2 flex-shrink-0">
          <input
            type="text"
            placeholder="Filter logs..."
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            className="flex-grow p-1.5 text-sm bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-md focus:ring-1 focus:ring-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)]"
          />
          <div className="flex items-center gap-x-3 text-xs">
            {Object.keys(visibleLevels).map(level => (
              <label key={level} className="flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={visibleLevels[level as LogLevel]}
                  onChange={() => toggleLevel(level as LogLevel)}
                  className={`mr-1.5 h-4 w-4 rounded border-gray-600 focus:ring-blue-500 text-blue-500 bg-gray-700`}
                />
                <span className={LOG_LEVEL_COLORS[level as LogLevel]}>{level}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-x-4">
            <label className="flex items-center cursor-pointer text-xs text-[var(--theme-text-secondary)] select-none">
              <input type="checkbox" checked={autoScroll} onChange={() => setAutoScroll(!autoScroll)} className="mr-1.5 h-4 w-4 rounded border-gray-600 focus:ring-blue-500 text-blue-500 bg-gray-700" />
              Auto-scroll
            </label>
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 text-xs text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-danger)] transition-colors p-1 rounded-md"
            >
              <Trash2 size={14} /> Clear
            </button>
          </div>
        </div>

        <div
          ref={logContainerRef}
          onScroll={handleScroll}
          className="flex-grow overflow-y-auto overflow-x-hidden custom-scrollbar bg-[var(--theme-bg-secondary)]"
        >
          {filteredLogs.map(log => <LogRow key={log.id} log={log} />)}
        </div>
      </div>
    </div>
  );
};