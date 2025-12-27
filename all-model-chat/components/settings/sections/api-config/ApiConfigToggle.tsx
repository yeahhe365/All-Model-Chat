
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
    return (
        <div className="flex items-center justify-between py-2">
            <div className="flex flex-col flex-grow cursor-pointer" onClick={() => setUseCustomApiConfig(!useCustomApiConfig)}>
                <span className="text-sm font-medium text-[var(--theme-text-primary)] flex items-center gap-2">
                    {t('settingsUseCustomApi')}
                    {hasEnvKey && !useCustomApiConfig && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-600 border border-green-500/20">
                            <ShieldCheck size={10} /> Env Key Active
                        </span>
                    )}
                </span>
                <span className="text-xs text-[var(--theme-text-tertiary)] mt-0.5">
                    {useCustomApiConfig
                        ? (hasEnvKey ? 'Overriding environment API key' : 'Using your own API keys')
                        : (hasEnvKey ? t('apiConfig_default_info') : 'No API key found in environment. Enable custom key to proceed.')
                    }
                </span>
            </div>
            <Toggle
                id="use-custom-api-config-toggle"
                checked={useCustomApiConfig}
                onChange={setUseCustomApiConfig}
            />
        </div>
    );
};
