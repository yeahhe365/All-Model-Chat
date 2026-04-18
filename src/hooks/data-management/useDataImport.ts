
import { useCallback, Dispatch, SetStateAction } from 'react';
import { AppSettings, SavedChatSession, SavedScenario, ChatGroup } from '../../types';
import { DEFAULT_APP_SETTINGS } from '../../constants/appConstants';
import { generateUniqueId, logService } from '../../utils/appUtils';
import { mergeImportedScenarios } from '../../features/scenarios/scenarioLibrary';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;
type GroupsUpdater = (updater: (prev: ChatGroup[]) => ChatGroup[]) => void;

interface UseDataImportProps {
    setAppSettings: Dispatch<SetStateAction<AppSettings>>;
    updateAndPersistSessions: SessionsUpdater;
    updateAndPersistGroups: GroupsUpdater;
    savedScenarios: SavedScenario[];
    handleSaveAllScenarios: (scenarios: SavedScenario[]) => void;
    t: (key: string) => string;
}

type ImportedSettingsPayload = {
    type: 'AllModelChat-Settings';
    settings: Partial<AppSettings>;
};

type ImportedHistoryPayload = {
    type: 'AllModelChat-History';
    history: SavedChatSession[];
    groups?: ChatGroup[];
};

type ImportedScenariosPayload = {
    type: 'AllModelChat-Scenarios';
    scenarios: SavedScenario[];
};

export const useDataImport = ({
    setAppSettings,
    updateAndPersistSessions,
    updateAndPersistGroups,
    savedScenarios,
    handleSaveAllScenarios,
    t
}: UseDataImportProps) => {

    const handleImportFile = useCallback(<T extends { type: string }>(file: File, expectedType: T['type'], onValid: (data: T) => void) => {
        logService.info(`Importing ${expectedType} from file: ${file.name}`);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const data = JSON.parse(text);
                if (data && data.type === expectedType) {
                    onValid(data);
                } else {
                    throw new Error(`Invalid file format. Expected type: ${expectedType}, found: ${data.type || 'none'}`);
                }
            } catch (error) {
                logService.error(`Failed to import ${expectedType}`, { error });
                alert(`${t('settingsImport_error')} Error: ${error instanceof Error ? error.message : String(error)}`);
            }
        };
        reader.onerror = (e) => {
            logService.error(`Failed to read ${expectedType} file`, { error: e });
            alert(t('settingsImport_error'));
        };
        reader.readAsText(file);
    }, [t]);

    const handleImportSettings = useCallback((file: File) => {
        handleImportFile<ImportedSettingsPayload>(file, 'AllModelChat-Settings', (data) => {
            const importedSettings = data.settings;
            const newSettings: AppSettings = { ...DEFAULT_APP_SETTINGS };
            for (const key of Object.keys(DEFAULT_APP_SETTINGS) as Array<keyof AppSettings>) {
                if (Object.prototype.hasOwnProperty.call(importedSettings, key)) {
                    const importedValue = importedSettings[key];
                    const defaultValue = DEFAULT_APP_SETTINGS[key];
                    if (typeof importedValue === typeof defaultValue || (['apiKey', 'apiProxyUrl', 'liveApiEphemeralTokenEndpoint', 'lockedApiKey'].includes(key) && (typeof importedValue === 'string' || importedValue === null))) {
                        Object.assign(newSettings, { [key]: importedValue } as Partial<AppSettings>);
                    } else {
                        logService.warn(`Type mismatch for setting "${key}" during import. Using default.`);
                    }
                }
            }
            setAppSettings(newSettings);
            alert(t('settingsImport_success'));
        });
    }, [handleImportFile, setAppSettings, t]);

    const handleImportHistory = useCallback((file: File) => {
        handleImportFile<ImportedHistoryPayload>(file, 'AllModelChat-History', (data) => {
            if (data.history && Array.isArray(data.history)) {
                updateAndPersistSessions((prev) => {
                    const existingIds = new Set(prev.map(s => s.id));
                    const newSessions = data.history.filter((s: SavedChatSession) => !existingIds.has(s.id));
                    return [...prev, ...newSessions];
                });

                if (data.groups && Array.isArray(data.groups)) {
                    const importedGroups = data.groups;
                    updateAndPersistGroups((prev) => {
                        const existingIds = new Set(prev.map(g => g.id));
                        const newGroups = importedGroups.filter((g: ChatGroup) => !existingIds.has(g.id));
                        return [...prev, ...newGroups];
                    });
                }
                
                alert(t('settingsImportHistory_success'));
            } else {
                throw new Error('History data is missing or not an array.');
            }
        });
    }, [handleImportFile, t, updateAndPersistSessions, updateAndPersistGroups]);

    const handleImportAllScenarios = useCallback((file: File) => {
        handleImportFile<ImportedScenariosPayload>(file, 'AllModelChat-Scenarios', (data) => {
            if (data.scenarios && Array.isArray(data.scenarios)) {
                handleSaveAllScenarios(
                    mergeImportedScenarios({
                        existingScenarios: savedScenarios,
                        importedScenarios: data.scenarios,
                        createId: generateUniqueId,
                    }),
                );
                alert(t('scenarios_feedback_imported'));
            } else {
                throw new Error('Scenarios data is missing or not an array.');
            }
        });
    }, [handleImportFile, t, handleSaveAllScenarios, savedScenarios]);

    return {
        handleImportSettings,
        handleImportHistory,
        handleImportAllScenarios,
    };
};
