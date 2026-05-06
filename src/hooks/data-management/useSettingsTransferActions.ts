import { useMemo } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTranslator } from '@/i18n/translations';
import { useDataExport } from './useDataExport';
import { useDataImport } from './useDataImport';

export const useSettingsTransferActions = () => {
  const appSettings = useSettingsStore((state) => state.appSettings);
  const setAppSettings = useSettingsStore((state) => state.setAppSettings);
  const language = useSettingsStore((state) => state.language);
  const savedGroups = useChatStore((state) => state.savedGroups);
  const updateAndPersistSessions = useChatStore((state) => state.updateAndPersistSessions);
  const updateAndPersistGroups = useChatStore((state) => state.updateAndPersistGroups);
  const t = useMemo(() => getTranslator(language), [language]);

  const dataExport = useDataExport({
    appSettings,
    savedGroups,
    savedScenarios: [],
    t,
  });

  const dataImport = useDataImport({
    setAppSettings,
    updateAndPersistSessions,
    updateAndPersistGroups,
    savedScenarios: [],
    handleSaveAllScenarios: () => {},
    t,
  });

  return {
    onImportSettings: dataImport.handleImportSettings,
    onExportSettings: dataExport.handleExportSettings,
    onImportHistory: dataImport.handleImportHistory,
    onExportHistory: dataExport.handleExportHistory,
  };
};
