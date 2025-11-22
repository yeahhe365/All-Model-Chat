
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LogEntry, LogLevel, LogCategory, logService } from '../services/logService';
import { AppSettings, ChatSettings } from '../types';
import { X, Trash2, ChevronDown, CheckCircle, Download, Eye, EyeOff, Terminal, KeyRound, Filter, RefreshCw } from 'lucide-react';
import { Modal } from './shared/Modal';

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  INFO: 'text-blue-400',
  WARN: 'text-yellow-400',
  ERROR: 'text-red-400',
  DEBUG: 'text-gray-500',
};

const CATEGORY_COLORS: Record<LogCategory, string> = {
    SYSTEM: 'bg-gray-700 text-gray-200',
    NETWORK: 'bg-purple-900/50 text-purple-200',
    USER: 'bg-green-900/50 text-green-200',
    MODEL: 'bg-blue-900/50 text-blue-200',
    DB: 'bg-indigo-900/50 text-indigo-200',
    AUTH: 'bg-orange-900/50 text-orange-200',
    FILE: 'bg-teal-900/50 text-teal-200',
};

const ObfuscatedApiKey: React.FC<{ apiKey: string }> = ({ apiKey }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  if (!apiKey) return null;
  return (
    <div className="flex items-center gap-2">
      <code className={`font-mono text-[var(--theme-text-secondary)] break-all transition-all duration-200 ${isRevealed ? 'blur-none' : 'blur-sm select-none'}`}>
        {apiKey}
      </code>
      <button onClick={() => setIsRevealed(!isRevealed)} className="p-1 flex-shrink-0 rounded-full text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors focus:outline-none">
        {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
};

const LogRow: React.FC<{ log: LogEntry }> = React.memo(({ log }) => {
  const [isDataExpanded, setIsDataExpanded] = useState(false);
  const hasData = log.data !== undefined;

  const timeString = log.timestamp.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const ms = log.timestamp.getMilliseconds().toString().padStart(3, '0');

  return (
    <div className="border-b border-[var(--theme-border-secondary)] hover:bg-[var(--theme-bg-tertiary)] text-xs group transition-colors">
      <div 
        className={`flex items-start p-2 gap-3 ${hasData ? 'cursor-pointer' : ''}`}
        onClick={hasData ? () => setIsDataExpanded(!isDataExpanded) : undefined}
      >
        <span className="w-20 text-[var(--theme-text-tertiary)] flex-shrink-0 font-mono opacity-70 pt-0.5">
          {timeString}.{ms}
        </span>
        
        <span className={`w-12 font-bold flex-shrink-0 pt-0.5 ${LOG_LEVEL_COLORS[log.level]}`}>
          {log.level}
        </span>

        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 self-start uppercase tracking-wider ${CATEGORY_COLORS[log.category] || 'bg-gray-700'}`}>
            {log.category}
        </span>

        <span className="flex-grow break-words whitespace-pre-wrap text-[var(--theme-text-primary)] font-mono leading-relaxed">
          {log.message}
        </span>
        
        {hasData && (
            <div className="text-[var(--theme-text-tertiary)] opacity-50 group-hover:opacity-100 flex-shrink-0">
                <ChevronDown size={14} className={`transition-transform duration-200 ${isDataExpanded ? 'rotate-180' : ''}`} />
            </div>
        )}
      </div>
      
      {hasData && isDataExpanded && (
        <div className="bg-[var(--theme-bg-code-block)] border-t border-[var(--theme-border-secondary)] p-3 overflow-x-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-150">
          <pre className="text-[11px] text-[var(--theme-text-secondary)] font-mono">
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
  const [activeCategory, setActiveCategory] = useState<LogCategory | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const [visibleLevels, setVisibleLevels] = useState<Record<LogLevel, boolean>>({
    INFO: true, WARN: true, ERROR: true, DEBUG: true,
  });
  
  const [activeTab, setActiveTab] = useState<'console' | 'api'>('console');
  const logContainerRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // --- Load Data ---

  const fetchLogs = useCallback(async (reset = false) => {
      if (isLoading && !reset) return;
      setIsLoading(true);
      try {
          const currentCount = reset ? 0 : logs.length;
          const newLogs = await logService.getRecentLogs(100, currentCount);
          
          if (reset) {
              setLogs(newLogs);
          } else {
              setLogs(prev => {
                  // Merge and dedupe by ID just in case
                  const existingIds = new Set(prev.map(l => l.id));
                  const uniqueNew = newLogs.filter(l => !existingIds.has(l.id));
                  return [...prev, ...uniqueNew];
              });
          }
          
          setHasMore(newLogs.length === 100);
      } finally {
          setIsLoading(false);
      }
  }, [logs.length, isLoading]);

  // Initial load
  useEffect(() => {
    if (isOpen) {
        fetchLogs(true);
    }
  }, [isOpen]);

  // Live Subscription
  useEffect(() => {
    if (!isOpen) return;
    // Subscribe returns ONLY new logs that happen while open
    const unsubscribe = logService.subscribe((newLiveLogs) => {
        setLogs(prev => [...newLiveLogs, ...prev]); // Prepend new logs
    });
    return () => unsubscribe();
  }, [isOpen]);

  // API Keys
  useEffect(() => {
    if (isOpen && appSettings.useCustomApiConfig) {
        const unsubscribe = logService.subscribeToApiKeys(setApiKeyUsage);
        return () => unsubscribe();
    }
  }, [isOpen, appSettings.useCustomApiConfig]);

  // --- Handlers ---

  const handleClear = async () => {
      if(confirm("Clear all logs from database?")) {
          await logService.clearLogs();
          setLogs([]);
      }
  };

  const toggleLevel = (level: LogLevel) => setVisibleLevels(prev => ({ ...prev, [level]: !prev[level] }));

  const filteredLogs = logs.filter(log => {
    if (!visibleLevels[log.level]) return false;
    if (activeCategory !== 'ALL' && log.category !== activeCategory) return false;
    if (!filterText.trim()) return true;
    const lowerFilter = filterText.toLowerCase();
    return log.message.toLowerCase().includes(lowerFilter) || (log.data && JSON.stringify(log.data).toLowerCase().includes(lowerFilter));
  });

  const handleExport = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logs-export-${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const allApiKeys = (appSettings.apiKey || '').split('\n').map(k => k.trim()).filter(Boolean);
  const displayApiKeyUsage = new Map<string, number>();
  allApiKeys.forEach(key => displayApiKeyUsage.set(key, apiKeyUsage.get(key) || 0));
  apiKeyUsage.forEach((count, key) => { if (!displayApiKeyUsage.has(key)) displayApiKeyUsage.set(key, count); });
  const totalApiUsage = Array.from(displayApiKeyUsage.values()).reduce((sum, count) => sum + count, 0);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} backdropClassName="bg-black/70 backdrop-blur-md">
      <div className="bg-[var(--theme-bg-primary)] w-full h-[95vh] max-w-6xl shadow-2xl flex flex-col overflow-hidden rounded-xl border border-[var(--theme-border-primary)]">
        {/* Header */}
        <header className="py-2 px-4 border-b border-[var(--theme-border-secondary)] flex justify-between items-center bg-[var(--theme-bg-secondary)]">
          <h2 className="text-lg font-semibold text-[var(--theme-text-link)] flex items-center gap-2">
            <Terminal size={20} /> System Logs
          </h2>
          <button onClick={onClose} className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] rounded-full transition-colors"><X size={22} /></button>
        </header>

        {/* Tabs */}
        <div className="border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] px-4">
          <nav className="flex space-x-4">
            <button onClick={() => setActiveTab('console')} className={`flex items-center gap-2 px-2 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'console' ? 'border-[var(--theme-border-focus)] text-[var(--theme-text-primary)]' : 'border-transparent text-[var(--theme-text-tertiary)]'}`}>
                <Terminal size={14} /> Console
            </button>
            {appSettings.useCustomApiConfig && (
                <button onClick={() => setActiveTab('api')} className={`flex items-center gap-2 px-2 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'api' ? 'border-[var(--theme-border-focus)] text-[var(--theme-text-primary)]' : 'border-transparent text-[var(--theme-text-tertiary)]'}`}>
                    <KeyRound size={14} /> API Usage
                </button>
            )}
          </nav>
        </div>
        
        {/* Content */}
        <div className="flex-grow min-h-0 bg-[var(--theme-bg-secondary)] flex flex-col">
          {activeTab === 'console' && (
            <>
              {/* Toolbar */}
              <div className="p-3 border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] flex flex-wrap items-center gap-3">
                <input 
                    type="text" 
                    placeholder="Search logs..." 
                    value={filterText} 
                    onChange={e => setFilterText(e.target.value)}
                    className="flex-grow min-w-[150px] px-3 py-1.5 text-sm bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-md focus:ring-1 focus:ring-[var(--theme-border-focus)] text-[var(--theme-text-primary)]"
                />
                
                <div className="h-6 w-px bg-[var(--theme-border-secondary)] mx-1" />

                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-[var(--theme-text-tertiary)]" />
                    <select 
                        value={activeCategory} 
                        onChange={(e) => setActiveCategory(e.target.value as any)}
                        className="bg-[var(--theme-bg-input)] text-[var(--theme-text-primary)] text-xs rounded border border-[var(--theme-border-secondary)] px-2 py-1 focus:outline-none"
                    >
                        <option value="ALL">All Categories</option>
                        {Object.keys(CATEGORY_COLORS).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-2 text-xs select-none">
                  {Object.keys(visibleLevels).map(level => (
                    <label key={level} className="flex items-center gap-1 cursor-pointer bg-[var(--theme-bg-tertiary)]/50 px-2 py-1 rounded hover:bg-[var(--theme-bg-tertiary)] transition-colors">
                      <input type="checkbox" checked={visibleLevels[level as LogLevel]} onChange={() => toggleLevel(level as LogLevel)} className="accent-[var(--theme-bg-accent)]" />
                      <span className={LOG_LEVEL_COLORS[level as LogLevel]}>{level}</span>
                    </label>
                  ))}
                </div>

                <div className="flex-grow" />

                <button onClick={handleExport} className="flex items-center gap-1.5 text-xs bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-input)] text-[var(--theme-text-primary)] px-3 py-1.5 rounded-md transition-colors" title="Export JSON">
                    <Download size={14} /> Export JSON
                </button>
                <button onClick={handleClear} className="flex items-center gap-1.5 text-xs bg-[var(--theme-bg-danger)]/10 text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)]/20 px-3 py-1.5 rounded-md transition-colors">
                    <Trash2 size={14} /> Clear
                </button>
              </div>

              {/* List */}
              <div ref={logContainerRef} className="flex-grow overflow-y-auto overflow-x-hidden custom-scrollbar bg-[var(--theme-bg-primary)]">
                {filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-[var(--theme-text-tertiary)] opacity-50">
                        <Terminal size={48} className="mb-2" />
                        <p>No logs found</p>
                    </div>
                ) : (
                    filteredLogs.map((log) => <LogRow key={log.id || log.timestamp.toISOString()} log={log} />)
                )}
                
                {/* Load More Trigger */}
                {hasMore && filteredLogs.length > 0 && (
                    <div className="p-4 flex justify-center border-t border-[var(--theme-border-secondary)]">
                        <button 
                            onClick={() => fetchLogs(false)} 
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors disabled:opacity-50"
                        >
                            {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                            Load older logs
                        </button>
                    </div>
                )}
                <div ref={logsEndRef} />
              </div>
            </>
          )}

          {activeTab === 'api' && (
            <div className="p-4 overflow-y-auto custom-scrollbar h-full">
              <h4 className="font-semibold text-lg text-[var(--theme-text-primary)] mb-4 flex items-center gap-2"><KeyRound size={20} /> API Key Usage Statistics</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from(displayApiKeyUsage.entries())
                  .sort(([, a], [, b]) => b - a)
                  .map(([key, count], index) => {
                    const percentage = totalApiUsage > 0 ? (count / totalApiUsage) * 100 : 0;
                    const isActive = currentChatSettings.lockedApiKey === key;
                    return (
                      <div key={key} className={`p-4 rounded-xl border transition-all relative overflow-hidden ${isActive ? 'bg-[var(--theme-bg-accent)]/10 border-[var(--theme-border-focus)]' : 'bg-[var(--theme-bg-input)] border-[var(--theme-border-secondary)]'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-mono text-xs text-[var(--theme-text-tertiary)]">#{index + 1}</span>
                            {isActive && <span className="text-[10px] font-bold uppercase bg-green-900 text-green-300 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle size={10} /> Active</span>}
                        </div>
                        <div className="mb-4">
                            <ObfuscatedApiKey apiKey={key} />
                        </div>
                        <div className="flex items-end justify-between">
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold text-[var(--theme-text-primary)]">{count}</span>
                                <span className="text-xs text-[var(--theme-text-tertiary)]">requests</span>
                            </div>
                            <div className="text-xl font-bold text-[var(--theme-text-tertiary)] opacity-30">
                                {percentage.toFixed(0)}%
                            </div>
                        </div>
                        <div className="absolute bottom-0 left-0 h-1 bg-[var(--theme-bg-accent)] transition-all duration-500" style={{ width: `${percentage}%` }} />
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
