
import { useCallback } from 'react';
import { AppSettings, SavedChatSession, SavedScenario, ChatGroup } from '../../types';
import { logService, sanitizeSessionForExport } from '../../utils/appUtils';
import { triggerDownload } from '../../utils/exportUtils';

interface UseDataExportProps {
    appSettings: AppSettings;
    savedSessions: SavedChatSession[];
    savedGroups: ChatGroup[];
    savedScenarios: SavedScenario[];
    t: (key: string) => string;
}

export const useDataExport = ({
    appSettings,
    savedSessions,
    savedGroups,
    savedScenarios,
    t
}: UseDataExportProps) => {

    const handleExportSettings = useCallback(() => {
        logService.info(`Exporting settings.`);
        try {
            const dataToExport = { type: 'AllModelChat-Settings', version: 1, settings: appSettings };
            const jsonString = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const date = new Date().toISOString().slice(0, 10);
            triggerDownload(URL.createObjectURL(blob), `all-model-chat-settings-${date}.json`);
        } catch (error) {
            logService.error('Failed to export settings', { error });
            alert(t('export_failed_title'));
        }
    }, [appSettings, t]);

    const handleExportHistory = useCallback(() => {
        logService.info(`Exporting chat history.`);
        try {
            // Sanitize all sessions before export to remove rawFile/Blobs/AbortControllers
            const sanitizedSessions = savedSessions.map(sanitizeSessionForExport);
            
            const dataToExport = { type: 'AllModelChat-History', version: 1, history: sanitizedSessions, groups: savedGroups };
            const jsonString = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const date = new Date().toISOString().slice(0, 10);
            triggerDownload(URL.createObjectURL(blob), `all-model-chat-history-${date}.json`);
        } catch (error) {
            logService.error('Failed to export history', { error });
            alert(t('export_failed_title'));
        }
    }, [savedSessions, savedGroups, t]);

    const handleExportAllScenarios = useCallback(() => {
        logService.info(`Exporting all scenarios.`);
        try {
            const dataToExport = { type: 'AllModelChat-Scenarios', version: 1, scenarios: savedScenarios };
            const jsonString = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const date = new Date().toISOString().slice(0, 10);
            triggerDownload(URL.createObjectURL(blob), `all-model-chat-scenarios-${date}.json`);
        } catch (error) {
            logService.error('Failed to export scenarios', { error });
            alert(t('export_failed_title'));
        }
    }, [savedScenarios, t]);

    return {
        handleExportSettings,
        handleExportHistory,
        handleExportAllScenarios,
    };
};
