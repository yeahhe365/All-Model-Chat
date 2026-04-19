# History Yesterday Group Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated `Yesterday` bucket to history sidebar date grouping without changing any other history behavior.

**Architecture:** Extract the date-bucketing logic into a small pure helper inside the existing sidebar hook file so the grouping boundaries are easy to test. Update translations with a new `history_yesterday` key and keep the rest of the history UI unchanged.

**Tech Stack:** React, TypeScript, Vitest

---

### Task 1: Add a failing grouping test

**Files:**
- Modify: `src/hooks/useHistorySidebarLogic.ts`
- Create: `src/hooks/useHistorySidebarLogic.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('places yesterday into its own category before previous 7 days', () => {
  const { categoryOrder } = categorizeSessionsByDate(
    [
      { id: 'today', timestamp: new Date('2026-04-20T08:00:00.000Z').getTime(), isPinned: false } as any,
      { id: 'yesterday', timestamp: new Date('2026-04-19T08:00:00.000Z').getTime(), isPinned: false } as any,
      { id: 'previous', timestamp: new Date('2026-04-18T08:00:00.000Z').getTime(), isPinned: false } as any,
    ],
    'en',
    (key, fallback) => fallback ?? key,
    new Date('2026-04-20T12:00:00.000Z'),
  );

  expect(categoryOrder).toEqual(['Today', 'Yesterday', 'Previous 7 Days']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/hooks/useHistorySidebarLogic.test.ts`
Expected: FAIL because `Yesterday` is not produced yet

- [ ] **Step 3: Write minimal implementation**

```ts
const yesterdayStart = new Date(todayStart);
yesterdayStart.setDate(todayStart.getDate() - 1);
const sevenDaysAgoStart = new Date(todayStart);
sevenDaysAgoStart.setDate(todayStart.getDate() - 8);

if (sessionDate >= todayStart) categoryName = categoryKeys.today;
else if (sessionDate >= yesterdayStart) categoryName = categoryKeys.yesterday;
else if (sessionDate >= sevenDaysAgoStart) categoryName = categoryKeys.sevenDays;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/hooks/useHistorySidebarLogic.test.ts`
Expected: PASS

### Task 2: Add translation and verify the UI path

**Files:**
- Modify: `src/utils/translations/history.ts`
- Modify: `src/hooks/useHistorySidebarLogic.ts`

- [ ] **Step 1: Add the translation key**

```ts
history_yesterday: { en: 'Yesterday', zh: '昨天' },
```

- [ ] **Step 2: Wire the new key into the static category order**

```ts
const categoryKeys = {
  today: t('history_today', 'Today'),
  yesterday: t('history_yesterday', 'Yesterday'),
  sevenDays: t('history_7_days', 'Previous 7 Days'),
  thirtyDays: t('history_30_days', 'Previous 30 Days'),
};
```

- [ ] **Step 3: Verify targeted tests and static checks**

Run: `npm test -- --run src/hooks/useHistorySidebarLogic.test.ts`
Expected: PASS

Run: `npm run typecheck`
Expected: exit 0

Run: `npx eslint src/hooks/useHistorySidebarLogic.ts src/hooks/useHistorySidebarLogic.test.ts src/utils/translations/history.ts`
Expected: exit 0
