import { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { type AppSettings } from '@/types';
import { DEFAULT_APP_SETTINGS } from '@/constants/appConstants';
import { logService } from '@/services/logService';
import { resolveModelSwitchSettings } from '@/utils/modelHelpers';
import { type translations } from '@/i18n/translations';
import { useSettingsUiStore, type SettingsTab, type SettingsTabDescriptor } from '@/stores/settingsUiStore';

export type { SettingsTab, SettingsTabDescriptor };

interface UseSettingsLogicProps {
  isOpen: boolean;
  currentSettings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  onClearAllHistory: () => void;
  onClearCache: () => void;
  onImportHistory: (file: File) => void;
  t: (key: keyof typeof translations) => string;
}

export const useSettingsLogic = ({
  isOpen,
  currentSettings,
  onSave,
  onClearAllHistory,
  onClearCache,
  onImportHistory,
  t,
}: UseSettingsLogicProps) => {
  useSettingsUiStore.getState().hydrateLegacySettingsUiPreferences();

  const latestSettingsRef = useRef(currentSettings);

  useEffect(() => {
    latestSettingsRef.current = currentSettings;
  }, [currentSettings]);

  const activeTab = useSettingsUiStore((state) => state.activeTab);
  const setActiveTab = useSettingsUiStore((state) => state.setActiveTab);
  const activeTabScrollTop = useSettingsUiStore((state) => state.scrollPositions[activeTab] ?? 0);
  const setScrollPosition = useSettingsUiStore((state) => state.setScrollPosition);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
    confirmLabel?: string;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Restore scroll position when tab changes or modal opens
  useLayoutEffect(() => {
    if (isOpen && scrollContainerRef.current) {
      // Use requestAnimationFrame to ensure content has reflowed
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = activeTabScrollTop;
        }
      });
    }
  }, [activeTab, activeTabScrollTop, isOpen]);

  const handleContentScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollPosition(activeTab, e.currentTarget.scrollTop);
  };

  const handleResetToDefaults = () => {
    setConfirmConfig({
      isOpen: true,
      title: t('settingsReset'),
      message: t('settingsReset_confirm'),
      onConfirm: () => onSave(DEFAULT_APP_SETTINGS),
      isDanger: true,
      confirmLabel: t('settingsReset'),
    });
  };

  const handleClearLogs = async () => {
    setConfirmConfig({
      isOpen: true,
      title: t('settingsClearLogs'),
      message: t('settingsClearLogs_confirm'),
      onConfirm: async () => {
        await logService.clearLogs();
      },
      isDanger: true,
      confirmLabel: t('delete'),
    });
  };

  const handleRequestClearHistory = () => {
    setConfirmConfig({
      isOpen: true,
      title: t('settingsClearHistory'),
      message: t('settingsClearHistory_confirm'),
      onConfirm: onClearAllHistory,
      isDanger: true,
      confirmLabel: t('delete'),
    });
  };

  const handleRequestClearCache = () => {
    setConfirmConfig({
      isOpen: true,
      title: t('settingsClearCache'),
      message: t('settingsClearCache_confirm'),
      onConfirm: onClearCache,
      isDanger: true,
      confirmLabel: t('delete'),
    });
  };

  const handleRequestImportHistory = (file: File) => {
    setConfirmConfig({
      isOpen: true,
      title: t('settingsImportHistory'),
      message: t('settingsImportHistory_confirm'),
      onConfirm: () => onImportHistory(file),
      isDanger: false,
      confirmLabel: t('import'),
    });
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (Object.is(latestSettingsRef.current[key], value)) {
      return;
    }

    const nextSettings = { ...latestSettingsRef.current, [key]: value };
    latestSettingsRef.current = nextSettings;
    onSave(nextSettings);
  };

  const handleModelChange = (newModelId: string) => {
    const latestSettings = latestSettingsRef.current;

    if (latestSettings.modelId === newModelId) {
      return;
    }

    const nextSettings = {
      ...latestSettings,
      ...resolveModelSwitchSettings({
        currentSettings: latestSettings,
        sourceSettings: latestSettings,
        targetModelId: newModelId,
      }),
    };

    latestSettingsRef.current = nextSettings;
    onSave(nextSettings);
  };

  const tabs = useMemo<SettingsTabDescriptor[]>(
    () => [
      { id: 'models', labelKey: 'settingsTabModels' },
      { id: 'interface', labelKey: 'settingsTabInterface' },
      { id: 'api', labelKey: 'settingsTabApi' },
      { id: 'data', labelKey: 'settingsTabData' },
      { id: 'shortcuts', labelKey: 'settingsTabShortcuts' },
      { id: 'about', labelKey: 'settingsTabAbout' },
    ],
    [],
  );

  const closeConfirm = () => setConfirmConfig((prev) => ({ ...prev, isOpen: false }));

  return {
    activeTab,
    setActiveTab,
    confirmConfig,
    closeConfirm,
    scrollContainerRef,
    handleContentScroll,
    handleResetToDefaults,
    handleClearLogs,
    handleRequestClearHistory,
    handleRequestClearCache,
    handleRequestImportHistory,
    updateSetting,
    handleModelChange,
    tabs,
  };
};
