import { useEffect, useMemo, useState } from 'react';
import { dbService, type ApiUsageRecord } from '../../utils/db';
import { calculateTokenPriceUsd } from '../../utils/usagePricing';

export type UsageTimeRange = 'today' | '7d' | '30d' | 'all';

interface UsageSummary {
  totalRequests: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface UsageModelBreakdown extends UsageSummary {
  modelId: string;
  estimatedCostUsdAvailable: boolean;
}

const EMPTY_SUMMARY: UsageSummary = {
  totalRequests: 0,
  totalPromptTokens: 0,
  totalCompletionTokens: 0,
  totalTokens: 0,
  estimatedCostUsd: 0,
};

const getRangeBounds = (range: UsageTimeRange) => {
  const end = Date.now();

  if (range === 'all') {
    return { start: 0, end };
  }

  if (range === 'today') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return { start: start.getTime(), end };
  }

  const days = range === '7d' ? 7 : 30;
  return { start: end - days * 24 * 60 * 60 * 1000, end };
};

const buildSummary = (records: ApiUsageRecord[]): UsageSummary =>
  records.reduce<UsageSummary>(
    (summary, record) => ({
      totalRequests: summary.totalRequests + 1,
      totalPromptTokens: summary.totalPromptTokens + record.promptTokens,
      totalCompletionTokens: summary.totalCompletionTokens + record.completionTokens,
      totalTokens: summary.totalTokens + record.promptTokens + record.completionTokens,
      estimatedCostUsd:
        summary.estimatedCostUsd +
        (calculateTokenPriceUsd(record.modelId, record.promptTokens, record.completionTokens) ?? 0),
    }),
    EMPTY_SUMMARY,
  );

const buildBreakdown = (records: ApiUsageRecord[]): UsageModelBreakdown[] => {
  const grouped = new Map<string, UsageModelBreakdown>();

  records.forEach((record) => {
    const current = grouped.get(record.modelId) ?? {
      modelId: record.modelId,
      ...EMPTY_SUMMARY,
      estimatedCostUsdAvailable: true,
    };

    const estimatedCost = calculateTokenPriceUsd(record.modelId, record.promptTokens, record.completionTokens);

    current.totalRequests += 1;
    current.totalPromptTokens += record.promptTokens;
    current.totalCompletionTokens += record.completionTokens;
    current.totalTokens += record.promptTokens + record.completionTokens;
    current.estimatedCostUsd += estimatedCost ?? 0;
    current.estimatedCostUsdAvailable = current.estimatedCostUsdAvailable && estimatedCost !== null;
    grouped.set(record.modelId, current);
  });

  return Array.from(grouped.values()).sort((a, b) => b.totalTokens - a.totalTokens || b.totalRequests - a.totalRequests);
};

export const useUsageStats = () => {
  const [timeRange, setTimeRange] = useState<UsageTimeRange>('all');
  const [records, setRecords] = useState<ApiUsageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);

      try {
        const { start, end } = getRangeBounds(timeRange);
        const result = await dbService.getApiUsageByTimeRange(start, end);

        if (!cancelled) {
          setRecords(result);
        }
      } catch (error) {
        console.error('Failed to load API usage data:', error);
        if (!cancelled) {
          setRecords([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [timeRange]);

  const summary = useMemo(() => buildSummary(records), [records]);
  const byModel = useMemo(() => buildBreakdown(records), [records]);

  return {
    timeRange,
    setTimeRange,
    isLoading,
    summary,
    byModel,
  };
};
