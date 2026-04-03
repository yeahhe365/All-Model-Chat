
import React from 'react';
import { Info } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { Toggle } from './Toggle';

interface ToggleItemProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    tooltip?: string;
    small?: boolean;
}

export const ToggleItem: React.FC<ToggleItemProps> = ({ label, checked, onChange, tooltip, small = false }) => (
    <div 
        className={`flex items-center justify-between py-${small ? '2' : '3'} transition-colors cursor-pointer group select-none`}
        onClick={() => onChange(!checked)}
    >
        <div className="flex items-center pr-4 flex-1 min-w-0">
            <span className={`${small ? 'text-xs text-[var(--theme-text-secondary)]' : 'text-sm font-medium text-[var(--theme-text-primary)]'} group-hover:text-[var(--theme-text-primary)] transition-colors`}>
                {label}
            </span>
            {tooltip && (
                <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                    <Tooltip text={tooltip}>
                        <Info size={14} className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)] cursor-help transition-colors" strokeWidth={1.5} />
                    </Tooltip>
                </div>
            )}
        </div>
        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <Toggle checked={checked} onChange={onChange} />
        </div>
    </div>
);
