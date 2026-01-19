
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

interface SettingsContentProps {
    activeTab: SettingsTab;
    currentSettings: AppSettings;
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
    
    t: (key: keyof typeof translations) => string;
}

export const SettingsContent: React.FC<SettingsContentProps> = ({
    activeTab,
    currentSettings,
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
    t
}) => {
    const animClass = "animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both";

    const handleBatchUpdate = (updates: Partial<AppSettings>) => {
        Object.entries(updates).forEach(([key, value]) => {
            updateSetting(key as keyof AppSettings, value as any);
        });
    };

    return (
        <div className="max-w-3xl mx-auto w-full">
            {activeTab === 'model' && (
                <div className={`${animClass} max-w-4xl mx-auto`}>
                    <ChatBehaviorSection
                        modelId={currentSettings.modelId} 
                        setModelId={handleModelChange}
                        transcriptionModelId={currentSettings.transcriptionModelId} setTranscriptionModelId={(v) => updateSetting('transcriptionModelId', v)}
                        generateQuadImages={currentSettings.generateQuadImages ?? false} setGenerateQuadImages={(v) => updateSetting('generateQuadImages', v)}
                        ttsVoice={currentSettings.ttsVoice} setTtsVoice={(v) => updateSetting('ttsVoice', v)}
                        systemInstruction={currentSettings.systemInstruction} setSystemInstruction={(v) => updateSetting('systemInstruction', v)}
                        temperature={currentSettings.temperature} setTemperature={(v) => updateSetting('temperature', v)}
                        topP={currentSettings.topP} setTopP={(v) => updateSetting('topP', v)}
                        showThoughts={currentSettings.showThoughts} setShowThoughts={(v) => updateSetting('showThoughts', v)}
                        thinkingBudget={currentSettings.thinkingBudget} setThinkingBudget={(v) => updateSetting('thinkingBudget', v)}
                        thinkingLevel={currentSettings.thinkingLevel} setThinkingLevel={(v) => updateSetting('thinkingLevel', v)}
                        safetySettings={currentSettings.safetySettings} setSafetySettings={(v) => updateSetting('safetySettings', v)}
                        mediaResolution={currentSettings.mediaResolution} setMediaResolution={(v) => updateSetting('mediaResolution', v)}
                        autoCanvasVisualization={currentSettings.autoCanvasVisualization ?? false}
                        setAutoCanvasVisualization={(v) => updateSetting('autoCanvasVisualization', v)}
                        autoCanvasModelId={currentSettings.autoCanvasModelId || 'gemini-3-flash-preview'}
                        setAutoCanvasModelId={(v) => updateSetting('autoCanvasModelId', v)}
                        availableModels={availableModels}
                        t={t as any}
                        setAvailableModels={setAvailableModels}
                    />
                </div>
            )}
            {activeTab === 'interface' && (
                <div className={animClass}>
                    <AppearanceSection
                        themeId={currentSettings.themeId}
                        setThemeId={(val) => updateSetting('themeId', val)}
                        language={currentSettings.language}
                        setLanguage={(val) => updateSetting('language', val)}
                        isCompletionNotificationEnabled={currentSettings.isCompletionNotificationEnabled}
                        setIsCompletionNotificationEnabled={(val) => updateSetting('isCompletionNotificationEnabled', val)}
                        baseFontSize={currentSettings.baseFontSize}
                        setBaseFontSize={(val) => updateSetting('baseFontSize', val)}
                        expandCodeBlocksByDefault={currentSettings.expandCodeBlocksByDefault}
                        setExpandCodeBlocksByDefault={(v) => updateSetting('expandCodeBlocksByDefault', v)}
                        isMermaidRenderingEnabled={currentSettings.isMermaidRenderingEnabled}
                        setIsMermaidRenderingEnabled={(v) => updateSetting('isMermaidRenderingEnabled', v)}
                        isGraphvizRenderingEnabled={currentSettings.isGraphvizRenderingEnabled ?? true}
                        setIsGraphvizRenderingEnabled={(v) => updateSetting('isGraphvizRenderingEnabled', v)}
                        isAutoScrollOnSendEnabled={currentSettings.isAutoScrollOnSendEnabled ?? true}
                        setIsAutoScrollOnSendEnabled={(v) => updateSetting('isAutoScrollOnSendEnabled', v)}
                        isStreamingEnabled={currentSettings.isStreamingEnabled}
                        setIsStreamingEnabled={(v) => updateSetting('isStreamingEnabled', v)}
                        isAutoTitleEnabled={currentSettings.isAutoTitleEnabled}
                        setIsAutoTitleEnabled={(v) => updateSetting('isAutoTitleEnabled', v)}
                        isSuggestionsEnabled={currentSettings.isSuggestionsEnabled}
                        setIsSuggestionsEnabled={(v) => updateSetting('isSuggestionsEnabled', v)}
                        isAutoSendOnSuggestionClick={currentSettings.isAutoSendOnSuggestionClick ?? true}
                        setIsAutoSendOnSuggestionClick={(v) => updateSetting('isAutoSendOnSuggestionClick', v)}
                        autoFullscreenHtml={currentSettings.autoFullscreenHtml ?? true}
                        setAutoFullscreenHtml={(v) => updateSetting('autoFullscreenHtml', v)}
                        isAudioCompressionEnabled={currentSettings.isAudioCompressionEnabled}
                        setIsAudioCompressionEnabled={(v) => updateSetting('isAudioCompressionEnabled', v)}
                        filesApiConfig={currentSettings.filesApiConfig}
                        setFilesApiConfig={(v) => updateSetting('filesApiConfig', v)}
                        isPasteRichTextAsMarkdownEnabled={currentSettings.isPasteRichTextAsMarkdownEnabled ?? true}
                        setIsPasteRichTextAsMarkdownEnabled={(v) => updateSetting('isPasteRichTextAsMarkdownEnabled', v)}
                        isPasteAsTextFileEnabled={currentSettings.isPasteAsTextFileEnabled ?? true}
                        setIsPasteAsTextFileEnabled={(v) => updateSetting('isPasteAsTextFileEnabled', v)}
                        isSystemAudioRecordingEnabled={currentSettings.isSystemAudioRecordingEnabled ?? false}
                        setIsSystemAudioRecordingEnabled={(v) => updateSetting('isSystemAudioRecordingEnabled', v)}
                        isRawModeEnabled={currentSettings.isRawModeEnabled ?? false}
                        setIsRawModeEnabled={(v) => updateSetting('isRawModeEnabled', v)}
                        hideThinkingInContext={currentSettings.hideThinkingInContext ?? false}
                        setHideThinkingInContext={(v) => updateSetting('hideThinkingInContext', v)}
                        t={t}
                    />
                </div>
            )}
            {activeTab === 'account' && (
                <div className={animClass}>
                    <ApiConfigSection
                        useCustomApiConfig={currentSettings.useCustomApiConfig}
                        setUseCustomApiConfig={(val) => updateSetting('useCustomApiConfig', val)}
                        apiKey={currentSettings.apiKey}
                        setApiKey={(val) => updateSetting('apiKey', val)}
                        apiProxyUrl={currentSettings.apiProxyUrl}
                        setApiProxyUrl={(val) => updateSetting('apiProxyUrl', val)}
                        useApiProxy={currentSettings.useApiProxy ?? false}
                        setUseApiProxy={(val) => updateSetting('useApiProxy', val)}
                        t={t as any}
                    />
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
            {activeTab === 'about' && ( <div className={animClass}><AboutSection t={t} /></div> )}
        </div>
    );
};