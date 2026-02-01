
import React from 'react';
import { translations } from '../../../utils/appUtils';
import { AppSettings } from '../../../types';
import { ThemeLanguageSelector } from './appearance/ThemeLanguageSelector';
import { FontSizeControl } from './appearance/FontSizeControl';
import { FileStrategyControl } from './appearance/FileStrategyControl';
import { InterfaceToggles } from './appearance/InterfaceToggles';

interface AppearanceSectionProps {
  settings: AppSettings;
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  t: (key: keyof typeof translations) => string;
}

export const AppearanceSection: React.FC<AppearanceSectionProps> = ({ settings, onUpdate, t }) => {
  return (
    <div className="space-y-6">
      <ThemeLanguageSelector
        settings={settings}
        onUpdate={onUpdate}
        t={t}
      />

      <FontSizeControl
        settings={settings}
        onUpdate={onUpdate}
        t={t}
      />

      <FileStrategyControl
        settings={settings}
        onUpdate={onUpdate}
        t={t}
      />

      <InterfaceToggles
        settings={settings}
        onUpdate={onUpdate}
        t={t}
      />
    </div>
  );
};
