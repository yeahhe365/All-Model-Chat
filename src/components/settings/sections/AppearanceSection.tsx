import React from 'react';
import { AppSettings } from '../../../types';
import { ThemeLanguageSelector } from './appearance/ThemeLanguageSelector';
import { FontSizeControl } from './appearance/FontSizeControl';
import { FileStrategyControl } from './appearance/FileStrategyControl';
import { InterfaceToggles } from './appearance/InterfaceToggles';

interface AppearanceSectionProps {
  settings: AppSettings;
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export const AppearanceSection: React.FC<AppearanceSectionProps> = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-6">
      <ThemeLanguageSelector settings={settings} onUpdate={onUpdate} />

      <FontSizeControl settings={settings} onUpdate={onUpdate} />

      <FileStrategyControl settings={settings} onUpdate={onUpdate} />

      <InterfaceToggles settings={settings} onUpdate={onUpdate} />
    </div>
  );
};
