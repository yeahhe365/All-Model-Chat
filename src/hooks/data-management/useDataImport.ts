
import { useCallback, Dispatch, SetStateAction } from 'react';
import { AppSettings, SavedChatSession, SavedScenario, ChatGroup, ChatMessage } from '../../types';
import { DEFAULT_APP_SETTINGS } from '../../constants/appConstants';
import { logService } from '../../services/logService';
import { generateUniqueId } from '../../utils/chat/ids';
import { mergeImportedScenarios } from '../../features/scenarios/scenarioLibrary';
import { HarmBlockThreshold, HarmCategory, MediaResolution, type FilesApiConfig, type SafetySetting } from '../../types/settings';

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

const normalizeImportedTimestamp = (value: unknown): number => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    const parsed = new Date(String(value)).getTime();
    return Number.isFinite(parsed) ? parsed : Date.now();
};

const normalizeImportedGroup = (group: ChatGroup): ChatGroup => ({
    ...group,
    timestamp: normalizeImportedTimestamp(group.timestamp),
});

const normalizeImportedDate = (value: unknown): Date | undefined => {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? undefined : value;
    }

    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const normalizeImportedMessage = (message: ChatMessage): ChatMessage => ({
    ...message,
    timestamp: normalizeImportedDate(message.timestamp) ?? new Date(),
    generationStartTime: normalizeImportedDate(message.generationStartTime),
    generationEndTime: normalizeImportedDate(message.generationEndTime),
});

const normalizeImportedSession = (session: SavedChatSession): SavedChatSession => ({
    ...session,
    timestamp: normalizeImportedTimestamp(session.timestamp),
    messages: Array.isArray(session.messages)
        ? session.messages.map((message) => normalizeImportedMessage(message))
        : [],
});

const THEME_IDS = ['system', 'onyx', 'pearl'] as const;
const LANGUAGE_IDS = ['en', 'zh', 'system'] as const;
const THINKING_LEVELS = ['MINIMAL', 'LOW', 'MEDIUM', 'HIGH'] as const;
const STRING_KEYS = [
    'modelId',
    'systemInstruction',
    'ttsVoice',
    'transcriptionModelId',
    'autoCanvasModelId',
] as const satisfies ReadonlyArray<keyof AppSettings>;
const NULLABLE_STRING_KEYS = [
    'apiKey',
    'apiProxyUrl',
    'liveApiEphemeralTokenEndpoint',
    'lockedApiKey',
] as const satisfies ReadonlyArray<keyof AppSettings>;
const BOOLEAN_KEYS = [
    'showThoughts',
    'isGoogleSearchEnabled',
    'isCodeExecutionEnabled',
    'isLocalPythonEnabled',
    'isUrlContextEnabled',
    'isDeepSearchEnabled',
    'isRawModeEnabled',
    'hideThinkingInContext',
    'useCustomApiConfig',
    'serverManagedApi',
    'useApiProxy',
    'isStreamingEnabled',
    'expandCodeBlocksByDefault',
    'isAutoTitleEnabled',
    'isMermaidRenderingEnabled',
    'isGraphvizRenderingEnabled',
    'isCompletionNotificationEnabled',
    'isCompletionSoundEnabled',
    'isSuggestionsEnabled',
    'isAutoScrollOnSendEnabled',
    'isAutoSendOnSuggestionClick',
    'generateQuadImages',
    'autoFullscreenHtml',
    'showWelcomeSuggestions',
    'isAudioCompressionEnabled',
    'autoCanvasVisualization',
    'isPasteRichTextAsMarkdownEnabled',
    'isPasteAsTextFileEnabled',
    'isSystemAudioRecordingEnabled',
] as const satisfies ReadonlyArray<keyof AppSettings>;
const NUMBER_KEYS = [
    'temperature',
    'topP',
    'topK',
    'thinkingBudget',
    'baseFontSize',
] as const satisfies ReadonlyArray<keyof AppSettings>;
const FILE_API_CONFIG_KEYS = ['images', 'pdfs', 'audio', 'video', 'text'] as const;
const HARM_CATEGORIES = new Set(Object.values(HarmCategory));
const HARM_THRESHOLDS = new Set(Object.values(HarmBlockThreshold));
const MEDIA_RESOLUTIONS = new Set(Object.values(MediaResolution));

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const sanitizeFilesApiConfig = (value: unknown, fallback: FilesApiConfig): FilesApiConfig | undefined => {
    if (!isRecord(value)) {
        return undefined;
    }

    const nextConfig: FilesApiConfig = { ...fallback };
    let hasValidOverride = false;

    FILE_API_CONFIG_KEYS.forEach((key) => {
        if (typeof value[key] === 'boolean') {
            nextConfig[key] = value[key];
            hasValidOverride = true;
        }
    });

    return hasValidOverride ? nextConfig : undefined;
};

const sanitizeSafetySettings = (value: unknown, fallback: SafetySetting[] | undefined): SafetySetting[] | undefined => {
    if (!Array.isArray(value)) {
        return undefined;
    }

    const validSettings = value.filter((item): item is SafetySetting =>
        isRecord(item)
        && typeof item.category === 'string'
        && typeof item.threshold === 'string'
        && HARM_CATEGORIES.has(item.category as HarmCategory)
        && HARM_THRESHOLDS.has(item.threshold as HarmBlockThreshold),
    );

    if (validSettings.length > 0) {
        return validSettings;
    }

    return fallback;
};

const sanitizeCustomShortcuts = (value: unknown): Record<string, string> | undefined => {
    if (!isRecord(value)) {
        return undefined;
    }

    const nextShortcuts: Record<string, string> = {};

    Object.entries(value).forEach(([shortcutKey, shortcutValue]) => {
        if (typeof shortcutValue === 'string') {
            nextShortcuts[shortcutKey] = shortcutValue;
        }
    });

    return nextShortcuts;
};

const sanitizeImportedSettings = (importedSettings: Partial<AppSettings>): AppSettings => {
    const newSettings: AppSettings = { ...DEFAULT_APP_SETTINGS };

    STRING_KEYS.forEach((key) => {
        if (typeof importedSettings[key] === 'string') {
            newSettings[key] = importedSettings[key] as never;
        }
    });

    NULLABLE_STRING_KEYS.forEach((key) => {
        const importedValue = importedSettings[key];
        if (typeof importedValue === 'string' || importedValue === null) {
            newSettings[key] = importedValue as never;
        }
    });

    BOOLEAN_KEYS.forEach((key) => {
        if (typeof importedSettings[key] === 'boolean') {
            newSettings[key] = importedSettings[key] as never;
        }
    });

    NUMBER_KEYS.forEach((key) => {
        const importedValue = importedSettings[key];
        if (typeof importedValue === 'number' && Number.isFinite(importedValue)) {
            newSettings[key] = importedValue as never;
        }
    });

    if (THEME_IDS.includes(importedSettings.themeId as typeof THEME_IDS[number])) {
        newSettings.themeId = importedSettings.themeId as AppSettings['themeId'];
    }

    if (LANGUAGE_IDS.includes(importedSettings.language as typeof LANGUAGE_IDS[number])) {
        newSettings.language = importedSettings.language as AppSettings['language'];
    }

    if (THINKING_LEVELS.includes(importedSettings.thinkingLevel as typeof THINKING_LEVELS[number])) {
        newSettings.thinkingLevel = importedSettings.thinkingLevel;
    }

    if (MEDIA_RESOLUTIONS.has(importedSettings.mediaResolution as MediaResolution)) {
        newSettings.mediaResolution = importedSettings.mediaResolution;
    }

    const filesApiConfig = sanitizeFilesApiConfig(importedSettings.filesApiConfig, DEFAULT_APP_SETTINGS.filesApiConfig);
    if (filesApiConfig) {
        newSettings.filesApiConfig = filesApiConfig;
    }

    const safetySettings = sanitizeSafetySettings(importedSettings.safetySettings, DEFAULT_APP_SETTINGS.safetySettings);
    if (safetySettings) {
        newSettings.safetySettings = safetySettings;
    }

    const customShortcuts = sanitizeCustomShortcuts(importedSettings.customShortcuts);
    if (customShortcuts) {
        newSettings.customShortcuts = customShortcuts;
    }

    return newSettings;
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
            const newSettings = sanitizeImportedSettings(data.settings);
            setAppSettings(newSettings);
            alert(t('settingsImport_success'));
        });
    }, [handleImportFile, setAppSettings, t]);

    const handleImportHistory = useCallback((file: File) => {
        handleImportFile<ImportedHistoryPayload>(file, 'AllModelChat-History', (data) => {
            if (data.history && Array.isArray(data.history)) {
                updateAndPersistSessions((prev) => {
                    const existingIds = new Set(prev.map(s => s.id));
                    const newSessions = data.history
                        .map(normalizeImportedSession)
                        .filter((s: SavedChatSession) => !existingIds.has(s.id));
                    return [...prev, ...newSessions];
                });

                if (data.groups && Array.isArray(data.groups)) {
                    const importedGroups = data.groups.map(normalizeImportedGroup);
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
