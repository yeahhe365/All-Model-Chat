import { describe, expect, it } from 'vitest';
import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { createUploadedFile } from './factories';
import { resetAllStoreState, resetChatStoreState, resetSettingsStoreState } from './storeTestUtils';

describe('storeTestUtils', () => {
  it('resets settings store state without dropping actions', () => {
    useSettingsStore.setState({
      language: 'zh',
      isSettingsLoaded: true,
      pendingPreloadSettingsOverrides: { language: 'zh' },
    });

    resetSettingsStoreState();

    const state = useSettingsStore.getState();
    expect(state.language).toBe('en');
    expect(state.isSettingsLoaded).toBe(false);
    expect(state.pendingPreloadSettingsOverrides).toBeNull();
    expect(typeof state.setAppSettings).toBe('function');
  });

  it('resets chat store state and mutable refs', () => {
    const abortController = new AbortController();
    useChatStore.setState({
      activeSessionId: 'session-1',
      activeMessages: [{ id: 'message-1', role: 'user', content: 'hello', timestamp: new Date() }],
      selectedFiles: [createUploadedFile({ id: 'file-1', name: 'notes.txt', type: 'text/plain', size: 1 })],
      loadingSessionIds: new Set(['session-1']),
    });
    useChatStore.getState()._activeJobs.current.set('message-1', abortController);
    useChatStore.getState()._userScrolledUp.current = true;
    useChatStore.getState()._fileDrafts.current = { 'session-1': [] };

    resetChatStoreState();

    const state = useChatStore.getState();
    expect(state.activeSessionId).toBeNull();
    expect(state.activeMessages).toEqual([]);
    expect(state.selectedFiles).toEqual([]);
    expect(state.loadingSessionIds.size).toBe(0);
    expect(state._activeJobs.current.size).toBe(0);
    expect(state._userScrolledUp.current).toBe(false);
    expect(state._fileDrafts.current).toEqual({});
    expect(typeof state.setActiveSessionId).toBe('function');
  });

  it('resets all app stores from one helper', () => {
    useSettingsStore.setState({ language: 'zh' });
    useChatStore.setState({ activeSessionId: 'session-2' });

    resetAllStoreState();

    expect(useSettingsStore.getState().language).toBe('en');
    expect(useChatStore.getState().activeSessionId).toBeNull();
  });
});
