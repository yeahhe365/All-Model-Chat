import { describe, expect, it } from 'vitest';
import type { SavedChatSession } from '../types';
import { categorizeSessionsByDate } from './useHistorySidebarLogic';

const createSession = (id: string, iso: string): SavedChatSession => ({
  id,
  title: id,
  timestamp: new Date(iso).getTime(),
  messages: [],
  settings: {} as SavedChatSession['settings'],
});

describe('categorizeSessionsByDate', () => {
  it('places yesterday into its own category before previous 7 days', () => {
    const { categoryOrder, categories } = categorizeSessionsByDate(
      [
        createSession('today', '2026-04-20T08:00:00.000Z'),
        createSession('yesterday', '2026-04-19T08:00:00.000Z'),
        createSession('previous', '2026-04-18T08:00:00.000Z'),
      ],
      'en',
      (_key, fallback) => fallback ?? '',
      new Date('2026-04-20T12:00:00.000Z'),
    );

    expect(categoryOrder).toEqual(['Today', 'Yesterday', 'Previous 7 Days']);
    expect(categories.Yesterday.map((session) => session.id)).toEqual(['yesterday']);
  });

  it('keeps previous 30 days separate from the new yesterday and previous 7 days buckets', () => {
    const { categoryOrder, categories } = categorizeSessionsByDate(
      [createSession('older', '2026-03-31T08:00:00.000Z')],
      'en',
      (_key, fallback) => fallback ?? '',
      new Date('2026-04-20T12:00:00.000Z'),
    );

    expect(categoryOrder).toEqual(['Previous 30 Days']);
    expect(categories['Previous 30 Days'].map((session) => session.id)).toEqual(['older']);
  });
});
