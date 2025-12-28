
import React from 'react';
import { Calculator } from 'lucide-react';
import { SETTINGS_INPUT_CLASS } from '../../../../constants/appConstants';

interface ThinkingBudgetSliderProps {
    minBudget: number;
    maxBudget: number;
    value: string;
    onChange: (val: string) => void;
}

export const ThinkingBudgetSlider: React.FC<ThinkingBudgetSliderProps> = ({
    minBudget,
    maxBudget,
    value,
    onChange
}) => {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-1.5">
                    <Calculator size={12} /> Token Budget
                </label>
                <span className="text-xs font-mono text-[var(--theme-text-link)] bg-[var(--theme-bg-tertiary)] px-2 py-0.5 rounded border border-[var(--theme-border-secondary)]">
                    {parseInt(value || '0').toLocaleString()} tokens
                </span>
            </div>

            <div className="flex items-center gap-4">
                <input
                    type="range"
                    min={minBudget}
                    max={maxBudget}
                    step={128}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-grow h-1.5 bg-[var(--theme-border-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)] hover:accent-[var(--theme-bg-accent-hover)]"
                />
                <div className="relative w-24">
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className={`${SETTINGS_INPUT_CLASS} w-full py-1.5 pl-2 pr-1 text-sm rounded-lg text-center font-mono focus:ring-2 focus:ring-[var(--theme-border-focus)]`}
                        min={minBudget}
                        max={maxBudget}
                    />
                </div>
            </div>
            <p className="text-[10px] text-[var(--theme-text-tertiary)] text-center">
                Controls the maximum number of tokens the model can use for its internal thought process ({minBudget}-{maxBudget}).
            </p>
        </div>
    );
};
