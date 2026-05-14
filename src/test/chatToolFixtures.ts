import { vi } from 'vitest';
import type { ChatToolToggleStates, ToggleableChatToolId } from '@/types/chatTools';

type ChatToolEnabledFlags = Partial<Record<ToggleableChatToolId, boolean>>;
const TOGGLEABLE_CHAT_TOOL_IDS = ['googleSearch', 'deepSearch', 'codeExecution', 'localPython', 'urlContext'] as const;

export const createChatToolToggleStates = (overrides: ChatToolToggleStates = {}): ChatToolToggleStates => ({
  googleSearch: { isEnabled: false, onToggle: vi.fn() },
  deepSearch: { isEnabled: false, onToggle: vi.fn() },
  codeExecution: { isEnabled: false, onToggle: vi.fn() },
  localPython: { isEnabled: false, onToggle: vi.fn() },
  urlContext: { isEnabled: false, onToggle: vi.fn() },
  ...overrides,
});

export const createChatToolToggleStatesFromFlags = (enabled: ChatToolEnabledFlags = {}): ChatToolToggleStates =>
  createChatToolToggleStates(
    TOGGLEABLE_CHAT_TOOL_IDS.reduce<ChatToolToggleStates>((states, toolId) => {
      states[toolId] = { isEnabled: !!enabled[toolId], onToggle: vi.fn() };
      return states;
    }, {}),
  );
