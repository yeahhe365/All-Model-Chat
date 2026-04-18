import React from 'react';
import { Activity, BarChart3, Coins, Loader2 } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import { SETTINGS_INPUT_CLASS } from '../../constants/appConstants';
import { useUsageStats, type UsageTimeRange } from '../../hooks/features/useUsageStats';
import { formatPriceUsd } from '../../utils/usagePricing';

const RANGE_OPTIONS: Array<{ value: UsageTimeRange; labelKey: string }> = [
  { value: 'today', labelKey: 'usageToday' },
  { value: '7d', labelKey: 'usageLast7Days' },
  { value: '30d', labelKey: 'usageLast30Days' },
  { value: 'all', labelKey: 'usageAllTime' },
];

const StatCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
}> = ({ title, value, icon }) => (
  <div className="rounded-xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-input)] p-4 shadow-sm">
    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)]">
      {icon}
      <span>{title}</span>
    </div>
    <div className="text-2xl font-semibold text-[var(--theme-text-primary)] tabular-nums">{value}</div>
  </div>
);

export const UsageOverviewTab: React.FC = () => {
  const { t } = useI18n();
  const { timeRange, setTimeRange, isLoading, summary, byModel } = useUsageStats();

  return (
    <div className="p-4 overflow-y-auto custom-scrollbar h-full">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-input)] p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-lg font-semibold text-[var(--theme-text-primary)]">
              <Activity size={20} />
              <span>{t('usageTitle')}</span>
            </div>
            <p className="max-w-2xl text-sm text-[var(--theme-text-secondary)]">
              {t('usageDescription')}
            </p>
          </div>

          <label className="flex min-w-[180px] flex-col gap-2 text-sm font-medium text-[var(--theme-text-primary)]">
            <span>{t('usageTimeRange')}</span>
            <select
              value={timeRange}
              onChange={(event) => setTimeRange(event.target.value as UsageTimeRange)}
              className={`${SETTINGS_INPUT_CLASS} rounded-lg border bg-[var(--theme-bg-secondary)] px-3 py-2 text-sm outline-none`}
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-input)] px-4 py-12 text-sm text-[var(--theme-text-secondary)]">
            <Loader2 size={18} className="animate-spin" />
            <span>{t('usageLoading')}</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <StatCard title={t('usageTotalRequests')} value={summary.totalRequests.toLocaleString()} icon={<Activity size={14} />} />
              <StatCard title={t('usagePromptTokens')} value={summary.totalPromptTokens.toLocaleString()} icon={<BarChart3 size={14} />} />
              <StatCard title={t('usageCachedTokens')} value={summary.totalCachedPromptTokens.toLocaleString()} icon={<Coins size={14} />} />
              <StatCard title={t('usageCompletionTokens')} value={summary.totalCompletionTokens.toLocaleString()} icon={<Coins size={14} />} />
              <StatCard title={t('usageTotalTokens')} value={summary.totalTokens.toLocaleString()} icon={<Coins size={14} />} />
              <StatCard title={t('usageEstimatedCost')} value={summary.estimatedCostUsdAvailable ? formatPriceUsd(summary.estimatedCostUsd) : '—'} icon={<Coins size={14} />} />
            </div>

            <div className="rounded-2xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-input)] p-5 shadow-sm">
              <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)]">
                {t('usageByModel')}
              </div>

              {byModel.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)]/50 px-4 py-10 text-center text-sm text-[var(--theme-text-secondary)]">
                  {t('usageNoData')}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[var(--theme-border-secondary)]">
                  <table className="min-w-full divide-y divide-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)]">
                    <thead className="bg-[var(--theme-bg-tertiary)]/60">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)]">
                          {t('usageModelColumn')}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)]">
                          {t('usageRequestsColumn')}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)]">
                          {t('usagePromptTokens')}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)]">
                          {t('usageCachedTokens')}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)]">
                          {t('usageCompletionTokens')}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-primary)]">
                          {t('usageTotalTokens')}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-primary)]">
                          {t('usagePriceColumn')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--theme-border-secondary)]">
                      {byModel.map((item) => (
                        <tr key={item.modelId} className="hover:bg-[var(--theme-bg-secondary)]/40">
                          <td className="px-4 py-3 text-sm font-medium text-[var(--theme-text-primary)]">
                            {item.modelId}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-[var(--theme-text-secondary)]">
                            {item.totalRequests.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-[var(--theme-text-secondary)]">
                            {item.totalPromptTokens.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-[var(--theme-text-secondary)]">
                            {item.totalCachedPromptTokens.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-[var(--theme-text-secondary)]">
                            {item.totalCompletionTokens.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono font-semibold text-[var(--theme-text-primary)]">
                            {item.totalTokens.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono font-semibold text-[var(--theme-text-primary)]">
                            {item.estimatedCostUsdAvailable ? formatPriceUsd(item.estimatedCostUsd) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="mt-3 text-xs text-[var(--theme-text-tertiary)]">
                {t('usagePricingNote')}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
