
import React from 'react';
import { AppSettings, ModelOption } from '../../types';
import { translations } from '../../utils/appUtils';
import { SettingsTab } from '../../hooks/features/useSettingsLogic';
import { ApiConfigSection } from './sections/ApiConfigSection';
import { AppearanceSection } from './sections/AppearanceSection';
import { ChatBehaviorSection } from './sections/ChatBehaviorSection';
import { DataManagementSection } from './sections/DataManagementSection';
import { ShortcutsSection } from './sections/ShortcutsSection';
import { AboutSection } from './sections/AboutSection';
import { Save, X } from 'lucide-react';

interface SettingsContentProps {
    activeTab: SettingsTab;
    currentSettings: AppSettings;
    pendingSettings: AppSettings;
    availableModels: ModelOption[];
    updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
    handleModelChange: (modelId: string) => void;
    setAvailableModels: (models: ModelOption[]) => void;

    // Data Management Handlers
    onClearHistory: () => void;
    onClearCache: () => void;
    onOpenLogViewer: () => void;
    onClearLogs: () => void;
    onReset: () => void;
    onInstallPwa: () => void;
    isInstallable: boolean;
    onImportSettings: (file: File) => void;
    onExportSettings: () => void;
    onImportHistory: (file: File) => void;
    onExportHistory: () => void;
    onImportScenarios: (file: File) => void;
    onExportScenarios: () => void;

    // Pending state handlers
    hasUnsavedChanges: boolean;
    onSave: () => void;
    onDiscard: () => void;
    requiresConfirmation: boolean;

    t: (key: keyof typeof translations) => string;
}

export const SettingsContent: React.FC<SettingsContentProps> = ({
    activeTab,
    currentSettings,
    pendingSettings,
    availableModels,
    updateSetting,
    handleModelChange,
    setAvailableModels,
    onClearHistory,
    onClearCache,
    onOpenLogViewer,
    onClearLogs,
    onReset,
    onInstallPwa,
    isInstallable,
    onImportSettings,
    onExportSettings,
    onImportHistory,
    onExportHistory,
    onImportScenarios,
    onExportScenarios,
    hasUnsavedChanges,
    onSave,
    onDiscard,
    requiresConfirmation,
    t
}) => {
    const animClass = "animate-in fade-in zoom-in-95 duration-200 ease-out";

    const handleBatchUpdate = (updates: Partial<AppSettings>) => {
        Object.entries(updates).forEach(([key, value]) => {
            updateSetting(key as keyof AppSettings, value as any);
        });
    };

    // Use pending settings for tabs that require confirmation
    const displaySettings = requiresConfirmation ? pendingSettings : currentSettings;

    // Action buttons for tabs that require confirmation
    const ActionButtons = () => (
        <div className="sticky bottom-0 left-0 right-0 mt-6 pt-4 pb-2 border-t border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)]">
            <div className="flex justify-end gap-3">
                <button
                    onClick={onDiscard}
                    disabled={!hasUnsavedChanges}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                    <X size={16} />
                    {t('settingsDiscardChanges') || 'Discard'}
                </button>
                <button
                    onClick={onSave}
                    disabled={!hasUnsavedChanges}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg bg-[var(--theme-bg-accent)] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                    <Save size={16} />
                    {t('settingsSaveChanges') || 'Save Changes'}
                </button>
            </div>
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto w-full">
            {activeTab === 'model' && (
                <div className={`${animClass} max-w-4xl mx-auto`}>
                    <ChatBehaviorSection
                        modelId={displaySettings.modelId}
                        setModelId={handleModelChange}
                        transcriptionModelId={displaySettings.transcriptionModelId} setTranscriptionModelId={(v) => updateSetting('transcriptionModelId', v)}
                        generateQuadImages={displaySettings.generateQuadImages ?? false} setGenerateQuadImages={(v) => updateSetting('generateQuadImages', v)}
                        ttsVoice={displaySettings.ttsVoice} setTtsVoice={(v) => updateSetting('ttsVoice', v)}
                        systemInstruction={displaySettings.systemInstruction} setSystemInstruction={(v) => updateSetting('systemInstruction', v)}
                        temperature={displaySettings.temperature} setTemperature={(v) => updateSetting('temperature', v)}
                        topP={displaySettings.topP} setTopP={(v) => updateSetting('topP', v)}
                        showThoughts={displaySettings.showThoughts} setShowThoughts={(v) => updateSetting('showThoughts', v)}
                        thinkingBudget={displaySettings.thinkingBudget} setThinkingBudget={(v) => updateSetting('thinkingBudget', v)}
                        thinkingLevel={displaySettings.thinkingLevel} setThinkingLevel={(v) => updateSetting('thinkingLevel', v)}
                        safetySettings={displaySettings.safetySettings} setSafetySettings={(v) => updateSetting('safetySettings', v)}
                        mediaResolution={displaySettings.mediaResolution} setMediaResolution={(v) => updateSetting('mediaResolution', v)}
                        autoCanvasVisualization={displaySettings.autoCanvasVisualization ?? false}
                        setAutoCanvasVisualization={(v) => updateSetting('autoCanvasVisualization', v)}
                        autoCanvasModelId={displaySettings.autoCanvasModelId || 'gemini-3-flash-preview'}
                        setAutoCanvasModelId={(v) => updateSetting('autoCanvasModelId', v)}
                        availableModels={availableModels}
                        t={t as any}
                        setAvailableModels={setAvailableModels}
                    />
                    <ActionButtons />
                </div>
            )}
            {activeTab === 'interface' && (
                <div className={animClass}>
                    <AppearanceSection
                        settings={displaySettings}
                        onUpdate={updateSetting}
                        t={t}
                    />
                    <ActionButtons />
                </div>
            )}
            {activeTab === 'account' && (
                <div className={animClass}>
                    <ApiConfigSection
                        useCustomApiConfig={displaySettings.useCustomApiConfig}
                        setUseCustomApiConfig={(val) => updateSetting('useCustomApiConfig', val)}
                        apiKey={displaySettings.apiKey}
                        setApiKey={(val) => updateSetting('apiKey', val)}
                        apiProxyUrl={displaySettings.apiProxyUrl}
                        setApiProxyUrl={(val) => updateSetting('apiProxyUrl', val)}
                        useApiProxy={displaySettings.useApiProxy ?? false}
                        setUseApiProxy={(val) => updateSetting('useApiProxy', val)}
                        availableModels={availableModels}
                        t={t as any}
                    />
                    <ActionButtons />
                </div>
            )}
            {activeTab === 'data' && (
                <div className={animClass}>
                    <DataManagementSection
                        onClearHistory={onClearHistory}
                        onClearCache={onClearCache}
                        onOpenLogViewer={onOpenLogViewer}
                        onClearLogs={onClearLogs}
                        onInstallPwa={onInstallPwa}
                        isInstallable={isInstallable}
                        onImportSettings={onImportSettings}
                        onExportSettings={onExportSettings}
                        onImportHistory={onImportHistory}
                        onExportHistory={onExportHistory}
                        onImportScenarios={onImportScenarios}
                        onExportScenarios={onExportScenarios}
                        onReset={onReset}
                        t={t}
                    />
                </div>
            )}
            {activeTab === 'shortcuts' && (
                <div className={animClass}>
                    <ShortcutsSection
                        currentSettings={currentSettings}
                        onUpdateSettings={handleBatchUpdate}
                        t={t}
                    />
                </div>
            )}
            {activeTab === 'about' && (<div className={animClass}><AboutSection t={t} /></div>)}
        </div>
    );
};
