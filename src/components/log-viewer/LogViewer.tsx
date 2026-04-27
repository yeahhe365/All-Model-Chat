import React, { useState, useEffect, useCallback } from 'react';
import { logService } from '../../services/logService';
import type { LogEntry, TokenUsageStats } from '../../types/logging';
import { AppSettings, ChatSettings } from '../../types';
import { X, Terminal, KeyRound, Coins } from 'lucide-react';
import { Modal } from '../shared/Modal';
import { ConsoleTab } from './ConsoleTab';
import { TokenUsageTab } from './TokenUsageTab';
import { ApiUsageTab } from './ApiUsageTab';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { UsageOverviewTab } from './UsageOverviewTab';
import { useI18n } from '../../contexts/I18nContext';
import {
  FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS,
  FOCUS_VISIBLE_RING_SECONDARY_OFFSET_CLASS,
} from '../../constants/appConstants';

export interface LogViewerProps {
  isOpen: boolean;
  onClose: () => void;
  appSettings: AppSettings;
  currentChatSettings: ChatSettings;
  initialTab?: 'console' | 'usage';
  initialUsageTab?: 'overview' | 'tokens' | 'api';
}

export const LogViewer: React.FC<LogViewerProps> = ({
  isOpen,
  onClose,
  appSettings,
  currentChatSettings,
  initialTab = 'console',
  initialUsageTab = 'overview',
}) => {
  const { t } = useI18n();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [apiKeyUsage, setApiKeyUsage] = useState<Map<string, number>>(new Map());
  const [tokenUsage, setTokenUsage] = useState<Map<string, TokenUsageStats>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [activeTab, setActiveTab] = useState<'console' | 'usage'>(initialTab);
  const [activeUsageTab, setActiveUsageTab] = useState<'overview' | 'tokens' | 'api'>(initialUsageTab);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const fetchLogs = useCallback(
    async (reset = false) => {
      if (isLoading && !reset) return;
      setIsLoading(true);
      try {
        const currentCount = reset ? 0 : logs.length;
        const newLogs = await logService.getRecentLogs(100, currentCount);

        if (reset) {
          setLogs(newLogs);
        } else {
          setLogs((prev) => {
            const existingIds = new Set(prev.map((l) => l.id));
            const uniqueNew = newLogs.filter((l) => !existingIds.has(l.id));
            return [...prev, ...uniqueNew];
          });
        }

        setHasMore(newLogs.length === 100);
      } finally {
        setIsLoading(false);
      }
    },
    [logs.length, isLoading],
  );

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setActiveUsageTab(initialUsageTab);
    }
  }, [initialTab, initialUsageTab, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchLogs(true);
    }
  }, [fetchLogs, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = logService.subscribe((newLiveLogs) => {
      setLogs((prev) => [...newLiveLogs, ...prev]);
    });
    return () => unsubscribe();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && appSettings.useCustomApiConfig) {
      const unsubscribe = logService.subscribeToApiKeys(setApiKeyUsage);
      return () => unsubscribe();
    }
    return undefined;
  }, [isOpen, appSettings.useCustomApiConfig]);

  useEffect(() => {
    if (isOpen) {
      const unsubscribe = logService.subscribeToTokenUsage(setTokenUsage);
      return () => unsubscribe();
    }
    return undefined;
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
        backdropClassName="bg-black/70"
        contentClassName="w-full max-w-6xl h-[95vh]"
      >
        <div className="bg-[var(--theme-bg-primary)] w-full h-full shadow-2xl flex flex-col overflow-hidden rounded-xl border border-[var(--theme-border-primary)]">
          {/* Header */}
          <header className="py-2 px-4 border-b border-[var(--theme-border-secondary)] flex justify-between items-center bg-[var(--theme-bg-secondary)] flex-shrink-0">
            <h2 className="text-lg font-semibold text-[var(--theme-text-link)] flex items-center gap-2">
              <Terminal size={20} /> {t('logViewer_title')}
            </h2>
            <button
              onClick={onClose}
              className={`p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] rounded-full transition-colors ${FOCUS_VISIBLE_RING_SECONDARY_OFFSET_CLASS}`}
            >
              <X size={22} />
            </button>
          </header>

          {/* Tabs */}
          <div className="border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] px-4 flex-shrink-0">
            <nav className="flex space-x-4">
              <button
                onClick={() => setActiveTab('console')}
                className={`flex items-center gap-2 px-2 py-3 text-sm font-medium border-b-2 transition-colors ${FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS} ${activeTab === 'console' ? 'border-[var(--theme-border-focus)] text-[var(--theme-text-primary)]' : 'border-transparent text-[var(--theme-text-tertiary)]'}`}
              >
                <Terminal size={14} /> {t('logViewer_console_tab')}
              </button>
              <button
                onClick={() => setActiveTab('usage')}
                className={`flex items-center gap-2 px-2 py-3 text-sm font-medium border-b-2 transition-colors ${FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS} ${activeTab === 'usage' ? 'border-[var(--theme-border-focus)] text-[var(--theme-text-primary)]' : 'border-transparent text-[var(--theme-text-tertiary)]'}`}
              >
                <Coins size={14} /> {t('logViewer_usage_tab')}
              </button>
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

            {activeTab === 'usage' && (
              <>
                <div className="border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] px-4 flex-shrink-0">
                  <nav className="flex space-x-4">
                    <button
                      onClick={() => setActiveUsageTab('overview')}
                      className={`flex items-center gap-2 px-2 py-3 text-sm font-medium border-b-2 transition-colors ${FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS} ${activeUsageTab === 'overview' ? 'border-[var(--theme-border-focus)] text-[var(--theme-text-primary)]' : 'border-transparent text-[var(--theme-text-tertiary)]'}`}
                    >
                      <Coins size={14} /> {t('logViewer_overview_tab')}
                    </button>
                    <button
                      onClick={() => setActiveUsageTab('tokens')}
                      className={`flex items-center gap-2 px-2 py-3 text-sm font-medium border-b-2 transition-colors ${FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS} ${activeUsageTab === 'tokens' ? 'border-[var(--theme-border-focus)] text-[var(--theme-text-primary)]' : 'border-transparent text-[var(--theme-text-tertiary)]'}`}
                    >
                      <Coins size={14} /> {t('logViewer_tokens_tab')}
                    </button>
                    {appSettings.useCustomApiConfig && (
                      <button
                        onClick={() => setActiveUsageTab('api')}
                        className={`flex items-center gap-2 px-2 py-3 text-sm font-medium border-b-2 transition-colors ${FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS} ${activeUsageTab === 'api' ? 'border-[var(--theme-border-focus)] text-[var(--theme-text-primary)]' : 'border-transparent text-[var(--theme-text-tertiary)]'}`}
                      >
                        <KeyRound size={14} /> {t('logViewer_api_keys_tab')}
                      </button>
                    )}
                  </nav>
                </div>

                {activeUsageTab === 'overview' && <UsageOverviewTab />}

                {activeUsageTab === 'tokens' && <TokenUsageTab tokenUsage={tokenUsage} />}

                {activeUsageTab === 'api' && (
                  <ApiUsageTab
                    apiKeyUsage={apiKeyUsage}
                    appSettings={appSettings}
                    currentChatSettings={currentChatSettings}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleClear}
        title={t('logViewer_clear_title')}
        message={t('logViewer_clear_message')}
        confirmLabel={t('logViewer_clear_button')}
        isDanger
      />
    </>
  );
};
