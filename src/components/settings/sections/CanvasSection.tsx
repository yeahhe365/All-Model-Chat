import React from 'react';
import { Wand2 } from 'lucide-react';
import { AVAILABLE_CANVAS_MODELS } from '../../../constants/settingsModelOptions';
import { ToggleItem } from '../../shared/ToggleItem';
import { Select } from '../../shared/Select';

interface CanvasSectionProps {
  autoCanvasVisualization: boolean;
  setAutoCanvasVisualization: (value: boolean) => void;
  autoCanvasModelId: string;
  setAutoCanvasModelId: (value: string) => void;
  t: (key: string) => string;
}

export const CanvasSection: React.FC<CanvasSectionProps> = ({
  autoCanvasVisualization,
  setAutoCanvasVisualization,
  autoCanvasModelId,
  setAutoCanvasModelId,
  t,
}) => (
  <div className="max-w-3xl mx-auto space-y-4">
    <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
      <Wand2 size={14} strokeWidth={1.5} />
      {t('settingsCanvasSectionTitle')}
    </h4>
    <div className="space-y-1">
      <ToggleItem
        label={t('settings_autoCanvasVisualization_label')}
        checked={autoCanvasVisualization}
        onChange={setAutoCanvasVisualization}
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
        onChange={(event) => setAutoCanvasModelId(event.target.value)}
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
