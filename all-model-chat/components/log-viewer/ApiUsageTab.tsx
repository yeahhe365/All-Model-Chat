
import React from 'react';
import { KeyRound, CheckCircle } from 'lucide-react';
import { AppSettings, ChatSettings } from '../../types';
import { ObfuscatedApiKey } from './ObfuscatedApiKey';

interface ApiUsageTabProps {
    apiKeyUsage: Map<string, number>;
    appSettings: AppSettings;
    currentChatSettings: ChatSettings;
}

export const ApiUsageTab: React.FC<ApiUsageTabProps> = ({ apiKeyUsage, appSettings, currentChatSettings }) => {
    // Sanitize keys to match how they are logged in utils/apiUtils.ts (strip quotes, split by newlines/commas)
    const allApiKeys = (appSettings.apiKey || '')
        .split(/[\n,]+/)
        .map(k => k.trim().replace(/^["']|["']$/g, ''))
        .filter(k => k.length > 0);

    const displayApiKeyUsage = new Map<string, number>();
    
    // 1. Add keys from settings, checking usage logs
    allApiKeys.forEach(key => displayApiKeyUsage.set(key, apiKeyUsage.get(key) || 0));
    
    // 2. Add any keys found in usage logs that aren't currently in settings (historical keys)
    apiKeyUsage.forEach((count, key) => { 
        if (!displayApiKeyUsage.has(key)) {
            displayApiKeyUsage.set(key, count); 
        }
    });

    const totalApiUsage = Array.from(displayApiKeyUsage.values()).reduce((sum, count) => sum + count, 0);

    return (
        <div className="p-4 overflow-y-auto custom-scrollbar h-full">
            <h4 className="font-semibold text-lg text-[var(--theme-text-primary)] mb-4 flex items-center gap-2"><KeyRound size={20} /> API Key Usage Statistics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from(displayApiKeyUsage.entries())
                .sort(([, a], [, b]) => b - a)
                .map(([key, count], index) => {
                const percentage = totalApiUsage > 0 ? (count / totalApiUsage) * 100 : 0;
                const isActive = currentChatSettings.lockedApiKey === key;
                return (
                    <div key={key} className={`p-4 rounded-xl border transition-all relative overflow-hidden ${isActive ? 'bg-[var(--theme-bg-accent)]/10 border-[var(--theme-border-focus)]' : 'bg-[var(--theme-bg-input)] border-[var(--theme-border-secondary)]'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <span className="font-mono text-xs text-[var(--theme-text-tertiary)]">#{index + 1}</span>
                        {isActive && <span className="text-[10px] font-bold uppercase bg-green-900 text-green-300 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle size={10} /> Active</span>}
                    </div>
                    <div className="mb-4">
                        <ObfuscatedApiKey apiKey={key} />
                    </div>
                    <div className="flex items-end justify-between">
                        <div className="flex flex-col">
                            <span className="text-2xl font-bold text-[var(--theme-text-primary)]">{count}</span>
                            <span className="text-xs text-[var(--theme-text-tertiary)]">requests</span>
                        </div>
                        <div className="text-xl font-bold text-[var(--theme-text-tertiary)] opacity-30">
                            {percentage.toFixed(0)}%
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 h-1 bg-[var(--theme-bg-accent)] transition-all duration-500" style={{ width: `${percentage}%` }} />
                    </div>
                );
                })}
            </div>
        </div>
    );
};
