import { useEffect, useMemo, useState } from 'react';
import { dbService, type ApiUsageRecord } from '@/services/db/dbService';
import { calculateApiUsageRecordPriceUsd } from '../../utils/usagePricing';

export type UsageTimeRange = 'today' | '7d' | '30d' | 'all';

interface UsageSummary {
  totalRequests: number;
  totalPromptTokens: number;
  totalCachedPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  estimatedCostPricedRequests: number;
  estimatedCostUnavailableRequests: number;
}

interface UsageModelBreakdown extends UsageSummary {
  modelId: string;
}

const EMPTY_SUMMARY: UsageSummary = {
  totalRequests: 0,
  totalPromptTokens: 0,
  totalCachedPromptTokens: 0,
  totalCompletionTokens: 0,
  totalTokens: 0,
  estimatedCostUsd: 0,
  estimatedCostPricedRequests: 0,
  estimatedCostUnavailableRequests: 0,
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
  records.reduce<UsageSummary>((summary, record) => {
    const cachedTokens = record.cachedPromptTokens ?? 0;
    const inputTokens = Math.max(record.promptTokens - cachedTokens, 0) + (record.toolUsePromptTokens ?? 0);
    const outputTokens = record.completionTokens + (record.thoughtTokens ?? 0);
    const totalTokens = inputTokens + cachedTokens + outputTokens;
    const estimatedCost = calculateApiUsageRecordPriceUsd(record);

    return {
      totalRequests: summary.totalRequests + 1,
      totalPromptTokens: summary.totalPromptTokens + inputTokens,
      totalCachedPromptTokens: summary.totalCachedPromptTokens + cachedTokens,
      totalCompletionTokens: summary.totalCompletionTokens + outputTokens,
      totalTokens: summary.totalTokens + totalTokens,
      estimatedCostUsd: summary.estimatedCostUsd + (estimatedCost ?? 0),
      estimatedCostPricedRequests: summary.estimatedCostPricedRequests + (estimatedCost === null ? 0 : 1),
      estimatedCostUnavailableRequests: summary.estimatedCostUnavailableRequests + (estimatedCost === null ? 1 : 0),
    };
  }, EMPTY_SUMMARY);

const buildBreakdown = (records: ApiUsageRecord[]): UsageModelBreakdown[] => {
  const grouped = new Map<string, UsageModelBreakdown>();

  records.forEach((record) => {
    const cachedTokens = record.cachedPromptTokens ?? 0;
    const inputTokens = Math.max(record.promptTokens - cachedTokens, 0) + (record.toolUsePromptTokens ?? 0);
    const outputTokens = record.completionTokens + (record.thoughtTokens ?? 0);
    const totalTokens = inputTokens + cachedTokens + outputTokens;
    const current = grouped.get(record.modelId) ?? {
      modelId: record.modelId,
      ...EMPTY_SUMMARY,
    };

    const estimatedCost = calculateApiUsageRecordPriceUsd(record);

    current.totalRequests += 1;
    current.totalPromptTokens += inputTokens;
    current.totalCachedPromptTokens += cachedTokens;
    current.totalCompletionTokens += outputTokens;
    current.totalTokens += totalTokens;
    current.estimatedCostUsd += estimatedCost ?? 0;
    current.estimatedCostPricedRequests += estimatedCost === null ? 0 : 1;
    current.estimatedCostUnavailableRequests += estimatedCost === null ? 1 : 0;
    grouped.set(record.modelId, current);
  });

  return Array.from(grouped.values()).sort(
    (a, b) => b.totalTokens - a.totalTokens || b.totalRequests - a.totalRequests,
  );
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
