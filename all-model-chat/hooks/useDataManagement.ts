import { useCallback, Dispatch, SetStateAction } from 'react';
import { AppSettings, SavedChatSession, SavedScenario, ChatGroup, Theme } from '../types';
import { DEFAULT_APP_SETTINGS } from '../constants/appConstants';
import { logService } from '../utils/appUtils';
import { sanitizeFilename, exportElementAsPng, exportHtmlStringAsFile, exportTextStringAsFile, gatherPageStyles, triggerDownload } from '../utils/exportUtils';
import DOMPurify from 'dompurify';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;
type GroupsUpdater = (updater: (prev: ChatGroup[]) => ChatGroup[]) => void;

interface DataManagementProps {
    appSettings: AppSettings;
    setAppSettings: Dispatch<SetStateAction<AppSettings>>;
    savedSessions: SavedChatSession[];
    updateAndPersistSessions: SessionsUpdater;
    savedGroups: ChatGroup[];
    updateAndPersistGroups: GroupsUpdater;
    savedScenarios: SavedScenario[];
    handleSaveAllScenarios: (scenarios: SavedScenario[]) => void;
    t: (key: string) => string;
    activeChat: SavedChatSession | undefined;
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    currentTheme: Theme;
    language: 'en' | 'zh';
}

export const useDataManagement = ({
    appSettings,
    setAppSettings,
    savedSessions,
    updateAndPersistSessions,
    savedGroups,
    updateAndPersistGroups,
    savedScenarios,
    handleSaveAllScenarios,
    t,
    activeChat,
    scrollContainerRef,
    currentTheme,
    language,
}: DataManagementProps) => {

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
            const dataToExport = { type: 'AllModelChat-History', version: 1, history: savedSessions, groups: savedGroups };
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

    const handleImportFile = useCallback((file: File, expectedType: string, onValid: (data: any) => void) => {
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
        handleImportFile(file, 'AllModelChat-Settings', (data) => {
            const importedSettings = data.settings;
            const newSettings = { ...DEFAULT_APP_SETTINGS };
            for (const key of Object.keys(DEFAULT_APP_SETTINGS) as Array<keyof AppSettings>) {
                if (Object.prototype.hasOwnProperty.call(importedSettings, key)) {
                    const importedValue = importedSettings[key];
                    const defaultValue = DEFAULT_APP_SETTINGS[key];
                    if (typeof importedValue === typeof defaultValue || (['apiKey', 'apiProxyUrl', 'lockedApiKey'].includes(key) && (typeof importedValue === 'string' || importedValue === null))) {
                        (newSettings as any)[key] = importedValue;
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
        if (!window.confirm(t('settingsImportHistory_confirm'))) return;
        handleImportFile(file, 'AllModelChat-History', (data) => {
            if (data.history && Array.isArray(data.history)) {
                updateAndPersistSessions(() => data.history);
                if (data.groups && Array.isArray(data.groups)) {
                    updateAndPersistGroups(() => data.groups);
                } else {
                    updateAndPersistGroups(() => []); // Clear groups if not present in import
                }
                alert(t('settingsImportHistory_success'));
                setTimeout(() => window.location.reload(), 300);
            } else {
                throw new Error('History data is missing or not an array.');
            }
        });
    }, [handleImportFile, t, updateAndPersistSessions, updateAndPersistGroups]);

    const handleImportAllScenarios = useCallback((file: File) => {
        handleImportFile(file, 'AllModelChat-Scenarios', (data) => {
            if (data.scenarios && Array.isArray(data.scenarios)) {
                handleSaveAllScenarios(data.scenarios);
                alert(t('scenarios_feedback_imported'));
            } else {
                throw new Error('Scenarios data is missing or not an array.');
            }
        });
    }, [handleImportFile, t, handleSaveAllScenarios]);

    const exportChatLogic = useCallback(async (format: 'png' | 'html' | 'txt' | 'json') => {
        if (!activeChat) return;
        
        const safeTitle = sanitizeFilename(activeChat.title);
        const date = new Date().toISOString().slice(0, 10);
        const filename = `chat-${safeTitle}-${date}.${format}`;
        const scrollContainer = scrollContainerRef.current;

        if (format === 'png') {
            if (!scrollContainer) return;

            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            tempContainer.style.top = '0px';
            tempContainer.style.width = '1024px';
            tempContainer.style.padding = '0';

            try {
                const allStyles = await gatherPageStyles();
                const chatClone = scrollContainer.cloneNode(true) as HTMLElement;
                
                chatClone.querySelectorAll('details').forEach(details => {
                    details.setAttribute('open', '');
                });

                chatClone.querySelectorAll('[aria-label*="Scroll to"]').forEach(el => el.remove());
                chatClone.querySelectorAll('[data-message-id]').forEach(el => {
                    el.classList.add('message-container-animate');
                });

                const bodyClasses = document.body.className;
                const rootBgColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-bg-primary');
                const exportBgColor = currentTheme.id === 'pearl' ? currentTheme.colors.bgPrimary : currentTheme.colors.bgSecondary;

                tempContainer.innerHTML = `
                    ${allStyles}
                    <div class="theme-${currentTheme.id} ${bodyClasses} is-exporting-png" style="background-color: ${rootBgColor};">
                        <div style="background-color: ${exportBgColor}; padding: 1rem;">
                            <div class="exported-chat-container w-full max-w-7xl mx-auto">
                                ${chatClone.innerHTML}
                            </div>
                        </div>
                    </div>
                `;

                document.body.appendChild(tempContainer);
                const captureTarget = tempContainer.querySelector<HTMLElement>(':scope > div');
                if (!captureTarget) throw new Error("Could not find capture target for PNG export.");
                
                await new Promise(resolve => setTimeout(resolve, 500)); 

                await exportElementAsPng(captureTarget, filename, {
                    backgroundColor: null,
                    scale: 2,
                });

            } finally {
                if (document.body.contains(tempContainer)) {
                    document.body.removeChild(tempContainer);
                }
            }
            return;
        }

        if (format === 'html') {
            if (!scrollContainer) return;

            const headContent = await gatherPageStyles();
            const bodyClasses = document.body.className;
            const rootBgColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-bg-primary');
            const chatHtml = scrollContainer.innerHTML;

            const fullHtml = `
                <!DOCTYPE html>
                <html lang="${language}">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Chat Export: ${DOMPurify.sanitize(activeChat.title)}</title>
                    ${headContent}
                    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
                    <script>
                        document.addEventListener('DOMContentLoaded', () => {
                            document.querySelectorAll('pre code').forEach((el) => {
                                if (window.hljs) {
                                    window.hljs.highlightElement(el);
                                }
                            });
                        });
                    </script>
                    <style>
                        body { background-color: ${rootBgColor}; padding: 1rem; box-sizing: border-box; }
                        .message-actions, .code-block-utility-button { display: none !important; }
                        .sticky[aria-label*="Scroll to"] { display: none !important; }
                    </style>
                </head>
                <body class="${bodyClasses}">
                    <div class="exported-chat-container w-full max-w-7xl mx-auto">
                        ${chatHtml}
                    </div>
                </body>
                </html>
            `;
            exportHtmlStringAsFile(fullHtml, filename);
        } else if (format === 'txt') {
            const textContent = activeChat.messages.map(message => {
                const role = message.role === 'user' ? 'USER' : 'ASSISTANT';
                let content = `### ${role}\n`;
                if (message.files && message.files.length > 0) {
                    message.files.forEach(file => {
                        content += `[File attached: ${file.name}]\n`;
                    });
                }
                content += message.content;
                return content;
            }).join('\n\n');

            exportTextStringAsFile(textContent, filename);
        } else if (format === 'json') {
            logService.info(`Exporting chat ${activeChat.id} as JSON.`);
            try {
                // We create a structure compatible with the history import feature
                const dataToExport = {
                    type: 'AllModelChat-History',
                    version: 1,
                    history: [activeChat], // Exporting only the active chat session
                    groups: [], // No groups are exported with a single chat
                };
                const jsonString = JSON.stringify(dataToExport, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                triggerDownload(URL.createObjectURL(blob), filename);
            } catch (error) {
                logService.error('Failed to export chat as JSON', { error });
                alert(t('export_failed_title'));
            }
        }
    }, [activeChat, currentTheme, language, scrollContainerRef, t]);

    return {
        handleExportSettings,
        handleExportHistory,
        handleExportAllScenarios,
        handleImportSettings,
        handleImportHistory,
        handleImportAllScenarios,
        exportChatLogic,
    };
};
