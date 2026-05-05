import React from 'react';
import { useI18n } from '../../../contexts/I18nContext';
import { Wand2 } from 'lucide-react';
import { AVAILABLE_CANVAS_MODELS } from '../../../constants/settingsModelOptions';
import { ToggleItem } from '../../shared/ToggleItem';
import { Select } from '../../shared/Select';
import { DEFAULT_AUTO_CANVAS_MODEL_ID } from '../../../constants/appConstants';
import type { AppSettings } from '../../../types';
import type { SettingsUpdateHandler } from '../settingsTypes';

interface CanvasSectionProps {
  currentSettings: AppSettings;
  onUpdateSetting: SettingsUpdateHandler;
}

export const CanvasSection: React.FC<CanvasSectionProps> = ({ currentSettings, onUpdateSetting }) => {
  const { t } = useI18n();
  const autoCanvasVisualization = currentSettings.autoCanvasVisualization ?? false;
  const autoCanvasModelId = currentSettings.autoCanvasModelId || DEFAULT_AUTO_CANVAS_MODEL_ID;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
        <Wand2 size={14} strokeWidth={1.5} />
        {t('settingsCanvasSectionTitle')}
      </h4>
      <div className="space-y-1">
        <ToggleItem
          label={t('settings_autoCanvasVisualization_label')}
          checked={autoCanvasVisualization}
          onChange={(value) => onUpdateSetting('autoCanvasVisualization', value)}
          tooltip={t('settings_autoCanvasVisualization_tooltip')}
        />

        <Select
          id="canvas-model-select"
          label=""
          layout="horizontal"
          labelContent={
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--theme-text-primary)]">
              {t('settings_autoCanvasModel_label')}
            </div>
          }
          value={autoCanvasModelId}
          onChange={(event) => onUpdateSetting('autoCanvasModelId', event.target.value)}
          className="py-3"
        >
          {AVAILABLE_CANVAS_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
};
