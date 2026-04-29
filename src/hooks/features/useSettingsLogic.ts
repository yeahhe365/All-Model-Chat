import { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { AppSettings } from '../../types';
import { DEFAULT_APP_SETTINGS } from '../../constants/appConstants';
import { logService } from '../../services/logService';
import {
  cacheModelSettings,
  getCachedModelSettings,
  adjustThinkingBudget,
  getDefaultThinkingLevelForModel,
} from '../../utils/modelHelpers';
import { translations } from '../../utils/translations';
import { MediaResolution } from '../../types/settings';

export type SettingsTab = 'models' | 'interface' | 'api' | 'data' | 'shortcuts' | 'about';
export type SettingsTabDescriptor = { id: SettingsTab; labelKey: string };

const SETTINGS_TAB_STORAGE_KEY = 'chatSettingsLastTab';

const normalizeSettingsTab = (savedTab: string | null): SettingsTab | null => {
  switch (savedTab) {
    case 'model':
    case 'chat':
    case 'models':
    case 'generation':
      return 'models';
    case 'languageVoice':
      return 'models';
    case 'canvas':
      return 'models';
    case 'safety':
      return 'models';
    case 'interface':
      return 'interface';
    case 'shortcuts':
      return 'shortcuts';
    case 'api':
    case 'account':
      return 'api';
    case 'data':
      return 'data';
    case 'about':
      return 'about';
    default:
      return null;
  }
};

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
  const latestSettingsRef = useRef(currentSettings);

  useEffect(() => {
    latestSettingsRef.current = currentSettings;
  }, [currentSettings]);

  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    try {
      const normalizedTab = normalizeSettingsTab(localStorage.getItem(SETTINGS_TAB_STORAGE_KEY));
      if (normalizedTab) {
        return normalizedTab;
      }
    } catch {
      // Ignore storage errors
    }
    return 'models';
  });

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
    confirmLabel?: string;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollSaveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeTab) {
      localStorage.setItem(SETTINGS_TAB_STORAGE_KEY, activeTab);
    }
  }, [activeTab]);

  // Restore scroll position when tab changes or modal opens
  useLayoutEffect(() => {
    if (isOpen && scrollContainerRef.current) {
      const key = `chatSettingsScroll_${activeTab}`;
      const savedPosition = localStorage.getItem(key);

      // Use requestAnimationFrame to ensure content has reflowed
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = savedPosition ? parseInt(savedPosition, 10) : 0;
        }
      });
    }
  }, [activeTab, isOpen]);

  const handleContentScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;

    if (scrollSaveTimeoutRef.current) {
      clearTimeout(scrollSaveTimeoutRef.current);
    }

    // Debounce saving to localStorage
    scrollSaveTimeoutRef.current = window.setTimeout(() => {
      localStorage.setItem(`chatSettingsScroll_${activeTab}`, scrollTop.toString());
    }, 150);
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

    // 1. Cache current model settings
    if (latestSettings.modelId) {
      cacheModelSettings(latestSettings.modelId, {
        mediaResolution: latestSettings.mediaResolution,
        thinkingBudget: latestSettings.thinkingBudget,
        thinkingLevel: latestSettings.thinkingLevel,
      });
    }

    // 2. Load cached settings for new model
    const cached = getCachedModelSettings(newModelId);

    let newThinkingBudget = cached?.thinkingBudget ?? latestSettings.thinkingBudget;
    const newThinkingLevel =
      cached?.thinkingLevel ?? getDefaultThinkingLevelForModel(newModelId, latestSettings.thinkingLevel);
    const newMediaResolution =
      cached?.mediaResolution ?? latestSettings.mediaResolution ?? MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED;

    // 3. Apply defaults/clamping logic using shared helper
    newThinkingBudget = adjustThinkingBudget(newModelId, newThinkingBudget);

    const nextSettings = {
      ...latestSettings,
      modelId: newModelId,
      thinkingBudget: newThinkingBudget,
      thinkingLevel: newThinkingLevel,
      mediaResolution: newMediaResolution,
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
