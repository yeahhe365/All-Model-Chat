import React from 'react';
import { Coins } from 'lucide-react';
import { TokenUsageStats } from '../../services/logService';

interface TokenUsageTabProps {
    tokenUsage: Map<string, TokenUsageStats>;
}

export const TokenUsageTab: React.FC<TokenUsageTabProps> = ({ tokenUsage }) => {
    const tokenUsageArray = Array.from(tokenUsage.entries()).map(([modelId, stats]) => ({
        modelId,
        prompt: stats.prompt,
        completion: stats.completion,
        total: stats.prompt + stats.completion
    })).sort((a, b) => b.total - a.total);

    return (
        <div className="p-4 overflow-y-auto custom-scrollbar h-full">
            <h4 className="font-semibold text-lg text-[var(--theme-text-primary)] mb-4 flex items-center gap-2">
                <Coins size={20} /> Token Usage Statistics
            </h4>
            
            {tokenUsageArray.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-[var(--theme-text-tertiary)] border-2 border-dashed border-[var(--theme-border-secondary)] rounded-xl bg-[var(--theme-bg-primary)]/50">
                    <Coins size={48} className="mb-4 opacity-20" />
                    <p className="text-sm">No token usage recorded yet.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-[var(--theme-border-secondary)] shadow-sm">
                    <table className="min-w-full divide-y divide-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)]">
                        <thead className="bg-[var(--theme-bg-tertiary)]">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--theme-text-tertiary)] uppercase tracking-wider">Model</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-[var(--theme-text-tertiary)] uppercase tracking-wider">Input Tokens</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-[var(--theme-text-tertiary)] uppercase tracking-wider">Output Tokens</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-[var(--theme-text-primary)] uppercase tracking-wider">Total Tokens</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--theme-border-secondary)]">
                            {tokenUsageArray.map((item) => (
                                <tr key={item.modelId} className="hover:bg-[var(--theme-bg-input)] transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--theme-text-primary)]">
                                        {item.modelId}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-[var(--theme-text-secondary)] font-mono">
                                        {item.prompt.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-[var(--theme-text-secondary)] font-mono">
                                        {item.completion.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-[var(--theme-text-link)] font-mono font-bold">
                                        {item.total.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-[var(--theme-bg-tertiary)]/20 font-semibold">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--theme-text-primary)]">Total</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-[var(--theme-text-primary)] font-mono">
                                    {tokenUsageArray.reduce((sum, item) => sum + item.prompt, 0).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-[var(--theme-text-primary)] font-mono">
                                    {tokenUsageArray.reduce((sum, item) => sum + item.completion, 0).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-[var(--theme-text-primary)] font-mono">
                                    {tokenUsageArray.reduce((sum, item) => sum + item.total, 0).toLocaleString()}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
