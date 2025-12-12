import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafetySetting, HarmCategory, HarmBlockThreshold } from '../../types/settings';
import { translations } from '../../utils/appUtils';
import { Shield, Info } from 'lucide-react';
import { DEFAULT_SAFETY_SETTINGS } from '../../constants/appConstants';

interface SafetySectionProps {
  safetySettings: SafetySetting[] | undefined;
  setSafetySettings: (settings: SafetySetting[]) => void;
  t: (key: keyof typeof translations | string) => string;
}

const ALL_CATEGORIES: HarmCategory[] = [
  HarmCategory.HARM_CATEGORY_HARASSMENT,
  HarmCategory.HARM_CATEGORY_HATE_SPEECH,
  HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
  HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
  HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY,
];

const categoryMap: Record<HarmCategory, string> = {
  [HarmCategory.HARM_CATEGORY_HARASSMENT]: 'safety_category_HARASSMENT',
  [HarmCategory.HARM_CATEGORY_HATE_SPEECH]: 'safety_category_HATE_SPEECH',
  [HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT]: 'safety_category_SEXUALLY_EXPLICIT',
  [HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT]: 'safety_category_DANGEROUS_CONTENT',
  [HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY]: 'safety_category_CIVIC_INTEGRITY',
};

// Map internal enum to UI slider index (0-4)
const thresholdSteps: HarmBlockThreshold[] = [
  HarmBlockThreshold.OFF,
  HarmBlockThreshold.BLOCK_NONE,
  HarmBlockThreshold.BLOCK_ONLY_HIGH, // Block few
  HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE, // Block some (Default)
  HarmBlockThreshold.BLOCK_LOW_AND_ABOVE, // Block most
];

const thresholdLabels: Record<HarmBlockThreshold, string> = {
  [HarmBlockThreshold.OFF]: 'safety_threshold_OFF',
  [HarmBlockThreshold.BLOCK_NONE]: 'safety_threshold_BLOCK_NONE',
  [HarmBlockThreshold.BLOCK_ONLY_HIGH]: 'safety_threshold_BLOCK_ONLY_HIGH',
  [HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE]: 'safety_threshold_BLOCK_MEDIUM_AND_ABOVE',
  [HarmBlockThreshold.BLOCK_LOW_AND_ABOVE]: 'safety_threshold_BLOCK_LOW_AND_ABOVE',
};

// Colors for the slider track/label based on index
const stepColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
const stepTextColors = ['text-red-500', 'text-orange-500', 'text-yellow-500', 'text-blue-500', 'text-green-500'];

type SliderValueMap = Record<HarmCategory, number>;

const clampIndex = (idx: number) => {
  if (Number.isNaN(idx)) return 3;
  return Math.min(4, Math.max(0, idx));
};

const indexFromThreshold = (threshold: HarmBlockThreshold | undefined) => {
  const idx = threshold ? thresholdSteps.indexOf(threshold) : -1;
  return clampIndex(idx !== -1 ? idx : 3);
};

const normalizeSettings = (settings: SafetySetting[] | undefined): SafetySetting[] => {
  // Prefer user settings, but ensure every category exists using defaults.
  const merged = new Map<HarmCategory, HarmBlockThreshold>();

  // Start with defaults so we always have a full set.
  for (const s of DEFAULT_SAFETY_SETTINGS) merged.set(s.category, s.threshold);

  // Overlay user settings.
  if (settings && settings.length > 0) {
    for (const s of settings) merged.set(s.category, s.threshold);
  }

  // Return in stable order.
  return ALL_CATEGORIES.map((cat) => ({
    category: cat,
    threshold: merged.get(cat) ?? HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  }));
};

const buildSliderMap = (settings: SafetySetting[] | undefined): SliderValueMap => {
  const normalized = normalizeSettings(settings);
  const map = {} as SliderValueMap;
  for (const s of normalized) {
    map[s.category] = indexFromThreshold(s.threshold);
  }
  return map;
};

export const SafetySection: React.FC<SafetySectionProps> = ({ safetySettings, setSafetySettings, t }) => {
  const normalizedSettings = useMemo(() => normalizeSettings(safetySettings), [safetySettings]);

  // 本地受控状态：保证滑块在拖动时立即更新（避免因外层状态/渲染节奏导致“拖不动/回弹”的体验）
  const [sliderValues, setSliderValues] = useState<SliderValueMap>(() => buildSliderMap(safetySettings));

  // 当外部 settings 变化（打开设置、导入设置、切换会话等）同步本地状态
  useEffect(() => {
    setSliderValues(buildSliderMap(safetySettings));
  }, [safetySettings]);

  const handleSliderChange = useCallback(
    (category: HarmCategory, valueIndex: number) => {
      const nextIndex = clampIndex(valueIndex);

      // 先更新本地 UI，拖动立刻生效
      setSliderValues((prev) => ({ ...prev, [category]: nextIndex }));

      const newThreshold = thresholdSteps[nextIndex] ?? HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE;

      // 用“完整集合”来更新，避免缺项/顺序问题
      const base = normalizeSettings(safetySettings);
      const updated = base.map((s) => (s.category === category ? { ...s, threshold: newThreshold } : s));

      setSafetySettings(updated);
    },
    [safetySettings, setSafetySettings]
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-start gap-3 p-4 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)] rounded-xl">
        <Shield size={24} className="text-[var(--theme-text-link)] flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-base font-semibold text-[var(--theme-text-primary)]">{t('safety_title')}</h3>
          <p className="text-sm text-[var(--theme-text-secondary)] mt-1 leading-relaxed opacity-90">
            {t('safety_description')}
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {normalizedSettings.map((setting) => {
          const category = setting.category;
          const sliderValue = sliderValues[category] ?? indexFromThreshold(setting.threshold);
          const effectiveThreshold = thresholdSteps[sliderValue] ?? HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE;

          return (
            <div
              key={category}
              className="space-y-3 pb-4 border-b border-[var(--theme-border-secondary)]/50 last:border-0"
            >
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-[var(--theme-text-primary)]">{t(categoryMap[category])}</label>
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    stepTextColors[sliderValue] || 'text-[var(--theme-text-primary)]'
                  }`}
                >
                  {t(thresholdLabels[effectiveThreshold])}
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="4"
                step="1"
                value={sliderValue}
                onChange={(e) => handleSliderChange(category, parseInt(e.target.value, 10))}
                // 关键：避免外层 pointer/touch 手势（例如滚动/拖拽/点击外部关闭）抢事件，导致“拖不动”
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                style={{ touchAction: 'none' }}
                className="w-full h-2 bg-[var(--theme-bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)] hover:accent-[var(--theme-bg-accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]"
              />

              <div className="flex justify-between px-1">
                {thresholdSteps.map((step, idx) => (
                  <div key={step} className="flex flex-col items-center w-8">
                    <div
                      className={`w-1 h-2 rounded-full mb-1 ${
                        idx === sliderValue ? 'bg-[var(--theme-text-primary)] h-3' : 'bg-[var(--theme-border-secondary)]'
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-[var(--theme-text-tertiary)] pt-4">
        <Info size={14} />
        <span>Changes apply to new messages.</span>
      </div>
    </div>
  );
};
