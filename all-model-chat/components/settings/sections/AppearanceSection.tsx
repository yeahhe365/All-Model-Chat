
import React from 'react';
import { translations } from '../../../utils/appUtils';
import { FilesApiConfig } from '../../../types';
import { ThemeLanguageSelector } from './appearance/ThemeLanguageSelector';
import { FontSizeControl } from './appearance/FontSizeControl';
import { FileStrategyControl } from './appearance/FileStrategyControl';
import { InterfaceToggles } from './appearance/InterfaceToggles';

interface AppearanceSectionProps {
  themeId: 'system' | 'onyx' | 'pearl';
  setThemeId: (value: 'system' | 'onyx' | 'pearl') => void;
  language: 'en' | 'zh' | 'system';
  setLanguage: (value: 'en' | 'zh' | 'system') => void;
  isCompletionNotificationEnabled: boolean;
  setIsCompletionNotificationEnabled: (value: boolean) => void;
  baseFontSize: number;
  setBaseFontSize: (value: number) => void;
  expandCodeBlocksByDefault: boolean;
  setExpandCodeBlocksByDefault: (value: boolean) => void;
  isMermaidRenderingEnabled: boolean;
  setIsMermaidRenderingEnabled: (value: boolean) => void;
  isGraphvizRenderingEnabled: boolean;
  setIsGraphvizRenderingEnabled: (value: boolean) => void;
  isAutoScrollOnSendEnabled: boolean;
  setIsAutoScrollOnSendEnabled: (value: boolean) => void;
  isStreamingEnabled: boolean;
  setIsStreamingEnabled: (value: boolean) => void;
  isAutoTitleEnabled: boolean;
  setIsAutoTitleEnabled: (value: boolean) => void;
  isSuggestionsEnabled: boolean;
  setIsSuggestionsEnabled: (value: boolean) => void;
  isAutoSendOnSuggestionClick: boolean;
  setIsAutoSendOnSuggestionClick: (value: boolean) => void;
  autoFullscreenHtml: boolean;
  setAutoFullscreenHtml: (value: boolean) => void;
  showWelcomeSuggestions: boolean;
  setShowWelcomeSuggestions: (value: boolean) => void;
  isAudioCompressionEnabled: boolean;
  setIsAudioCompressionEnabled: (value: boolean) => void;
  filesApiConfig: FilesApiConfig;
  setFilesApiConfig: (value: FilesApiConfig) => void;
  isPasteRichTextAsMarkdownEnabled: boolean;
  setIsPasteRichTextAsMarkdownEnabled: (value: boolean) => void;
  isPasteAsTextFileEnabled: boolean;
  setIsPasteAsTextFileEnabled: (value: boolean) => void;
  t: (key: keyof typeof translations) => string;
}

export const AppearanceSection: React.FC<AppearanceSectionProps> = (props) => {
  return (
    <div className="space-y-6">
      <ThemeLanguageSelector
        themeId={props.themeId}
        setThemeId={props.setThemeId}
        language={props.language}
        setLanguage={props.setLanguage}
        t={props.t}
      />

      <FontSizeControl
        baseFontSize={props.baseFontSize}
        setBaseFontSize={props.setBaseFontSize}
        t={props.t}
      />

      <FileStrategyControl
        filesApiConfig={props.filesApiConfig}
        setFilesApiConfig={props.setFilesApiConfig}
        t={props.t}
      />

      <InterfaceToggles
        {...props}
      />
    </div>
  );
};
