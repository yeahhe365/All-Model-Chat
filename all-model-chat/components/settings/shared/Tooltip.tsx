import React from 'react';

export const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
  <div className="tooltip-container ml-1.5">
    {children}
    <span className="tooltip-text">{text}</span>
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: React.ReactNode;
  labelContent?: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({ id, label, children, labelContent, ...rest }) => {
    const inputBaseClasses = "w-full p-2 border rounded-md focus:ring-2 focus:border-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm";
    const enabledInputClasses = "bg-[var(--theme-bg-input)] border-[var(--theme-border-secondary)] focus:ring-[var(--theme-border-focus)]";

    return (
        <div>
            <label htmlFor={id} className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">
              {labelContent || label}
            </label>
            <div className="relative">
                <select
                  id={id}
                  className={`${inputBaseClasses} ${enabledInputClasses} appearance-none pr-8`}
                  {...rest}
                >
                  {children}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--theme-text-tertiary)]">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.516 7.548c.436-.446 1.043-.48 1.576 0L10 10.405l2.908-2.857c.533-.48 1.14-.446 1.576 0 .436.445.408 1.197 0 1.615l-3.695 3.63c-.533.48-1.14.446-1.576 0L5.516 9.163c-.408-.418-.436-1.17 0-1.615z"/></svg>
                </div>
            </div>
        </div>
    );
};
