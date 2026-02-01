
import React from 'react';
import { Activity, Loader2, XCircle } from 'lucide-react';
import { Select } from '../../../shared/Select';
import { ModelOption } from '../../../../types';

interface ApiConnectionTesterProps {
    onTest: () => void;
    testStatus: 'idle' | 'testing' | 'success' | 'error';
    testMessage: string | null;
    isTestDisabled: boolean;
    availableModels?: ModelOption[];
    testModelId?: string;
    onModelChange?: (id: string) => void;
    t: (key: string) => string;
}

export const ApiConnectionTester: React.FC<ApiConnectionTesterProps> = ({
    onTest,
    testStatus,
    testMessage,
    isTestDisabled,
    availableModels,
    testModelId,
    onModelChange,
    t
}) => {
    return (
        <div className="pt-2 flex flex-col gap-2">
            {/* Optional Model Selector for Testing */}
            {availableModels && availableModels.length > 0 && onModelChange && testModelId && (
                <Select
                    id="api-test-model"
                    label="Test Model"
                    layout="horizontal"
                    value={testModelId}
                    onChange={(e) => onModelChange(e.target.value)}
                    labelContent={<span className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)]">Test Model</span>}
                    className="mb-1"
                >
                    {availableModels.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                </Select>
            )}

            <button
                type="button"
                onClick={onTest}
                disabled={isTestDisabled}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                    testStatus === 'testing' 
                        ? 'bg-[var(--theme-bg-tertiary)] border-transparent cursor-wait'
                        : 'bg-transparent border-[var(--theme-border-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-border-focus)] text-[var(--theme-text-primary)]'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                {testStatus === 'testing' ? (
                    <Loader2 size={16} className="animate-spin" />
                ) : (
                    <Activity size={16} strokeWidth={1.5} />
                )}
                <span>{testStatus === 'testing' ? t('apiConfig_testing') : t('apiConfig_testConnection')}</span>
            </button>

            {/* Test Results */}
            {testStatus === 'success' && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 text-sm animate-in fade-in slide-in-from-top-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <span>{t('apiConfig_testSuccess')}</span>
                </div>
            )}
            {testStatus === 'error' && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm animate-in fade-in slide-in-from-top-1">
                    <XCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <div className="flex flex-col">
                        <span className="font-medium">{t('apiConfig_testFailed')}</span>
                        {testMessage && <span className="text-xs opacity-90 break-all">{testMessage}</span>}
                    </div>
                </div>
            )}
        </div>
    );
};
