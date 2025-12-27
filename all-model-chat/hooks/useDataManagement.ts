
import React, { Dispatch, SetStateAction } from 'react';
import { AppSettings, SavedChatSession, SavedScenario, ChatGroup, Theme } from '../types';
import { useDataExport } from './data-management/useDataExport';
import { useDataImport } from './data-management/useDataImport';
import { useChatSessionExport } from './data-management/useChatSessionExport';

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

export const useDataManagement = (props: DataManagementProps) => {
    const {
        handleExportSettings,
        handleExportHistory,
        handleExportAllScenarios
    } = useDataExport({
        appSettings: props.appSettings,
        savedSessions: props.savedSessions,
        savedGroups: props.savedGroups,
        savedScenarios: props.savedScenarios,
        t: props.t
    });

    const {
        handleImportSettings,
        handleImportHistory,
        handleImportAllScenarios
    } = useDataImport({
        setAppSettings: props.setAppSettings,
        updateAndPersistSessions: props.updateAndPersistSessions,
        updateAndPersistGroups: props.updateAndPersistGroups,
        handleSaveAllScenarios: props.handleSaveAllScenarios,
        t: props.t
    });

    const { exportChatLogic } = useChatSessionExport({
        activeChat: props.activeChat,
        scrollContainerRef: props.scrollContainerRef,
        currentTheme: props.currentTheme,
        language: props.language,
        t: props.t
    });

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
