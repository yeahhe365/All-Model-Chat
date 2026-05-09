import React from 'react';
import { useI18n } from '../../../contexts/I18nContext';
import { Wand2 } from 'lucide-react';
import { AVAILABLE_LIVE_ARTIFACTS_MODELS } from '../../../constants/settingsModelOptions';
import { ToggleItem } from '../../shared/ToggleItem';
import { Select } from '../../shared/Select';
import { DEFAULT_LIVE_ARTIFACTS_MODEL_ID } from '../../../constants/appConstants';
import type { AppSettings } from '../../../types';
import type { SettingsUpdateHandler } from '../settingsTypes';

interface LiveArtifactsSectionProps {
  currentSettings: AppSettings;
  onUpdateSetting: SettingsUpdateHandler;
}

export const LiveArtifactsSection: React.FC<LiveArtifactsSectionProps> = ({ currentSettings, onUpdateSetting }) => {
  const { t } = useI18n();
  const autoLiveArtifactsVisualization = currentSettings.autoLiveArtifactsVisualization ?? false;
  const autoLiveArtifactsModelId = currentSettings.autoLiveArtifactsModelId || DEFAULT_LIVE_ARTIFACTS_MODEL_ID;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
        <Wand2 size={14} strokeWidth={1.5} />
        {t('settingsLiveArtifactsSectionTitle')}
      </h4>
      <div className="space-y-1">
        <ToggleItem
          label={t('settings_autoLiveArtifactsVisualization_label')}
          checked={autoLiveArtifactsVisualization}
          onChange={(value) => onUpdateSetting('autoLiveArtifactsVisualization', value)}
          tooltip={t('settings_autoLiveArtifactsVisualization_tooltip')}
        />

        <Select
          id="live-artifacts-model-select"
          label=""
          layout="horizontal"
          labelContent={
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--theme-text-primary)]">
              {t('settings_autoLiveArtifactsModel_label')}
            </div>
          }
          value={autoLiveArtifactsModelId}
          onChange={(event) => onUpdateSetting('autoLiveArtifactsModelId', event.target.value)}
          className="py-3"
        >
          {AVAILABLE_LIVE_ARTIFACTS_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
};
