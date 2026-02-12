
import React from 'react';
import { KeyRound } from 'lucide-react';

interface ApiUsageTabProps {
    apiKeyUsage: Map<string, number>;
}

const parseUsageKeyId = (usageKeyId: string): { source: string; keyId: string } => {
    const separatorIndex = usageKeyId.indexOf(':');
    if (separatorIndex <= 0) {
        return { source: 'unknown', keyId: usageKeyId };
    }

    return {
        source: usageKeyId.slice(0, separatorIndex),
        keyId: usageKeyId.slice(separatorIndex + 1),
    };
};

export const ApiUsageTab: React.FC<ApiUsageTabProps> = ({ apiKeyUsage }) => {
    const entries = Array.from(apiKeyUsage.entries())
        .map(([usageKeyId, count]) => ({ usageKeyId, count, ...parseUsageKeyId(usageKeyId) }))
        .sort((a, b) => b.count - a.count);
    const totalApiUsage = entries.reduce((sum, entry) => sum + entry.count, 0);

    return (
        <div className="p-4 overflow-y-auto custom-scrollbar h-full">
            <h4 className="font-semibold text-lg text-[var(--theme-text-primary)] mb-4 flex items-center gap-2"><KeyRound size={20} /> Provider Key Usage Statistics</h4>
            {entries.length === 0 && (
                <p className="text-sm text-[var(--theme-text-tertiary)]">
                    No provider key usage has been recorded yet.
                </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entries.map(({ usageKeyId, keyId, source, count }, index) => {
                const percentage = totalApiUsage > 0 ? (count / totalApiUsage) * 100 : 0;
                return (
                    <div key={usageKeyId} className="p-4 rounded-xl border transition-all relative overflow-hidden bg-[var(--theme-bg-input)] border-[var(--theme-border-secondary)]">
                    <div className="flex justify-between items-start mb-2">
                        <span className="font-mono text-xs text-[var(--theme-text-tertiary)]">#{index + 1}</span>
                        <span className="text-[10px] font-bold uppercase bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] px-2 py-0.5 rounded-full">
                            {source}
                        </span>
                    </div>
                    <div className="mb-4">
                        <code className="font-mono text-xs text-[var(--theme-text-secondary)] break-all">
                            {keyId}
                        </code>
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
