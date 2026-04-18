# Log Viewer Usage Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Settings usage tab and consolidate the usage dashboard, token totals, and API key distribution into the log viewer as a single `Usage` area.

**Architecture:** Keep the existing `LogViewer` modal as the shell, but collapse its top-level tabs to `Console` and `Usage`. Move the settings usage dashboard into a log-viewer-local `UsageOverviewTab`, retain the live `TokenUsageTab` and `ApiUsageTab`, and add open-state plumbing so Settings can deep-link into `Usage > Overview`.

**Tech Stack:** React 18, TypeScript, Zustand, Vitest, Tailwind CSS, IndexedDB-backed `dbService`, `logService`

---

### Task 1: Lock The New Navigation Contract With Tests

**Files:**
- Modify: `src/hooks/features/useSettingsLogic.test.tsx`
- Modify: `src/components/settings/SettingsContent.test.tsx`
- Create: `src/components/log-viewer/LogViewer.test.tsx`

- [ ] **Step 1: Update the settings-logic test so it fails unless the usage tab is removed**

```tsx
it('does not include the usage tab in the settings sidebar model', () => {
  const { result, unmount } = renderHook(() =>
    useSettingsLogic({
      isOpen: true,
      currentSettings: DEFAULT_APP_SETTINGS,
      onSave: vi.fn(),
      onClearAllHistory: vi.fn(),
      onClearCache: vi.fn(),
      onImportHistory: vi.fn(),
      t: (key: string) => key,
    }),
  );

  expect(result.current.tabs.map((tab) => tab.id)).not.toContain('usage');
  unmount();
});
```

- [ ] **Step 2: Add a failing settings-content test that proves no usage branch renders anymore**

```tsx
it('does not render the usage section from settings content', () => {
  render(
    <I18nProvider>
      <SettingsContent
        activeTab={'data'}
        currentSettings={DEFAULT_APP_SETTINGS}
        availableModels={[]}
        updateSetting={vi.fn()}
        handleModelChange={vi.fn()}
        setAvailableModels={vi.fn()}
        onClearHistory={vi.fn()}
        onClearCache={vi.fn()}
        onOpenLogViewer={vi.fn()}
        onClearLogs={vi.fn()}
        onReset={vi.fn()}
        onInstallPwa={vi.fn()}
        isInstallable={false}
        onImportSettings={vi.fn()}
        onExportSettings={vi.fn()}
        onImportHistory={vi.fn()}
        onExportHistory={vi.fn()}
        onImportScenarios={vi.fn()}
        onExportScenarios={vi.fn()}
        t={(key) => key}
      />
    </I18nProvider>,
  );

  expect(screen.queryByText('usageTitle')).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Add a failing log-viewer test for `Console / Usage` top-level tabs and nested usage tabs**

```tsx
it('groups overview, tokens, and api key stats under the usage tab', async () => {
  render(
    <I18nProvider>
      <LogViewer
        isOpen
        onClose={vi.fn()}
        appSettings={{ ...DEFAULT_APP_SETTINGS, useCustomApiConfig: true, apiKey: 'key-a\\nkey-b' }}
        currentChatSettings={{ ...DEFAULT_CHAT_SETTINGS, lockedApiKey: 'key-a' }}
      />
    </I18nProvider>,
  );

  expect(screen.getByRole('button', { name: /console/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /usage/i })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /usage/i }));

  expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /tokens/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /api keys/i })).toBeInTheDocument();
});
```

- [ ] **Step 4: Run the targeted tests and confirm they fail for the expected reasons**

Run: `npm test -- src/hooks/features/useSettingsLogic.test.tsx src/components/settings/SettingsContent.test.tsx src/components/log-viewer/LogViewer.test.tsx`

Expected:
- `useSettingsLogic.test.tsx` fails because `usage` still exists
- `SettingsContent.test.tsx` fails because the usage branch/import is still present
- `LogViewer.test.tsx` fails because `Usage` top-level navigation does not exist yet

### Task 2: Move The Usage Dashboard Into The Log Viewer

**Files:**
- Create: `src/components/log-viewer/UsageOverviewTab.tsx`
- Modify: `src/hooks/features/useUsageStats.ts`
- Modify: `src/components/settings/sections/UsageSection.test.tsx`

- [ ] **Step 1: Add a failing usage-overview test by relocating the current dashboard assertions to the log viewer component**

```tsx
render(
  <I18nProvider>
    <UsageOverviewTab />
  </I18nProvider>,
);

expect(container.textContent).toContain('Time Range');
expect(container.textContent).toContain('All Time');
expect(container.textContent).toContain('$2.48');
```

- [ ] **Step 2: Run the focused usage-overview test to verify it fails because the component does not exist yet**

Run: `npm test -- src/components/log-viewer/UsageOverviewTab.test.tsx`

Expected: FAIL with module-not-found or missing export for `UsageOverviewTab`

- [ ] **Step 3: Implement the overview component by moving the current `UsageSection` markup into `src/components/log-viewer/UsageOverviewTab.tsx`**

```tsx
export const UsageOverviewTab: React.FC = () => {
  const { t } = useI18n();
  const { timeRange, setTimeRange, isLoading, summary, byModel } = useUsageStats();

  return (
    <div className="p-4 overflow-y-auto custom-scrollbar h-full">
      {/* moved header, range control, stat cards, per-model table, pricing note */}
    </div>
  );
};
```

- [ ] **Step 4: Add a refresh hook surface so the overview can be reloaded after live usage writes**

```ts
export const useUsageStats = () => {
  const [timeRange, setTimeRange] = useState<UsageTimeRange>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((value) => value + 1);

  useEffect(() => {
    // existing load logic
  }, [timeRange, refreshKey]);

  return { timeRange, setTimeRange, isLoading, summary, byModel, refresh };
};
```

- [ ] **Step 5: Run the focused overview tests and confirm they pass**

Run: `npm test -- src/components/log-viewer/UsageOverviewTab.test.tsx`

Expected: PASS with the moved aggregation assertions still intact

### Task 3: Rebuild The Log Viewer Around A Unified Usage Area

**Files:**
- Modify: `src/components/log-viewer/LogViewer.tsx`
- Modify: `src/components/log-viewer/TokenUsageTab.tsx`
- Modify: `src/components/log-viewer/ApiUsageTab.tsx`
- Modify: `src/services/logService.ts`
- Modify: `src/components/modals/AppModals.tsx`
- Modify: `src/components/settings/settingsTypes.ts`
- Modify: `src/components/settings/SettingsModal.tsx`
- Modify: `src/components/settings/SettingsContent.tsx`

- [ ] **Step 1: Add a failing test that opens the log viewer from Settings into `Usage > Overview`**

```tsx
await userEvent.click(screen.getByRole('button', { name: /view logs and usage/i }));

expect(screen.getByRole('button', { name: /usage/i })).toHaveAttribute('aria-pressed', 'true');
expect(screen.getByRole('button', { name: /overview/i })).toHaveAttribute('aria-pressed', 'true');
```

- [ ] **Step 2: Run the targeted integration test and confirm it fails because open-state routing is not implemented**

Run: `npm test -- src/components/settings/SettingsContent.test.tsx src/components/log-viewer/LogViewer.test.tsx`

Expected: FAIL because `onOpenLogViewer` cannot yet specify initial tabs

- [ ] **Step 3: Implement the new log-viewer state model and nested usage navigation**

```tsx
const [activeTab, setActiveTab] = useState<'console' | 'usage'>(initialTab);
const [activeUsageTab, setActiveUsageTab] = useState<'overview' | 'tokens' | 'api'>(initialUsageTab);

{activeTab === 'usage' && (
  <UsagePanel
    activeUsageTab={activeUsageTab}
    onChangeUsageTab={setActiveUsageTab}
    tokenUsage={tokenUsage}
    apiKeyUsage={apiKeyUsage}
    appSettings={appSettings}
    currentChatSettings={currentChatSettings}
  />
)}
```

- [ ] **Step 4: Add a lightweight usage-change subscription so `UsageOverviewTab` refreshes when token records are written or logs are cleared**

```ts
type UsageRefreshListener = () => void;

public subscribeToUsageRefresh(listener: UsageRefreshListener): () => void {
  this.usageRefreshListeners.add(listener);
  return () => this.usageRefreshListeners.delete(listener);
}

private notifyUsageRefreshListeners() {
  for (const listener of this.usageRefreshListeners) {
    listener();
  }
}
```

- [ ] **Step 5: Extend the log-viewer open props so Settings can deep-link into `Usage > Overview`**

```ts
interface LogViewerOpenState {
  initialTab?: 'console' | 'usage';
  initialUsageTab?: 'overview' | 'tokens' | 'api';
}
```

- [ ] **Step 6: Run the targeted log-viewer tests and confirm the unified usage navigation passes**

Run: `npm test -- src/components/log-viewer/LogViewer.test.tsx src/components/log-viewer/UsageOverviewTab.test.tsx`

Expected: PASS with `Console / Usage` top-level navigation and nested usage tabs working

### Task 4: Remove The Settings Usage Surface And Update Copy

**Files:**
- Modify: `src/hooks/features/useSettingsLogic.ts`
- Modify: `src/components/settings/SettingsContent.tsx`
- Delete: `src/components/settings/sections/UsageSection.tsx`
- Modify: `src/utils/translations/settings/general.ts`
- Modify: `src/utils/translations/settings/data.ts`
- Modify: `src/components/settings/sections/DataManagementSection.tsx`

- [ ] **Step 1: Remove the settings usage tab from the type model and sidebar registration**

```ts
export type SettingsTab = 'interface' | 'model' | 'account' | 'data' | 'shortcuts' | 'about';

const validTabs: SettingsTab[] = ['model', 'interface', 'account', 'data', 'shortcuts', 'about'];

const tabs = useMemo(() => [
  { id: 'model' as SettingsTab, labelKey: 'settingsTabModel', icon: SlidersHorizontal },
  { id: 'interface' as SettingsTab, labelKey: 'settingsTabInterface', icon: LayoutPanelLeft },
  { id: 'account' as SettingsTab, labelKey: 'settingsTabAccount', icon: IconApiKey },
  { id: 'data' as SettingsTab, labelKey: 'settingsTabData', icon: IconData },
  { id: 'shortcuts' as SettingsTab, labelKey: 'settingsTabShortcuts', icon: IconKeyboard },
  { id: 'about' as SettingsTab, labelKey: 'settingsTabAbout', icon: IconAbout },
], []);
```

- [ ] **Step 2: Remove the usage section import/render path from settings content**

```tsx
// delete:
import { UsageSection } from './sections/UsageSection';

// delete the entire:
{activeTab === 'usage' && (
  <div className={animClass}>
    <UsageSection />
  </div>
)}
```

- [ ] **Step 3: Update the Settings data-management copy so the button clearly opens the combined destination**

```tsx
<ActionRow label={t('settingsViewLogsAndUsage')}>
  <button onClick={onOpenLogViewer} className={outlineBtnClass}>
    {t('settingsViewLogsAndUsage')}
  </button>
  <button onClick={onClearLogs} className={dangerOutlineBtnClass}>
    <Trash2 size={12} strokeWidth={1.5} /> {t('settingsClearLogs')}
  </button>
</ActionRow>
```

- [ ] **Step 4: Run the focused settings tests and confirm the old usage surface is gone**

Run: `npm test -- src/hooks/features/useSettingsLogic.test.tsx src/components/settings/SettingsContent.test.tsx src/components/settings/sections/DataManagementSection.test.tsx`

Expected: PASS with no remaining dependency on the removed settings usage tab

### Task 5: Verify The Consolidation End To End

**Files:**
- Test: `src/components/log-viewer/LogViewer.test.tsx`
- Test: `src/components/log-viewer/UsageOverviewTab.test.tsx`
- Test: `src/hooks/features/useSettingsLogic.test.tsx`
- Test: `src/components/settings/SettingsContent.test.tsx`

- [ ] **Step 1: Run the affected feature tests**

Run: `npm test -- src/components/log-viewer/LogViewer.test.tsx src/components/log-viewer/UsageOverviewTab.test.tsx src/hooks/features/useSettingsLogic.test.tsx src/components/settings/SettingsContent.test.tsx src/components/settings/sections/DataManagementSection.test.tsx`

Expected: PASS for all targeted files

- [ ] **Step 2: Run type-checking**

Run: `npm run typecheck`

Expected: exit 0

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: exit 0

- [ ] **Step 4: Record the known baseline limitation in the handoff**

```md
Full `npm test` still has pre-existing failures in unrelated `localStorage`/`ChatInput` areas on this branch baseline; the consolidated usage work is verified with targeted tests, `npm run typecheck`, and `npm run build`.
```
