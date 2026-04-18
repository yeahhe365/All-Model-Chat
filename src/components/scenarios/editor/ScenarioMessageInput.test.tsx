import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockSettingsState.appSettings.customShortcuts = {};
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.body.innerHTML = '';
  });

  it('uses the configured save/confirm shortcut to add a message', async () => {
    mockSettingsState.appSettings.customShortcuts = {
      'global.saveConfirm': 'alt+enter',
    };

    const onAdd = vi.fn();
    const inputRef = React.createRef<HTMLTextAreaElement>();

    await act(async () => {
      root.render(
        <ScenarioMessageInput
          role="user"
          setRole={() => {}}
          content="hello"
          setContent={() => {}}
          onAdd={onAdd}
          inputRef={inputRef}
          readOnly={false}
          t={(key) => key}
        />,
      );
    });

    const textarea = container.querySelector('textarea');
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
