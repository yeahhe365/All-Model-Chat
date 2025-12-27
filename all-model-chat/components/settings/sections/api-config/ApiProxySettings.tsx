
import React from 'react';
import { AlertCircle, ArrowRight, Sparkles, RotateCcw } from 'lucide-react';
import { Toggle } from '../../../shared/Toggle';
import { SETTINGS_INPUT_CLASS } from '../../../../constants/appConstants';

interface ApiProxySettingsProps {
    useApiProxy: boolean;
    setUseApiProxy: (value: boolean) => void;
    apiProxyUrl: string | null;
    setApiProxyUrl: (value: string | null) => void;
    t: (key: string) => string;
}

export const ApiProxySettings: React.FC<ApiProxySettingsProps> = ({
    useApiProxy,
    setUseApiProxy,
    apiProxyUrl,
    setApiProxyUrl,
    t
}) => {
    const inputBaseClasses = "w-full p-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-offset-0 text-sm custom-scrollbar font-mono";
    
    const defaultBaseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    const defaultProxyUrl = 'https://api-proxy.de/gemini/v1beta';
    const VERTEX_URL = "https://aiplatform.googleapis.com/v1";
    
    const isVertexExpressActive = useApiProxy && apiProxyUrl === VERTEX_URL;

    const handleSetVertexExpress = () => {
        if (isVertexExpressActive) {
            setUseApiProxy(false);
            setApiProxyUrl(defaultBaseUrl);
        } else {
            setUseApiProxy(true);
            setApiProxyUrl(VERTEX_URL);
        }
    };

    const handleResetProxy = () => {
        setApiProxyUrl(defaultProxyUrl);
    };

    const getProxyPlaceholder = () => {
        if (!useApiProxy) return 'Enable proxy URL to set value';
        return 'e.g., https://api-proxy.de/gemini/v1beta';
    };

    const currentBaseUrl = apiProxyUrl?.trim() || defaultBaseUrl;
    const cleanBaseUrl = currentBaseUrl.replace(/\/+$/, '');
    const previewUrl = `${cleanBaseUrl}/models/gemini-2.5-flash:generateContent`;

    return (
        <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                    <label htmlFor="use-api-proxy-toggle" className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] cursor-pointer">
                        API Proxy
                    </label>
                    <button
                        type="button"
                        onClick={handleSetVertexExpress}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors border ${
                            isVertexExpressActive 
                                ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] border-transparent' 
                                : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] border-transparent hover:border-[var(--theme-border-secondary)]'
                        }`}
                        title={t('apiConfig_vertexExpress')}
                    >
                        <Sparkles size={10} strokeWidth={isVertexExpressActive ? 2 : 1.5} />
                        <span>{t('apiConfig_vertexExpress_btn')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleResetProxy}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors border text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] border-transparent hover:border-[var(--theme-border-secondary)]"
                        title="Reset to default"
                    >
                        <RotateCcw size={10} strokeWidth={1.5} />
                        <span>Reset</span>
                    </button>
                </div>
                <Toggle
                    id="use-api-proxy-toggle"
                    checked={useApiProxy}
                    onChange={(val) => {
                        setUseApiProxy(val);
                    }}
                />
            </div>
            
            <div className={`transition-all duration-200 ${useApiProxy ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <input
                    id="api-proxy-url-input"
                    type="text"
                    value={apiProxyUrl || ''}
                    onChange={(e) => setApiProxyUrl(e.target.value)}
                    className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS}`}
                    placeholder={getProxyPlaceholder()}
                    aria-label="API Proxy URL"
                />
                
                <div className="mt-3 p-3 rounded-lg bg-[var(--theme-bg-tertiary)]/30 border border-[var(--theme-border-secondary)]">
                    <div className="flex gap-2 text-xs text-[var(--theme-text-tertiary)] mb-1.5">
                        <AlertCircle size={14} className="flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                        <span>Preview of actual request URL:</span>
                    </div>
                    <div className="flex items-start gap-2 pl-5">
                        <ArrowRight size={12} className="mt-1 text-[var(--theme-text-tertiary)]" />
                        <code className="font-mono text-[11px] text-[var(--theme-text-primary)] break-all leading-relaxed">
                            {previewUrl}
                        </code>
                    </div>
                </div>
            </div>
        </div>
    );
};
