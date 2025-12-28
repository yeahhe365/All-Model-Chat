
import React from 'react';
import { Type } from 'lucide-react';
import { translations } from '../../../../utils/appUtils';

interface FontSizeControlProps {
  baseFontSize: number;
  setBaseFontSize: (value: number) => void;
  t: (key: keyof typeof translations) => string;
}

export const FontSizeControl: React.FC<FontSizeControlProps> = ({ baseFontSize, setBaseFontSize, t }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
              <Type size={14} strokeWidth={1.5} /> {t('settingsFontSize')}
          </label>
          <span className="text-sm font-mono text-[var(--theme-text-link)] bg-[var(--theme-bg-tertiary)] px-2 py-0.5 rounded-md">{baseFontSize}px</span>
      </div>
      <input
          type="range" min="12" max="24" step="1"
          value={baseFontSize} onChange={(e) => setBaseFontSize(parseInt(e.target.value, 10))}
          className="w-full h-1.5 bg-[var(--theme-border-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)] hover:accent-[var(--theme-bg-accent-hover)]"
      />
      <div className="flex justify-between text-xs text-[var(--theme-text-tertiary)] font-mono px-1">
          <span>12px</span>
          <span>18px</span>
          <span>24px</span>
      </div>
    </div>
  );
};
