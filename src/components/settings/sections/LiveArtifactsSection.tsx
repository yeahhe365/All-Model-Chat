import React, { useEffect, useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { ChevronDown, RotateCcw, Wand2 } from 'lucide-react';
import { AVAILABLE_LIVE_ARTIFACTS_MODELS } from '@/constants/settingsModelOptions';
import { ToggleItem } from '@/components/shared/ToggleItem';
import { Select } from '@/components/shared/Select';
import { DEFAULT_LIVE_ARTIFACTS_MODEL_ID, SETTINGS_INPUT_CLASS } from '@/constants/appConstants';
import { loadLiveArtifactsSystemPrompt } from '@/constants/promptHelpers';
import {
  getLiveArtifactsSystemPromptValue,
  updateLiveArtifactsSystemPromptForMode,
} from '@/utils/liveArtifactsPromptSettings';
import type { AppSettings } from '@/types';
import type { SettingsUpdateHandler } from '@/components/settings/settingsTypes';

interface LiveArtifactsSectionProps {
  currentSettings: AppSettings;
  onUpdateSetting: SettingsUpdateHandler;
}

export const LiveArtifactsSection: React.FC<LiveArtifactsSectionProps> = ({ currentSettings, onUpdateSetting }) => {
  const { language, t } = useI18n();
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [builtInPrompt, setBuiltInPrompt] = useState('');
  const autoLiveArtifactsVisualization = currentSettings.autoLiveArtifactsVisualization ?? false;
  const autoLiveArtifactsModelId = currentSettings.autoLiveArtifactsModelId || DEFAULT_LIVE_ARTIFACTS_MODEL_ID;
  const liveArtifactsPromptMode = currentSettings.liveArtifactsPromptMode ?? 'inline';
  const customLiveArtifactsSystemPrompt = getLiveArtifactsSystemPromptValue(currentSettings, liveArtifactsPromptMode);
  const hasCustomLiveArtifactsSystemPrompt = !!customLiveArtifactsSystemPrompt.trim();
  const displayedLiveArtifactsSystemPrompt = hasCustomLiveArtifactsSystemPrompt
    ? customLiveArtifactsSystemPrompt
    : builtInPrompt;

  useEffect(() => {
    let isStale = false;

    setBuiltInPrompt('');
    loadLiveArtifactsSystemPrompt(language, liveArtifactsPromptMode)
      .then((prompt) => {
        if (!isStale) {
          setBuiltInPrompt(prompt);
        }
      })
      .catch(() => {
        if (!isStale) {
          setBuiltInPrompt('');
        }
      });

    return () => {
      isStale = true;
    };
  }, [language, liveArtifactsPromptMode]);

  const updatePromptForCurrentMode = (prompt: string) => {
    onUpdateSetting('liveArtifactsSystemPrompt', '');
    onUpdateSetting(
      'liveArtifactsSystemPrompts',
      updateLiveArtifactsSystemPromptForMode(currentSettings, liveArtifactsPromptMode, prompt),
    );
  };

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

        <div className="py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              id="live-artifacts-prompt-toggle"
              type="button"
              aria-expanded={isPromptExpanded}
              aria-controls="live-artifacts-prompt-panel"
              onClick={() => setIsPromptExpanded((prev) => !prev)}
              className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg px-0 py-2 text-left text-sm font-medium text-[var(--theme-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg-primary)]"
            >
              <span>{t('settings_liveArtifactsSystemPrompt_label')}</span>
              <ChevronDown
                size={16}
                className={`flex-shrink-0 text-[var(--theme-text-tertiary)] transition-transform duration-200 ${
                  isPromptExpanded ? 'rotate-180' : ''
                }`}
                strokeWidth={1.75}
              />
            </button>

            <div className="w-full sm:w-64">
              <Select
                id="live-artifacts-prompt-mode-select"
                label=""
                hideLabel
                aria-label={t('settings_liveArtifactsPromptMode_label')}
                value={liveArtifactsPromptMode}
                onChange={(event) =>
                  onUpdateSetting(
                    'liveArtifactsPromptMode',
                    event.target.value as AppSettings['liveArtifactsPromptMode'],
                  )
                }
                className="w-full"
                wrapperClassName="relative w-full"
              >
                <option value="inline">{t('settings_liveArtifactsPromptMode_inline')}</option>
                <option value="full">{t('settings_liveArtifactsPromptMode_full')}</option>
                <option value="fullHtml">{t('settings_liveArtifactsPromptMode_fullHtml')}</option>
              </Select>
            </div>
          </div>

          {isPromptExpanded && (
            <div id="live-artifacts-prompt-panel" className="mt-2">
              <textarea
                id="live-artifacts-prompt-input"
                value={displayedLiveArtifactsSystemPrompt}
                onChange={(event) => updatePromptForCurrentMode(event.target.value)}
                rows={10}
                className={`w-full min-h-[144px] resize-y rounded-lg border p-2.5 text-sm transition-all duration-200 focus:ring-2 focus:ring-offset-0 custom-scrollbar ${SETTINGS_INPUT_CLASS}`}
                placeholder={t('settings_liveArtifactsSystemPrompt_placeholder')}
                aria-label={t('settings_liveArtifactsSystemPrompt_label')}
              />
              <div className="mt-2 flex items-start justify-between gap-3">
                <p className="min-w-0 text-xs leading-relaxed text-[var(--theme-text-tertiary)]">
                  {t('settings_liveArtifactsSystemPrompt_help')}
                </p>
                <button
                  id="live-artifacts-prompt-reset"
                  type="button"
                  aria-label={t('settings_liveArtifactsSystemPrompt_reset')}
                  title={t('settings_liveArtifactsSystemPrompt_reset')}
                  disabled={!hasCustomLiveArtifactsSystemPrompt}
                  onClick={() => updatePromptForCurrentMode('')}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-input)] text-[var(--theme-text-secondary)] transition-colors hover:border-[var(--theme-border-focus)] hover:text-[var(--theme-text-primary)] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <RotateCcw size={15} strokeWidth={1.75} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
