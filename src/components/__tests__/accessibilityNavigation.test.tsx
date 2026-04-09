import { act, useRef, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Modal } from '../shared/Modal';
import { Select } from '../shared/Select';
import { ModelPicker } from '../shared/ModelPicker';
import { ModelListView } from '../settings/controls/model-selector/ModelListView';
import { AttachmentMenu } from '../chat/input/AttachmentMenu';
import { ToolsMenu } from '../chat/input/ToolsMenu';
import { SessionItem } from '../sidebar/SessionItem';
import { GroupItem } from '../sidebar/GroupItem';
import type { ChatGroup, ModelOption, SavedChatSession } from '../../types';

interface RenderedRoot {
  container: HTMLDivElement;
  root: Root;
}

const mountedRoots: RenderedRoot[] = [];

const renderIntoDom = (ui: JSX.Element) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(ui);
  });

  const rendered = { container, root };
  mountedRoots.push(rendered);
  return rendered;
};

const models: ModelOption[] = [
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image' },
];

const session: SavedChatSession = {
  id: 'session-1',
  title: 'Session 1',
  messages: [],
  settings: {} as never,
  timestamp: Date.now(),
};

const group: ChatGroup = {
  id: 'group-1',
  title: 'Group 1',
  timestamp: Date.now(),
  isExpanded: true,
};

describe('keyboard accessibility', () => {
  beforeEach(() => {
    mountedRoots.length = 0;
  });

  afterEach(() => {
    while (mountedRoots.length > 0) {
      const mounted = mountedRoots.pop()!;
      act(() => {
        mounted.root.unmount();
      });
      mounted.container.remove();
    }
  });

  it('traps focus inside Modal and restores focus when it closes', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Open modal';
    document.body.appendChild(trigger);
    trigger.focus();

    const renderModal = (isOpen: boolean) =>
      renderIntoDom(
        <Modal isOpen={isOpen} onClose={vi.fn()}>
          <div>
            <button type="button">First</button>
            <button type="button">Last</button>
          </div>
        </Modal>
      );

    const mounted = renderModal(true);
    const modalButtons = Array.from(document.body.querySelectorAll('button')).filter(
      (button) => button.textContent === 'First' || button.textContent === 'Last'
    );
    const [firstButton, lastButton] = modalButtons as HTMLButtonElement[];

    expect(document.activeElement).toBe(firstButton);

    lastButton.focus();
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });
    expect(document.activeElement).toBe(firstButton);

    firstButton.focus();
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    });
    expect(document.activeElement).toBe(lastButton);

    act(() => {
      mounted.root.render(
        <Modal isOpen={false} onClose={vi.fn()}>
          <div>
            <button type="button">First</button>
            <button type="button">Last</button>
          </div>
        </Modal>
      );
    });

    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('only closes the top-most modal on Escape', () => {
    const outerOnClose = vi.fn();
    const innerOnClose = vi.fn();

    renderIntoDom(
      <>
        <Modal isOpen={true} onClose={outerOnClose}>
          <div>
            <button type="button">Outer</button>
          </div>
        </Modal>
        <Modal isOpen={true} onClose={innerOnClose}>
          <div>
            <button type="button">Inner</button>
          </div>
        </Modal>
      </>
    );

    const innerButton = Array.from(document.body.querySelectorAll('button')).find(
      (button) => button.textContent === 'Inner'
    ) as HTMLButtonElement;

    innerButton.focus();

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(innerOnClose).toHaveBeenCalledTimes(1);
    expect(outerOnClose).not.toHaveBeenCalled();
  });

  it('supports keyboard navigation and selection in Select', () => {
    const onChange = vi.fn();
    const { container } = renderIntoDom(
      <Select id="voice-select" label="Voice" value="alpha" onChange={onChange}>
        <option value="alpha">Alpha</option>
        <option value="beta">Beta</option>
        <option value="gamma">Gamma</option>
      </Select>
    );

    const trigger = container.querySelector('#voice-select') as HTMLButtonElement;
    trigger.focus();

    act(() => {
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    expect(document.activeElement).toHaveTextContent('Alpha');

    act(() => {
      document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    expect(document.activeElement).toHaveTextContent('Beta');

    act(() => {
      document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].target.value).toBe('beta');
  });

  it('supports keyboard navigation and selection in ModelPicker', () => {
    const onSelect = vi.fn();
    const { container } = renderIntoDom(
      <ModelPicker
        models={models}
        selectedId="gemini-2.5-pro"
        onSelect={onSelect}
        t={(key) => key}
        renderTrigger={({ onTriggerClick, onTriggerKeyDown, ref, triggerAriaProps }) => (
          <button
            ref={ref}
            type="button"
            onClick={onTriggerClick}
            onKeyDown={onTriggerKeyDown}
            {...triggerAriaProps}
          >
            Open models
          </button>
        )}
      />
    );

    const trigger = container.querySelector('button') as HTMLButtonElement;
    trigger.focus();

    act(() => {
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    expect(document.activeElement).toHaveTextContent('Gemini 2.5 Pro');

    act(() => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
        })
      );
    });

    act(() => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
        })
      );
    });
    expect(document.activeElement).toHaveTextContent('Gemini 2.5 Flash Image');

    act(() => {
      document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(onSelect).toHaveBeenCalledWith('gemini-2.5-flash-image');
  });

  it('renders ModelListView rows as focusable options with keyboard selection', () => {
    const onSelectModel = vi.fn();
    const { container } = renderIntoDom(
      <ModelListView
        availableModels={models}
        selectedModelId="gemini-2.5-pro"
        onSelectModel={onSelectModel}
        t={(key) => key}
      />
    );

    const options = container.querySelectorAll('button[role="option"]');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');

    (options[0] as HTMLButtonElement).focus();
    act(() => {
      options[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });

    expect(document.activeElement).toBe(options[1]);

    act(() => {
      options[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(onSelectModel).toHaveBeenCalledWith('gemini-2.5-flash');
  });

  it('supports keyboard navigation and selection in AttachmentMenu', () => {
    const onAction = vi.fn();
    const { container } = renderIntoDom(
      <AttachmentMenu
        onAction={onAction}
        disabled={false}
        t={(key) => key}
      />
    );

    const trigger = container.querySelector('button') as HTMLButtonElement;
    trigger.focus();

    act(() => {
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    expect(document.activeElement).toHaveTextContent('attachMenu_upload');

    act(() => {
      document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    expect(document.activeElement).toHaveTextContent('attachMenu_importFolder');

    act(() => {
      document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(onAction).toHaveBeenCalledWith('folder');
  });

  it('supports keyboard navigation and selection in ToolsMenu', () => {
    const onToggleDeepSearch = vi.fn();
    const { container } = renderIntoDom(
      <ToolsMenu
        isGoogleSearchEnabled={false}
        onToggleGoogleSearch={vi.fn()}
        isCodeExecutionEnabled={false}
        onToggleCodeExecution={vi.fn()}
        isUrlContextEnabled={false}
        onToggleUrlContext={vi.fn()}
        isDeepSearchEnabled={false}
        onToggleDeepSearch={onToggleDeepSearch}
        onAddYouTubeVideo={vi.fn()}
        onCountTokens={vi.fn()}
        disabled={false}
        t={(key) => key}
      />
    );

    const trigger = container.querySelector('button') as HTMLButtonElement;
    trigger.focus();

    act(() => {
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    expect(document.activeElement).toHaveTextContent('deep_search_label');

    act(() => {
      document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    expect(document.activeElement).toHaveTextContent('web_search_label');

    act(() => {
      document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    });
    expect(document.activeElement).toHaveTextContent('deep_search_label');

    act(() => {
      document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(onToggleDeepSearch).toHaveBeenCalledTimes(1);
  });

  it('moves focus into SessionItem menu, supports arrow navigation, and restores focus on Escape', () => {
    const onStartEdit = vi.fn();

    const Harness = () => {
      const [activeMenu, setActiveMenu] = useState<string | null>(null);
      const menuRef = useRef<HTMLDivElement>(null);
      const editInputRef = useRef<HTMLInputElement>(null);

      return (
        <ul>
          <SessionItem
            session={session}
            activeSessionId={null}
            editingItem={null}
            activeMenu={activeMenu}
            loadingSessionIds={new Set()}
            generatingTitleSessionIds={new Set()}
            newlyTitledSessionId={null}
            editInputRef={editInputRef}
            menuRef={menuRef}
            onSelectSession={vi.fn()}
            onTogglePinSession={vi.fn()}
            onDeleteSession={vi.fn()}
            onDuplicateSession={vi.fn()}
            onOpenExportModal={vi.fn()}
            handleStartEdit={onStartEdit}
            handleRenameConfirm={vi.fn()}
            handleRenameKeyDown={vi.fn()}
            setEditingItem={vi.fn()}
            toggleMenu={(event, id) => {
              event.stopPropagation();
              setActiveMenu((current) => (current === id ? null : id));
            }}
            setActiveMenu={setActiveMenu}
            handleDragStart={vi.fn()}
            t={(key) => key}
          />
        </ul>
      );
    };

    const { container } = renderIntoDom(<Harness />);
    const trigger = container.querySelector('button[title="history_item_actions"]') as HTMLButtonElement;

    act(() => {
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(document.activeElement).toHaveTextContent('edit');

    act(() => {
      document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    expect(document.activeElement).toHaveTextContent('history_pin');

    act(() => {
      document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(document.activeElement).toBe(trigger);
  });

  it('moves focus into GroupItem menu, supports arrow navigation, and activates actions with Enter', () => {
    const onDeleteGroup = vi.fn();

    const Harness = () => {
      const [activeMenu, setActiveMenu] = useState<string | null>(null);
      const menuRef = useRef<HTMLDivElement>(null);
      const editInputRef = useRef<HTMLInputElement>(null);

      return (
        <GroupItem
          group={group}
          sessions={[]}
          editingItem={null}
          dragOverId={null}
          onToggleGroupExpansion={vi.fn()}
          handleGroupStartEdit={vi.fn()}
          handleDrop={vi.fn()}
          handleDragOver={vi.fn()}
          setDragOverId={vi.fn()}
          setEditingItem={vi.fn()}
          onDeleteGroup={onDeleteGroup}
          t={(key) => key}
          activeSessionId={null}
          activeMenu={activeMenu}
          loadingSessionIds={new Set()}
          generatingTitleSessionIds={new Set()}
          newlyTitledSessionId={null}
          editInputRef={editInputRef}
          menuRef={menuRef}
          onSelectSession={vi.fn()}
          onTogglePinSession={vi.fn()}
          onDeleteSession={vi.fn()}
          onDuplicateSession={vi.fn()}
          onOpenExportModal={vi.fn()}
          handleStartEdit={vi.fn()}
          handleRenameConfirm={vi.fn()}
          handleRenameKeyDown={vi.fn()}
          toggleMenu={(event, id) => {
            event.stopPropagation();
            setActiveMenu((current) => (current === id ? null : id));
          }}
          setActiveMenu={setActiveMenu}
          handleDragStart={vi.fn()}
        />
      );
    };

    const { container } = renderIntoDom(<Harness />);
    const trigger = container.querySelector('button[title="history_item_actions"]') as HTMLButtonElement;

    act(() => {
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(document.activeElement).toHaveTextContent('edit');

    act(() => {
      document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    expect(document.activeElement).toHaveTextContent('delete');

    act(() => {
      document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(onDeleteGroup).toHaveBeenCalledWith('group-1');
  });
});
