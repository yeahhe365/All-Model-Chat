
import React from 'react';
import { Toggle } from '../../../shared/Toggle';

interface ApiConfigToggleProps {
    useCustomApiConfig: boolean;
    setUseCustomApiConfig: (value: boolean) => void;
    t: (key: string) => string;
}

export const ApiConfigToggle: React.FC<ApiConfigToggleProps> = ({
    useCustomApiConfig,
    setUseCustomApiConfig,
    t
}) => {
    const handleRowClick = () => {
        setUseCustomApiConfig(!useCustomApiConfig);
    };

    return (
        <div 
            className="flex items-center justify-between py-3 cursor-pointer group select-none relative z-10"
            onClick={handleRowClick}
        >
            <div className="flex flex-col flex-grow pr-4">
                <span className="text-sm font-medium text-[var(--theme-text-primary)] flex items-center gap-2 group-hover:text-[var(--theme-text-link)] transition-colors">
                    {t('settingsUseCustomApi')}
                </span>
                <span className="text-xs text-[var(--theme-text-tertiary)] mt-0.5">
                    {useCustomApiConfig
                        ? 'Using your own API configuration from this panel.'
                        : 'Using backend API configuration (server-managed).'
                    }
                </span>
            </div>
            {/* Prevent double-toggling when clicking the switch directly */}
            <div onClick={(e) => e.stopPropagation()}>
                <Toggle
                    id="use-custom-api-config-toggle"
                    checked={useCustomApiConfig}
                    onChange={setUseCustomApiConfig}
                />
            </div>
        </div>
    );
};
