
import React from 'react';
import { Activity, Loader2, XCircle, ChevronDown } from 'lucide-react';

interface ApiConnectionTesterProps {
    onTest: () => void;
    testStatus: 'idle' | 'testing' | 'success' | 'error';
    testMessage: string | null;
    isTestDisabled: boolean;
    t: (key: string) => string;
    testModel: string;
    onTestModelChange: (model: string) => void;
}

const TEST_MODELS = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3.0 Flash' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro' },
];

export const ApiConnectionTester: React.FC<ApiConnectionTesterProps> = ({
    onTest,
    testStatus,
    testMessage,
    isTestDisabled,
    t,
    testModel,
    onTestModelChange
}) => {
    return (
        <div className="pt-2 flex flex-col gap-2">
            <div className="flex gap-2">
                <div className="relative flex-grow sm:flex-grow-0 sm:w-48">
                    <select
                        value={testModel}
                        onChange={(e) => onTestModelChange(e.target.value)}
                        disabled={testStatus === 'testing'}
                        className="w-full appearance-none px-3 py-2.5 pr-8 rounded-lg text-sm font-medium border bg-transparent border-[var(--theme-border-secondary)] hover:border-[var(--theme-border-focus)] text-[var(--theme-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        {TEST_MODELS.map(model => (
                            <option key={model.id} value={model.id} className="bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)]">
                                {model.name}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-tertiary)] pointer-events-none" />
                </div>

                <button
                    type="button"
                    onClick={onTest}
                    disabled={isTestDisabled}
                    className={`flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
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
            </div>

            {/* Test Results */}
            {testStatus === 'success' && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 text-sm animate-in fade-in slide-in-from-top-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <span>{t('apiConfig_testSuccess')} ({testModel})</span>
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
