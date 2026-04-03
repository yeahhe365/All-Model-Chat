
import React, { useId } from 'react';

export const Toggle: React.FC<{
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ id: propId, checked, onChange, disabled }) => {
  const generatedId = useId();
  const id = propId || generatedId;

  return (
    <label htmlFor={id} className={`flex items-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
      <div className="relative">
        <input 
            id={id} 
            type="checkbox" 
            className="sr-only peer" 
            checked={checked} 
            onChange={(e) => onChange(e.target.checked)} 
            disabled={disabled} 
        />
        <div className="w-11 h-6 bg-[var(--theme-bg-tertiary)] rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-offset-[var(--theme-bg-secondary)] peer-focus:ring-[var(--theme-border-focus)] peer-checked:bg-[var(--theme-bg-accent)] transition-colors duration-200 ease-in-out border border-[var(--theme-border-secondary)] peer-checked:border-transparent"></div>
        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></div>
      </div>
    </label>
  );
};
