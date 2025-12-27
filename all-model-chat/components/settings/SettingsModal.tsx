
import React from 'react';
import { AppSettings, ModelOption } from '../../types';
import { Theme } from '../../constants/themeConstants';
import { translations } from '../../utils/appUtils';
import { ApiConfigSection } from './sections/ApiConfigSection';
import { AppearanceSection } from './sections/AppearanceSection';
import { ChatBehaviorSection } from './sections/ChatBehaviorSection';
import { DataManagementSection } from './sections/DataManagementSection';
import { ShortcutsSection } from './sections/ShortcutsSection';
import { AboutSection } from './sections/AboutSection';
import { Modal } from '../shared/Modal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { useSettingsLogic } from '../../hooks/features/useSettingsLogic';
import { SettingsSidebar } from './SettingsSidebar';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AppSettings; 
  availableModels: ModelOption[];
  availableThemes: Theme[]; 
  onSave: (newSettings: AppSettings) => void; 
  onClearAllHistory: () => void;
  onClearCache: () => void;
  onOpenLogViewer: () => void;
  onInstallPwa: () => void;
  isInstallable: boolean;
  onImportSettings: (file: File) => void;
  onExportSettings: () => void;
  onImportHistory: (file: File) => void;
  onExportHistory: () => void;
  onImportScenarios: (file: File) => void;
  onExportScenarios: () => void;
  t: (key: keyof typeof translations) => string;
  setAvailableModels: (models: ModelOption[]) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, currentSettings, availableModels, availableThemes, 
  onSave, onClearAllHistory, onClearCache, onOpenLogViewer,
  onInstallPwa, isInstallable, t, 
  onImportSettings, onExportSettings,
  onImportHistory, onExportHistory,
  onImportScenarios, onExportScenarios,
  setAvailableModels
}) => {
  
  const {
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
      tabs
  } = useSettingsLogic({
      isOpen,
      onClose,
      currentSettings,
      onSave,
      onClearAllHistory,
      onClearCache,
      onOpenLogViewer,
      onImportHistory,
      t
  });

  if (!isOpen) return null;

  const animClass = "animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both";

  return (
    <>
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            noPadding 
            contentClassName="w-full h-[100dvh] sm:h-[85vh] max-h-[800px] sm:w-[90vw] max-w-6xl sm:rounded-xl overflow-hidden flex flex-col md:flex-row shadow-2xl bg-[var(--theme-bg-primary)] transition-all"
        >
            <SettingsSidebar 
                tabs={tabs}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onClose={onClose}
                t={t}
            />

            {/* Content Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-[var(--theme-bg-primary)] relative overflow-hidden">
                {/* Desktop Header */}
                <header className="hidden md:flex items-center px-8 py-6 flex-shrink-0">
                    <h2 className="text-2xl font-bold text-[var(--theme-text-primary)] tracking-tight">
                        {t(tabs.find(t => t.id === activeTab)?.labelKey as any)}
                    </h2>
                </header>

                {/* Scrollable Content */}
                <div 
                    ref={scrollContainerRef}
                    onScroll={handleContentScroll}
                    className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-8"
                >
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
                                    t={t}
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
                                    showWelcomeSuggestions={currentSettings.showWelcomeSuggestions ?? true}
                                    setShowWelcomeSuggestions={(v) => updateSetting('showWelcomeSuggestions', v)}
                                    isAudioCompressionEnabled={currentSettings.isAudioCompressionEnabled}
                                    setIsAudioCompressionEnabled={(v) => updateSetting('isAudioCompressionEnabled', v)}
                                    filesApiConfig={currentSettings.filesApiConfig}
                                    setFilesApiConfig={(v) => updateSetting('filesApiConfig', v)}
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
                                    t={t}
                                />
                            </div>
                        )}
                        {activeTab === 'data' && (
                            <div className={animClass}>
                                <DataManagementSection
                                    onClearHistory={handleRequestClearHistory}
                                    onClearCache={handleRequestClearCache}
                                    onOpenLogViewer={() => { onOpenLogViewer(); onClose(); }}
                                    onClearLogs={handleClearLogs}
                                    onInstallPwa={onInstallPwa}
                                    isInstallable={isInstallable}
                                    onImportSettings={onImportSettings}
                                    onExportSettings={onExportSettings}
                                    onImportHistory={handleRequestImportHistory}
                                    onExportHistory={onExportHistory}
                                    onImportScenarios={onImportScenarios}
                                    onExportScenarios={onExportScenarios}
                                    onReset={handleResetToDefaults}
                                    t={t}
                                />
                            </div>
                        )}
                        {activeTab === 'shortcuts' && ( <div className={animClass}><ShortcutsSection t={t} /></div> )}
                        {activeTab === 'about' && ( <div className={animClass}><AboutSection t={t} /></div> )}
                    </div>
                </div>
            </main>
        </Modal>

        {confirmConfig.isOpen && (
            <ConfirmationModal
                isOpen={confirmConfig.isOpen}
                onClose={closeConfirm}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                message={confirmConfig.message}
                isDanger={confirmConfig.isDanger}
                confirmLabel={confirmConfig.confirmLabel}
                cancelLabel={t('cancel')}
            />
        )}
    </>
  );
};
