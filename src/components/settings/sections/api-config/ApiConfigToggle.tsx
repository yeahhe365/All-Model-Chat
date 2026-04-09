
import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Toggle } from '../../../shared/Toggle';

interface ApiConfigToggleProps {
    useCustomApiConfig: boolean;
    setUseCustomApiConfig: (value: boolean) => void;
    hasEnvKey: boolean;
    t: (key: string) => string;
}

export const ApiConfigToggle: React.FC<ApiConfigToggleProps> = ({
    useCustomApiConfig,
    setUseCustomApiConfig,
    hasEnvKey,
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
                    {hasEnvKey && !useCustomApiConfig && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-600 border border-green-500/20">
                            <ShieldCheck size={10} /> {t('apiConfig_env_key_active')}
                        </span>
                    )}
                </span>
                <span className="text-xs text-[var(--theme-text-tertiary)] mt-0.5">
                    {useCustomApiConfig
                        ? (hasEnvKey ? t('apiConfig_overriding_env') : t('apiConfig_using_own_keys'))
                        : (hasEnvKey ? t('apiConfig_default_info') : t('apiConfig_missing_env_key'))
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
