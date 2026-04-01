
import React, { useState, useEffect, useCallback } from 'react';
import { LogEntry, logService, TokenUsageStats } from '../../services/logService';
import { AppSettings, ChatSettings } from '../../types';
import { X, Terminal, KeyRound, Coins } from 'lucide-react';
import { Modal } from '../shared/Modal';
import { ConsoleTab } from './ConsoleTab';
import { TokenUsageTab } from './TokenUsageTab';
import { ApiUsageTab } from './ApiUsageTab';
import { ConfirmationModal } from '../modals/ConfirmationModal';

interface LogViewerProps {
  isOpen: boolean;
  onClose: () => void;
  appSettings: AppSettings;
  currentChatSettings: ChatSettings;
}

export const LogViewer: React.FC<LogViewerProps> = ({ isOpen, onClose, appSettings, currentChatSettings }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [apiKeyUsage, setApiKeyUsage] = useState<Map<string, number>>(new Map());
  const [tokenUsage, setTokenUsage] = useState<Map<string, TokenUsageStats>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'console' | 'api' | 'tokens'>('console');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

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

  useEffect(() => {
    if (isOpen) {
        fetchLogs(true);
    }
  }, [isOpen, fetchLogs]);

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = logService.subscribe((newLiveLogs) => {
        setLogs(prev => [...newLiveLogs, ...prev]);
    });
    return () => unsubscribe();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && appSettings.useCustomApiConfig) {
        const unsubscribe = logService.subscribeToApiKeys(setApiKeyUsage);
        return () => unsubscribe();
    }
  }, [isOpen, appSettings.useCustomApiConfig]);

  useEffect(() => {
    if (isOpen) {
        const unsubscribe = logService.subscribeToTokenUsage(setTokenUsage);
        return () => unsubscribe();
    }
  }, [isOpen]);

  const handleClear = async () => {
      await logService.clearLogs();
      setLogs([]);
  };

  if (!isOpen) return null;

  return (
    <>
    <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        backdropClassName="bg-black/70 backdrop-blur-md"
        contentClassName="w-full max-w-6xl h-[95vh]"
    >
      <div className="bg-[var(--theme-bg-primary)] w-full h-full shadow-2xl flex flex-col overflow-hidden rounded-xl border border-[var(--theme-border-primary)]">
        {/* Header */}
        <header className="py-2 px-4 border-b border-[var(--theme-border-secondary)] flex justify-between items-center bg-[var(--theme-bg-secondary)] flex-shrink-0">
          <h2 className="text-lg font-semibold text-[var(--theme-text-link)] flex items-center gap-2">
            <Terminal size={20} /> System Logs
          </h2>
          <button onClick={onClose} className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] rounded-full transition-colors"><X size={22} /></button>
        </header>

        {/* Tabs */}
        <div className="border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] px-4 flex-shrink-0">
          <nav className="flex space-x-4">
            <button onClick={() => setActiveTab('console')} className={`flex items-center gap-2 px-2 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'console' ? 'border-[var(--theme-border-focus)] text-[var(--theme-text-primary)]' : 'border-transparent text-[var(--theme-text-tertiary)]'}`}>
                <Terminal size={14} /> Console
            </button>
            <button onClick={() => setActiveTab('tokens')} className={`flex items-center gap-2 px-2 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'tokens' ? 'border-[var(--theme-border-focus)] text-[var(--theme-text-primary)]' : 'border-transparent text-[var(--theme-text-tertiary)]'}`}>
                <Coins size={14} /> Token Usage
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
            <ConsoleTab 
                logs={logs} 
                isLoading={isLoading} 
                hasMore={hasMore} 
                onFetchMore={() => fetchLogs(false)} 
                onClear={() => setIsConfirmOpen(true)} 
            />
          )}

          {activeTab === 'tokens' && (
            <TokenUsageTab tokenUsage={tokenUsage} />
          )}

          {activeTab === 'api' && (
            <ApiUsageTab apiKeyUsage={apiKeyUsage} appSettings={appSettings} currentChatSettings={currentChatSettings} />
          )}
        </div>
      </div>
    </Modal>

    <ConfirmationModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleClear}
        title="Clear Logs"
        message="Are you sure you want to clear all logs and usage statistics from the database?"
        confirmLabel="Clear"
        isDanger
    />
    </>
  );
};
