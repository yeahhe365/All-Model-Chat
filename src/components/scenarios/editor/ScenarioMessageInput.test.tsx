import React from 'react';
import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScenarioMessageInput } from './ScenarioMessageInput';

const { mockSettingsState } = vi.hoisted(() => ({
  mockSettingsState: {
    appSettings: {
      customShortcuts: {},
    },
  },
}));

vi.mock('../../../stores/settingsStore', () => ({
  useSettingsStore: (selector: (state: typeof mockSettingsState) => unknown) => selector(mockSettingsState),
}));

describe('ScenarioMessageInput', () => {
  const renderer = setupTestRenderer();

  beforeEach(() => {
    mockSettingsState.appSettings.customShortcuts = {};
  });

  it('uses the configured save/confirm shortcut to add a message', async () => {
    mockSettingsState.appSettings.customShortcuts = {
      'global.saveConfirm': 'alt+enter',
    };

    const onAdd = vi.fn();
    const inputRef = React.createRef<HTMLTextAreaElement>();

    await act(async () => {
      renderer.root.render(
        <ScenarioMessageInput
          role="user"
          setRole={() => {}}
          content="hello"
          setContent={() => {}}
          onAdd={onAdd}
          inputRef={inputRef}
          readOnly={false}
        />,
      );
    });

    const textarea = renderer.container.querySelector('textarea');
    expect(textarea).not.toBeNull();

    await act(async () => {
      textarea?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          altKey: true,
          bubbles: true,
        }),
      );
    });

    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
